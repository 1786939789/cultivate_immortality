import { mysqlPool } from "../server/mysqlDb.mjs";
import { readDungeonDayFromMysql, readDungeonDayIndexFromMysql } from "../server/dungeonIncrementalRepository.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { getPublicState, publicDungeonDay } from "../server/gameLogic.mjs";

const [[save]] = await mysqlPool.query("SELECT save_id, day_no FROM game_saves ORDER BY save_id LIMIT 1");
if (!save) throw new Error("缺少可验证存档");

try {
  const indexQueries = [];
  const index = await readDungeonDayIndexFromMysql(save.save_id, 10, { queryObserver: (sql) => indexQueries.push(sql) });
  const dayQueries = [];
  const single = await readDungeonDayFromMysql(save.save_id, save.day_no, { queryObserver: (sql) => dayQueries.push(sql) });
  const full = await loadStateFromMysql(save.save_id);
  const oldDay = getPublicState(full).dungeonDays.find((record) => Number(record.day) === Number(save.day_no)) || null;
  const newDay = publicDungeonDay(single.record, single.currentDay, new Map(Object.entries(single.portraits || {})));

  if (JSON.stringify(oldDay) !== JSON.stringify(newDay)) throw new Error("单日副本响应与旧完整状态不一致");
  if (indexQueries.some((sql) => /dungeon_records/i.test(sql))) throw new Error("日期索引错误读取了副本明细");
  if (!dayQueries.some((sql) => /dungeon_days.+day_no=\?/i.test(sql))) throw new Error("单日查询缺少 day_no 条件");
  if (!dayQueries.some((sql) => /dungeon_records.+day_no=\?/i.test(sql))) throw new Error("副本明细查询缺少 day_no 条件");
  if (dayQueries.some((sql) => /FROM cultivator_history|FROM equipment_items|FROM duel_days|FROM province_wars/i.test(sql))) {
    throw new Error("单日副本查询访问了无关历史表");
  }

  console.log(JSON.stringify({
    ok: true,
    saveId: save.save_id,
    currentDay: Number(save.day_no),
    indexCount: index.items.length,
    recordBytes: Buffer.byteLength(JSON.stringify(newDay || {})),
    indexQueries,
    dayQueries
  }));
} finally {
  await mysqlPool.end();
}
