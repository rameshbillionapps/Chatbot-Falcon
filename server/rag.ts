import { storage } from "./storage";
import { cache } from "./cache";
import { getOpenAIClient } from "./openai";
import type { KnowledgeArticle, MediaAsset } from "@shared/schema";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const SYSTEM_PROMPT = `You are a friendly supplier assistant for Falcon Head Gear and Meenax T-shirts, garment manufacturers in Tiruppur, India.

CRITICAL RULE — ONLY USE PROVIDED DATA:
- You MUST answer ONLY based on the knowledge base articles provided below under "Relevant Knowledge Base Articles".
- If the knowledge base does NOT contain the information needed to answer the question, respond with something like: "I'm sorry, I don't have that information in our knowledge base right now. Please reach out to our team for help — WhatsApp +91 8825452704 or email sales@falconheadgear.com."
- NEVER make up, guess, or invent information that is not in the provided articles. This is extremely important.
- If the articles only partially cover the question, answer with what is available and mention that for more details they should contact the team.

RESPONSE STYLE:
- Keep responses SHORT and conversational — 2-4 sentences max for simple questions.
- Write in plain text. Do NOT use markdown headers, bold, bullet lists, or formatted blocks.
- Sound like a helpful person chatting, not a formal document.
- Only use a short list if the user asks to compare multiple items. Even then, keep it brief.
- Never repeat the question back. Get straight to the answer.
- Mention contact info only when the user asks for it or needs a quote. Keep it to one line.
- Do NOT dump all information at once. Answer what was asked, nothing more.
- If media (images, PDFs, videos) are available in context, reference them naturally: [IMAGE: url | title] or [PDF: url | title] or [VIDEO: url | title]

Contact (use sparingly, only when relevant):
- Falcon Head Gear: 80123 45434 / sales@falconheadgear.com
- Meenax T-shirts: WhatsApp +91 8825452704`;

export interface ChatResponse {
  content: string;
  mediaAttachments: Array<{ type: string; url: string; title: string }>;
  matchedCategories: string[];
}

export async function processChat(
  userMessage: string,
  sessionHistory: Array<{ role: string; content: string }>,
  imageUrl?: string | null,
): Promise<ChatResponse> {
  const articles = await searchRelevantArticles(userMessage);
  const mediaForArticles = await getMediaForArticles(articles);

  const contextParts: string[] = [];
  const allMedia: Array<{ type: string; url: string; title: string }> = [];
  const matchedCategories: string[] = [];

  for (const article of articles) {
    contextParts.push(`[${article.category.toUpperCase()}] ${article.title}:\n${article.content}`);
    if (!matchedCategories.includes(article.category)) {
      matchedCategories.push(article.category);
    }

    const articleMedia = mediaForArticles.get(article.id) || [];
    for (const media of articleMedia) {
      allMedia.push({ type: media.type, url: media.url, title: media.title });
    }
  }

  const contextBlock = contextParts.length > 0
    ? `\n\nRelevant Knowledge Base Articles:\n---\n${contextParts.join('\n---\n')}\n---`
    : '';

  const mediaBlock = allMedia.length > 0
    ? `\n\nAvailable Media to Reference:\n${allMedia.map(m => `- [${m.type.toUpperCase()}] ${m.title}: ${m.url}`).join('\n')}`
    : '';

  let imageInstruction = '';
  if (imageUrl) {
    imageInstruction = `\n\nIMAGE ANALYSIS INSTRUCTION:
The user has uploaded a product image. You must give a clear YES or NO answer.

OUR PRODUCT RANGE (ONLY these — nothing else):
- Polo T-shirts (uniform/corporate wear)
- Crew Neck T-shirts (round neck, promotional wear)
- Fleece / Winter Wear (hoodies, sweatshirts, jackets)
- Sublimation Printed Garments
- Custom Caps & Hats (baseball caps, trucker caps, snapbacks)
- School & Corporate Uniforms (shirts, trousers for uniforms)
- Printed T-shirts (screen print, DTG, embroidery)

RULES:
- First, identify the product in the image and name it (e.g. "This is a Baseball Cap", "This is a Polo T-shirt", "This is a Formal Suit").
- If the image shows a product that matches ANY of the above categories, say clearly: "Yes, we manufacture [product name]!" Then briefly describe what we offer in that category (GSM options, customization, MOQ, etc).
- If the image shows something we do NOT manufacture, say clearly: "No, we do not manufacture [product name]." Then list ALL the products we DO manufacture so the customer knows what's available.
- Be direct and confident. Never say "our knowledge base doesn't mention" — just say yes or no.
- Keep it short — 3-4 sentences max.`;
  }

  const openai = getOpenAIClient();

  const systemContent = SYSTEM_PROMPT + contextBlock + mediaBlock + imageInstruction;

  const messages: any[] = [
    { role: "system", content: systemContent },
  ];

  const recentHistory = sessionHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  if (imageUrl) {
    let imagePart: any = null;

    try {
      const localPath = path.join(process.cwd(), "client/public", imageUrl);
      if (fs.existsSync(localPath)) {
        const ext = path.extname(localPath).slice(1).toLowerCase();
        const supportedFormats = ["jpg", "jpeg", "png", "gif", "webp"];

        let finalBuffer: Buffer;
        let mime: string;

        if (supportedFormats.includes(ext)) {
          finalBuffer = fs.readFileSync(localPath);
          mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : ext === "gif" ? "image/gif" : "image/jpeg";
        } else {
          const convertedPath = localPath.replace(/\.[^.]+$/, "_converted.png");
          try {
            execSync(`convert "${localPath}" "${convertedPath}"`, { timeout: 10000 });
            finalBuffer = fs.readFileSync(convertedPath);
            mime = "image/png";
            try { fs.unlinkSync(convertedPath); } catch {}
          } catch {
            finalBuffer = fs.readFileSync(localPath);
            mime = "image/png";
          }
        }

        const base64 = finalBuffer.toString("base64");
        imagePart = { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } };
      }
    } catch (err) {
      console.error("Failed to read uploaded image:", err);
    }

    if (imagePart) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: userMessage },
          imagePart,
        ],
      });
    } else {
      messages.push({ role: "user", content: userMessage });
    }
  } else {
    messages.push({ role: "user", content: userMessage });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages,
    max_completion_tokens: 300,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content || "I'm sorry, I couldn't process your request. Please try again.";

  const referencedMedia = allMedia.filter(m =>
    content.includes(m.url) || content.includes(m.title)
  );

  const remaining = allMedia.filter(m => !referencedMedia.includes(m));
  const remainingVideos = remaining.filter(m => m.type === "video");
  const remainingImages = remaining.filter(m => m.type !== "video");
  const finalMedia = [
    ...referencedMedia,
    ...remainingVideos.slice(0, 2),
    ...remainingImages.slice(0, 3),
  ];

  return {
    content: cleanMediaReferences(content),
    mediaAttachments: finalMedia,
    matchedCategories,
  };
}

function cleanMediaReferences(content: string): string {
  return content
    .replace(/\[IMAGE:\s*([^\]|]+)\s*\|\s*([^\]]+)\]/g, '')
    .replace(/\[PDF:\s*([^\]|]+)\s*\|\s*([^\]]+)\]/g, '')
    .replace(/\[VIDEO:\s*([^\]|]+)\s*\|\s*([^\]]+)\]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function searchRelevantArticles(query: string): Promise<KnowledgeArticle[]> {
  const cacheKey = `search:${query.toLowerCase().trim()}`;
  const cached = cache.get<KnowledgeArticle[]>(cacheKey);
  if (cached) return cached;

  const results = await storage.searchKnowledgeArticles(query, 5);
  cache.set(cacheKey, results, 120000);
  return results;
}

async function getMediaForArticles(articles: KnowledgeArticle[]): Promise<Map<number, MediaAsset[]>> {
  const mediaMap = new Map<number, MediaAsset[]>();
  for (const article of articles) {
    const cacheKey = `media:${article.id}`;
    let media = cache.get<MediaAsset[]>(cacheKey);
    if (!media) {
      media = await storage.getMediaByArticleId(article.id);
      cache.set(cacheKey, media, 300000);
    }
    mediaMap.set(article.id, media);
  }
  return mediaMap;
}

const DEFAULT_SUGGESTED_QUESTIONS = [
  "What types of T-shirts do you manufacture?",
  "What are the available GSM options for polo T-shirts?",
  "How do I place a bulk order for caps?",
  "What printing methods do you offer?",
  "What is the minimum order quantity?",
];

export async function getSuggestedQuestions(): Promise<string[]> {
  const cacheKey = "suggested_questions";
  const cached = cache.get<string[]>(cacheKey);
  if (cached) return cached;

  const settingValue = await storage.getSetting("suggested_questions");
  if (settingValue) {
    try {
      const questions = JSON.parse(settingValue);
      if (Array.isArray(questions) && questions.length > 0) {
        cache.set(cacheKey, questions, 60000);
        return questions;
      }
    } catch {}
  }
  cache.set(cacheKey, DEFAULT_SUGGESTED_QUESTIONS, 60000);
  return DEFAULT_SUGGESTED_QUESTIONS;
}
