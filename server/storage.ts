import { db } from "./db";
import { eq, desc, sql, and, ilike, gte, lte, count } from "drizzle-orm";
import {
  users, knowledgeArticles, mediaAssets, chatSessions, chatMessages,
  adminSettings, widgetConfigs, analyticsEvents, knowledgeGaps,
  type User, type InsertUser,
  type KnowledgeArticle, type InsertKnowledgeArticle,
  type MediaAsset, type InsertMediaAsset,
  type ChatSession, type InsertChatSession,
  type ChatMessage, type InsertChatMessage,
  type AdminSetting, type InsertAdminSetting,
  type WidgetConfig, type InsertWidgetConfig,
  type AnalyticsEvent, type InsertAnalyticsEvent,
  type KnowledgeGap,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getKnowledgeArticles(category?: string, activeOnly?: boolean): Promise<KnowledgeArticle[]>;
  getKnowledgeArticle(id: number): Promise<KnowledgeArticle | undefined>;
  createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle>;
  updateKnowledgeArticle(id: number, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle | undefined>;
  deleteKnowledgeArticle(id: number): Promise<void>;
  deleteAllKnowledgeArticles(): Promise<number>;
  searchKnowledgeArticles(query: string, limit?: number): Promise<KnowledgeArticle[]>;
  searchByVector(embedding: number[], limit?: number): Promise<KnowledgeArticle[]>;
  updateArticleEmbedding(id: number, embedding: number[]): Promise<void>;

  getMediaAssets(type?: string, articleId?: number): Promise<MediaAsset[]>;
  getMediaAsset(id: number): Promise<MediaAsset | undefined>;
  createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset>;
  deleteMediaAsset(id: number): Promise<void>;
  deleteAllMediaAssets(): Promise<number>;
  getMediaByArticleId(articleId: number): Promise<MediaAsset[]>;

  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  getChatSessions(domain?: string, fromDate?: Date, toDate?: Date): Promise<ChatSession[]>;
  updateSessionLastMessage(id: number): Promise<void>;

  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  getMessageCount(sessionId: number): Promise<number>;

  getSetting(key: string): Promise<string | undefined>;
  setSetting(key: string, value: string): Promise<void>;
  getAllSettings(): Promise<AdminSetting[]>;

  getWidgetConfigs(): Promise<WidgetConfig[]>;
  getWidgetConfig(id: number): Promise<WidgetConfig | undefined>;
  createWidgetConfig(config: InsertWidgetConfig): Promise<WidgetConfig>;
  updateWidgetConfig(id: number, config: Partial<InsertWidgetConfig>): Promise<WidgetConfig | undefined>;
  deleteWidgetConfig(id: number): Promise<void>;

  recordKnowledgeGap(question: string, sessionId?: number): Promise<void>;
  getKnowledgeGaps(resolvedOnly?: boolean): Promise<KnowledgeGap[]>;
  resolveKnowledgeGap(id: number): Promise<void>;
  deleteKnowledgeGap(id: number): Promise<void>;

  createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<void>;
  getAnalyticsSummary(fromDate?: Date, toDate?: Date): Promise<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    topCategories: Array<{ category: string; count: number }>;
    topDomains: Array<{ domain: string; count: number }>;
    sessionsOverTime: Array<{ date: string; count: number }>;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async getKnowledgeArticles(category?: string, activeOnly = true): Promise<KnowledgeArticle[]> {
    const conditions = [];
    if (activeOnly) conditions.push(eq(knowledgeArticles.isActive, true));
    if (category) conditions.push(eq(knowledgeArticles.category, category));
    
    if (conditions.length === 0) {
      return db.select().from(knowledgeArticles).orderBy(desc(knowledgeArticles.createdAt));
    }
    return db.select().from(knowledgeArticles)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(knowledgeArticles.createdAt));
  }

  async getKnowledgeArticle(id: number): Promise<KnowledgeArticle | undefined> {
    const [article] = await db.select().from(knowledgeArticles).where(eq(knowledgeArticles.id, id));
    return article;
  }

  async createKnowledgeArticle(article: InsertKnowledgeArticle): Promise<KnowledgeArticle> {
    const [created] = await db.insert(knowledgeArticles).values(article).returning();
    return created;
  }

  async updateKnowledgeArticle(id: number, article: Partial<InsertKnowledgeArticle>): Promise<KnowledgeArticle | undefined> {
    const [updated] = await db.update(knowledgeArticles)
      .set({ ...article, updatedAt: new Date() })
      .where(eq(knowledgeArticles.id, id))
      .returning();
    return updated;
  }

  async deleteKnowledgeArticle(id: number): Promise<void> {
    await db.delete(knowledgeArticles).where(eq(knowledgeArticles.id, id));
  }

  async deleteAllKnowledgeArticles(): Promise<number> {
    const allArticles = await db.select({ id: knowledgeArticles.id }).from(knowledgeArticles);
    if (allArticles.length > 0) {
      await db.delete(knowledgeArticles);
    }
    return allArticles.length;
  }

  async searchKnowledgeArticles(query: string, limit = 5): Promise<KnowledgeArticle[]> {
    const searchTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (searchTerms.length === 0) {
      return db.select().from(knowledgeArticles)
        .where(eq(knowledgeArticles.isActive, true))
        .limit(limit);
    }

    const likeConditions = searchTerms.map(term =>
      sql`(LOWER(${knowledgeArticles.title}) LIKE ${'%' + term + '%'} OR LOWER(${knowledgeArticles.content}) LIKE ${'%' + term + '%'} OR LOWER(${knowledgeArticles.category}) LIKE ${'%' + term + '%'})`
    );

    const results = await db.select({
      article: knowledgeArticles,
      relevance: sql<number>`(
        ${sql.join(searchTerms.map(term =>
          sql`(CASE WHEN LOWER(${knowledgeArticles.title}) LIKE ${'%' + term + '%'} THEN 3 ELSE 0 END + CASE WHEN LOWER(${knowledgeArticles.content}) LIKE ${'%' + term + '%'} THEN 1 ELSE 0 END + CASE WHEN LOWER(${knowledgeArticles.category}) LIKE ${'%' + term + '%'} THEN 2 ELSE 0 END)`
        ), sql` + `)}
      )`.as('relevance'),
    })
    .from(knowledgeArticles)
    .where(and(
      eq(knowledgeArticles.isActive, true),
      sql`(${sql.join(likeConditions, sql` OR `)})`
    ))
    .orderBy(sql`relevance DESC`)
    .limit(limit);

    return results.map(r => r.article);
  }

  async searchByVector(embedding: number[], limit = 5): Promise<KnowledgeArticle[]> {
    const vectorStr = `[${embedding.join(",")}]`;
    const results = await db.select()
      .from(knowledgeArticles)
      .where(and(
        eq(knowledgeArticles.isActive, true),
        sql`${knowledgeArticles.embedding} IS NOT NULL`
      ))
      .orderBy(sql`${knowledgeArticles.embedding} <=> ${vectorStr}::vector`)
      .limit(limit);
    return results;
  }

  async updateArticleEmbedding(id: number, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(",")}]`;
    await db.execute(sql`UPDATE knowledge_articles SET embedding = ${vectorStr}::vector WHERE id = ${id}`);
  }

  async getMediaAssets(type?: string, articleId?: number): Promise<MediaAsset[]> {
    const conditions = [];
    if (type) conditions.push(eq(mediaAssets.type, type));
    if (articleId) conditions.push(eq(mediaAssets.knowledgeArticleId, articleId));

    if (conditions.length === 0) {
      return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));
    }
    return db.select().from(mediaAssets)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(mediaAssets.createdAt));
  }

  async getMediaAsset(id: number): Promise<MediaAsset | undefined> {
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id));
    return asset;
  }

  async createMediaAsset(asset: InsertMediaAsset): Promise<MediaAsset> {
    const [created] = await db.insert(mediaAssets).values(asset).returning();
    return created;
  }

  async deleteMediaAsset(id: number): Promise<void> {
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
  }

  async deleteAllMediaAssets(): Promise<number> {
    const allMedia = await db.select({ id: mediaAssets.id }).from(mediaAssets);
    if (allMedia.length > 0) {
      await db.delete(mediaAssets);
    }
    return allMedia.length;
  }

  async getMediaByArticleId(articleId: number): Promise<MediaAsset[]> {
    return db.select().from(mediaAssets)
      .where(eq(mediaAssets.knowledgeArticleId, articleId));
  }

  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [created] = await db.insert(chatSessions).values(session).returning();
    return created;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }

  async getChatSessions(domain?: string, fromDate?: Date, toDate?: Date): Promise<ChatSession[]> {
    const conditions = [];
    if (domain) conditions.push(eq(chatSessions.sourceDomain, domain));
    if (fromDate) conditions.push(gte(chatSessions.startedAt, fromDate));
    if (toDate) conditions.push(lte(chatSessions.startedAt, toDate));

    if (conditions.length === 0) {
      return db.select().from(chatSessions).orderBy(desc(chatSessions.lastMessageAt));
    }
    return db.select().from(chatSessions)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(chatSessions.lastMessageAt));
  }

  async updateSessionLastMessage(id: number): Promise<void> {
    await db.update(chatSessions)
      .set({ lastMessageAt: new Date() })
      .where(eq(chatSessions.id, id));
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(message).returning();
    return created;
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.timestamp);
  }

  async getMessageCount(sessionId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId));
    return result?.count || 0;
  }

  async getSetting(key: string): Promise<string | undefined> {
    const [setting] = await db.select().from(adminSettings).where(eq(adminSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await db.insert(adminSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value, updatedAt: new Date() },
      });
  }

  async getAllSettings(): Promise<AdminSetting[]> {
    return db.select().from(adminSettings);
  }

  async getWidgetConfigs(): Promise<WidgetConfig[]> {
    return db.select().from(widgetConfigs).orderBy(desc(widgetConfigs.createdAt));
  }

  async getWidgetConfig(id: number): Promise<WidgetConfig | undefined> {
    const [config] = await db.select().from(widgetConfigs).where(eq(widgetConfigs.id, id));
    return config;
  }

  async createWidgetConfig(config: InsertWidgetConfig): Promise<WidgetConfig> {
    const [created] = await db.insert(widgetConfigs).values(config).returning();
    return created;
  }

  async updateWidgetConfig(id: number, config: Partial<InsertWidgetConfig>): Promise<WidgetConfig | undefined> {
    const [updated] = await db.update(widgetConfigs)
      .set(config)
      .where(eq(widgetConfigs.id, id))
      .returning();
    return updated;
  }

  async deleteWidgetConfig(id: number): Promise<void> {
    await db.delete(widgetConfigs).where(eq(widgetConfigs.id, id));
  }

  async createAnalyticsEvent(event: InsertAnalyticsEvent): Promise<void> {
    await db.insert(analyticsEvents).values(event);
  }

  async getAnalyticsSummary(fromDate?: Date, toDate?: Date): Promise<{
    totalSessions: number;
    totalMessages: number;
    avgMessagesPerSession: number;
    topCategories: Array<{ category: string; count: number }>;
    topDomains: Array<{ domain: string; count: number }>;
    sessionsOverTime: Array<{ date: string; count: number }>;
  }> {
    const sessionConditions = [];
    if (fromDate) sessionConditions.push(gte(chatSessions.startedAt, fromDate));
    if (toDate) sessionConditions.push(lte(chatSessions.startedAt, toDate));

    const sessionWhere = sessionConditions.length > 0
      ? (sessionConditions.length === 1 ? sessionConditions[0] : and(...sessionConditions))
      : undefined;

    const [sessionCount] = await db.select({ count: count() })
      .from(chatSessions)
      .where(sessionWhere);

    const [messageCount] = await db.select({ count: count() })
      .from(chatMessages);

    const totalSessions = sessionCount?.count || 0;
    const totalMessages = messageCount?.count || 0;
    const avgMessagesPerSession = totalSessions > 0 ? Math.round(totalMessages / totalSessions * 10) / 10 : 0;

    const topCategories = await db.select({
      category: analyticsEvents.data,
      count: count(),
    })
    .from(analyticsEvents)
    .where(eq(analyticsEvents.eventType, 'topic_queried'))
    .groupBy(analyticsEvents.data)
    .orderBy(desc(count()))
    .limit(10);

    const topDomains = await db.select({
      domain: chatSessions.sourceDomain,
      count: count(),
    })
    .from(chatSessions)
    .where(sessionWhere)
    .groupBy(chatSessions.sourceDomain)
    .orderBy(desc(count()))
    .limit(10);

    const sessionsOverTime = await db.select({
      date: sql<string>`TO_CHAR(${chatSessions.startedAt}, 'YYYY-MM-DD')`.as('date'),
      count: count(),
    })
    .from(chatSessions)
    .where(sessionWhere)
    .groupBy(sql`TO_CHAR(${chatSessions.startedAt}, 'YYYY-MM-DD')`)
    .orderBy(sql`date`);

    return {
      totalSessions,
      totalMessages,
      avgMessagesPerSession,
      topCategories: topCategories.map(c => ({
        category: (c.category as any)?.category || 'Unknown',
        count: c.count,
      })),
      topDomains: topDomains.map(d => ({
        domain: d.domain || 'Direct',
        count: d.count,
      })),
      sessionsOverTime: sessionsOverTime.map(s => ({
        date: s.date,
        count: s.count,
      })),
    };
  }

  async recordKnowledgeGap(question: string, sessionId?: number): Promise<void> {
    // Normalize: lowercase, trim, collapse whitespace
    const normalized = question.toLowerCase().trim().replace(/\s+/g, " ");

    // Check for an existing near-identical question (exact normalized match)
    const [existing] = await db
      .select()
      .from(knowledgeGaps)
      .where(eq(knowledgeGaps.question, normalized))
      .limit(1);

    if (existing) {
      await db
        .update(knowledgeGaps)
        .set({
          count: existing.count + 1,
          lastAskedAt: new Date(),
        })
        .where(eq(knowledgeGaps.id, existing.id));
    } else {
      await db.insert(knowledgeGaps).values({
        question: normalized,
        sessionId: sessionId ?? null,
      });
    }
  }

  async getKnowledgeGaps(resolvedOnly = false): Promise<KnowledgeGap[]> {
    return db
      .select()
      .from(knowledgeGaps)
      .where(eq(knowledgeGaps.resolved, resolvedOnly))
      .orderBy(desc(knowledgeGaps.count), desc(knowledgeGaps.lastAskedAt));
  }

  async resolveKnowledgeGap(id: number): Promise<void> {
    await db
      .update(knowledgeGaps)
      .set({ resolved: true })
      .where(eq(knowledgeGaps.id, id));
  }

  async deleteKnowledgeGap(id: number): Promise<void> {
    await db.delete(knowledgeGaps).where(eq(knowledgeGaps.id, id));
  }
}

export const storage = new DatabaseStorage();
