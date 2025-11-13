FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm i -f

# Copy source
COPY . .

# Build NestJS
RUN npm run build


# ---- Production Image ----
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

# Copy only build output + node_modules (prod)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]


# docker buildx build --platform linux/amd64,linux/arm64 \
#   -t quanluonluon/gigafit-api:latest \