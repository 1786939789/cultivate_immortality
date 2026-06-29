import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { clearProgressHistory, compactStateForStorage, createDefaultState, ensureStateShape, getPublicState, settleIfNeeded } from "./gameLogic.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(rootDir, "data");
const dbPath = join(dataDir, "game.sqlite");
const wasmPath = join(rootDir, "node_modules", "sql.js", "dist", "sql-wasm.wasm");

mkdirSync(dataDir, { recursive: true });

let dbPromise;

async function openDb() {
  if (!dbPromise) {
    dbPromise = initSqlJs({ wasmBinary: readFileSync(wasmPath) }).then((SQL) => {
      const db = existsSync(dbPath)
        ? new SQL.Database(readFileSync(dbPath))
        : new SQL.Database();

      db.run(`
        CREATE TABLE IF NOT EXISTS saves (
          id TEXT PRIMARY KEY,
          state_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      persist(db);
      return db;
    });
  }
  return dbPromise;
}

function persist(db) {
  writeFileSync(dbPath, Buffer.from(db.export()));
}

export async function readState(id = "default") {
  const db = await openDb();
  const result = db.exec("SELECT state_json FROM saves WHERE id = $id", { $id: id });

  if (!result.length || !result[0].values.length) {
    const state = createDefaultState();
    await writeState(state, id);
    return state;
  }

  const state = JSON.parse(result[0].values[0][0]);
  const shapeChanged = ensureStateShape(state);
  const settled = settleIfNeeded(state);
  if (shapeChanged || settled) await writeState(state, id);
  return state;
}

export async function writeState(state, id = "default") {
  const db = await openDb();
  compactStateForStorage(state);
  const statement = db.prepare(`
    INSERT INTO saves (id, state_json, updated_at)
    VALUES ($id, $state, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      state_json = excluded.state_json,
      updated_at = excluded.updated_at
  `);
  statement.run({ $id: id, $state: JSON.stringify(state) });
  statement.free();
  persist(db);
}

export async function mutateState(mutator, id = "default", options = {}) {
  const state = await readState(id);
  const result = mutator(state);
  await writeState(state, id);
  const publicState = getPublicState(state, options.publicOptions);
  return result === undefined ? publicState : { state: publicState, result };
}

export async function resetState(id = "default") {
  const db = await openDb();
  const statement = db.prepare("DELETE FROM saves WHERE id = $id");
  statement.run({ $id: id });
  statement.free();
  persist(db);

  const state = clearProgressHistory(createDefaultState());
  await writeState(state, id);
  return getPublicState(state);
}

export async function publicState(id = "default", options = {}) {
  const state = await readState(id);
  return getPublicState(state, options);
}
