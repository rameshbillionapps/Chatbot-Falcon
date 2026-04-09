# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# ffmpeg is required by server/replit_integrations/audio/client.ts
# for converting WebM/MP4/OGG audio to WAV before transcription
RUN apk add --no-cache ffmpeg

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# App bundle
COPY --from=builder /app/dist ./dist

# drizzle-kit needs these at runtime for db:push
COPY --from=builder /app/drizzle.config.ts ./
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/tsconfig.json ./

EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "dist/index.cjs"]
