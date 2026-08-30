# syntax=docker/dockerfile:1

# Next.js 16 / React 19 require Node 20.9+ — use 22 LTS.
ARG NODE_VERSION=22-alpine

# ---------------------------------------------------------------------------
# Stage 1: deps — install dependencies only (cached separately from source
# so `docker build` doesn't re-run npm ci every time app code changes).
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# Stage 2: builder — build the app with full devDependencies available.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# NEXT_PUBLIC_* vars are inlined into the client bundle at build time, so
# they must be supplied as build args (via docker-compose `args:`), not just
# runtime env. This must be the PUBLIC URL the *browser* can reach (through
# the pb.kabatufarm.duckdns.org Nginx proxy) — NOT an internal container
# hostname, since login/auth happens client-side (see lib/pb.ts).
ARG NEXT_PUBLIC_POCKETBASE_URL
ENV NEXT_PUBLIC_POCKETBASE_URL=${NEXT_PUBLIC_POCKETBASE_URL}
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 3: runner — minimal final image. Only the standalone server output
# is copied in; no node_modules, no source, no devDependencies.
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# `output: "standalone"` (next.config.ts) traces the minimal server + deps
# into .next/standalone, including a generated server.js entrypoint.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Only copy /public if it exists in your project (this repo currently has
# none). If you add one later, uncomment:
# COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
