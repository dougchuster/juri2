# =================================================================
# Dockerfile — Sistema Jurídico ADV
# Multi-stage build: deps → builder → runner
# =================================================================

# ── Stage 1: Install all dependencies ────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# libc6-compat needed for some native addons (sharp, bcrypt, etc.)
RUN apk add --no-cache libc6-compat

COPY package*.json ./
# Install ALL deps (devDeps needed at runtime for ts-node custom server)
RUN npm ci --no-audit --no-fund

# ── Stage 2: Build Next.js application ───────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (uses schema.prisma → src/generated/prisma)
RUN npx prisma generate

# Build Next.js
RUN npm run build

# ── Stage 3: Production runtime ──────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

RUN apk add --no-cache libc6-compat wget

# Non-root user for security
RUN addgroup -g 1001 -S nodejs \
 && adduser  -S nextjs -u 1001 -G nodejs

# ── Copy built artifacts ──────────────────────────────────────────
# Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next            ./.next
# Static assets
COPY --from=builder --chown=nextjs:nodejs /app/public           ./public
# All node_modules (ts-node needed at runtime for custom server)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules     ./node_modules
# Package manifests
COPY --from=builder --chown=nextjs:nodejs /app/package.json     ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/package-lock.json ./package-lock.json
# Custom server (runs via ts-node at start)
COPY --from=builder --chown=nextjs:nodejs /app/server.ts        ./server.ts
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json    ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.ts   ./next.config.ts
# Prisma schema + generated client
COPY --from=builder --chown=nextjs:nodejs /app/prisma           ./prisma
# Source (needed by ts-node for socket-server and other runtime requires)
COPY --from=builder --chown=nextjs:nodejs /app/src              ./src

# Ensure uploads directory exists and is writable (volume mount overrides)
RUN mkdir -p /app/public/uploads \
 && chown -R nextjs:nodejs /app/public/uploads

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null 2>&1 || exit 1

CMD ["npm", "run", "start"]
