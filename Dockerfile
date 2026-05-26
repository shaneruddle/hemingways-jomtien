# ---- Build stage ----
FROM node:20-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-slim
WORKDIR /app

# Copy only what's needed to run
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/public ./public

# Install only production deps
RUN npm ci --omit=dev

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server.js"]
