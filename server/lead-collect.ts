import { cache } from "./cache";

// ── Types ────────────────────────────────────────────────────────────────────

interface LeadState {
  step: "asking_name" | "asking_email" | "asking_phone";
  name?: string;
  email?: string;
  reaskCount: number; // total re-asks across entire flow (max MAX_REASKS before giving up)
}

export interface CapturedLead {
  name: string;
  email: string;
  phone: string;
  source: "chat";
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLLECT_TTL  = 30 * 60_000;      // 30 min active window
const DONE_TTL     =  2 * 60 * 60_000; // 2 hr cooldown after complete/decline
const TRIGGER_COUNT = 4;                // trigger after Nth user message
const MAX_REASKS    = 2;                // max re-prompts on invalid input before giving up

const INTENT_KEYWORDS = [
  "price", "pricing", "order", "buy", "purchase", "quote",
  "contact", "enquiry", "inquiry", "how much", "delivery",
  "shipping", "bulk", "wholesale", "sample", "minimum order", "moq",
];

const DECLINE_KEYWORDS = ["no", "skip", "later", "not now", "no thanks", "nope", "don't"];

// ── Helpers ──────────────────────────────────────────────────────────────────

const stateKey = (id: number) => `lead_collect:${id}`;
const doneKey  = (id: number) => `lead_done:${id}`;

function hasIntent(msg: string) {
  const l = msg.toLowerCase();
  return INTENT_KEYWORDS.some(kw => l.includes(kw));
}

function isDecline(msg: string) {
  const l = msg.toLowerCase().trim();
  return DECLINE_KEYWORDS.some(kw => l === kw || l.startsWith(kw + " ") || l.endsWith(" " + kw));
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Returns true when a new collection flow should start. */
export function shouldTriggerLeadCollection(message: string, messageCount: number, sessionId: number): boolean {
  if (cache.get(doneKey(sessionId))) return false;  // already complete or declined this session
  if (cache.get(stateKey(sessionId))) return false; // already active
  return hasIntent(message) || messageCount >= TRIGGER_COUNT;
}

/** Initialises state and returns the opening question. */
export function startLeadCollection(sessionId: number): string {
  cache.set(stateKey(sessionId), { step: "asking_name", reaskCount: 0 } as LeadState, COLLECT_TTL);
  return "May I have your name so our team can follow up with you?";
}

/**
 * Handles one message turn within an active collection flow.
 * Returns null if no flow is active (caller should do normal RAG).
 * Returns { response } while collecting, { response, lead } on completion.
 */
export function processLeadStep(sessionId: number, message: string): { response: string; lead?: CapturedLead } | null {
  const state = cache.get<LeadState>(stateKey(sessionId));
  if (!state) return null;

  // Decline at any step
  if (isDecline(message)) {
    cache.delete(stateKey(sessionId));
    cache.set(doneKey(sessionId), true, DONE_TTL);
    return { response: "No problem! Feel free to ask if you change your mind." };
  }

  const trimmed = message.trim();

  // ── Name step ────────────────────────────────────────────────────────────
  if (state.step === "asking_name") {
    if (trimmed.length >= 2 && !/^\d+$/.test(trimmed)) {
      const next: LeadState = { step: "asking_email", name: trimmed, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: `Thanks ${trimmed}! What's your email address?` };
    }
    return reask(sessionId, state, "name");
  }

  // ── Email step ───────────────────────────────────────────────────────────
  if (state.step === "asking_email") {
    if (trimmed.includes("@") && trimmed.includes(".")) {
      const next: LeadState = { step: "asking_phone", name: state.name, email: trimmed, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: "Great! And your phone number?" };
    }
    return reask(sessionId, state, "email");
  }

  // ── Phone step ───────────────────────────────────────────────────────────
  if (state.step === "asking_phone") {
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 5) {
      cache.delete(stateKey(sessionId));
      cache.set(doneKey(sessionId), true, DONE_TTL);
      const lead: CapturedLead = { name: state.name!, email: state.email!, phone: trimmed, source: "chat" };
      return {
        response: "Perfect! Our team will be in touch soon. Is there anything else I can help you with?",
        lead,
      };
    }
    return reask(sessionId, state, "phone");
  }

  return null;
}

// ── Internal re-ask logic ────────────────────────────────────────────────────

const RE_ASK: Record<string, string> = {
  name:  "Just checking — could I get your name for our records?",
  email: "Whenever you're ready, what's a good email to reach you?",
  phone: "And a phone number? That's the last thing I need!",
};

const PROMPT: Record<string, string> = {
  name:  "Could you share your name? (type 'skip' to continue without)",
  email: "Could you share your email? (type 'skip' to continue without)",
  phone: "Could you share your phone number? (type 'skip' to continue without)",
};

function reask(sessionId: number, state: LeadState, step: string): { response: string } {
  if (state.reaskCount >= MAX_REASKS) {
    cache.delete(stateKey(sessionId));
    cache.set(doneKey(sessionId), true, DONE_TTL);
    return { response: "No worries! Let me know if there's anything else I can help with." };
  }
  cache.set(stateKey(sessionId), { ...state, reaskCount: state.reaskCount + 1 } as LeadState, COLLECT_TTL);
  return { response: state.reaskCount === 0 ? PROMPT[step] : RE_ASK[step] };
}
