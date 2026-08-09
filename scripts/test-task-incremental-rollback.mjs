import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { completeTaskIncremental, deleteTaskIncremental } from "../server/taskCommand.mjs";
import { cleanupFixture, createFixture } from "./mysql-test-fixture.mjs";

const fixture = await createFixture({ prefix: "task-test-" });
const testId = fixture.saveId;
try {
  const target = { id: "incremental-smoke-task", value: { id: "incremental-smoke-task", name: "增量链路测试", detail: "", type: "complete", category: "生活", xpReward: 100, spiritReward: 3, enabled: true } };
  const definitionText = JSON.stringify(target.value);
  await mysqlPool.query(`INSERT INTO task_definitions_v2
    (save_id, task_id, category, enabled, definition_json, content_hash)
    VALUES (?, ?, '生活', 1, ?, SHA2(?, 256))`, [testId, target.id, definitionText, definitionText]);
  const before = await loadStateFromMysql(testId);
  const response = await completeTaskIncremental(testId, {
    taskId: target.id,
    completedAmount: 1,
    day: before.day
  });
  const after = await loadStateFromMysql(testId);
  const [counts] = await mysqlPool.query(`SELECT
    (SELECT COUNT(*) FROM cultivators WHERE save_id=? AND cultivator_kind='npc') npc_count,
    (SELECT COUNT(*) FROM battle_replays WHERE save_id=?) replay_count,
    (SELECT COUNT(*) FROM task_completions_v2 WHERE save_id=?) completion_count`, [testId, testId, testId]);
  if (after.player.xp <= before.player.xp) throw new Error(`任务修为未增加: before=${before.player.xp}, after=${after.player.xp}, gain=${response.patch.completion.xp}`);
  if (!after.taskCompletions.some((item) => item.id === response.patch.completion.id)) throw new Error("完整回读未包含新增任务");
  const deleted = await deleteTaskIncremental(testId, { id: response.patch.completion.id });
  const restored = await loadStateFromMysql(testId);
  if (restored.taskCompletions.some((item) => item.id === response.patch.completion.id)) throw new Error("撤回后任务仍存在");
  console.log(JSON.stringify({
    kind: response.kind,
    revision: response.stateRevision,
    xpGain: response.patch.completion.xp,
    spiritGain: response.patch.completion.spirit,
    npcCountUnchanged: Number(counts[0].npc_count) === before.npcs.length,
    replayCount: Number(counts[0].replay_count),
    completionCount: Number(counts[0].completion_count),
    fullReloadConsistent: true
    ,deleteKind: deleted.kind
  }));
} finally {
  await cleanupFixture(testId);
  await mysqlPool.end();
}
