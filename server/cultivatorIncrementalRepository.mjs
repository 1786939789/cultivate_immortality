import { createHash } from "node:crypto";
import { mysqlPool, parseMysqlJson, withMysqlTransaction } from "./mysqlDb.mjs";
import { duelRankForScore, spiritPearls } from "./gameData.mjs";
import { getPublicSpiritPearls } from "./gameLogic.mjs";

const json = (value) => JSON.stringify(value === undefined ? null : value);
const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : json(value)).digest("hex");
const rankPoints = (rank, participantCount) => participantCount <= 1 ? 200 : Math.round(200 - (rank - 1) * 199 / (participantCount - 1));

function publicMetricHistory(rankSnapshots, cultivatorId, row, participantCount) {
  const decoded = rankSnapshots.map((item) => ({ row: item, data: parseMysqlJson(item.snapshot_json, {}) || {} }));
  const power = decoded.map(({ row: item, data }) => data.power || {
    day: Number(item.day_no),
    rank: Number(item.power_rank),
    participantCount,
    rankPoints: rankPoints(Number(item.power_rank), participantCount),
    value: Number(item.power)
  }).sort((left, right) => Number(left.day) - Number(right.day));
  const duel = decoded.map(({ row: item, data }) => data.duel || {
    day: Number(item.day_no),
    rank: Number(item.duel_rank),
    participantCount,
    rankPoints: rankPoints(Number(item.duel_rank), participantCount),
    value: Number(item.duel_score),
    rankName: duelRankForScore(Number(item.duel_score)).name
  }).sort((left, right) => Number(left.day) - Number(right.day));
  const daily = decoded.map(({ row: item, data }) => Object.hasOwn(data, "combat") ? data.combat : {
    day: Number(item.day_no),
    score: Number(item.combat_score),
    rank: Number(item.combat_rank),
    participantCount,
    rankPoints: rankPoints(Number(item.combat_rank), participantCount)
  }).filter(Boolean).sort((left, right) => Number(right.day) - Number(left.day));
  const latestPayload = decoded.find(({ data }) => data.rating)?.data || {};
  const rating = latestPayload.rating || {};
  const meta = latestPayload.meta || {};
  return {
    rankingTrends: { power, duel },
    combatRating: {
      id: cultivatorId,
      score: Number(rating.score ?? row.metric_rating ?? 500),
      dungeonScore: Number(rating.dungeonScore ?? 50),
      duelScore: Number(rating.duelScore ?? 50),
      provinceScore: Number(rating.provinceScore ?? 50),
      activeDays: Number(rating.activeDays ?? daily.length),
      dungeonDays: Number(rating.dungeonDays ?? 0),
      duelDays: Number(rating.duelDays ?? 0),
      provinceDays: Number(rating.provinceDays ?? 0),
      sampleEnough: Boolean(rating.sampleEnough ?? daily.length >= 3),
      daily
    },
    combatRatingMeta: {
      windowDays: Number(meta.windowDays || 10),
      windowStartDay: Number(meta.windowStartDay || power[0]?.day || 1),
      windowEndDay: Number(meta.windowEndDay || power.at(-1)?.day || 1),
      minimumActiveDays: Number(meta.minimumActiveDays || 3),
      weights: meta.weights || { dungeon: 0.4, duel: 0.3, province: 0.3 }
    }
  };
}

export async function readCultivatorDetailIncremental(saveId, cultivatorId, options = {}) {
  const connection = options.connection || mysqlPool;
  const [rows] = await connection.query(`SELECT c.*, m.current_power AS metric_power, m.current_combat_rating AS metric_rating,
    m.combat_score, m.duel_score, m.duel_wins AS metric_duel_wins, m.duel_losses AS metric_duel_losses,
    m.power_rank, m.combat_rank, m.metrics_revision
    FROM cultivators c LEFT JOIN cultivator_metrics_v2 m ON m.save_id=c.save_id AND m.cultivator_id=c.cultivator_id
    WHERE c.save_id=? AND c.cultivator_id=? LIMIT 1`, [saveId, cultivatorId]);
  if (!rows.length) return null;
  const row = rows[0];
  const [assets] = await connection.query(`SELECT * FROM spirit_pearl_assets_v2 WHERE save_id=? AND cultivator_id=? LIMIT 1`, [saveId, cultivatorId]);
  const [pearls] = await connection.query(`SELECT * FROM spirit_pearls_v2 WHERE save_id=? AND cultivator_id=? ORDER BY pearl_id`, [saveId, cultivatorId]);
  const [fragments] = await connection.query(`SELECT * FROM spirit_pearl_fragments_v2 WHERE save_id=? AND cultivator_id=? ORDER BY pearl_id,tier`, [saveId, cultivatorId]);
  const [pearlHistory] = await connection.query(`SELECT history_json FROM spirit_pearl_history_v2 WHERE save_id=? AND cultivator_id=? ORDER BY day_no DESC,position_no LIMIT ?`, [saveId, cultivatorId, Number(options.historyLimit || 30)]);
  const [rankSnapshots] = await connection.query(`SELECT * FROM cultivator_rank_snapshots_v2 WHERE save_id=? AND cultivator_id=? ORDER BY day_no DESC LIMIT 10`, [saveId, cultivatorId]);
  const [equipment] = await connection.query(`SELECT item_json FROM equipment_items WHERE save_id=? AND owner_id=? ORDER BY position_no`, [saveId, cultivatorId]);
  const [history] = await connection.query(`SELECT history_type,position_no,record_json FROM cultivator_history WHERE save_id=? AND cultivator_id=? ORDER BY history_type,position_no LIMIT 1200`, [saveId, cultivatorId]);
  const entity = parseMysqlJson(row.cultivator_json, {}) || {};
  const histories = new Map();
  for (const item of history) { const list = histories.get(item.history_type) || []; list.push({ position: Number(item.position_no), value: parseMysqlJson(item.record_json, {}) }); histories.set(item.history_type, list); }
  for (const [type, values] of histories) entity[type] = values.sort((a, b) => a.position - b.position).map((item) => item.value);
  const metric = (typed, legacy) => Number(typed || 0) !== 0 || Number(legacy || 0) === 0 ? Number(typed || 0) : Number(legacy || 0);
  Object.assign(entity, { id: entity.id || row.cultivator_id, name: row.name || entity.name, realm: Number(row.realm_no), xp: Number(row.xp), hp: Number(row.hp), maxHp: Number(row.max_hp), mana: Number(row.mana), maxMana: Number(row.max_mana), sect: row.sect_name || entity.sect, spirit: metric(row.spirit, entity.spirit), reputation: metric(row.reputation, entity.reputation), body: metric(row.body, entity.body), wisdom: metric(row.wisdom, entity.wisdom), attack: metric(row.attack, entity.attack), defense: metric(row.defense, entity.defense), divineSense: metric(row.divine_sense, entity.divineSense), chance: metric(row.chance, entity.chance), wealth: metric(row.wealth, entity.wealth), heartDemon: metric(row.heart_demon, entity.heartDemon) });
  const asset = assets[0] || { version: 3, dust: 0 };
  const pearlMap = new Map(pearls.map((item) => [item.pearl_id, { id: item.pearl_id, tier: Number(item.tier), star: Number(item.star), fragments: {} }]));
  for (const item of fragments) pearlMap.get(item.pearl_id)?.fragments && (pearlMap.get(item.pearl_id).fragments[String(item.tier)] = Number(item.fragment_count));
  entity.spiritPearls = { version: Number(asset.version || 3), dust: Number(asset.dust || 0), pearls: Object.fromEntries([...pearlMap.entries()]), history: pearlHistory.map((item) => parseMysqlJson(item.history_json, {})) };
  const publicPearls = getPublicSpiritPearls({ day: 1, player: entity, spiritPearls: entity.spiritPearls, equipment: [], npcs: [] }, entity);
  const powerValue = Number(row.metric_power ?? 0);
  const ratingValue = Number(row.metric_rating ?? 500);
  const [[powerRank]] = await connection.query(`SELECT COUNT(*)+1 rank_no FROM cultivator_metrics_v2 WHERE save_id=? AND (current_power > ? OR (current_power=? AND cultivator_id < ?))`, [saveId, powerValue, powerValue, cultivatorId]);
  const [[combatRank]] = await connection.query(`SELECT COUNT(*)+1 rank_no FROM cultivator_metrics_v2 WHERE save_id=? AND (current_combat_rating > ? OR (current_combat_rating=? AND cultivator_id < ?))`, [saveId, ratingValue, ratingValue, cultivatorId]);
  const [[participant]] = await connection.query("SELECT COUNT(*) participant_count FROM cultivator_metrics_v2 WHERE save_id=?", [saveId]);
  const metricHistory = publicMetricHistory(rankSnapshots, cultivatorId, row, Number(participant.participant_count || 1));
  return {
    person: entity,
    power: powerValue,
    metrics: { currentPower: powerValue, currentCombatRating: ratingValue, combatScore: Number(row.combat_score ?? 500), duelScore: Number(row.duel_score ?? 0), powerRank: Number(powerRank.rank_no || 0), combatRank: Number(combatRank.rank_no || 0), revision: Number(row.metrics_revision || 0) },
    spiritPearls: { ...publicPearls, history: pearlHistory.map((item) => parseMysqlJson(item.history_json, {})) },
    equippedItems: equipment.map((item) => parseMysqlJson(item.item_json, {})),
    rankingTrends: metricHistory.rankingTrends,
    combatRating: metricHistory.combatRating,
    combatRatingMeta: metricHistory.combatRatingMeta,
    independent: true
  };
}

export async function upsertCultivatorMetrics(connection, options) {
  await connection.query(`INSERT INTO cultivator_metrics_v2
    (save_id,cultivator_id,current_power,current_combat_rating,combat_score,duel_score,duel_wins,duel_losses,dungeon_clears,best_dungeon_power,power_rank,combat_rank,metrics_revision)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1) ON DUPLICATE KEY UPDATE current_power=VALUES(current_power),current_combat_rating=VALUES(current_combat_rating),combat_score=VALUES(combat_score),duel_score=VALUES(duel_score),duel_wins=VALUES(duel_wins),duel_losses=VALUES(duel_losses),dungeon_clears=VALUES(dungeon_clears),best_dungeon_power=VALUES(best_dungeon_power),power_rank=VALUES(power_rank),combat_rank=VALUES(combat_rank),metrics_revision=metrics_revision+1`,
  [options.saveId, options.cultivatorId, options.currentPower || 0, options.currentCombatRating || 500, options.combatScore || 500, options.duelScore || 0, options.duelWins || 0, options.duelLosses || 0, options.dungeonClears || 0, options.bestDungeonPower || 0, options.powerRank || null, options.combatRank || null]);
  // `cultivators.current_*` is retained as a compatibility mirror for older
  // readers.  The metrics table remains authoritative; keep the mirror in
  // sync whenever the authoritative row is updated.
  if (options.syncCompatibility !== false) {
    await connection.query(`UPDATE cultivators
      SET current_power=?, current_combat_rating=?, updated_at=CURRENT_TIMESTAMP(3)
      WHERE save_id=? AND cultivator_id=?`, [
      Number(options.currentPower || 0), Number(options.currentCombatRating ?? 500), options.saveId, options.cultivatorId
    ]);
  }
}

export async function syncCultivatorPearls(connection, saveId, entity) {
  const asset = entity?.spiritPearls || { version: 3, dust: 0, pearls: {}, history: [] };
  const entries = Object.values(asset.pearls || {});
  await connection.query(`INSERT INTO spirit_pearl_assets_v2(save_id,cultivator_id,version,dust,formed_count,content_hash) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE version=VALUES(version),dust=VALUES(dust),formed_count=VALUES(formed_count),content_hash=VALUES(content_hash)`, [saveId, entity.id, Number(asset.version || 3), Number(asset.dust || 0), entries.filter((item) => Number(item.tier) > 0).length, hash(asset)]);
  for (const item of entries) {
    await connection.query(`INSERT INTO spirit_pearls_v2(save_id,cultivator_id,pearl_id,tier,star,content_hash) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE tier=VALUES(tier),star=VALUES(star),content_hash=VALUES(content_hash)`, [saveId, entity.id, item.id, Number(item.tier || 0), Number(item.star || 0), hash(item)]);
    for (const [tier, count] of Object.entries(item.fragments || {})) if (Number(count) > 0) await connection.query(`INSERT INTO spirit_pearl_fragments_v2(save_id,cultivator_id,pearl_id,tier,fragment_count,content_hash) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE fragment_count=VALUES(fragment_count),content_hash=VALUES(content_hash)`, [saveId, entity.id, item.id, Number(tier), Number(count), hash({ tier, count })]);
  }
  const incomingPearls = new Set(entries.map((item) => String(item.id)));
  const [oldPearls] = await connection.query("SELECT pearl_id FROM spirit_pearls_v2 WHERE save_id=? AND cultivator_id=?", [saveId, entity.id]);
  for (const row of oldPearls) if (!incomingPearls.has(String(row.pearl_id))) await connection.query("DELETE FROM spirit_pearls_v2 WHERE save_id=? AND cultivator_id=? AND pearl_id=?", [saveId, entity.id, row.pearl_id]);
  await connection.query("DELETE FROM spirit_pearl_fragments_v2 WHERE save_id=? AND cultivator_id=?", [saveId, entity.id]);
  for (const item of entries) for (const [tier, count] of Object.entries(item.fragments || {})) if (Number(count) > 0) await connection.query(`INSERT INTO spirit_pearl_fragments_v2(save_id,cultivator_id,pearl_id,tier,fragment_count,content_hash) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE fragment_count=VALUES(fragment_count),content_hash=VALUES(content_hash)`, [saveId, entity.id, item.id, Number(tier), Number(count), hash({ tier, count })]);
  for (const [position, record] of (asset.history || []).entries()) { const text = json(record); const id = String(record.id || `legacy-pearl-${record.day || 0}-${position}-${hash(text).slice(0, 12)}`); await connection.query(`INSERT INTO spirit_pearl_history_v2(save_id,cultivator_id,history_id,day_no,position_no,history_type,pearl_id,history_json,content_hash) VALUES(?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE history_json=VALUES(history_json),content_hash=VALUES(content_hash)`, [saveId, entity.id, id, Number(record.day || 0), position, record.type || "", record.pearlId || "", text, hash(text)]); }
}

export async function syncCultivatorPearlsIfChanged(connection, saveId, entity) {
  const asset = entity?.spiritPearls || { version: 3, dust: 0, pearls: {}, history: [] };
  const expectedHash = hash(asset);
  const [[row]] = await connection.query("SELECT content_hash FROM spirit_pearl_assets_v2 WHERE save_id=? AND cultivator_id=? LIMIT 1", [saveId, entity.id]);
  if (row?.content_hash === expectedHash) return false;
  await syncCultivatorPearls(connection, saveId, entity);
  return true;
}

export const withCultivatorTransaction = withMysqlTransaction;
