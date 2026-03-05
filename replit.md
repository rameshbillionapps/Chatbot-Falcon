# Falcon Head Gear & Meenax T-Shirts - Manufacturer Website with AI Chatbot

## Overview
Garment manufacturer website for Falcon Head Gear and Meenax T-shirts (Tiruppur, India) with an AI-powered chatbot. The chatbot uses RAG to answer supplier queries about products, fabrics, printing, MOQ, care, ordering. Embeddable on client websites via script tag, GTM, or iframe. Admin dashboard behind login.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Replit built-in) with Drizzle ORM
- **Auth:** Passport.js with local strategy, express-session, scrypt password hashing
- **AI/LLM:** OpenAI gpt-5.2 via Replit AI Integrations
- **RAG:** PostgreSQL full-text LIKE search with relevance scoring
- **Caching:** In-memory cache with TTL

## Authentication
- Default admin credentials: username=`admin`, password=`admin123`
- Login page at `/admin/login`
- All `/api/admin/*` routes protected with `requireAuth` middleware
- Session-based auth using express-session + passport-local
- Auth files: `server/auth.ts`, `client/src/hooks/use-auth.ts`, `client/src/pages/admin/login.tsx`

## Project Structure
```
shared/schema.ts          - Drizzle schema
server/
  index.ts                - Express server entry point (sets up auth before routes)
  auth.ts                 - Passport.js auth setup, login/logout/me endpoints, admin seeder
  db.ts                   - PostgreSQL connection pool
  cache.ts                - In-memory cache utility
  openai.ts               - OpenAI client (Replit AI Integrations)
  storage.ts              - Database storage layer (IStorage interface)
  rag.ts                  - RAG engine (search + OpenAI, compact response style)
  seed.ts                 - Knowledge base seeder (20 articles + 27 media assets)
  routes.ts               - API routes (chat, admin CRUD with requireAuth, widget config)
client/src/
  App.tsx                 - Routes with ProtectedRoute wrapper for admin
  hooks/use-auth.ts       - Auth hook (GET /api/auth/me)
  pages/
    home.tsx              - Manufacturer landing page (products, services, gallery, contact)
    admin/login.tsx       - Admin login page
    admin/analytics.tsx   - Analytics dashboard
    admin/knowledge.tsx   - Knowledge base CRUD
    admin/media.tsx       - Media asset manager
    admin/chat-history.tsx - Chat session viewer
    admin/settings.tsx    - Bot settings
    admin/widgets.tsx     - Widget embed code generator
  components/
    chatbot/              - Chat widget, messages, input
    admin/admin-layout.tsx - Sidebar with logout button
client/public/images/instagram/ - 15 Instagram product images
```

## API Routes
### Public
- `POST /api/chat` - Send message, get AI response
- `POST /api/chat/sessions` - Create chat session
- `GET /api/widget/:id/config` - Widget config (CORS enabled)

### Auth
- `POST /api/auth/login` - Login (username, password)
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Current user

### Admin (all require auth)
- CRUD: `/api/admin/knowledge`, `/api/admin/media`, `/api/admin/widgets`
- `POST /api/admin/media/upload` - File upload
- `GET/PUT /api/admin/settings`
- `GET /api/admin/sessions`, `/api/admin/analytics`

## Database
PostgreSQL tables: users, knowledge_articles, media_assets, chat_sessions, chat_messages, admin_settings, widget_configs, analytics_events

## Seeds
20 knowledge articles, 27 media assets, default admin user, default widget config
