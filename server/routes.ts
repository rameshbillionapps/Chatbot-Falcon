import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { processChat, getSuggestedQuestions } from "./rag";
import { seedDatabase } from "./seed";
import { requireAuth } from "./auth";
import { generateEmbedding, setEmbeddingApiKey } from "./openai";
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

      const history = await storage.getChatMessages(sessionId);
      const sessionHistory = history.map(m => ({ role: m.role, content: m.content }));

      const response = await processChat(String(message), sessionHistory, imageUrl);

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

      res.json({
        session,
        suggestedQuestions: await getSuggestedQuestions(),
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
