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
        <button class="secondary" @click="refresh">刷新进度</button>
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
          <div class="stat" v-for="[label, value] in stats" :key="label">
            <b>{{ value }}</b>
            <span>{{ label }}</span>
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
          <LogPanel :logs="state.log" />
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
          <div class="panel">
            <h3>天南小榜</h3>
            <div class="rank-list">
              <div class="row" v-for="(item, index) in ranking" :key="`${item.name}-${item.sect}`">
                <span class="tag">#{{ index + 1 }}</span>
                <div><strong>{{ item.name }}</strong><small>{{ item.sect }} · {{ item.mood }}</small></div>
                <span>{{ realmName(item.realm) }}</span>
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

const state = ref(null);
const loading = ref(true);
const error = ref("");
const activeTab = ref("practice");
const opponentIndex = ref(0);
const countdown = ref("--:--:--");
const taskForm = reactive({ name: "", type: "study", diff: 3 });

const player = computed(() => state.value.player);
const derived = computed(() => state.value.derived);
const catalog = computed(() => state.value.catalog);
const selectedNpc = computed(() => state.value.npcs[opponentIndex.value] || state.value.npcs[0]);

const stats = computed(() => [
  ["灵石", player.value.spirit],
  ["声望", player.value.reputation],
  ["根骨", player.value.body],
  ["悟性", player.value.wisdom],
  ["攻伐", player.value.attack],
  ["守御", player.value.defense],
  ["机缘", player.value.chance],
  ["心魔", player.value.heartDemon]
]);

const ranking = computed(() => {
  const self = { name: player.value.name, sect: "云麓盟", realm: player.value.realm, xp: player.value.xp, mood: "求道" };
  return [self, ...state.value.npcs].sort((a, b) => b.realm - a.realm || b.xp - a.xp);
});

function realmName(index) {
  return catalog.value.realms[Math.min(index, catalog.value.realms.length - 1)];
}

function relationHeat(index) {
  return Math.round(Math.max(0, Math.min(100, state.value.sect.rivalHeat + index * 8 - state.value.sect.reputation / 4)));
}

function relationClass(index) {
  const heat = relationHeat(index);
  return heat > 65 ? "bad" : heat > 35 ? "gold" : "";
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

async function resetGame() {
  if (!confirm("确定重开一世？当前 SQLite 存档会被覆盖。")) return;
  await act("/api/reset");
  activeTab.value = "practice";
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
