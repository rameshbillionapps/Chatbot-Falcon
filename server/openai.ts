import OpenAI from "openai";

let _chatClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_chatClient) {
    _chatClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _chatClient;
}

let embeddingApiKey: string | null = null;
let _embeddingClient: OpenAI | null = null;

export function setEmbeddingApiKey(key: string | null): void {
  embeddingApiKey = key;
  _embeddingClient = null; // invalidate cached client when key changes
}

export function getEmbeddingApiKey(): string | null {
  return embeddingApiKey;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = embeddingApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No OpenAI API key configured for embeddings. Set one in Admin Settings.");
  }
  if (!_embeddingClient) {
    _embeddingClient = new OpenAI({ apiKey });
  }
  const input = text.slice(0, 8000);
  const response = await _embeddingClient.embeddings.create({
    model: "text-embedding-3-small",
    input,
  });
  return response.data[0].embedding;
}
