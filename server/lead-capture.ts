import { getOpenAIClient } from "./openai";
import { getCredentials } from "./whatsapp";
import { cache } from "./cache";
import { storage } from "./storage";

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

// ── 2. Two-step state: text "business card" → await image (5-min TTL) ────────

export function setCardIntent(phone: string): void {
  cache.set(`card_intent:${phone}`, true, 5 * 60_000);
}

export function hasCardIntent(phone: string): boolean {
  return cache.get<boolean>(`card_intent:${phone}`) === true;
}

export function clearCardIntent(phone: string): void {
  cache.delete(`card_intent:${phone}`);
}

// ── 3. WhatsApp media download ────────────────────────────────────────────────

async function downloadWhatsAppImage(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const { accessToken } = await getCredentials();
  console.log(`[card] Resolving media URL for id=${mediaId}`);

  // Step 1: resolve media URL from Meta
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!metaRes.ok) {
    const errText = await metaRes.text();
    console.error(`[card] Media lookup failed (${metaRes.status}):`, errText);
    throw new Error(`Media lookup failed: ${errText}`);
  }
  const meta = await metaRes.json() as { url: string; mime_type: string };
  console.log(`[card] Got media URL, mime=${meta.mime_type}`);

  // Step 2: download binary
  const imgRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!imgRes.ok) {
    const errText = await imgRes.text();
    console.error(`[card] Media download failed (${imgRes.status}):`, errText);
    throw new Error(`Media download failed: ${errText}`);
  }

  const buffer = Buffer.from(await imgRes.arrayBuffer());
  console.log(`[card] Image downloaded, size=${buffer.length} bytes`);
  return { buffer, mimeType: meta.mime_type || "image/jpeg" };
}

// ── 4. GPT-4o vision extraction ───────────────────────────────────────────────

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
    // GPT sometimes wraps in ```json ... ``` despite instructions
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as CardExtraction;
    throw new Error(`GPT returned unparseable response: ${raw.slice(0, 200)}`);
  }
}

// ── 5. Public entry point ─────────────────────────────────────────────────────

// Shared reply builder — used by both WhatsApp and web chat handlers
export function buildCardConfirmationReply(extracted: CardExtraction): string {
  const lines: string[] = ["Got it! I've saved the business card details:"];
  if (extracted.name)        lines.push(`Name: ${extracted.name}`);
  if (extracted.company)     lines.push(`Company: ${extracted.company}`);
  if (extracted.designation) lines.push(`Title: ${extracted.designation}`);
  if (extracted.phone)       lines.push(`Phone: ${extracted.phone}`);
  if (extracted.email)       lines.push(`Email: ${extracted.email}`);
  if (extracted.website)     lines.push(`Website: ${extracted.website}`);
  lines.push("The lead has been captured in our system.");
  return lines.join("\n");
}

// Export for the web chat handler (file already on disk — no WA media download needed)
export async function extractCardFromBuffer(buffer: Buffer, mimeType: string): Promise<CardExtraction> {
  return extractCardData(buffer, mimeType);
}

/**
 * Called by the WhatsApp inbound handler when an image message arrives
 * and the sender has declared business card intent (via caption or prior text).
 * Downloads the image, extracts details via GPT-4o, saves as a lead, and
 * returns the confirmation message to send back to the user.
 */
export async function handleBusinessCardImage(phone: string, mediaId: string): Promise<string> {
  console.log(`[card] handleBusinessCardImage phone=${phone} mediaId=${mediaId}`);
  const { buffer, mimeType } = await downloadWhatsAppImage(mediaId);
  console.log(`[card] Sending to GPT-4o for extraction...`);
  const extracted = await extractCardData(buffer, mimeType);
  console.log(`[card] Extraction result:`, JSON.stringify(extracted));

  await storage.createLead({
    whatsappPhone: phone,
    name: extracted.name,
    phone: extracted.phone,
    email: extracted.email,
    company: extracted.company,
    designation: extracted.designation,
    website: extracted.website,
    rawJson: extracted as unknown as Record<string, string | null>,
  });

  clearCardIntent(phone);
  return buildCardConfirmationReply(extracted);
}
