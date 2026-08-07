import { ensureMysqlSchema, mysqlPool, parseMysqlJson, withMysqlTransaction } from "../server/mysqlDb.mjs";
import { powerOf, buildCombatRatings } from "../server/gameLogic.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { syncCultivatorPearls, upsertCultivatorMetrics } from "../server/cultivatorIncrementalRepository.mjs";

await ensureMysqlSchema();
const [saves] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id");
let migrated = 0; let cultivators = 0; let pearlAssets = 0; let pearlHistory = 0;
try {
  for (const { save_id: saveId } of saves) {
    const state = await loadStateFromMysql(saveId);
    if (!state) continue;
    const ratings = buildCombatRatings(state);
    const ratingMap = new Map(ratings.entries.map((item) => [item.id, item]));
    const people = [state.player, ...(state.npcs || [])];
    const powerRank = [...people].sort((a, b) => powerOf(b, state) - powerOf(a, state) || a.id.localeCompare(b.id));
    await withMysqlTransaction(async (connection) => {
      for (const entity of people) {
        const rating = ratingMap.get(entity.id) || {};
        await upsertCultivatorMetrics(connection, { saveId, cultivatorId: entity.id, currentPower: powerOf(entity, state), currentCombatRating: rating.score || 500, combatScore: rating.score || 500, duelScore: Number(entity.duelSeason?.score || 0), duelWins: entity.duelWins, duelLosses: entity.duelLosses, dungeonClears: entity.dungeonClears, bestDungeonPower: entity.bestDungeonPower, powerRank: powerRank.findIndex((item) => item.id === entity.id) + 1, combatRank: ratings.entries.findIndex((item) => item.id === entity.id) + 1 });
        await syncCultivatorPearls(connection, saveId, entity);
        cultivators += 1; pearlAssets += 1; pearlHistory += (entity.spiritPearls?.history || []).length;
      }
      for (const entity of people) {
        const powerRows = people.map((item) => ({ id: item.id, value: powerOf(item, state) })).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
        const duelRows = people.map((item) => ({ id: item.id, value: Number(item.duelSeason?.score || 0) })).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
        const item = ratingMap.get(entity.id) || {};
        const text = JSON.stringify({ day: state.day, power: powerRows.findIndex((row) => row.id === entity.id) + 1, duel: duelRows.findIndex((row) => row.id === entity.id) + 1 });
        await connection.query(`INSERT INTO cultivator_rank_snapshots_v2(save_id,cultivator_id,day_no,power,power_rank,duel_score,duel_rank,combat_score,combat_rank,snapshot_json,content_hash)
          VALUES(?,?,?,?,?,?,?,?,?,?,SHA2(?,256)) ON DUPLICATE KEY UPDATE power=VALUES(power),power_rank=VALUES(power_rank),duel_score=VALUES(duel_score),duel_rank=VALUES(duel_rank),combat_score=VALUES(combat_score),combat_rank=VALUES(combat_rank),snapshot_json=VALUES(snapshot_json),content_hash=VALUES(content_hash)`,
        [saveId, entity.id, state.day, powerRows.find((row) => row.id === entity.id)?.value || 0, powerRows.findIndex((row) => row.id === entity.id) + 1, duelRows.find((row) => row.id === entity.id)?.value || 0, duelRows.findIndex((row) => row.id === entity.id) + 1, item.score || 500, ratings.entries.findIndex((row) => row.id === entity.id) + 1, text, text]);
      }
    });
    migrated += 1; console.log(`[cultivator-v2] ${saveId}`);
  }
  console.log(JSON.stringify({ migrated, cultivators, pearlAssets, pearlHistory }));
} finally { await mysqlPool.end(); }
