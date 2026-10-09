# Backend (`server/`)

Node.js-сервер SUSHIRIGA: JSON API под `/api` + раздача собранного фронтенда (SPA) с того же
адреса. Источник истины для цен, сумм, промокодов, статусов заказов и отзывов.

| Что             | Чем                                                                 |
| --------------- | ------------------------------------------------------------------- |
| HTTP            | [Hono](https://hono.dev) на `@hono/node-server`                     |
| База            | SQLite через встроенный `node:sqlite` (Node ≥ 22.13), файл + WAL    |
| Валидация       | zod: все тела запросов, у каждой строки есть лимит длины            |
| Доменная логика | общая с фронтендом: `src/features/*` (цены, промо, слоты, статусы)  |
| Сборка          | `vite build --config vite.server.config.ts` → `dist-server/main.js` |

Код: `server/main.ts` (запуск) → `context.ts` (сборка) → `app.ts` (маршруты) → `services/*`
(логика) → `db/store.ts` (все SQL-запросы, только prepared statements) → `db/database.ts`
(схема и миграции через `PRAGMA user_version`).

## Запуск

```bash
npm run server:dev                         # API на :8787 (tsx watch), фронтенд — npm run dev
VITE_API_URL=http://localhost:8787 npm run dev   # фронтенд против локального API

# production: один процесс раздаёт и API, и сайт
VITE_API_URL=/ npx vite build && npm run server:build
NODE_ENV=production ORDER_TOKEN_SECRET="$(openssl rand -base64 48)" npm run server:start
```

Docker: `docker build -t sushiriga . && docker run -p 8787:8787 -v sushiriga-data:/data -e ORDER_TOKEN_SECRET=… sushiriga`.
База лежит в томе `/data` — его нужно бэкапить (SQLite: `sqlite3 sushiriga.db ".backup x.db"`).

Переменные — `server/.env.example`. Секреты сервера **никогда** не имеют префикса `VITE_`.

## API

Все ошибки: `{ "error": { "code": "…", "message": "…" } }`, без стектрейсов.

| Метод и путь                      | Что делает                                                         | Лимит/мин |
| --------------------------------- | ------------------------------------------------------------------ | --------- |
| `GET /api/health`                 | `{ ok, time }` — живость и часы сервера                            | —         |
| `GET /api/catalog`                | меню (из репозитория) + изменения персонала (нет в наличии, цена)  | —         |
| `GET /api/locations`              | активные точки самовывоза                                          | —         |
| `POST /api/promo/validate`        | предпросмотр скидки `{ code, subtotal }`; финально — в quote       | 20        |
| `POST /api/checkout/quote`        | `CheckoutRequest` → `CheckoutQuote` (сервер считает всё сам)       | 30        |
| `POST /api/orders`                | `{ quoteId }` → `{ order, accessToken }`, статус `PENDING_PAYMENT` | 10        |
| `GET /api/orders/:id`             | заказ; заголовок `X-Order-Token`                                   | 120       |
| `GET/POST /api/orders/:id/review` | отзыв к заказу (только после `PICKED_UP`, один на заказ)           | 5 (POST)  |
| `GET /api/reviews`                | только опубликованные (после модерации), без ссылок на заказ       | —         |

### Что проверяет сервер при оформлении

- товары существуют и доступны (с учётом «нет в наличии»), количество 1–99, цены — только свои;
- промокод: активен, не истёк, лимит, минимальная сумма; персональные коды без аккаунта не действуют;
- чаевые 0…€500 целыми центами; точка активна;
- контакты гостя (имя 2–80, телефон 7–15 цифр, e-mail по формату);
- время самовывоза — **часами сервера**: «как можно скорее» только пока точка открыта и успевает,
  слот — ровно один из предлагаемых сейчас (≥ 30 мин, до закрытия);
- quote живёт 30 минут; при создании заказа время перепроверяется ещё раз;
- один quote → один заказ (повтор запроса возвращает тот же заказ и тот же токен).

### Доступ к гостевому заказу

Аккаунтов нет, поэтому доступ к заказу даёт токен `HMAC-SHA256(ORDER_TOKEN_SECRET, id)`. Он
возвращается при создании заказа и хранится в браузере клиента (`localStorage`). Без токена
сервер отвечает «не найдено» — так же, как для несуществующего id (заказы нельзя перебирать).

## Безопасность

- CSP `default-src 'self'` (без inline-скриптов), `frame-ancestors 'none'`, `nosniff`,
  `Referrer-Policy: no-referrer`, HSTS в production, `Cache-Control: no-store` для API.
- CORS выключен по умолчанию (фронтенд на том же адресе); разрешённые origin — `CORS_ORIGINS`.
- Лимит тела запроса 32 КБ, лимиты частоты по IP (в памяти процесса; для нескольких инстансов —
  общий Redis). За прокси — `TRUST_PROXY=1`.
- В production сервер не стартует без `ORDER_TOKEN_SECRET` (≥ 32 символа); тестовые часы
  (`TEST_CLOCK_START`) в production запрещены.
- Персональные данные (имя, телефон, e-mail) есть только в заказе и отдаются только владельцу токена.

## Тесты

- `server/app.test.ts` — API: цены, промо, валидация, время самовывоза, токены, отзывы, лимиты,
  заголовки, раздача SPA, сохранность после перезапуска.
- `server/frontendContract.test.ts` — HTTP-сервисы фронтенда (`src/services/http`) против
  настоящего приложения сервера в процессе.
- `e2e-server/` (`npm run test:e2e:server`) — Playwright против production-сборки сервера с
  чистой SQLite: оформление, чтение заказа после перезагрузки, отказ без токена, 360 px.
