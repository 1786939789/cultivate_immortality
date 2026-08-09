import { mysqlPool } from "../server/mysqlDb.mjs";
import { cleanupFixtures } from "./mysql-test-fixture.mjs";

const removed = await cleanupFixtures();
console.log(JSON.stringify({ removed }));
await mysqlPool.end();
