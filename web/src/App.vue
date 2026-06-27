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
          <CharacterPortrait :person="{ ...player, isPlayer: true }" size="xl" />
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
          <p>{{ currentDate }}，战力 {{ derived.playerPower }}。基础突破率 {{ formatPercent(derived.baseBreakChance) }}，当前约 {{ formatPercent(derived.breakChance) }}。</p>
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
                <p class="meta">{{ displayDate(task) }} · {{ task.type }} · {{ task.diff }} 星</p>
              </div>
              <span class="tag">+{{ task.xp }} 经验</span>
            </article>
            <div v-if="!state.tasks.length" class="empty">{{ currentDate }} 还没有记录任务。完成一件小事，也算向长生路迈一步。</div>
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
          <div class="panel section-head compact">
            <div>
              <h3>宗门疆域</h3>
              <p>各宗门每日会随机攻打一处省级行政区；无主之地直接占领，有主之地按守城者车轮战结算。</p>
            </div>
            <span class="tag">{{ occupiedProvinceCount }} / {{ provinceTerritories.length }} 已占领</span>
          </div>

          <div class="subtabs">
            <button
              v-for="tab in sectSubTabs"
              :key="tab.id"
              type="button"
              class="segment"
              :class="{ active: activeSectSubTab === tab.id }"
              @click="activeSectSubTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeSectSubTab === 'map'" class="panel map-panel">
            <div class="map-shell">
              <div class="map-toolbar">
                <span>中国省级行政区宗门占领图</span>
                <button class="secondary map-fullscreen-button" type="button" @click="openMapFullscreen">全屏</button>
              </div>
              <div ref="normalMapMount" class="map-normal-mount">
                <div ref="chinaMapRef" class="china-map" role="img" aria-label="中国省级行政区宗门占领图"></div>
              </div>
              <div class="province-legend">
                <span
                  v-for="sect in sectSummaries"
                  :key="sect.name"
                  tabindex="0"
                  :class="{ active: hoveredMapSect === sect.name }"
                  @mouseenter="hoverMapSect(sect.name)"
                  @mouseleave="hoverMapSect('')"
                  @focus="hoverMapSect(sect.name)"
                  @blur="hoverMapSect('')"
                >
                  <i :style="{ background: sectColor(sect.name) }"></i>{{ sect.name }}
                </span>
                <span><i></i>无主</span>
              </div>
            </div>
          </div>

          <div v-else-if="activeSectSubTab === 'sects'" class="panel">
            <h3>宗门占领排行</h3>
            <div class="sect-territory-list">
              <article v-for="sect in sectTerritoryRanking" :key="sect.name" class="sect-territory-card" :style="{ '--sect-color': sectColor(sect.name) }">
                <div class="sect-territory-rank">
                  <strong>{{ sect.name }}</strong>
                  <span>{{ sect.provinceCount }} 省</span>
                </div>
                <div class="territory-stats compact">
                  <span>
                    <small>每日灵石</small>
                    <strong>+{{ sect.spirit }}</strong>
                    <em>{{ bonusItemsText(sect.spiritItems, "spirit") }}</em>
                  </span>
                  <span>
                    <small>经验加成</small>
                    <strong>+{{ Math.round(sect.xp * 100) }}%</strong>
                    <em>{{ bonusItemsText(sect.xpItems, "xp") }}</em>
                  </span>
                  <span>
                    <small>突破加成</small>
                    <strong>+{{ Math.round(sect.breakthrough * 100) }}%</strong>
                    <em>{{ bonusItemsText(sect.breakthroughItems, "breakthrough") }}</em>
                  </span>
                </div>
                <p>{{ sect.provinceNames.join("、") || "暂无占领省份" }}</p>
              </article>
            </div>
          </div>

          <div v-else-if="activeSectSubTab === 'provinces'" class="panel">
            <h3>省份资源排行</h3>
            <div class="province-table">
              <div class="province-table-head">
                <span>省份</span>
                <span>GDP档位</span>
                <span>加成</span>
                <span>占领宗门</span>
                <span>守城人员</span>
              </div>
              <div v-for="territory in provinceResourceRanking" :key="territory.id" class="province-table-row" :style="{ '--sect-color': sectColor(territory.owner) }">
                <strong>{{ territory.name }}</strong>
                <span>{{ territory.rank }}</span>
                <span>{{ territory.effect.text }}</span>
                <span>{{ territory.owner || "无主之地" }}</span>
                <span class="defender-stack" v-if="defendersFor(territory).length">
                  <span v-for="defender in defendersFor(territory)" :key="`${territory.id}-${defender.id}`" class="defender-chip">
                    <CharacterPortrait :person="defender" size="xs" />
                    {{ defender.name }}
                  </span>
                </span>
                <span v-else>未派驻</span>
              </div>
            </div>
          </div>

          <div v-else-if="lastBattle" class="battle-detail">
            <div class="panel battle-header">
              <div>
                <h3>攻城实况</h3>
                <p>{{ lastBattle.left.name }} 对阵 {{ lastBattle.right.name }}，{{ battleStatusText }}</p>
              </div>
              <div class="actions">
                <button class="secondary" @click="replayBattle">重播</button>
                <button class="primary" @click="lastBattle = null">返回攻城记录</button>
              </div>
            </div>

            <div class="battle-line live">
              <div class="fighter">
                <CharacterPortrait :person="battlePerson(lastBattle.left)" size="lg" />
                <strong>{{ lastBattle.left.name }}</strong>
                <small>{{ realmName(lastBattle.left.realm) }} · 战力 {{ lastBattle.left.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.left.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(lastBattle.left.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left.skillId) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="lastBattle.left.startHp" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="lastBattle.left.startMana" tone="focus" />
              </div>
              <div class="vs">{{ battleOutcomeLabel }}</div>
              <div class="fighter">
                <CharacterPortrait :person="battlePerson(lastBattle.right)" size="lg" />
                <strong>{{ lastBattle.right.name }}</strong>
                <small>{{ realmName(lastBattle.right.realm) }} · 战力 {{ lastBattle.right.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.right.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(lastBattle.right.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right.skillId) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="lastBattle.right.startHp" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="lastBattle.right.startMana" tone="focus" />
              </div>
            </div>

            <div class="panel">
              <div class="battle-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind, skillEffectClass(event)]"
                >
                  <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                    <i>
                      <span>{{ skillEffectGlyph(event) }}</span>
                    </i>
                    <b>{{ skillEffectTitle(event) }}</b>
                  </div>
                  <span>{{ event.round ? `第${event.round}回合` : "战报" }}</span>
                  <p>{{ event.text }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="selectedProvinceWar" class="panel">
            <div class="section-head compact">
              <div>
                <h3>{{ selectedProvinceWar.provinceName }} 攻城详情</h3>
                <p>{{ selectedProvinceWar.result }}。点击下方单场 PK 可看回放。</p>
              </div>
              <button class="primary" type="button" @click="closeProvinceWarDetail">返回今日总览</button>
            </div>

            <div class="war-day-card captured-detail" :class="{ captured: selectedProvinceWar.captured }">
              <div class="war-day-title">
                <div>
                  <strong>{{ selectedProvinceWar.attacker }} 攻 {{ selectedProvinceWar.defender }}</strong>
                  <small>{{ selectedProvinceWar.provinceName }} · {{ selectedProvinceWar.battles.length }} 场 PK</small>
                </div>
                <span class="tag">{{ selectedProvinceWar.captured ? "易主" : "守住" }}</span>
              </div>
              <div class="war-killboards">
                <div class="war-killboard">
                  <strong>{{ selectedProvinceWar.attacker }} 击杀</strong>
                  <div v-if="warKillRanking(selectedProvinceWar, 'attacker').length" class="war-kill-list">
                    <span v-for="item in warKillRanking(selectedProvinceWar, 'attacker')" :key="`${selectedProvinceWar.id}-atk-kill-${item.id || item.name}`">
                      {{ item.name }} <b>{{ item.kills }}</b>
                    </span>
                  </div>
                  <small v-else>无人破阵</small>
                </div>
                <div class="war-killboard">
                  <strong>{{ selectedProvinceWar.defender }} 击杀</strong>
                  <div v-if="warKillRanking(selectedProvinceWar, 'defender').length" class="war-kill-list">
                    <span v-for="item in warKillRanking(selectedProvinceWar, 'defender')" :key="`${selectedProvinceWar.id}-def-kill-${item.id || item.name}`">
                      {{ item.name }} <b>{{ item.kills }}</b>
                    </span>
                  </div>
                  <small v-else>无人斩敌</small>
                </div>
              </div>
              <div class="war-battle-grid" v-if="selectedProvinceWar.battles.length">
                <button class="war-battle-link" v-for="battle in selectedProvinceWar.battles" :key="`${selectedProvinceWar.id}-${battle.order}`" type="button" @click="openProvinceBattle(battle)">
                  <span class="war-battle-order">第 {{ battle.order }} 战</span>
                  <strong class="war-battle-name left">{{ battleName(battle, "attacker") }}</strong>
                  <span class="war-battle-vs">VS</span>
                  <strong class="war-battle-name right">{{ battleName(battle, "defender") }}</strong>
                  <small class="war-battle-summary">胜者：{{ battle.winnerName || battleWinnerName(battle) }}</small>
                </button>
              </div>
              <small v-else>无主之地直接占领。</small>
            </div>
          </div>

          <div v-else class="panel">
            <div class="section-head compact">
              <div>
                <h3>每日攻城记录</h3>
                <p v-if="selectedProvinceWarDayRecord">共 {{ selectedProvinceWarDayRecord.wars.length }} 场攻守，点击对战图查看每一场 PK。</p>
                <p v-else>这个日期还没有攻城记录。</p>
              </div>
              <div class="arena-toolbar compact">
                <button class="secondary" type="button" @click="changeProvinceWarDay(-1)">前一天</button>
                <label>查看日期
                  <select v-model.number="selectedProvinceWarDay">
                    <option v-for="option in provinceWarDateOptions" :key="option.day" :value="option.day">{{ option.date }}</option>
                  </select>
                </label>
                <label class="war-search">搜索省份 / 宗门
                  <span class="search-field">
                    <input v-model.trim="provinceWarSearch" type="search" placeholder="例如：贵州、黄枫谷、妙音门">
                    <button v-if="provinceWarSearch" class="search-clear" type="button" aria-label="清空攻城记录搜索" @click="provinceWarSearch = ''">×</button>
                  </span>
                </label>
                <button class="secondary" type="button" :disabled="selectedProvinceWarDay >= state.day" @click="changeProvinceWarDay(1)">后一天</button>
              </div>
            </div>

            <div class="war-day-list" v-if="selectedProvinceWarDayRecord">
              <button v-for="war in filteredProvinceWars" :key="war.id" class="war-matchup-card" :class="{ captured: war.captured }" type="button" @click="openProvinceWarDetail(war)">
                <div class="war-matchup-head">
                  <div>
                    <strong>{{ war.provinceName }}</strong>
                    <small>{{ war.attacker }} 攻 {{ war.defender }}</small>
                  </div>
                  <span class="tag">{{ war.captured ? "易主" : "守住" }}</span>
                </div>

                <div class="war-lineup" v-if="war.battles.length">
                  <div class="war-team">
                    <span class="war-team-name">{{ war.attacker }}</span>
                    <div class="war-team-row">
                      <div v-for="member in warTeam(war, 'attacker')" :key="`${war.id}-attacker-${member.id || member.name}`" class="war-roster-card">
                        <CharacterPortrait :person="battlePerson(member)" size="sm" />
                        <strong>{{ member.name }}</strong>
                        <small>{{ realmName(member.realm) }}</small>
                      </div>
                    </div>
                  </div>
                  <div class="war-lineup-vs">
                    <strong>VS</strong>
                    <span>{{ war.battles.length }} 场</span>
                  </div>
                  <div class="war-team">
                    <span class="war-team-name">{{ war.defender }}</span>
                    <div class="war-team-row">
                      <div v-for="member in warTeam(war, 'defender')" :key="`${war.id}-defender-${member.id || member.name}`" class="war-roster-card">
                        <CharacterPortrait :person="battlePerson(member)" size="sm" />
                        <strong>{{ member.name }}</strong>
                        <small>{{ realmName(member.realm) }}</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="war-direct-capture">
                  无主之地直接占领
                </div>

                <p>{{ war.result }}</p>
              </button>
              <div v-if="!filteredProvinceWars.length" class="empty">没有匹配“{{ provinceWarSearch }}”的省份或宗门。</div>
            </div>
            <div v-else class="empty">没有找到 {{ selectedProvinceWarDate }} 的攻城记录。</div>
          </div>
        </section>

        <teleport to="body">
          <div v-if="mapFullscreen" class="map-fullscreen" role="dialog" aria-modal="true" aria-label="宗门占领地图全屏">
            <div class="map-fullscreen-head">
              <div>
                <strong>九州势力图</strong>
                <span>{{ occupiedProvinceCount }} / {{ provinceTerritories.length }} 已占领</span>
              </div>
              <button class="secondary" type="button" @click="closeMapFullscreen">退出全屏</button>
            </div>
            <div ref="fullscreenMapMount" class="map-fullscreen-body"></div>
            <div class="province-legend fullscreen-legend">
              <span
                v-for="sect in sectSummaries"
                :key="`full-${sect.name}`"
                tabindex="0"
                :class="{ active: hoveredMapSect === sect.name }"
                @mouseenter="hoverMapSect(sect.name)"
                @mouseleave="hoverMapSect('')"
                @focus="hoverMapSect(sect.name)"
                @blur="hoverMapSect('')"
              >
                <i :style="{ background: sectColor(sect.name) }"></i>{{ sect.name }}
              </span>
              <span><i></i>无主</span>
            </div>
          </div>
        </teleport>

        <section v-if="activeTab === 'arena'" class="view active">
          <div v-if="!lastBattle" class="panel">
            <h3>人物切磋</h3>
            <p>第 {{ duelSeasonInfo.season }} 赛季 · 第 {{ duelSeasonInfo.seasonDay }} / {{ duelSeasonInfo.length }} 天。胜利 +{{ duelSeasonInfo.winScore }} 分，失败 {{ duelSeasonInfo.lossScore }} 分，积分范围 0-{{ duelSeasonInfo.maxScore }}。</p>
            <div class="duel-rank-table" aria-label="切磋段位分数表">
              <div v-for="rank in duelRankList" :key="rank.id" class="duel-rank-cell" :class="`duel-rank-${rank.id}`">
                <strong>{{ rank.name }}</strong>
                <span>{{ rank.min }}-{{ rank.max }} 分</span>
              </div>
            </div>
            <div class="arena-toolbar">
              <button class="secondary" type="button" @click="changeDuelDay(-1)">前一天</button>
              <label>查看日期
                <select v-model.number="selectedDuelDay">
                  <option v-for="option in duelDateOptions" :key="option.day" :value="option.day">{{ option.date }}</option>
                </select>
              </label>
              <button class="secondary" type="button" :disabled="selectedDuelDay >= state.day" @click="changeDuelDay(1)">后一天</button>
              <button class="primary" type="button" @click="startDailyDuels">{{ todaysDuelRecord ? "查看今日切磋" : "开始切磋" }}</button>
            </div>
          </div>

          <div v-if="!lastBattle" class="duel-day-board">
            <div class="panel section-head compact">
              <div>
                <h3>{{ selectedDuelDate }} 对阵</h3>
                <p v-if="selectedDuelRecord">共 {{ selectedDuelRecord.matches.length }} 组结果，点击有战斗的对阵可查看回放。</p>
                <p v-else>这个日期还没有切磋记录。</p>
              </div>
              <span class="tag" v-if="selectedDuelRecord">{{ selectedDuelRecord.createdAt }}</span>
              <span class="tag" v-else>未开赛</span>
            </div>

            <div class="match-list" v-if="selectedDuelRecord">
              <button
                class="match-card"
                :class="{ bye: match.type === 'bye' }"
                v-for="match in selectedDuelRecord.matches"
                :key="match.id"
                type="button"
                :disabled="match.type === 'bye'"
                @click="openMatchReplay(match)"
              >
                <template v-if="match.type === 'battle'">
                  <div class="match-person" :class="{ winner: match.winner.id === match.left.id }">
                    <CharacterPortrait :person="matchPerson(match.left)" size="sm" />
                    <div>
                      <strong>{{ match.left.name }}</strong>
                      <small>{{ duelRankText(matchPerson(match.left)) }} · {{ realmName(match.left.realm) }} · {{ match.left.sect }}</small>
                    </div>
                  </div>
                  <div class="match-result">
                    <span>{{ match.winner.id === match.left.id ? "胜" : "负" }}</span>
                    <small>回放</small>
                  </div>
                  <div class="match-person" :class="{ winner: match.winner.id === match.right.id }">
                    <CharacterPortrait :person="matchPerson(match.right)" size="sm" />
                    <div>
                      <strong>{{ match.right.name }}</strong>
                      <small>{{ duelRankText(matchPerson(match.right)) }} · {{ realmName(match.right.realm) }} · {{ match.right.sect }}</small>
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="match-person winner">
                    <CharacterPortrait :person="matchPerson(match.winner)" size="sm" />
                    <div>
                      <strong>{{ match.winner.name }}</strong>
                      <small>{{ duelRankText(matchPerson(match.winner)) }} · {{ realmName(match.winner.realm) }} · {{ match.winner.sect }}</small>
                    </div>
                  </div>
                  <div class="match-result">
                    <span>轮空</span>
                    <small>直接胜</small>
                  </div>
                  <p>{{ match.summary }}</p>
                </template>
              </button>
            </div>

            <div class="empty" v-else-if="selectedDuelDay === state.day">{{ currentDate }} 尚未开赛，点击“开始切磋”生成全员对阵。</div>
            <div class="empty" v-else>没有找到 {{ selectedDuelDate }} 的切磋记录。</div>
          </div>

          <div v-else class="battle-detail">
            <div class="panel battle-header">
              <div>
                <h3>切磋实况</h3>
                <p>{{ lastBattle.left.name }} 对阵 {{ lastBattle.right.name }}，{{ battleStatusText }}</p>
              </div>
              <div class="actions">
                <button class="secondary" @click="replayBattle">重播</button>
                <button class="primary" @click="lastBattle = null">返回切磋</button>
              </div>
            </div>

            <div class="battle-line live">
              <div class="fighter">
                <CharacterPortrait :person="battlePerson(lastBattle.left)" size="lg" />
                <strong>{{ lastBattle.left.name }}</strong>
                <small>{{ realmName(lastBattle.left.realm) }} · 战力 {{ lastBattle.left.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.left.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(lastBattle.left.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left.skillId) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="lastBattle.left.startHp" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="lastBattle.left.startMana" tone="focus" />
              </div>
              <div class="vs">{{ battleOutcomeLabel }}</div>
              <div class="fighter">
                <CharacterPortrait :person="battlePerson(lastBattle.right)" size="lg" />
                <strong>{{ lastBattle.right.name }}</strong>
                <small>{{ realmName(lastBattle.right.realm) }} · 战力 {{ lastBattle.right.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.right.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillName(lastBattle.right.skillId) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right.skillId) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="lastBattle.right.startHp" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="lastBattle.right.startMana" tone="focus" />
              </div>
            </div>

            <div class="panel">
              <div class="battle-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind, skillEffectClass(event)]"
                >
                  <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                    <i>
                      <span>{{ skillEffectGlyph(event) }}</span>
                    </i>
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

        <section v-if="activeTab === 'equipment'" class="view active">
          <div class="panel equipment-panel">
            <div class="section-head">
              <div>
                <h3>装备图鉴</h3>
                <p>装备唯一存在；默认无归属。角色获得多件同部位装备时，自动穿戴评分最高的一件。</p>
              </div>
              <span class="tag">{{ equipmentList.length }} 件</span>
            </div>
            <div class="equipment-tools">
              <label>品质
                <select v-model="equipmentTierFilter">
                  <option value="">全部品质</option>
                  <option v-for="tier in equipmentTiers" :key="tier.id" :value="String(tier.id)">{{ tier.name }}</option>
                </select>
              </label>
              <label>部位
                <select v-model="equipmentSlotFilter">
                  <option value="">全部部位</option>
                  <option v-for="slot in equipmentSlots" :key="slot.id" :value="slot.id">{{ slot.name }}</option>
                </select>
              </label>
            </div>
            <div class="equipment-table-head">
              <span>装备</span>
              <span>部位</span>
              <span>加成</span>
              <span>归属</span>
              <span>状态</span>
            </div>
            <div class="equipment-list">
              <article class="equipment-row" v-for="item in filteredEquipment" :key="item.id" :class="`tier-${item.tier}`">
                <div>
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.tierName }} · 夺取率 {{ formatLootPercent(item.stealChance) }}</small>
                </div>
                <span>{{ item.slotName }}</span>
                <span>{{ item.statName }} +{{ formatPercent(item.bonus) }}</span>
                <span>{{ item.ownerName || "无归属" }}</span>
                <span class="tag">{{ item.equipped ? "已穿戴" : item.ownerName ? "收藏" : "流落在外" }}</span>
              </article>
            </div>
            <div v-if="!filteredEquipment.length" class="empty">没有符合筛选条件的装备。</div>
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
            <div class="rank-tools">
              <label class="rank-search">
                <span>搜索</span>
                <input v-model.trim="rankSearch" placeholder="输入姓名、宗门、境界或关键词">
              </label>
              <span class="rank-count">共 {{ filteredRanking.length }} 条</span>
            </div>
            <div v-if="activeRankBoard === 'duel'" class="duel-rank-table compact" aria-label="切磋段位分数表">
              <div v-for="rank in duelRankList" :key="`rank-board-${rank.id}`" class="duel-rank-cell" :class="`duel-rank-${rank.id}`">
                <strong>{{ rank.name }}</strong>
                <span>{{ rank.min }}-{{ rank.max }} 分</span>
              </div>
            </div>
            <div class="rank-list">
              <button
                class="row rank-row"
                :class="{ 'person-rank-row': item.kind === 'person' }"
                v-for="(item, index) in pagedRanking"
                :key="`${activeRankBoard}-${item.name}-${item.sect}`"
                type="button"
                :aria-label="`${item.name}：${item.help}`"
                @click="openRankItem(item)"
              >
                <span class="tag">#{{ rankPageStart + index + 1 }}</span>
                <CharacterPortrait v-if="item.kind === 'person'" :person="rankPerson(item)" size="sm" />
                <div><strong>{{ item.name }}</strong><small>{{ item.subtitle }}</small></div>
                <span>{{ item.value }}</span>
                <small class="rank-tip" role="tooltip">{{ item.help }}</small>
              </button>
              <div v-if="!pagedRanking.length" class="empty">没有找到匹配的榜单记录。</div>
            </div>
            <div class="rank-pager" v-if="rankPageCount > 1">
              <button class="secondary" type="button" :disabled="rankPage <= 1" @click="changeRankPage(-1)">上一页</button>
              <span>第 {{ rankPage }} / {{ rankPageCount }} 页</span>
              <button class="secondary" type="button" :disabled="rankPage >= rankPageCount" @click="changeRankPage(1)">下一页</button>
            </div>
          </div>

          <div class="panel" v-else-if="detailView === 'person' && selectedPerson">
            <button class="secondary back-button" @click="detailView = 'rank'">返回榜单</button>
            <div class="detail-hero">
              <CharacterPortrait :person="selectedPerson" size="xl" />
              <div>
                <h3>{{ selectedPerson.name }}</h3>
                <p>{{ selectedPerson.sect }} · {{ genderLabel(selectedPerson.gender) }} · {{ realmName(selectedPerson.realm) }} · {{ rootSummary(selectedPerson.root) }}</p>
                <span class="tag">本命技能：{{ skillName(selectedPerson.skillId) }}</span>
                <span class="tag rank-tag" :class="`duel-rank-${duelRankId(selectedPerson)}`">{{ duelRankText(selectedPerson) }}</span>
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
                    {{ displayDate(record) }}：{{ dailyXpText(record) }}，+{{ record.spirit }}灵石，{{ dailyChanceText(record) }}，{{ record.note }}
                  </div>
                  <div v-if="!selectedPerson.dailyRecords.length" class="empty">暂无每日成长记录，下一次自动结算后会写入。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>突破记录</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ bad: !record.success, gold: record.success }" v-for="record in selectedPerson.breakthroughs" :key="`${record.day}-${record.from}-${record.to}`">
                    {{ displayDate(record) }}：{{ record.from }} → {{ record.to }}，{{ record.success ? "成功" : "失败" }}，{{ breakthroughChanceText(record) }}<span v-if="record.growth">，{{ growthText(record.growth) }}</span>
                  </div>
                  <div v-if="!selectedPerson.breakthroughs.length" class="empty">暂无突破记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>切磋战绩</h3>
                <p>第 {{ duelSeasonInfo.season }} 赛季：{{ duelRankText(selectedPerson) }}，{{ selectedPerson.duelSeason?.wins || 0 }} 胜 {{ selectedPerson.duelSeason?.losses || 0 }} 负；累计 {{ selectedPerson.duelWins || 0 }} 胜 {{ selectedPerson.duelLosses || 0 }} 负。</p>
                <div class="duel-history-strip" v-if="selectedPerson.duelSeasonHistory?.length">
                  <span v-for="record in selectedPerson.duelSeasonHistory" :key="`${selectedPerson.id}-season-${record.season}`" class="duel-season-badge" :class="`duel-rank-${record.rankId}`">
                    S{{ record.season }} {{ record.rankName }} {{ record.score }}分
                  </span>
                </div>
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
                    <strong>{{ record.foughtAt || displayDate(record) }}</strong>
                    <span>对阵 {{ record.opponent }}，{{ record.result }}</span>
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
              <div class="panel flat">
                <h3>当前装备</h3>
                <div class="equipment-mini-list" v-if="equippedFor(selectedPerson).length">
                  <div class="equipment-mini" v-for="item in equippedFor(selectedPerson)" :key="item.id">
                    <span class="tag">{{ item.slotName }}</span>
                    <div>
                      <strong>{{ item.name }}</strong>
                      <small>{{ item.tierName }} · {{ item.statName }} +{{ formatPercent(item.bonus) }}</small>
                    </div>
                  </div>
                </div>
                <div v-else class="empty">暂无穿戴装备。</div>
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
            <div class="grid detail-sections sect-detail-sections">
              <div class="panel flat sect-member-panel">
                <div class="section-head compact">
                  <div>
                    <h3>人物列表</h3>
                    <p>{{ sectMembers(selectedSect).length }} 人 · 按战力展示宗门成员</p>
                  </div>
                </div>
                <div class="sect-member-grid">
                  <button class="sect-member-card" v-for="member in sectMembers(selectedSect)" :key="member.id" @click="openPersonById(member.id)">
                    <CharacterPortrait :person="member" size="md" />
                    <div class="sect-member-main">
                      <div class="sect-member-topline">
                        <span class="tag">{{ realmName(member.realm) }}</span>
                        <span class="member-badge" :class="{ player: member.isPlayer }">{{ member.isPlayer ? "你" : "NPC" }}</span>
                      </div>
                      <strong>{{ member.name }}</strong>
                      <small>{{ genderLabel(member.gender) }} · {{ member.mood }}</small>
                    </div>
                    <div class="sect-member-power">
                      <b>{{ member.power }}</b>
                      <span>战力</span>
                    </div>
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
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from "vue";
import { getState, postAction } from "./api";
import CharacterPortrait from "./components/CharacterPortrait.vue";
import LogPanel from "./components/LogPanel.vue";
import Meter from "./components/Meter.vue";
import StatIcon from "./components/StatIcon.vue";
import { equipmentCatalog as fallbackEquipmentCatalog, equipmentSlots as fallbackEquipmentSlots, equipmentTiers as fallbackEquipmentTiers } from "../../shared/equipmentData.mjs";
import { duelLossScore, duelRanks, duelRankForScore, duelSeasonDay, duelSeasonLength, duelSeasonMaxScore, duelSeasonOfDay, duelWinScore } from "../../shared/duelSeasonData.mjs";

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
  { id: "equipment", label: "装备" },
  { id: "rank", label: "榜单" }
];

const rankBoards = [
  { id: "power", label: "个人战力" },
  { id: "duel", label: "切磋段位" },
  { id: "sect", label: "宗门战力" },
  { id: "dungeon", label: "副本闯关" }
];

const state = shallowRef(null);
const loading = ref(true);
const error = ref("");
const activeTab = ref("practice");
const activeSectSubTab = ref("map");
const activeRankBoard = ref("power");
const rankSearch = ref("");
const rankPage = ref(1);
const rankPageSize = 10;
const equipmentTierFilter = ref("");
const equipmentSlotFilter = ref("");
const detailView = ref("rank");
const selectedPersonId = ref("player");
const selectedSectName = ref("");
const selectedRealmStage = ref("");
const selectedDuelDay = ref(null);
const selectedProvinceWarDay = ref(null);
const selectedProvinceWarId = ref("");
const provinceWarSearch = ref("");
const lastBattle = ref(null);
const battleCursor = ref(0);
const countdown = ref("--:--:--");
const taskForm = reactive({ name: "", type: "study", diff: 3 });
const chinaMapRef = ref(null);
const normalMapMount = ref(null);
const fullscreenMapMount = ref(null);
const mapFullscreen = ref(false);
const hoveredMapSect = ref("");
const fallbackSkill = {
  id: "basic_strike",
  name: "凝气一击",
  cost: 0,
  cooldown: 0,
  text: "技能目录尚未加载时使用的基础攻击。"
};

const sectSubTabs = [
  { id: "map", label: "势力地图" },
  { id: "sects", label: "宗门排行" },
  { id: "provinces", label: "省份资源" },
  { id: "wars", label: "攻城记录" }
];

const player = computed(() => state.value.player);
const derived = computed(() => state.value.derived);
const catalog = computed(() => state.value.catalog);
const equipmentSlots = computed(() => catalog.value.equipmentSlots?.length ? catalog.value.equipmentSlots : fallbackEquipmentSlots);
const equipmentTiers = computed(() => catalog.value.equipmentTiers?.length ? catalog.value.equipmentTiers : fallbackEquipmentTiers);
const duelRankList = computed(() => catalog.value.duelRanks?.length ? catalog.value.duelRanks : duelRanks);
const duelSeasonInfo = computed(() => derived.value.duelSeason || {
  season: duelSeasonOfDay(state.value.day),
  seasonDay: duelSeasonDay(state.value.day),
  length: duelSeasonLength,
  maxScore: duelSeasonMaxScore,
  winScore: duelWinScore,
  lossScore: duelLossScore
});
const fallbackDuelRankMap = computed(() => {
  const people = [state.value.player, ...(state.value.npcs || [])].filter(Boolean);
  const map = Object.fromEntries(people.map((person) => [person.id, {
    season: duelSeasonInfo.value.season,
    seasonDay: duelSeasonInfo.value.seasonDay,
    score: 0,
    wins: 0,
    losses: 0
  }]));
  const records = [...(state.value.duelDays || [])]
    .filter((record) => duelSeasonOfDay(record.day || state.value.day) === duelSeasonInfo.value.season)
    .sort((a, b) => a.day - b.day);
  for (const record of records) {
    for (const match of record.matches || []) {
      if (match.type === "bye") {
        applyDuelRankDelta(map, match.winner?.id, true);
        continue;
      }
      const winnerId = match.winner?.id || (match.replay?.winner === "left" ? match.replay?.left?.id : match.replay?.right?.id);
      const loserId = match.loser?.id || (winnerId === match.replay?.left?.id ? match.replay?.right?.id : match.replay?.left?.id);
      applyDuelRankDelta(map, winnerId, true);
      applyDuelRankDelta(map, loserId, false);
    }
  }
  return Object.fromEntries(Object.entries(map).map(([id, season]) => [id, {
    ...season,
    ...duelRankByScore(season.score)
  }]));
});
const currentDate = computed(() => dateForDay(state.value.day));
const combatSkills = computed(() => catalog.value.combatSkills?.length ? catalog.value.combatSkills : [fallbackSkill]);
const playerSkill = computed(() => skillById(player.value.skillId));
const sectSummaries = computed(() => derived.value.sects || []);
const equipmentList = computed(() => {
  const catalogSource = catalog.value.equipmentCatalog?.length ? catalog.value.equipmentCatalog : fallbackEquipmentCatalog;
  const source = state.value.equipment?.length ? state.value.equipment : catalogSource;
  return source.map((item) => ({
    ...item,
    slotName: item.slotName || equipmentSlotName(item.slot),
    stat: item.stat || equipmentSlotStat(item.slot),
    statName: item.statName || equipmentSlotStatName(item.slot),
    tierName: item.tierName || equipmentTierName(item.tier),
    stealChance: item.stealChance ?? equipmentTierStealChance(item.tier),
    ownerName: item.ownerName || "",
    equipped: Boolean(item.equipped)
  }));
});
const filteredEquipment = computed(() => equipmentList.value
  .filter((item) => !equipmentTierFilter.value || String(item.tier) === equipmentTierFilter.value)
  .filter((item) => !equipmentSlotFilter.value || item.slot === equipmentSlotFilter.value)
  .sort((a, b) => b.tier - a.tier || slotOrder(a.slot) - slotOrder(b.slot) || b.bonus - a.bonus));
const provinceWarRecords = computed(() => state.value.provinceWars || []);
const provinceTerritories = computed(() => {
  const owners = new Map((state.value.provinces || []).map((item) => [item.id, item]));
  return (catalog.value.provinces || []).map((province) => {
    const territory = owners.get(province.id) || {};
    const currentProvince = { ...province, type: province.type || "spirit" };
    return {
      ...currentProvince,
      owner: territory.owner || "",
      defenders: territory.defenders || [],
      effect: provinceEffect(currentProvince)
    };
  });
});
const occupiedProvinceCount = computed(() => provinceTerritories.value.filter((item) => item.owner).length);
const sectTerritoryRanking = computed(() => sectSummaries.value
  .map((sect) => {
    const provinces = provinceTerritories.value.filter((province) => province.owner === sect.name);
    const spiritItems = provinces.filter((province) => province.effect.type === "spirit").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    const xpItems = provinces.filter((province) => province.effect.type === "xp").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    const breakthroughItems = provinces.filter((province) => province.effect.type === "breakthrough").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    return {
      name: sect.name,
      provinceCount: provinces.length,
      provinceNames: provinces.map((province) => province.name),
      spirit: spiritItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      xp: xpItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      breakthrough: breakthroughItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      spiritItems,
      xpItems,
      breakthroughItems
    };
  })
  .sort((a, b) => b.provinceCount - a.provinceCount || b.spirit - a.spirit || b.xp - a.xp));
const provinceResourceRanking = computed(() => {
  if (activeTab.value !== "sect" || activeSectSubTab.value !== "provinces") return [];
  return [...provinceTerritories.value].sort((a, b) => a.rank - b.rank);
});
const provinceWarDayRecords = computed(() => {
  if (activeTab.value !== "sect" && activeTab.value !== "arena") return [];
  const groups = new Map();
  for (const war of provinceWarRecords.value) {
    const day = war.day || state.value.day;
    if (!groups.has(day)) groups.set(day, { day, date: war.date || dateForDay(day), wars: [] });
    groups.get(day).wars.push(war);
  }
  return [...groups.values()].sort((a, b) => b.day - a.day);
});
const provinceWarDayOptions = computed(() => {
  if (activeTab.value !== "sect") return [];
  const days = new Set([state.value.day, selectedProvinceWarDay.value, ...provinceWarDayRecords.value.map((record) => record.day)]);
  return [...days].filter((day) => day >= 1 && day <= state.value.day).sort((a, b) => b - a);
});
const provinceWarDateOptions = computed(() => provinceWarDayOptions.value.map((day) => ({ day, date: dateForDay(day) })));
const selectedProvinceWarDayRecord = computed(() => provinceWarDayRecords.value.find((record) => record.day === selectedProvinceWarDay.value));
const normalizedProvinceWarSearch = computed(() => provinceWarSearch.value.trim().toLowerCase());
const filteredProvinceWars = computed(() => {
  const wars = selectedProvinceWarDayRecord.value?.wars || [];
  const keyword = normalizedProvinceWarSearch.value;
  if (!keyword) return wars;
  return wars.filter((war) => provinceWarSearchText(war).includes(keyword));
});
const selectedProvinceWar = computed(() => selectedProvinceWarDayRecord.value?.wars.find((war) => war.id === selectedProvinceWarId.value));
const selectedProvinceWarDate = computed(() => selectedProvinceWarDayRecord.value?.date || dateForDay(selectedProvinceWarDay.value));
const mainLogs = computed(() => state.value.log.filter((entry) => !isNpcBreakthroughLog(entry)));
const duelRecords = computed(() => state.value.duelDays || []);
const duelDayOptions = computed(() => {
  if (activeTab.value !== "arena") return [];
  const days = new Set([state.value.day, selectedDuelDay.value, ...duelRecords.value.map((record) => record.day)]);
  return [...days].filter((day) => day >= 1 && day <= state.value.day).sort((a, b) => b - a);
});
const duelDateOptions = computed(() => duelDayOptions.value.map((day) => ({ day, date: dateForDay(day) })));
const selectedDuelRecord = computed(() => duelRecords.value.find((record) => record.day === selectedDuelDay.value));
const selectedDuelDate = computed(() => selectedDuelRecord.value?.date || dateForDay(selectedDuelDay.value));
const todaysDuelRecord = computed(() => duelRecords.value.find((record) => record.day === state.value.day));
const visibleBattleEvents = computed(() => lastBattle.value?.events.slice(0, battleCursor.value) || []);
const displayedBattleEvents = computed(() => [...visibleBattleEvents.value].reverse());
const isBattleReplayDone = computed(() => {
  const total = lastBattle.value?.events.length || 0;
  return total > 0 && battleCursor.value >= total;
});
const battleStatusText = computed(() => {
  if (!lastBattle.value) return "";
  if (!isBattleReplayDone.value) return "战斗正在回放中。";
  return lastBattle.value.result === "胜" ? "你胜出了这一场。" : "你败下阵来。";
});
const battleOutcomeLabel = computed(() => (isBattleReplayDone.value ? lastBattle.value.result : "回放"));
const currentBattleFrame = computed(() => {
  const battle = lastBattle.value;
  if (!battle) return { leftHp: 0, rightHp: 0, leftMana: 0, rightMana: 0 };
  if (isBattleReplayDone.value) {
    return {
      leftHp: battle.left.endHp,
      rightHp: battle.right.endHp,
      leftMana: battle.left.endMana,
      rightMana: battle.right.endMana
    };
  }
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
  return `skill-visual ${effectMap[skill.type] || "skill-light"} skill-id-${skill.id}`;
}

function skillEffectTitle(event) {
  const skill = skillForEvent(event);
  if (!skill) return event.skill || "技能";
  if (["shield", "defenseBuff", "reflect", "heal", "evasionBuff", "dodge", "field"].includes(skill.type)) {
    return `${skill.name} · 灵光护身`;
  }
  return `${skill.name} · 术法爆发`;
}

function skillEffectGlyph(event) {
  const skill = skillForEvent(event);
  if (!skill) return "✦";
  const glyphs = {
    azure_sword: "剑",
    thunder_pearl: "雷",
    blood_escape: "影",
    poison_flame: "毒",
    magnetic_light: "磁",
    golden_body: "阙",
    soul_hook: "魂",
    green_bamboo: "竹",
    spirit_armor: "甲",
    bone_spike: "骨",
    fire_crow: "鸦",
    wood_recovery: "春",
    ghost_step: "鬼",
    demon_cut: "煞",
    ice_seal: "寒",
    starfall: "星",
    blood_drink: "血",
    mirror_water: "镜",
    wind_blade: "风",
    five_element: "阵"
  };
  return glyphs[skill.id] || "术";
}

function provinceEffect(province) {
  const rank = province.rank || 99;
  const tier = rank <= 5 ? 1 : rank <= 12 ? 0.82 : rank <= 22 ? 0.62 : 0.42;
  if (province.type === "spirit") {
    const value = 10 + Math.round(10 * tier);
    return { type: province.type, value, text: `每日成员灵石 +${value}` };
  }
  if (province.type === "xp") {
    const value = Number((0.4 + 0.2 * tier).toFixed(2));
    return { type: province.type, value, text: `经验获取 +${Math.round(value * 100)}%` };
  }
  if (province.type === "breakthrough") {
    const value = Number((0.05 + 0.05 * tier).toFixed(3));
    return { type: province.type, value, text: `突破概率 +${Math.round(value * 100)}%` };
  }
  const value = 10 + Math.round(10 * tier);
  return { type: "spirit", value, text: `每日成员灵石 +${value}` };
}

function bonusItemsText(items, type) {
  if (!items?.length) return "无对应省份";
  return items.map((item) => {
    const value = Number(item.value) || 0;
    if (type === "spirit") return `${item.name} +${value}`;
    return `${item.name} +${Math.round(value * 100)}%`;
  }).join("、");
}

function sectColor(sectName) {
  if (!sectName) return "#9ca3af";
  const palette = ["#0f766e", "#b7791f", "#245c8d", "#b91c1c", "#5b7f2a", "#7c3aed", "#c05621", "#0e7490", "#be185d", "#4b5563"];
  const index = catalog.value.sects?.indexOf(sectName) ?? -1;
  return palette[Math.max(0, index) % palette.length];
}

function defenderNames(territory) {
  return defendersFor(territory).map((person) => person.name);
}

function defendersFor(territory) {
  const ids = new Set(territory.defenders || []);
  return cultivators.value.filter((person) => ids.has(person.id));
}

const cultivators = computed(() => [
  withDuelRank({
    ...player.value,
    name: player.value.name,
    sect: state.value.sect.name,
    mood: "求道",
    power: derived.value.playerPower,
    isPlayer: true
  }),
  ...state.value.npcs.map((npc) => withDuelRank({ ...npc, power: personPower({ ...npc, isPlayer: false }), isPlayer: false }))
]);

const selectedPerson = computed(() => cultivators.value.find((item) => item.id === selectedPersonId.value));
const selectedSect = computed(() => sectSummaries.value.find((sect) => sect.name === selectedSectName.value));

function personByRef(ref) {
  if (!ref) return null;
  return cultivators.value.find((person) => person.id === ref.id || person.name === ref.name) || withDuelRank(ref);
}

function withDuelRank(person) {
  if (!person) return person;
  const rankState = derived.value.duelRanks
    ? (derived.value.duelRanks[person.id] || person.duelSeason || duelRankByScore(person.duelSeason?.score || 0))
    : (person.duelSeason || fallbackDuelRankMap.value[person.id] || duelRankByScore(person.duelSeason?.score || 0));
  return {
    ...person,
    duelSeason: {
      ...person.duelSeason,
      ...rankState
    }
  };
}

function applyDuelRankDelta(map, id, won) {
  if (!id || !map[id]) return;
  const delta = won ? duelSeasonInfo.value.winScore : duelSeasonInfo.value.lossScore;
  map[id].score = Math.max(0, Math.min(duelSeasonInfo.value.maxScore, map[id].score + delta));
  if (won) map[id].wins += 1;
  else map[id].losses += 1;
}

function duelRankByScore(score) {
  const rank = duelRankList.value.find((item) => score >= item.min && score <= item.max) || duelRankForScore(score);
  return {
    score,
    rankId: rank.id,
    rankName: rank.name,
    rankColor: rank.color
  };
}

function slotOrder(slotId) {
  const index = equipmentSlots.value.findIndex((slot) => slot.id === slotId);
  return index < 0 ? 99 : index;
}

function equipmentSlot(slotId) {
  return equipmentSlots.value.find((slot) => slot.id === slotId) || {};
}

function equipmentTier(tierId) {
  return equipmentTiers.value.find((tier) => Number(tier.id) === Number(tierId)) || {};
}

function equipmentSlotName(slotId) {
  return equipmentSlot(slotId).name || "未知部位";
}

function equipmentSlotStat(slotId) {
  return equipmentSlot(slotId).stat || "";
}

function equipmentSlotStatName(slotId) {
  return equipmentSlot(slotId).statName || "属性";
}

function equipmentTierName(tierId) {
  return equipmentTier(tierId).name || "未知品质";
}

function equipmentTierStealChance(tierId) {
  return equipmentTier(tierId).stealChance || 0;
}

function equippedFor(person) {
  if (!person?.id) return [];
  return derived.value.equippedItems?.[person.id] || [];
}

function equipmentBonus(person, stat) {
  return equippedFor(person)
    .filter((item) => item.stat === stat)
    .reduce((sum, item) => sum + (item.bonus || 0), 0);
}

function matchPerson(ref) {
  return personByRef(ref);
}

function battlePerson(ref) {
  return personByRef(ref);
}

function warTeam(war, side) {
  const explicitLineup = side === "attacker" ? war?.attackerLineup : war?.defenderLineup;
  if (Array.isArray(explicitLineup) && explicitLineup.length) {
    return uniquePeople(explicitLineup);
  }

  const seen = new Set();
  const members = [];
  const sectName = side === "attacker" ? war?.attacker : war?.defender;
  if (side === "attacker" && sectName && sectName !== "无主之地") {
    for (const person of cultivators.value.filter((item) => item.sect === sectName)) {
      addWarTeamMember(person, seen, members);
    }
  }
  for (const battle of war?.battles || []) {
    const ref = side === "attacker"
      ? battle.replay?.left || battle.attacker
      : battle.replay?.right || battle.defender;
    addWarTeamMember(ref, seen, members);
  }
  return members;
}

function uniquePeople(items) {
  const seen = new Set();
  const people = [];
  for (const item of items || []) addWarTeamMember(item, seen, people);
  return people;
}

function addWarTeamMember(ref, seen, members) {
  if (!ref) return;
  const person = personByRef(ref);
  const key = person?.id || person?.name || ref.id || ref.name;
  if (!key || seen.has(key)) return;
  seen.add(key);
  members.push(person || ref);
}

function battleName(battle, side) {
  const ref = side === "attacker"
    ? battle?.replay?.left || battle?.attacker
    : battle?.replay?.right || battle?.defender;
  return battlePerson(ref)?.name || ref?.name || "未知修士";
}

function battleWinnerName(battle) {
  if (battle?.winnerName) return battle.winnerName;
  if (battle?.winnerSide === "attacker" || battle?.replay?.winner === "left") return battleName(battle, "attacker");
  if (battle?.winnerSide === "defender" || battle?.replay?.winner === "right") return battleName(battle, "defender");
  return "未分胜负";
}

function warKillRanking(war, side) {
  const wantedSide = side === "attacker" ? "attacker" : "defender";
  const fallbackReplaySide = side === "attacker" ? "left" : "right";
  const kills = new Map();
  for (const battle of war?.battles || []) {
    const won = battle.winnerSide === wantedSide || (!battle.winnerSide && battle.replay?.winner === fallbackReplaySide);
    if (!won) continue;
    const ref = side === "attacker"
      ? battle.replay?.left || battle.attacker
      : battle.replay?.right || battle.defender;
    const person = battlePerson(ref);
    const key = person?.id || person?.name || ref?.id || ref?.name;
    if (!key) continue;
    const current = kills.get(key) || { id: person?.id || ref?.id || key, name: person?.name || ref?.name || "未知修士", kills: 0 };
    current.kills += 1;
    kills.set(key, current);
  }
  return [...kills.values()].sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function provinceWarSearchText(war) {
  return [
    war.provinceName,
    war.attacker,
    war.defender
  ].filter(Boolean).join(" ").toLowerCase();
}

function rankPerson(item) {
  return personByRef(item);
}

const activeRanking = computed(() => {
  if (!state.value) return [];
  if (activeRankBoard.value === "duel") return duelRanking.value;
  if (activeRankBoard.value === "sect") return sectRanking.value;
  if (activeRankBoard.value === "dungeon") return dungeonRanking.value;
  return powerRanking.value;
});

const normalizedRankSearch = computed(() => rankSearch.value.trim().toLowerCase());

const filteredRanking = computed(() => {
  const keyword = normalizedRankSearch.value;
  if (!keyword) return activeRanking.value;
  return activeRanking.value.filter((item) => rankSearchText(item).includes(keyword));
});

const rankPageCount = computed(() => Math.max(1, Math.ceil(filteredRanking.value.length / rankPageSize)));
const safeRankPage = computed(() => Math.min(rankPage.value, rankPageCount.value));
const rankPageStart = computed(() => (safeRankPage.value - 1) * rankPageSize);
const pagedRanking = computed(() => filteredRanking.value.slice(rankPageStart.value, rankPageStart.value + rankPageSize));

const powerRanking = computed(() => cultivators.value
  .map((item) => ({
    name: item.name,
    id: item.id,
    kind: "person",
    sect: item.sect,
    subtitle: `${item.sect} · ${genderLabel(item.gender)} · ${item.mood} · ${realmName(item.realm)}`,
    value: item.power,
    help: `战力 ${item.power}。性别：${genderLabel(item.gender)}；境界：${realmName(item.realm)}；经验：${Math.floor(item.xp)}；灵根 ${item.root.name}；攻击 ${personEffectiveStats(item).attack}，防御 ${personEffectiveStats(item).defense}，神识 ${personEffectiveStats(item).divineSense}，法力 ${personEffectiveStats(item).maxMana}。`
  }))
  .sort((a, b) => b.value - a.value));

const duelRanking = computed(() => cultivators.value
  .map((item) => {
    const wins = item.duelWins || 0;
    const losses = item.duelLosses || 0;
    const season = item.duelSeason || duelRankByScore(0);
    const seasonWins = season.wins || 0;
    const seasonLosses = season.losses || 0;
    return {
      name: item.name,
      id: item.id,
      kind: "person",
      sect: item.sect,
      subtitle: `${item.sect} · ${realmName(item.realm)} · ${season.rankName} · ${seasonWins}胜${seasonLosses}负`,
      value: `${season.score || 0}分`,
      score: season.score || 0,
      help: `第${duelSeasonInfo.value.season}赛季：${season.rankName}${season.score || 0}分，${seasonWins}胜${seasonLosses}负；累计 ${wins}胜${losses}负。战力 ${item.power}。`
    };
  })
  .sort((a, b) => b.score - a.score || b.value.localeCompare(a.value, "zh-Hans-CN")));

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

function isNpcBreakthroughLog(entry) {
  if (!entry?.text?.includes("突破至")) return false;
  return state.value.npcs.some((npc) => entry.text.includes(`${npc.name}在${npc.sect}`));
}

function formatPercent(value) {
  if (typeof value !== "number") return "未记录";
  return `${Math.round(value * 100)}%`;
}

function formatLootPercent(value) {
  if (typeof value !== "number") return "未记录";
  const percent = value * 100;
  if (percent >= 1) return `${Math.round(percent)}%`;
  return `${Number(percent.toFixed(2))}%`;
}

function duelRankId(person) {
  return person?.duelSeason?.rankId || duelRankByScore(person?.duelSeason?.score || 0).rankId;
}

function duelRankText(person) {
  const season = person?.duelSeason || duelRankByScore(0);
  return `${season.rankName || "黑铁"} ${season.score || 0}分`;
}

function genderLabel(gender) {
  if (gender === "female") return "女";
  if (gender === "unknown") return "未知";
  return "男";
}

function addDays(dateText, offset) {
  const [year, month, day] = String(dateText || new Date().toISOString().slice(0, 10)).split("-").map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + offset);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateForDay(day) {
  return addDays(state.value.calendarStartDate || state.value.lastSettlementDate, Math.max(0, Number(day || 1) - 1));
}

function displayDate(record) {
  return record?.date || dateForDay(record?.day || state.value.day);
}

function dailyChanceText(record) {
  if (typeof record.breakChance !== "number") return "未尝试突破";
  if (typeof record.baseBreakChance === "number" || typeof record.bonusBreakChance === "number") {
    return `突破率 ${formatPercent(record.breakChance)}（基础 ${formatPercent(record.baseBreakChance || 0)}，加成 ${formatPercent(record.bonusBreakChance || 0)}）`;
  }
  return `突破率 ${formatPercent(record.breakChance)}`;
}

function dailyXpText(record) {
  const total = Number(record.xp) || 0;
  if (typeof record.baseXp === "number" || typeof record.bonusXp === "number" || typeof record.boughtXp === "number") {
    const base = Number(record.baseXp) || 0;
    const bonus = Number(record.bonusXp) || 0;
    const bought = Number(record.boughtXp) || 0;
    const boughtText = bought > 0 ? `，灵石补足 ${bought}` : "";
    return `+${total}经验（基础 ${base}，加成 ${bonus}${boughtText}）`;
  }
  return `+${total}经验`;
}

function breakthroughChanceText(record) {
  if (typeof record.chance !== "number") return "当时突破率未记录";
  if (typeof record.baseChance === "number" || typeof record.bonusChance === "number") {
    return `当时突破率 ${formatPercent(record.chance)}（基础 ${formatPercent(record.baseChance || 0)}，加成 ${formatPercent(record.bonusChance || 0)}）`;
  }
  return `当时突破率 ${formatPercent(record.chance)}`;
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

function rankSearchText(item) {
  return [
    item.name,
    item.id,
    item.kind,
    item.sect,
    item.subtitle,
    item.value,
    item.help
  ]
    .filter((value) => value !== undefined && value !== null)
    .join(" ")
    .toLowerCase();
}

function changeRankPage(offset) {
  rankPage.value = Math.max(1, Math.min(rankPageCount.value, rankPage.value + offset));
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
    { label: "性别", value: genderLabel(person.gender) },
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
  return battleStatsFromEffective(effective);
}

function battleStatsFromEffective(effective) {
  return [
    { label: "攻击", icon: "attack", value: statWithBonus(effective.attack, effective.bonuses?.attack || 0) },
    { label: "防御", icon: "defense", value: statWithBonus(effective.defense, effective.bonuses?.defense || 0) },
    { label: "神识", icon: "sense", value: statWithBonus(effective.divineSense, effective.bonuses?.divineSense || 0) }
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
  const attack = Math.floor((person.attack || 0) * (1 + attackBonus + equipmentBonus(person, "attack")));
  const defense = Math.floor((person.defense || 0) * (1 + defenseBonus + equipmentBonus(person, "defense")));
  const maxHp = Math.floor((person.maxHp || 0) * (1 + hpBonus + equipmentBonus(person, "maxHp")));
  const divineSense = Math.floor((person.divineSense || 0) * (1 + divineSenseBonus + equipmentBonus(person, "divineSense")));
  const maxMana = Math.floor((person.maxMana || 0) * (1 + manaBonus + equipmentBonus(person, "maxMana")));
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

function provinceByName(name) {
  const normalized = String(name || "").replace(/省|市|壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区/g, "");
  return provinceTerritories.value.find((province) => province.name === normalized || province.name.replace(/省|市|自治区|特别行政区/g, "") === normalized);
}

function mapTooltipHtml(params) {
  const territory = provinceByName(params.name);
  if (!territory) {
    return `<strong>${params.name}</strong><br><span>地图附属区域</span>`;
  }
  const defenders = defenderNames(territory).join("、") || "未派驻";
  return [
    `<strong>${territory.name}</strong>`,
    `归属：${territory.owner || "无主之地"}`,
    `守城：${defenders}`,
    `加成：${territory.effect.text}`,
    `GDP档位：${territory.rank}`
  ].join("<br>");
}

function chinaMapOption() {
  const activeSect = hoveredMapSect.value;
  const data = provinceTerritories.value.map((territory, index) => ({
    name: territory.name,
    value: index + 1,
    itemStyle: {
      areaColor: territory.owner ? sectColor(territory.owner) : "#d8e2e7",
      borderColor: activeSect && territory.owner === activeSect ? "#fff7ed" : "#f8fafc",
      borderWidth: activeSect && territory.owner === activeSect ? 2.2 : 1,
      opacity: activeSect && territory.owner !== activeSect ? 0.28 : 1,
      shadowBlur: activeSect && territory.owner === activeSect ? 14 : 0,
      shadowColor: "rgba(255, 247, 237, .52)"
    },
    emphasis: {
      itemStyle: {
        areaColor: territory.owner ? sectColor(territory.owner) : "#cbd5e1",
        borderColor: "#17324a",
        borderWidth: 1.4,
        shadowBlur: 12,
        shadowColor: "rgba(23, 50, 74, .25)"
      },
      label: { color: "#17324a", fontWeight: 700 }
    }
  }));
  data.push({ name: "南海诸岛", value: 0, itemStyle: { areaColor: "#d8e2e7", borderColor: "#f8fafc" } });

  return {
    backgroundColor: "#214a82",
    tooltip: {
      trigger: "item",
      borderWidth: 0,
      backgroundColor: "rgba(255, 253, 246, .96)",
      textStyle: { color: "#17324a", fontSize: 12 },
      extraCssText: "box-shadow:0 12px 28px rgba(31,41,51,.22);border-radius:8px;padding:9px 11px;",
      formatter: mapTooltipHtml
    },
    series: [
      {
        type: "map",
        map: "china-sect",
        roam: false,
        layoutCenter: ["50%", "50%"],
        layoutSize: "88%",
        selectedMode: false,
        label: {
          show: true,
          color: "rgba(255,255,255,.9)",
          fontSize: 11
        },
        itemStyle: {
          areaColor: "#d8e2e7",
          borderColor: "#f8fafc",
          borderWidth: 1
        },
        emphasis: {
          label: { show: true, color: "#17324a", fontWeight: 700 },
          itemStyle: {
            areaColor: "#f6d365",
            borderColor: "#17324a",
            borderWidth: 1.4,
            shadowBlur: 12,
            shadowColor: "rgba(23, 50, 74, .25)"
          }
        },
        data
      }
    ]
  };
}

function hoverMapSect(sectName) {
  hoveredMapSect.value = sectName;
  if (chinaMapChart) chinaMapChart.setOption(chinaMapOption(), true);
}

async function renderChinaMap() {
  if (!chinaMapRef.value || !state.value) return;
  const echarts = await loadMapRenderer();
  if (!chinaMapRef.value || !state.value) return;
  if (chinaMapChart && chinaMapChart.getDom() !== chinaMapRef.value) {
    chinaMapChart.dispose();
    chinaMapChart = null;
  }
  if (!chinaMapChart) chinaMapChart = echarts.init(chinaMapRef.value);
  chinaMapChart.setOption(chinaMapOption(), true);
  chinaMapChart.resize();
}

function disposeChinaMap() {
  chinaMapChart?.dispose();
  chinaMapChart = null;
}

function resizeChinaMap() {
  chinaMapChart?.resize();
}

function handleMapFullscreenKey(event) {
  if (event.key === "Escape" && mapFullscreen.value) closeMapFullscreen();
}

async function openMapFullscreen() {
  mapFullscreen.value = true;
  await nextTick();
  if (fullscreenMapMount.value && chinaMapRef.value) {
    fullscreenMapMount.value.appendChild(chinaMapRef.value);
    resizeChinaMap();
  }
}

async function closeMapFullscreen() {
  mapFullscreen.value = false;
  await nextTick();
  if (normalMapMount.value && chinaMapRef.value) {
    normalMapMount.value.appendChild(chinaMapRef.value);
    resizeChinaMap();
  }
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
    if (!selectedDuelDay.value) selectedDuelDay.value = state.value.day;
    else selectedDuelDay.value = clampDay(selectedDuelDay.value);
    if (!selectedProvinceWarDay.value) selectedProvinceWarDay.value = state.value.day;
    else selectedProvinceWarDay.value = clampDay(selectedProvinceWarDay.value);
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

function openMatchReplay(match) {
  if (!match?.replay) return;
  lastBattle.value = match.replay;
  playBattle();
}

function openProvinceBattle(battle) {
  if (!battle?.replay) return;
  lastBattle.value = battle.replay;
  detailView.value = "rank";
  playBattle();
}

function openProvinceWarDetail(war) {
  selectedProvinceWarId.value = war.id;
  lastBattle.value = null;
  battleCursor.value = 0;
  clearInterval(battleTimer);
}

function closeProvinceWarDetail() {
  selectedProvinceWarId.value = "";
  lastBattle.value = null;
  battleCursor.value = 0;
  clearInterval(battleTimer);
}

function clampDay(day) {
  if (!state.value) return Math.max(1, Number(day) || 1);
  return Math.max(1, Math.min(state.value.day, Number(day) || state.value.day));
}

function changeDuelDay(offset) {
  selectedDuelDay.value = clampDay(selectedDuelDay.value + offset);
  lastBattle.value = null;
}

function changeProvinceWarDay(offset) {
  selectedProvinceWarDay.value = clampDay(selectedProvinceWarDay.value + offset);
  selectedProvinceWarId.value = "";
  lastBattle.value = null;
}

async function startDailyDuels() {
  const result = await act("/api/duels/day");
  if (!result) return;
  selectedDuelDay.value = result.day;
  lastBattle.value = null;
}

async function submitTask() {
  await act("/api/tasks", { ...taskForm });
  taskForm.name = "";
}

async function advanceDay() {
  await act("/api/day/advance");
}

async function resetGame() {
  if (!confirm("确定重开一世？将删除当前主角、NPC、成长、突破、切磋、闯关、宗门战等全部历史记录，并重新生成。")) return;
  await act("/api/reset");
  activeTab.value = "practice";
  activeRankBoard.value = "power";
  detailView.value = "rank";
  selectedPersonId.value = "player";
  selectedSectName.value = "";
  selectedRealmStage.value = derived.value.currentRealmInfo?.stage || "";
  selectedDuelDay.value = state.value.day;
  selectedProvinceWarDay.value = state.value.day;
  selectedProvinceWarId.value = "";
  lastBattle.value = null;
  battleCursor.value = 0;
  clearInterval(battleTimer);
}

let timer;
let battleTimer;
let chinaMapChart;
let echartsModulePromise;
let echartsInstance;

async function loadMapRenderer() {
  if (!echartsModulePromise) {
    echartsModulePromise = Promise.all([
      import("echarts/core"),
      import("echarts/components"),
      import("echarts/charts"),
      import("echarts/renderers"),
      import("china-geojson/src/geojson/china.json")
    ]).then(([echarts, components, charts, renderers, chinaGeo]) => {
      echarts.use([
        components.GeoComponent,
        components.TitleComponent,
        components.TooltipComponent,
        components.VisualMapComponent,
        charts.MapChart,
        renderers.CanvasRenderer
      ]);
      echarts.registerMap("china-sect", chinaGeo.default || chinaGeo);
      return echarts;
    });
  }
  echartsInstance = await echartsModulePromise;
  return echartsInstance;
}

onMounted(async () => {
  updateCountdown();
  timer = setInterval(() => {
    updateCountdown();
    if (countdown.value === "00:00:00") refresh();
  }, 1000);
  await refresh();
  window.addEventListener("resize", resizeChinaMap);
  window.addEventListener("keydown", handleMapFullscreenKey);
});

onUnmounted(() => {
  clearInterval(timer);
  clearInterval(battleTimer);
  window.removeEventListener("resize", resizeChinaMap);
  window.removeEventListener("keydown", handleMapFullscreenKey);
  disposeChinaMap();
});

watch([state, activeTab, activeSectSubTab], async () => {
  if (activeTab.value !== "sect" || activeSectSubTab.value !== "map" || !state.value) {
    if (mapFullscreen.value) {
      if (normalMapMount.value && chinaMapRef.value) normalMapMount.value.appendChild(chinaMapRef.value);
      mapFullscreen.value = false;
    }
    disposeChinaMap();
    return;
  }
  await nextTick();
  await renderChinaMap();
});

watch([activeTab, activeSectSubTab, selectedProvinceWarDay], () => {
  if (activeTab.value !== "sect" || activeSectSubTab.value !== "wars") {
    selectedProvinceWarId.value = "";
    return;
  }
  if (selectedProvinceWarId.value && !selectedProvinceWar.value) selectedProvinceWarId.value = "";
});

watch([activeRankBoard, rankSearch], () => {
  rankPage.value = 1;
});

watch(rankPageCount, () => {
  if (rankPage.value > rankPageCount.value) rankPage.value = rankPageCount.value;
});
</script>
