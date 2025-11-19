# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build


# ---------- Production ----------
FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install PM2 globally
RUN npm install -g pm2@latest

# Copy build & dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

EXPOSE 3000

# Run NestJS with PM2 in cluster mode using all CPU cores
CMD ["pm2-runtime", "start", "dist/main.js", "-i", "max"]
