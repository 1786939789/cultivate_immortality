import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { clearProgressHistory, compactStateForStorage, createDefaultState, ensureStateShape, getPublicState, preserveProfilesForReset, settleIfNeeded } from "./gameLogic.mjs";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = join(rootDir, "data");
const dbPath = join(dataDir, "game.sqlite");
const wasmPath = join(rootDir, "node_modules", "sql.js", "dist", "sql-wasm.wasm");

mkdirSync(dataDir, { recursive: true });

let dbPromise;
const stateCache = new Map();

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
      db.run(`
        CREATE TABLE IF NOT EXISTS battle_replays (
          id TEXT PRIMARY KEY,
          save_id TEXT NOT NULL,
          kind TEXT NOT NULL,
          day INTEGER,
          match_id TEXT,
          replay_json TEXT NOT NULL,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);
      db.run("CREATE INDEX IF NOT EXISTS idx_battle_replays_save ON battle_replays (save_id);");
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
  const cached = stateCache.get(id);
  if (cached) {
    const shapeChanged = ensureStateShape(cached);
    const settled = settleIfNeeded(cached);
    if (shapeChanged || settled) await writeState(cached, id);
    return cached;
  }

  const db = await openDb();
  const result = db.exec("SELECT state_json FROM saves WHERE id = $id", { $id: id });

  if (!result.length || !result[0].values.length) {
    const state = createDefaultState();
    await writeState(state, id);
    return state;
  }

  const state = JSON.parse(result[0].values[0][0]);
  stateCache.set(id, state);
  const shapeChanged = ensureStateShape(state);
  const settled = settleIfNeeded(state);
  const replaysMigrated = extractBattleReplays(db, state, id);
  if (shapeChanged || settled || replaysMigrated) await writeState(state, id);
  return state;
}

export async function writeState(state, id = "default") {
  const db = await openDb();
  extractBattleReplays(db, state, id);
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
  stateCache.set(id, state);
  persist(db);
}

function extractBattleReplays(db, state, saveId) {
  let changed = false;
  const statement = db.prepare(`
    INSERT INTO battle_replays (id, save_id, kind, day, match_id, replay_json, updated_at)
    VALUES ($id, $saveId, $kind, $day, $matchId, $replay, datetime('now'))
    ON CONFLICT(id) DO UPDATE SET
      replay_json = excluded.replay_json,
      updated_at = excluded.updated_at
  `);
  try {
    const visit = (value, context = {}) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, { ...context, path: `${context.path || ""}[${index}]` }));
        return;
      }

      const replay = value.replay;
      if (replay && typeof replay === "object") {
        const replayId = value.replayId || replay.replayId || randomUUID();
        preserveReplaySummary(value, replay);
        statement.run({
          $id: replayId,
          $saveId: saveId,
          $kind: replay.kind || context.kind || "battle",
          $day: Number(context.day || value.day || 0) || null,
          $matchId: context.matchId || value.id || "",
          $replay: JSON.stringify(replay)
        });
        value.replayId = replayId;
        value.replay = null;
        changed = true;
      }

      const nextContext = {
        ...context,
        day: value.day ?? context.day,
        matchId: value.matchId || value.id || context.matchId,
        kind: value.type || value.kind || context.kind
      };
      for (const [key, child] of Object.entries(value)) {
        if (key === "replay") continue;
        visit(child, { ...nextContext, path: context.path ? `${context.path}.${key}` : key });
      }
    };

    visit(state);
  } finally {
    statement.free();
  }
  return changed;
}

function preserveReplaySummary(record, replay) {
  if (!record || !replay || typeof record !== "object") return;
  if (!record.winner && replay.winner) {
    record.winner = replay.winner === "left" ? replay.left : replay.right;
  }
  if (!record.loser && replay.winner) {
    record.loser = replay.winner === "left" ? replay.right : replay.left;
  }
  if (!record.foughtAt && replay.foughtAt) record.foughtAt = replay.foughtAt;
  if (!record.result && replay.result) record.result = replay.result;
}

export async function readBattleReplay(replayId, id = "default") {
  const db = await openDb();
  const result = db.exec(
    "SELECT replay_json FROM battle_replays WHERE id = $id AND save_id = $saveId LIMIT 1",
    { $id: replayId, $saveId: id }
  );
  if (!result.length || !result[0].values.length) throw new Error("未找到该场切磋回放");
  const replay = JSON.parse(result[0].values[0][0]);
  replay.replayId = replayId;
  return replay;
}

export async function mutateState(mutator, id = "default", options = {}) {
  const state = await readState(id);
  const result = mutator(state);
  await writeState(state, id);
  const publicState = getPublicState(state, options.publicOptions);
  return result === undefined ? publicState : { state: publicState, result };
}

export async function resetState(id = "default") {
  let previousState = null;
  try {
    previousState = await readState(id);
  } catch {
    previousState = null;
  }

  const db = await openDb();
  const statement = db.prepare("DELETE FROM saves WHERE id = $id");
  statement.run({ $id: id });
  statement.free();
  const replayStatement = db.prepare("DELETE FROM battle_replays WHERE save_id = $id");
  replayStatement.run({ $id: id });
  replayStatement.free();
  stateCache.delete(id);
  persist(db);

  const state = preserveProfilesForReset(clearProgressHistory(createDefaultState()), previousState);
  await writeState(state, id);
  return getPublicState(state);
}

export async function publicState(id = "default", options = {}) {
  const state = await readState(id);
  return getPublicState(state, options);
}
