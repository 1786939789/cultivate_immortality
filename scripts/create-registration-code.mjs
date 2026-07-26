import { randomUUID } from "node:crypto";
import { hashRegistrationCode } from "../server/authSecurity.mjs";
import { ensureMysqlSchema, mysqlPool } from "../server/mysqlDb.mjs";

const code = String(process.env.NEW_REGISTRATION_CODE || process.argv[2] || "").trim();
const maxUsesText = String(process.env.REGISTRATION_CODE_MAX_USES || process.argv[3] || "").trim();
const maxUses = maxUsesText ? Number(maxUsesText) : null;

if (code.length < 6) throw new Error("请通过 NEW_REGISTRATION_CODE 提供至少 6 位的注册码");
if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) throw new Error("注册码使用次数必须是正整数");

await ensureMysqlSchema();
const codeHash = hashRegistrationCode(code);
await mysqlPool.query(`
  INSERT INTO auth_registration_codes (code, code_hash, active, max_uses, used_count)
  VALUES (?, ?, 1, ?, 0)
  ON DUPLICATE KEY UPDATE active = 1, max_uses = VALUES(max_uses)
`, [`code-${randomUUID()}`, codeHash, maxUses]);

console.log(`注册码已创建${maxUses ? `，最多使用 ${maxUses} 次` : "，不限使用次数"}。`);
await mysqlPool.end();
