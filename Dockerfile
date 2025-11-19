# ===========================
#        BUILDER
# ===========================
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

# Install all deps (including dev) for building NestJS
RUN --mount=type=cache,target=/root/.npm \
    npm ci --legacy-peer-deps

COPY . .

RUN npm run build


# ===========================
#    PROD BUILDER (deps)
# ===========================
FROM node:20-slim AS prod-builder

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./

# Remove Husky prepare script
RUN npm pkg delete scripts.prepare || true

# Install only production dependencies
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force


# ===========================
#        DISTROLESS
# ===========================
FROM gcr.io/distroless/nodejs20

WORKDIR /app

# Copy prod modules
COPY --from=prod-builder /app/node_modules ./node_modules

# Copy dist output
COPY --from=builder /app/dist ./dist

EXPOSE 3000

# Start NestJS via native cluster
CMD ["dist/cluster.js"]
