# SUSHIRIGA

Интерактивное цифровое **меню-книга** суши-ресторана в Риге + гостевой заказ на самовывоз +
кот-помощник, который в будущем станет AI-ассистентом.

> Этап 1 — фундамент: архитектура, дизайн-система, книга, каталог, корзина, guest checkout
> на mock-сервисах. Реальные оплата, AI, SMS, POS и вторая точка **не подключены**.

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

Runtime-зависимостей всего три: `react`, `react-dom`, `react-router`. Шрифты — системные (0 загрузок).

## Установка и запуск

Нужен Node.js ≥ 20.19 (см. `.nvmrc`).

```bash
npm install
npm run dev          # http://localhost:5173 (доступно и с телефона в той же сети)
```

## Команды

| Команда             | Что делает                                                               |
| ------------------- | ------------------------------------------------------------------------ |
| `npm run dev`       | dev-сервер                                                               |
| `npm run build`     | typecheck + production-сборка в `dist/`                                  |
| `npm run preview`   | раздать собранный `dist/`                                                |
| `npm run lint`      | ESLint                                                                   |
| `npm run format`    | Prettier (запись), `format:check` — проверка                             |
| `npm run typecheck` | `tsc -b`                                                                 |
| `npm test`          | unit + интеграционные тесты (Vitest)                                     |
| `npm run test:e2e`  | Playwright: desktop + mobile Chromium (сам собирает и поднимает preview) |
| `npm run check`     | lint + format + typecheck + tests + build                                |

Playwright: браузеры ставятся один раз `npx playwright install chromium`. Если Chromium уже есть
в системе — `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chrome npm run test:e2e`.
iPhone/WebKit-проект включается `PW_WEBKIT=1` (после `npx playwright install webkit`).

## Переменные окружения

Скопируйте `.env.example` → `.env.local`. Всё с префиксом `VITE_` попадает в **публичный** бандл —
секретов там быть не должно.

| Переменная               | Назначение                                                       |
| ------------------------ | ---------------------------------------------------------------- |
| `VITE_API_URL`           | URL будущего backend. Пусто → демо-режим на mock-сервисах        |
| `VITE_STRIPE_PUBLIC_KEY` | только publishable `pk_…`; `sk_…` живёт исключительно на сервере |
| `VITE_AUTH_PROVIDER`     | будущий провайдер аутентификации (пусто = только гость)          |
| `VITE_AI_PROVIDER`       | `mock` сейчас; реальный AI вызывается только с backend           |

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
  services/       интерфейсы + mock-реализации (catalog, orders, promo, payments, auth, assistant, reviews, locations)
  data/           меню (13 файлов категорий), аллергены, точки
  i18n/           translations/{lv,ru,en}.ts, провайдер, типизированные ключи
  types/ hooks/ utils/ styles/ test/
e2e/              Playwright
docs/             ARCHITECTURE.md, MENU_DATA.md
scripts/menu-import/  как меню перенесено с sushiriga.lv
```

## Маршруты

`/` · `/menu` · `/menu/:category` · `/product/:id` · `/cart` · `/checkout` · `/order/:id` ·
`/account` · `/account/orders` · `/account/reviews` · `/account/promocodes` · `/account/tips` ·
`/reviews` · `/pickup` · `/assistant`. Зарезервированы (не подключены): `/admin/*`.

## Что работает сейчас

- Книга-меню на главной и отдельная книга для каждой категории: 3D-перелистывание, свайп,
  клавиатура, уголки страниц, развороты на планшете/десктопе, одна страница на телефоне.
- Полка-«библиотека» категорий, вид «книга / список», страница товара.
- Каталог из 99 позиций с sushiriga.lv на трёх языках (без выдуманных полей).
- Корзина: добавление, количество, удаление, очистка с подтверждением, сохранение в localStorage,
  цены всегда из каталога.
- Промокоды (mock: `DEMO10` −10 %, `DEMO5` −5 € от 30 €, `DEMOEXPIRED`) — только демо.
- Guest checkout: точка, «как можно скорее» / слот по часам работы, контакты, чаевые, демо-оплата.
- Страница заказа: статус и таймлайн, демо-кнопка смены статуса, отзыв после `PICKED_UP`.
- Кот-помощник: отвечает только реальными товарами каталога (lv/ru/en запросы).
- LV / RU / EN, выбор сохраняется; `<html lang>` обновляется.
- Mobile first: нижняя навигация, safe areas, bottom-sheet модалки, 16px-инпуты (без зума на iOS).
- Доступность: skip-link, focus-visible, aria-live, `inert`, reduced motion, семантика.

## Что является заглушкой

Оплата (demo), backend и база (localStorage), аккаунт и вход, публикация отзывов, админ-панель,
AI (rule-based mock), фото товаров (плейсхолдеры), популярность категорий (нет статистики),
логотип (временный wordmark).

## Roadmap

1. **Backend + БД**: каталог, точки, заказы, промокоды, отзывы, чаевые; серверный пересчёт сумм.
2. **Оплата**: Stripe PaymentIntent (сервер) + Payment Element; вебхук → статус `PAID`.
3. **Админ-панель** (`/admin`): приём заказа, время приготовления 10–80 мин, статусы, задержки,
   промокоды, меню, отзывы, чаевые, две точки.
4. **Уведомления**: e-mail / SMS / push о статусе заказа.
5. **Аккаунт** (необязательный): история, повтор заказа, отзывы, промокоды, чаевые, настройки.
6. **AI-кот**: LLM на сервере с каталогом как единственным источником; анимации персонажа по экрану.
7. **Фото товаров**, финальный логотип и фирменный шрифт.
8. **Вторая точка** (данные + `active: true`), POS/API-интеграции.
9. PWA / офлайн-кэш меню, аналитика.

## TODO (данные и решения владельца)

См. `docs/MENU_DATA.md`: Poke, вычитка текстов, аллергены по блюдам, часы работы (расходятся на
сайте), подтверждение адреса/телефона, правила «большого заказа», максимальная сумма чаевых,
предзаказ на следующий день (сейчас слоты только на сегодня).

Архитектура подробно — `docs/ARCHITECTURE.md`.
