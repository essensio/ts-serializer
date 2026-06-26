// Сериализатор литералов нотации Essensio: значение-литерал ⇄ JSON.
//
// «Значение» (essensio/notation, «Нотация литералов») — надмножество JSON:
// число, булево, строка, null, кортеж (объект), отношение (массив). Отображается
// на JSON 1:1. AST этих узлов владеет движок @essensio/engine (`nodes`); здесь —
// только перенос значения в JSON и обратно, без разбора текста нотации.
//
// ОТОБРАЖЕНИЕ:
//   Num ↔ число · Bool ↔ булево · Str ↔ строка · Null ↔ null
//   TupleLit ↔ объект · RelLit ↔ массив
//
// fromJson ТОТАЛЬНА: любой JSON → литерал (объект → кортеж, массив → отношение).
// Единственная нормализация — числовая по модели JSON (5.0 → 5, 1e3 → 1000).
// Формы, несущие тип (регэксп, селекторы Дата("…")/#Заказ/Точка{…}/Заказ[…]) и
// вычисляемые выражения, в JSON без тега не выразить → SerializeError в toJson.

import { nodes as N } from "@essensio/engine";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export class SerializeError extends Error {}

// ───────────────────────────── литерал → JSON ─────────────────────────────

export function toJson(expr: N.Expr): Json {
  switch (expr.kind) {
    case "Num": {
      const n = Number(expr.text);
      if (!Number.isFinite(n)) throw new SerializeError(`число не представимо в JSON: ${expr.text}`);
      return n;
    }
    case "Bool": return expr.value;
    case "Str": return expr.value;
    case "Null": return null;
    case "TupleLit": {
      const obj: { [key: string]: Json } = {};
      for (const [name, value] of expr.fields) obj[name] = toJson(value);
      return obj;
    }
    case "RelLit": return expr.elems.map(toJson);
    default:
      throw new SerializeError(`нет JSON-представления (без тега): ${expr.kind}`);
  }
}

// ───────────────────────────── JSON → литерал ─────────────────────────────

export function fromJson(json: Json): N.Expr {
  if (json === null) return N.Null();
  if (typeof json === "number") {
    if (!Number.isFinite(json)) throw new SerializeError(`число не представимо: ${json}`);
    return N.Num(String(json));
  }
  if (typeof json === "boolean") return N.Bool(json);
  if (typeof json === "string") return N.Str(json);
  if (Array.isArray(json)) return N.RelLit(json.map(fromJson));
  return N.TupleLit(Object.entries(json).map(([name, value]) => [name, fromJson(value)]));
}

// ── строковые удобства (записать/разобрать в JSON-текст) ──

export function serialize(expr: N.Expr): string { return JSON.stringify(toJson(expr)); }
export function deserialize(text: string): N.Expr { return fromJson(JSON.parse(text) as Json); }

// ───────────────────────────── отложено (TODO) ─────────────────────────────
//
// TODO: union-типы. Отношение разнородно (`[1, "a", null]`), а кортеж может
//   нести поля разных форм — нужен вывод union'а (например `Число | Строка |
//   null`) для описания таких значений, а не только конкретных скаляров.
//
// TODO: сериализация в CSV — отношение однородных кортежей → таблица (ключи →
//   заголовок, кортежи → строки); определить поведение на разнородных/вложенных.
// TODO: сериализация в Excel (XLSX) — то же отношение → лист книги.
// TODO: сериализация в XML — кортеж → элемент с дочерними, отношение → список
//   повторяющихся элементов; выбрать схему для скаляров и null.
//
// TODO: сериализация в JSON Schema — вывести схему по значению/типу (включая
//   union выше), а не сами данные: кортеж → object+properties, отношение →
//   array+items, скаляры → соответствующие type/format.
