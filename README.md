# ts-serializer

Сериализатор **значений** нотации **Essensio**: AST-значение ⇄ JSON. Слой поверх
движка [`@essensio/engine`](https://github.com/essensio/ts-engine) — берёт его
AST-узлы (`nodes`) и отображает их в JSON-значение и обратно. Разбор текста
нотации (`parseLiteral`) остаётся в движке; здесь — только перенос значения в JSON.

«Значение» (см. `essensio/notation`, «Нотация литералов») — **надмножество JSON**:
число, булево, строка, null, кортеж (объект), отношение (массив). Отображается 1:1.

## Отображение

| Значение | JSON |
|---|---|
| `Число` `5`, `-3.2` | число `5`, `-3.2` |
| `Булево` `true` | булево `true` |
| `Строка` `"Пятёрочка"` | строка `"Пятёрочка"` |
| `null` | `null` |
| Кортеж `{x: 3, y: 5}` | объект `{"x":3,"y":5}` |
| Отношение `[{…}, {…}]` | массив `[{…},{…}]` |

**`fromJson` тотальна:** любой JSON-документ → литерал (объект → кортеж, массив →
отношение). **Инвариант:** `fromJson(toJson(x))` ≡ `x` для любого значения `x`, и
`toJson(fromJson(j))` ≡ `j` для любого JSON `j`; единственная нормализация —
числовая по модели JSON (`5.0` → `5`, `1e3` → `1000`).

Формы, несущие тип (регэксп, селекторы `Дата("…")` / `#Заказ` / `Точка{…}` /
`Заказ[…]`) и вычисляемые выражения, в JSON без тега не выразить — `toJson` на них
кидает `SerializeError` (тег-кодировка отложена).

## Публичный API

```ts
import { parseLiteral } from "@essensio/engine";
import { toJson, fromJson, serialize, deserialize } from "@essensio/serializer";

const lit = parseLiteral("{x: 3, y: 5}");
toJson(lit);            // { x: 3, y: 5 }
serialize(lit);         // '{"x":3,"y":5}'  (записать)
deserialize('{"x":3}'); // AST-кортеж {x: 3}  (разобрать)
fromJson({ x: 3 });     // то же из готового JSON-значения
```

- `toJson(expr) → Json` · `fromJson(json) → Expr` — узел ⇄ JSON-значение;
- `serialize(expr) → string` · `deserialize(text) → Expr` — узел ⇄ JSON-текст;
- `SerializeError` — узел без JSON-представления (выражение, селектор, регэксп);
- тип `Json`.

## Разработка

```bash
npm install        # @essensio/engine (github) + tsx + typescript (dev)
npm test           # node --import tsx --test tests/*.test.ts
npm run typecheck  # tsc (строгий режим)
```

## Статус

Покрыты **значения** (надмножество JSON). Формы с тегом-типом (селекторы, регэксп)
и выражения — отложены: их тег-кодировка в JSON пока не вводится.
