import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processChat, getSuggestedQuestions } from "./rag";
import { seedDatabase } from "./seed";
import { requireAuth } from "./auth";
import { generateEmbedding, setEmbeddingApiKey } from "./openai";
import { cache } from "./cache";
import { extractCardFromBuffer, buildCardConfirmationReply } from "./lead-capture";
import { shouldTriggerLeadCollection, startLeadCollection, processLeadStep } from "./lead-collect";
import { insertKnowledgeArticleSchema, insertMediaAssetSchema, insertWidgetConfigSchema, chatMessages } from "@shared/schema";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "client/public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  await seedDatabase();

  const savedKey = await storage.getSetting("openai_api_key");
  if (savedKey) {
    setEmbeddingApiKey(savedKey);
  }

  // ── Public settings (no auth) ────────────────────────────────────────────
  const PUBLIC_SETTING_KEYS = [
    "brand_name", "brand_tagline", "brand_location", "brand_address",
    "brand_whatsapp", "contact_phone", "contact_email",
    "social_instagram", "social_facebook", "social_linkedin",
    "home_hero_title", "home_hero_description",
    "bot_name", "welcome_message",
  ];

  app.get("/api/public/settings", async (_req, res) => {
    try {
      const all = await storage.getAllSettings();
      const pub: Record<string, string> = {};
      for (const s of all) {
        if (PUBLIC_SETTING_KEYS.includes(s.key)) pub[s.key] = s.value || "";
      }
      // expose whether site password is set (not the value itself)
      const sitePass = all.find(s => s.key === "site_password");
      pub["site_password_enabled"] = sitePass?.value ? "true" : "false";
      res.json(pub);
    } catch {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/auth/site-unlock", async (req, res) => {
    try {
      const { password } = req.body;
      const stored = await storage.getSetting("site_password");
      if (!stored) return res.json({ success: true }); // no gate configured
      if (password === stored) return res.json({ success: true });
      res.status(401).json({ success: false });
    } catch {
      res.status(500).json({ error: "Failed to verify password" });
    }
  });

  app.get("/api/public/articles", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const articles = await storage.getKnowledgeArticles(category, true);
      res.json(articles.map(a => ({
        id: a.id, title: a.title, content: a.content,
        category: a.category, tags: a.tags,
      })));
    } catch {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/public/media", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const assets = await storage.getMediaAssets(type);
      res.json(assets.map(m => ({
        id: m.id, title: m.title, type: m.type,
        url: m.url, category: m.category,
        knowledgeArticleId: m.knowledgeArticleId,
      })));
    } catch {
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });
  // ─────────────────────────────────────────────────────────────────────────

  app.post("/api/chat", upload.single("image"), async (req, res) => {
    try {
      const { message } = req.body;
      const sessionId = Number(req.body.sessionId);
      if (!message || !sessionId || isNaN(sessionId)) {
        return res.status(400).json({ error: "message and sessionId are required" });
      }

      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      let imageUrl: string | null = null;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      await storage.createChatMessage({
        sessionId,
        role: "user",
        content: String(message),
        mediaAttachments: imageUrl ? [{ type: "image", url: imageUrl, title: "Uploaded image" }] : null,
      });

      // Auto-detect business card: run extraction on every image upload
      if (req.file) {
        const buffer = fs.readFileSync(req.file.path);
        const extracted = await extractCardFromBuffer(buffer, req.file.mimetype || "image/jpeg");

        if (extracted.is_card) {
          const confirmationText = buildCardConfirmationReply(extracted);

          await Promise.all([
            storage.createChatMessage({
              sessionId,
              role: "assistant",
              content: confirmationText,
              mediaAttachments: null,
            }),
            storage.updateSessionLastMessage(sessionId),
          ]);

          // Fire webhook to Lead Mgmt app (fire-and-forget)
          storage.getSetting("lead_capture_webhook_url").then(url => {
            if (url) fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...extracted,
                source: "webchat",
                sessionId,
                capturedAt: new Date().toISOString(),
              }),
            }).catch(err => console.error("[card] Webhook error:", err));
          }).catch(() => {});

          return res.json({ content: confirmationText, mediaAttachments: [], matchedCategories: [], cardExtraction: extracted });
        }
        // Not a business card — fall through to RAG with imageUrl
      }

      const history = await storage.getChatMessages(sessionId);
      const sessionHistory = history.map(m => ({ role: m.role, content: m.content }));

      // ── Sales agent: proactive lead collection ─────────────────────────────
      const stepResult = processLeadStep(sessionId, String(message));
      if (stepResult !== null) {
        await Promise.all([
          storage.createChatMessage({ sessionId, role: "assistant", content: stepResult.response, mediaAttachments: null }),
          storage.updateSessionLastMessage(sessionId),
        ]);
        if (stepResult.lead) {
          storage.getSetting("lead_capture_webhook_url").then(url => {
            if (url) fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...stepResult.lead, sessionId, capturedAt: new Date().toISOString() }),
            }).catch(err => console.error("[lead-collect] Webhook error:", err));
          }).catch(() => {});
        }
        return res.json({
          content: stepResult.response,
          mediaAttachments: [],
          matchedCategories: [],
          ...(stepResult.lead ? { leadCapture: stepResult.lead } : {}),
        });
      }

      if (shouldTriggerLeadCollection(String(message), history.length, sessionId)) {
        const firstQuestion = startLeadCollection(sessionId);
        await Promise.all([
          storage.createChatMessage({ sessionId, role: "assistant", content: firstQuestion, mediaAttachments: null }),
          storage.updateSessionLastMessage(sessionId),
        ]);
        return res.json({ content: firstQuestion, mediaAttachments: [], matchedCategories: [] });
      }
      // ──────────────────────────────────────────────────────────────────────

      const response = await processChat(String(message), sessionHistory, imageUrl, sessionId);

      const mediaAttachments = Array.isArray(response.mediaAttachments) ? response.mediaAttachments : [];
      const matchedCategories = Array.isArray(response.matchedCategories) ? response.matchedCategories : [];

      await storage.createChatMessage({
        sessionId,
        role: "assistant",
        content: response.content || "I couldn't generate a response. Please try again.",
        mediaAttachments: mediaAttachments.length > 0 ? mediaAttachments : null,
      });

      await storage.updateSessionLastMessage(sessionId);

      if (matchedCategories.length > 0) {
        await storage.createAnalyticsEvent({
          eventType: "topic_queried",
          sessionId,
          data: { category: matchedCategories[0] },
        });
      }

      res.json({ content: response.content, mediaAttachments, matchedCategories });
    } catch (error: any) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  app.post("/api/chat/sessions", async (req, res) => {
    try {
      const { visitorId, visitorName, visitorEmail, sourceDomain } = req.body;
      const session = await storage.createChatSession({
        visitorId: visitorId || `visitor-${Date.now()}`,
        visitorName: visitorName || null,
        visitorEmail: visitorEmail || null,
        sourceDomain: sourceDomain || null,
      });

      await storage.createAnalyticsEvent({
        eventType: "session_started",
        sessionId: session.id,
        data: { domain: sourceDomain },
      });

      const botName = await storage.getSetting("bot_name");
      const welcomeMessage = await storage.getSetting("welcome_message");

      res.json({
        session,
        suggestedQuestions: await getSuggestedQuestions(),
        botName: botName || "AI Assistant",
        welcomeMessage: welcomeMessage || "Hi! How can I help you today?",
      });
    } catch (error: any) {
      console.error("Session creation error:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  app.get("/api/chat/sessions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.use("/api/admin", requireAuth);

  app.get("/api/admin/knowledge", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const activeOnly = req.query.activeOnly !== 'false';
      const articles = await storage.getKnowledgeArticles(category, activeOnly);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch articles" });
    }
  });

  app.get("/api/admin/knowledge/:id", async (req, res) => {
    try {
      const article = await storage.getKnowledgeArticle(parseInt(req.params.id));
      if (!article) return res.status(404).json({ error: "Not found" });
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch article" });
    }
  });

  app.post("/api/admin/knowledge", async (req, res) => {
    try {
      const article = await storage.createKnowledgeArticle(req.body);
      generateEmbedding(`${article.title} ${article.category} ${article.content}`)
        .then(emb => storage.updateArticleEmbedding(article.id, emb))
        .catch(err => console.error("Embedding generation failed for article", article.id, err));
      res.status(201).json(article);
    } catch (error) {
      console.error("Create article error:", error);
      res.status(500).json({ error: "Failed to create article" });
    }
  });

  app.put("/api/admin/knowledge/:id", async (req, res) => {
    try {
      const updated = await storage.updateKnowledgeArticle(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      generateEmbedding(`${updated.title} ${updated.category} ${updated.content}`)
        .then(emb => storage.updateArticleEmbedding(updated.id, emb))
        .catch(err => console.error("Embedding regeneration failed for article", updated.id, err));
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update article" });
    }
  });

  app.post("/api/admin/knowledge/regenerate-embeddings", async (_req, res) => {
    try {
      const articles = await storage.getKnowledgeArticles(undefined, false);
      let updated = 0;
      for (const article of articles) {
        try {
          const emb = await generateEmbedding(`${article.title} ${article.category} ${article.content}`);
          await storage.updateArticleEmbedding(article.id, emb);
          updated++;
        } catch (err) {
          console.error("Failed to generate embedding for article", article.id, err);
        }
      }
      res.json({ total: articles.length, updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to regenerate embeddings" });
    }
  });

  app.delete("/api/admin/knowledge", async (_req, res) => {
    try {
      const count = await storage.deleteAllKnowledgeArticles();
      res.json({ deleted: count });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete all articles" });
    }
  });

  app.delete("/api/admin/knowledge/:id", async (req, res) => {
    try {
      await storage.deleteKnowledgeArticle(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete article" });
    }
  });

  app.get("/api/admin/media", async (req, res) => {
    try {
      const type = req.query.type as string | undefined;
      const articleId = req.query.articleId ? parseInt(req.query.articleId as string) : undefined;
      const assets = await storage.getMediaAssets(type, articleId);
      res.json(assets);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch media" });
    }
  });

  app.post("/api/admin/media", async (req, res) => {
    try {
      const asset = await storage.createMediaAsset(req.body);
      res.status(201).json(asset);
    } catch (error) {
      console.error("Create media error:", error);
      res.status(500).json({ error: "Failed to create media" });
    }
  });

  app.post("/api/admin/media/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const fileUrl = `/uploads/${req.file.filename}`;
      const ext = path.extname(req.file.originalname).toLowerCase();
      let type = "image";
      if ([".pdf"].includes(ext)) type = "pdf";
      else if ([".mp4", ".webm", ".mov"].includes(ext)) type = "video";

      const asset = await storage.createMediaAsset({
        title: req.body.title || req.file.originalname,
        type,
        url: fileUrl,
        description: req.body.description || null,
        category: req.body.category || null,
        knowledgeArticleId: req.body.knowledgeArticleId ? parseInt(req.body.knowledgeArticleId) : null,
      });
      res.status(201).json(asset);
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  app.delete("/api/admin/media", async (_req, res) => {
    try {
      const count = await storage.deleteAllMediaAssets();
      res.json({ success: true, deleted: count });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete all media" });
    }
  });

  app.delete("/api/admin/media/:id", async (req, res) => {
    try {
      await storage.deleteMediaAsset(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete media" });
    }
  });

  app.get("/api/admin/settings", async (_req, res) => {
    try {
      const settings = await storage.getAllSettings();
      const masked = settings.map(s => {
        if (s.key === "openai_api_key" && s.value) {
          return { ...s, value: s.value.slice(0, 7) + "..." + s.value.slice(-4) };
        }
        return s;
      });
      res.json(masked);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings/:key", async (req, res) => {
    try {
      const { value } = req.body;
      if (req.params.key === "openai_api_key" && value && value.includes("...")) {
        return res.json({ success: true });
      }
      await storage.setSetting(req.params.key, value);
      if (req.params.key === "openai_api_key") {
        setEmbeddingApiKey(value || null);
      }
      // Invalidate caches so updated settings take effect immediately
      cache.delete("rag:config");
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update setting" });
    }
  });

  app.get("/api/admin/sessions", async (req, res) => {
    try {
      const domain = req.query.domain as string | undefined;
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
      const sessions = await storage.getChatSessions(domain, fromDate, toDate);

      const sessionsWithCounts = await Promise.all(
        sessions.map(async (s) => ({
          ...s,
          messageCount: await storage.getMessageCount(s.id),
        }))
      );
      res.json(sessionsWithCounts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sessions" });
    }
  });

  app.get("/api/admin/sessions/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getChatMessages(parseInt(req.params.id));
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.get("/api/admin/knowledge-gaps", async (req, res) => {
    try {
      const resolved = req.query.resolved === "true";
      const gaps = await storage.getKnowledgeGaps(resolved);
      res.json(gaps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch knowledge gaps" });
    }
  });

  app.patch("/api/admin/knowledge-gaps/:id/resolve", async (req, res) => {
    try {
      await storage.resolveKnowledgeGap(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve gap" });
    }
  });

  app.delete("/api/admin/knowledge-gaps/:id", async (req, res) => {
    try {
      await storage.deleteKnowledgeGap(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete gap" });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;
      const summary = await storage.getAnalyticsSummary(fromDate, toDate);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/widgets", async (_req, res) => {
    try {
      const configs = await storage.getWidgetConfigs();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widgets" });
    }
  });

  app.get("/api/admin/widgets/:id", async (req, res) => {
    try {
      const config = await storage.getWidgetConfig(parseInt(req.params.id));
      if (!config) return res.status(404).json({ error: "Not found" });
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widget" });
    }
  });

  app.post("/api/admin/widgets", async (req, res) => {
    try {
      const config = await storage.createWidgetConfig(req.body);
      res.status(201).json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to create widget" });
    }
  });

  app.put("/api/admin/widgets/:id", async (req, res) => {
    try {
      const updated = await storage.updateWidgetConfig(parseInt(req.params.id), req.body);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update widget" });
    }
  });

  app.delete("/api/admin/widgets/:id", async (req, res) => {
    try {
      await storage.deleteWidgetConfig(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete widget" });
    }
  });

  app.get("/api/admin/backup", async (_req, res) => {
    try {
      const [articles, media, sessions, messages, settings, widgets] = await Promise.all([
        storage.getKnowledgeArticles(undefined, false),
        storage.getMediaAssets(),
        storage.getChatSessions(),
        db.select().from(chatMessages).orderBy(chatMessages.timestamp),
        storage.getAllSettings(),
        storage.getWidgetConfigs(),
      ]);

      const maskedSettings = settings.map(s => {
        if (s.key === "openai_api_key" && s.value) {
          return { ...s, value: "[REDACTED]" };
        }
        return s;
      });

      const backup = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        data: {
          knowledge_articles: articles,
          media_assets: media,
          chat_sessions: sessions,
          chat_messages: messages,
          admin_settings: maskedSettings,
          widget_configs: widgets,
        },
      };

      const dateStr = new Date().toISOString().split("T")[0];
      res.setHeader("Content-Disposition", `attachment; filename="backup-${dateStr}.json"`);
      res.setHeader("Content-Type", "application/json");
      res.json(backup);
    } catch (error) {
      console.error("Backup error:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  app.get("/api/widget/:id/config", async (req, res) => {
    try {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET");
      const config = await storage.getWidgetConfig(parseInt(req.params.id));
      if (!config || !config.isActive) {
        return res.status(404).json({ error: "Widget not found or inactive" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch widget config" });
    }
  });

  return httpServer;
}
