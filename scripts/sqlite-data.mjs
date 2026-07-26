import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

export async function openSqliteFile(filePath) {
  const wasmBinary = fs.readFileSync(path.join(rootDir, "node_modules", "sql.js", "dist", "sql-wasm.wasm"));
  const SQL = await initSqlJs({ wasmBinary });
  return new SQL.Database(fs.readFileSync(filePath));
}

export function sqliteRows(db, sql) {
  const result = db.exec(sql);
  if (!result.length) return [];
  return result[0].values.map((values) => Object.fromEntries(result[0].columns.map((column, index) => [column, values[index]])));
}

export function projectRoot() {
  return rootDir;
}
