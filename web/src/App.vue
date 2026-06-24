<template>
  <div class="app">
    <header class="topbar">
      <section class="brand">
        <div class="sigil" aria-hidden="true">
          <svg viewBox="0 0 64 64" fill="none">
            <path d="M32 5c7 9 9 17 6 24 7-3 14-2 20 4-11 4-18 9-22 16-2 4-4 8-4 10-1-2-2-6-5-10-4-7-11-12-21-16 6-6 13-7 20-4-3-7-1-15 6-24Z" fill="currentColor" opacity=".85"/>
            <circle cx="32" cy="33" r="7" fill="#fff7db"/>
          </svg>
        </div>
        <div>
          <h1>长生札记</h1>
          <p>Vue + SQLite 版单机文字修仙 RPG。现实任务换修为，NPC 每日成长，战斗与突破由后端规则结算。</p>
        </div>
      </section>

      <section class="hero">
        <svg class="mountains" viewBox="0 0 900 260" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 204 90 130l72 49 112-112 88 102 60-48 100 75 111-139 119 135 68-52 80 62v58H0Z" fill="#0f172a" opacity=".58"/>
          <path d="M0 228 135 157l88 56 90-82 121 98 100-65 112 60 92-85 162 89v32H0Z" fill="#23475b" opacity=".75"/>
          <path d="M0 238c130-32 230-28 328 0s178 21 279-2 199-24 293 4v20H0Z" fill="#d8c8a4" opacity=".35"/>
          <circle cx="735" cy="48" r="26" fill="#fef3c7" opacity=".88"/>
        </svg>
        <div class="hero-content">
          <h2>以今日一事，换明日一境。</h2>
          <p>完成现实任务获得修为、心境、气血和灵石。修为足够后尝试突破，心境越稳越不容易失败。</p>
          <div class="pill-grid" v-if="state">
            <span class="pill">第 {{ state.day }} 日</span>
            <span class="pill">当前 {{ realmName(player.realm) }}</span>
            <span class="pill">灵石 {{ player.spirit }}</span>
            <span class="pill">宗门声望 {{ state.sect.reputation }}</span>
          </div>
        </div>
      </section>

      <section class="quick">
        <div class="settlement-card">
          <span>下次自动结算</span>
          <strong>{{ countdown }}</strong>
          <small>每日 00:00 后由后端自动推进一天</small>
        </div>
        <button class="secondary" @click="advanceDay">推进一天</button>
        <button class="danger" @click="resetGame">重开一世</button>
      </section>
    </header>

    <div v-if="loading" class="loading">正在读取洞府玉简...</div>

    <div v-else-if="state" class="layout">
      <aside class="sidebar">
        <section class="avatar">
          <div class="portrait" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <path d="M32 8c8 8 13 18 13 29 0 9-5 17-13 17S19 46 19 37c0-11 5-21 13-29Z" fill="#fff7ed" opacity=".9"/>
              <path d="M21 34c5 2 8 2 11-1 4 3 8 3 12 1" stroke="#0f766e" stroke-width="3" stroke-linecap="round"/>
              <path d="M24 48h16l5 9H19l5-9Z" fill="#f59e0b"/>
            </svg>
          </div>
          <div>
            <div class="name-row">
              <h2>{{ player.name }}</h2>
              <span class="tag">{{ realmName(player.realm) }}</span>
            </div>
            <p>{{ player.root.name }} · {{ player.talent.name }}</p>
          </div>
        </section>

        <Meter label="修为" :value="player.xp" :max="derived.xpNeed" />
        <Meter label="气血" :value="player.hp" :max="player.maxHp" tone="health" />
        <Meter label="心境" :value="player.mind" :max="120" tone="focus" />

        <section class="stats">
          <div
            class="stat"
            v-for="stat in stats"
            :key="stat.label"
            tabindex="0"
            :aria-label="`${stat.label}：${stat.help}`"
          >
            <b>{{ stat.value }}</b>
            <span>{{ stat.label }}</span>
            <small class="stat-tip" role="tooltip">{{ stat.help }}</small>
          </div>
        </section>

        <section class="panel">
          <h3>道途</h3>
          <p>第 {{ state.day }} 日，战力 {{ derived.playerPower }}。心魔 {{ player.heartDemon }}，突破概率约 {{ Math.round(derived.breakChance * 100) }}%。</p>
          <div class="actions">
            <button class="primary" @click="act('/api/breakthrough')">尝试突破</button>
            <button class="secondary" @click="act('/api/rest')">闭关调息</button>
          </div>
        </section>
      </aside>

      <main class="main">
        <nav class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            {{ tab.label }}
          </button>
        </nav>

        <section v-if="activeTab === 'practice'" class="view active">
          <div class="grid">
            <div class="panel">
              <h3>角色设定</h3>
              <p>开局资质会影响修炼速度、突破概率与战斗风格。数据库保存当前唯一存档。</p>
              <div class="pill-grid">
                <span class="pill">{{ player.root.name }}：{{ player.root.note }}</span>
                <span class="pill">{{ player.talent.name }}：{{ player.talent.note }}</span>
                <span class="pill">当前战力：{{ derived.playerPower }}</span>
                <span class="pill">下一境界：{{ derived.nextRealm }}</span>
              </div>
            </div>
            <div class="panel">
              <h3>核心循环</h3>
              <p>记录现实任务获得资源；每日结算由后端根据本地日期自动触发；NPC 成长、宗门局势和战斗结果写入 SQLite。</p>
              <div class="timeline">
                <div class="event">炼气：建立日常任务习惯，积累第一桶灵石。</div>
                <div class="event gold">筑基：副本收益提升，宗门战开始成为主要声望来源。</div>
                <div class="event bad">结丹：NPC 会更快追赶，突破失败惩罚显著提高。</div>
              </div>
            </div>
          </div>
          <LogPanel :logs="mainLogs" />
        </section>

        <section v-if="activeTab === 'tasks'" class="view active">
          <div class="panel">
            <h3>记录今日任务</h3>
            <p>任务提交到后端结算收益，再写入 SQLite 存档。</p>
            <form class="task-form" @submit.prevent="submitTask">
              <label>任务
                <input v-model="taskForm.name" placeholder="例如：跑步 30 分钟">
              </label>
              <label>类型
                <select v-model="taskForm.type">
                  <option value="body">锻炼：气血与根骨</option>
                  <option value="study">学习：悟性与心境</option>
                  <option value="work">工作：修为与灵石</option>
                  <option value="craft">创作：悟性与机缘</option>
                  <option value="discipline">自律：心境与突破</option>
                </select>
              </label>
              <label>难度
                <select v-model.number="taskForm.diff">
                  <option v-for="n in 5" :key="n" :value="n">{{ n }} 星</option>
                </select>
              </label>
              <button class="primary">完成</button>
            </form>
          </div>
          <div class="cards">
            <article class="card" v-for="task in state.tasks" :key="`${task.day}-${task.name}-${task.xp}`">
              <div>
                <h3>{{ task.name }}</h3>
                <p class="meta">第 {{ task.day }} 日 · {{ task.type }} · {{ task.diff }} 星</p>
              </div>
              <span class="tag">+{{ task.xp }} 修为</span>
            </article>
            <div v-if="!state.tasks.length" class="empty">今日还没有记录任务。完成一件小事，也算向长生路迈一步。</div>
          </div>
        </section>

        <section v-if="activeTab === 'dungeon'" class="view active">
          <div class="cards">
            <article class="card" v-for="dungeon in catalog.dungeons" :key="dungeon.id">
              <div>
                <h3>{{ dungeon.name }}</h3>
                <p>{{ dungeon.text }}</p>
                <p class="meta">要求：{{ realmName(dungeon.min) }} · 推荐战力 {{ dungeon.power }}<br>产出：{{ dungeon.reward }}</p>
              </div>
              <button :class="player.realm >= dungeon.min ? 'primary' : 'secondary'" @click="act('/api/dungeons/run', { id: dungeon.id })">探索</button>
            </article>
          </div>
        </section>

        <section v-if="activeTab === 'sect'" class="view active">
          <div class="grid">
            <div class="panel">
              <h3>云麓盟</h3>
              <p>当前声望 {{ state.sect.reputation }}，物资 {{ state.sect.supplies }}，敌对热度 {{ state.sect.rivalHeat }}。</p>
              <div class="actions">
                <button class="primary" @click="act('/api/sect/mission')">接宗门任务</button>
                <button class="secondary" @click="act('/api/sect/war')">发起帮派战</button>
              </div>
            </div>
            <div class="panel">
              <h3>势力关系</h3>
              <div class="timeline">
                <div v-for="(sect, index) in catalog.sects" :key="sect" class="event" :class="relationClass(index)">
                  {{ sect }}：敌意 {{ relationHeat(index) }} / 100
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'arena'" class="view active">
          <div class="panel">
            <h3>人物切磋</h3>
            <p>选择电脑修士进行 PK。胜利可得声望与灵石，失败会损耗气血。</p>
            <div class="battle-line">
              <div class="fighter"><strong>{{ player.name }}</strong><br><small>{{ realmName(player.realm) }} · 战力 {{ derived.playerPower }}</small></div>
              <div class="vs">VS</div>
              <div class="fighter"><strong>{{ selectedNpc.name }}</strong><br><small>{{ realmName(selectedNpc.realm) }} · {{ selectedNpc.sect }} · {{ selectedNpc.mood }}</small></div>
            </div>
            <div class="actions">
              <select v-model.number="opponentIndex">
                <option v-for="(npc, index) in state.npcs" :key="npc.name" :value="index">
                  {{ npc.name }} · {{ realmName(npc.realm) }} · {{ npc.sect }}
                </option>
              </select>
              <button class="primary" @click="act('/api/duel', { index: opponentIndex })">开始切磋</button>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'market'" class="view active">
          <div class="grid">
            <div class="panel">
              <h3>丹房</h3>
              <p>丹药购买和服用都由后端写库，不再依赖浏览器本地存储。</p>
              <div class="actions">
                <button class="secondary" v-for="(item, kind) in catalog.itemCatalog" :key="kind" @click="act('/api/items/buy', { kind })">
                  购{{ item.name }} {{ item.price }} 灵石
                </button>
              </div>
            </div>
            <div class="panel">
              <h3>背包</h3>
              <div class="bag-list">
                <div class="row" v-for="(item, kind) in catalog.itemCatalog" :key="kind">
                  <span class="tag">{{ state.bag[kind] }}</span>
                  <div><strong>{{ item.name }}</strong><small>{{ item.text }}</small></div>
                  <button class="secondary" @click="act('/api/items/use', { kind })">服用</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'rank'" class="view active">
          <div class="panel" v-if="detailView === 'rank'">
            <div class="section-head">
              <h3>天南小榜</h3>
              <div class="segmented">
                <button
                  v-for="board in rankBoards"
                  :key="board.id"
                  class="segment"
                  :class="{ active: activeRankBoard === board.id }"
                  @click="activeRankBoard = board.id"
                >
                  {{ board.label }}
                </button>
              </div>
            </div>
            <div class="rank-list">
              <button
                class="row rank-row"
                v-for="(item, index) in activeRanking"
                :key="`${activeRankBoard}-${item.name}-${item.sect}`"
                type="button"
                :aria-label="`${item.name}：${item.help}`"
                @click="openRankItem(item)"
              >
                <span class="tag">#{{ index + 1 }}</span>
                <div><strong>{{ item.name }}</strong><small>{{ item.subtitle }}</small></div>
                <span>{{ item.value }}</span>
                <small class="rank-tip" role="tooltip">{{ item.help }}</small>
              </button>
            </div>
          </div>

          <div class="panel" v-else-if="detailView === 'person' && selectedPerson">
            <button class="secondary back-button" @click="detailView = 'rank'">返回榜单</button>
            <div class="detail-hero">
              <div class="detail-avatar" :class="{ npc: !selectedPerson.isPlayer }">
                <span>{{ selectedPerson.name.slice(0, 1) }}</span>
              </div>
              <div>
                <h3>{{ selectedPerson.name }}</h3>
                <p>{{ selectedPerson.sect }} · {{ realmName(selectedPerson.realm) }} · {{ selectedPerson.root.name }} · {{ selectedPerson.talent.name }}</p>
                <div class="detail-meters">
                  <Meter label="修为" :value="selectedPerson.xp" :max="personXpNeed(selectedPerson)" />
                  <Meter label="气血" :value="selectedPerson.hp" :max="selectedPerson.maxHp" tone="health" />
                  <Meter label="心境" :value="selectedPerson.mind" :max="120" tone="focus" />
                </div>
              </div>
            </div>

            <div class="detail-grid">
              <div class="detail-box" v-for="[label, value] in personStats(selectedPerson)" :key="label">
                <b>{{ value }}</b>
                <span>{{ label }}</span>
              </div>
            </div>

            <div class="grid detail-sections">
              <div class="panel flat">
                <h3>每日成长</h3>
                <div class="timeline detail-scroll">
                  <div class="event" v-for="record in selectedPerson.dailyRecords" :key="`${record.day}-${record.note}`">
                    第{{ record.day }}日：+{{ record.xp }}修为，+{{ record.spirit }}灵石，{{ dailyChanceText(record) }}，{{ record.note }}
                  </div>
                  <div v-if="!selectedPerson.dailyRecords.length" class="empty">暂无每日成长记录，下一次自动结算后会写入。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>突破记录</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ bad: !record.success, gold: record.success }" v-for="record in selectedPerson.breakthroughs" :key="`${record.day}-${record.from}-${record.to}`">
                    第{{ record.day }}日：{{ record.from }} → {{ record.to }}，{{ record.success ? "成功" : "失败" }}，当时突破率 {{ formatPercent(record.chance) }}
                  </div>
                  <div v-if="!selectedPerson.breakthroughs.length" class="empty">暂无突破记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>切磋战绩</h3>
                <p>{{ selectedPerson.duelWins || 0 }} 胜 {{ selectedPerson.duelLosses || 0 }} 负，切磋评分 {{ (selectedPerson.duelWins || 0) * 3 - (selectedPerson.duelLosses || 0) }}。</p>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ bad: record.result === '负', gold: record.result === '胜' }" v-for="record in selectedPerson.duelHistory" :key="`${record.day}-${record.opponent}-${record.result}`">
                    第{{ record.day }}日：对阵 {{ record.opponent }}，{{ record.result }}，+{{ record.xp || 0 }}修为，+{{ record.spirit || 0 }}灵石<span v-if="record.hpLoss">，气血 -{{ record.hpLoss }}</span>
                  </div>
                  <div v-if="!selectedPerson.duelHistory?.length" class="empty">暂无切磋明细。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>副本闯关</h3>
                <div class="timeline detail-scroll">
                  <div class="event">最高副本：{{ selectedPerson.bestDungeonName || "未入秘境" }}</div>
                  <div class="event">副本评分 {{ selectedPerson.bestDungeonPower || 0 }}</div>
                  <div class="event">累计通关 {{ selectedPerson.dungeonClears || 0 }} 次</div>
                </div>
              </div>
            </div>
          </div>

          <div class="panel" v-else-if="detailView === 'sect' && selectedSect">
            <button class="secondary back-button" @click="detailView = 'rank'">返回榜单</button>
            <div class="section-head">
              <div>
                <h3>{{ selectedSect.name }}</h3>
                <p>总战力 {{ selectedSect.totalPower }} · 掌事 {{ selectedSect.leader }}</p>
              </div>
            </div>
            <div class="detail-grid">
              <div class="detail-box" v-for="[label, value] in sectStats(selectedSect)" :key="label">
                <b>{{ value }}</b>
                <span>{{ label }}</span>
              </div>
            </div>
            <div class="grid detail-sections">
              <div class="panel flat">
                <h3>人物列表</h3>
                <div class="rank-list">
                  <button class="row link-row" v-for="member in sectMembers(selectedSect)" :key="member.id" @click="openPersonById(member.id)">
                    <span class="tag">{{ realmName(member.realm) }}</span>
                    <div><strong>{{ member.name }}</strong><small>{{ member.mood }} · 战力 {{ member.power }}</small></div>
                    <span>{{ member.isPlayer ? "你" : "NPC" }}</span>
                  </button>
                </div>
              </div>
              <div class="panel flat">
                <h3>宗门战绩</h3>
                <p>{{ selectedSect.warWins || 0 }} 胜 {{ selectedSect.warLosses || 0 }} 负。敌对热度 {{ selectedSect.rivalHeat }}，物资 {{ selectedSect.supplies }}，声望 {{ selectedSect.reputation }}。</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div v-if="error" class="toast">{{ error }}</div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from "vue";
import { getState, postAction } from "./api";
import LogPanel from "./components/LogPanel.vue";
import Meter from "./components/Meter.vue";

const tabs = [
  { id: "practice", label: "修炼" },
  { id: "tasks", label: "现实任务" },
  { id: "dungeon", label: "副本" },
  { id: "sect", label: "宗门" },
  { id: "arena", label: "切磋" },
  { id: "market", label: "洞府" },
  { id: "rank", label: "榜单" }
];

const rankBoards = [
  { id: "power", label: "个人战力" },
  { id: "duel", label: "个人切磋" },
  { id: "sect", label: "宗门战力" },
  { id: "dungeon", label: "副本闯关" }
];

const state = ref(null);
const loading = ref(true);
const error = ref("");
const activeTab = ref("practice");
const activeRankBoard = ref("power");
const detailView = ref("rank");
const selectedPersonId = ref("player");
const selectedSectName = ref("");
const opponentIndex = ref(0);
const countdown = ref("--:--:--");
const taskForm = reactive({ name: "", type: "study", diff: 3 });

const player = computed(() => state.value.player);
const derived = computed(() => state.value.derived);
const catalog = computed(() => state.value.catalog);
const selectedNpc = computed(() => state.value.npcs[opponentIndex.value] || state.value.npcs[0]);
const sectSummaries = computed(() => derived.value.sects || []);
const mainLogs = computed(() => state.value.log.filter((entry) => !isNpcBreakthroughLog(entry)));

const stats = computed(() => [
  { label: "灵石", value: player.value.spirit, help: "通用货币，用于购买丹药、后续炼器材料和洞府升级。" },
  { label: "声望", value: player.value.reputation, help: "影响宗门地位、帮派战表现和部分奖励获取。" },
  { label: "根骨", value: player.value.body, help: "提升气血成长、调息恢复，并略微增强战斗承伤能力。" },
  { label: "悟性", value: player.value.wisdom, help: "提高突破成功率，也会增强学习类任务和后续功法理解。" },
  { label: "攻伐", value: player.value.attack, help: "决定副本、PK 和宗门战中的主要输出能力。" },
  { label: "守御", value: player.value.defense, help: "提升综合战力，降低战斗失败时的风险和损耗。" },
  { label: "机缘", value: player.value.chance, help: "影响副本探索收益、稀有事件和后续奇遇概率。" },
  { label: "心魔", value: player.value.heartDemon, help: "越高越不利于突破，失败后会上升，可通过自律任务或清心散降低。" }
]);

function realmName(index) {
  return catalog.value.realms[Math.min(index, catalog.value.realms.length - 1)];
}

function npcPower(npc) {
  return Math.floor(30 + npc.realm * 23 + npc.xp * 0.12 + (npc.mood === "好斗" ? 14 : 0));
}

const cultivators = computed(() => [
  {
    ...player.value,
    name: player.value.name,
    sect: "云麓盟",
    mood: "求道",
    power: derived.value.playerPower,
    isPlayer: true
  },
  ...state.value.npcs.map((npc) => ({ ...npc, power: npcPower(npc), isPlayer: false }))
]);

const selectedPerson = computed(() => cultivators.value.find((item) => item.id === selectedPersonId.value));
const selectedSect = computed(() => sectSummaries.value.find((sect) => sect.name === selectedSectName.value));

const activeRanking = computed(() => {
  if (activeRankBoard.value === "duel") return duelRanking.value;
  if (activeRankBoard.value === "sect") return sectRanking.value;
  if (activeRankBoard.value === "dungeon") return dungeonRanking.value;
  return powerRanking.value;
});

const powerRanking = computed(() => cultivators.value
  .map((item) => ({
    name: item.name,
    id: item.id,
    kind: "person",
    sect: item.sect,
    subtitle: `${item.sect} · ${item.mood} · ${realmName(item.realm)}`,
    value: item.power,
    help: `战力 ${item.power}。境界：${realmName(item.realm)}；修为：${Math.floor(item.xp)}；攻伐 ${item.attack}，守御 ${item.defense}，根骨 ${item.body}，悟性 ${item.wisdom}，机缘 ${item.chance}，心魔 ${item.heartDemon}。`
  }))
  .sort((a, b) => b.value - a.value));

const duelRanking = computed(() => cultivators.value
  .map((item) => {
    const wins = item.duelWins || 0;
    const losses = item.duelLosses || 0;
    return {
      name: item.name,
      id: item.id,
      kind: "person",
      sect: item.sect,
      subtitle: `${item.sect} · ${realmName(item.realm)} · ${wins}胜${losses}负`,
      value: `${wins}胜`,
      score: wins * 3 - losses,
      help: `切磋战绩：${wins}胜${losses}负；切磋评分 ${wins * 3 - losses}。战力 ${item.power}，境界 ${realmName(item.realm)}。`
    };
  })
  .sort((a, b) => b.score - a.score));

const sectRanking = computed(() => sectSummaries.value
  .map((sect) => {
    const members = sectMembers(sect);
    return {
      name: sect.name,
      id: sect.name,
      kind: "sect",
      sect: sect.name,
      subtitle: `${members.length}人 · 最强 ${sect.leader}`,
      value: sect.totalPower,
      help: `宗门总战力 ${sect.totalPower}；成员 ${members.length} 人；最强修士 ${sect.leader}。声望 ${sect.reputation}，物资 ${sect.supplies}，宗门战 ${sect.warWins}胜${sect.warLosses}负。`
    };
  }));

const dungeonRanking = computed(() => cultivators.value
  .map((item) => ({
    name: item.name,
    id: item.id,
    kind: "person",
    sect: item.sect,
    subtitle: `${item.sect} · ${item.bestDungeonName || "未入秘境"} · ${item.dungeonClears || 0}次`,
    value: item.bestDungeonPower || 0,
    help: `最高副本：${item.bestDungeonName || "未入秘境"}；副本评分 ${item.bestDungeonPower || 0}；累计通关 ${item.dungeonClears || 0} 次。机缘越高，探索收益越好。`
  }))
  .sort((a, b) => b.value - a.value));

function relationHeat(index) {
  return Math.round(Math.max(0, Math.min(100, state.value.sect.rivalHeat + index * 8 - state.value.sect.reputation / 4)));
}

function relationClass(index) {
  const heat = relationHeat(index);
  return heat > 65 ? "bad" : heat > 35 ? "gold" : "";
}

function isNpcBreakthroughLog(entry) {
  if (!entry?.text?.includes("突破至")) return false;
  return state.value.npcs.some((npc) => entry.text.includes(`${npc.name}在${npc.sect}`));
}

function formatPercent(value) {
  if (typeof value !== "number") return "未记录";
  return `${Math.round(value * 100)}%`;
}

function dailyChanceText(record) {
  return typeof record.breakChance === "number" ? `突破率 ${formatPercent(record.breakChance)}` : "未尝试突破";
}

function openRankItem(item) {
  if (item.kind === "sect") {
    selectedSectName.value = item.id;
    detailView.value = "sect";
    return;
  }
  selectedPersonId.value = item.id;
  detailView.value = "person";
}

function openPersonById(id) {
  selectedPersonId.value = id;
  detailView.value = "person";
}

function personStats(person) {
  return [
    ["灵石", person.spirit],
    ["声望", person.reputation],
    ["根骨", person.body],
    ["悟性", person.wisdom],
    ["攻伐", person.attack],
    ["守御", person.defense],
    ["机缘", person.chance],
    ["心魔", person.heartDemon]
  ];
}

function personXpNeed(person) {
  return Math.floor(100 * Math.pow(1.34, person.realm || 0));
}

function sectMembers(sect) {
  return Array.isArray(sect?.members) ? sect.members : [];
}

function sectStats(sect) {
  const members = sectMembers(sect);
  return [
    ["总战力", sect.totalPower],
    ["成员", members.length],
    ["声望", sect.reputation],
    ["物资", sect.supplies],
    ["敌意", sect.rivalHeat],
    ["宗门战", `${sect.warWins}胜${sect.warLosses}负`]
  ];
}

function updateCountdown() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  const total = Math.max(0, Math.floor((next - now) / 1000));
  const hours = String(Math.floor(total / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const seconds = String(total % 60).padStart(2, "0");
  countdown.value = `${hours}:${minutes}:${seconds}`;
}

async function refresh() {
  try {
    state.value = await getState();
    error.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function act(path, body) {
  try {
    state.value = await postAction(path, body);
    error.value = "";
  } catch (err) {
    error.value = err.message;
  }
}

async function submitTask() {
  await act("/api/tasks", { ...taskForm });
  taskForm.name = "";
}

async function advanceDay() {
  await act("/api/day/advance");
}

async function resetGame() {
  if (!confirm("确定重开一世？当前 SQLite 存档会被覆盖。")) return;
  await act("/api/reset");
  activeTab.value = "practice";
  detailView.value = "rank";
}

let timer;

onMounted(async () => {
  updateCountdown();
  timer = setInterval(() => {
    updateCountdown();
    if (countdown.value === "00:00:00") refresh();
  }, 1000);
  await refresh();
});

onUnmounted(() => clearInterval(timer));
</script>
