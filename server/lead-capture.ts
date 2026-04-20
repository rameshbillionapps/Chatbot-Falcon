import { getOpenAIClient } from "./openai";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CardExtraction {
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  designation: string | null;
  website: string | null;
}

// ── 1. Intent detection ──────────────────────────────────────────────────────

const CARD_KEYWORDS = ["visiting card", "business card", "bizcard", "namecard", "name card"];

export function isBusinessCardIntent(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return CARD_KEYWORDS.some(kw => lower.includes(kw));
}

// ── 2. GPT-4o vision extraction ───────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a business card data extraction assistant.
The user has sent an image of a business/visiting card.
Extract all contact information visible on the card and return ONLY a valid JSON object with exactly these keys:
{
  "name": "full name of the person or null",
  "phone": "phone number(s) as a string or null",
  "email": "email address or null",
  "company": "company or organization name or null",
  "designation": "job title or designation or null",
  "website": "website URL or null"
}
Rules:
- Return ONLY the JSON object — no markdown, no explanation, no extra text.
- If a field is not visible on the card, set it to null.
- If multiple phone numbers exist, prefer the personal direct (D) or mobile (M) number. If no preference is clear, join all with ", ".
- Preserve the original text exactly as printed on the card.`;

async function extractCardData(buffer: Buffer, mimeType: string): Promise<CardExtraction> {
  const openai = getOpenAIClient();
  const base64 = buffer.toString("base64");

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 400,
    stream: false,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: EXTRACTION_PROMPT },
          { type: "image_url" as const, image_url: { url: `data:${mimeType};base64,${base64}`, detail: "high" as const } },
        ],
      },
    ],
  });

  const raw = (res as { choices: Array<{ message: { content: string | null } }> }).choices[0]?.message?.content?.trim() ?? "{}";
  try {
    return JSON.parse(raw) as CardExtraction;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as CardExtraction;
    throw new Error(`GPT returned unparseable response: ${raw.slice(0, 200)}`);
  }
}

// ── 3. Public helpers (used by /api/chat handler) ─────────────────────────────

export async function extractCardFromBuffer(buffer: Buffer, mimeType: string): Promise<CardExtraction> {
  return extractCardData(buffer, mimeType);
}

export function buildCardConfirmationReply(extracted: CardExtraction): string {
  const lines: string[] = ["Got it! I've captured the business card details:"];
  if (extracted.name)        lines.push(`Name: ${extracted.name}`);
  if (extracted.company)     lines.push(`Company: ${extracted.company}`);
  if (extracted.designation) lines.push(`Title: ${extracted.designation}`);
  if (extracted.phone)       lines.push(`Phone: ${extracted.phone}`);
  if (extracted.email)       lines.push(`Email: ${extracted.email}`);
  if (extracted.website)     lines.push(`Website: ${extracted.website}`);
  return lines.join("\n");
}
