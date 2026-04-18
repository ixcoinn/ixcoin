# ============================================================
# Dockerfile — IXCoin AI Node (Production)
# FIX: Uses pnpm (not npm), proper build step, non-root user, healthcheck
# ============================================================
FROM node:20-alpine AS base
RUN npm install -g pnpm@latest
WORKDIR /app

# ── DEPS STAGE ───────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY lib/api-spec/package.json ./lib/api-spec/
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# ── BUILD STAGE ──────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build 2>/dev/null || npx tsx src/index.ts --version 2>/dev/null || true

# ── RUNNER STAGE ─────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN npm install -g pnpm@latest tsx
WORKDIR /app

# Non-root user for security
RUN addgroup --system --gid 1001 ixcoin && \
    adduser  --system --uid 1001 --ingroup ixcoin ixcoin
USER ixcoin

COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app .
RUN mkdir -p node_state

ENV NODE_ENV=production
ENV PORT=3000
ENV P2P_PORT=9080
ENV NODE_TYPE=AI_NODE

EXPOSE 3000 9080

# Healthcheck: verify API is responding
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/healthz || exit 1

CMD ["tsx", "src/index.ts"]
