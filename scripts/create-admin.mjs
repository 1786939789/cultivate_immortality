import { randomUUID } from "node:crypto";
import { hashPassword } from "../server/authSecurity.mjs";
import { ensureMysqlSchema, mysqlPool, withMysqlTransaction } from "../server/mysqlDb.mjs";

const username = String(process.env.NEW_ADMIN_USERNAME || process.argv[2] || "").trim();
const password = String(process.env.NEW_ADMIN_PASSWORD || process.argv[3] || "");

if (username.length < 2 || username.length > 24 || !password || password.length < 6) {
  throw new Error("请通过 NEW_ADMIN_USERNAME/NEW_ADMIN_PASSWORD 提供管理员账号，密码至少 6 位");
}

await ensureMysqlSchema();
const { hash, salt } = await hashPassword(password);
await withMysqlTransaction(async (connection) => {
  const normalized = username.toLocaleLowerCase("en-US");
  const [rows] = await connection.query("SELECT id FROM auth_users WHERE username_normalized = ? LIMIT 1", [normalized]);
  if (rows.length) {
    await connection.query(`
      UPDATE auth_users SET username = ?, password_hash = ?, password_salt = ?, role = 'admin'
      WHERE id = ?
    `, [username, hash, salt, rows[0].id]);
  } else {
    await connection.query(`
      INSERT INTO auth_users (id, username, username_normalized, password_hash, password_salt, role)
      VALUES (?, ?, ?, ?, ?, 'admin')
    `, [`user-${randomUUID()}`, username, normalized, hash, salt]);
  }
});

console.log(`管理员 ${username} 已创建或更新。`);
await mysqlPool.end();
