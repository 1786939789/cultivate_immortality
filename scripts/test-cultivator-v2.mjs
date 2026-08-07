import { randomUUID } from "node:crypto";
import { mysqlPool, withMysqlTransaction } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateWithConnection } from "../server/mysqlStateRepository.mjs";
import { readCultivatorDetailIncremental, syncCultivatorPearls, upsertCultivatorMetrics } from "../server/cultivatorIncrementalRepository.mjs";
import { readLiveRankingIncremental } from "../server/rankingIncrementalRepository.mjs";
import { powerOf } from "../server/gameLogic.mjs";

const [[source]] = await mysqlPool.query("SELECT save_id FROM game_saves ORDER BY save_id LIMIT 1");
if (!source) throw new Error("缺少本地测试存档");
const testId = `cultivator-v2-test-${randomUUID()}`;
try {
  const state = await loadStateFromMysql(source.save_id);
  await withMysqlTransaction((connection) => saveStateWithConnection(connection, structuredClone(state), testId));
  await withMysqlTransaction(async (connection) => {
    for (const entity of [state.player, ...state.npcs]) {
      await syncCultivatorPearls(connection, testId, entity);
      await upsertCultivatorMetrics(connection, { saveId: testId, cultivatorId: entity.id, currentPower: powerOf(entity, state), currentCombatRating: 500, duelScore: entity.duelSeason?.score || 0 });
    }
  });
  const detail = await readCultivatorDetailIncremental(testId, "player");
  const ranking = await readLiveRankingIncremental(testId, "power", { limit: 200 });
  const [counts] = await mysqlPool.query(`SELECT
    (SELECT COUNT(*) FROM cultivators WHERE save_id=?) cultivators,
    (SELECT COUNT(*) FROM cultivator_metrics_v2 WHERE save_id=?) metrics,
    (SELECT COUNT(*) FROM spirit_pearl_assets_v2 WHERE save_id=?) assets,
    (SELECT COUNT(*) FROM battle_replays WHERE save_id=?) replays`, [testId, testId, testId, testId]);
  if (!detail?.independent || detail.spiritPearls.pearls.length !== 9) throw new Error("独立详情或灵珠读取失败");
  if (ranking.entries.length !== state.npcs.length + 1) throw new Error("实时排行榜人数不一致");
  if (Number(counts[0].cultivators) !== Number(counts[0].metrics) || Number(counts[0].cultivators) !== Number(counts[0].assets)) throw new Error("人物、指标、灵珠资产数量不一致");
  console.log(JSON.stringify({ detailIndependent: true, cultivators: Number(counts[0].cultivators), metrics: Number(counts[0].metrics), pearlAssets: Number(counts[0].assets), pearlKinds: detail.spiritPearls.pearls.length, rankingEntries: ranking.entries.length, replayRowsPreserved: Number(counts[0].replays) }));
} finally { await mysqlPool.query("DELETE FROM game_saves WHERE save_id=?", [testId]); await mysqlPool.end(); }
