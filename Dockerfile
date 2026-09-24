# syntax=docker/dockerfile:1

# Production image for any container host (Fly.io, Render, Railway, Cloud
# Run, ECS...). Vercel doesn't need this; it builds from the repo directly.
#
#   docker build -t hospitality .
#   docker run -p 3000:3000 -e ANTHROPIC_API_KEY=sk-... hospitality
#
# Without ANTHROPIC_API_KEY the app runs in Demo Mode on bundled fixtures.
# The key is read at runtime only — never pass it as a build arg.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# public/ is empty in the repo (git skips empty dirs); the run stage copies it.
RUN mkdir -p public && npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs

# The standalone server plus the assets it leaves out (mirrors
# scripts/prepare-standalone.mjs).
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/config >/dev/null || exit 1

CMD ["node", "server.js"]
