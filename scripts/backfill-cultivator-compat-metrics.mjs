import { mysqlPool, withMysqlTransaction } from "../server/mysqlDb.mjs";

const apply = process.argv.includes("--apply");
const requestedSaveId = String(process.env.SAVE_ID || "").trim();
const where = requestedSaveId ? "WHERE m.save_id=?" : "";
const params = requestedSaveId ? [requestedSaveId] : [];

const [rows] = await mysqlPool.query(`SELECT m.save_id,m.cultivator_id,m.current_power,m.current_combat_rating,
  c.current_power AS compat_power,c.current_combat_rating AS compat_rating
  FROM cultivator_metrics_v2 m JOIN cultivators c
    ON c.save_id=m.save_id AND c.cultivator_id=m.cultivator_id ${where}
  ORDER BY m.save_id,m.cultivator_id`, params);
const changes = rows.filter((row) => Number(row.compat_power) !== Number(row.current_power)
  || Number(row.compat_rating) !== Number(row.current_combat_rating));

if (apply && changes.length) {
  await withMysqlTransaction(async (connection) => {
    for (const row of changes) {
      await connection.query(`UPDATE cultivators SET current_power=?,current_combat_rating=?,updated_at=CURRENT_TIMESTAMP(3)
        WHERE save_id=? AND cultivator_id=?`, [
        Number(row.current_power), Number(row.current_combat_rating), row.save_id, row.cultivator_id
      ]);
    }
  });
}

console.log(JSON.stringify({
  apply,
  saveId: requestedSaveId || null,
  scanned: rows.length,
  mismatches: changes.length,
  updated: apply ? changes.length : 0,
  examples: changes.slice(0, 20).map((row) => ({
    saveId: row.save_id,
    cultivatorId: row.cultivator_id,
    compatibilityPower: Number(row.compat_power),
    metricPower: Number(row.current_power),
    compatibilityRating: Number(row.compat_rating),
    metricRating: Number(row.current_combat_rating)
  }))
}, null, 2));
await mysqlPool.end();
