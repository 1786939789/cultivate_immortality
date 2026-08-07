import { mysqlPool } from "./mysqlDb.mjs";
import { readCultivatorDetailIncremental } from "./cultivatorIncrementalRepository.mjs";

export async function readLiveRankingIncremental(saveId, kind = "power", options = {}) {
  const limit = Math.min(200, Math.max(1, Number(options.limit || 50)));
  const offset = Math.max(0, Number(options.offset || 0));
  const order = kind === "combat" ? "current_combat_rating DESC, cultivator_id" : kind === "duel" ? "duel_score DESC, current_power DESC, cultivator_id" : "current_power DESC, cultivator_id";
  const [rows] = await mysqlPool.query(`SELECT c.cultivator_id,c.name,c.cultivator_kind,c.realm_no,c.xp,c.sect_name,m.current_power,m.current_combat_rating,m.combat_score,m.duel_score,m.duel_wins,m.duel_losses,m.power_rank,m.combat_rank
    FROM cultivators c JOIN cultivator_metrics_v2 m ON m.save_id=c.save_id AND m.cultivator_id=c.cultivator_id WHERE c.save_id=? ORDER BY ${order} LIMIT ? OFFSET ?`, [saveId, limit, offset]);
  return { kind, offset, limit, total: rows.length, live: true, entries: rows.map((row, index) => ({ id: row.cultivator_id, name: row.name, isPlayer: row.cultivator_kind === "player", realm: Number(row.realm_no), xp: Number(row.xp), sect: row.sect_name, power: Number(row.current_power), combatRating: Number(row.current_combat_rating), combatScore: Number(row.combat_score), duelScore: Number(row.duel_score), duelWins: Number(row.duel_wins), duelLosses: Number(row.duel_losses), rank: offset + index + 1 })) };
}

export async function readLiveCultivatorDetail(saveId, id) { return readCultivatorDetailIncremental(saveId, id, { historyLimit: 60 }); }
