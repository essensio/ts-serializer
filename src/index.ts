// Публичный API: сериализация литералов нотации (essensio/notation) в JSON и обратно.
// AST-узлы — из @essensio/engine (`nodes`); парсинг текста нотации — там же
// (`parseLiteral`), отдельно от этого слоя.

export { toJson, fromJson, serialize, deserialize, SerializeError } from "./json";
export type { Json } from "./json";
