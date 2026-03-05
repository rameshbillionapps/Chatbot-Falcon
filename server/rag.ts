import { storage } from "./storage";
import { cache } from "./cache";
import { getOpenAIClient } from "./openai";
import type { KnowledgeArticle, MediaAsset } from "@shared/schema";

const SYSTEM_PROMPT = `You are a friendly supplier assistant for Falcon Head Gear and Meenax T-shirts, garment manufacturers in Tiruppur, India.

RESPONSE STYLE — THIS IS CRITICAL:
- Keep responses SHORT and conversational — 2-4 sentences max for simple questions.
- Write in plain text. Do NOT use markdown headers, bold, bullet lists, or formatted blocks.
- Sound like a helpful person chatting, not a formal document.
- Only use a short list if the user asks to compare multiple items. Even then, keep it brief.
- Never repeat the question back. Get straight to the answer.
- Mention contact info only when the user asks for it or needs a quote. Keep it to one line.
- Do NOT dump all information at once. Answer what was asked, nothing more.
- If media (images, PDFs) are available in context, reference them naturally: [IMAGE: url | title] or [PDF: url | title]

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

  const openai = getOpenAIClient();

  const messages: any[] = [
    { role: "system", content: SYSTEM_PROMPT + contextBlock + mediaBlock },
  ];

  const recentHistory = sessionHistory.slice(-10);
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: userMessage });

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

  const categoryMedia = allMedia.filter(m => !referencedMedia.includes(m));
  const finalMedia = [...referencedMedia, ...categoryMedia.slice(0, 3)];

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

export function getSuggestedQuestions(): string[] {
  return [
    "What types of T-shirts do you manufacture?",
    "What are the available GSM options for polo T-shirts?",
    "How do I place a bulk order for caps?",
    "What printing methods do you offer?",
    "What is the minimum order quantity?",
  ];
}
