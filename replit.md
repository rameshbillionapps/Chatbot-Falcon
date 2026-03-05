# SupplierBot - AI Chatbot for Garment Manufacturers

## Overview
AI-powered chatbot that helps suppliers (buyers/customers) interact with garment manufacturing companies (Falcon Head Gear, Meenax T-shirts) based in Tiruppur, India. Uses RAG with knowledge base content to answer questions about T-shirts, caps, uniforms, fabrics, printing methods, MOQ, care instructions, and ordering. Embeddable on any client website via script tag, GTM, or iframe.

## Tech Stack
- **Frontend:** React + TypeScript + Tailwind CSS + Shadcn UI + Framer Motion + Recharts
- **Backend:** Express.js + TypeScript
- **Database:** PostgreSQL (Replit built-in) with Drizzle ORM
- **AI/LLM:** OpenAI gpt-5.2 via Replit AI Integrations (AI_INTEGRATIONS_OPENAI_API_KEY, AI_INTEGRATIONS_OPENAI_BASE_URL)
- **RAG:** PostgreSQL full-text LIKE search with relevance scoring
- **Caching:** In-memory cache with TTL for knowledge articles and media

## Project Structure
```
shared/schema.ts          - Drizzle schema (knowledge_articles, media_assets, chat_sessions, chat_messages, admin_settings, widget_configs, analytics_events)
server/
  index.ts                - Express server entry point
  db.ts                   - PostgreSQL connection pool
  cache.ts                - In-memory cache utility
  openai.ts               - OpenAI client (Replit AI Integrations)
  storage.ts              - Database storage layer (IStorage interface)
  rag.ts                  - RAG engine (search + OpenAI chat completions)
  seed.ts                 - Knowledge base seeder (20 articles + 27 media assets)
  routes.ts               - API routes (chat, admin CRUD, widget config)
  vite.ts                 - Vite dev server setup
  static.ts               - Static file serving (production)
client/src/
  App.tsx                 - Routes: /, /admin/*, 404
  pages/
    home.tsx              - Landing page with chat widget
    not-found.tsx         - 404 page
    admin/
      analytics.tsx       - Analytics dashboard (charts, stats)
      knowledge.tsx       - Knowledge base CRUD
      media.tsx            - Media asset manager
      chat-history.tsx    - Chat session viewer
      settings.tsx        - Bot settings configuration
      widgets.tsx         - Widget embed code generator
  components/
    chatbot/
      chat-widget.tsx     - Floating chat widget with animation
      chat-message.tsx    - Message bubbles with media carousel
      chat-input.tsx      - Message input with send
    admin/
      admin-layout.tsx    - Sidebar navigation layout
    ui/                   - Shadcn UI components
client/public/
  images/instagram/       - 15 Instagram product images
  uploads/                - User-uploaded media files
```

## API Routes
- `POST /api/chat` - Send message, get AI response with media
- `POST /api/chat/sessions` - Create chat session
- `GET /api/chat/sessions/:id/messages` - Get session messages
- `GET /api/admin/knowledge` - List knowledge articles
- `POST /api/admin/knowledge` - Create article
- `PUT /api/admin/knowledge/:id` - Update article
- `DELETE /api/admin/knowledge/:id` - Delete article
- `GET /api/admin/media` - List media assets
- `POST /api/admin/media` - Create media by URL
- `POST /api/admin/media/upload` - Upload file
- `DELETE /api/admin/media/:id` - Delete media
- `GET /api/admin/settings` - Get all settings
- `PUT /api/admin/settings/:key` - Update setting
- `GET /api/admin/sessions` - List chat sessions
- `GET /api/admin/sessions/:id/messages` - Get session messages
- `GET /api/admin/analytics` - Analytics summary
- `GET/POST/PUT/DELETE /api/admin/widgets` - Widget config CRUD
- `GET /api/widget/:id/config` - Public widget config (CORS enabled)

## Database
PostgreSQL with tables: users, knowledge_articles, media_assets, chat_sessions, chat_messages, admin_settings, widget_configs, analytics_events, conversations, messages

## Key Dependencies
multer (file uploads), framer-motion (animations), recharts (charts), openai, drizzle-orm, @tanstack/react-query, wouter

## Seeds
20 knowledge articles covering: products (polo, crew neck, fleece, sublimation, caps, uniforms, customization), fabrics (GSM guide, cotton types), printing methods, care instructions, pricing/MOQ, production process, company info, FAQ, export/shipping, quality control, ordering process
27 media assets: product images, PDF catalogues, Instagram images
