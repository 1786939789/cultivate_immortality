import { mysqlPool } from "../server/mysqlDb.mjs";
import { getAdminAccounts, setActiveAccount, setAdminManagedSaveId, testMutationRollback } from "../server/mysqlStore.mjs";
import { cleanupFixture, createFixture } from "./mysql-test-fixture.mjs";

const accounts = await getAdminAccounts();
const target = accounts.accounts.find((account) => account.hasSave) || accounts.accounts[0];
if (!target) throw new Error("没有可用于安全测试的普通用户存档");

const rollback = await testMutationRollback(target.id);
if (!rollback.failed || !rollback.databaseUnchanged || !rollback.cacheUnchanged) {
  throw new Error(`事务回滚测试失败: ${JSON.stringify(rollback)}`);
}

const originalManaged = accounts.managedSaveId;
const originalActive = new Set(accounts.activeSaveIds);
const fixture = await createFixture({ prefix: "user-safety-" });
const temporaryUserId = fixture.saveId;
try {
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
  await cleanupFixture(temporaryUserId);
}

console.log(JSON.stringify({ rollback, managedTargetSeparated: true }));
await mysqlPool.end();
