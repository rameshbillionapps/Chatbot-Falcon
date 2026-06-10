import { storage } from "./storage";

const POLL_INTERVAL_MS = 30_000;

async function processQueue(): Promise<void> {
  const [apiUrl, secret] = await Promise.all([
    storage.getSetting("lead_api_url"),
    storage.getSetting("lead_webhook_secret"),
  ]);
  if (!apiUrl) return;

  const items = await storage.getPendingWebhookItems();
  for (const item of items) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (secret) headers["X-Webhook-Secret"] = secret;

    try {
      const res = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(item.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      await storage.updateWebhookQueueItem(item.id, {
        status: "delivered",
        lastAttemptAt: new Date(),
      });
      console.log(`[webhook-worker] delivered ${item.enquiryId} (item ${item.id})`);
    } catch (err: any) {
      const attempts = item.attempts + 1;
      const status = attempts >= item.maxAttempts ? "failed" : "pending";
      // Exponential backoff: attempt 1 → 1min, attempt 2 → 5min, attempt 3 → 25min
      const backoffMs = Math.pow(5, attempts) * 60_000;
      await storage.updateWebhookQueueItem(item.id, {
        attempts,
        status,
        lastAttemptAt: new Date(),
        nextRetryAt: new Date(Date.now() + backoffMs),
        lastError: err.message,
      });
      console.log(`[webhook-worker] item ${item.id} attempt ${attempts} failed: ${err.message}`);
    }
  }
}

export function startWebhookWorker(): void {
  console.log("[webhook-worker] started, polling every 30s");
  processQueue().catch(e => console.error("[webhook-worker]", e));
  setInterval(() => processQueue().catch(e => console.error("[webhook-worker]", e)), POLL_INTERVAL_MS);
}
