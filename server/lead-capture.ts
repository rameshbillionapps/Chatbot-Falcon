import { getOpenAIClient } from "./openai";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CardExtraction {
  is_card: boolean;
  name: string | null;
  phone: string | null;       // single primary number only
  email: string | null;
  company: string | null;
  designation: string | null;
  website: string | null;
  notes: string | null;       // extra phones, address, fax, or other printed info
}

// ── GPT-4o vision extraction ──────────────────────────────────────────────────

const EXTRACTION_PROMPT = `You are a business card data extraction assistant.
Examine the image and determine if it is a business/visiting card.
Return ONLY a valid JSON object with exactly these keys:
{
  "is_card": true or false,
  "name": "full name of the person or null",
  "phone": "single primary phone number or null",
  "email": "email address or null",
  "company": "company or organization name or null",
  "designation": "job title or designation or null",
  "website": "website URL or null",
  "notes": "any additional info such as extra phone numbers, address, fax, or null"
}
Rules:
- Set is_card to true only if the image is clearly a business/visiting card.
- Set is_card to false for any other image type (product photo, document, selfie, logo, etc.).
- If is_card is false, set all other fields to null.
- Return ONLY the JSON object — no markdown, no explanation, no extra text.
- If a field is not visible on the card, set it to null.
- For phone: return exactly ONE number. Prefer Direct (D) first, then Mobile (M), then any other. Do NOT join multiple numbers in this field.
- Put all remaining phone numbers (mobile, fax, toll-free, etc.) and any physical address into the notes field as a single string.
- Preserve the original text exactly as printed on the card.`;

async function extractCardData(buffer: Buffer, mimeType: string): Promise<CardExtraction> {
  const openai = getOpenAIClient();
  const base64 = buffer.toString("base64");

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 500,
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

// ── Public helpers (used by /api/chat handler) ─────────────────────────────────

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
  if (extracted.notes)       lines.push(`Notes: ${extracted.notes}`);
  return lines.join("\n");
}
