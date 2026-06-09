# Cache bust - Force rebuild - Commit bb17d32
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

VOLUME ["/app/data"]
EXPOSE 3002
CMD ["npm", "start"]
