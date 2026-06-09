# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Garment manufacturer website for Falcon Head Gear and Meenax T-Shirts (Tiruppur, India) with an AI-powered chatbot. The chatbot uses RAG to answer supplier queries. It is embeddable on client websites via script tag, GTM, or iframe. An admin dashboard is available behind login.

## Commands

```bash
# Development
npm run dev                # Start dev server (tsx server/index.ts + Vite)

# Build & Type Check
npm run build              # Build via script/build.ts (esbuild)
npm run check              # TypeScript type check
npm run start              # Start production build (NODE_ENV=production)

# Database
npm run db:push            # Push schema changes with drizzle-kit
npm run db:seed:academic   # Seed academic knowledge base (runs seed-academic.ts)
```

The server and Vite dev server run together via `server/vite.ts`. There is no separate frontend dev command. Both run on the same port via Express middleware.

## Architecture

**Single-repo, not a monorepo.** Frontend (React) and backend (Express) are bundled together with a custom esbuild script at `script/build.ts`. In dev, the Express server serves the Vite dev middleware.

### Key Files

- `shared/schema.ts` — Drizzle schema for all tables (includes pgvector custom type for embeddings)
- `server/index.ts` — Express entry point; sets up auth + CORS middleware before routes
- `server/auth.ts` — Passport.js local strategy, session setup, `/api/auth/*` endpoints, admin seeder
- `server/storage.ts` — Database access layer (`IStorage` interface); all DB queries go here
- `server/rag.ts` — RAG engine: vector search → keyword LIKE fallback → OpenAI response
- `server/openai.ts` — Two OpenAI clients: Replit AI Integrations for chat, direct API for embeddings
- `server/routes.ts` — All API routes (public chat + admin CRUD, media upload, lead capture)
- `server/s3.ts` — S3 file storage for media assets (optional; uses AWS SDK)
- `server/cache.ts` — In-memory TTL cache utility for responses
- `client/src/App.tsx` — React Router with `ProtectedRoute` wrapper for admin pages

### RAG / Embedding System

- pgvector extension in PostgreSQL; `knowledge_articles.embedding` is `vector(1536)` (text-embedding-3-small)
- **Two separate OpenAI integrations:**
  - Chat completions: via Replit AI Integrations (built-in, no key needed)
  - Embeddings: requires **direct OpenAI API key** stored in `admin_settings` table (`key = 'openai_api_key'`)
- Embeddings auto-generated on article create/update; "Regenerate Embeddings" button in Settings regenerates all at once
- RAG pipeline: vector similarity search → keyword LIKE fallback with relevance scoring → OpenAI response generation
- If vector search fails or no embeddings exist, falls back gracefully to keyword search

### Authentication

- Session-based: Passport.js local strategy + express-session + scrypt password hashing
- All `/api/admin/*` routes protected by `requireAuth` middleware (defined in `server/auth.ts`)
- Default credentials: `admin` / `admin123`

### Widget / Embed System

- Chatbot is embeddable on third-party websites via script tag, GTM, or iframe
- Widget configuration stored in `widget_configs` table (per-widget customization)
- CORS enabled on `/api/widget/:id/*` endpoints for cross-origin chat requests
- Public chat API (`/api/chat`) accepts text + image messages (multipart form data)
- Chat sessions tracked with IP-based fingerprinting for analytics

### Database Tables

`users`, `knowledge_articles` (with vector embedding), `media_assets`, `chat_sessions`, `chat_messages`, `admin_settings`, `widget_configs`, `analytics_events`

## Key Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (with pgvector extension) |
| `SESSION_SECRET` | express-session secret for signed session cookies |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` | S3 integration for media uploads (optional) |
| OpenAI API key | Stored in DB (`admin_settings`), not an env var — configured via admin Settings UI |

## Initial Setup

After cloning and installing dependencies, run `npm run db:push` to initialize the database schema. The admin seeder in `server/auth.ts` creates the default admin user (`admin`/`admin123`) automatically on first boot if none exist. For knowledge base setup, use `npm run db:seed:academic` or manually add articles via the admin dashboard.
