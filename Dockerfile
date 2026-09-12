# syntax=docker/dockerfile:1

# --- dependencies -----------------------------------------------------------
# Every dependency is pure JavaScript now, so no build toolchain is needed.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ------------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they
# have to be present here — not just at runtime.
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SHORTCUT_URL
ENV NEXT_PUBLIC_BASE_URL=$NEXT_PUBLIC_BASE_URL \
    NEXT_PUBLIC_SHORTCUT_URL=$NEXT_PUBLIC_SHORTCUT_URL \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# State lives in Postgres — DATABASE_URL is supplied at runtime.

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
