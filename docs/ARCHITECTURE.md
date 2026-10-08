# Архитектура SUSHIRIGA

## Слои

```
pages/        маршруты: собирают экран из features + components (тонкие)
features/     доменные модули: логика (чистые функции) + свои компоненты
components/   переиспользуемый UI без знания домена: ui/, layout/, book/
services/     доступ к данным за интерфейсами (mock сейчас → HTTP позже)
data/         статичные данные (меню, точки) до появления backend
i18n/         переводы lv/ru/en, типизированные ключи
types/        доменные типы (Product, Cart, Order, PromoCode, Review, Tip, Location…)
hooks/ utils/ styles/
```

Правило зависимостей: `pages → features → components/services → types/utils`.
`components/` не импортирует `features/` (кроме layout, которому нужна корзина для бейджа).

## Сервисы и будущий backend

Все внешние операции идут через интерфейсы в `src/services/*`:

| Сервис            | Сейчас                         | Потом                                           |
| ----------------- | ------------------------------ | ----------------------------------------------- |
| CatalogService    | `src/data` в бандле            | `GET /catalog` (админка управляет меню)         |
| LocationService   | `src/data/locations.ts`        | API, несколько точек                            |
| OrderService      | localStorage (демо)            | API; сервер пересчитывает все суммы             |
| OrderAdminService | демо-кнопка «следующий статус» | админ-панель: статусы, время приготовления      |
| PromoService      | mock-коды `DEMO*`              | API; финальная скидка считается на сервере      |
| PaymentService    | demo (всегда успешно)          | Stripe: PaymentIntent на сервере, pk в браузере |
| AuthService       | только гость                   | любой провайдер, регистрация необязательна      |
| AssistantService  | rule-based по каталогу         | LLM на backend, ответ = id товаров каталога     |
| ReviewService     | localStorage, не публикуется   | API + модерация                                 |

Композиция — `services/createServices.ts`. Компоненты получают сервисы через `useServices()`,
поэтому замена реализации не трогает UI. В тестах сервисы можно подменить через `<AppProviders services={…}>`.

**Демо-режим** = `VITE_API_URL` пуст. На всех страницах виден баннер «Demo mode».

## Деньги

Только целые **центы** (`Cents = number`). Форматирование — `Intl.NumberFormat` в `formatPrice`.
Цены в корзине всегда берутся из каталога, из localStorage — только `productId` + количество.

## Книга (`components/book`)

- `bookModel.ts` — чистая геометрия: грани (face 0 = обложка), листы, развороты.
  Состояние — «якорная грань», поэтому при повороте телефона читатель остаётся на той же странице.
- `layout`: `single` (телефон) / `spread` (≥ 900px) / `auto`.
- 3D: `rotateY(-180deg)` вокруг корешка, `backface-visibility`, временный z-index для листающегося листа.
- Ввод: свайп (Pointer Events), уголки страниц мышью, клавиши ←/→/PageUp/PageDown/Home/End, кнопки.
- Доступность: невидимые страницы `inert`, номер страницы в `aria-live`, `aria-roledescription="book"`.
- `prefers-reduced-motion` → длительности 0, переключение мгновенное.
- Типографика страниц в `cqi` — масштабируется от размера страницы.
- У каждой категории своя книга (`CategoryBook`), на главной — книга всего меню (`MenuBook`).

## Заказ

Гостевой поток: Menu → Cart → Pickup → Contact → «Подарить улыбку» → Payment → Order.

- Время приготовления: минимум 30 мин (`MIN_PREPARATION_MINUTES`), правила для больших заказов —
  `PreparationPolicy.largeOrderRules` (пока пусто, ждёт решения ресторана).
- Сотрудник выбирает 10…80 мин (`PREPARATION_TIME_OPTIONS`) через `OrderAdminService.setPreparationTime`.
- Слоты самовывоза считаются по часам работы точки в её часовом поясе (`Europe/Riga`).
- Переходы статусов — таблица `ORDER_TRANSITIONS`; та же таблица должна жить на сервере.
- Отзыв — только для `PICKED_UP`; рейтинг никогда не выбран по умолчанию.

## Админка (будущее)

Маршруты зарезервированы в `ADMIN_ROUTES`, не зарегистрированы. План: отдельный lazy-чанк,
доступ только для персонала, работа через `OrderAdminService` и будущие CRUD-сервисы меню/промокодов.

## Бонусы

Бонусной системы в проекте **нет** и не планируется.
