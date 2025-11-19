# ===========================
#        BUILDER
# ===========================
FROM node:20-slim AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package*.json pnpm-lock.yaml ./

# Install dependencies (dev + prod)
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install

COPY . .
RUN pnpm build


# ===========================
#   PROD BUILDER (prod deps)
# ===========================
FROM node:20-slim AS prod-builder

WORKDIR /app
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package*.json pnpm-lock.yaml ./

# Remove husky script
RUN pnpm pkg delete scripts.prepare || true

# Install only prod dependencies
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --prod --frozen-lockfile

# ===========================
#        DISTROLESS
# ===========================
FROM gcr.io/distroless/nodejs20

WORKDIR /app

COPY --from=prod-builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["dist/cluster.js"]
