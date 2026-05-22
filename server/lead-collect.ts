import { cache } from "./cache";

// ── Types ────────────────────────────────────────────────────────────────────

interface LeadState {
  step: "asking_name" | "asking_email_phone" | "asking_phone";
  name?: string;
  email?: string;
  reaskCount: number;
}

export interface CapturedLead {
  name: string;
  email: string;
  phone: string;
  source: "chat";
}

// ── Constants ────────────────────────────────────────────────────────────────

const COLLECT_TTL   = 30 * 60_000;
const DONE_TTL      =  2 * 60 * 60_000;
const TRIGGER_COUNT = 4;
const MAX_REASKS    = 2;

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

function parseEmail(text: string): string | null {
  const m = text.match(/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function parsePhone(text: string): string | null {
  // Remove email first to avoid matching digits in domain
  const cleaned = text.replace(/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/g, "");
  const m = cleaned.match(/[\+\d][\d\s\-\(\).]{5,}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 5 ? m[0].trim() : null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function shouldTriggerLeadCollection(message: string, messageCount: number, sessionId: number): boolean {
  if (cache.get(doneKey(sessionId))) return false;
  if (cache.get(stateKey(sessionId))) return false;
  return hasIntent(message) || messageCount >= TRIGGER_COUNT;
}

export function startLeadCollection(sessionId: number): string {
  cache.set(stateKey(sessionId), { step: "asking_name", reaskCount: 0 } as LeadState, COLLECT_TTL);
  return "May I have your name so our team can follow up with you?";
}

export function processLeadStep(sessionId: number, message: string): { response: string; lead?: CapturedLead } | null {
  const state = cache.get<LeadState>(stateKey(sessionId));
  if (!state) return null;

  if (isDecline(message)) {
    cache.delete(stateKey(sessionId));
    cache.set(doneKey(sessionId), true, DONE_TTL);
    return { response: "No problem! Feel free to ask if you change your mind." };
  }

  const trimmed = message.trim();

  // ── Name step ────────────────────────────────────────────────────────────
  if (state.step === "asking_name") {
    if (trimmed.length >= 2 && !/^\d+$/.test(trimmed)) {
      const next: LeadState = { step: "asking_email_phone", name: trimmed, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: `Thanks ${trimmed}! What's your email and phone number?` };
    }
    return reask(sessionId, state, "name");
  }

  // ── Email + Phone combined step ──────────────────────────────────────────
  if (state.step === "asking_email_phone") {
    const email = parseEmail(trimmed);
    const phone = parsePhone(trimmed);

    if (email && phone) {
      // Both provided in one message — complete
      cache.delete(stateKey(sessionId));
      cache.set(doneKey(sessionId), true, DONE_TTL);
      const lead: CapturedLead = { name: state.name!, email, phone, source: "chat" };
      return { response: "Perfect! Our team will be in touch soon. Is there anything else I can help you with?", lead };
    }

    if (email && !phone) {
      // Only email — ask for phone
      const next: LeadState = { step: "asking_phone", name: state.name, email, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: "Got it! And your phone number?" };
    }

    if (!email && phone) {
      // Only phone — ask for email
      const next: LeadState = { ...state, email: undefined, reaskCount: 0 };
      // Store phone temporarily in name field trick — no, let's just re-ask cleanly
      cache.set(stateKey(sessionId), { ...state, reaskCount: state.reaskCount + 1 } as LeadState, COLLECT_TTL);
      return { response: "I got your phone, but could you also share your email address?" };
    }

    // Neither found
    return reask(sessionId, state, "email_phone");
  }

  // ── Phone-only step (fallback when only email was given above) ────────────
  if (state.step === "asking_phone") {
    const phone = parsePhone(trimmed);
    if (phone) {
      cache.delete(stateKey(sessionId));
      cache.set(doneKey(sessionId), true, DONE_TTL);
      const lead: CapturedLead = { name: state.name!, email: state.email!, phone, source: "chat" };
      return { response: "Perfect! Our team will be in touch soon. Is there anything else I can help you with?", lead };
    }
    return reask(sessionId, state, "phone");
  }

  return null;
}

// ── Internal re-ask logic ────────────────────────────────────────────────────

const RE_ASK: Record<string, string> = {
  name:        "Just checking — could I get your name for our records?",
  email_phone: "Whenever you're ready, what's your email and phone number?",
  phone:       "And a phone number? That's the last thing I need!",
};

const PROMPT: Record<string, string> = {
  name:        "Could you share your name? (type 'skip' to continue without)",
  email_phone: "Could you share your email and phone? e.g. john@example.com, 9876543210",
  phone:       "Could you share your phone number? (type 'skip' to continue without)",
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
