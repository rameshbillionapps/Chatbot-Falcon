import { storage } from "./storage";
import { cache } from "./cache";
import { getOpenAIClient } from "./openai";
import type { KnowledgeArticle, MediaAsset } from "@shared/schema";

const SYSTEM_PROMPT = `You are a friendly and knowledgeable supplier assistant for garment manufacturing companies including Falcon Head Gear and Meenax T-shirts, based in Tiruppur, India — the knitwear capital of India.

You help suppliers, buyers, and customers with:
- Product information (T-shirts, caps, uniforms, winter wear)
- Fabric details (GSM, cotton types, polyester, blends)
- Printing & customization methods (screen printing, sublimation, embroidery, DTG)
- Pricing, MOQ (Minimum Order Quantity), and bulk ordering
- Care instructions (washing, folding, storing garments)
- Manufacturing process and production timelines
- Quality standards and certifications
- Export and shipping information

Guidelines:
- Be warm, professional, and helpful
- Give specific, accurate information based on the knowledge base provided
- When you reference products, mention available media (images, PDFs, catalogues) if provided in context
- If you include media references, format them as: [IMAGE: url | title] or [PDF: url | title] or [VIDEO: url | title]
- If you don't know something specific, say so honestly and suggest contacting the sales team
- Keep responses concise but informative
- For care instructions, be detailed and practical
- When discussing pricing, mention that exact quotes depend on quantity and customization
- Always encourage the supplier to reach out for specific quotes via WhatsApp or email

Contact Information:
- Falcon Head Gear: Phone 80123 45434, Email sales@falconheadgear.com, WhatsApp available
- Meenax T-shirts: WhatsApp +91 8825452704
- Location: Tiruppur, Tamil Nadu, India`;

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
    max_completion_tokens: 1024,
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
