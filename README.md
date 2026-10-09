# SUSHIRIGA

Интерактивное цифровое **меню-книга** суши-ресторана в Риге + гостевой заказ на самовывоз +
кот-помощник, который в будущем станет AI-ассистентом.

> Два режима:
>
> - **демо** (`VITE_API_URL` пуст) — всё в браузере на mock-сервисах, ничего никуда не уходит;
> - **с backend** (`server/`, SQLite) — меню, цены, заказы, промокоды и отзывы на сервере.
>
> Реальные AI, SMS, POS, Bolt Food и вторая точка **не подключены**. Подробности по этапам —
> раздел «Roadmap».

## Стек

| Что       | Чем                                                           |
| --------- | ------------------------------------------------------------- |
| Язык / UI | TypeScript 6, React 19                                        |
| Сборка    | Vite 8                                                        |
| Роутинг   | React Router 7 (data router, lazy-страницы)                   |
| Стили     | CSS Modules + дизайн-токены (CSS custom properties)           |
| Анимации  | чистый CSS (3D-перелистывание без библиотек)                  |
| Качество  | ESLint 9 (typescript-eslint, react-hooks, jsx-a11y), Prettier |
| Тесты     | Vitest + Testing Library (jsdom), Playwright                  |
| Backend   | Node 22, Hono, `node:sqlite`, zod — см. `docs/BACKEND.md`     |

Во фронтенд-бандл попадают только `react`, `react-dom`, `react-router`. Шрифты — системные (0 загрузок).

## Быстрый старт

Нужен Node.js ≥ 22.13 (см. `.nvmrc`; backend использует встроенный `node:sqlite`).

```bash
git clone https://github.com/alvoxis/sushiriga.git
cd sushiriga
npm ci                       # установка зависимостей по lock-файлу
npm run dev                  # http://localhost:5173 (доступно и с телефона в той же сети)
```

Проверка перед коммитом / как в CI:

```bash
npm run check                # lint + format + typecheck + unit/integration tests + build
npx playwright install chromium   # один раз
npm run test:e2e             # e2e: desktop + mobile Chromium (демо-режим)
npm run test:e2e:server      # e2e против настоящего backend (production-сборка + SQLite)
```

Production: backend раздаёт и API, и сайт с одного адреса —

```bash
VITE_API_URL=/ npx vite build && npm run server:build
NODE_ENV=production ORDER_TOKEN_SECRET="$(openssl rand -base64 48)" npm run server:start
```

или `docker build -t sushiriga .` (см. `Dockerfile`, `docs/BACKEND.md`). Демо-версию без backend
можно выложить как статику: `npm run build` → `dist/` (все пути — через `index.html`).

## Команды

| Команда                   | Что делает                                                               |
| ------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`             | dev-сервер                                                               |
| `npm run build`           | typecheck + production-сборка в `dist/`                                  |
| `npm run preview`         | раздать собранный `dist/`                                                |
| `npm run lint`            | ESLint                                                                   |
| `npm run format`          | Prettier (запись), `format:check` — проверка                             |
| `npm run typecheck`       | `tsc -b`                                                                 |
| `npm test`                | unit + интеграционные тесты (Vitest)                                     |
| `npm run test:e2e`        | Playwright: desktop + mobile Chromium (сам собирает и поднимает preview) |
| `npm run test:e2e:server` | Playwright против production-сборки backend с чистой SQLite              |
| `npm run server:dev`      | backend в режиме разработки (:8787)                                      |
| `npm run server:build`    | сборка backend в `dist-server/`                                          |
| `npm run server:start`    | запуск собранного backend                                                |
| `npm run check`           | lint + format + typecheck + tests + build (фронтенд и backend)           |

Playwright: браузеры ставятся один раз `npx playwright install chromium`. Если Chromium уже есть
в системе — `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e`.
iPhone/WebKit-проект включается `PW_WEBKIT=1` (после `npx playwright install webkit`).

## Переменные окружения

Скопируйте `.env.example` → `.env.local`. Всё с префиксом `VITE_` попадает в **публичный** бандл —
секретов там быть не должно.

| Переменная           | Назначение                                                      |
| -------------------- | --------------------------------------------------------------- |
| `VITE_API_URL`       | адрес backend: `/` (тот же сайт) или origin. Пусто → демо-режим |
| `VITE_AUTH_PROVIDER` | будущий провайдер аутентификации (пусто = только гость)         |
| `VITE_AI_PROVIDER`   | `mock` сейчас; реальный AI вызывается только с backend          |

Переменные backend (только на сервере, без `VITE_`): `server/.env.example` — `ORDER_TOKEN_SECRET`
(обязателен в production), `DATABASE_PATH`, `PORT`, `PUBLIC_DIR`, `CORS_ORIGINS`, `TRUST_PROXY`,
`STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` / `STRIPE_WEBHOOK_SECRET` (оплата).

## Структура

```
src/
  app/            App, роутер (routes.ts, routeObjects.tsx), провайдеры, layout
  pages/          страницы маршрутов (каждая — отдельный чанк)
  features/
    menu/         каталог, поиск, CategoryBook, MenuBook, карточки товара
    cart/         редьюсер и расчёт корзины, провайдер, степпер, промокод
    checkout/     guest checkout, валидация контактов
    orders/       статусы и переходы, таймлайн
    pickup/       время приготовления, слоты самовывоза, карточка точки
    promo/        правила промокодов (зеркало будущей серверной логики)
    tips/         «Подарить улыбку»
    reviews/      рейтинг 1–5, форма отзыва
    assistant/    кот: персонаж, чат, рекомендации, mock-движок
    account/      (зарезервировано под личный кабинет)
  components/
    book/         Book, BookCover, BookSpine, BookPages, BookPage, BookNavigation
    ui/           Button, Card, Badge, Modal, Toast, TextField, ChoiceGroup, ImagePlaceholder…
    layout/       Header, BottomNav, Footer, LanguageSwitcher, Logo, SkipLink, DemoBanner
  services/       интерфейсы сервисов + createServices.ts (точка сборки) + notConnected.ts
    mock/         ТОЛЬКО демо: заказы, демо-оплата, промокоды DEMO*, отзывы, ассистент (изолировано ESLint)
  data/           меню (13 файлов категорий), аллергены, точки
  i18n/           translations/{lv,ru,en}.ts, провайдер, типизированные ключи
  types/ hooks/ utils/ styles/ test/
server/           backend: app.ts (API), services/, db/ (SQLite, миграции), security/
e2e/              Playwright (демо-режим)
e2e-server/       Playwright против настоящего backend
docs/             ARCHITECTURE.md, BACKEND.md, MENU_DATA.md
scripts/menu-import/  импорт меню с sushiriga.lv + source-snapshot.json (снимок для теста целостности)
```

## Маршруты

`/` · `/menu` · `/menu/:category` · `/product/:id` · `/cart` · `/checkout` · `/order/:id` ·
`/account` · `/account/orders` · `/account/reviews` · `/account/promocodes` · `/account/tips` ·
`/reviews` · `/pickup` · `/assistant`. Админ-панель: `/admin` (заказы), `/admin/menu`,
`/admin/promocodes`, `/admin/reviews`.

## Что работает сейчас

- Книга-меню на главной и отдельная книга для каждой из 13 глав: объёмная обложка с корешком и
  тиснением (свой цвет и узор у каждой главы), 3D-перелистывание с тенью, кнопки «Назад/Вперёд»,
  «Открыть» на обложке, свайп, клавиатура, уголки страниц мышью; развороты от 768px, одна страница
  на телефоне; книга помещается на экран 320px вместе с кнопками.
- Полка-«библиотека» из 13 глав, вид «книга / список», страница товара (только реальные данные).
- Поиск по меню (`/menu?q=…`): названия блюд (в т.ч. исходные), номера меню, названия глав на
  LV/RU/EN, без учёта регистра и диакритики. Кнопка «В книге» открывает книгу главы сразу на
  странице с блюдом (`/menu/:глава?dish=:id`) и подсвечивает его; то же со страницы товара.
- Каталог из 99 позиций в 13 категориях (включая Poke) с sushiriga.lv на трёх языках — тексты
  дословно, исходные названия в `sourceName`, без выдуманных полей (аллергены/острота = unknown).
- Корзина: добавление, количество, удаление, очистка с подтверждением, сохранение в localStorage,
  цены всегда из каталога.
- Промокоды: с backend — коды из базы, проверка на сервере (и повторно при расчёте заказа).
  В демо-режиме — **только тестовые коды** (`DEMO10` −10%, `DEMO5` −€5 от €30, `DEMOEXPIRED`)
  с явной пометкой «скидка (тест), не проверено сервером».
- Админ-панель `/admin` (только с backend): доска заказов с автообновлением, приём со временем
  10–80 мин, статусы, задержка, отмена с полным возвратом через Stripe, «нет в наличии», цены,
  промокоды, модерация отзывов, сводка дня (заказы, выручка, чаевые).
- Backend (`server/`): меню + изменения персонала, точки, расчёт заказа, заказы в SQLite,
  доступ к гостевому заказу по токену, отзывы с модерацией, лимиты запросов, CSP — `docs/BACKEND.md`.
- Guest checkout в два шага, без регистрации:
  1. **Данные**: точка (из конфигурации), «как можно скорее» или слот на сегодня (шаг 15 мин,
     часы работы, минимум 30 мин, не позже закрытия, без прошедших времён; время помечено
     «Предварительно»), имя / телефон / e-mail (необязателен) с понятными ошибками, чаевые.
  2. **Проверка**: блюда, количество, цены, скидка с кодом, итог, точка, время, контакты →
     «Подтвердить заказ». Время перепроверяется в момент подтверждения (и сервером).
     Цены и скидку считает сервер по `productId`/количеству — браузерным суммам не доверяем.
- Онлайн-оплата (с backend и ключами Stripe): на странице заказа «Оплатить онлайн» → Stripe
  Payment Element (карта, Apple Pay / Google Pay — что включено в Stripe), 3-D Secure; заказ
  становится «Оплачен» только после подтверждения Stripe на сервере.
- Заказ создаётся как `PENDING_PAYMENT`: «Оплачен» в таймлайне — только будущий шаг; в демо-режиме
  страница пишет «Демо-заказ создан — не оплачен». С backend страница заказа обновляет статус
  каждые 20 с и открывается только в браузере, где заказ оформлен (токен доступа).
- Страница заказа: статус и таймлайн, отзыв после `PICKED_UP`. Время приготовления выбирает
  сотрудник при принятии заказа (10–80 мин); до этого клиент видит стандарт 30 мин. Демо-кнопка
  «следующий статус» (роль сотрудника) для неоплаченного заказа не показывается.
- Предзаказ на следующие дни есть в архитектуре (`pickupDays`, `PREORDER_DAYS_AHEAD = 0`), в UI выключен.
- Кот-помощник: отвечает только реальными товарами каталога (lv/ru/en запросы).
- LV / RU / EN, выбор сохраняется; `<html lang>` обновляется.
- Mobile first: нижняя навигация, safe areas, bottom-sheet модалки, 16px-инпуты (без зума на iOS).
- Доступность: skip-link, focus-visible, aria-live, `inert`, reduced motion, семантика.

## Что является заглушкой

Оплата — подключается ключами Stripe на сервере (без них заказы остаются `PENDING_PAYMENT`;
в демо-режиме оплаты нет вовсе), аккаунт клиента и вход, AI (rule-based mock), фото товаров (плейсхолдеры), популярность категорий
(нет статистики), логотип (временный wordmark). В демо-режиме заказы и отзывы живут в localStorage.

## Roadmap

1. ✅ **Backend + БД**: каталог, точки, заказы, промокоды, отзывы, чаевые; серверный пересчёт сумм.
2. ✅ **Оплата**: Stripe PaymentIntent (сервер) + Payment Element; вебхук → статус `PAID`.
   Код готов и протестирован без сети Stripe; для реальных платежей нужны ключи Stripe
   (сначала test mode) — см. `docs/BACKEND.md`.
3. ✅ **Админ-панель** (`/admin`): вход персонала (роли staff/admin), приём заказа со временем
   10–80 мин, статусы, задержки, отмена с возвратом, «нет в наличии» и цены, промокоды, модерация
   отзывов, сводка дня с чаевыми. Учётные записи — через CLI (`docs/BACKEND.md`).
4. **Уведомления**: e-mail / SMS / push о статусе заказа.
5. **Аккаунт** (необязательный): история, повтор заказа, отзывы, промокоды, чаевые, настройки.
6. **AI-кот**: LLM на сервере с каталогом как единственным источником; анимации персонажа по экрану.
7. **Фото товаров**, финальный логотип и фирменный шрифт.
8. **Вторая точка** (данные + `active: true`), POS/API-интеграции.
9. PWA / офлайн-кэш меню, аналитика.

## TODO (данные и решения владельца)

См. `docs/MENU_DATA.md`: вычитка сомнительных текстов меню (раздел 3), аллергены и отметки
«острое/вегетарианское» по блюдам, телефон и e-mail точки, «Azoshi Set 64G», максимальная сумма
чаевых, предзаказ на следующий день (сейчас слоты только на сегодня).

Архитектура подробно — `docs/ARCHITECTURE.md`, backend — `docs/BACKEND.md`.
