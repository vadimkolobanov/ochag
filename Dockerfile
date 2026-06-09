# Multi-stage: сборка фронта (web) → Fastify раздаёт dist/ как статику + /api/* (ТЗ §3).
# Порт внутри сети — 8088.

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm install
COPY . .
RUN npm --workspace web run build && npm --workspace server run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY server/package.json ./server/
RUN npm install --omit=dev --workspace server
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist
EXPOSE 8088
CMD ["node", "server/dist/index.js"]
