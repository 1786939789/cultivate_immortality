import { randomUUID } from "node:crypto";
import { hashPassword } from "../server/authSecurity.mjs";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql, saveStateToMysql } from "../server/mysqlStateRepository.mjs";
import { getAdminAccounts, setActiveAccount, setAdminManagedSaveId, testMutationRollback } from "../server/mysqlStore.mjs";

const accounts = await getAdminAccounts();
const target = accounts.accounts.find((account) => account.hasSave) || accounts.accounts[0];
if (!target) throw new Error("没有可用于安全测试的普通用户存档");

const rollback = await testMutationRollback(target.id);
if (!rollback.failed || !rollback.databaseUnchanged || !rollback.cacheUnchanged) {
  throw new Error(`事务回滚测试失败: ${JSON.stringify(rollback)}`);
}

const originalManaged = accounts.managedSaveId;
const originalActive = new Set(accounts.activeSaveIds);
const temporaryUserId = `user-safety-${randomUUID()}`;
try {
  const { hash, salt } = await hashPassword(randomUUID());
  await mysqlPool.query(`
    INSERT INTO auth_users (id, username, username_normalized, password_hash, password_salt, role)
    VALUES (?, ?, ?, ?, ?, 'user')
  `, [temporaryUserId, temporaryUserId, temporaryUserId, hash, salt]);
  await saveStateToMysql(structuredClone(await loadStateFromMysql(target.id)), temporaryUserId);
  await setAdminManagedSaveId(temporaryUserId);
  const afterManaged = await getAdminAccounts();
  if (afterManaged.managedSaveId !== temporaryUserId) {
    const [settings] = await mysqlPool.query("SELECT setting_value FROM app_settings WHERE setting_key = 'managed_save_id'");
    throw new Error(`管理目标切换失败: ${JSON.stringify({ expected: temporaryUserId, actual: afterManaged.managedSaveId, setting: settings[0]?.setting_value })}`);
  }
  if (JSON.stringify(afterManaged.activeSaveIds) !== JSON.stringify(accounts.activeSaveIds)) throw new Error("切换管理目标意外改变了自动结算集合");
} finally {
  if (originalManaged) await setAdminManagedSaveId(originalManaged);
  for (const account of accounts.accounts) {
    const shouldBeActive = originalActive.has(account.id);
    if (account.active !== shouldBeActive) await setActiveAccount(account.id, shouldBeActive);
  }
  await mysqlPool.query("DELETE FROM game_saves WHERE save_id = ?", [temporaryUserId]);
  await mysqlPool.query("DELETE FROM auth_users WHERE id = ?", [temporaryUserId]);
}

console.log(JSON.stringify({ rollback, managedTargetSeparated: true }));
await mysqlPool.end();
