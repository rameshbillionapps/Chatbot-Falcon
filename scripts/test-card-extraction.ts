/**
 * Quick test script for business card extraction.
 * Usage: npx tsx scripts/test-card-extraction.ts <image-path>
 */
import fs from "fs";
import path from "path";
import OpenAI from "openai";

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

async function extractCard(imagePath: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set in environment");

  const buffer = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().slice(1);
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/jpeg";
  const base64 = buffer.toString("base64");

  const openai = new OpenAI({ apiKey });
  console.log(`\nExtracting from: ${imagePath} (${(buffer.length / 1024).toFixed(1)} KB)\n`);

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 400,
    stream: false,
    messages: [
      {
        role: "user" as const,
        content: [
          { type: "text" as const, text: EXTRACTION_PROMPT },
          { type: "image_url" as const, image_url: { url: `data:${mime};base64,${base64}`, detail: "high" as const } },
        ],
      },
    ],
  });

  const raw = (res as any).choices[0]?.message?.content?.trim() ?? "{}";
  console.log("Raw GPT response:", raw);

  try {
    const parsed = JSON.parse(raw);
    console.log("\nExtracted fields:");
    console.log(JSON.stringify(parsed, null, 2));

    // Check completeness
    const missing = Object.entries(parsed).filter(([_, v]) => v === null).map(([k]) => k);
    const found = Object.entries(parsed).filter(([_, v]) => v !== null).map(([k]) => k);
    console.log(`\nFound: ${found.join(", ") || "none"}`);
    if (missing.length) console.log(`Missing/null: ${missing.join(", ")}`);
  } catch {
    console.error("Failed to parse response as JSON");
  }
}

const imagePath = process.argv[2];
if (!imagePath) {
  console.error("Usage: npx tsx scripts/test-card-extraction.ts <image-path>");
  process.exit(1);
}

// Load env from .env file manually
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, "utf-8").split("\n").forEach(line => {
    const [k, ...v] = line.split("=");
    if (k && v.length) process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
  });
}

// Also try to get API key from DB settings
import { db } from "../server/db.js";
import { adminSettings } from "../shared/schema.js";
import { eq } from "drizzle-orm";

const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.key, "openai_api_key"));
if (setting?.value && !setting.value.includes("...")) {
  process.env.OPENAI_API_KEY = setting.value;
}

await extractCard(imagePath);
process.exit(0);
