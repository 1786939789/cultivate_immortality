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
          <p>Vue + SQLite 版单机文字修仙 RPG。现实任务换经验，NPC 每日成长，战斗与突破由后端规则结算。</p>
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
          <p>完成现实任务获得经验、血量、法力和灵石。经验足够后尝试突破，水灵根会提高实际突破率。</p>
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
            <p>{{ player.root.name }}</p>
          </div>
        </section>

        <button class="meter-button" type="button" @click="openProgression" aria-label="查看每一层突破所需经验">
          <Meter label="经验" :value="player.xp" :max="derived.xpNeed" />
        </button>

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
          <p>第 {{ state.day }} 日，战力 {{ derived.playerPower }}。基础突破率 {{ formatPercent(derived.baseBreakChance) }}，当前约 {{ formatPercent(derived.breakChance) }}。</p>
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
              <p>开局资质会影响修炼速度、突破概率与战斗风格；只有水灵根会提高实际突破率。数据库保存当前唯一存档。</p>
              <div class="pill-grid">
                <span class="pill">{{ player.root.name }}：{{ player.root.note }}</span>
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

        <section v-if="activeTab === 'attributes'" class="view active">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>属性说明</h3>
                <p>灵根决定一个固定方向的百分比加成；PK 按回合结算，血量归零即败。</p>
              </div>
              <span class="tag">当前 {{ player.root.name }}</span>
            </div>
            <div class="root-grid">
              <article
                class="root-card"
                v-for="root in catalog.roots"
                :key="root.key"
                :class="{ active: root.key === player.root.key }"
              >
                <strong>{{ root.name }}</strong>
                <span>{{ root.note }}</span>
              </article>
            </div>
          </div>

          <div class="grid">
            <div class="panel">
              <h3>当前灵根</h3>
              <div class="attribute-hero">
                <strong>{{ player.root.name }}</strong>
                <span>{{ player.root.note }}</span>
                <span class="tag">本次加成 {{ formatPercent(player.root.bonus) }}</span>
              </div>
            </div>
            <div class="panel">
              <h3>基础属性</h3>
              <div class="attribute-list">
                <div class="attribute-row">
                  <span>攻击</span>
                  <strong>{{ statWithBonus(derived.effectiveStats.attack, derived.effectiveStats.bonuses.attack) }}</strong>
                  <small>实际伤害按自身攻击减去对方防御结算。</small>
                </div>
                <div class="attribute-row">
                  <span>防御</span>
                  <strong>{{ statWithBonus(derived.effectiveStats.defense, derived.effectiveStats.bonuses.defense) }}</strong>
                  <small>抵扣对方攻击，最低仍会受到少量伤害。</small>
                </div>
                <div class="attribute-row">
                  <span>血量</span>
                  <strong>{{ statWithBonus(derived.effectiveStats.maxHp, derived.effectiveStats.bonuses.maxHp) }}</strong>
                  <small>切磋、副本、宗门战中归零即判负；突破会提高上限。</small>
                </div>
                <div class="attribute-row">
                  <span>神识</span>
                  <strong>{{ statWithBonus(derived.effectiveStats.divineSense, derived.effectiveStats.bonuses.divineSense) }}</strong>
                  <small>神识更高者优先出手，也会获得闪避机会。</small>
                </div>
                <div class="attribute-row">
                  <span>法力</span>
                  <strong>{{ statWithBonus(derived.effectiveStats.maxMana, derived.effectiveStats.bonuses.maxMana) }}</strong>
                  <small>用于释放技能；回合战中每三回合尝试消耗法力加强攻击。</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'progression'" class="view active">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>境界总览</h3>
                <p>先选大境界，再看每一层的经验门槛、基础突破率和按当前角色条件修正后的突破率。</p>
              </div>
              <span class="tag">当前 {{ realmName(player.realm) }}</span>
            </div>

            <div class="realm-stage-picker">
              <button
                v-for="group in groupedRealmProgression"
                :key="group.stage"
                class="realm-stage-button"
                :class="{ active: selectedRealmStage === group.stage, current: group.items.some((realm) => realm.index === player.realm) }"
                type="button"
                @click="selectedRealmStage = group.stage"
              >
                <strong>{{ group.stage }}</strong>
                <span>{{ group.items[0].name }} - {{ group.items[group.items.length - 1].name }}</span>
              </button>
            </div>
          </div>

          <section class="panel realm-stage" v-if="selectedRealmGroup">
            <div class="section-head compact">
              <div>
                <h3>{{ selectedRealmGroup.stage }}十层</h3>
                <p>每层经验满后都要突破，成功后按本层成长范围随机增加属性并写入存档。</p>
              </div>
              <span class="tag">{{ selectedRealmGroup.items[0].name }} - {{ selectedRealmGroup.items[selectedRealmGroup.items.length - 1].name }}</span>
            </div>
            <div class="realm-table-head" aria-hidden="true">
              <span>层级</span>
              <span>突破目标</span>
              <span>所需经验</span>
              <span>突破成长</span>
              <span>基础突破率</span>
            </div>
            <div class="realm-grid">
              <div
                class="realm-row"
                v-for="realm in selectedRealmGroup.items"
                :key="realm.index"
                :class="{ current: realm.index === player.realm, passed: realm.index < player.realm }"
              >
                <div>
                  <strong>{{ realm.name }}</strong>
                  <small>{{ realm.index === player.realm ? "当前所在层" : realm.index < player.realm ? "已突破" : "未抵达" }}</small>
                </div>
                <span>{{ realm.nextRealm }}</span>
                <span>{{ realm.xpNeed }} 经验</span>
                <span>{{ realm.growthText }}</span>
                <span>{{ formatPercent(realm.baseBreakChance) }}</span>
              </div>
            </div>
          </section>
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
                  <option value="body">锻炼：攻击与血量</option>
                  <option value="study">学习：防御与法力</option>
                  <option value="work">工作：经验与灵石</option>
                  <option value="craft">创作：经验与神识</option>
                  <option value="discipline">自律：经验与法力</option>
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
              <span class="tag">+{{ task.xp }} 经验</span>
            </article>
            <div v-if="!state.tasks.length" class="empty">今日还没有记录任务。完成一件小事，也算向长生路迈一步。</div>
          </div>
        </section>

        <section v-if="activeTab === 'skills'" class="view active">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>本命技能</h3>
                <p>每个角色天生随机拥有一个回合战技能，暂时无法更改；战斗中会按法力和冷却自动释放。</p>
              </div>
              <span class="tag">{{ playerSkill.name }} · {{ playerSkill.cost }} 法力</span>
            </div>
            <div class="skill-hero">
              <strong>{{ playerSkill.name }}</strong>
              <span>{{ playerSkill.text }}</span>
              <span class="tag">消耗 {{ playerSkill.cost }} 法力 · 冷却 {{ playerSkill.cooldown }} 回合</span>
            </div>
          </div>

          <div class="skill-grid">
            <article class="skill-card" v-for="skill in combatSkills" :key="skill.id" :class="[skillStyle(skill), { active: skill.id === player.skillId }]">
              <div class="skill-title">
                <strong>{{ skill.name }}</strong>
                <span class="tag">{{ skill.cost }} 法力</span>
              </div>
              <p>{{ skill.text }}</p>
              <small>冷却 {{ skill.cooldown }} 回合</small>
            </article>
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
          <div v-if="!lastBattle" class="panel">
            <h3>人物切磋</h3>
            <p>选择电脑修士进行回合制 PK。神识高者先手并可能闪避，血量归零即败。</p>
            <div class="battle-line">
              <div class="fighter">
                <strong>{{ player.name }}</strong>
                <small>{{ realmName(player.realm) }} · 战力 {{ derived.playerPower }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battlePreviewStats(player)" :key="stat.label">{{ stat.label }} {{ stat.value }}</span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ playerSkill.name }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(player.skillId) }}</span>
                </div>
              </div>
              <div class="vs">VS</div>
              <div class="fighter">
                <strong>{{ selectedNpc.name }}</strong>
                <small>{{ realmName(selectedNpc.realm) }} · {{ selectedNpc.sect }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battlePreviewStats(selectedNpc)" :key="stat.label">{{ stat.label }} {{ stat.value }}</span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(selectedNpc.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(selectedNpc.skillId) }}</span>
                </div>
              </div>
            </div>
            <div class="actions">
              <select v-model.number="opponentIndex">
                <option v-for="(npc, index) in state.npcs" :key="npc.name" :value="index">
                  {{ npc.name }} · {{ realmName(npc.realm) }} · {{ npc.sect }}
                </option>
              </select>
              <button class="primary" @click="startDuel">开始切磋</button>
            </div>
          </div>

          <div v-else class="battle-detail">
            <div class="panel battle-header">
              <div>
                <h3>切磋实况</h3>
                <p>{{ lastBattle.left.name }} 对阵 {{ lastBattle.right.name }}，{{ lastBattle.result === "胜" ? "你胜出了这一场。" : "你败下阵来。" }}</p>
              </div>
              <div class="actions">
                <button class="secondary" @click="replayBattle">重播</button>
                <button class="primary" @click="lastBattle = null">返回切磋</button>
              </div>
            </div>

            <div class="battle-line live">
              <div class="fighter">
                <strong>{{ lastBattle.left.name }}</strong>
                <small>{{ realmName(lastBattle.left.realm) }} · 战力 {{ lastBattle.left.power }}</small>
                <div class="battle-stats">
                  <span>攻击 {{ lastBattle.left.stats.attack }}</span>
                  <span>防御 {{ lastBattle.left.stats.defense }}</span>
                  <span>神识 {{ lastBattle.left.stats.divineSense }}</span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(lastBattle.left.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left.skillId) }}</span>
                </div>
                <Meter label="血量" :value="currentBattleFrame.leftHp" :max="lastBattle.left.startHp" tone="health" />
                <Meter label="法力" :value="currentBattleFrame.leftMana" :max="lastBattle.left.startMana" tone="focus" />
              </div>
              <div class="vs">{{ lastBattle.result }}</div>
              <div class="fighter">
                <strong>{{ lastBattle.right.name }}</strong>
                <small>{{ realmName(lastBattle.right.realm) }} · 战力 {{ lastBattle.right.power }}</small>
                <div class="battle-stats">
                  <span>攻击 {{ lastBattle.right.stats.attack }}</span>
                  <span>防御 {{ lastBattle.right.stats.defense }}</span>
                  <span>神识 {{ lastBattle.right.stats.divineSense }}</span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(lastBattle.right.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right.skillId) }}</span>
                </div>
                <Meter label="血量" :value="currentBattleFrame.rightHp" :max="lastBattle.right.startHp" tone="health" />
                <Meter label="法力" :value="currentBattleFrame.rightMana" :max="lastBattle.right.startMana" tone="focus" />
              </div>
            </div>

            <div class="panel">
              <div class="battle-summary">
                <span class="tag">奖励：+{{ lastBattle.reward.xp }} 经验</span>
                <span class="tag" v-if="lastBattle.reward.spirit">+{{ lastBattle.reward.spirit }} 灵石</span>
                <span class="tag">切磋结束后血量与法力已恢复</span>
              </div>
              <div class="battle-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind, skillEffectClass(event)]"
                >
                  <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                    <i></i>
                    <b>{{ skillEffectTitle(event) }}</b>
                  </div>
                  <span>{{ event.round ? `第${event.round}回合` : "战报" }}</span>
                  <p>{{ event.text }}</p>
                </div>
              </div>
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
                <p>{{ selectedPerson.sect }} · {{ realmName(selectedPerson.realm) }} · {{ rootSummary(selectedPerson.root) }}</p>
                <span class="tag">本命技能：{{ skillName(selectedPerson.skillId) }}</span>
                <div class="detail-meters">
                  <Meter label="经验" :value="selectedPerson.xp" :max="personXpNeed(selectedPerson)" />
                </div>
              </div>
            </div>

            <div class="detail-grid">
              <div
                class="detail-box"
                v-for="item in personStats(selectedPerson)"
                :key="item.label"
                tabindex="0"
                :aria-label="item.help ? `${item.label}：${item.help}` : undefined"
              >
                <b>{{ item.value }}</b>
                <span>{{ item.label }}</span>
                <small v-if="item.help" class="detail-tip" role="tooltip">{{ item.help }}</small>
              </div>
            </div>

            <div class="grid detail-sections">
              <div class="panel flat">
                <h3>每日成长</h3>
                <div class="timeline detail-scroll">
                  <div class="event" v-for="record in selectedPerson.dailyRecords" :key="`${record.day}-${record.note}`">
                    第{{ record.day }}日：+{{ record.xp }}经验，+{{ record.spirit }}灵石，{{ dailyChanceText(record) }}，{{ record.note }}
                  </div>
                  <div v-if="!selectedPerson.dailyRecords.length" class="empty">暂无每日成长记录，下一次自动结算后会写入。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>突破记录</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ bad: !record.success, gold: record.success }" v-for="record in selectedPerson.breakthroughs" :key="`${record.day}-${record.from}-${record.to}`">
                    第{{ record.day }}日：{{ record.from }} → {{ record.to }}，{{ record.success ? "成功" : "失败" }}，当时突破率 {{ formatPercent(record.chance) }}<span v-if="record.growth">，{{ growthText(record.growth) }}</span>
                  </div>
                  <div v-if="!selectedPerson.breakthroughs.length" class="empty">暂无突破记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>切磋战绩</h3>
                <p>{{ selectedPerson.duelWins || 0 }} 胜 {{ selectedPerson.duelLosses || 0 }} 负。</p>
                <div class="timeline detail-scroll">
                  <button
                    class="event duel-record"
                    :class="{ bad: record.result === '负', gold: record.result === '胜', replayable: record.replay }"
                    v-for="record in selectedPerson.duelHistory"
                    :key="`${record.foughtAt || record.day}-${record.opponent}-${record.result}`"
                    type="button"
                    :disabled="!record.replay"
                    @click="openDuelReplay(record)"
                  >
                    <strong>{{ record.foughtAt || `第${record.day}日` }}</strong>
                    <span>对阵 {{ record.opponent }}，{{ record.result }}，+{{ record.xp || 0 }}经验<span v-if="record.spirit">，+{{ record.spirit }}灵石</span></span>
                  </button>
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
  { id: "attributes", label: "属性" },
  { id: "progression", label: "境界" },
  { id: "skills", label: "技能" },
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
const selectedRealmStage = ref("");
const opponentIndex = ref(0);
const lastBattle = ref(null);
const battleCursor = ref(0);
const countdown = ref("--:--:--");
const taskForm = reactive({ name: "", type: "study", diff: 3 });
const fallbackSkill = {
  id: "basic_strike",
  name: "凝气一击",
  cost: 0,
  cooldown: 0,
  text: "技能目录尚未加载时使用的基础攻击。"
};

const player = computed(() => state.value.player);
const derived = computed(() => state.value.derived);
const catalog = computed(() => state.value.catalog);
const combatSkills = computed(() => catalog.value.combatSkills?.length ? catalog.value.combatSkills : [fallbackSkill]);
const selectedNpc = computed(() => state.value.npcs[opponentIndex.value] || state.value.npcs[0]);
const playerSkill = computed(() => skillById(player.value.skillId));
const sectSummaries = computed(() => derived.value.sects || []);
const mainLogs = computed(() => state.value.log.filter((entry) => !isNpcBreakthroughLog(entry)));
const visibleBattleEvents = computed(() => lastBattle.value?.events.slice(0, battleCursor.value) || []);
const displayedBattleEvents = computed(() => [...visibleBattleEvents.value].reverse());
const currentBattleFrame = computed(() => {
  const battle = lastBattle.value;
  if (!battle) return { leftHp: 0, rightHp: 0, leftMana: 0, rightMana: 0 };
  const latest = [...visibleBattleEvents.value].reverse().find((event) => typeof event.leftHp === "number");
  return {
    leftHp: latest?.leftHp ?? battle.left.startHp,
    rightHp: latest?.rightHp ?? battle.right.startHp,
    leftMana: latest?.leftMana ?? battle.left.startMana,
    rightMana: latest?.rightMana ?? battle.right.startMana
  };
});
const groupedRealmProgression = computed(() => {
  const groups = new Map();
  for (const realm of derived.value.realmProgression || []) {
    if (!groups.has(realm.stage)) groups.set(realm.stage, []);
    groups.get(realm.stage).push(realm);
  }
  return [...groups.entries()].map(([stage, items]) => ({ stage, items }));
});
const selectedRealmGroup = computed(() => {
  const groups = groupedRealmProgression.value;
  const fallback = groups.find((group) => group.items.some((realm) => realm.index === player.value.realm)) || groups[0];
  return groups.find((group) => group.stage === selectedRealmStage.value) || fallback;
});
const powerFormula = computed(() => {
  const effective = derived.value.effectiveStats;
  return `战斗力 = 攻击×2.8 + 防御×2 + 血量×0.42 + 神识×1.35 + 法力×0.55。当前为 ${effective.attack}×2.8 + ${effective.defense}×2 + ${effective.maxHp}×0.42 + ${effective.divineSense}×1.35 + ${effective.maxMana}×0.55。`;
});

const stats = computed(() => [
  { label: "战斗力", value: derived.value.playerPower, help: powerFormula.value },
  { label: "血量", value: statWithBonus(derived.value.effectiveStats.maxHp, derived.value.effectiveStats.bonuses.maxHp), help: "切磋、副本、宗门战中归零即判负。" },
  { label: "攻击", value: statWithBonus(derived.value.effectiveStats.attack, derived.value.effectiveStats.bonuses.attack), help: "实际伤害按自身攻击减去对方防御结算。" },
  { label: "防御", value: statWithBonus(derived.value.effectiveStats.defense, derived.value.effectiveStats.bonuses.defense), help: "抵扣对方攻击，最低仍会受到少量伤害。" },
  { label: "神识", value: statWithBonus(derived.value.effectiveStats.divineSense, derived.value.effectiveStats.bonuses.divineSense), help: "神识更高者优先出手，也会获得闪避机会。" },
  { label: "法力", value: statWithBonus(derived.value.effectiveStats.maxMana, derived.value.effectiveStats.bonuses.maxMana), help: "用于释放技能，回合战中消耗法力加强攻击。" }
]);

function realmName(index) {
  return catalog.value.realms[Math.min(index, catalog.value.realms.length - 1)];
}

function skillById(id) {
  return combatSkills.value.find((skill) => skill.id === id) || combatSkills.value[0];
}

function skillName(id) {
  return skillById(id).name;
}

function skillTip(id) {
  const skill = skillById(id);
  return `${skill.name}：消耗 ${skill.cost} 法力，冷却 ${skill.cooldown} 回合。${skill.text}`;
}

function skillStyle(skill) {
  if (skill.cost >= 28) return "legendary";
  if (skill.cost >= 22) return "rare";
  return "common";
}

function skillForEvent(event) {
  return combatSkills.value.find((skill) => skill.name === event.skill) || null;
}

function skillEffectClass(event) {
  const skill = skillForEvent(event);
  if (!skill) return "";
  const effectMap = {
    double: "skill-sword",
    multi: "skill-sword",
    pierce: "skill-thunder",
    heavy: "skill-star",
    speedStrike: "skill-wind",
    manaBurn: "skill-soul",
    weaken: "skill-ice",
    execute: "skill-demon",
    lifesteal: "skill-blood",
    dotStrike: "skill-fire",
    stun: "skill-light",
    dodge: "skill-shadow",
    dot: "skill-poison",
    shield: "skill-shield",
    defenseBuff: "skill-shield",
    heal: "skill-heal",
    evasionBuff: "skill-shadow",
    reflect: "skill-water",
    field: "skill-field"
  };
  return effectMap[skill.type] || "skill-light";
}

function skillEffectTitle(event) {
  const skill = skillForEvent(event);
  if (!skill) return event.skill || "技能";
  if (["shield", "defenseBuff", "reflect", "heal", "evasionBuff", "dodge", "field"].includes(skill.type)) {
    return `${skill.name} · 灵光护身`;
  }
  return `${skill.name} · 术法爆发`;
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
  ...state.value.npcs.map((npc) => ({ ...npc, power: personPower({ ...npc, isPlayer: false }), isPlayer: false }))
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
    help: `战力 ${item.power}。境界：${realmName(item.realm)}；经验：${Math.floor(item.xp)}；灵根 ${item.root.name}；攻击 ${personEffectiveStats(item).attack}，防御 ${personEffectiveStats(item).defense}，神识 ${personEffectiveStats(item).divineSense}，法力 ${personEffectiveStats(item).maxMana}。`
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
      help: `切磋战绩：${wins}胜${losses}负。战力 ${item.power}，境界 ${realmName(item.realm)}。`
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
    help: `最高副本：${item.bestDungeonName || "未入秘境"}；副本评分 ${item.bestDungeonPower || 0}；累计通关 ${item.dungeonClears || 0} 次。`
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

function openProgression() {
  selectedRealmStage.value = derived.value.currentRealmInfo?.stage || selectedRealmStage.value;
  activeTab.value = "progression";
}

function personStats(person) {
  const effective = personEffectiveStats(person);
  const power = personPower(person);
  return [
    { label: "突破概率", value: formatPercent(personBreakthroughChance(person)) },
    { label: "血量", value: statWithBonus(effective.maxHp, effective.bonuses.maxHp) },
    { label: "法力", value: statWithBonus(effective.maxMana, effective.bonuses.maxMana) },
    { label: "攻击", value: statWithBonus(effective.attack, effective.bonuses.attack) },
    { label: "防御", value: statWithBonus(effective.defense, effective.bonuses.defense) },
    { label: "神识", value: statWithBonus(effective.divineSense, effective.bonuses.divineSense) },
    { label: "技能", value: skillName(person.skillId) },
    { label: "战斗力", value: power, help: personPowerFormula(person, effective, power) }
  ];
}

function battlePreviewStats(person) {
  const effective = personEffectiveStats(person);
  return [
    { label: "攻击", value: statWithBonus(effective.attack, effective.bonuses.attack) },
    { label: "防御", value: statWithBonus(effective.defense, effective.bonuses.defense) },
    { label: "神识", value: statWithBonus(effective.divineSense, effective.bonuses.divineSense) }
  ];
}

function personPower(person) {
  if (person.isPlayer) return derived.value.playerPower;
  return derived.value.npcPowers?.[person.id] ?? powerFromEffectiveStats(personEffectiveStats(person));
}

function powerFromEffectiveStats(effective) {
  return Math.floor(
    effective.attack * 2.8 +
    effective.defense * 2 +
    effective.maxHp * 0.42 +
    effective.divineSense * 1.35 +
    effective.maxMana * 0.55
  );
}

function personPowerFormula(person, effective, power = personPower(person)) {
  return `战斗力 = 攻击×2.8 + 防御×2 + 血量×0.42 + 神识×1.35 + 法力×0.55。当前为 ${effective.attack}×2.8 + ${effective.defense}×2 + ${effective.maxHp}×0.42 + ${effective.divineSense}×1.35 + ${effective.maxMana}×0.55 = ${power}。`;
}

function rootSummary(root) {
  return `${root.name}，${root.note} 本次加成 ${formatPercent(rootBonus(root))}`;
}

function personBreakthroughChance(person) {
  const base = baseBreakthroughChance(person.realm || 0);
  const rootMultiplier = person.root?.effect === "xp" ? person.root.breakMultiplier || 1.1 : 1;
  return Math.max(0.05, Math.min(0.95, base * rootMultiplier));
}

function baseBreakthroughChance(realm) {
  const safeRealm = realm || 0;
  const stageIndex = Math.floor(safeRealm / 10);
  const level = (safeRealm % 10) + 1;
  const levelPenalty = (level - 1) * 0.018;
  const stagePenalty = stageIndex * 0.045;
  const bottleneckPenalty = level === 10 ? 0.12 + stageIndex * 0.012 : 0;
  return Math.max(0.08, Math.min(0.9, 0.86 - levelPenalty - stagePenalty - bottleneckPenalty));
}

function rootBonus(root, fallback = 0) {
  return typeof root?.bonus === "number" ? root.bonus : fallback;
}

function personEffectiveStats(person) {
  const attackBonus = person.root?.effect === "attack" ? rootBonus(person.root) : 0;
  const defenseBonus = person.root?.effect === "defense" ? rootBonus(person.root) : 0;
  const hpBonus = person.root?.effect === "hp" ? rootBonus(person.root) : 0;
  const divineSenseBonus = person.root?.effect === "divineSense" ? rootBonus(person.root) : 0;
  const manaBonus = person.root?.effect === "mana" ? rootBonus(person.root) : 0;
  const attack = Math.floor((person.attack || 0) * (1 + attackBonus));
  const defense = Math.floor((person.defense || 0) * (1 + defenseBonus));
  const maxHp = Math.floor((person.maxHp || 0) * (1 + hpBonus));
  const divineSense = Math.floor((person.divineSense || 0) * (1 + divineSenseBonus));
  const maxMana = Math.floor((person.maxMana || 0) * (1 + manaBonus));
  return {
    attack,
    defense,
    maxHp,
    divineSense,
    maxMana,
    bonuses: {
      attack: attack - (person.attack || 0),
      defense: defense - (person.defense || 0),
      maxHp: maxHp - (person.maxHp || 0),
      divineSense: divineSense - (person.divineSense || 0),
      maxMana: maxMana - (person.maxMana || 0)
    }
  };
}

function statWithBonus(total, bonus = 0) {
  return bonus > 0 ? `${total}（+${bonus}）` : `${total}`;
}

function growthText(growth) {
  if (!growth) return "";
  return `成长：血量 +${growth.maxHp || 0}，攻击 +${growth.attack || 0}，防御 +${growth.defense || 0}，神识 +${growth.divineSense || 0}，法力 +${growth.maxMana || 0}`;
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
    if (!selectedRealmStage.value) {
      selectedRealmStage.value = derived.value.currentRealmInfo?.stage || groupedRealmProgression.value[0]?.stage || "";
    }
    error.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function act(path, body) {
  try {
    const response = await postAction(path, body);
    state.value = response.state || response;
    error.value = "";
    return response.result;
  } catch (err) {
    error.value = err.message;
    return null;
  }
}

function playBattle() {
  clearInterval(battleTimer);
  battleCursor.value = 0;
  const total = lastBattle.value?.events.length || 0;
  if (!total) return;
  battleTimer = setInterval(() => {
    battleCursor.value += 1;
    if (battleCursor.value >= total) clearInterval(battleTimer);
  }, 680);
}

function replayBattle() {
  playBattle();
}

function openDuelReplay(record) {
  if (!record?.replay) return;
  lastBattle.value = record.replay;
  activeTab.value = "arena";
  detailView.value = "rank";
  playBattle();
}

async function startDuel() {
  const result = await act("/api/duel", { index: opponentIndex.value });
  if (!result) return;
  lastBattle.value = result;
  playBattle();
}

async function submitTask() {
  await act("/api/tasks", { ...taskForm });
  taskForm.name = "";
}

async function advanceDay() {
  await act("/api/day/advance");
}

async function resetGame() {
  if (!confirm("确定重开一世？将删除当前主角、NPC、切磋、宗门等存档数据，并重新生成。")) return;
  await act("/api/reset");
  activeTab.value = "practice";
  detailView.value = "rank";
  selectedRealmStage.value = derived.value.currentRealmInfo?.stage || "";
}

let timer;
let battleTimer;

onMounted(async () => {
  updateCountdown();
  timer = setInterval(() => {
    updateCountdown();
    if (countdown.value === "00:00:00") refresh();
  }, 1000);
  await refresh();
});

onUnmounted(() => {
  clearInterval(timer);
  clearInterval(battleTimer);
});
</script>
