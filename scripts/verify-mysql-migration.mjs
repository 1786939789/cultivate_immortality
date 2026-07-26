import { createHash } from "node:crypto";
import path from "node:path";
import { ensureMysqlSchema, mysqlPool, parseMysqlJson } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { openSqliteFile, projectRoot, sqliteRows } from "./sqlite-data.mjs";

const rootDir = projectRoot();
const gamePath = process.env.GAME_DB_PATH || path.join(rootDir, "data", "game.sqlite");
const battlePath = process.env.BATTLE_DB_PATH || path.join(rootDir, "data", "battle.sqlite");

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value)
    .filter((key) => key !== "__stateRevision")
    .sort()
    .map((key) => [key, canonical(value[key])]));
}

function stateHash(value) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
  console.log(`[verify] ${label}: ${actual}`);
}

await ensureMysqlSchema();
const gameDb = await openSqliteFile(gamePath);
const battleDb = await openSqliteFile(battlePath);
try {
  const sqliteSaves = sqliteRows(gameDb, "SELECT id, state_json FROM saves ORDER BY id");
  const [mysqlSaves] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id");
  assertEqual(mysqlSaves.length, sqliteSaves.length, "save count");
  for (const row of sqliteSaves) {
    const source = JSON.parse(row.state_json);
    const target = await loadStateFromMysql(row.id);
    assertEqual(target.npcs.length, source.npcs.length, `${row.id} NPC count`);
    assertEqual(target.duelDays.reduce((sum, day) => sum + (day.matches || []).length, 0), source.duelDays.reduce((sum, day) => sum + (day.matches || []).length, 0), `${row.id} duel match count`);
    assertEqual(target.dungeonDays.length, source.dungeonDays.length, `${row.id} dungeon day count`);
    assertEqual(target.provinceWars.length, source.provinceWars.length, `${row.id} province war count`);
    assertEqual(stateHash(target), stateHash(source), `${row.id} canonical state hash`);
  }

  const sqliteReplays = sqliteRows(battleDb, "SELECT save_id, id, replay_json FROM battle_replays ORDER BY save_id, id");
  const [mysqlReplays] = await mysqlPool.query("SELECT save_id, replay_id, replay_json FROM battle_replays ORDER BY save_id, replay_id");
  assertEqual(mysqlReplays.length, sqliteReplays.length, "battle replay count");
  for (let index = 0; index < sqliteReplays.length; index += 1) {
    const source = sqliteReplays[index];
    const target = mysqlReplays[index];
    if (`${target.save_id}|${target.replay_id}` !== `${source.save_id}|${source.id}`) {
      throw new Error(`replay key mismatch at row ${index + 1}`);
    }
    if (stateHash(parseMysqlJson(target.replay_json, {})) !== stateHash(JSON.parse(source.replay_json))) {
      throw new Error(`replay content mismatch: ${source.save_id}/${source.id}`);
    }
  }
  console.log(`[verify] replay keys and content: ${mysqlReplays.length}`);
  console.log("[verify] migration is consistent");
} finally {
  gameDb.close();
  battleDb.close();
  await mysqlPool.end();
}
