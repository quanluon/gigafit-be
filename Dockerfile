# ===========================
#        BUILDER
# ===========================
FROM node:20-slim AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Install both dev & prod deps (for building)
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile

COPY . .

# 🟢 Build NestJS using SWC (super fast)
RUN pnpm build


# ===========================
#   PROD BUILDER (prod deps)
# ===========================
FROM node:20-slim AS prod-builder

WORKDIR /app
ENV NODE_ENV=production

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml ./

# Remove husky prepare script (fix CI)
RUN pnpm pkg delete scripts.prepare || true

# Install ONLY production deps
# (important for small distroless final image)
RUN --mount=type=cache,target=/root/.pnpm-store \
    pnpm install --prod --frozen-lockfile


# ===========================
#        DISTROLESS IMAGE
# ===========================
FROM gcr.io/distroless/nodejs20

WORKDIR /app

# Copy node_modules (prod only) and dist build
COPY --from=prod-builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Cluster mode entrypoint
EXPOSE 3000
CMD ["dist/cluster.js"]
