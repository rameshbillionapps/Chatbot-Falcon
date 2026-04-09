import OpenAI from "openai";

export function getOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

let embeddingApiKey: string | null = null;

export function setEmbeddingApiKey(key: string | null): void {
  embeddingApiKey = key;
}

export function getEmbeddingApiKey(): string | null {
  return embeddingApiKey;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = embeddingApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No OpenAI API key configured for embeddings. Set one in Admin Settings.");
  }
  const client = new OpenAI({ apiKey });
  const input = text.slice(0, 8000);
  const response = await client.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0].embedding;
}
