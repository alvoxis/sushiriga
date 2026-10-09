# SUSHIRIGA

Интерактивное цифровое **меню-книга** суши-ресторана в Риге + гостевой заказ на самовывоз +
кот-помощник, который в будущем станет AI-ассистентом.

> Этап 1 — фундамент: архитектура, дизайн-система, книга, каталог, корзина, guest checkout
> на mock-сервисах. Реальные оплата, AI, SMS, POS, Bolt Food и вторая точка **не подключены**.
> Все заказы и «оплаты» сейчас — **демо**: деньги не списываются, ресторан ничего не получает.

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

## Быстрый старт

Нужен Node.js ≥ 20.19 (рекомендуется 22, см. `.nvmrc`).

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
npm run test:e2e             # e2e: desktop + mobile Chromium
```

Production-сборка: `npm run build` → статические файлы в `dist/`, локальный просмотр — `npm run preview`.
Сайт — SPA: на хостинге все пути нужно отдавать через `index.html` (fallback-роутинг).

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
  services/       интерфейсы сервисов + createServices.ts (точка сборки) + notConnected.ts
    mock/         ТОЛЬКО демо: заказы, демо-оплата, промокоды DEMO*, отзывы, ассистент (изолировано ESLint)
  data/           меню (13 файлов категорий), аллергены, точки
  i18n/           translations/{lv,ru,en}.ts, провайдер, типизированные ключи
  types/ hooks/ utils/ styles/ test/
e2e/              Playwright
docs/             ARCHITECTURE.md, MENU_DATA.md
scripts/menu-import/  импорт меню с sushiriga.lv + source-snapshot.json (снимок для теста целостности)
```

## Маршруты

`/` · `/menu` · `/menu/:category` · `/product/:id` · `/cart` · `/checkout` · `/order/:id` ·
`/account` · `/account/orders` · `/account/reviews` · `/account/promocodes` · `/account/tips` ·
`/reviews` · `/pickup` · `/assistant`. Зарезервированы (не подключены): `/admin/*`.

## Что работает сейчас

- Книга-меню на главной и отдельная книга для каждой из 13 глав: объёмная обложка с корешком и
  тиснением (свой цвет и узор у каждой главы), 3D-перелистывание с тенью, кнопки «Назад/Вперёд»,
  «Открыть» на обложке, свайп, клавиатура, уголки страниц мышью; развороты от 768px, одна страница
  на телефоне; книга помещается на экран 320px вместе с кнопками.
- Полка-«библиотека» категорий, вид «книга / список», страница товара.
- Каталог из 99 позиций в 13 категориях (включая Poke) с sushiriga.lv на трёх языках — тексты
  дословно, исходные названия в `sourceName`, без выдуманных полей (аллергены/острота = unknown).
- Корзина: добавление, количество, удаление, очистка с подтверждением, сохранение в localStorage,
  цены всегда из каталога.
- Промокоды (mock: `DEMO10` −10 %, `DEMO5` −5 € от 30 €, `DEMOEXPIRED`) — только демо.
- Guest checkout: точка, «как можно скорее» / слот по часам работы, контакты, чаевые, демо-оплата.
  Цены и скидку считает «сервер» (mock) по `productId`/количеству — браузерным суммам не доверяем.
- Страница заказа: статус и таймлайн, отзыв после `PICKED_UP`. Время приготовления выбирает
  сотрудник при принятии заказа (10–80 мин); до этого клиент видит стандарт 30 мин. В демо-режиме
  роль сотрудника играет кнопка «следующий статус».
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

См. `docs/MENU_DATA.md`: вычитка сомнительных текстов меню (раздел 3), аллергены и отметки
«острое/вегетарианское» по блюдам, телефон и e-mail точки, «Azoshi Set 64G», максимальная сумма
чаевых, предзаказ на следующий день (сейчас слоты только на сегодня).

Архитектура подробно — `docs/ARCHITECTURE.md`.
