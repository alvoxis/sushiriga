# Данные меню SUSHIRIGA

**Источник:** публичное меню https://www.sushiriga.lv/menu (снято 2026-10-08).
Сайт — только источник данных: его HTML, CSS, дизайн и фотографии не копируются, в runtime он не
используется. Как выполнялся импорт — `scripts/menu-import/README.md`.

**Контроль целостности:** `scripts/menu-import/source-snapshot.json` — снимок извлечённых данных
сайта; тест `src/data/menu/sourceSnapshot.test.ts` проверяет, что каждая из 99 позиций есть в
каталоге с тем же названием (`sourceName`), категорией, ценой и текстами. Подтверждённые правки
текстов вносятся вместе с обновлением этого теста.

**Принцип:** содержимое меню **не исправляется молча**. Тексты хранятся дословно, а всё
сомнительное перечислено ниже и ждёт проверки владельцем. Исправления вносятся только после
подтверждения — отдельным коммитом.

---

## 1. Что перенесено

**99 позиций в 13 категориях** — 12 категорий проекта + **Poke** (подтверждено владельцем, показывается).

| Категория (lv)  | Файл                        | Позиций |
| --------------- | --------------------------- | ------: |
| Sushi Burger    | `products/sushi-burger.ts`  |       5 |
| Poke            | `products/poke.ts`          |       4 |
| Nigiri & Gunkan | `products/nigiri-gunkan.ts` |       4 |
| Hosomaki        | `products/hosomaki.ts`      |      10 |
| Rolli           | `products/rolli.ts`         |      13 |
| Cepti Rolli     | `products/cepti-rolli.ts`   |      10 |
| Tempura         | `products/tempura.ts`       |       5 |
| Double Mix 1+1  | `products/double-mix.ts`    |      17 |
| Special         | `products/special.ts`       |       1 |
| Sushi Seti      | `products/sushi-seti.ts`    |      12 |
| Dzērieni        | `products/dzerieni.ts`      |       6 |
| Snacks          | `products/snacks.ts`        |       6 |
| Souces          | `products/sauces.ts`        |       6 |

### Поля товара и откуда они взяты

| Поле                   | Источник / правило                                                 |
| ---------------------- | ------------------------------------------------------------------ |
| `sourceName`           | название **дословно**, как на сайте (`"31 PHILADELFIA ClASSIC"`)   |
| `name`                 | `sourceName` без номера, в Title Case; написание букв не меняется  |
| `number`               | номер из названия («31», «40»)                                     |
| `price`                | цена в центах (`€9.50 → 950`)                                      |
| `ingredients`          | состав lv / ru / en **дословно** (переносы строк склеены пробелом) |
| `description`          | описательные тексты (Snacks, «84. Philadelphia 1+1», «91. … 1+1»)  |
| `components`           | состав сетов и миксов — строки дословно                            |
| `pieces`               | только если указано явно: «32GAB», «56 gab», «6 gab», «16+16» → 32 |
| `weight`/`volume`      | только если указано явно: «180 g», «0.33l» → 330 мл                |
| `tags`                 | метки сайта: Hot, WARM, Featured; «+ souse» → `includes-sauce`     |
| `translations.lv.name` | латышские названия воды («Minerālūdens gāzēts / negāzēts»)         |

### Технические преобразования (смысл не меняется)

- Номер вынесен из названия в `number`; регистр названия → Title Case (`BBQ` оставлен заглавными).
- Приставка конструктора Wix «Copy of …» убрана из `name` (French Fries 230 g, Nuggets 9 gab);
  оригинал сохранён в `sourceName`.
- Количество/объём/вес вынесены из названия в поля (`"King prawns 6 gab +souse"` → `King Prawns`, `pieces: 6`).
- Лишние пробелы схлопнуты, перенесённые строки склеены.

### Общая информация (хранится отдельно от товаров)

- **Аллергены** — легенда A1–A14 дословно в `src/data/menu/allergens.ts`; общая фраза
  «Visi suši var saturēt / All sushi may contain A1;A2;A3;A4;A6;A7;A10;A11» — `SUSHI_MAY_CONTAIN`,
  показывается в категориях с суши.
- **Точка 1** — `src/data/locations.ts`: адрес Latgales iela 250A, Rīga, LV-1063 (подтверждён);
  часы работы пн–чт 11:00–22:00, пт–сб 11:00–23:30, вс 11:00–22:00 (подтверждены, с главной сайта).
- Фраза меню **«SERVED DAILY 12PM – 10PM»** — это информация меню/онлайн-заказа, **не** часы работы
  ресторана; в данных как часы работы не используется.
- На странице онлайн-заказа сайта указано «Pickup time: Up to 45 minutes» — в проекте не используется:
  время приготовления выбирает сотрудник (10–80 мин), стандарт — 30 мин.

---

## 2. Что сознательно оставлено пустым (unknown)

| Данные                              | Статус                                                                     |
| ----------------------------------- | -------------------------------------------------------------------------- |
| `allergens` по каждому блюду        | не опубликованы → `undefined` (= неизвестно). Из состава не выводятся.     |
| `spicy`                             | не отмечено в источнике → `undefined`                                      |
| `vegetarian`                        | не отмечено → `undefined` («Vega Burger» содержит крабовые палочки)        |
| `image`                             | фотографий нет → плейсхолдеры; stock/сгенерированные изображения запрещены |
| `pieces` у роллов, нигири, хосомаки | на сайте не указано                                                        |
| `pieces` у «Azoshi Set 64G»         | непонятно, что значит «64G» (8 роллов × 8 = 64?)                           |
| `weight` (кроме картофеля фри)      | не указан                                                                  |
| Телефон и e-mail точки              | не подтверждены → `phone`/`email` пустые, UI их скрывает (configurable)    |
| Названия категорий на ru/en         | переводы интерфейса, сделанные нами (на сайте только lv/en-заголовки)      |

---

## 3. Сомнительные / исправляемые тексты — на проверку

Колонка «Предложение» — только вариант для обсуждения; **в данных ничего не изменено**.

### 3.1 Названия товаров и категорий

| Товар (`id`)                                                    | Как в источнике                | Вопрос / предложение                                                        |
| --------------------------------------------------------------- | ------------------------------ | --------------------------------------------------------------------------- |
| `philadelfia-classic`, `philadelfia-gold`, `kunsei-philadelfia` | «PHILADELFIA»                  | рядом «PHILADELPHIA LUX/LIGHT» — привести к единому «Philadelphia»?         |
| `philadelfia-classic`                                           | «PHILADELFIA ClASSIC»          | «Cl» в середине слова — опечатка регистра                                   |
| `avakado-maki`, `avakado-maki-1-plus-1`                         | «AVAKADO MAKI»                 | «Avocado Maki»? (в Umai Set написано «Avocado Maki»)                        |
| `kapa-maki-1-plus-1`                                            | «KAPA MAKI 1+1»                | в Hosomaki — «KAPPA MAKI»                                                   |
| `gourmed-nigiri`                                                | «GOURMED NIGIRI»               | «Gourmet»?                                                                  |
| `salomon-burger`                                                | «SALOMON BURGER»               | «Salmon Burger»?                                                            |
| `terijaki-burger`                                               | «TERIJAKI BURGER»              | в составе «teryaki»; где-то «Teriyaki» — единое написание?                  |
| `salmon-tartar`                                                 | «SALMON TARTAR»                | в составе en «salmon tartare»; в Ocean Cream Duo «SALMON TARTARE»           |
| `sake-masako`                                                   | «SAKE MASAKO»                  | в Royal Fusion — «SAKE MASAGO»; масаго = икра                               |
| `cepts-crabis`                                                  | «CEPTS CRABIS»                 | lv «krabis» (в составе «krabis»)                                            |
| `lasis-nigiri`                                                  | «LASIS NIGIRI»                 | остальные нигири названы по-английски; в Philadelphia Set — «Salmon nigiri» |
| `azoshi-set-64g`                                                | «AZOSHI SET 64G»               | «64 gab»?                                                                   |
| `umai-set`                                                      | «UMAI SET 72GAB.»              | лишняя точка                                                                |
| `kogane-1-plus-1`                                               | «92. KOGANE 1+1.»              | лишняя точка                                                                |
| `oki-doki-16-plus-16`                                           | «OKI DOKI. 16+16»              | точка после названия                                                        |
| `crab`                                                          | «CRAB 32GAB»                   | у остальных сетов есть «SET» в названии — «Crab Set»?                       |
| `french-fries-230g`, `fried-crispy-chicken-nuggets-9`           | «Copy of …»                    | артефакт конструктора Wix (в `name` уже убран)                              |
| `king-prawns`, `spring-rolls`                                   | «+souse» / «+ souse»           | «+ sauce»                                                                   |
| `vega-burger`                                                   | «VEGA BURGER»                  | содержит крабовые палочки — не вегетарианский; переименовать или уточнить   |
| Категория `sauces`                                              | сайт: «SOUSES», бриф: «Souces» | lv «Mērces»? en «Sauces»                                                    |

### 3.2 Составы — английский (en)

| Товар                                      | Текст                                         | Предложение                        |
| ------------------------------------------ | --------------------------------------------- | ---------------------------------- |
| `lasis-nigiri`, `unagi-nigiri`, `maestro`  | «Rici»                                        | «Rice»                             |
| `vega-burger`                              | «unagi souce»                                 | «unagi sauce»                      |
| `spicy-ebi`, `spicy-ebi-1-plus-1`          | «salad shripm»                                | «salad shrimp»                     |
| `hot-tomago-maki`, `tomago-maki`           | «japanese omlette»                            | «Japanese omelette»                |
| `terijaki-burger`, `ebi-burger`            | «Tempra Mix», «panku», «teryaki», без запятых | «tempura mix», «panko», «teriyaki» |
| `hot-tomago-spicy-maki-1-plus-1`           | «Tomago Spice» (без риса/нори)                | состав неполный по сравнению с lv  |
| `sake-bonito`, `california`, `sake-masako` | «red massago»                                 | в других — «red masago»            |
| `oki-doki-16-plus-16`                      | «16 piece»                                    | «16 pieces»                        |
| `sake-fry`                                 | все слова с заглавной                         | регистр                            |
| `unagi-bonito` / `sake-bonito`             | «tuna flakes» / «tuna shavings»               | единый термин                      |
| `philadelphia-light`                       | «black white sesame»                          | «black and white sesame»           |

### 3.3 Составы — русский (ru)

| Товар                              | Текст                                                          | Предложение                              |
| ---------------------------------- | -------------------------------------------------------------- | ---------------------------------------- |
| `kunsei-maki`                      | «Рисб нориб копчуный лосось»                                   | «Рис, нори, копчёный лосось»             |
| `sake-maki`, `sake-maki-1-plus-1`  | «ласось»                                                       | «лосось»                                 |
| `philadelphia-light`, `…-1-plus-1` | «сливычный сыр», «чурный белый сезам»                          | «сливочный сыр», «чёрный и белый кунжут» |
| `spicy-ebi`, `spicy-ebi-1-plus-1`  | «слатный криветки, пикантный креветки»                         | «салатные креветки, пикантные креветки»  |
| многие роллы                       | «тигровый креветки»                                            | «тигровые креветки»                      |
| `philadelphia-fried`               | «жареный креветки»                                             | «жареные креветки»                       |
| `terijaki-burger`                  | «крем сливочный сыр салатный креветки … жаренны лосось теряки» | грамматика; «терияки»                    |
| `ebi-burger`, `terijaki-burger`    | «хрустящая панку»                                              | «хрустящая панировка панко»              |
| `oki-doki-16-plus-16`              | «сливичный сыр», «черным сезам»                                | «сливочный сыр», «чёрный кунжут»         |
| `philadelfia-gold`                 | «лемон»                                                        | «лимон»                                  |
| разные                             | «массаго» / «масаго», «Сезам» / «кунжут», «Спайс» / «спайс»    | единые термины и регистр                 |
| `canada-unagi`                     | нет «огурец» (в lv/en есть)                                    | расхождение составов                     |
| `hot-tomago-spicy-maki-1-plus-1`   | «Томаго с спайс соусом» (без риса/нори)                        | неполный состав; «со спайс-соусом»       |
| `kunsei-philadelfia`               | начинается со строчной «рис»                                   | регистр                                  |

### 3.4 Составы — латышский (lv)

| Товар                         | Текст                                                              | Предложение                                |
| ----------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| `hot-tomago-maki`             | «ar pikana mērcē»                                                  | «ar pikanto mērci»                         |
| `maestro`                     | «pikantā laša merse»                                               | «pikantais lasis» / «laša mērce»?          |
| `alaska`                      | «gurķis lidojošās zivs ikri» (нет запятой); «garneles sierā mērcē» | запятая; «siera mērcē»                     |
| `chicken-burger`              | «unagi mērci»                                                      | «unagi mērce» (как в других)               |
| `spicy-ebi`, `…-1-plus-1`     | «salātgarnelēs»                                                    | «salātu garneles»                          |
| `avakado-maki`, `…-1-plus-1`  | «avocado»                                                          | «avokado»                                  |
| `poke-salmon`                 | «Waccame»                                                          | «Vakame» (как в других poke)               |
| `poke-chicken`                | «Vistas»                                                           | «Vista»                                    |
| `terijaki-burger`             | «krēmsiera salāti … teryaki, Tempra Mix … panku»                   | грамматика, «terijaki», «tempura», «panko» |
| `phila-mix-2-1-plus-1`        | «krēamsiers»                                                       | «krēmsiers»                                |
| `sunrise-1-plus-1`            | «zutis tempra», «Sake Bovito»                                      | «tempura»? «Sake Bonito»                   |
| `kogane`, `kogane-1-plus-1`   | «pikānta mērce»                                                    | «pikantā mērce»                            |
| `spring-rolls`                | «… atrauties. .»                                                   | лишняя точка                               |
| `french-fries-180g`, `…-230g` | «… Tiek pasniegti» (обрыв)                                         | текст обрезан — чем подаётся?              |
| `oki-doki-16-plus-16`         | всё строчными, без запятых                                         | регистр/пунктуация                         |

### 3.5 Состав сетов (`components`)

| Сет                                              | Текст                                                                    | Вопрос                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `philadelphia-set`                               | «Kunsia Philadelphia», «Kunsia Nigiri»                                   | «Kunsei»?                                                           |
| `premium-set`                                    | «Mguro lasi», «Spicy avakado maki», «Tomago chees maki»                  | «Maguro»? «avocado», «cheese»                                       |
| `davana-set`                                     | «Spicy Ebi Syake masago», «Saki Maki», «Konago Maki»                     | это 4 или 5 роллов? «Sake»? «Tomago»?                               |
| `krasts-set`                                     | «Samurajs Kanagava Verona Ebimaki chees souse»                           | одна строка без разделителей; «Samurai», «Kanagawa», «cheese sauce» |
| `tori-sake-mix`                                  | «PHILADELPHIA LIGHT8 GAB»                                                | пробел                                                              |
| `azoshi-set-64g`                                 | «Kinoja», «Nirogo Ebi», «Surf Fish», «Mango Kiri», «Kanada Unagi»        | этих роллов нет в меню отдельно — составы?                          |
| `sake-setto`                                     | «Teriyaki Maki», «Sakura Smoke», «Tokyo Wave», «Shogun», «Umi no Hikari» | то же                                                               |
| `bonito-set`                                     | «Spring roll Bonito»                                                     | то же                                                               |
| `chicken-combo`, `crab`, `hotto-set`, `umai-set` | составы только на английском                                             | нужны lv/ru                                                         |
| `phila-mix-*`, `sunrise`, `bushido`              | составы только на латышском                                              | нужны ru/en                                                         |
| `philadelphia-1-plus-1`                          | описание «… avokado …» при названии «Philadelphia»                       | это Philadelphia Lux?                                               |

### 3.6 Аллергены (легенда, дословно в `allergens.ts`)

| Код             | Как в источнике                                                    | Предложение                                                              |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| A1              | ru «Хлопья», en «Flakes»                                           | ru «Злаки, содержащие глютен», en «Cereals containing gluten» (как в lv) |
| A3, A4, A6, A11 | en со строчной буквы («eggs…», «fish», «soybeans», «sesame seeds») | регистр                                                                  |
| A13             | en «Lupine»                                                        | в регламенте ЕС — «Lupin»                                                |

---

## 4. TODO для владельца

- [ ] Проверить таблицы раздела 3 и утвердить исправления (lv / ru / en).
- [ ] Аллергены по каждому блюду; отметки «острое» и «вегетарианское».
- [ ] Подтвердить телефон и e-mail точки.
- [ ] «Azoshi Set 64G» — количество штук; составы роллов из сетов, которых нет в меню отдельно.
- [ ] Финальное латышское название категории соусов.
- [ ] Фотографии товаров (позже, отдельным этапом).
