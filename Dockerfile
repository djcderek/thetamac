# syntax=docker/dockerfile:1

# Base stage for shared dependencies
FROM node:22-bookworm-slim AS base
WORKDIR /app

# Install dependencies for canvas (required by your project)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    pkg-config \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    libfreetype6-dev \
    libpixman-1-dev \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Dependencies stage
FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Fly serves only Socket.io; its image needs no Next.js build or database access.
FROM deps AS websocket
COPY server.ts tsconfig.json ./
COPY src ./src

ARG GIT_REVISION=unknown
RUN printf '%s\n' "$GIT_REVISION" > REVISION \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV WEBSOCKET_ONLY=true
ENV PORT=3000

USER nextjs
EXPOSE 3000
CMD ["node", "--import", "tsx", "server.ts"]

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN SKIP_ENV_VALIDATION=true npm run build

# Runner stage
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src ./src
COPY --from=builder /app/prisma ./prisma

# Copy Prisma generated client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run the combined Next.js + WebSocket server
CMD ["npx", "tsx", "server.ts"]
