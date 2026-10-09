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

| Метод и путь                           | Что делает                                                         | Лимит/мин |
| -------------------------------------- | ------------------------------------------------------------------ | --------- |
| `GET /api/health`                      | `{ ok, time }` — живость и часы сервера                            | —         |
| `GET /api/catalog`                     | меню (из репозитория) + изменения персонала (нет в наличии, цена)  | —         |
| `GET /api/locations`                   | активные точки самовывоза                                          | —         |
| `POST /api/promo/validate`             | предпросмотр скидки `{ code, subtotal }`; финально — в quote       | 20        |
| `POST /api/checkout/quote`             | `CheckoutRequest` → `CheckoutQuote` (сервер считает всё сам)       | 30        |
| `POST /api/orders`                     | `{ quoteId }` → `{ order, accessToken }`, статус `PENDING_PAYMENT` | 10        |
| `GET /api/orders/:id`                  | заказ; заголовок `X-Order-Token`                                   | 120       |
| `GET/POST /api/orders/:id/review`      | отзыв к заказу (только после `PICKED_UP`, один на заказ)           | 5 (POST)  |
| `GET /api/config`                      | `{ payments: { provider, publishableKey } \| null }`               | —         |
| `POST /api/orders/:id/payment`         | создать/переиспользовать Stripe PaymentIntent на сумму заказа      | 20        |
| `POST /api/orders/:id/payment/refresh` | сервер сам спрашивает Stripe о платеже → заказ                     | 60        |
| `POST /api/stripe/webhook`             | события Stripe; подлинность — подпись `Stripe-Signature`           | —         |
| `GET /api/reviews`                     | только опубликованные (после модерации), без ссылок на заказ       | —         |

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

## Оплата (Stripe)

Включается тремя переменными сервера: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET` (все или ни одной; test и live не смешиваются — сервер не стартует).
Без ключей сайт работает, заказы остаются «Ожидает оплаты» и честно говорят, что онлайн-оплаты нет.

Поток:

1. Клиент подтверждает заказ → `PENDING_PAYMENT`, страница заказа.
2. «Оплатить онлайн» → `POST /api/orders/:id/payment`: сервер создаёт PaymentIntent **на сумму
   сохранённого заказа**, `currency: eur`, `metadata.orderId`, с idempotency key; при повторе —
   тот же PaymentIntent. Отказ, если заказ уже оплачен/отменён или время самовывоза уже не успеть.
3. Браузер загружает Stripe.js с `js.stripe.com` (только в этот момент; CSP разрешает Stripe
   только при настроенных ключах) и показывает Payment Element. Данные карты уходят в Stripe и
   не попадают на наш сервер.
4. `confirmPayment` (3-D Secure и банковские редиректы возвращают на `/order/:id`).
5. `PAID` ставит **только сервер** и только если Stripe говорит `succeeded`, сумма получена ровно
   `order.total` в EUR и `metadata.orderId` совпадает:
   - вебхук `payment_intent.*` с проверенной подписью — сервер берёт **актуальное** состояние
     PaymentIntent у Stripe (события могут приходить с опозданием), каждое событие — один раз;
   - `payment/refresh` после оплаты — сервер сам спрашивает Stripe (не ждём вебхук).
6. При `PAID` увеличивается счётчик использования промокода. Платёж, пришедший после отмены
   заказа, заказ не «оживляет» (остаётся в `payments` со статусом `succeeded` — нужен возврат).

Настройка в Stripe: ключи API; вебхук на `https://<домен>/api/stripe/webhook` (события
`payment_intent.succeeded`, `.payment_failed`, `.processing`, `.canceled`); для Apple Pay —
подтверждение домена в Dashboard. Локально вебхуки: `stripe listen --forward-to localhost:8787/api/stripe/webhook`.

Тесты: `server/payments.test.ts` — настоящий код шлюза и настоящая проверка подписи Stripe SDK,
вместо сети Stripe — память. `e2e-server/stripe.spec.ts` — настоящая оплата тестовой картой в
test mode; запускается только с test-ключами в окружении, иначе помечается как skipped.

## Админ-панель (`/admin`)

Отдельный layout и lazy-чанки (клиенты их не загружают), `noindex`. Работает только с backend.

**Учётные записи** создаёт владелец через CLI — регистрации нет:

```bash
npm run server:cli -- staff:add --email anna@sushiriga.lv --name Anna --role admin   # пароль спросит без эха
npm run server:cli -- staff:list
npm run server:cli -- staff:password --email anna@sushiriga.lv   # и выход на всех устройствах
npm run server:cli -- staff:disable --email anna@sushiriga.lv     # staff:enable — вернуть
# Docker: docker exec -it <container> node dist-server/cli.js staff:add --email … --role admin
```

Пароль — минимум 12 символов, хранится как scrypt-хэш. Вход: HttpOnly-cookie `sr_staff`
(`SameSite=Strict`, `Secure` в production, `Path=/api/admin`, 12 часов), в базе — только SHA-256
токена. Изменяющие запросы требуют заголовок `X-SushiRiga-Admin: 1` (защита от CSRF; этот
заголовок не разрешён в CORS). Неверный e-mail и неверный пароль дают одинаковый ответ; вход —
не чаще 10 попыток в минуту с одного IP.

| Роль    | Может                                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `staff` | заказы: принять (время 10–80 мин, по умолчанию 30), статусы, задержка с причиной, смена времени, отмена; отметка «нет в наличии» |
| `admin` | всё то же + цены блюд, промокоды, модерация отзывов                                                                              |

Правила (сервер): `PAID` ставит только оплата; `ACCEPTED` — только через «Принять» с временем;
остальные переходы — по `ORDER_TRANSITIONS`. Отмена оплаченного заказа сначала делает полный
возврат через Stripe (idempotency key на заказ) и пишет номер возврата в историю; без Stripe
отмена оплаченного заказа отклоняется. Доска заказов обновляется каждые 15 секунд, сводка дня —
оплаченные заказы, выручка, чаевые.

| Метод и путь                                                                  | Роль                 |
| ----------------------------------------------------------------------------- | -------------------- |
| `POST /api/admin/login`, `/logout`, `GET /me`                                 | —                    |
| `GET /api/admin/orders?status=…`, `/orders/:id`, `/summary`                   | staff                |
| `POST /api/admin/orders/:id/accept` `{ preparationTime }`                     | staff                |
| `POST /api/admin/orders/:id/status` `{ status, note? }`                       | staff                |
| `POST /api/admin/orders/:id/preparation-time` `{ minutes }`                   | staff                |
| `GET /api/admin/menu`, `POST /api/admin/menu/:id` `{ available?, price? }`    | staff (цена — admin) |
| `GET/POST /api/admin/promo-codes`                                             | admin                |
| `GET /api/admin/reviews?status=…`, `POST /api/admin/reviews/:id` `{ status }` | admin                |

## Безопасность

- CSP `default-src 'self'` (без inline-скриптов; Stripe — только при настроенных ключах),
  `frame-ancestors 'none'`, `nosniff`,
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
- `server/admin.test.ts` — вход персонала, cookie, CSRF, истечение сессии, роли, доска заказов,
  возврат при отмене, меню, промокоды, модерация.
- `e2e-server/` (`npm run test:e2e:server`) — Playwright против production-сборки сервера с
  чистой SQLite: оформление, чтение заказа после перезагрузки, отказ без токена, 360 px; полный
  цикл «оплата → персонал принимает → готовится → готов → выдан → отзыв → публикация», возврат
  при отмене, промокод из админки в корзине, «нет в наличии». Без ключей Stripe вызовы Stripe API
  идут в локальную заглушку `e2e-server/fakeStripeApi.mjs` (только для тестов, `STRIPE_API_BASE`
  в production запрещён); с test-ключами — в настоящий Stripe.
