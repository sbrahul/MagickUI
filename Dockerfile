# ── Stage 1: build client ──────────────────────────────────────────
FROM node:22-alpine3.20 AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: production server ─────────────────────────────────────
FROM node:22-alpine3.20 AS production

# imagemagick-heic includes libheif for HEIF/HEIC support.
# Falls back gracefully if unavailable — /api/capabilities reports it.
RUN apk add --no-cache imagemagick imagemagick-heic 2>/dev/null || apk add --no-cache imagemagick

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-builder /app/client/dist ./public

# Harden ImageMagick — policy.xml path may be -6 or -7 depending on Alpine package
COPY policy.xml /etc/ImageMagick-7/policy.xml

# Run as non-root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
ENV PORT=3000 NODE_ENV=production
CMD ["node", "index.js"]
