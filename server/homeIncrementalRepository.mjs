import { mysqlPool, parseMysqlJson } from "./mysqlDb.mjs";
import { getPublicHomeProjection } from "./gameLogic.mjs";

const homeSections = [
  "sect", "tasks", "taskDefinitions", "taskCompletions", "taskProgress", "taskMultiplierRecords",
  "gameSettings", "encounters", "daoTrial", "log", "logDays", "battleArchives", "bag",
  "equipmentTransfers", "provinces", "playerSectPlan", "sectProfiles", "sectFatigue", "dailyRootFortune"
];

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hydratePlayer(row) {
  const player = parseMysqlJson(row.cultivator_json, {}) || {};
  const metric = (typed, legacy) => number(typed) !== 0 || number(legacy) === 0 ? number(typed) : number(legacy);
  Object.assign(player, {
    id: player.id || "player", name: row.name || player.name || "",
    realm: number(row.realm_no, number(player.realm)), xp: number(row.xp, number(player.xp)),
    hp: number(row.hp, number(player.hp)), maxHp: number(row.max_hp, number(player.maxHp)),
    mana: number(row.mana, number(player.mana)), maxMana: number(row.max_mana, number(player.maxMana)),
    sect: row.sect_name || player.sect || "", spirit: metric(row.spirit, player.spirit),
    reputation: metric(row.reputation, player.reputation), body: metric(row.body, player.body),
    wisdom: metric(row.wisdom, player.wisdom), attack: metric(row.attack, player.attack),
    defense: metric(row.defense, player.defense), divineSense: metric(row.divine_sense, player.divineSense),
    chance: metric(row.chance, player.chance), wealth: metric(row.wealth, player.wealth),
    heartDemon: metric(row.heart_demon, player.heartDemon)
  });
  return player;
}

export async function readHomeProjectionFromMysql(saveId, options = {}) {
  const baseConnection = options.connection || mysqlPool;
  const connection = typeof options.queryObserver === "function"
    ? new Proxy(baseConnection, { get(target, property) { if (property !== "query") return Reflect.get(target, property, target); return async (sql, parameters) => { options.queryObserver(String(sql)); return target.query(sql, parameters); }; } })
    : baseConnection;
  const [[save]] = await connection.query("SELECT save_id,day_no,rebirth_no,calendar_start_date,last_settlement_date,state_revision FROM game_saves WHERE save_id=? LIMIT 1", [saveId]);
  if (!save) return null;
  const [[playerRow]] = await connection.query("SELECT * FROM cultivators WHERE save_id=? AND cultivator_id='player' LIMIT 1", [saveId]);
  if (!playerRow) return null;
  const [metricRows] = await connection.query(`SELECT c.cultivator_id,c.cultivator_kind,c.name,c.realm_no,c.sect_name,
      m.current_power,m.current_combat_rating,m.combat_score,m.duel_score,m.duel_wins,m.duel_losses,
      m.dungeon_clears,m.best_dungeon_power
    FROM cultivators c JOIN cultivator_metrics_v2 m ON m.save_id=c.save_id AND m.cultivator_id=c.cultivator_id
    WHERE c.save_id=? ORDER BY m.current_power DESC,c.cultivator_id`, [saveId]);
  const [sectionRows] = await connection.query(
    `SELECT section_key,section_json FROM save_sections WHERE save_id=? AND section_key IN (${homeSections.map(() => "?").join(",")})`,
    [saveId, ...homeSections]
  );
  const sections = Object.fromEntries(sectionRows.map((row) => [row.section_key, parseMysqlJson(row.section_json, null)]));
  const player = hydratePlayer(playerRow);
  const metrics = metricRows.map((row) => ({
    id: row.cultivator_id, kind: row.cultivator_kind, name: row.name || "", realm: number(row.realm_no),
    sect: row.sect_name || "", power: number(row.current_power), combatRating: number(row.current_combat_rating, 500),
    combatScore: number(row.combat_score, 500), duelScore: number(row.duel_score), wins: number(row.duel_wins), losses: number(row.duel_losses),
    dungeonClears: number(row.dungeon_clears), bestDungeonPower: number(row.best_dungeon_power)
  }));
  const state = {
    day: number(save.day_no, 1), rebirth: number(save.rebirth_no, 1), calendarStartDate: save.calendar_start_date || "",
    lastSettlementDate: save.last_settlement_date || "", stateRevision: number(save.state_revision), __stateRevision: number(save.state_revision),
    player, npcs: [], equipment: [], ...sections,
    sect: sections.sect || { name: player.sect || "" }, bag: sections.bag || {}, log: sections.log || [],
    tasks: sections.tasks || [], taskDefinitions: sections.taskDefinitions || [], taskCompletions: sections.taskCompletions || [],
    taskProgress: sections.taskProgress || {}, taskMultiplierRecords: sections.taskMultiplierRecords || [],
    gameSettings: sections.gameSettings || {}, encounters: sections.encounters || {}, daoTrial: sections.daoTrial || {}
  };
  return getPublicHomeProjection(state, { metrics });
}
