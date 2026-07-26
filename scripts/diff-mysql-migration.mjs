import path from "node:path";
import { mysqlPool } from "../server/mysqlDb.mjs";
import { loadStateFromMysql } from "../server/mysqlStateRepository.mjs";
import { openSqliteFile, projectRoot, sqliteRows } from "./sqlite-data.mjs";

const rootDir = projectRoot();
const gamePath = process.env.GAME_DB_PATH || path.join(rootDir, "data", "game.sqlite");
const gameDb = await openSqliteFile(gamePath);

function valueType(value) {
  if (Array.isArray(value)) return "array";
  if (value === null) return "null";
  return typeof value;
}

function displayValue(value) {
  if (typeof value !== "string" || value.length <= 160) return value;
  return `${value.slice(0, 80)}...(${value.length})`;
}

function compare(left, right, pathName, differences) {
  if (differences.length >= 100) return;
  const leftType = valueType(left);
  const rightType = valueType(right);
  if (leftType !== rightType) {
    differences.push({ path: pathName, kind: "type", left: leftType, right: rightType });
    return;
  }
  if (Array.isArray(left)) {
    if (left.length !== right.length) differences.push({ path: pathName, kind: "length", left: left.length, right: right.length });
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      compare(left[index], right[index], `${pathName}[${index}]`, differences);
      if (differences.length >= 100) return;
    }
    return;
  }
  if (left && typeof left === "object") {
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      const childPath = `${pathName}.${key}`;
      if (!(key in left)) differences.push({ path: childPath, kind: "missing-left", right: displayValue(right[key]) });
      else if (!(key in right)) differences.push({ path: childPath, kind: "missing-right", left: displayValue(left[key]) });
      else compare(left[key], right[key], childPath, differences);
      if (differences.length >= 100) return;
    }
    return;
  }
  if (left !== right) differences.push({ path: pathName, kind: "value", left: displayValue(left), right: displayValue(right) });
}

try {
  for (const row of sqliteRows(gameDb, "SELECT id, state_json FROM saves ORDER BY id")) {
    const source = JSON.parse(row.state_json);
    const target = await loadStateFromMysql(row.id);
    const differences = [];
    compare(source, target, "state", differences);
    console.log(JSON.stringify({ saveId: row.id, differenceCountShown: differences.length, differences }, null, 2));
  }
} finally {
  gameDb.close();
  await mysqlPool.end();
}
