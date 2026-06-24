// Тесты сериализатора: значение-литерал ⇄ JSON, обратимость, тотальность.
// Значение (число/булево/строка/null/кортеж/отношение) ↔ JSON 1:1. Инвариант
// fromJson(toJson(x)) ≡ x — на узлах N.* и на разборе нотации (parseLiteral);
// fromJson тотальна — любой JSON → литерал, и toJson(fromJson(j)) ≡ j. Формы с
// типом (регэксп, селекторы) в JSON без тега не выразить → toJson кидает ошибку.

import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { nodes as N, parseLiteral } from "@essensio/engine";
import { toJson, fromJson, serialize, deserialize, SerializeError } from "../src/index";

function roundsTrip(lit: N.Expr): void {
  assert.deepStrictEqual(fromJson(toJson(lit)), lit);
  assert.deepStrictEqual(deserialize(serialize(lit)), lit);
}

function jsonRoundTrips(j: Parameters<typeof fromJson>[0]): void {
  assert.deepStrictEqual(toJson(fromJson(j)), j);
}

describe("значение → JSON", () => {
  test("скаляры и null", () => {
    assert.equal(toJson(N.Num("5")), 5);
    assert.equal(toJson(N.Num("-3.2")), -3.2);
    assert.equal(toJson(N.Bool(true)), true);
    assert.equal(toJson(N.Str("Пятёрочка")), "Пятёрочка");
    assert.equal(toJson(N.Null()), null);
  });
  test("число с экспонентой канонизируется по модели JSON", () => {
    assert.equal(toJson(N.Num("1e3")), 1000);
  });
  test("кортеж → объект (пустой → {}), отношение → массив (разнородное)", () => {
    assert.deepStrictEqual(toJson(N.TupleLit([["x", N.Num("3")], ["y", N.Num("5")]])), { x: 3, y: 5 });
    assert.deepStrictEqual(toJson(N.TupleLit([])), {});
    assert.deepStrictEqual(toJson(N.RelLit([N.Num("1"), N.Str("a"), N.Null()])), [1, "a", null]);
  });
});

describe("JSON → литерал", () => {
  test("примитивы и null", () => {
    assert.deepStrictEqual(fromJson(5), N.Num("5"));
    assert.deepStrictEqual(fromJson(true), N.Bool(true));
    assert.deepStrictEqual(fromJson("s"), N.Str("s"));
    assert.deepStrictEqual(fromJson(null), N.Null());
  });
  test("объект → кортеж (вкл. строковый ключ), {}; массив → отношение", () => {
    assert.deepStrictEqual(fromJson({ "order-id": 1 }), N.TupleLit([["order-id", N.Num("1")]]));
    assert.deepStrictEqual(fromJson({}), N.TupleLit([]));
    assert.deepStrictEqual(fromJson([{ a: 1 }]), N.RelLit([N.TupleLit([["a", N.Num("1")]])]));
  });
});

describe("обратимость на разборе нотации (значение-формы)", () => {
  for (const src of [
    "5", "-3.2", "true", "false", '"Пятёрочка"', "null", "{}",
    "{x: 3, y: 5}",
    '{объект: "Машиностроителей 15", "order-id": 2, тег: null}',
    "[{a: 1}, {a: 2}]",
    '[1, "a", null]',
  ]) {
    test(`fromJson(toJson(${src})) ≡ parseLiteral(${src})`, () => {
      roundsTrip(parseLiteral(src));
    });
  }
});

describe("тотальность: любой JSON → литерал, toJson(fromJson(j)) ≡ j", () => {
  for (const j of [
    null, 0, -3.2, true, false, "", "текст",
    [], {}, [1, "a", null, true],
    { a: 1, "ключ с пробелом": [null, { b: 2 }] },
  ] as Parameters<typeof fromJson>[0][]) {
    test(`${JSON.stringify(j)}`, () => {
      assert.doesNotThrow(() => fromJson(j));
      jsonRoundTrips(j);
    });
  }
});

describe("без тега не сериализуются (отложено)", () => {
  test("селекторы и регэксп → ошибка в toJson", () => {
    assert.throws(() => toJson(parseLiteral('Дата("2024-04-23")')), SerializeError);
    assert.throws(() => toJson(parseLiteral("Точка{x: 3, y: 5}")), SerializeError);
    assert.throws(() => toJson(parseLiteral('#Заказ("u-1")')), SerializeError);
    assert.throws(() => toJson(parseLiteral('r".+@.+"')), SerializeError);
  });
  test("выражение тоже не сериализуется", () => {
    assert.throws(() => toJson(N.BinOp("+", N.Num("1"), N.Num("2"))), SerializeError);
  });
});
