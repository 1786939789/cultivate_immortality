import { randomUUID } from "node:crypto";
import { hashAuthAttemptKey } from "../server/authSecurity.mjs";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loginUser } from "../server/mysqlStore.mjs";

const username = `missing-${randomUUID().slice(0, 8)}`;
const ip = "127.0.0.250";
let blocked = false;
try {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await loginUser({ username, password: "invalid-password" }, { ip });
    } catch (error) {
      if (/尝试次数过多/.test(error.message)) blocked = true;
    }
  }
  if (!blocked) throw new Error("连续错误登录未触发限流");
  console.log(JSON.stringify({ blockedAfterFiveFailures: true }));
} finally {
  await mysqlPool.query("DELETE FROM auth_attempts WHERE attempt_key = ?", [hashAuthAttemptKey("login", ip, username.toLocaleLowerCase("en-US"))]);
  await mysqlPool.end();
}
