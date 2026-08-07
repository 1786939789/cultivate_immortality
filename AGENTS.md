# AGENTS.md

## 项目概览

这是一个名为「长生札记」的单机文字修仙 RPG。核心玩法是把现实任务转化为修为、心境、气血、灵石等游戏资源，再通过突破、副本、宗门、切磋、丹药、排行榜和人物详情等系统推动角色成长。

项目采用前后端分离但同仓库部署的结构：

- 前端：Vue 3 + Vite，源码在 `web/`。
- 后端：Node.js 原生 HTTP 服务，源码在 `server/`。
- 存储：当前运行时默认使用 MySQL（由 `.env` 的 `STORAGE_DRIVER=mysql` 选择），通过 `mysql2/promise` 连接 `cultivate_immortality` 数据库；仓库仍保留 `sql.js`/SQLite 兼容实现和迁移工具。
- 构建产物：Vite 输出到根目录 `dist/`。

## 常用命令

```bash
npm run dev
```

同时启动后端 API 和 Vite 前端开发服务器。

```bash
npm run dev:api
```

只启动后端服务，默认监听 `http://127.0.0.1:8787`。

```bash
npm run dev:web
```

只启动 Vite 前端开发服务器，默认监听 `http://127.0.0.1:5173`，并把 `/api` 代理到后端 `8787` 端口。

```bash
npm run build
```

构建前端，输出到 `dist/`。

```bash
npm run start
```

启动后端服务。后端会优先处理 `/api/*`，其他路径尝试从 `dist/` 提供静态文件。

## 目录结构

```text
.
├── package.json
├── package-lock.json
├── vite.config.mjs
├── scripts/
│   └── dev.mjs
├── server/
│   ├── index.mjs
│   ├── store.mjs
│   ├── gameLogic.mjs
│   └── gameData.mjs
├── web/
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── api.js
│       ├── styles.css
│       └── components/
│           ├── Meter.vue
│           └── LogPanel.vue
├── data/
│   └── game.sqlite                 # SQLite 兼容/迁移来源，当前默认运行时不使用
└── dist/
```

`data/` 和 `dist/` 是运行/构建产生的目录，不应作为源码维护重点。

## Git 忽略策略

当前 `.gitignore` 已排除：

- `node_modules/`
- `dist/`
- `data/*.sqlite` 和相关 SQLite 临时文件
- `.env` / `.env.*`
- 日志文件
- 缓存目录
- 系统和编辑器文件

注意不要提交本地存档 `data/game.sqlite` 或其他本地数据库文件。当前默认运行时的正式存档在 MySQL 中，SQLite 文件仅用于兼容、迁移或回退场景。

## 后端说明

### `server/index.mjs`

后端入口，使用 Node.js 原生 `http` 模块实现。

职责：

- 监听 `127.0.0.1`，端口来自 `PORT` 环境变量，默认 `8787`。
- 处理 `/api/*` 接口。
- 非 API 请求从 `dist/` 提供静态文件。
- 如果没有构建产物，会返回提示：先执行 `npm run build` 或使用 `npm run dev`。

主要 API：

- `GET /api/state`：读取公开游戏状态。
- `POST /api/reset`：重置存档。
- `POST /api/tasks`：提交现实任务。
- `POST /api/breakthrough`：尝试突破。
- `POST /api/rest`：闭关调息。
- `POST /api/day/advance`：手动推进一天，触发每日结算。
- `POST /api/dungeons/run`：探索副本。
- `POST /api/sect/mission`：执行宗门任务。
- `POST /api/sect/war`：发起宗门战。
- `POST /api/duel`：和 NPC 切磋。
- `POST /api/items/buy`：购买物品。
- `POST /api/items/use`：使用物品。

### `server/storage.mjs`

存储适配层。根据 `STORAGE_DRIVER` 选择后端；当前 `.env` 默认值为 `mysql`，因此开发和启动命令实际加载 `mysqlStore.mjs`。

职责：

- `STORAGE_DRIVER=mysql`：加载 `mysqlStore.mjs`，通过 `mysqlDb.mjs` 的 `mysql2/promise` 连接池访问 MySQL。
- `STORAGE_DRIVER=sqlite`：兼容加载 `store.mjs`，通过 `sql.js` 读写 `data/game.sqlite`。
- 对上层统一导出读取、写入、变更、重置、公开状态和战斗回放接口。

### `server/mysqlDb.mjs` / `server/mysqlStore.mjs` / `server/mysqlStateRepository.mjs`

当前默认的 MySQL 存档层。

职责：

- 初始化并校验 MySQL schema 和连接池。
- 读取、写入、重置账号对应的游戏世界。
- 使用事务、版本号和持久化域（domains）处理增量保存。
- 保存账号、会话、游戏状态、背景任务和战斗回放。
- 调用 `ensureStateShape` 补齐旧状态字段，并调用 `settleIfNeeded` 做跨日结算。

### `server/store.mjs`

SQLite 兼容/迁移存储实现，仅在明确设置 `STORAGE_DRIVER=sqlite` 时使用；不要把它误认为当前默认运行时的数据库实现。

存档表结构：

```sql
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

目前只使用默认存档 ID：`default`。

SQLite 兼容实现仍依赖 `node_modules/sql.js/dist/sql-wasm.wasm`。如果调整 SQLite 回退、迁移或依赖安装方式，要同步检查这里；MySQL 运行路径不依赖该 wasm 文件。

### `server/gameData.mjs`

静态游戏数据。

包含：

- 境界列表 `realms`
- 灵根 `roots`
- 天赋 `talents`
- 宗门名 `sects`
- NPC 名字 `npcNames`
- 副本配置 `dungeons`
- 现实任务模板 `taskTemplates`
- 丹药/物品目录 `itemCatalog`

新增玩法数据时优先放在这里，逻辑计算再放到 `gameLogic.mjs`。

### `server/gameLogic.mjs`

核心游戏规则。

主要内容：

- 默认角色和世界生成：`createDefaultState`
- NPC 完整属性生成：`makeNpc`
- 旧存档结构补齐：`ensureStateShape`
- 战力计算：`powerOf`
- 派生字段：`getPublicState`
- 宗门汇总：`buildSectSummaries`
- 每日结算：`settleIfNeeded` / `dailySettlement`
- 现实任务收益：`addTask`
- 突破逻辑：`attemptBreakthrough`
- 调息、副本、宗门、切磋、买药、用药等行为

公开给前端的状态由 `getPublicState` 生成，其中会附带：

- `catalog`：前端渲染所需的静态目录。
- `derived`：修为需求、玩家战力、下一境界、突破概率、NPC 战力映射和宗门汇总。

当前状态模型比初版更完整：

- 玩家和 NPC 都有 `id`、灵根、天赋、气血、心境、灵石、声望、根骨、悟性、攻伐、守御、机缘、心魔。
- 玩家和 NPC 都记录 `duelWins`、`duelLosses`、`dungeonClears`、`bestDungeonPower`、`bestDungeonName`。
- 玩家和 NPC 都有 `dailyRecords`、`breakthroughs`、`duelHistory`，用于榜单详情页展示成长、突破和切磋明细。
- 宗门状态记录 `warWins` 和 `warLosses`。

每日结算会推进天数、更新 NPC 修为/灵石/心境倾向、记录 NPC 每日成长和突破记录，同时恢复玩家气血与心境，并写入玩家每日记录。自动结算发生在后端读取存档时，手动推进则通过 `/api/day/advance` 触发。

如果新增前端需要展示的派生数据，优先加到 `derived`，避免前端重复实现后端规则。

## 前端说明

### `web/src/main.js`

Vue 应用入口，挂载 `App.vue` 并引入全局样式。

### `web/src/api.js`

轻量 API 封装。

- `getState()`：请求 `/api/state`。
- `postAction(path, body)`：POST 游戏动作。

请求默认使用 JSON，并把非 2xx 响应转成异常。

### `web/src/App.vue`

主界面和主要交互都在这个单文件组件里。

页面包含：

- 顶部品牌区和当前状态摘要。
- 倒计时卡片，显示距离下一次跨日结算的时间。
- “推进一天”按钮，手动调用 `/api/day/advance`。
- “重开一世”按钮，调用 `/api/reset` 重置当前账号对应的 MySQL 存档（SQLite 回退模式下才会操作 `data/game.sqlite`）。
- 左侧角色信息、修为/气血/心境进度条、核心属性。
- 核心属性 hover/focus 提示，解释灵石、声望、根骨、悟性、攻伐、守御、机缘、心魔。
- 右侧 Tab 视图：
  - 修炼
  - 现实任务
  - 副本
  - 宗门
  - 切磋
  - 洞府
  - 榜单

核心交互模式：

- 页面加载时调用 `refresh()` 拉取状态。
- 用户动作统一通过 `act(path, body)` POST 到后端。
- 后端返回完整公开状态后，前端直接替换 `state`。
- 重开一世后会回到“修炼”页，并把榜单详情状态重置为榜单首页。

榜单页包含四个分榜：

- `power`：个人战力。
- `duel`：个人切磋。
- `sect`：宗门战力。
- `dungeon`：副本闯关。

榜单项可点击进入详情：

- 人物详情展示修为、气血、心境、八项属性、每日成长、突破记录、切磋战绩和副本闯关记录。
- 宗门详情展示总战力、成员数、声望、物资、敌意、宗门战绩、成员列表。
- 宗门成员列表里的角色可继续进入人物详情。

注意：`App.vue` 当前有一个本地 `npcPower` 计算函数，用于前端榜单中的 NPC 战力。后端也会返回 `derived.npcPowers`，如果后续要严格统一战力展示，应优先复用后端派生值或保持两边公式同步。

### `web/src/components/Meter.vue`

通用进度条组件，用于修为、气血、心境。

### `web/src/components/LogPanel.vue`

日志面板组件，展示后端写入的事件日志。主界面目前会过滤部分 NPC 突破日志，避免普通修炼日志过于嘈杂。

### `web/src/styles.css`

全局样式。当前视觉风格是温暖纸色、青玉色、金色和朱红色组合，偏文字修仙题材。

样式重点：

- 顶部品牌、山景 hero、快捷操作区。
- 左侧 sticky 角色面板。
- 属性 tooltip。
- 榜单分段按钮。
- 榜单行 hover/focus 说明。
- 人物/宗门详情页布局。
- 详情页滚动记录区。

响应式断点：

- `1040px` 以下：顶部和主布局改为单列，详情属性网格改为三列。
- `720px` 以下：卡片、表单、战斗布局、详情头像区、详情属性、详情进度条等改为单列，Tab 改为两列网格。

## 数据流

1. 前端加载页面，请求 `GET /api/state`。
2. `storage.mjs` 根据 `STORAGE_DRIVER` 选择 `mysqlStore.mjs`（当前默认）或 `store.mjs`（SQLite 兼容模式）。
3. 如果没有存档，`gameLogic.mjs` 生成默认状态并写库。
4. 如果已有旧存档，`ensureStateShape` 补齐新增字段。
5. 如果日期已变化，`settleIfNeeded` 自动推进一天并写库。
6. 后端通过 `getPublicState` 返回状态、静态目录和派生数据。
7. 前端渲染角色、任务、副本、宗门、切磋、洞府、榜单和详情视图。
8. 用户触发动作后，前端 POST 到对应 API。
9. 后端在统一的 `mutateState` 中读取状态、执行游戏逻辑、通过当前存储驱动写回数据库，并返回新状态。
10. 前端用返回的新状态整体刷新页面数据。

## 维护注意事项

- 游戏规则应尽量留在后端 `gameLogic.mjs`，前端只负责展示和发起动作。
- 静态配置应优先放在 `gameData.mjs`，不要散落到组件里。
- 前端不使用浏览器本地存储。当前默认模式下唯一可信存档是 MySQL；只有 `STORAGE_DRIVER=sqlite` 时才以 `data/game.sqlite` 作为存档。
- 新增存档字段时，要同步更新 `createDefaultState` 和 `ensureStateShape`，否则旧存档可能缺字段。
- 增加新 API 时，需要同时更新 `server/index.mjs` 的路由表和前端调用入口。
- 增加新物品时，要检查 `createDefaultState` 中的 `bag` 是否需要默认数量。
- 如果新增榜单维度，通常需要更新 `rankBoards`、`activeRanking` 分发逻辑、对应 ranking computed，以及点击详情的 `kind` 处理。
- 如果新增人物详情字段，优先让后端状态或 `derived` 提供稳定数据，前端只做展示格式化。
- `state.log` 最多保留 80 条，`state.tasks` 最多保留 16 条。
- `dailyRecords` 最多保留 14 条，`breakthroughs` 最多保留 12 条，`duelHistory` 最多保留 20 条。
- 当前没有测试框架；改动核心数值逻辑后，至少手动跑一次 `npm run dev` 或 `npm run build`。
- `npm run build` 是当前最基本的构建验证命令。

## 已知边界

- 当前只支持一个默认存档。
- 每日结算依赖服务器运行环境的本地日期。
- 手动推进一天不会改变真实日期，但会推进游戏内天数并覆盖 `lastSettlementDate` 为当前日期。
- 后端服务只绑定 `127.0.0.1`，默认不是局域网公开服务。
- 生产静态文件来自 `dist/`，没有构建时不能直接用 `npm run start` 提供完整前端页面。
- MySQL 模式部署前需要确保 MySQL 数据库、账号权限和 `.env` 连接配置可用；SQLite 兼容模式仍依赖 `node_modules/sql.js` 的 wasm 文件。
- 宗门汇总中非玩家宗门的声望、物资、敌意和战绩目前由派生逻辑随机生成，刷新状态时可能变化；只有玩家宗门 `云麓盟` 的这些数值来自存档。
- 前端 NPC 战力展示存在本地简化计算，与后端 `powerOf`/`derived.npcPowers` 不完全一致；若要严谨排行，需要统一这一处。
