# Stage 1: сборка фронта + бэкенда
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY web/package.json ./web/
RUN npm ci
COPY server/ ./server/
COPY web/ ./web/
RUN npm --workspace web run build && npm --workspace server run build

# Stage 2: продакшн-образ (только нужное)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --omit=dev --workspace server
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./web/dist
RUN mkdir -p /app/data
EXPOSE 8088
CMD ["node", "server/dist/index.js"]
