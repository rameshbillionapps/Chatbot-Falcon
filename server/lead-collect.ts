import { cache } from "./cache";

// ── Types ────────────────────────────────────────────────────────────────────

type LeadStep =
  | "asking_name"
  | "asking_phone"
  | "asking_product"
  | "asking_event"
  | "asking_email"
  | "asking_company"
  | "asking_gst";

interface LeadState {
  step: LeadStep;
  name?: string;
  phone?: string;
  product?: string;
  isForEvent?: boolean;
  email?: string;
  company?: string;
  gst?: string;
  reaskCount: number;
}

export interface CapturedLead {
  name: string | null;
  phone: string | null;
  email: string | null;
  productInterested: string | null;
  isForEvent: boolean | null;
  company: string | null;
  gst: string | null;
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

const BULK_KEYWORDS = ["bulk", "uniform", "corporate", "team", "event", "printed", "custom"];

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

function isYes(msg: string): boolean {
  const l = msg.toLowerCase().trim();
  return ["yes", "yeah", "yep", "sure", "ok", "okay", "true", "1"].some(
    kw => l === kw || l.startsWith(kw + " ")
  );
}

function parseEmail(text: string): string | null {
  const m = text.match(/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function parsePhone(text: string): string | null {
  const cleaned = text.replace(/[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,}/g, "");
  const m = cleaned.match(/[\+\d][\d\s\-\(\).]{5,}/);
  if (!m) return null;
  const digits = m[0].replace(/\D/g, "");
  return digits.length >= 5 ? m[0].trim() : null;
}

function shouldAskCompany(isForEvent: boolean | undefined, product: string | undefined): boolean {
  if (isForEvent === true) return true;
  if (!product) return false;
  const p = product.toLowerCase();
  return BULK_KEYWORDS.some(kw => p.includes(kw));
}

// ── Public API ───────────────────────────────────────────────────────────────

export function shouldTriggerLeadCollection(message: string, messageCount: number, sessionId: number): boolean {
  if (cache.get(doneKey(sessionId))) return false;
  if (cache.get(stateKey(sessionId))) return false;
  return hasIntent(message) || messageCount >= TRIGGER_COUNT;
}

export function startLeadCollection(sessionId: number): string {
  cache.set(stateKey(sessionId), { step: "asking_name", reaskCount: 0 } as LeadState, COLLECT_TTL);
  return "May I have your name?";
}

export function processLeadStep(sessionId: number, message: string): { response: string; lead?: CapturedLead } | null {
  const state = cache.get<LeadState>(stateKey(sessionId));
  if (!state) return null;

  if (isDecline(message)) {
    cache.delete(stateKey(sessionId));
    cache.set(doneKey(sessionId), true, DONE_TTL);
    return { response: "No problem! Feel free to reach out if you need anything." };
  }

  const trimmed = message.trim();

  // ── Name ─────────────────────────────────────────────────────────────────
  if (state.step === "asking_name") {
    if (trimmed.length >= 2 && !/^\d+$/.test(trimmed)) {
      const next: LeadState = { step: "asking_phone", name: trimmed, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: `Thanks ${trimmed}! What's your mobile number?` };
    }
    return reask(sessionId, state, state.step);
  }

  // ── Phone ────────────────────────────────────────────────────────────────
  if (state.step === "asking_phone") {
    const phone = parsePhone(trimmed);
    if (phone) {
      const next: LeadState = { ...state, step: "asking_product", phone, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: "Thanks! What product are you interested in?" };
    }
    return reask(sessionId, state, state.step);
  }

  // ── Product ──────────────────────────────────────────────────────────────
  if (state.step === "asking_product") {
    if (trimmed.length >= 2) {
      const next: LeadState = { ...state, step: "asking_event", product: trimmed, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: "Is this for an event? (yes/no)" };
    }
    return reask(sessionId, state, state.step);
  }

  // ── Event (yes/no) ───────────────────────────────────────────────────────
  if (state.step === "asking_event") {
    const isForEvent = isYes(trimmed);
    const next: LeadState = { ...state, step: "asking_email", isForEvent, reaskCount: 0 };
    cache.set(stateKey(sessionId), next, COLLECT_TTL);
    return { response: "Got it! What's your email address?" };
  }

  // ── Email ────────────────────────────────────────────────────────────────
  if (state.step === "asking_email") {
    const email = parseEmail(trimmed);
    if (email) {
      // Check if we should ask for company (smart branching)
      if (shouldAskCompany(state.isForEvent, state.product)) {
        const next: LeadState = { ...state, step: "asking_company", email, reaskCount: 0 };
        cache.set(stateKey(sessionId), next, COLLECT_TTL);
        return { response: "Great! What's your company name?" };
      } else {
        // Skip company/GST, go straight to completion
        cache.delete(stateKey(sessionId));
        cache.set(doneKey(sessionId), true, DONE_TTL);
        const lead: CapturedLead = {
          name: state.name || null,
          phone: state.phone || null,
          email,
          productInterested: state.product || null,
          isForEvent: state.isForEvent || null,
          company: null,
          gst: null,
          source: "chat",
        };
        return {
          response: "Thank you for the enquiry! Our team will contact you soon. You can reference your enquiry ID when we reach out. Is there anything else I can help you with?",
          lead
        };
      }
    }
    return reask(sessionId, state, state.step);
  }

  // ── Company ──────────────────────────────────────────────────────────────
  if (state.step === "asking_company") {
    if (trimmed.length >= 2) {
      const next: LeadState = { ...state, step: "asking_gst", company: trimmed, reaskCount: 0 };
      cache.set(stateKey(sessionId), next, COLLECT_TTL);
      return { response: "Do you have a GST number?" };
    }
    return reask(sessionId, state, state.step);
  }

  // ── GST ──────────────────────────────────────────────────────────────────
  if (state.step === "asking_gst") {
    // Accept anything as GST (including "no", which we treat as empty)
    const gst = isDecline(trimmed) ? null : trimmed;
    cache.delete(stateKey(sessionId));
    cache.set(doneKey(sessionId), true, DONE_TTL);
    const lead: CapturedLead = {
      name: state.name || null,
      phone: state.phone || null,
      email: state.email || null,
      productInterested: state.product || null,
      isForEvent: state.isForEvent || null,
      company: state.company || null,
      gst,
      source: "chat",
    };
    return {
      response: "Thank you for the enquiry! Our team will contact you soon. You can reference your enquiry ID when we reach out. Is there anything else I can help you with?",
      lead
    };
  }

  return null;
}

// ── Internal re-ask logic ────────────────────────────────────────────────────

const PROMPTS: Record<LeadStep, string> = {
  asking_name:    "Could you share your name? (type 'skip' to continue)",
  asking_phone:   "Could you share your mobile number? (e.g., 9876543210)",
  asking_product: "What product are you interested in?",
  asking_event:   "Is this for an event? (yes/no)",
  asking_email:   "Could you share your email address?",
  asking_company: "What's your company name?",
  asking_gst:     "Do you have a GST number? (type 'no' if not)",
};

const RE_ASKS: Record<LeadStep, string> = {
  asking_name:    "Just checking — could I get your name?",
  asking_phone:   "Could you share your mobile number?",
  asking_product: "What product interests you?",
  asking_event:   "Is this for an event? (yes or no)",
  asking_email:   "Could you share your email?",
  asking_company: "What's your company name?",
  asking_gst:     "Do you have a GST number?",
};

function reask(sessionId: number, state: LeadState, step: LeadStep): { response: string } {
  if (state.reaskCount >= MAX_REASKS) {
    cache.delete(stateKey(sessionId));
    cache.set(doneKey(sessionId), true, DONE_TTL);
    return { response: "No worries! Feel free to reach out if you need anything." };
  }
  cache.set(stateKey(sessionId), { ...state, reaskCount: state.reaskCount + 1 } as LeadState, COLLECT_TTL);
  return { response: state.reaskCount === 0 ? PROMPTS[step as LeadStep] : RE_ASKS[step as LeadStep] };
}
