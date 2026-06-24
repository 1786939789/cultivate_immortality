# AGENTS.md

## 项目概览

这是一个名为「长生札记」的单机文字修仙 RPG。核心玩法是把现实任务转化为修为、心境、气血、灵石等游戏资源，再通过突破、副本、宗门、切磋、丹药等系统推动角色成长。

项目采用前后端分离但同仓库部署的结构：

- 前端：Vue 3 + Vite，源码在 `web/`。
- 后端：Node.js 原生 HTTP 服务，源码在 `server/`。
- 存储：`sql.js` 将 SQLite 数据库写入本地文件 `data/game.sqlite`。
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
│   └── game.sqlite
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

注意不要提交本地存档 `data/game.sqlite`，它代表当前机器上的唯一游戏进度。

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
- `POST /api/dungeons/run`：探索副本。
- `POST /api/sect/mission`：执行宗门任务。
- `POST /api/sect/war`：发起宗门战。
- `POST /api/duel`：和 NPC 切磋。
- `POST /api/items/buy`：购买物品。
- `POST /api/items/use`：使用物品。

### `server/store.mjs`

本地存档层。

职责：

- 初始化 `sql.js`。
- 打开或创建 `data/game.sqlite`。
- 创建 `saves` 表。
- 读取、写入、重置默认存档。
- 调用 `settleIfNeeded` 做跨日自动结算。

存档表结构：

```sql
CREATE TABLE IF NOT EXISTS saves (
  id TEXT PRIMARY KEY,
  state_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

目前只使用默认存档 ID：`default`。

注意：`sql.js` 的 wasm 文件路径写死为 `node_modules/sql.js/dist/sql-wasm.wasm`。如果调整依赖安装方式或部署方式，要同步检查这里。

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
- 战力计算：`powerOf`
- 派生字段：`getPublicState`
- 每日结算：`settleIfNeeded` / `dailySettlement`
- 现实任务收益：`addTask`
- 突破逻辑：`attemptBreakthrough`
- 调息、副本、宗门、切磋、买药、用药等行为

公开给前端的状态由 `getPublicState` 生成，其中会附带：

- `catalog`：前端渲染所需的静态目录。
- `derived`：修为需求、战力、下一境界、突破概率。

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
- 左侧角色信息、修为/气血/心境进度条、核心属性。
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
- 重开一世调用 `/api/reset`，会覆盖当前 SQLite 存档。

### `web/src/components/Meter.vue`

通用进度条组件，用于修为、气血、心境。

### `web/src/components/LogPanel.vue`

日志面板组件，展示后端写入的事件日志。

### `web/src/styles.css`

全局样式。当前视觉风格是温暖纸色、青玉色、金色和朱红色组合，偏文字修仙题材。

响应式断点：

- `1040px` 以下：顶部和主布局改为单列。
- `720px` 以下：卡片、表单、战斗布局等改为单列，Tab 改为两列网格。

## 数据流

1. 前端加载页面，请求 `GET /api/state`。
2. `store.mjs` 打开 SQLite 存档。
3. 如果没有存档，`gameLogic.mjs` 生成默认状态并写库。
4. 如果日期已变化，`settleIfNeeded` 自动推进一天并写库。
5. 后端通过 `getPublicState` 返回状态、静态目录和派生数据。
6. 前端渲染角色、任务、副本、宗门、榜单等视图。
7. 用户触发动作后，前端 POST 到对应 API。
8. 后端在 `mutateState` 中读取状态、执行游戏逻辑、写回 SQLite，并返回新状态。

## 维护注意事项

- 游戏规则应尽量留在后端 `gameLogic.mjs`，前端只负责展示和发起动作。
- 静态配置应优先放在 `gameData.mjs`，不要散落到组件里。
- 前端不使用浏览器本地存储，当前唯一可信存档是 `data/game.sqlite`。
- 增加新 API 时，需要同时更新 `server/index.mjs` 的路由表和前端调用入口。
- 增加新物品时，要检查 `createDefaultState` 中的 `bag` 是否需要默认数量。
- `state.log` 最多保留 80 条，`state.tasks` 最多保留 16 条。
- 当前没有测试框架；改动核心数值逻辑后，至少手动跑一次 `npm run dev` 或 `npm run build`。
- `npm run build` 是当前最基本的构建验证命令。

## 已知边界

- 当前只支持一个默认存档。
- 每日结算依赖服务器运行环境的本地日期。
- 后端服务只绑定 `127.0.0.1`，默认不是局域网公开服务。
- 生产静态文件来自 `dist/`，没有构建时不能直接用 `npm run start` 提供完整前端页面。
- SQLite wasm 路径依赖 `node_modules`，部署前需要确保依赖完整安装。

