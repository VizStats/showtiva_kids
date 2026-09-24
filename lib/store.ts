// Reads a JSON store from data/, validated, fresh on every request.
//
// Same conventions as the main ShowTiva app's json-store: read with fs at
// request time and never imported as a module (a static import would be
// inlined at build time and freeze the data), and `server-only` so an
// accidental client import fails loudly.
import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export class StoreError extends Error {
  constructor(
    readonly file: string,
    readonly detail: string,
  ) {
    super(`${file}: ${detail}`);
    this.name = "StoreError";
  }
}

export async function readJson<T>(file: string, validate: (value: unknown) => T): Promise<T> {
  // The "data" literal stays inside the readFile call: Next's file tracing
  // only scopes a dynamic read to that folder when it can see the literal.
  let raw: string;
  try {
    raw = await readFile(path.join(process.cwd(), "data", file), "utf8");
  } catch (cause) {
    throw new StoreError(file, `could not read data/${file}. ${(cause as Error).message}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new StoreError(file, `is not valid JSON. ${(cause as Error).message}`);
  }

  return validate(parsed);
}
