import { createHash } from "node:crypto";
import { mysqlPool, parseMysqlJson, withMysqlTransaction } from "../server/mysqlDb.mjs";

const saveId = String(process.env.REPAIR_SAVE_ID || "user-987ed077-21c5-4e2a-ba6d-0a189d68529c");
const apply = process.argv.includes("--apply");
const hash = (value) => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const fields = [
  ["spirit", "spirit"], ["reputation", "reputation"], ["body", "body"], ["wisdom", "wisdom"],
  ["attack", "attack"], ["defense", "defense"], ["divineSense", "divine_sense"], ["chance", "chance"],
  ["wealth", "wealth"], ["heartDemon", "heart_demon"]
];
const num = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;
const powerFromStats = (stats) => Math.floor(
  num(stats?.attack) * 2.8 + num(stats?.defense) * 2 + num(stats?.maxHp) * 0.42
  + num(stats?.divineSense) * 1.35 + num(stats?.maxMana) * 0.55
);

async function latestPlayerReplay(connection) {
  const [rows] = await connection.query(`SELECT replay_json FROM battle_replays
    WHERE save_id=? ORDER BY day_no DESC, created_at DESC LIMIT 80`, [saveId]);
  for (const row of rows) {
    const replay = parseMysqlJson(row.replay_json, {});
    for (const side of [replay?.left, replay?.right, replay?.attacker, replay?.defender]) {
      if (side?.id === "player" && side.baseStats) return side.baseStats;
    }
  }
  return null;
}

async function inspect(connection) {
  const [rows] = await connection.query("SELECT * FROM cultivators WHERE save_id=? ORDER BY position_no", [saveId]);
  const playerReplay = await latestPlayerReplay(connection);
  const changes = [];
  for (const row of rows) {
    const entity = parseMysqlJson(row.cultivator_json, {}) || {};
    const patch = {};
    for (const [jsonKey, column] of fields) {
      const typed = num(row[column]);
      const legacy = num(entity[jsonKey]);
      if (row.cultivator_kind === "npc" && typed === 0 && legacy !== 0) patch[column] = legacy;
      else if (row.cultivator_kind === "player" && ["attack", "defense", "divine_sense"].includes(column) && typed === 0 && legacy !== 0) patch[column] = legacy;
    }
    if (row.cultivator_kind === "player" && playerReplay) {
      for (const [jsonKey, column] of [["attack", "attack"], ["defense", "defense"], ["divineSense", "divine_sense"]]) {
        if (num(playerReplay[jsonKey]) > 0) {
          patch[column] = num(playerReplay[jsonKey]);
          entity[jsonKey] = num(playerReplay[jsonKey]);
        }
      }
    }
    if (Object.keys(patch).length || row.cultivator_kind === "player") {
      if (row.cultivator_kind === "player") {
        const text = JSON.stringify(entity);
        changes.push({ row, patch, entity, text, power: playerReplay ? powerFromStats(playerReplay) : null });
      } else changes.push({ row, patch, entity, text: JSON.stringify(entity), power: null });
    }
  }
  return { rows, changes, playerReplay };
}

const result = await withMysqlTransaction(async (connection) => {
  const audit = await inspect(connection);
  if (!apply) return audit;
  for (const item of audit.changes) {
    const { row, patch, entity, text, power } = item;
    const values = Object.fromEntries(fields.map(([jsonKey, column]) => [column, num(patch[column] ?? row[column] ?? entity[jsonKey])]));
    await connection.query(`UPDATE cultivators SET spirit=?,reputation=?,body=?,wisdom=?,attack=?,defense=?,divine_sense=?,chance=?,wealth=?,heart_demon=?,cultivator_json=?,content_hash=?,updated_at=CURRENT_TIMESTAMP(3)
      WHERE save_id=? AND cultivator_id=?`, [values.spirit, values.reputation, values.body, values.wisdom, values.attack, values.defense, values.divine_sense, values.chance, values.wealth, values.heart_demon, text, hash(text), saveId, row.cultivator_id]);
    if (row.cultivator_kind === "player" && Number.isFinite(power)) {
      await connection.query(`UPDATE cultivators SET current_power=? WHERE save_id=? AND cultivator_id=?`, [Math.round(power), saveId, row.cultivator_id]);
      await connection.query(`UPDATE cultivator_metrics_v2 SET current_power=?,metrics_revision=metrics_revision+1 WHERE save_id=? AND cultivator_id=?`, [Math.round(power), saveId, row.cultivator_id]);
    }
  }
  return audit;
});

console.log(JSON.stringify({ saveId, apply, totalCultivators: result.rows.length, changed: result.changes.length, playerReplay: result.playerReplay ? { attack: result.playerReplay.attack, defense: result.playerReplay.defense, divineSense: result.playerReplay.divineSense } : null, changes: result.changes.map((item) => ({ id: item.row.cultivator_id, name: item.row.name, kind: item.row.cultivator_kind, patch: item.patch, power: Math.round(item.power) })) }, null, 2));
await mysqlPool.end();
