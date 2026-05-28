# Stage 1: Install dependencies (includes native build tools for better-sqlite3)
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++ build-base
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build Next.js with standalone output
FROM deps AS builder
WORKDIR /app
COPY . .
RUN npm run build

# Stage 3: Minimal runtime
FROM node:22-alpine AS runner
# better-sqlite3 needs these at runtime too (native .node addon)
RUN apk add --no-cache python3 make g++ build-base
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
