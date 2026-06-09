# Очаг — семейный бюджет для двоих

PWA для ведения семейного бюджета **ровно двумя** пользователями («Он» / «Она»).
Отвечает на три вопроса: сколько осталось на повседневное до зарплаты, какие платежи
этого месяца ещё горят, и сколько в копилке. Подробности — в [брендбуке](01_Проект_и_брендбук_Очаг.md)
и [техзадании](02_Техзадание_Очаг_для_Opus.md).

## Стек

- **Backend:** Node.js ≥ 20, Fastify, better-sqlite3, zod (без ORM).
- **Frontend:** React 18 + TypeScript + Vite, Tailwind CSS, @tanstack/react-query, react-router-dom, lucide-react.
- **PWA:** vite-plugin-pwa. **Тесты:** vitest (модуль `server/src/core/logic.ts`).
- **Деплой:** один Docker-образ + Caddy (HTTPS) в `docker-compose.yml`, том `./data` под SQLite.

## Структура

```
ochag/
  package.json          # npm workspaces: server, web
  docker-compose.yml    # app + Caddy (HTTPS)
  Dockerfile            # multi-stage: build web → Fastify раздаёт dist/ + /api/*
  Caddyfile
  server/               # Fastify API + core/logic (расчёты)
  web/                  # React PWA
  data/                 # том; ochag.sqlite (в .gitignore)
```

## Локальная разработка

```bash
npm install
npm test            # тесты расчётов (server)
npm run dev:server  # API
npm run dev:web     # фронт (Vite)
```

## Развёртывание на чистом VPS

```bash
git clone <repo> ochag && cd ochag
cp .env.example .env          # задать OCHAG_CODE и OCHAG_DOMAIN
docker compose up -d --build  # БД и сиды создаются автоматически
```

Приложение поднимется на вашем домене по HTTPS (Caddy получит сертификат Let's Encrypt).
Доступ — только по семейному коду `OCHAG_CODE` (вводится один раз на каждом телефоне).

## Установка PWA

- **iPhone (Safari):** откройте сайт → «Поделиться» → «На экран „Домой“».
- **Android (Chrome):** откройте сайт → меню (⋮) → «Установить приложение».

## Резервная копия

Настройки → «Скачать резервную копию (JSON)». Рекомендуется раз в месяц.

---

Статус: каркас репозитория (этап-гейты — см. ТЗ §12).
