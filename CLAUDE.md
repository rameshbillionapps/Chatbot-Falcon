# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Garment manufacturer website for Falcon Head Gear and Meenax T-Shirts (Tiruppur, India) with an AI-powered chatbot. The chatbot uses RAG to answer supplier queries. It is embeddable on client websites via script tag, GTM, or iframe. An admin dashboard is available behind login.

## Commands

```bash
# Development
npm run dev        # Start dev server (tsx server/index.ts)

# Build & Type Check
npm run build      # Build via script/build.ts (esbuild)
npm run check      # TypeScript type check

# Database
npm run db:push    # Push schema changes with drizzle-kit
```

The server and Vite dev server run together via `server/vite.ts`. There is no separate frontend dev command.

## Architecture

**Single-repo, not a monorepo.** Frontend (React) and backend (Express) are bundled together with a custom esbuild script at `script/build.ts`. In dev, the Express server serves the Vite dev middleware.

### Key Files

- `shared/schema.ts` — Drizzle schema for all tables (includes pgvector custom type for embeddings)
- `server/index.ts` — Express entry point; sets up auth middleware before routes
- `server/auth.ts` — Passport.js local strategy, session setup, `/api/auth/*` endpoints, admin seeder
- `server/storage.ts` — Database access layer (`IStorage` interface); all DB queries go here
- `server/rag.ts` — RAG engine: vector search → keyword LIKE fallback → OpenAI response
- `server/openai.ts` — Two OpenAI clients: Replit AI Integrations for chat, direct API for embeddings
- `server/routes.ts` — All API routes (public chat + admin CRUD)
- `client/src/App.tsx` — React Router with `ProtectedRoute` wrapper for admin pages

### RAG / Embedding System

- pgvector extension in PostgreSQL; `knowledge_articles.embedding` is `vector(1536)` (text-embedding-3-small)
- Embeddings require a **direct OpenAI API key** stored in `admin_settings` table (`key = 'openai_api_key'`)
- Auto-generated on article create/update; "Regenerate Embeddings" button in Settings does all at once
- Falls back to keyword LIKE search with relevance scoring if vector search fails or no embeddings exist

### Authentication

- Session-based: Passport.js local strategy + express-session + scrypt password hashing
- All `/api/admin/*` routes protected by `requireAuth` middleware (defined in `server/auth.ts`)
- Default credentials: `admin` / `admin123`

### Database Tables

`users`, `knowledge_articles` (with vector embedding), `media_assets`, `chat_sessions`, `chat_messages`, `admin_settings`, `widget_configs`, `analytics_events`

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (with pgvector extension) |
| `SESSION_SECRET` | express-session secret |
| OpenAI API key | Stored in DB (`admin_settings`), not an env var — configured via admin Settings UI |
