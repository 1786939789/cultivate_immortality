<template>
  <div class="app">
    <div v-if="authLoading" class="loading auth-loading">正在叩问山门...</div>

    <section v-else-if="!authUser" class="auth-shell" aria-label="登录注册">
      <div class="auth-brand">
        <span class="auth-seal" aria-hidden="true">长生</span>
        <div>
          <h1>长生札记</h1>
          <p>入山先验令，登记道名后方可翻开本命札记。</p>
        </div>
      </div>

      <form class="auth-panel" @submit.prevent="submitAuth">
        <div class="auth-tabs" role="tablist" aria-label="账号入口">
          <button type="button" :class="{ active: authMode === 'login' }" @click="switchAuthMode('login')">登录</button>
          <button type="button" :class="{ active: authMode === 'register' }" @click="switchAuthMode('register')">注册</button>
        </div>

        <div class="auth-copy">
          <h2>{{ authMode === "login" ? "道友归来" : "初入山门" }}</h2>
          <p v-if="authMode === 'login'">输入账号密码，继续今日修行。</p>
        </div>

        <label>
          <span>账号</span>
          <input v-model.trim="authForm.username" autocomplete="username" maxlength="24" placeholder="请输入账号">
        </label>
        <label>
          <span>密码</span>
          <input v-model="authForm.password" type="password" autocomplete="current-password" maxlength="72" placeholder="至少 6 位">
        </label>
        <label v-if="authMode === 'register'">
          <span>注册码</span>
          <input v-model.trim="authForm.registrationCode" autocomplete="off" placeholder="请输入注册码">
        </label>

        <p v-if="authError" class="auth-error">{{ authError }}</p>
        <button class="primary auth-submit" type="submit" :disabled="authPending">
          {{ authPending ? "校验中..." : authMode === "login" ? "进入札记" : "注册并进入" }}
        </button>
      </form>
    </section>

    <template v-else>
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
          <p>第 {{ state?.day || 1 }} 日 · {{ currentDate }} · {{ realmName(player.realm) }}</p>
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
          <div class="hero-title-row">
            <div>
              <h2>{{ player.name || "修士" }} · {{ rootLine(player) }}</h2>
              <p>{{ player.sect || "散修" }} · 战力 {{ derived.playerPower }} · 下一境界 {{ derived.nextRealm }}</p>
            </div>
            <CharacterPortrait :person="playerPortraitPerson" size="lg" />
          </div>
          <div class="resource-strip" v-if="state">
            <span v-for="item in hudResources" :key="item.label" :class="`resource-chip resource-${item.icon}`">
              <StatIcon :name="item.icon" :size="17" />
              <small>{{ item.label }}</small>
              <strong>{{ item.value }}</strong>
            </span>
          </div>
          <section class="loot-ticker" v-if="dailyTickerItems.length" aria-label="今日修行播报">
            <span class="loot-ticker-label">今日播报</span>
            <div class="loot-ticker-track">
              <div class="loot-ticker-content">
                <span v-for="item in dailyTickerItems" :key="item.key">
                  <em class="loot-source">{{ item.label }}</em>
                  <strong>{{ item.name }}</strong>
                  {{ item.text }}
                </span>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section class="quick">
        <div class="settlement-card">
          <span>下次自动结算</span>
          <strong>{{ countdown }}</strong>
          <small>子时换日，诸事结算</small>
        </div>
        <button class="secondary" :disabled="isActionPending('/api/day/advance')" @click="advanceDay">{{ isActionPending("/api/day/advance") ? "结算中..." : "推进一天" }}</button>
        <button class="danger" :disabled="isActionPending('/api/reset')" @click="resetGame">重开一世</button>
        <div class="account-menu" :class="{ open: accountMenuOpen }" @click.stop>
          <button class="account-trigger" type="button" :aria-expanded="accountMenuOpen" aria-label="账号菜单" @click="toggleAccountMenu">
            <span class="account-avatar">{{ accountInitial }}</span>
            <strong>{{ authUser.username }}</strong>
          </button>
          <div v-if="accountMenuOpen" class="account-popover">
            <button class="secondary" type="button" :disabled="authPending" @click="handleLogout">退出账号</button>
          </div>
        </div>
      </section>
    </header>

    <div v-if="loading" class="loading">正在读取修行玉简...</div>

    <div v-else-if="state" class="layout">
      <aside class="sidebar">
        <section class="avatar hero-profile-card">
          <CharacterPortrait :person="playerPortraitPerson" size="xl" />
          <div class="name-plaque">
            <span>{{ player.name }}</span>
          </div>
        </section>

        <section class="profile-scroll">
          <div class="profile-title-row">
            <strong>{{ player.name }}</strong>
          </div>

          <div class="profile-info-list">
            <div class="profile-info-item">
              <Landmark :size="17" :stroke-width="2.4" aria-hidden="true" />
              <span>宗门</span>
              <strong>{{ player.sect || "散修" }}</strong>
            </div>
            <div class="profile-info-item">
              <Orbit :size="17" :stroke-width="2.4" aria-hidden="true" />
              <span>境界</span>
              <strong>{{ realmName(player.realm) }}</strong>
            </div>
            <button class="profile-info-item profile-progress" type="button" @click="openProgression" aria-label="查看每一层突破所需总经验">
              <Route :size="17" :stroke-width="2.4" aria-hidden="true" />
              <span>总经验</span>
              <Meter label="总经验" :value="player.xp" :max="derived.xpNeed" />
              <small>当前经验 {{ Math.floor(player.xp) }} / 总经验 {{ derived.xpNeed }}</small>
            </button>
            <div class="profile-info-item">
              <component :is="rootIconComponent(player.primaryRootKey || player.root?.key)" :size="17" :stroke-width="2.4" aria-hidden="true" />
              <span>灵根</span>
              <strong>{{ profileRootText }}</strong>
            </div>
          </div>
        </section>

        <section class="stats">
          <div
            class="stat"
            v-for="stat in stats"
            :key="stat.label"
            tabindex="0"
            :aria-label="`${stat.label}：${stat.help}`"
          >
            <StatIcon :name="stat.icon" :size="18" />
            <div>
              <b>{{ stat.value }}</b>
              <span>{{ stat.label }}</span>
            </div>
            <small class="stat-tip" role="tooltip">{{ stat.help }}</small>
          </div>
        </section>

        <section class="next-realm-card" aria-label="下一境界">
          <span>下一境界</span>
          <strong>{{ derived.nextRealm || realmName(player.realm + 1) }}</strong>
          <small>还需修为 {{ remainingXp }}</small>
        </section>

        <section class="breakthrough-count-card" aria-label="今日可突破次数">
          <span>今日可突破</span>
          <strong>{{ breakthroughAttemptsToday }} 次</strong>
          <small>{{ breakthroughAttemptHint }}</small>
          <button
            class="breakthrough-action"
            type="button"
            :disabled="!canBreakthroughNow || isActionPending('/api/breakthrough')"
            @click="submitBreakthrough"
          >
            {{ breakthroughActionText }}
          </button>
        </section>

        <section v-if="sidebarElixirEffects.length" class="elixir-effect-card" aria-label="当前丹药加成">
          <div class="elixir-effect-head">
            <span>丹药加成</span>
            <strong>{{ sidebarElixirEffects.length }} 项生效</strong>
          </div>
          <div class="elixir-effect-list">
            <div v-for="effect in sidebarElixirEffects" :key="effect.label" class="elixir-effect-item">
              <span>{{ effect.label }}</span>
              <strong>{{ effect.value }}</strong>
              <small>{{ effect.note }}</small>
            </div>
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
            @click="switchTab(tab.id)"
          >
            <component :is="tab.icon" :size="17" :stroke-width="2.3" aria-hidden="true" />
            {{ tab.label }}
          </button>
        </nav>

        <section v-if="activeTab === 'practice'" class="view active">
          <div class="home-dashboard">
            <article class="panel game-card scene-card scene-dungeon">
              <div class="section-head compact">
                <h3>历练副本</h3>
              </div>
              <div class="scene-copy">
                <h4>{{ featuredDungeon.title }}</h4>
                <div class="scene-status-list" aria-label="今日副本摘要">
                  <span v-for="item in featuredDungeon.summary" :key="item.key">
                    <b aria-hidden="true">{{ item.icon }}</b>
                    {{ item.text }}
                  </span>
                </div>
              </div>
              <button class="primary game-cta" type="button" @click="switchTab('dungeon')">查看副本</button>
            </article>

            <article class="panel game-card scene-card scene-sect">
              <div class="section-head compact">
                <h3>宗门</h3>
              </div>
              <div class="scene-copy">
                <h4>{{ player.sect || "落云宗" }}</h4>
                <p>攻守城 {{ gameState.sect?.warWins || 0 }}胜{{ gameState.sect?.warLosses || 0 }}负</p>
                <p>{{ homeSectTerritorySummary }}</p>
              </div>
              <button class="primary game-cta" type="button" @click="switchTab('sect')">进入宗门</button>
            </article>

            <article class="panel game-card duel-home">
              <div class="section-head compact">
                <h3>斗法场</h3>
              </div>
              <p>我的排名：{{ playerRank }}</p>
              <p>今日切磋：{{ todayDuelCount }} 场</p>
              <p>段位：<strong>{{ duelRankText(withDuelRank(player)) }}</strong></p>
              <div class="duel-mark" aria-hidden="true">⚔</div>
              <button class="primary game-cta" type="button" @click="switchTab('arena')">进入切磋</button>
            </article>

            <article class="panel game-card equipment-home">
              <div class="section-head compact">
                <h3>装备</h3>
                <button class="link-button" type="button" @click="switchTab('equipment')">查看全部 ›</button>
              </div>
              <div class="equipment-showcase">
                <div class="gear-slot" v-for="item in showcaseEquipment" :key="item.id" :class="`tier-${item.tier}`" :title="`${item.name} · ${item.statName} +${formatPercent(item.bonus)}`" :data-tooltip="`${item.name} · ${item.statName} +${formatPercent(item.bonus)}`" :aria-label="`${item.name}，${item.statName} +${formatPercent(item.bonus)}`">
                  <EquipmentIcon :id="item.id" :name="item.name" :slot="item.slot" :tier="item.tier" />
                  <span>+{{ Math.round((item.bonus || 0) * 100) }}</span>
                </div>
              </div>
            </article>

            <article class="panel game-card ranking-home">
              <div class="section-head compact">
                <h3>修士榜</h3>
                <button class="link-button" type="button" @click="switchTab('rank')">查看全部 ›</button>
              </div>
              <div class="rank-podium" aria-label="修士榜前三">
                <button
                  v-for="item in homePodium"
                  :key="item.id"
                  class="rank-podium-card"
                  :class="[`rank-${item.rank}`, { self: item.id === 'player' }]"
                  type="button"
                  @click="openPracticeRankItem(item)"
                >
                  <span class="rank-medal">{{ item.rank }}</span>
                  <CharacterPortrait :person="rankPerson(item)" size="lg" />
                  <b>{{ item.name }}</b>
                  <em>{{ realmName(rankPerson(item)?.realm) }}</em>
                  <strong>{{ formatCompact(item.value) }}</strong>
                </button>
              </div>
              <div class="home-rank-list" aria-label="修士榜排行">
                <button v-for="item in homeRankRows" :key="item.id" type="button" :class="{ self: item.id === 'player' }" @click="openPracticeRankItem(item)">
                  <span>{{ item.rank }}</span>
                  <b>{{ item.name }}</b>
                  <em>{{ realmName(rankPerson(item)?.realm) }}</em>
                  <strong>{{ formatCompact(item.value) }}</strong>
                </button>
              </div>
            </article>

            <article class="panel game-card log-home">
              <div class="section-head compact">
                <h3>战斗日志</h3>
                <label class="log-day-select" v-if="homeLogDayRecords.length">
                  <span>日期</span>
                  <input
                    v-model="selectedHomeLogDate"
                    type="date"
                    :min="homeLogMinDate"
                    :max="homeLogMaxDate"
                    step="1"
                    aria-label="选择日志日期"
                  />
                </label>
              </div>
              <div class="battle-log-list" v-if="homeLogs.length">
                <div v-for="(entry, index) in homeLogs" :key="`${entry.day}-${entry.time || ''}-${entry.text}-${index}`" :class="logTone(entry)">
                  <b>{{ logTone(entry) === "loss" ? "败" : "胜" }}</b>
                  <span
                    class="home-log-text"
                    :class="{ 'is-long': isLongHomeLogText(entry.text) }"
                    :title="homeLogTooltip(entry)"
                  >{{ entry.text }}</span>
                  <time :datetime="logEntryDateTime(entry)">{{ logEntryTimeText(entry) }}</time>
                </div>
              </div>
              <div class="battle-log-empty" v-else>
                <b>{{ selectedHomeLogDayRecord?.date || currentDate }}</b>
                <span>本日暂无战斗日志</span>
              </div>
              <LogPanel class="home-log-fallback" :logs="mainLogs" />
            </article>
          </div>
        </section>

        <section v-if="activeTab === 'cultivation'" class="view active cultivation-nav-surface">
          <div class="panel cultivation-nav-panel">
            <div class="segmented cultivation-subtabs" role="tablist" aria-label="修行体系子导航">
              <button
                v-for="tab in cultivationSubTabs"
                :key="tab.id"
                class="segment"
                :class="{ active: cultivationSubTab === tab.id }"
                type="button"
                role="tab"
                :aria-selected="cultivationSubTab === tab.id"
                @click="cultivationSubTab = tab.id"
              >
                <component :is="tab.icon" :size="16" :stroke-width="2.3" aria-hidden="true" />
                {{ tab.label }}
              </button>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'cultivation' && cultivationSubTab === 'attributes'" class="view active cultivation-surface attributes-surface">
          <div class="panel root-astrolabe-panel">
            <div class="section-head">
              <div>
                <h3>灵根说明</h3>
              </div>
            </div>

            <div class="root-astrolabe-layout">
              <div class="root-astrolabe" aria-label="九灵根星盘">
                <svg class="root-counter-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <marker id="rootArrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                      <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                  </defs>
                  <path
                    v-for="edge in rootChartEdges"
                    :key="`${edge.from}-${edge.to}`"
                    :class="{ active: edge.active, incoming: edge.incoming, outgoing: edge.outgoing }"
                    :d="`M ${edge.fromX} ${edge.fromY} L ${edge.toX} ${edge.toY}`"
                  />
                </svg>

                <button
                  v-for="node in rootAstrolabeNodes"
                  :key="node.key"
                  type="button"
                  class="root-counter-node"
                  :class="[
                    { highlighted: node.highlighted, special: node.special, owned: node.owned, primary: node.primary },
                    `root-icon-${node.key}`
                  ]"
                  :style="{ left: `${node.x}%`, top: `${node.y}%` }"
                  @mouseenter="hoveredRootKey = node.key"
                  @focus="hoveredRootKey = node.key"
                  @mouseleave="hoveredRootKey = ''"
                  @blur="hoveredRootKey = ''"
                >
                  <span class="root-ring-art" aria-hidden="true" :style="{ backgroundImage: `url(${rootIconPath(node.key)})` }"></span>
                  <span class="root-counter-orb" aria-hidden="true">
                    {{ node.shortName }}
                  </span>
                </button>
              </div>

              <aside class="root-detail-panel">
                <span class="root-detail-kicker">{{ hoveredRootDetail.special ? "特殊灵根" : "基础灵根" }}</span>
                <div class="root-detail-head">
                  <span class="root-detail-icon" :class="`root-icon-${hoveredRootDetail.key}`" aria-hidden="true">
                    <img :src="rootIconPath(hoveredRootDetail.key)" alt="">
                  </span>
                  <div>
                    <h4>{{ hoveredRootDetail.name }}</h4>
                  </div>
                </div>
                <p>{{ hoveredRootDetail.note }}</p>
                <div class="root-detail-stats">
                  <div>
                    <span>灵根加成</span>
                    <strong>{{ hoveredRootDetail.effectText }}</strong>
                  </div>
                  <div>
                    <span>受制灵根</span>
                    <strong>{{ hoveredRootDetail.counteredByText }}</strong>
                  </div>
                  <div>
                    <span>克制灵根</span>
                    <strong>{{ hoveredRootDetail.restrainsText }}</strong>
                  </div>
                </div>
                <p class="muted">战斗中被克者攻击、防御、神识最高降低 10%；跨大境界按 10%、5%、2.5% 逐级减半，最低 1%。</p>
              </aside>
            </div>
          </div>

        </section>

        <section v-if="activeTab === 'cultivation' && cultivationSubTab === 'progression'" class="view active cultivation-surface progression-surface">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>境界总览</h3>
              </div>
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
              </button>
            </div>
          </div>

          <section class="panel realm-stage" v-if="selectedRealmGroup">
            <div class="section-head compact">
              <div>
                <h3>{{ realmName(player.realm) }}</h3>
              </div>
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
                <span>{{ realm.xpNeed }}</span>
                <span>{{ realm.growthText }}</span>
                <span>{{ formatPercent(realm.baseBreakChance) }}</span>
              </div>
            </div>
          </section>
        </section>

        <section v-if="activeTab === 'tasks'" class="view active cultivation-surface tasks-surface quest-surface">
          <div class="panel task-command-panel">
            <header class="section-head task-page-head">
              <div class="task-title-block">
                <h3>现实任务</h3>
                <p>把现实里的行动结成修为、灵石与半月札记</p>
              </div>

              <div class="task-status-strip" aria-label="今日现实任务摘要">
                <div v-for="item in taskStatusCards" :key="item.label" class="task-status-card" :class="item.tone">
                  <img v-if="item.asset" class="task-ai-small-icon" :src="item.asset" alt="" aria-hidden="true">
                  <component v-else :is="item.icon" :size="18" :stroke-width="2.35" aria-hidden="true" />
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value }}</strong>
                  <small>{{ item.note }}</small>
                </div>
              </div>

              <div class="task-date-card">
                <strong>第 {{ gameState.day }} 天</strong>
                <span>{{ currentDateLabel }}</span>
                <button class="icon-button task-admin-button" type="button" title="管理现实任务" aria-label="管理现实任务" @click="openTaskAdmin">
                  <Settings :size="17" :stroke-width="2.4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <div class="task-system-grid">
              <section class="task-bounty-board" aria-label="今日悬赏">
                <header class="task-board-head">
                  <span>今日悬赏</span>
                </header>

                <div class="task-category-tabs" role="tablist" aria-label="现实任务类别">
                  <button
                    v-for="category in frontTaskCategories"
                    :key="category.id"
                    type="button"
                    class="task-category-tab"
                    :class="{ active: taskForm.category === category.id }"
                    role="tab"
                    :aria-selected="taskForm.category === category.id"
                    @click="selectTaskCategory(category.id)"
                  >
                    <img class="task-ai-round-icon" :src="taskCategoryAsset(category.id)" alt="" aria-hidden="true">
                    <span>{{ category.label }}</span>
                    <small>{{ taskCategoryCounts[category.id] || 0 }}</small>
                  </button>
                </div>

                <div v-if="enabledTaskDefinitions.length" class="task-bounty-layout">
                  <div v-if="filteredTaskDefinitions.length > 1" class="task-picker-panel" aria-label="可完成任务">
                    <header class="task-picker-head">
                      <span>{{ normalizedTaskCategory(taskForm.category) }}清单</span>
                      <small>{{ filteredTaskDefinitions.length }} 项</small>
                    </header>
                    <div class="task-scroll-list" role="list">
                      <button
                        v-for="task in filteredTaskDefinitions"
                        :key="task.id"
                        type="button"
                        class="task-scroll-item"
                        :class="{ active: selectedTaskDefinition?.id === task.id }"
                        :title="task.name"
                        :data-task-name="task.name"
                        @click="selectTaskDefinition(task.id)"
                      >
                        <span class="task-scroll-icon">
                          <img :src="taskIconAsset(task)" alt="" aria-hidden="true">
                        </span>
                        <span>
                          <strong>{{ task.name }}</strong>
                          <small>{{ task.type === "measurable" ? `标准 ${task.targetAmount} ${task.unitName}` : "完整完成一次" }}</small>
                        </span>
                        <em>修为 +{{ task.xpReward }}</em>
                      </button>
                    </div>
                  </div>

                  <form v-if="selectedTaskDefinition" class="task-bounty-detail" @submit.prevent="submitTask">
                    <span class="task-selected-ribbon">已选择</span>
                    <div class="task-detail-title">
                      <span class="task-detail-icon">
                        <img :src="taskIconAsset(selectedTaskDefinition)" alt="" aria-hidden="true">
                      </span>
                      <div>
                        <h4>{{ selectedTaskDefinition.name }}</h4>
                        <p>{{ selectedTaskDefinition.detail || selectedTaskTypeText }}</p>
                      </div>
                    </div>

                    <div class="task-detail-meta">
                      <span>{{ normalizedTaskCategory(selectedTaskDefinition.category) }}</span>
                      <span>{{ selectedTaskTypeText }}</span>
                      <span v-if="selectedTaskDefinition.type === 'measurable'">上限 x{{ formatMultiplier(selectedTaskDefinition.maxMultiplier || 1) }}</span>
                    </div>

                    <div v-if="selectedTaskDefinition.type === 'measurable'" class="task-amount-panel">
                      <div class="task-amount-head">
                        <span>任务量</span>
                        <strong>{{ formatTaskAmount(taskForm.completedAmount) }} {{ selectedTaskDefinition.unitName }}</strong>
                      </div>
                      <div class="task-amount-controls">
                        <button class="icon-button" type="button" aria-label="减少完成量" @click="adjustTaskAmount(-taskAmountStep)">
                          <Minus :size="16" :stroke-width="2.5" aria-hidden="true" />
                        </button>
                        <span class="task-amount-value">{{ formatTaskAmount(taskForm.completedAmount) }}</span>
                        <input
                          v-model.number="taskForm.completedAmount"
                          type="range"
                          min="0"
                          :max="taskAmountMax"
                          :step="taskAmountStep"
                          aria-label="完成量"
                        >
                        <button class="icon-button" type="button" aria-label="增加完成量" @click="adjustTaskAmount(taskAmountStep)">
                          <Plus :size="16" :stroke-width="2.5" aria-hidden="true" />
                        </button>
                        <span class="amount-unit">{{ selectedTaskDefinition.unitName }}</span>
                      </div>
                      <div class="task-progress-track" aria-hidden="true">
                        <span :style="{ width: `${taskAmountProgress}%` }"></span>
                      </div>
                      <div class="task-range-marks" aria-hidden="true">
                        <span v-for="mark in taskAmountMarks" :key="mark">{{ mark }}</span>
                      </div>
                      <label class="task-amount-input">手动输入
                        <input v-model.number="taskForm.completedAmount" type="number" min="0" :max="taskAmountMax" :step="taskAmountStep" :placeholder="`标准 ${selectedTaskDefinition.targetAmount}`">
                      </label>
                    </div>

                    <div v-else class="task-complete-panel">
                      <CheckCircle2 :size="28" :stroke-width="2.2" aria-hidden="true" />
                      <div>
                        <strong>完整完成一次</strong>
                        <span>该任务按一次结算，不需要填写完成量。</span>
                      </div>
                    </div>

                    <h4 class="task-reward-heading">奖励预览</h4>
                    <div class="task-reward-preview" aria-label="任务收益预览">
                      <div class="task-reward-token xp">
                        <img src="/assets/tasks/icon-life.svg" alt="" aria-hidden="true">
                        <span>修为经验</span>
                        <strong>+{{ taskRewardPreview.xp }}</strong>
                      </div>
                      <div class="task-reward-token spirit">
                        <img src="/assets/tasks/icon-crystal.svg" alt="" aria-hidden="true">
                        <span>灵石</span>
                        <strong>+{{ taskRewardPreview.spirit }}</strong>
                      </div>
                      <div class="task-reward-token elixir" :class="{ muted: taskRewardPreview.elixirMultiplier <= 1 }">
                        <img src="/assets/tasks/icon-elixir.svg" alt="" aria-hidden="true">
                        <span>加成</span>
                        <strong>x{{ formatMultiplier(taskRewardPreview.elixirMultiplier) }}</strong>
                      </div>
                    </div>

                    <div class="task-detail-footer">
                      <span v-if="taskRewardPreview.elixirMultiplier > 1">基础 +{{ taskRewardPreview.baseXp }}，药力加成后结算。</span>
                      <span v-else>当前未服用修为丹，按基础收益结算。</span>
                      <button class="primary task-complete-button" :disabled="isActionPending('/api/tasks') || !selectedTaskDefinition">
                        {{ isActionPending("/api/tasks") ? "结算中..." : "完成任务" }}
                      </button>
                    </div>
                  </form>
                </div>

                <div v-else class="task-empty-state">
                  <ScrollText :size="28" :stroke-width="2.2" aria-hidden="true" />
                  <strong>暂无可用现实任务</strong>
                  <span>可到后台添加任务定义，历史完成记录会继续保留。</span>
                  <button class="secondary" type="button" @click="openTaskAdmin">去后台配置</button>
                </div>
              </section>

              <section class="task-journal-panel" aria-label="半月札记（15天）">
                <div class="task-panel-ribbon">
                  <span>半月札记（15天）</span>
                </div>

                <div class="task-journal-list">
                  <section
                    v-for="day in recentTaskDays"
                    :key="day.day"
                    class="task-day-group"
                    :class="{ today: day.isToday, open: isTaskDayOpen(day), 'no-records': !day.tasks.length }"
                  >
                    <button
                      class="task-day-head"
                      type="button"
                      :aria-expanded="isTaskDayOpen(day)"
                      @click="toggleTaskDay(day)"
                    >
                      <div>
                        <strong>{{ day.isToday ? `第 ${day.day} 天` : day.day >= 1 ? `第 ${day.day} 天` : "开局前" }}</strong>
                        <span>{{ shortTaskDate(day.date) }}</span>
                      </div>
                      <em v-if="day.tasks.length">已完成</em>
                      <em v-else>未记录</em>
                      <component :is="ChevronDown" class="task-day-chevron" :size="18" :stroke-width="2.4" aria-hidden="true" />
                    </button>

                    <div v-if="day.tasks.length && isTaskDayOpen(day)" class="task-day-records">
                      <article class="task-record-card" v-for="task in day.tasks" :key="task.id || `${task.day}-${task.name}-${task.xp}`">
                        <span class="task-record-icon">
                          <img :src="taskIconAsset(task)" alt="" aria-hidden="true">
                        </span>
                        <div>
                          <div class="task-card-head">
                            <h3>{{ task.name }}</h3>
                            <small v-if="task.type === 'measurable'">{{ formatTaskAmount(task.completedAmount) }} {{ task.unitName }}</small>
                            <small v-else>1 次</small>
                          </div>
                          <span class="task-rewards" aria-label="任务收益">
                            <span class="task-reward xp">+经验 {{ task.xp }}</span>
                            <span class="task-reward spirit">+灵石 {{ task.spirit || 0 }}</span>
                          </span>
                        </div>
                      </article>
                    </div>

                    <div v-else-if="isTaskDayOpen(day)" class="task-day-empty">今日尚未完成任务</div>
                  </section>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'cultivation' && cultivationSubTab === 'skills'" class="view active cultivation-surface skills-surface">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>本命技能</h3>
              </div>
            </div>
            <div class="skill-hero" :class="{ 'has-skill-image': Boolean(skillAssetPath(playerSkill)) }" :style="skillVisualStyle(playerSkill)">
              <span class="skill-hero-icon" aria-hidden="true">
                <img v-if="skillAssetPath(playerSkill)" :src="skillAssetPath(playerSkill)" alt="">
                <span v-else>{{ skillGlyph(playerSkill) }}</span>
              </span>
              <div class="skill-hero-main">
                <strong>{{ playerSkill.name }}</strong>
                <span>{{ playerSkill.text }}</span>
                <div class="skill-meta-line">
                  <span>{{ skillRankText(skillUpgrade.rank) }}</span>
                  <span>消耗 {{ playerSkill.cost }} 法力</span>
                  <span>冷却 {{ playerSkill.cooldown }} 回合</span>
                </div>
              </div>
            </div>
            <div class="skill-upgrade-panel">
              <div class="skill-upgrade-summary">
                <span>当前 {{ skillRankText(skillUpgrade.rank) }}</span>
                <span>可升级境界：{{ skillUpgrade.next ? skillUpgradeRealmStageText(skillUpgrade) : "已满阶" }}</span>
                <span>消耗 {{ skillUpgrade.next ? `${skillUpgrade.cost} 灵石` : "无" }}</span>
                <span>成功率 {{ skillUpgrade.next ? formatPercent(skillUpgrade.chance) : "圆满" }}</span>
              </div>
              <div v-if="skillUpgrade.next" class="skill-upgrade-next">
                <p><strong>{{ skillRankText(skillUpgrade.targetRank) }}预览：</strong>{{ skillUpgrade.next.text }}</p>
                <small>法力 {{ playerSkill.cost }} → {{ skillUpgrade.next.cost }} · 冷却 {{ skillUpgrade.next.cooldown }} 回合</small>
              </div>
              <div class="actions skill-upgrade-actions">
                <button class="primary" :disabled="!canUpgradeSkill || isActionPending('/api/skills/upgrade')" @click="upgradeSkill">
                  {{ isActionPending("/api/skills/upgrade") ? "淬炼中..." : "升级技能" }}
                </button>
                <span class="meta">{{ skillUpgradeHint }}</span>
              </div>
            </div>
          </div>

          <div class="skill-grid">
            <article class="skill-card" v-for="skill in combatSkills" :key="skill.id" :class="{ active: skill.id === player.skillId }" :style="skillVisualStyle(skill)" tabindex="0">
              <div class="skill-card-head">
                <span class="skill-card-icon" aria-hidden="true">
                  <img v-if="skillAssetPath(skill)" :src="skillAssetPath(skill)" alt="">
                  <span v-else>{{ skillGlyph(skill) }}</span>
                </span>
                <div class="skill-card-title">
                  <strong>{{ skill.name }}</strong>
                  <span>法力 {{ skillPlan(skill).current?.cost || skill.cost }}</span>
                  <span>冷却 {{ skillPlan(skill).current?.cooldown || skill.cooldown }} 回合</span>
                </div>
                <span class="skill-rank-badge">{{ skillRankText(skillPlan(skill).rank) }}</span>
              </div>
              <p class="skill-card-effect">{{ skillPlan(skill).current?.text || skill.text }}</p>
              <div class="skill-rank-popover" role="tooltip">
                <div class="skill-rank-popover-head">
                  <strong>{{ skill.name }}升阶表</strong>
                  <span>悬停查看</span>
                </div>
                <div class="skill-rank-list">
                  <div class="skill-rank-row" v-for="rank in skillRankRows(skill)" :key="`${skill.id}-${rank.rank}`" :class="{ current: rank.rank === skillPlan(skill).rank }">
                    <div>
                      <strong>{{ skillRankText(rank.rank) }}</strong>
                      <small>{{ rank.requirementRealm }} · {{ skillRankCostText(rank) }} · {{ skillRankChanceText(rank) }}</small>
                    </div>
                    <p>{{ rank.skill.text }}</p>
                    <span>法力 {{ rank.skill.cost }} · 冷却 {{ rank.skill.cooldown }} 回合</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section v-if="activeTab === 'dungeon'" class="view active">
          <div v-if="isStarSeaBattle" class="battle-detail star-sea-battle-detail">
            <div class="panel battle-header">
              <div>
                <h3>乱星海围猎</h3>
                <p>{{ lastBattle.team?.name }} 对阵 {{ lastBattle.monster?.name }}，{{ starSeaBattleStatusText }}</p>
              </div>
              <div class="actions">
                <button class="secondary" @click="replayBattle">重播</button>
                <button class="primary" @click="returnFromBattle">{{ battleBackLabel }}</button>
              </div>
            </div>

            <div class="star-sea-battle-grid">
              <section class="panel flat star-sea-team-panel">
                <div class="section-head compact">
                  <div>
                    <h3>{{ lastBattle.team?.name }}</h3>
                    <p>排名 {{ lastBattle.team?.rank || "?" }} · 评分 {{ lastBattle.team?.score || 0 }} · 输出 {{ lastBattle.team?.damage || 0 }}</p>
                  </div>
                  <span class="tag">{{ starSeaAliveCount }} 人存活</span>
                </div>
                <div class="star-sea-member-list">
                  <article class="star-sea-member" v-for="member in starSeaMembers" :key="member.id" :class="{ fallen: starSeaMemberFrame(member).hp <= 0 }">
                    <CharacterPortrait :person="member" size="sm" />
                    <div>
                      <strong>{{ member.name }}</strong>
                      <small>{{ realmName(member.realm) }} · 输出 {{ starSeaMemberFrame(member).damage || 0 }}</small>
                      <Meter label="血量" icon="health" :value="starSeaMemberFrame(member).hp" :max="member.maxHp || 1" tone="health" />
                    </div>
                  </article>
                </div>
              </section>

              <section class="panel flat star-sea-monster-panel">
                <div class="star-sea-monster-card">
                  <div class="star-sea-monster-head">
                    <MonsterEmblem :monster="lastBattle.monster" size="lg" />
                    <div>
                      <span class="tag">妖物</span>
                      <h3>{{ lastBattle.monster?.name }}</h3>
                    <p>{{ lastBattle.monster?.realm }} · {{ lastBattle.monster?.rootName || "妖气" }}</p>
                    </div>
                  </div>
                  <div class="star-sea-monster-stats">
                    <div v-for="stat in starSeaMonsterStats" :key="stat.icon" :aria-label="`${stat.label} ${stat.value}`">
                      <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                      <span>{{ stat.label }}</span>
                      <b>{{ stat.value }}</b>
                    </div>
                  </div>
                  <Meter label="妖物血量" icon="health" :value="starSeaMonsterFrame.hp" :max="lastBattle.monster?.startHp || lastBattle.monster?.maxHp || 1" tone="health" />
                  <Meter label="妖物法力" icon="mana" :value="starSeaMonsterFrame.mana" :max="lastBattle.monster?.startMana || lastBattle.monster?.maxMana || 1" tone="focus" />
                </div>

                <div class="star-sea-round-summary">
                  <div>
                    <span>当前回合</span>
                    <b>{{ starSeaCurrentEvent?.round || 0 }}</b>
                    <small>{{ starSeaCurrentEvent?.text || "围猎尚未开始" }}</small>
                  </div>
                  <div>
                    <span>战斗结果</span>
                    <b>{{ lastBattle.result }}</b>
                    <small>{{ lastBattle.team?.success ? `${lastBattle.team.rounds} 回合击杀` : `造成 ${lastBattle.team?.damage || 0} 伤害` }}</small>
                  </div>
                </div>
              </section>
            </div>

            <div class="panel">
              <div class="battle-feed star-sea-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind]"
                >
                  <span>{{ event.round ? `第${event.round}回合` : "战报" }}</span>
                  <p>{{ event.text }}</p>
                  <small v-if="event.attacks?.length">本回合输出：{{ event.attacks.map((attack) => `${attack.name} ${attack.damage}`).join("、") }}</small>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="lastBattle && !(activeDungeonRecordTab === 'void' && selectedVoidHallRecord)" class="battle-detail rank-battle-detail">
            <div class="panel battle-header">
              <div>
                <h3>副本回合</h3>
                <p>{{ battleDisplayName(lastBattle.left) }} 对阵 {{ battleDisplayName(lastBattle.right) }}，{{ battleStatusText }}</p>
              </div>
              <div class="actions">
                <button class="secondary" @click="replayBattle">重播</button>
                <button class="primary" @click="returnFromBattle">{{ battleBackLabel }}</button>
              </div>
            </div>

            <div class="battle-line live">
              <div class="fighter">
                <MonsterEmblem v-if="isBattleMonster(lastBattle.left)" :monster="lastBattle.left" size="lg" />
                <CharacterPortrait v-else :person="battlePerson(lastBattle.left)" size="lg" />
                <strong>{{ battleDisplayName(lastBattle.left) }}</strong>
                <small>{{ realmName(lastBattle.left.realm) }} · 战力 {{ lastBattle.left.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.left.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillLabel(lastBattle.left) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="battleMax(lastBattle.left, 'hp')" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="battleMax(lastBattle.left, 'mana')" tone="focus" />
              </div>
              <div class="vs">{{ battleOutcomeLabel }}</div>
              <div class="fighter">
                <MonsterEmblem v-if="isBattleMonster(lastBattle.right)" :monster="lastBattle.right" size="lg" />
                <CharacterPortrait v-else :person="battlePerson(lastBattle.right)" size="lg" />
                <strong>{{ battleDisplayName(lastBattle.right) }}</strong>
                <small>{{ realmName(lastBattle.right.realm) }} · 战力 {{ lastBattle.right.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.right.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillLabel(lastBattle.right) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="battleMax(lastBattle.right, 'hp')" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="battleMax(lastBattle.right, 'mana')" tone="focus" />
              </div>
            </div>

            <div class="panel">
              <div class="battle-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind, skillEffectClass(event)]"
                  :style="skillEffectStyle(event)"
                >
                  <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                    <img v-if="skillEffectImage(event)" class="skill-cast-art" :src="skillEffectImage(event)" alt="">
                    <i :class="{ 'has-art': skillEffectImage(event) }">
                      <img v-if="skillEffectImage(event)" class="skill-cast-icon" :src="skillEffectImage(event)" alt="">
                      <span v-else>{{ skillEffectGlyph(event) }}</span>
                    </i>
                    <b>{{ skillEffectTitle(event) }}</b>
                  </div>
                  <span>{{ event.round ? `第${event.round}回合` : "战报" }}</span>
                  <p>{{ event.text }}</p>
                </div>
              </div>
            </div>
          </div>

          <template v-else>
          <div class="panel section-head">
            <div>
              <h3>副本闯关记录</h3>
              <p>每日副本战报。</p>
            </div>
            <div class="dungeon-day-nav">
              <button class="secondary" type="button" :disabled="!canShowPreviousDungeonDay" @click="showPreviousDungeonDay">前一日</button>
              <span class="tag">{{ selectedDungeonDay?.date || currentDate }}</span>
              <button class="secondary" type="button" :disabled="!canShowNextDungeonDay" @click="showNextDungeonDay">后一日</button>
            </div>
          </div>

          <div class="subtabs">
            <button
              v-for="tab in dungeonRecordTabs"
              :key="tab.id"
              type="button"
              class="segment"
              :class="{ active: activeDungeonRecordTab === tab.id }"
              @click="activeDungeonRecordTab = tab.id"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="dungeon-loot-toggle">
            <button class="secondary" type="button" @click="showDungeonLoot = !showDungeonLoot">
              {{ showDungeonLoot ? "收起装备池" : "展开装备池" }}
            </button>
          </div>

          <section class="panel dungeon-bestiary-panel" aria-label="副本妖物图鉴">
            <div class="section-head compact">
              <div>
                <h3>副本妖物图鉴</h3>
                <p>九境妖域 · {{ monsterImageEntries.length }} 种妖物</p>
              </div>
              <span class="tag">{{ dungeonMonsterStages.length }} 阶</span>
            </div>
            <div class="dungeon-bestiary-grid">
              <article class="bestiary-stage" v-for="stage in dungeonMonsterStages" :key="stage.name">
                <div class="bestiary-stage-title">
                  <strong>{{ stage.name }}</strong>
                  <span>第 {{ stage.stage + 1 }} 阶</span>
                </div>
                <div class="bestiary-monster-list">
                  <span class="bestiary-monster" v-for="monster in stage.monsters" :key="monster.name">
                    <MonsterEmblem :monster="monster" size="sm" />
                    <b>{{ monster.name }}</b>
                  </span>
                </div>
              </article>
            </div>
          </section>

          <div v-if="selectedDungeonDay && activeDungeonRecordTab === 'blood'" class="panel dungeon-record-panel">
            <div class="section-head compact">
              <div>
                <h3>血色禁地</h3>
                <p>洞窟战果 · 妖兽属性{{ showDungeonLoot ? " · 掉落池" : "" }}</p>
              </div>
              <span class="tag">{{ bloodTrialClearCount }} 人次通关</span>
            </div>
            <div class="dungeon-cave-list" v-if="selectedDungeonDay.bloodTrial?.caves?.length">
              <article class="dungeon-cave-card" v-for="cave in selectedDungeonDay.bloodTrial?.caves || []" :key="cave.cave">
                <div class="dungeon-monster-card">
                  <div class="monster-card-topline">
                    <span class="tag">第 {{ cave.cave }} 关</span>
                    <h3>{{ cave.name }}</h3>
                    <span class="tag cave-clear-tag" tabindex="0">
                      本日通过 {{ bloodCaveClearCount(cave) }} 人
                      <span class="cave-clear-tip" role="tooltip">
                        <template v-if="bloodCaveClearNames(cave).length">
                          {{ bloodCaveClearNames(cave).join("、") }}<template v-if="bloodCaveClearCount(cave) > bloodCaveClearNames(cave).length"> 等 {{ bloodCaveClearCount(cave) }} 人</template>
                        </template>
                        <template v-else>暂无通关者</template>
                      </span>
                    </span>
                  </div>
                  <div class="monster-portrait">
                    <MonsterEmblem :monster="cave.monster" />
                  </div>
                  <div class="monster-info-panel">
                    <div class="monster-identity-copy">
                      <h4 :title="cave.monster?.name || ''">{{ monsterShortName(cave.monster?.name) }}</h4>
                      <p :title="`${cave.monster?.realm || ''} · ${cave.monster?.rootName || ''}`">{{ cave.monster?.realm }} · {{ cave.monster?.rootName }}</p>
                    </div>
                    <div class="monster-stats">
                      <span v-for="stat in monsterStatItems(cave.monster)" :key="stat.icon" :aria-label="`${stat.label} ${stat.value}`" :title="`${stat.label}：${stat.value}`">
                        <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                        <em>{{ stat.label }}</em>
                        <b>{{ stat.value }}</b>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="cave-spirit-summary">
                  <strong>本关灵石包</strong>
                  <span>{{ bloodCaveSpiritText(cave) }}</span>
                </div>
                <section class="cave-loot-strip" v-if="showDungeonLoot && bloodCaveLootItems(cave).length" :aria-label="`第${cave.cave}关装备池`">
                  <span v-for="item in bloodCaveLootItems(cave)" :key="`${cave.cave}-${item.id}`" class="cave-loot-icon" :class="[`tier-${item.tier}`, { acquired: item.ownerId }]" tabindex="0">
                    <EquipmentIcon :id="item.id" :name="item.name" :slot="item.slot" :tier="item.tier" />
                    <span class="cave-loot-tip" role="tooltip">
                      <strong>{{ item.tierName }}「{{ item.name }}」</strong>
                      <small>{{ item.slotName }} · {{ item.statName }} +{{ formatPercent(item.bonus) }}</small>
                      <small>本关概率 {{ lootItemChanceText(item, cave.cave) }}</small>
                    </span>
                  </span>
                </section>
                <div class="blood-podium" v-if="bloodCaveEntries(cave).length">
                  <button
                    class="blood-podium-card"
                    :class="[`rank-${entry.rank}`, { failed: !entry.success, pending: entry.pending }]"
                    type="button"
                    v-for="(entry, index) in bloodCaveEntries(cave)"
                    :key="`${cave.cave}-${entry.id}-${entry.rank}`"
                    :disabled="!hasReplay(entry)"
                    @click="openBloodCaveReplay(entry)"
                  >
                    <span class="podium-rank" aria-hidden="true">{{ podiumRankIcon(entry.rank) }}</span>
                    <CharacterPortrait :person="bloodEntryPerson(entry)" size="lg" />
                    <strong>{{ entry.name }}</strong>
                    <small>{{ bloodEntryBattleText(entry) }}</small>
                    <em v-if="entry.success && !entry.pending">+{{ entry.spirit || 0 }} 灵石<span v-if="entry.bonusSpirit"> · 奖金 +{{ entry.bonusSpirit }}</span><span v-if="entry.item"> · {{ entry.tierName }}「{{ entry.item }}」</span></em>
                    <em v-else-if="entry.pending">上一关通关，待挑战此关</em>
                    <em v-else>未获奖励</em>
                  </button>
                </div>
                <div v-else class="empty compact-empty">无人进入此关。</div>
              </article>
            </div>
            <div v-else class="empty">旧日残卷，妖兽明细缺失。</div>
          </div>

          <div v-else-if="selectedDungeonDay && activeDungeonRecordTab === 'void'" class="panel dungeon-record-panel">
            <div class="section-head compact">
              <div>
                <h3>虚天殿</h3>
                <p>宗门车轮战 · 妖物记录</p>
              </div>
              <span class="tag">{{ voidHallSuccessCount }} 宗通关</span>
            </div>
            <section v-if="dungeonLootPool('void_hall')" class="void-loot-panel">
              <template v-if="showDungeonLoot">
                <div class="loot-pool-head">
                  <div>
                    <strong>装备池</strong>
                    <span>{{ dungeonLootPool('void_hall').sourceText }}</span>
                  </div>
                  <em>通关妖物后结算</em>
                </div>
                <div class="cave-loot-strip void-loot-strip" aria-label="虚天殿装备池">
                  <span v-for="item in voidHallLootItems" :key="item.id" class="cave-loot-icon" :class="[`tier-${item.tier}`, { acquired: item.ownerId }]" tabindex="0">
                    <EquipmentIcon :id="item.id" :name="item.name" :slot="item.slot" :tier="item.tier" />
                    <span class="cave-loot-tip" role="tooltip">
                      <strong>{{ item.tierName }}「{{ item.name }}」</strong>
                      <small>{{ item.tierName }} · {{ item.statName }} +{{ formatPercent(item.bonus) }}</small>
                      <small v-for="line in voidHallItemChanceLines(item)" :key="`${item.id}-${line}`">{{ line }}</small>
                    </span>
                  </span>
                </div>
              </template>
              <div class="void-spirit-grid" aria-label="虚天殿灵石包">
                <span v-for="line in voidHallSpiritLines" :key="line">{{ line }}</span>
              </div>
            </section>

            <div v-if="selectedVoidHallRecord" class="void-hall-detail">
              <div class="section-head compact">
                <div>
                  <h3>{{ selectedVoidHallRecord.sect }} · 车轮战</h3>
                  <p>{{ selectedVoidHallRecord.monster }} · {{ selectedVoidHallRecord.monsterRealm }}，总输出 {{ selectedVoidHallRecord.totalDamage }}，妖物剩余血量 {{ voidHallRemainingHp(selectedVoidHallRecord) }}。</p>
                </div>
                <button class="primary" type="button" @click="closeVoidHallRecord">返回虚天殿</button>
              </div>
              <div class="wheel-battle-console void-wheel-console" v-if="voidHallBattles(selectedVoidHallRecord).length">
                <section class="duel-match-board wheel-battle-board">
                  <div class="duel-board-title">
                    <div>
                      <h3>虚天殿车轮战</h3>
                      <span>{{ voidHallBattles(selectedVoidHallRecord).length }} 场挑战</span>
                    </div>
                    <span>{{ selectedVoidHallRecord.success ? "通关" : "未通关" }}</span>
                  </div>
                  <div class="match-list wheel-match-list">
                    <button
                      class="match-card duel-match-card void-battle-card"
                      type="button"
                      v-for="battle in voidHallBattles(selectedVoidHallRecord)"
                      :key="`${selectedVoidHallRecord.sect}-${battle.order}`"
                      :disabled="!hasReplay(battle)"
                      :class="{
                        active: lastBattle?.replayId && battle.replayId === lastBattle.replayId,
                        replayable: hasReplay(battle),
                        'left-won': voidHallBattleLeftWon(battle),
                        'right-won': !voidHallBattleLeftWon(battle)
                      }"
                      @click="openReplay(battle, null, captureBattleReturn())"
                    >
                      <div class="match-person duel-combatant void-combatant" :class="{ winner: voidHallBattleLeftWon(battle) }">
                        <CharacterPortrait :person="voidHallBattleChallengerPerson(battle)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ battle.challenger?.name || battle.name || "参战修士" }}<span v-if="battle.challenger?.id === player.id">我</span></strong>
                          <small>{{ realmName(voidHallBattleChallengerPerson(battle).realm) }}</small>
                          <small>战力 {{ personPower(voidHallBattleChallengerPerson(battle)) }}</small>
                        </div>
                      </div>
                      <div class="duel-match-vs void-match-vs">
                        <strong>VS</strong>
                        <span>第 {{ battle.order }} 战</span>
                      </div>
                      <div class="match-person duel-combatant void-combatant void-monster-combatant" :class="{ winner: !voidHallBattleLeftWon(battle) }">
                        <MonsterEmblem :monster="voidHallBattleMonster(selectedVoidHallRecord)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ selectedVoidHallRecord.monster }}</strong>
                          <small>{{ selectedVoidHallRecord.monsterRealm }}</small>
                          <small>战力 {{ voidHallMonsterPower(selectedVoidHallRecord) }}</small>
                        </div>
                      </div>
                      <div class="duel-result-stamp" :class="voidHallBattleLeftWon(battle) ? 'win' : 'loss'">{{ voidHallBattleLeftWon(battle) ? "胜利" : "失败" }}</div>
                      <div class="void-output-stamp">
                        <span>输出</span>
                        <strong>{{ battle.damage || 0 }}</strong>
                      </div>
                      <span class="duel-replay-button" aria-hidden="true"><i>▶</i><b>回放</b></span>
                    </button>
                  </div>
                </section>
                <section class="duel-replay-panel sect-war-replay-panel wheel-replay-panel" :class="{ live: lastBattle }">
                  <div class="duel-replay-title">
                    <div>
                      <h3>虚天殿实况</h3>
                      <p>{{ lastBattle ? `${battleDisplayName(lastBattle.left)} 对阵 ${battleDisplayName(lastBattle.right)}，${battleStatusText}` : "选择左侧场次查看战斗回放。" }}</p>
                    </div>
                    <div class="duel-replay-actions" v-if="lastBattle">
                      <button class="secondary" @click="replayBattle">重播</button>
                      <button class="primary" @click="closeBattleReplay">关闭回放</button>
                    </div>
                  </div>

                  <div v-if="replayLoading" class="replay-loading-panel duel-loading">
                    <div class="loading-orb" aria-hidden="true"></div>
                    <h3>正在读取战斗回放</h3>
                    <p>战报玉简正在展开，请稍候。</p>
                  </div>

                  <template v-else-if="lastBattle">
                    <div class="duel-arena-stage">
                      <div class="duel-fighter left">
                        <MonsterEmblem v-if="isBattleMonster(lastBattle.left)" :monster="lastBattle.left" size="lg" />
                        <CharacterPortrait v-else :person="battlePerson(lastBattle.left)" size="lg" />
                        <strong>{{ battleDisplayName(lastBattle.left) }}</strong>
                        <small v-if="lastBattle.left.sect">{{ lastBattle.left.sect }}</small>
                        <small>{{ realmName(lastBattle.left.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.left)} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                        </div>
                        <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="battleMax(lastBattle.left, 'hp')" tone="health" />
                        <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="battleMax(lastBattle.left, 'mana')" tone="focus" />
                      </div>
                      <div class="duel-live-center">
                        <strong>VS</strong>
                        <span>{{ battleOutcomeLabel }}</span>
                        <small>{{ battleStatusText }}</small>
                      </div>
                      <div class="duel-fighter right">
                        <MonsterEmblem v-if="isBattleMonster(lastBattle.right)" :monster="lastBattle.right" size="lg" />
                        <CharacterPortrait v-else :person="battlePerson(lastBattle.right)" size="lg" />
                        <strong>{{ battleDisplayName(lastBattle.right) }}</strong>
                        <small v-if="lastBattle.right.sect">{{ lastBattle.right.sect }}</small>
                        <small>{{ realmName(lastBattle.right.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.right)} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                        </div>
                        <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="battleMax(lastBattle.right, 'hp')" tone="health" />
                        <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="battleMax(lastBattle.right, 'mana')" tone="focus" />
                      </div>
                    </div>

                    <div class="duel-skill-row">
                      <div class="skill-chip" tabindex="0">
                        <span class="skill-chip-icon" aria-hidden="true">
                          <img v-if="skillIconPath(lastBattle.left)" :src="skillIconPath(lastBattle.left)" alt="">
                          <span v-else>{{ skillIconGlyph(lastBattle.left) }}</span>
                        </span>
                        <span class="skill-chip-title">{{ skillLabel(lastBattle.left) }}</span>
                        <small>挑战 (1)</small>
                        <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left) }}</span>
                      </div>
                      <div class="skill-chip" tabindex="0">
                        <span class="skill-chip-icon" aria-hidden="true">
                          <img v-if="skillIconPath(lastBattle.right)" :src="skillIconPath(lastBattle.right)" alt="">
                          <span v-else>{{ skillIconGlyph(lastBattle.right) }}</span>
                        </span>
                        <span class="skill-chip-title">{{ skillLabel(lastBattle.right) }}</span>
                        <small>妖物 (2)</small>
                        <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right) }}</span>
                      </div>
                    </div>

                    <div class="battle-feed duel-battle-feed">
                      <div
                        class="battle-event"
                        v-for="(event, index) in displayedBattleEvents"
                        :key="`${index}-${event.text}`"
                        :class="[event.kind, skillEffectClass(event)]"
                        :style="skillEffectStyle(event)"
                      >
                        <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                          <img v-if="skillEffectImage(event)" class="skill-cast-art" :src="skillEffectImage(event)" alt="">
                          <i :class="{ 'has-art': skillEffectImage(event) }">
                            <img v-if="skillEffectImage(event)" class="skill-cast-icon" :src="skillEffectImage(event)" alt="">
                            <span v-else>{{ skillEffectGlyph(event) }}</span>
                          </i>
                          <b>{{ skillEffectTitle(event) }}</b>
                          <strong v-if="skillDamageText(event)" class="skill-cast-damage">{{ skillDamageText(event) }}</strong>
                        </div>
                        <span>{{ event.round ? `回合 ${event.round}` : "回合 1" }}</span>
                        <p>{{ event.text }}</p>
                      </div>
                    </div>
                  </template>

                  <div v-else class="duel-preview wheel-replay-empty">
                    <div class="duel-arena-stage preview">
                      <div class="duel-fighter left">
                        <strong>{{ selectedVoidHallRecord.sect }}</strong>
                        <small>挑战宗门</small>
                      </div>
                      <div class="duel-live-center">
                        <strong>VS</strong>
                        <span>{{ selectedVoidHallRecord.monsterRealm }}</span>
                        <small>{{ monsterShortName(selectedVoidHallRecord.monster) }}</small>
                      </div>
                      <div class="duel-fighter right">
                        <MonsterEmblem :monster="voidHallBattleMonster(selectedVoidHallRecord)" size="lg" />
                        <strong>{{ monsterShortName(selectedVoidHallRecord.monster) }}</strong>
                        <small>虚天殿妖物</small>
                      </div>
                    </div>
                    <div class="duel-skill-row muted-row">
                      <span>选择左侧车轮战</span>
                      <span>战斗实况将在此展开</span>
                    </div>
                    <div class="battle-feed duel-battle-feed preview-feed">
                      <div class="battle-event">
                        <span>候场</span>
                        <p>点击左侧任意一战查看回放。</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              <button v-else-if="hasReplay(selectedVoidHallRecord)" class="event event-button void-overview-button" type="button" @click="openReplay(selectedVoidHallRecord)">
                查看虚天殿合战。
              </button>
              <div v-else class="empty compact-empty">这条记录没有保存可回放战报。</div>
            </div>

            <div v-else class="sect-dungeon-list">
              <article class="sect-dungeon-card" v-for="record in sortedVoidHallRecords" :key="record.sect" :class="{ success: record.success }">
                <div class="section-head compact">
                  <div>
                    <h3>{{ record.sect }}</h3>
                    <p>{{ record.monster }} · {{ record.monsterRealm }} · {{ record.success ? "通关" : "未通关" }}<span v-if="record.highestRealmName"> · 宗门最高 {{ record.highestRealmName }}</span></p>
                  </div>
                  <span class="tag">{{ record.success ? `分润 +${record.spiritShare || 0}` : "未通关无分润" }}</span>
                </div>
                <div class="attribute-list compact">
                  <button class="dungeon-monster-card compact void-monster-button" type="button" @click="openVoidHallRecord(record)">
                    <div class="monster-card-topline">
                      <span class="tag">妖兽</span>
                      <h3>虚天殿</h3>
                      <span class="tag">{{ record.success ? "已通关" : "未通关" }}</span>
                    </div>
                    <div class="monster-portrait">
                      <MonsterEmblem :monster="{ name: record.monster, rootName: record.monsterStats?.rootName }" />
                    </div>
                    <div class="monster-info-panel">
                      <div class="monster-identity-copy">
                        <h4 :title="record.monster">{{ monsterShortName(record.monster) }}</h4>
                        <p :title="`${record.monsterRealm} · ${record.monsterStats?.rootName || '未知灵根'}`">{{ record.monsterRealm }} · {{ record.monsterStats?.rootName || "未知灵根" }}</p>
                      </div>
                      <div class="monster-stats">
                        <span v-for="stat in monsterStatItems(record.monsterStats)" :key="stat.icon" :aria-label="`${stat.label} ${stat.value}`" :title="`${stat.label}：${stat.value}`">
                          <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                          <em>{{ stat.label }}</em>
                          <b>{{ stat.value }}</b>
                        </span>
                      </div>
                    </div>
                  </button>
                  <div class="attribute-row">
                    <span>总输出</span>
                    <b>{{ record.totalDamage }}</b>
                    <small>妖物血量 {{ record.monsterStats?.maxHp || record.requiredDamage || "?" }} · 剩余 {{ voidHallRemainingHp(record) }}</small>
                  </div>
                  <div class="attribute-row" v-if="record.success">
                    <span>灵石包</span>
                    <b>{{ voidHallSectSpirit(record) }}</b>
                    <small>本境界总池 {{ record.spiritPool || `${record.spiritPoolRange?.min || 0}-${record.spiritPoolRange?.max || 0}` }} · {{ voidHallMemberSpiritText(record) }}</small>
                  </div>
                  <div class="attribute-row" v-if="record.item">
                    <span>装备</span>
                    <b>{{ record.item }}</b>
                    <small>{{ record.itemOwner }} · {{ record.tierName }}</small>
                  </div>
                </div>
                <div class="blood-podium void-podium" v-if="voidHallTopEntries(record).length">
                  <div
                    class="blood-podium-card"
                    :class="`rank-${entry.rank}`"
                    v-for="entry in voidHallTopEntries(record)"
                    :key="`${record.sect}-${entry.id}-${entry.rank}`"
                  >
                    <span class="podium-rank" aria-hidden="true">{{ podiumRankIcon(entry.rank) }}</span>
                    <CharacterPortrait :person="bloodEntryPerson(entry)" size="lg" />
                    <strong>{{ entry.name }}</strong>
                    <small>输出 {{ entry.damage || 0 }}</small>
                    <em>{{ record.success ? "宗门通关" : "未破殿门" }}</em>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div v-else-if="selectedDungeonDay && activeDungeonRecordTab === 'sea'" class="panel dungeon-record-panel">
            <div class="section-head compact">
              <div>
                <h3>乱星海猎妖</h3>
                <p>十日一队，所有队伍挑战同一只妖物；击杀、回合数和输出共同决定排名。</p>
              </div>
              <span class="tag">{{ selectedDungeonDay.public?.killed || 0 }} 队击杀</span>
            </div>
            <section v-if="dungeonLootPool('star_sea')" class="loot-pool">
              <div v-if="showDungeonLoot" class="loot-pool-head">
                <div>
                  <strong>装备池</strong>
                  <span>{{ dungeonLootPool('star_sea').sourceText }}</span>
                </div>
                <em>每日 {{ formatLootPercent(starSeaDropChance) }} 概率竞拍</em>
              </div>
              <div class="loot-pool-summary">
                <span v-if="showDungeonLoot">{{ dungeonLootPool('star_sea').acquiredCount || 0 }} 已获取</span>
                <span v-if="showDungeonLoot">{{ dungeonLootPool('star_sea').remainingCount || 0 }} 未获取</span>
                <span v-for="line in starSeaSpiritLines" :key="line">{{ line }}</span>
              </div>
              <div v-if="showDungeonLoot" class="loot-pool-items">
                <span v-for="item in starSeaLootItems" :key="item.id" class="loot-pool-item" :class="[{ acquired: item.ownerId }, `tier-${item.tier}`]">
                  <EquipmentIcon :id="item.id" :name="item.name" :slot="item.slot" :tier="item.tier" />
                  <span>
                    <b>{{ item.name }} <em>{{ item.tierName }}</em></b>
                    <small>{{ item.statName }} +{{ formatPercent(item.bonus) }} · {{ item.value || 200 }} 灵石</small>
                  </span>
                </span>
              </div>
            </section>
            <div class="grid dungeon-sea-grid">
              <div class="panel flat star-sea-overview-panel">
                <h3>猎妖概览</h3>
                <div class="star-sea-overview-line">
                  <div class="monster-strip compact-monster-strip" v-if="selectedDungeonDay.public?.monsters?.length">
                    <div class="monster-chip with-emblem" v-for="monster in selectedDungeonDay.public.monsters" :key="monster.id || monster.name">
                      <MonsterEmblem :monster="monster" size="sm" />
                      <span>
                        <strong>{{ monster.name }}</strong>
                        <span>{{ monster.realm }} · {{ monster.rootName }}</span>
                        <small>血 {{ monster.maxHp }} / 攻 {{ monster.attack }} / 防 {{ monster.defense }} / 神 {{ monster.divineSense }}</small>
                      </span>
                    </div>
                  </div>
                  <div class="star-sea-summary-chip" v-if="selectedDungeonDay.public?.cycle">
                    <span>队伍周期</span>
                    <b>第 {{ selectedDungeonDay.public.cycle }} 期</b>
                    <small>第 {{ selectedDungeonDay.public.cycleStartDay }} 日至第 {{ selectedDungeonDay.public.cycleEndDay }} 日 · {{ selectedDungeonDay.public.teamSize || 10 }} 人一队</small>
                  </div>
                  <div class="star-sea-summary-chip">
                    <span>总贡献</span>
                    <b>{{ selectedDungeonDay.public?.totalDamage || 0 }}</b>
                    <small>{{ selectedDungeonDay.public?.teams?.length || 0 }} 支队伍合计</small>
                  </div>
                  <div class="star-sea-summary-chip">
                    <span>装备</span>
                    <b>{{ starSeaTodayEquipmentName }}</b>
                    <small>{{ starSeaTodayEquipmentText }}</small>
                  </div>
                  <div class="star-sea-summary-chip" v-if="selectedDungeonDay.public?.item">
                    <span>竞拍</span>
                    <b>{{ selectedDungeonDay.public?.itemOwner || "无人获得" }}</b>
                    <small>{{ starSeaAuctionText }}</small>
                  </div>
                </div>
              </div>
              <div class="panel flat sea-team-rank">
                <h3>队伍排名</h3>
                <div class="timeline compact-list">
                  <button class="event event-button" type="button" v-for="team in starSeaTeamRanking" :key="team.id || team.name" :disabled="!hasReplay(team) && !hasReplay(selectedDungeonDay.public)" @click="openStarSeaTeamReplay(team)">
                    <strong>{{ team.rank }}. {{ team.name }}</strong>
                    <span>评分 {{ team.score }} · 输出 {{ team.damage }} · {{ team.success ? `${team.rounds} 回合击杀` : "未击杀" }} · 队伍 +{{ team.spirit }} 灵石</span>
                  </button>
                </div>
              </div>
              <div class="panel flat sea-personal-rank">
                <h3>个人输出</h3>
                <div class="timeline compact-list">
                  <button class="event event-button" type="button" v-for="entry in selectedDungeonDay.public?.top || []" :key="entry.id" :disabled="!hasReplay(selectedDungeonDay.public)" @click="openReplay(selectedDungeonDay.public)">
                    <strong>{{ entry.name }}</strong>
                    <span>{{ entry.teamName || entry.sect }} · 输出 {{ entry.damage }} · +{{ entry.spirit }} 灵石</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="panel empty">
            暂无副本战报。
          </div>
          </template>

        </section>

        <section v-if="activeTab === 'sect'" class="view active sect-war-room">
          <div class="panel section-head compact sect-command-header">
            <div class="sect-command-title">
              <h3>宗门疆域</h3>
              <p>各宗门每日会随机攻打一处省级行政区；无主之地直接占领，有主之地按守城者车轮战结算。</p>
            </div>
            <div class="sect-command-stats" aria-label="宗门疆域概览">
              <span>
                <small>已占领</small>
                <strong>{{ provinceTerritories.length ? `${occupiedProvinceCount} / ${provinceTerritories.length}` : "读取中" }}</strong>
              </span>
              <span>
                <small>参战宗门</small>
                <strong>{{ sectSummaries.length || "读取中" }}</strong>
              </span>
              <span>
                <small>今日战况</small>
                <strong v-if="provinceWarRecords.length">攻 {{ todayProvinceWarSummary.captured }} / 守 {{ todayProvinceWarSummary.defended }}</strong>
                <strong v-else>读取中</strong>
              </span>
            </div>
          </div>

          <div class="subtabs sect-command-tabs" role="tablist" aria-label="宗门疆域子导航">
            <button
              v-for="tab in sectSubTabs"
              :key="tab.id"
              type="button"
              class="segment"
              :class="{ active: activeSectSubTab === tab.id }"
              @click="activeSectSubTab = tab.id"
            >
              <i aria-hidden="true">{{ tab.icon }}</i>
              {{ tab.label }}
            </button>
          </div>

          <div v-if="activeSectSubTab === 'map'" class="panel map-panel sect-system-panel sect-map-panel">
            <div class="map-shell">
              <div class="map-toolbar">
                <span>势力地图</span>
                <button class="secondary map-fullscreen-button" type="button" @click="openMapFullscreen">全屏地图</button>
              </div>
              <div class="sect-map-stage">
                <div ref="normalMapMount" class="map-normal-mount">
                  <div ref="chinaMapRef" class="china-map" role="img" aria-label="中国省级行政区宗门占领图"></div>
                </div>
                <aside class="sect-map-intel" aria-label="势力地图情报">
                  <div>
                    <small>占领进度</small>
                    <strong>{{ occupiedProvinceCount }} / {{ provinceTerritories.length }}</strong>
                    <span>无主之地 {{ provinceTerritories.length - occupiedProvinceCount }} 处</span>
                  </div>
                  <div>
                    <small>疆域首席</small>
                    <strong>{{ topSectTerritories[0]?.name || "暂无" }}</strong>
                    <span>{{ topSectTerritories[0]?.provinceCount || 0 }} 省</span>
                  </div>
                  <div>
                    <small>资源首位</small>
                    <strong>{{ topProvinceResourcePreview[0]?.name || "暂无" }}</strong>
                    <span>{{ topProvinceResourcePreview[0]?.effect?.text || "暂无占领收益" }}</span>
                  </div>
                </aside>
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

          <div v-else-if="activeSectSubTab === 'sects'" class="panel sect-system-panel sect-rank-panel">
            <div class="section-head compact sect-panel-title">
              <div>
                <h3>宗门排行</h3>
              </div>
              <span class="tag">{{ sectTerritoryRanking.length }} 宗</span>
            </div>
            <div class="sect-rank-table-head">
              <span>排名</span>
              <span>宗门</span>
              <span>已占领</span>
              <span>灵石总包</span>
              <span>经验总包</span>
              <span>突破总包</span>
              <span>主要占领省份</span>
            </div>
            <div class="sect-territory-list sect-rank-table">
              <article v-for="(sect, index) in sectTerritoryRanking" :key="sect.name" class="sect-territory-card" :style="{ '--sect-color': sectColor(sect.name) }">
                <div class="sect-territory-rank">
                  <span class="sect-rank-medal">{{ index + 1 }}</span>
                </div>
                <div class="sect-rank-name">
                  <span class="sect-emblem" :style="{ background: sectColor(sect.name) }">{{ sect.name.slice(0, 1) }}</span>
                  <strong>{{ sect.name }}</strong>
                </div>
                <span class="rank-number">{{ sect.provinceCount }}</span>
                <span class="resource-pill spirit" aria-label="灵石总包">
                  <Coins :size="18" :stroke-width="2.6" aria-hidden="true" />
                  <b>{{ resourcePlanValue(sect.resourcePlan?.spirit, "spirit") }}</b>
                </span>
                <span class="resource-pill xp" aria-label="经验总包">
                  <Sparkles :size="18" :stroke-width="2.6" aria-hidden="true" />
                  <b>{{ resourcePlanValue(sect.resourcePlan?.xp, "xp") }}</b>
                </span>
                <span class="resource-pill breakthrough" aria-label="突破总包">
                  <Zap :size="18" :stroke-width="2.6" aria-hidden="true" />
                  <b>{{ resourcePlanValue(sect.resourcePlan?.breakthrough, "breakthrough") }}</b>
                </span>
                <p v-if="sect.provinceHighlights.length" class="sect-province-highlights">
                  <span v-for="province in sect.provinceHighlights" :key="`${sect.name}-${province.id}`" class="sect-province-highlight">
                    <span class="gdp-tier-badge compact" :class="`tier-${province.tier.toLowerCase()}`">{{ province.tier }}</span>
                    <span>{{ province.shortName }}</span>
                  </span>
                </p>
                <p v-else>暂无占领省份</p>
              </article>
            </div>
          </div>

          <div v-else-if="activeSectSubTab === 'provinces'" class="panel sect-system-panel sect-province-panel">
            <div class="section-head compact sect-panel-title">
              <div>
                <h3>省份资源</h3>
              </div>
              <span class="tag">{{ provinceTerritories.length }} 省</span>
            </div>
            <div class="province-filter-bar" aria-label="省份资源筛选">
              <label>加成类型
                <select v-model="provinceResourceTypeFilter">
                  <option value="">全部加成</option>
                  <option value="spirit">灵石</option>
                  <option value="xp">经验</option>
                  <option value="breakthrough">突破</option>
                </select>
              </label>
              <label>占领宗门
                <select v-model="provinceResourceOwnerFilter">
                  <option value="">全部宗门</option>
                  <option value="__none">无主之地</option>
                  <option v-for="owner in provinceResourceOwnerOptions" :key="owner" :value="owner">{{ owner }}</option>
                </select>
              </label>
              <button
                v-if="provinceResourceTypeFilter || provinceResourceOwnerFilter"
                class="secondary province-filter-clear"
                type="button"
                @click="clearProvinceResourceFilters"
              >
                重置
              </button>
            </div>
            <div class="province-table">
              <div class="province-table-head">
                <span>排名</span>
                <span>省份</span>
                <span>GDP档位</span>
                <span>加成</span>
                <span>占领宗门</span>
                <span>守城人员</span>
              </div>
              <div v-for="(territory, index) in filteredProvinceResourceRanking" :key="territory.id" class="province-table-row" :style="{ '--sect-color': sectColor(territory.owner) }">
                <span class="province-rank-number">{{ index + 1 }}</span>
                <strong>{{ territory.name }}</strong>
                <span class="gdp-tier-badge" :class="`tier-${provinceGdpTier(territory.rank).toLowerCase()}`">{{ provinceGdpTier(territory.rank) }}</span>
                <span class="province-resource-bonus" :class="territory.effect.type" :aria-label="provinceResourceTotalLabel(territory.effect)">
                  <component :is="provinceResourceIcon(territory.effect.type)" :size="17" :stroke-width="2.7" aria-hidden="true" />
                  <b>{{ provinceResourceTotalValue(territory.effect) }}</b>
                </span>
                <span class="province-owner-name">{{ territory.owner || "无主之地" }}</span>
                <span class="defender-stack" v-if="defendersFor(territory).length">
                  <span
                    v-for="defender in defendersFor(territory)"
                    :key="`${territory.id}-${defender.id}`"
                    class="defender-chip icon-only"
                    :title="defenderTooltip(defender)"
                    :aria-label="defenderTooltip(defender)"
                    tabindex="0"
                  >
                    <CharacterPortrait :person="defender" size="xs" />
                    <span class="defender-tooltip" role="tooltip">{{ defenderTooltip(defender) }}</span>
                  </span>
                </span>
                <span v-else>未派驻</span>
              </div>
              <div v-if="!filteredProvinceResourceRanking.length" class="empty province-filter-empty">没有符合筛选条件的省份。</div>
            </div>
          </div>

          <div v-else-if="lastBattle && !selectedProvinceWar" class="sect-war-replay-shell">
            <section class="duel-replay-panel live sect-war-replay-panel">
              <div class="duel-replay-title">
                <div>
                  <h3>攻城实况</h3>
                  <p>{{ lastBattle.left.name }} 对阵 {{ lastBattle.right.name }}，{{ battleStatusText }}</p>
                </div>
                <div class="duel-replay-actions">
                  <button class="secondary" @click="replayBattle">重播</button>
                  <button class="primary" @click="returnFromBattle">{{ battleBackLabel }}</button>
                </div>
              </div>

              <div class="duel-arena-stage">
                <div class="duel-fighter left">
                  <CharacterPortrait :person="battlePerson(lastBattle.left)" size="lg" />
                  <strong>{{ lastBattle.left.name }}</strong>
                  <small>{{ lastBattle.left.sect }}</small>
                  <small>{{ realmName(lastBattle.left.realm) }}</small>
                  <div class="duel-fighter-attrs" :aria-label="`${lastBattle.left.name} 战斗属性`">
                    <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                    <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                  </div>
                  <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="battleMax(lastBattle.left, 'hp')" tone="health" />
                  <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="battleMax(lastBattle.left, 'mana')" tone="focus" />
                </div>
                <div class="duel-live-center">
                  <strong>VS</strong>
                  <span>{{ battleOutcomeLabel }}</span>
                  <small>{{ battleStatusText }}</small>
                </div>
                <div class="duel-fighter right">
                  <CharacterPortrait :person="battlePerson(lastBattle.right)" size="lg" />
                  <strong>{{ lastBattle.right.name }}</strong>
                  <small>{{ lastBattle.right.sect }}</small>
                  <small>{{ realmName(lastBattle.right.realm) }}</small>
                  <div class="duel-fighter-attrs" :aria-label="`${lastBattle.right.name} 战斗属性`">
                    <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                    <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                  </div>
                  <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="battleMax(lastBattle.right, 'hp')" tone="health" />
                  <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="battleMax(lastBattle.right, 'mana')" tone="focus" />
                </div>
              </div>

              <div class="duel-skill-row">
                <div class="skill-chip" tabindex="0">
                  <span class="skill-chip-icon" aria-hidden="true">
                    <img v-if="skillIconPath(lastBattle.left)" :src="skillIconPath(lastBattle.left)" alt="">
                    <span v-else>{{ skillIconGlyph(lastBattle.left) }}</span>
                  </span>
                  <span class="skill-chip-title">{{ skillLabel(lastBattle.left) }}</span>
                  <small>攻城 (1)</small>
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left) }}</span>
                </div>
                <div class="skill-chip" tabindex="0">
                  <span class="skill-chip-icon" aria-hidden="true">
                    <img v-if="skillIconPath(lastBattle.right)" :src="skillIconPath(lastBattle.right)" alt="">
                    <span v-else>{{ skillIconGlyph(lastBattle.right) }}</span>
                  </span>
                  <span class="skill-chip-title">{{ skillLabel(lastBattle.right) }}</span>
                  <small>守城 (2)</small>
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right) }}</span>
                </div>
              </div>

              <div class="battle-feed duel-battle-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind, skillEffectClass(event)]"
                  :style="skillEffectStyle(event)"
                >
                  <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                    <img v-if="skillEffectImage(event)" class="skill-cast-art" :src="skillEffectImage(event)" alt="">
                    <i :class="{ 'has-art': skillEffectImage(event) }">
                      <img v-if="skillEffectImage(event)" class="skill-cast-icon" :src="skillEffectImage(event)" alt="">
                      <span v-else>{{ skillEffectGlyph(event) }}</span>
                    </i>
                    <b>{{ skillEffectTitle(event) }}</b>
                    <strong v-if="skillDamageText(event)" class="skill-cast-damage">{{ skillDamageText(event) }}</strong>
                  </div>
                  <span>{{ event.round ? `回合 ${event.round}` : "回合 1" }}</span>
                  <p>{{ event.text }}</p>
                </div>
              </div>
            </section>
          </div>

          <div v-else-if="selectedProvinceWar" class="panel sect-system-panel sect-war-detail-panel">
            <div class="section-head compact sect-panel-title">
              <div>
                <h3>{{ selectedProvinceWar.provinceName }} 攻城详情</h3>
                <p>{{ selectedProvinceWar.result }}。</p>
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
              <div class="wheel-battle-console" v-if="selectedProvinceWar.battles.length">
                <section class="duel-match-board wheel-battle-board">
                  <div class="duel-board-title">
                    <div>
                      <h3>车轮战序列</h3>
                      <span>{{ selectedProvinceWar.battles.length }} 场 PK</span>
                    </div>
                    <span>{{ selectedProvinceWar.captured ? "攻城成功" : "守城成功" }}</span>
                  </div>
                  <div class="match-list wheel-match-list">
                    <button
                      class="match-card duel-match-card siege-battle-card"
                      v-for="battle in selectedProvinceWar.battles"
                      :key="`${selectedProvinceWar.id}-${battle.order}`"
                      type="button"
                      :disabled="!hasReplay(battle)"
                      :class="{
                        active: lastBattle?.replayId && battle.replayId === lastBattle.replayId,
                        replayable: hasReplay(battle),
                        'left-won': battle.winnerSide === 'attacker' || battle.replay?.winner === 'left',
                        'right-won': battle.winnerSide === 'defender' || battle.replay?.winner === 'right'
                      }"
                      @click="openProvinceBattle(battle)"
                    >
                      <div class="match-person duel-combatant" :class="{ winner: battle.winnerSide === 'attacker' || battle.replay?.winner === 'left' }">
                        <CharacterPortrait :person="battlePerson(battle.attacker)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ battleName(battle, "attacker") }}<span v-if="battle.attacker?.id === player.id">我</span></strong>
                          <small>{{ realmName(battlePerson(battle.attacker).realm) }}</small>
                          <small>{{ selectedProvinceWar.attacker }}</small>
                        </div>
                      </div>
                      <div class="duel-match-vs">
                        <strong>VS</strong>
                        <span>第 {{ battle.order }} 战</span>
                      </div>
                      <div class="match-person duel-combatant" :class="{ winner: battle.winnerSide === 'defender' || battle.replay?.winner === 'right' }">
                        <CharacterPortrait :person="battlePerson(battle.defender)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ battleName(battle, "defender") }}<span v-if="battle.defender?.id === player.id">我</span></strong>
                          <small>{{ realmName(battlePerson(battle.defender).realm) }}</small>
                          <small>{{ selectedProvinceWar.defender }}</small>
                        </div>
                      </div>
                      <div class="duel-result-stamp" :class="(battle.winnerSide === 'attacker' || battle.replay?.winner === 'left') ? 'win' : 'loss'">
                        {{ (battle.winnerSide === 'attacker' || battle.replay?.winner === 'left') ? "胜利" : "失败" }}
                      </div>
                      <span class="duel-replay-button" aria-hidden="true"><i>▶</i><b>回放</b></span>
                    </button>
                  </div>
                </section>
                <section class="duel-replay-panel sect-war-replay-panel wheel-replay-panel" :class="{ live: lastBattle }">
                  <div class="duel-replay-title">
                    <div>
                      <h3>车轮战实况</h3>
                      <p>{{ lastBattle ? `${lastBattle.left.name} 对阵 ${lastBattle.right.name}，${battleStatusText}` : "选择左侧场次查看战斗回放。" }}</p>
                    </div>
                    <div class="duel-replay-actions" v-if="lastBattle">
                      <button class="secondary" @click="replayBattle">重播</button>
                      <button class="primary" @click="closeBattleReplay">关闭回放</button>
                    </div>
                  </div>

                  <div v-if="replayLoading" class="replay-loading-panel duel-loading">
                    <div class="loading-orb" aria-hidden="true"></div>
                    <h3>正在读取战斗回放</h3>
                    <p>战报玉简正在展开，请稍候。</p>
                  </div>

                  <template v-else-if="lastBattle">
                    <div class="duel-arena-stage">
                      <div class="duel-fighter left">
                        <CharacterPortrait :person="battlePerson(lastBattle.left)" size="lg" />
                        <strong>{{ lastBattle.left.name }}</strong>
                        <small>{{ lastBattle.left.sect }}</small>
                        <small>{{ realmName(lastBattle.left.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${lastBattle.left.name} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                        </div>
                        <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="battleMax(lastBattle.left, 'hp')" tone="health" />
                        <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="battleMax(lastBattle.left, 'mana')" tone="focus" />
                      </div>
                      <div class="duel-live-center">
                        <strong>VS</strong>
                        <span>{{ battleOutcomeLabel }}</span>
                        <small>{{ battleStatusText }}</small>
                      </div>
                      <div class="duel-fighter right">
                        <CharacterPortrait :person="battlePerson(lastBattle.right)" size="lg" />
                        <strong>{{ lastBattle.right.name }}</strong>
                        <small>{{ lastBattle.right.sect }}</small>
                        <small>{{ realmName(lastBattle.right.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${lastBattle.right.name} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                        </div>
                        <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="battleMax(lastBattle.right, 'hp')" tone="health" />
                        <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="battleMax(lastBattle.right, 'mana')" tone="focus" />
                      </div>
                    </div>

                    <div class="duel-skill-row">
                      <div class="skill-chip" tabindex="0">
                        <span class="skill-chip-icon" aria-hidden="true">
                          <img v-if="skillIconPath(lastBattle.left)" :src="skillIconPath(lastBattle.left)" alt="">
                          <span v-else>{{ skillIconGlyph(lastBattle.left) }}</span>
                        </span>
                        <span class="skill-chip-title">{{ skillLabel(lastBattle.left) }}</span>
                        <small>攻城 (1)</small>
                        <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left) }}</span>
                      </div>
                      <div class="skill-chip" tabindex="0">
                        <span class="skill-chip-icon" aria-hidden="true">
                          <img v-if="skillIconPath(lastBattle.right)" :src="skillIconPath(lastBattle.right)" alt="">
                          <span v-else>{{ skillIconGlyph(lastBattle.right) }}</span>
                        </span>
                        <span class="skill-chip-title">{{ skillLabel(lastBattle.right) }}</span>
                        <small>守城 (2)</small>
                        <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right) }}</span>
                      </div>
                    </div>

                    <div class="battle-feed duel-battle-feed">
                      <div
                        class="battle-event"
                        v-for="(event, index) in displayedBattleEvents"
                        :key="`${index}-${event.text}`"
                        :class="[event.kind, skillEffectClass(event)]"
                        :style="skillEffectStyle(event)"
                      >
                        <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                          <img v-if="skillEffectImage(event)" class="skill-cast-art" :src="skillEffectImage(event)" alt="">
                          <i :class="{ 'has-art': skillEffectImage(event) }">
                            <img v-if="skillEffectImage(event)" class="skill-cast-icon" :src="skillEffectImage(event)" alt="">
                            <span v-else>{{ skillEffectGlyph(event) }}</span>
                          </i>
                          <b>{{ skillEffectTitle(event) }}</b>
                          <strong v-if="skillDamageText(event)" class="skill-cast-damage">{{ skillDamageText(event) }}</strong>
                        </div>
                        <span>{{ event.round ? `回合 ${event.round}` : "回合 1" }}</span>
                        <p>{{ event.text }}</p>
                      </div>
                    </div>
                  </template>

                  <div v-else class="duel-preview wheel-replay-empty">
                    <div class="duel-arena-stage preview">
                      <div class="duel-fighter left">
                        <strong>{{ selectedProvinceWar.attacker }}</strong>
                        <small>攻城方</small>
                      </div>
                      <div class="duel-live-center">
                        <strong>VS</strong>
                        <span>{{ selectedProvinceWar.provinceName }}</span>
                        <small>{{ selectedProvinceWar.defender }}</small>
                      </div>
                      <div class="duel-fighter right">
                        <strong>{{ selectedProvinceWar.defender }}</strong>
                        <small>守城方</small>
                      </div>
                    </div>
                    <div class="duel-skill-row muted-row">
                      <span>选择左侧车轮战</span>
                      <span>战斗实况将在此展开</span>
                    </div>
                    <div class="battle-feed duel-battle-feed preview-feed">
                      <div class="battle-event">
                        <span>候场</span>
                        <p>点击左侧任意一战查看回放。</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
              <small v-else>无主之地直接占领。</small>
            </div>
          </div>

          <div v-else class="panel sect-system-panel sect-war-log-panel">
            <div class="section-head compact sect-panel-title war-log-head">
              <div class="war-log-title-copy">
                <h3>每日攻城记录</h3>
                <p>{{ selectedProvinceWarDate }} · {{ selectedProvinceWarSummary.total }} 处战事</p>
              </div>
              <div class="war-log-summary-strip">
                <span><b>{{ selectedProvinceWarSummary.captured }}</b> 易主</span>
                <span><b>{{ selectedProvinceWarSummary.defended }}</b> 守住</span>
                <span><b>{{ filteredProvinceWars.length }}</b> 当前显示</span>
              </div>
            </div>

            <div class="war-log-toolbar">
              <div class="war-log-date-controls">
                <button class="secondary" type="button" @click="changeProvinceWarDay(-1)">前一天</button>
                <label>查看日期
                  <input
                    v-model="selectedProvinceWarDateInput"
                    type="date"
                    :min="provinceWarMinDate"
                    :max="provinceWarMaxDate"
                    step="1"
                    aria-label="选择攻城记录日期"
                  >
                </label>
                <button class="secondary" type="button" :disabled="selectedProvinceWarDay >= state.day" @click="changeProvinceWarDay(1)">后一天</button>
              </div>
              <label class="war-search">搜索省份 / 宗门
                <span class="search-field">
                  <input v-model.trim="provinceWarSearch" type="search" placeholder="例如：贵州、黄枫谷、妙音门">
                  <button v-if="provinceWarSearch" class="search-clear" type="button" aria-label="清空攻城记录搜索" @click="provinceWarSearch = ''">×</button>
                </span>
              </label>
            </div>

            <div class="war-day-list" v-if="selectedProvinceWarDayRecord">
              <button v-for="war in filteredProvinceWars" :key="war.id" class="war-matchup-card" :class="{ captured: war.captured }" type="button" @click="openProvinceWarDetail(war)">
                <div class="war-matchup-head">
                  <strong>{{ war.provinceName }}</strong>
                  <span class="tag">{{ war.captured ? "易主" : "守住" }}</span>
                </div>

                <div class="war-lineup" v-if="war.battles.length">
                  <div class="war-team" :class="{ 'two-lines': warTeam(war, 'attacker').length > 5 }">
                    <span class="war-team-name"><i :style="{ background: sectColor(war.attacker) }"></i>{{ war.attacker }}</span>
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
                  <div class="war-team" :class="{ 'two-lines': warTeam(war, 'defender').length > 5 }">
                    <span class="war-team-name"><i :style="{ background: sectColor(war.defender) }"></i>{{ war.defender }}</span>
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

                <p><span>{{ war.captured ? "战况详情" : "守城详情" }}</span>{{ war.result }}</p>
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

        <section v-if="activeTab === 'arena'" class="view active cultivation-surface arena-surface">
          <div class="duel-console-shell">
            <div class="duel-console-head">
              <h2>斗法场 · 赛季演武台</h2>
              <div class="duel-season-strip" aria-label="切磋赛季状态">
                <span><i class="duel-mini-icon season" aria-hidden="true"></i>第 {{ duelSeasonInfo.season }} 赛季</span>
                <span>第 {{ duelSeasonInfo.seasonDay }} / {{ duelSeasonInfo.length }} 天</span>
                <span class="duel-gain">胜利 +{{ duelSeasonInfo.winScore }} 分</span>
                <span class="duel-loss">失败 {{ duelSeasonInfo.lossScore }} 分</span>
                <span>积分 0-{{ duelSeasonInfo.maxScore }}</span>
              </div>
            </div>

            <div class="duel-reward-rail" aria-label="赛季段位奖励">
              <div class="duel-reward-title">
                <strong>赛季段位</strong>
                <span>奖励</span>
              </div>
              <div class="duel-rank-table">
                <div v-for="(rank, index) in duelRankList" :key="rank.id" class="duel-rank-cell" :class="`duel-rank-${rank.id}`">
                  <i class="duel-rank-medal" aria-hidden="true"></i>
                  <div>
                    <strong>{{ rank.name }}</strong>
                    <span>{{ rank.min }}-{{ rank.max }} 分</span>
                    <small><b>灵石</b> × {{ rank.spiritReward || 0 }}</small>
                  </div>
                  <em v-if="index < duelRankList.length - 1" aria-hidden="true"></em>
                </div>
              </div>
            </div>

            <div class="duel-command-bar">
              <button class="secondary duel-nav-button" type="button" @click="changeDuelDay(-1)">前一天</button>
              <label class="duel-date-select">
                <select v-model.number="selectedDuelDay" aria-label="查看日期">
                  <option v-for="option in duelDateOptions" :key="option.day" :value="option.day">{{ option.date }}</option>
                </select>
              </label>
              <label class="duel-search war-search">
                <span class="search-field">
                  <input v-model.trim="duelSearch" type="search" placeholder="搜索姓名 / 宗门">
                  <button v-if="duelSearch" class="search-clear" type="button" aria-label="清空切磋搜索" @click="duelSearch = ''">×</button>
                </span>
              </label>
              <button class="secondary duel-nav-button" type="button" :disabled="selectedDuelDay >= state.day" @click="changeDuelDay(1)">后一天</button>
              <button class="primary duel-start-button" type="button" @click="startDailyDuels">{{ todaysDuelRecord ? "查看今日切磋" : "开始切磋" }}</button>
            </div>

            <div class="duel-system-grid">
              <section class="duel-match-board">
                <div class="duel-board-title">
                  <h3>今日对阵</h3>
                  <span v-if="selectedDuelRecord">{{ selectedDuelRecord.createdAt }}</span>
                  <span v-else>未开赛</span>
                </div>

                <div class="match-list" v-if="selectedDuelRecord">
                  <button
                    class="match-card duel-match-card"
                    :class="{ bye: match.type === 'bye', replayable: match.hasReplay || match.replay }"
                    v-for="(match, index) in filteredDuelMatches"
                    :key="match.id"
                    type="button"
                    :disabled="match.type === 'bye' || !(match.hasReplay || match.replay)"
                    @click="openMatchReplay(match, selectedDuelRecord)"
                  >
                    <template v-if="match.type === 'battle'">
                      <div class="match-person duel-combatant" :class="{ winner: match.winner.id === match.left.id }">
                        <CharacterPortrait :person="matchPerson(match.left)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ match.left.name }}<span v-if="match.left.id === player.id">我</span></strong>
                          <small>{{ realmName(match.left.realm) }}</small>
                          <small>{{ match.left.sect }}</small>
                        </div>
                      </div>
                      <div class="duel-rank-stamp" :class="`duel-rank-${duelRankId(matchPerson(match.left))}`">
                        <i class="duel-rank-medal" aria-hidden="true"></i>
                        <span>{{ duelRankName(matchPerson(match.left)) }}</span>
                        <small>{{ duelRankScoreText(matchPerson(match.left)) }}</small>
                      </div>
                      <div class="duel-match-vs">
                        <strong>VS</strong>
                        <span>第 {{ match.order || index + 1 }} 场</span>
                      </div>
                      <div class="duel-rank-stamp" :class="`duel-rank-${duelRankId(matchPerson(match.right))}`">
                        <i class="duel-rank-medal" aria-hidden="true"></i>
                        <span>{{ duelRankName(matchPerson(match.right)) }}</span>
                        <small>{{ duelRankScoreText(matchPerson(match.right)) }}</small>
                      </div>
                      <div class="match-person duel-combatant" :class="{ winner: match.winner.id === match.right.id }">
                        <CharacterPortrait :person="matchPerson(match.right)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ match.right.name }}<span v-if="match.right.id === player.id">我</span></strong>
                          <small>{{ realmName(match.right.realm) }}</small>
                          <small>{{ match.right.sect }}</small>
                        </div>
                      </div>
                      <div class="duel-result-stamp" :class="match.winner.id === match.left.id ? 'win' : 'loss'">{{ match.winner.id === match.left.id ? "胜利" : "失败" }}</div>
                      <span class="duel-replay-button" aria-hidden="true"><i>▶</i><b>回放</b></span>
                    </template>
                    <template v-else>
                      <div class="match-person duel-combatant winner">
                        <CharacterPortrait :person="matchPerson(match.winner)" size="sm" />
                        <div class="duel-person-copy">
                          <strong>{{ match.winner.name }}<span v-if="match.winner.id === player.id">我</span></strong>
                          <small>{{ realmName(match.winner.realm) }}</small>
                          <small>{{ match.winner.sect }}</small>
                        </div>
                      </div>
                      <div class="duel-rank-stamp" :class="`duel-rank-${duelRankId(matchPerson(match.winner))}`">
                        <i class="duel-rank-medal" aria-hidden="true"></i>
                        <span>{{ duelRankName(matchPerson(match.winner)) }}</span>
                        <small>{{ duelRankScoreText(matchPerson(match.winner)) }}</small>
                      </div>
                      <div class="duel-bye-mark">轮</div>
                      <div class="duel-match-vs bye-vs">
                        <strong>-</strong>
                        <span>本场轮空</span>
                      </div>
                      <div class="duel-result-stamp bye">轮空</div>
                    </template>
                  </button>
                  <div v-if="!filteredDuelMatches.length" class="empty duel-empty">没有匹配“{{ duelSearch }}”的人物或宗门。</div>
                </div>

                <div class="empty duel-empty" v-else-if="selectedDuelDay === state.day">{{ currentDate }} 尚未开赛。</div>
                <div class="empty duel-empty" v-else>没有找到 {{ selectedDuelDate }} 的切磋记录。</div>
              </section>

              <section class="duel-replay-panel" :class="{ live: lastBattle }">
                <div class="duel-replay-title">
                  <h3>切磋实况</h3>
                  <div class="duel-replay-actions" v-if="lastBattle">
                    <button class="secondary" @click="replayBattle">重播</button>
                    <button class="primary" @click="returnFromBattle">关闭回放</button>
                  </div>
                </div>

                <div v-if="replayLoading" class="replay-loading-panel duel-loading">
                  <div class="loading-orb" aria-hidden="true"></div>
                  <h3>正在读取战斗回放</h3>
                  <p>战报玉简正在展开，请稍候。</p>
                  <button class="secondary" type="button" @click="returnFromBattle">{{ battleBackLabel }}</button>
                </div>

                <template v-else-if="lastBattle">
                  <div class="duel-arena-stage">
                    <div class="duel-fighter left">
                      <CharacterPortrait :person="battlePerson(lastBattle.left)" size="lg" />
                      <strong>{{ lastBattle.left.name }}</strong>
                      <small>{{ lastBattle.left.sect }}</small>
                      <small>{{ realmName(lastBattle.left.realm) }}</small>
                      <div class="duel-fighter-attrs" :aria-label="`${lastBattle.left.name} 战斗属性`">
                        <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                        <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                      </div>
                      <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="battleMax(lastBattle.left, 'hp')" tone="health" />
                      <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="battleMax(lastBattle.left, 'mana')" tone="focus" />
                    </div>
                    <div class="duel-live-center">
                      <strong>VS</strong>
                      <span>{{ battleOutcomeLabel }}</span>
                      <small>{{ battleStatusText }}</small>
                    </div>
                    <div class="duel-fighter right">
                      <CharacterPortrait :person="battlePerson(lastBattle.right)" size="lg" />
                      <strong>{{ lastBattle.right.name }}</strong>
                      <small>{{ lastBattle.right.sect }}</small>
                      <small>{{ realmName(lastBattle.right.realm) }}</small>
                      <div class="duel-fighter-attrs" :aria-label="`${lastBattle.right.name} 战斗属性`">
                        <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                        <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }} {{ stat.value }}</span>
                      </div>
                      <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="battleMax(lastBattle.right, 'hp')" tone="health" />
                      <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="battleMax(lastBattle.right, 'mana')" tone="focus" />
                    </div>
                  </div>

                  <div class="duel-skill-row">
                    <div class="skill-chip" tabindex="0">
                      <span class="skill-chip-icon" aria-hidden="true">
                        <img v-if="skillIconPath(lastBattle.left)" :src="skillIconPath(lastBattle.left)" alt="">
                        <span v-else>{{ skillIconGlyph(lastBattle.left) }}</span>
                      </span>
                      <span class="skill-chip-title">{{ skillLabel(lastBattle.left) }}</span>
                      <small>进攻 (1)</small>
                      <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left) }}</span>
                    </div>
                    <div class="skill-chip" tabindex="0">
                      <span class="skill-chip-icon" aria-hidden="true">
                        <img v-if="skillIconPath(lastBattle.right)" :src="skillIconPath(lastBattle.right)" alt="">
                        <span v-else>{{ skillIconGlyph(lastBattle.right) }}</span>
                      </span>
                      <span class="skill-chip-title">{{ skillLabel(lastBattle.right) }}</span>
                      <small>应变 (2)</small>
                      <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right) }}</span>
                    </div>
                  </div>

                  <div class="battle-feed duel-battle-feed">
                    <div
                      class="battle-event"
                      v-for="(event, index) in displayedBattleEvents"
                      :key="`${index}-${event.text}`"
                      :class="[event.kind, skillEffectClass(event)]"
                      :style="skillEffectStyle(event)"
                    >
                      <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                        <img v-if="skillEffectImage(event)" class="skill-cast-art" :src="skillEffectImage(event)" alt="">
                    <i :class="{ 'has-art': skillEffectImage(event) }">
                      <img v-if="skillEffectImage(event)" class="skill-cast-icon" :src="skillEffectImage(event)" alt="">
                      <span v-else>{{ skillEffectGlyph(event) }}</span>
                    </i>
                    <b>{{ skillEffectTitle(event) }}</b>
                    <strong v-if="skillDamageText(event)" class="skill-cast-damage">{{ skillDamageText(event) }}</strong>
                  </div>
                  <span>{{ event.round ? `回合 ${event.round}` : "回合 1" }}</span>
                  <p>{{ event.text }}</p>
                    </div>
                  </div>
                </template>

                <div v-else class="duel-preview">
                  <div class="duel-arena-stage preview" v-if="duelPreviewMatch">
                    <div class="duel-fighter left">
                      <CharacterPortrait :person="matchPerson(duelPreviewMatch.left)" size="lg" />
                      <strong>{{ duelPreviewMatch.left.name }}</strong>
                      <small>{{ duelPreviewMatch.left.sect }}</small>
                      <small>{{ realmName(duelPreviewMatch.left.realm) }}</small>
                    </div>
                    <div class="duel-live-center">
                      <strong>VS</strong>
                      <span>第 {{ duelPreviewIndex + 1 }} 场</span>
                      <small>{{ selectedDuelDate }}</small>
                    </div>
                    <div class="duel-fighter right">
                      <CharacterPortrait :person="matchPerson(duelPreviewMatch.right)" size="lg" />
                      <strong>{{ duelPreviewMatch.right.name }}</strong>
                      <small>{{ duelPreviewMatch.right.sect }}</small>
                      <small>{{ realmName(duelPreviewMatch.right.realm) }}</small>
                    </div>
                  </div>
                  <div class="duel-skill-row muted-row">
                    <span>选择左侧可回放对阵</span>
                    <span>战报时间轴将在此展开</span>
                  </div>
                  <div class="battle-feed duel-battle-feed preview-feed">
                    <div class="battle-event">
                      <span>回合 1</span>
                      <p>{{ duelPreviewMatch ? `${duelPreviewMatch.left.name} 与 ${duelPreviewMatch.right.name} 正在演武台候场。` : "尚无可展示的切磋实况。" }}</p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'market'" class="view active market-surface">
          <div class="market-stage">
            <div class="market-topbar">
              <div class="market-title-block">
                <span>天南灵药阁</span>
                <h3>坊市</h3>
              </div>
              <div class="market-mode-tabs" role="tablist" aria-label="坊市子导航">
                <button
                  v-for="tab in marketSubTabs"
                  :key="tab.id"
                  type="button"
                  :class="{ active: marketSubTab === tab.id }"
                  role="tab"
                  :aria-selected="marketSubTab === tab.id"
                  @click="marketSubTab = tab.id"
                >
                  <component :is="tab.icon" :size="15" :stroke-width="2.4" aria-hidden="true" />
                  {{ tab.label }}
                </button>
              </div>
              <div class="market-wallet">
                <span>灵石</span>
                <strong>{{ player.spirit || 0 }}</strong>
                <small>第 {{ gameState.day || 1 }} 日行情</small>
              </div>
            </div>

            <div class="market-buff-strip">
              <div v-for="item in marketStatusCards" :key="item.label" class="market-buff-card">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
                <small>{{ item.note }}</small>
              </div>
            </div>

            <div class="market-system-grid">
              <aside class="market-category-rail" aria-label="丹药分类">
                <button
                  v-for="group in shopGroups"
                  :key="group.id"
                  type="button"
                  :class="{ active: activeMarketCategory === group.id }"
                  @click="activeMarketCategory = group.id"
                >
                  <span class="market-category-icon" :class="`market-icon-${group.id}`" aria-hidden="true"></span>
                  <b>{{ group.label }}</b>
                  <small>{{ group.items.length }} 件</small>
                </button>
              </aside>

              <main class="market-shelf" v-if="marketSubTab === 'shop'">
                <div class="market-shelf-head">
                  <div>
                    <span>今日行情</span>
                    <strong>{{ activeShopGroup?.label || "丹药" }}</strong>
                  </div>
                  <p>{{ activeShopGroup?.note || "丹药价格随坊市行情小幅浮动。" }}</p>
                </div>
                <div class="market-item-grid">
                  <button
                    v-for="item in activeShopItems"
                    :key="item.id"
                    type="button"
                    class="market-product-card"
                    :class="{ selected: selectedMarketItemId === item.id, disabled: !item.canBuy }"
                    @click="selectedMarketItemId = item.id"
                  >
                    <img class="market-product-icon" :src="marketItemIconSrc(item)" alt="" aria-hidden="true" loading="lazy">
                    <span class="market-product-main">
                      <b>{{ item.name }}</b>
                      <small>{{ marketItemText(item) }}</small>
                    </span>
                    <span class="market-price-tag">
                      <b>{{ item.price }}</b>
                      <small>灵石</small>
                    </span>
                    <span class="market-product-foot">
                      <em>{{ remainingText(item) }}</em>
                      <em>{{ item.countdownText }}</em>
                    </span>
                  </button>
                </div>
              </main>

              <main class="market-shelf market-bag-main" v-else>
                <div class="market-shelf-head">
                  <div>
                    <span>随身丹匣</span>
                    <strong>{{ activeShopGroup?.label || "背包" }}</strong>
                  </div>
                  <p>当前分类持有 {{ activeBagItemCount }} 枚，全部丹药共 {{ bagItemCount }} 枚。</p>
                </div>
                <div class="market-item-grid" v-if="activeBagItems.length">
                  <button
                    v-for="entry in activeBagItems"
                    :key="entry.id"
                    type="button"
                    class="market-product-card bag-item-card"
                    :class="{ selected: selectedMarketItemId === entry.id }"
                    @click="selectedMarketItemId = entry.id"
                  >
                    <img class="market-product-icon" :src="marketItemIconSrc(entry.item)" alt="" aria-hidden="true" loading="lazy">
                    <span class="market-product-main">
                      <b>{{ entry.item.name }}</b>
                      <small>{{ marketItemText(entry.item) }}</small>
                    </span>
                    <span class="market-price-tag">
                      <b>{{ entry.count }}</b>
                      <small>持有</small>
                    </span>
                    <span class="market-product-foot">
                      <em>{{ entry.item.limitText }}</em>
                      <em>售出 {{ entry.item.sellPrice || 0 }} 灵石</em>
                    </span>
                  </button>
                </div>
                <div v-else class="market-empty">当前分类暂无丹药，可切换分类或去商城购入。</div>
              </main>

              <aside class="market-detail-panel" v-if="selectedMarketItem">
                <img class="market-detail-orb" :src="marketItemIconSrc(selectedMarketItem)" alt="" aria-hidden="true" loading="lazy">
                <span>{{ selectedMarketItem.categoryName }}</span>
                <h4>{{ selectedMarketItem.name }}</h4>
                <p>{{ marketItemText(selectedMarketItem) }}</p>
                <dl>
                  <div>
                    <dt>今日价格</dt>
                    <dd>{{ selectedMarketItem.price }} 灵石</dd>
                  </div>
                  <div v-if="marketSubTab === 'bag'">
                    <dt>售卖可得</dt>
                    <dd>{{ selectedMarketItem.sellPrice || 0 }} 灵石</dd>
                  </div>
                  <div>
                    <dt>限购次数</dt>
                    <dd>{{ selectedMarketItem.limitText }}</dd>
                  </div>
                  <div>
                    <dt>本期剩余</dt>
                    <dd>{{ remainingText(selectedMarketItem) }}</dd>
                  </div>
                  <div>
                    <dt>限购时间</dt>
                    <dd>{{ selectedMarketItem.countdownText }}</dd>
                  </div>
                  <div>
                    <dt>今日浮动</dt>
                    <dd>{{ priceFactorText(selectedMarketItem) }}</dd>
                  </div>
                </dl>
                <div class="market-bag-dock">
                  <div class="market-bag-dock-head">
                    <span>丹匣</span>
                    <strong>{{ activeBagItemCount }} 枚</strong>
                  </div>
                  <button
                    v-for="entry in activeBagItems.slice(0, 3)"
                    :key="entry.id"
                    type="button"
                    class="market-bag-mini"
                    @click="selectedMarketItemId = entry.id; marketSubTab = 'bag'"
                  >
                    <img class="market-bag-mini-icon" :src="marketItemIconSrc(entry.item)" alt="" aria-hidden="true" loading="lazy">
                    <b>{{ entry.item.name }}</b>
                    <small>x{{ entry.count }}</small>
                  </button>
                  <div v-if="!activeBagItems.length" class="market-bag-mini empty-mini">当前分类暂无丹药</div>
                </div>
                <button
                  v-if="marketSubTab === 'shop'"
                  class="market-action"
                  type="button"
                  :disabled="!selectedMarketItem.canBuy || isActionPending('/api/items/buy')"
                  @click="buyMarketItem(selectedMarketItem.id)"
                >
                  {{ selectedMarketItem.canBuy ? "购买" : selectedMarketItem.reason }}
                </button>
                <div v-else class="market-action-row">
                  <button
                    class="market-action"
                    type="button"
                    :disabled="!selectedBagEntry || isActionPending('/api/items/use')"
                    @click="useMarketItem(selectedMarketItem.id)"
                  >
                    使用
                  </button>
                  <button
                    class="market-action sell-action"
                    type="button"
                    :disabled="!selectedBagEntry || isActionPending('/api/items/sell')"
                    @click="sellMarketItem(selectedMarketItem.id)"
                  >
                    售卖 +{{ selectedMarketItem.sellPrice || 0 }}
                  </button>
                </div>
              </aside>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'equipment'" class="view active cultivation-surface equipment-surface">
          <div class="panel equipment-panel">
            <div class="section-head">
              <div>
                <h3>装备图鉴</h3>
                <p>唯一装备 · 自动穿戴最优同部位。</p>
              </div>
              <span class="tag">已获取 {{ equipmentCollectionCount.acquired }} / 总数 {{ equipmentCollectionCount.total }}</span>
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
              <label>获取
                <select v-model="equipmentOwnedFilter">
                  <option value="">全部状态</option>
                  <option value="owned">已经获取</option>
                  <option value="unowned">未获取</option>
                </select>
              </label>
              <label>排序
                <select v-model="equipmentSortMode">
                  <option value="tier">品质排序</option>
                  <option value="value">灵石价值排序</option>
                </select>
              </label>
              <label>顺序
                <select v-model="equipmentSortDirection">
                  <option value="desc">降序</option>
                  <option value="asc">升序</option>
                </select>
              </label>
            </div>
            <div class="equipment-inventory-grid">
              <article
                class="equipment-card"
                v-for="item in filteredEquipment"
                :key="item.id"
                :class="[`tier-${item.tier}`, { owned: item.ownerName, equipped: item.equipped }]"
                :aria-label="equipmentCardAria(item)"
                tabindex="0"
              >
                <div class="equipment-card-frame">
                  <EquipmentIcon :id="item.id" :name="item.name" :slot="item.slot" :tier="item.tier" />
                  <strong>{{ item.name }}</strong>
                  <small><span aria-hidden="true">◆</span>{{ equipmentDisplayValue(item) }}</small>
                </div>
                <div class="equipment-tooltip-card" role="tooltip">
                  <div class="equipment-tooltip-head">
                    <strong>{{ item.name }}</strong>
                    <span>{{ item.tierName }}</span>
                  </div>
                  <dl class="equipment-tooltip-stats">
                    <div v-for="row in equipmentDetailRows(item)" :key="row.label">
                      <dt>{{ row.label }}</dt>
                      <dd>{{ row.value || "—" }}</dd>
                    </div>
                  </dl>
                  <div class="equipment-tooltip-source">
                    <strong>掉落源</strong>
                    <span v-for="line in equipmentDropSourceLines(item)" :key="line">{{ line }}</span>
                  </div>
                  <div class="equipment-tooltip-source transfer-history">
                    <strong>最近流转</strong>
                    <span v-for="line in equipmentTransferPathLines(item)" :key="line">{{ line }}</span>
                  </div>
                </div>
              </article>
            </div>
            <div v-if="!filteredEquipment.length" class="empty">没有符合筛选条件的装备。</div>
          </div>
        </section>

        <section v-if="activeTab === 'rank'" class="view active cultivation-surface rank-surface">
          <div v-if="lastBattle" class="battle-detail rank-battle-detail">
            <div class="panel battle-header">
              <div>
                <h3>副本回合</h3>
                <p>{{ battleDisplayName(lastBattle.left) }} 对阵 {{ battleDisplayName(lastBattle.right) }}，{{ battleStatusText }}</p>
              </div>
              <div class="actions">
                <button class="secondary" @click="replayBattle">重播</button>
                <button class="primary" @click="returnFromBattle">{{ battleBackLabel }}</button>
              </div>
            </div>

            <div class="battle-line live">
              <div class="fighter">
                <MonsterEmblem v-if="isBattleMonster(lastBattle.left)" :monster="lastBattle.left" size="lg" />
                <CharacterPortrait v-else :person="battlePerson(lastBattle.left)" size="lg" />
                <strong>{{ battleDisplayName(lastBattle.left) }}</strong>
                <small>{{ realmName(lastBattle.left.realm) }} · 战力 {{ lastBattle.left.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.left.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillLabel(lastBattle.left) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.left) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.leftHp" :max="battleMax(lastBattle.left, 'hp')" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.leftMana" :max="battleMax(lastBattle.left, 'mana')" tone="focus" />
              </div>
              <div class="vs">{{ battleOutcomeLabel }}</div>
              <div class="fighter">
                <MonsterEmblem v-if="isBattleMonster(lastBattle.right)" :monster="lastBattle.right" size="lg" />
                <CharacterPortrait v-else :person="battlePerson(lastBattle.right)" size="lg" />
                <strong>{{ battleDisplayName(lastBattle.right) }}</strong>
                <small>{{ realmName(lastBattle.right.realm) }} · 战力 {{ lastBattle.right.power }}</small>
                <div class="battle-stats">
                  <span v-for="stat in battleStatsFromEffective(lastBattle.right.stats)" :key="stat.label" :aria-label="`${stat.label} ${stat.value}`">
                    <StatIcon :name="stat.icon" :class="`detail-icon-${stat.icon}`" />
                    <span>{{ stat.label }}</span>
                    <strong>{{ stat.value }}</strong>
                  </span>
                </div>
                <div class="skill-chip" tabindex="0">
                  {{ skillLabel(lastBattle.right) }}
                  <span class="skill-tip" role="tooltip">{{ skillTip(lastBattle.right) }}</span>
                </div>
                <Meter label="血量" icon="health" :value="currentBattleFrame.rightHp" :max="battleMax(lastBattle.right, 'hp')" tone="health" />
                <Meter label="法力" icon="mana" :value="currentBattleFrame.rightMana" :max="battleMax(lastBattle.right, 'mana')" tone="focus" />
              </div>
            </div>

            <div class="panel">
              <div class="battle-feed">
                <div
                  class="battle-event"
                  v-for="(event, index) in displayedBattleEvents"
                  :key="`${index}-${event.text}`"
                  :class="[event.kind, skillEffectClass(event)]"
                  :style="skillEffectStyle(event)"
                >
                  <div v-if="event.kind === 'skill'" class="skill-cast" aria-hidden="true">
                    <img v-if="skillEffectImage(event)" class="skill-cast-art" :src="skillEffectImage(event)" alt="">
                    <i :class="{ 'has-art': skillEffectImage(event) }">
                      <img v-if="skillEffectImage(event)" class="skill-cast-icon" :src="skillEffectImage(event)" alt="">
                      <span v-else>{{ skillEffectGlyph(event) }}</span>
                    </i>
                    <b>{{ skillEffectTitle(event) }}</b>
                    <strong v-if="skillDamageText(event)" class="skill-cast-damage">{{ skillDamageText(event) }}</strong>
                  </div>
                  <span>{{ event.round ? `第${event.round}回合` : "战报" }}</span>
                  <p>{{ event.text }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="panel" v-else-if="detailView === 'rank'">
            <div class="section-head">
              <h3>天南小榜</h3>
              <div class="segmented">
                <button
                  v-for="board in rankBoards"
                  :key="board.id"
                  class="segment"
                  :class="{ active: activeRankBoard === board.id }"
                  type="button"
                  :aria-pressed="activeRankBoard === board.id"
                  @click="selectRankBoard(board.id)"
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
              <div v-if="activeRankBoard === 'power'" class="rank-sort-controls" aria-label="个人战力排序">
                <label>
                  <span>排序</span>
                  <select v-model="powerSortKey">
                    <option v-for="option in powerSortOptions" :key="option.id" :value="option.id">{{ option.label }}</option>
                  </select>
                </label>
                <button class="secondary rank-sort-direction" type="button" @click="powerSortDirection = powerSortDirection === 'desc' ? 'asc' : 'desc'">
                  {{ powerSortDirection === "desc" ? "降序" : "升序" }}
                </button>
              </div>
              <span class="rank-count">共 {{ filteredRanking.length }} 条</span>
            </div>
            <div class="rank-list">
              <button
                class="row rank-row"
                :class="{ 'person-rank-row': item.kind === 'person', 'top-rank-row': rankPageStart + index < 3 }"
                v-for="(item, index) in pagedRanking"
                :key="`${activeRankBoard}-${item.name}-${item.sect}`"
                type="button"
                :disabled="item.kind === 'realmStats'"
                :aria-label="`${item.name}：${item.help}`"
                @click="openRankItem(item)"
              >
                <span
                  v-if="rankPageStart + index < 3"
                  class="rank-medal"
                  :class="`rank-medal-${rankPageStart + index + 1}`"
                  aria-hidden="true"
                >
                  <span>{{ rankPageStart + index + 1 }}</span>
                </span>
                <span v-else class="tag rank-number">#{{ rankPageStart + index + 1 }}</span>
                <CharacterPortrait v-if="item.kind === 'person'" :person="rankPerson(item)" size="sm" />
                <div><strong>{{ item.name }}</strong><small>{{ item.subtitle }}</small></div>
                <span class="rank-value">{{ activeRankBoard === "power" ? item.sortLabel : item.value }}</span>
                <small class="rank-tip" role="tooltip">{{ item.help }}</small>
              </button>
              <div v-if="!pagedRanking.length" class="empty">没有找到匹配的榜单记录。</div>
            </div>
            <div class="rank-pager" v-if="rankPageCount > 1">
              <button class="secondary" type="button" :disabled="rankPage <= 1" @click="changeRankPage(-1)">上一页</button>
              <span>第 {{ rankPage }} / {{ rankPageCount }} 页</span>
              <form class="rank-page-jump" @submit.prevent="jumpRankPage">
                <input v-model="rankPageInput" type="number" min="1" :max="rankPageCount" aria-label="跳转页码">
                <button class="secondary" type="submit">跳转</button>
              </form>
              <button class="secondary" type="button" :disabled="rankPage >= rankPageCount" @click="changeRankPage(1)">下一页</button>
            </div>
          </div>

          <div class="panel character-dossier" v-else-if="detailView === 'person' && selectedPerson">
            <button class="secondary back-button" @click="returnFromDetail">{{ detailBackLabel }}</button>
            <div class="dossier-frame">
              <div class="detail-hero compact dossier-header">
                <div>
                  <h3>{{ selectedPerson.name }}</h3>
                  <p>{{ selectedPerson.sect }} · {{ genderLabel(selectedPerson.gender) }} · {{ realmName(selectedPerson.realm) }} · {{ rootLine(selectedPerson) }}</p>
                  <span class="tag skill-detail-tag" :title="skillTip(selectedPerson)">本命技能：{{ skillNameForDisplay(selectedPerson) }}</span>
                  <span class="tag rank-tag" :class="`duel-rank-${duelRankId(selectedPerson)}`">{{ duelRankText(selectedPerson) }}</span>
                  <span class="tag">{{ rootCounterText(selectedPerson) }}</span>
                </div>
                <span class="tag equipment-count-tag">{{ equippedFor(selectedPerson).length }}/{{ equipmentSlots.length }}</span>
              </div>

              <div class="detail-overview dossier-overview">
                <div class="detail-side-stats dossier-stat-bank">
                <div
                  class="detail-box"
                  v-for="item in personStats(selectedPerson).slice(0, Math.ceil(personStats(selectedPerson).length / 2))"
                  :key="item.label"
                  tabindex="0"
                  :aria-label="item.help ? `${item.label}：${item.value}。${item.help}` : `${item.label}：${item.value}`"
                >
                  <span class="detail-icon" :class="`detail-icon-${item.icon || 'default'}`" aria-hidden="true">
                    <span class="dossier-ai-icon" :class="`dossier-ai-icon-${item.icon || 'default'}`"></span>
                    <component :is="detailIconComponent(item.icon)" :size="16" :stroke-width="2.4" />
                  </span>
                  <span class="detail-label">{{ item.label }}</span>
                  <b :title="`${item.label}：${item.value}`">{{ item.value }}</b>
                  <small class="detail-tip" role="tooltip">
                    <strong>{{ item.label }}：{{ item.value }}</strong>
                    <span>{{ item.help || `当前为 ${item.value}。` }}</span>
                  </small>
                </div>
              </div>

              <div class="equipment-avatar-panel detail-equipment-top dossier-core">
                <div class="equipment-paperdoll">
                  <div class="equipment-slot-column">
                    <div class="equipment-slot-card" v-for="slot in equipmentSlots.slice(0, 3)" :key="slot.id" :class="equipmentSlotCardClass(selectedPerson, slot)">
                      <EquipmentIcon v-if="equippedInSlot(selectedPerson, slot.id)" :id="equippedInSlot(selectedPerson, slot.id)?.id" :name="equippedInSlot(selectedPerson, slot.id)?.name" :slot="slot.id" :tier="equippedInSlot(selectedPerson, slot.id)?.tier" />
                      <span>{{ slot.name }}</span>
                      <strong>{{ equippedInSlot(selectedPerson, slot.id)?.name || "空" }}</strong>
                      <small>{{ equipmentSlotSummary(selectedPerson, slot) }}</small>
                    </div>
                  </div>
                  <div class="equipment-character-core">
                    <CharacterPortrait :person="withDuelRank(selectedPerson)" size="xl" />
                    <b>{{ personPower(selectedPerson) }}</b>
                    <span>战斗力</span>
                  </div>
                  <div class="equipment-slot-column">
                    <div class="equipment-slot-card" v-for="slot in equipmentSlots.slice(3)" :key="slot.id" :class="equipmentSlotCardClass(selectedPerson, slot)">
                      <EquipmentIcon v-if="equippedInSlot(selectedPerson, slot.id)" :id="equippedInSlot(selectedPerson, slot.id)?.id" :name="equippedInSlot(selectedPerson, slot.id)?.name" :slot="slot.id" :tier="equippedInSlot(selectedPerson, slot.id)?.tier" />
                      <span>{{ slot.name }}</span>
                      <strong>{{ equippedInSlot(selectedPerson, slot.id)?.name || "空" }}</strong>
                      <small>{{ equipmentSlotSummary(selectedPerson, slot) }}</small>
                    </div>
                    <div class="equipment-slot-card empty-slot" v-if="equipmentSlots.length < 6">
                      <span>预留</span>
                      <strong>未开启</strong>
                      <small>后续境界解锁</small>
                    </div>
                  </div>
                </div>
                <div class="detail-meters">
                  <Meter label="总经验" :value="selectedPerson.xp" :max="personXpNeed(selectedPerson)" />
                </div>
              </div>

              <div class="detail-side-stats dossier-stat-bank">
                <div
                  class="detail-box"
                  v-for="item in personStats(selectedPerson).slice(Math.ceil(personStats(selectedPerson).length / 2))"
                  :key="item.label"
                  tabindex="0"
                  :aria-label="item.help ? `${item.label}：${item.value}。${item.help}` : `${item.label}：${item.value}`"
                >
                  <span class="detail-icon" :class="`detail-icon-${item.icon || 'default'}`" aria-hidden="true">
                    <span class="dossier-ai-icon" :class="`dossier-ai-icon-${item.icon || 'default'}`"></span>
                    <component :is="detailIconComponent(item.icon)" :size="16" :stroke-width="2.4" />
                  </span>
                  <span class="detail-label">{{ item.label }}</span>
                  <b :title="`${item.label}：${item.value}`">{{ item.value }}</b>
                  <small class="detail-tip" role="tooltip">
                    <strong>{{ item.label }}：{{ item.value }}</strong>
                    <span>{{ item.help || `当前为 ${item.value}。` }}</span>
                  </small>
                </div>
              </div>
            </div>

            <div class="grid detail-sections dossier-insight">
              <div class="panel flat">
                <h3>灵根命盘</h3>
                <div class="root-chip-list">
                  <span class="root-chip" v-for="root in rootList(selectedPerson)" :key="`${selectedPerson.id}-${root.key}`" :class="{ primary: root.key === primaryRoot(selectedPerson).key }">
                    {{ root.name }}<small>{{ root.key === primaryRoot(selectedPerson).key ? "主" : "副" }} · {{ rootBonusText(selectedPerson, root) }}</small>
                  </span>
                </div>
                <ul class="root-summary-list">
                  <li v-for="line in rootSummaryLines(selectedPerson)" :key="line">{{ line }}</li>
                </ul>
              </div>
              <div class="panel flat">
                <h3>明日预估</h3>
                <div class="attribute-list compact">
                  <div class="attribute-row">
                    <span>经验</span>
                    <strong>{{ personInsight(selectedPerson).tomorrowXp.total }}</strong>
                    <small>{{ tomorrowXpText(selectedPerson) }}</small>
                  </div>
                  <div class="attribute-row">
                    <span>突破</span>
                    <strong>{{ formatPercent(personInsight(selectedPerson).breakthrough.total) }}</strong>
                    <small>{{ breakthroughPartsText(selectedPerson) }}</small>
                  </div>
                </div>
              </div>
            </div>

            <div class="grid detail-sections record-sections dossier-records">
              <div class="panel flat">
                <h3>每日成长</h3>
                <div class="timeline detail-scroll">
                  <div
                    class="event"
                    :class="{ bad: dailyRecordFailed(record), gold: dailyRecordSucceeded(record) }"
                    v-for="record in personDailyRecords(selectedPerson)"
                    :key="`${record.day}-${record.note}`"
                  >
                    <strong>{{ shortDisplayDate(record) }} · {{ dailyRecordMainText(record) }}</strong>
                    <span v-if="dailyRecordMetaText(selectedPerson, record)">{{ dailyRecordMetaText(selectedPerson, record) }}</span>
                  </div>
                  <div v-if="!personDailyRecords(selectedPerson).length" class="empty">暂无成长记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>突破记录</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ bad: !record.success, gold: record.success }" v-for="record in selectedPerson.breakthroughs" :key="`${record.day}-${record.from}-${record.to}`">
                    <strong>{{ shortDisplayDate(record) }} · {{ record.from }} → {{ record.to }} · {{ record.success ? "成功" : "失败" }}</strong>
                    <span>{{ breakthroughRecordMetaText(record) }}</span>
                  </div>
                  <div v-if="!selectedPerson.breakthroughs.length" class="empty">暂无突破记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>切磋战绩</h3>
                <p>第 {{ duelSeasonInfo.season }} 赛季：{{ duelRankText(selectedPerson) }}，{{ selectedPerson.duelSeason?.wins || 0 }} 胜 {{ selectedPerson.duelSeason?.losses || 0 }} 负；累计 {{ selectedPerson.duelWins || 0 }} 胜 {{ selectedPerson.duelLosses || 0 }} 负。</p>
                <div class="duel-history-strip" v-if="selectedPerson.duelSeasonHistory?.length">
                  <span v-for="record in selectedPerson.duelSeasonHistory" :key="`${selectedPerson.id}-season-${record.season}`" class="duel-season-badge" :class="`duel-rank-${record.rankId}`">
                    S{{ record.season }} {{ record.rankName }} {{ record.score }}分<span v-if="record.spiritReward"> · +{{ record.spiritReward }}灵石</span>
                  </span>
                </div>
                <div class="timeline detail-scroll">
                  <button
                    class="event duel-record"
                    :class="{ bad: record.result === '负', gold: record.result === '胜', replayable: hasReplay(record) }"
                    v-for="record in selectedPerson.duelHistory"
                    :key="`${record.foughtAt || record.day}-${record.opponent}-${record.result}`"
                    type="button"
                    :disabled="!hasReplay(record)"
                    @click="openDuelReplay(record)"
                  >
                    <strong>{{ duelRecordTitle(record) }}</strong>
                    <span>{{ duelRecordMeta(record) }}</span>
                  </button>
                  <div v-if="!selectedPerson.duelHistory?.length" class="empty">暂无切磋明细。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>副本闯关</h3>
                <div class="timeline detail-scroll">
                  <button
                    class="event event-button"
                    :class="{ bad: dungeonRecordFailed(record), gold: dungeonRecordSucceeded(record), replayable: hasReplay(record) }"
                    v-for="record in selectedPerson.dungeonHistory || []"
                    :key="`${record.day}-${record.type}-${record.name}-${record.result}`"
                    type="button"
                    :disabled="!hasReplay(record)"
                    @click="openReplay(record)"
                  >
                    <strong>{{ dungeonRecordTitle(record) }}</strong>
                    <span>{{ dungeonRecordMetaText(record) }}</span>
                    <small v-if="record.item">{{ record.tierName }}「{{ record.item }}」</small>
                  </button>
                  <div v-if="!selectedPerson.dungeonHistory?.length" class="empty">暂无副本闯关记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>技能升阶</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ gold: skillUpgradeRecordSucceeded(record), bad: !skillUpgradeRecordSucceeded(record) }" v-for="record in selectedPerson.skillUpgrades || []" :key="`${record.day}-${record.skillId}-${record.toRank}-${record.success === false ? 'fail' : 'success'}`">
                    <strong>{{ skillUpgradeRecordTitle(record) }}</strong>
                    <span>{{ skillUpgradeRecordMetaText(record) }}</span>
                  </div>
                  <div v-if="!selectedPerson.skillUpgrades?.length" class="empty">暂无技能升阶记录。</div>
                </div>
              </div>
            </div>
            </div>
          </div>

          <div class="panel" v-else-if="detailView === 'sect' && selectedSect">
            <button class="secondary back-button" @click="returnFromDetail">{{ detailBackLabel }}</button>
            <div class="section-head">
              <div>
                <h3>{{ selectedSect.name }}</h3>
                <p>总战力 {{ selectedSect.totalPower }} · 掌门 {{ sectLeaderName(selectedSect) }} · 长老 {{ sectElderNames(selectedSect) }}</p>
              </div>
            </div>
            <div class="detail-grid">
              <div class="detail-box" v-for="[label, value] in sectStats(selectedSect)" :key="label">
                <b>{{ value }}</b>
                <span>{{ label }}</span>
              </div>
            </div>
            <div class="grid detail-sections sect-detail-sections sect-record-sections">
              <div class="panel flat sect-member-panel">
                <div class="section-head compact">
                  <div>
                    <h3>人物列表</h3>
                    <p>{{ sectMembers(selectedSect).length }} 人 · 按战力展示宗门成员</p>
                  </div>
                </div>
                <div class="sect-member-grid">
                  <button class="sect-member-card" :class="{ leader: member.id === selectedSect.leaderId }" v-for="member in sectMembers(selectedSect)" :key="member.id" @click="openPersonById(member.id)">
                    <CharacterPortrait :person="member" size="md" />
                    <div class="sect-member-main">
                      <div class="sect-member-topline">
                        <span class="tag">{{ realmName(member.realm) }}</span>
                        <span v-if="sectMemberOffice(selectedSect, member) && member.id !== selectedSect.leaderId" class="member-badge office">{{ sectMemberOffice(selectedSect, member) }}</span>
                        <span class="member-badge" :class="{ player: member.isPlayer }">{{ member.isPlayer ? "你" : "NPC" }}</span>
                      </div>
                      <strong>{{ member.name }}</strong>
                      <small>{{ genderLabel(member.gender) }}</small>
                    </div>
                    <div class="sect-member-power">
                      <b>{{ member.power }}</b>
                      <span>战力</span>
                    </div>
                  </button>
                </div>
              </div>
              <div class="panel flat sect-war-panel">
                <h3>攻守城战绩</h3>
                <p class="sect-war-summary">
                  攻守城战绩：
                  <strong class="win">{{ sectWarStats(selectedSect).wins }} 胜</strong>
                  <strong class="loss">{{ sectWarStats(selectedSect).losses }} 负</strong>
                </p>
                <div class="timeline detail-scroll">
                  <button
                    class="event event-button sect-war-event"
                    :class="{ 'war-victory': war.sectWarWon, 'war-defeat': !war.sectWarWon }"
                    v-for="war in sectWarRecords(selectedSect)"
                    :key="`sect-war-${selectedSect.name}-${war.id}`"
                    type="button"
                    @click="openSectWarRecord(war)"
                  >
                    <span class="sect-war-stamp" :class="[war.sectWarSide, war.sectWarWon ? 'win' : 'loss']">
                      <b>{{ war.sectWarSideLabel }}</b>
                      <em>{{ war.sectWarOutcomeLabel }}</em>
                    </span>
                    <span class="sect-war-body">
                      <strong>{{ shortDisplayDate(war) }} · {{ war.provinceName }}</strong>
                      <span>{{ war.attacker }} 攻 {{ war.defender }} · {{ war.captured ? "易主" : "守住" }}</span>
                      <small>{{ war.battles?.length || 0 }} 场车轮战</small>
                    </span>
                  </button>
                  <div v-if="!sectWarRecords(selectedSect).length" class="empty">暂无攻守城记录。</div>
                </div>
              </div>
              <div class="panel flat">
                <h3>虚天殿记录</h3>
                <div class="timeline detail-scroll">
                  <button
                    class="event event-button sect-dungeon-event"
                    :class="{ gold: record.success, bad: !record.success }"
                    v-for="record in sectDungeonRecords(selectedSect)"
                    :key="`${selectedSect.name}-${record.day}`"
                    type="button"
                    :disabled="false"
                    @click="openSectVoidHallRecord(record)"
                  >
                    <strong>{{ shortDisplayDate(record) }} · {{ record.success ? "通关" : "未通关" }} · {{ record.monster }}</strong>
                    <span>{{ record.monsterRealm }} · 输出 {{ record.totalDamage }} · 剩余 {{ voidHallRemainingHp(record) }} · {{ record.success ? `灵石 +${record.spiritShare || 0}` : "无灵石" }}</span>
                    <small>{{ sectDungeonRecordMeta(record) }}</small>
                  </button>
                  <div v-if="!sectDungeonRecords(selectedSect).length" class="empty">暂无虚天殿记录。</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'admin'" class="view active cultivation-surface admin-surface">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>后台管理</h3>
                <p>角色、头像与宗门资料会保存到本地存档。</p>
              </div>
              <div class="admin-head-actions">
                <label class="admin-search">
                  <span>搜索</span>
                  <input v-model.trim="adminSearch" :placeholder="adminMode === 'cultivators' ? '人物名或宗门名' : adminMode === 'sects' ? '宗门名' : '任务名或分类'">
                </label>
                <div class="segmented">
                  <button class="segment" :class="{ active: adminMode === 'cultivators' }" type="button" @click="adminMode = 'cultivators'">角色</button>
                  <button class="segment" :class="{ active: adminMode === 'sects' }" type="button" @click="adminMode = 'sects'">宗门</button>
                  <button class="segment" :class="{ active: adminMode === 'tasks' }" type="button" @click="adminMode = 'tasks'">现实任务</button>
                </div>
              </div>
            </div>

            <div v-if="adminMode === 'cultivators'" class="admin-layout">
              <div class="admin-list" role="list" aria-label="角色列表">
                <button
                  v-for="person in filteredAdminCultivators"
                  :key="person.id"
                  class="admin-list-row admin-cultivator-row"
                  :class="{ active: adminSelectedCultivatorId === person.id }"
                  type="button"
                  @click="selectAdminCultivator(person.id)"
                >
                  <CharacterPortrait :person="person" size="sm" />
                  <span><strong>{{ person.name }}</strong><small>{{ person.sect }} · {{ realmName(person.realm) }}</small></span>
                  <b>{{ personPower(person) }}</b>
                </button>
                <div v-if="!filteredAdminCultivators.length" class="empty">没有找到匹配的人物。</div>
              </div>

              <form v-if="adminCultivatorPerson" class="admin-editor admin-cultivator-editor" @submit.prevent="saveCultivatorProfile">
                <div class="admin-editor-head" v-if="adminCultivatorPerson">
                  <CharacterPortrait :person="{ ...adminCultivatorPerson, portraitUrl: adminCultivatorDraft.portraitUrl }" size="xl" />
                  <div>
                    <strong>{{ adminCultivatorDraft.name || adminCultivatorPerson.name }}</strong>
                    <small>{{ realmName(adminCultivatorPerson.realm) }} · {{ rootLine(adminCultivatorPerson) }}</small>
                  </div>
                  <div class="admin-character-head-stats">
                    <span>战力 <b>{{ personPower(adminCultivatorPerson) }}</b></span>
                    <span>经验 <b>{{ adminCultivatorDraft.xp }}</b></span>
                    <span>灵石 <b>{{ adminCultivatorDraft.spirit }}</b></span>
                  </div>
                </div>
                <div class="admin-editor-section">
                  <div class="admin-section-title">角色档案</div>
                  <div class="admin-form-grid">
                    <label>
                      <span>名字</span>
                      <input v-model.trim="adminCultivatorDraft.name" maxlength="24">
                    </label>
                    <label>
                      <span>性别</span>
                      <select v-model="adminCultivatorDraft.gender">
                        <option value="male">男</option>
                        <option value="female">女</option>
                        <option value="unknown">未知</option>
                      </select>
                    </label>
                    <label class="admin-field-wide">
                      <span>技能</span>
                      <select v-model="adminCultivatorDraft.skillId">
                        <option v-for="skill in combatSkills" :key="`admin-skill-${skill.id}`" :value="skill.id">{{ skill.name }}</option>
                      </select>
                    </label>
                  </div>
                </div>
                <div class="admin-editor-section">
                  <div class="admin-section-title">资源</div>
                  <div class="admin-form-grid admin-resource-grid">
                    <label>
                      <span>经验</span>
                      <input v-model.number="adminCultivatorDraft.xp" type="number" min="0" step="1">
                    </label>
                    <label>
                      <span>灵石</span>
                      <input v-model.number="adminCultivatorDraft.spirit" type="number" min="0" step="1">
                    </label>
                  </div>
                </div>
                <div class="admin-editor-section">
                  <div class="admin-section-title">基础属性</div>
                  <div class="admin-form-grid admin-stat-grid">
                    <label>
                      <span>气血</span>
                      <input v-model.number="adminCultivatorDraft.maxHp" type="number" min="1" step="1">
                    </label>
                    <label>
                      <span>攻击</span>
                      <input v-model.number="adminCultivatorDraft.attack" type="number" min="1" step="1">
                    </label>
                    <label>
                      <span>防御</span>
                      <input v-model.number="adminCultivatorDraft.defense" type="number" min="0" step="1">
                    </label>
                    <label>
                      <span>神识</span>
                      <input v-model.number="adminCultivatorDraft.divineSense" type="number" min="1" step="1">
                    </label>
                    <label>
                      <span>法力</span>
                      <input v-model.number="adminCultivatorDraft.maxMana" type="number" min="1" step="1">
                    </label>
                  </div>
                </div>
                <div class="admin-editor-section">
                  <div class="admin-section-title">灵根命盘</div>
                  <div class="admin-root-grid" aria-label="灵根选择">
                    <label v-for="root in catalogRoots" :key="`admin-root-${root.key}`" class="admin-check">
                      <input type="checkbox" :checked="adminCultivatorDraft.rootKeys.includes(root.key)" @change="toggleAdminRoot(root.key)">
                      <span>{{ root.name }}</span>
                    </label>
                  </div>
                </div>
                <div class="admin-actions">
                  <label class="secondary admin-upload-button">
                    <ImagePlus :size="16" aria-hidden="true" />
                    上传头像
                    <input type="file" accept="image/*" @change="openImageEditor($event, 'cultivator')">
                  </label>
                  <button class="primary" type="submit" :disabled="isActionPending('/api/admin/cultivator')">保存角色</button>
                </div>
              </form>
              <div v-else class="admin-editor empty">换个名字或宗门再搜一下。</div>
            </div>

            <div v-else-if="adminMode === 'sects'" class="admin-layout">
              <div class="admin-list" role="list" aria-label="宗门列表">
                <button
                  v-for="sect in filteredAdminSects"
                  :key="sect.id"
                  class="admin-list-row admin-sect-row"
                  :class="{ active: adminSelectedSectName === sect.name }"
                  type="button"
                  @click="selectAdminSect(sect.name)"
                >
                  <span class="sect-avatar" :style="sectAvatarStyle(sect)"></span>
                  <span>
                    <strong>{{ sect.name }}</strong>
                    <small>{{ sectMemberCount(sect.name) }} 人 · 战力 {{ sectTotalPower(sect.name) }}</small>
                  </span>
                  <b>{{ sectLeaderName(sect) }}</b>
                </button>
                <div v-if="!filteredAdminSects.length" class="empty">没有找到匹配的宗门。</div>
              </div>

              <form class="admin-editor admin-sect-editor" @submit.prevent="saveSectProfile">
                <div class="admin-editor-head" v-if="adminSectDraft.oldName">
                  <span class="sect-avatar xl" :style="sectAvatarStyle(adminSectDraft)"></span>
                  <div>
                    <strong>{{ adminSectDraft.name }}</strong>
                    <small>{{ sectMemberCount(adminSectDraft.oldName) }} 名修士 · 总战力 {{ sectTotalPower(adminSectDraft.oldName) }}</small>
                  </div>
                  <div class="admin-sect-head-stats">
                    <span>掌门 <b>{{ adminSectLeaderName }}</b></span>
                    <span>长老 <b>{{ adminSectElderNames }}</b></span>
                  </div>
                </div>
                <div class="admin-editor-section">
                  <div class="admin-section-title">宗门档案</div>
                  <label>
                    <span>宗门名</span>
                    <input v-model.trim="adminSectDraft.name" maxlength="24">
                  </label>
                </div>
                <div class="admin-form-grid admin-sect-office-grid">
                  <div class="admin-editor-section">
                    <div class="admin-section-title">掌门</div>
                    <label>
                      <span>掌门人选</span>
                      <select v-model="adminSectDraft.leaderId" @change="sanitizeAdminSectOffices">
                        <option value="">按战力最高自动展示</option>
                        <option v-for="member in adminSectMembers" :key="`leader-${member.id}`" :value="member.id">{{ member.name }} · {{ realmName(member.realm) }}</option>
                      </select>
                    </label>
                    <p class="admin-help-text">掌门会从宗门成员中选择，不能同时担任长老。</p>
                  </div>
                  <div class="admin-editor-section">
                    <div class="admin-section-title">长老</div>
                    <div class="admin-field-block">
                      <span>长老人选</span>
                      <div class="admin-check-list">
                        <label v-for="member in adminElderOptions" :key="`elder-${member.id}`" class="admin-check-row">
                          <input type="checkbox" :value="member.id" v-model="adminSectDraft.elderIds">
                          <span>{{ member.name }} · {{ realmName(member.realm) }}</span>
                        </label>
                        <small v-if="!adminElderOptions.length">暂无可选长老。</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="admin-actions">
                  <label class="secondary admin-upload-button">
                    <ImagePlus :size="16" aria-hidden="true" />
                    上传宗门头像
                    <input type="file" accept="image/*" @change="openImageEditor($event, 'sect')">
                  </label>
                  <button class="primary" type="submit" :disabled="isActionPending('/api/admin/sect')">保存宗门</button>
                </div>
              </form>
            </div>

            <div v-else class="admin-layout">
              <div class="admin-list" role="list" aria-label="现实任务列表">
                <button
                  v-for="task in filteredAdminTasks"
                  :key="task.id"
                  class="admin-list-row"
                  :class="{ active: adminSelectedTaskId === task.id, muted: task.enabled === false }"
                  type="button"
                  @click="selectAdminTask(task.id)"
                >
                  <span class="sect-avatar task-category-avatar">
                    <component :is="taskCategoryIcon(task.category)" :size="16" aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{{ task.name }}</strong>
                    <small>{{ task.category }} · {{ task.xpReward }} 经验 · {{ task.spiritReward }} 灵石</small>
                  </span>
                </button>
                <div v-if="!filteredAdminTasks.length" class="empty">没有找到匹配的现实任务。</div>
              </div>

              <form class="admin-editor" @submit.prevent="saveTaskDefinition">
                <div class="admin-editor-head">
                  <span class="sect-avatar xl task-category-avatar">
                    <component :is="taskCategoryIcon(adminTaskDraft.category)" :size="22" aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{{ adminTaskDraft.name || "新增现实任务" }}</strong>
                    <small>{{ adminTaskDraft.type === "measurable" ? "按完成量折算奖励" : "完整完成后获得奖励" }}</small>
                  </div>
                </div>
                <div class="admin-form-grid">
                  <label>
                    <span>任务名</span>
                    <input v-model.trim="adminTaskDraft.name" maxlength="40" required>
                  </label>
                  <label>
                    <span>分类</span>
                    <select v-model="adminTaskDraft.category">
                      <option v-for="category in taskCategoryOptions" :key="category.id" :value="category.id">{{ category.label }}</option>
                    </select>
                  </label>
                  <label>
                    <span>类型</span>
                    <select v-model="adminTaskDraft.type">
                      <option value="complete">完整完成</option>
                      <option value="measurable">量化任务</option>
                    </select>
                  </label>
                  <label>
                    <span>单位</span>
                    <input v-model.trim="adminTaskDraft.unitName" maxlength="10" :disabled="adminTaskDraft.type === 'complete'">
                  </label>
                  <label>
                    <span>标准数量</span>
                    <input v-model.number="adminTaskDraft.targetAmount" type="number" min="0.01" step="0.01" :disabled="adminTaskDraft.type === 'complete'">
                  </label>
                  <label>
                    <span>最高倍数</span>
                    <input v-model.number="adminTaskDraft.maxMultiplier" type="number" min="0.01" step="0.01" :disabled="adminTaskDraft.type === 'complete'">
                  </label>
                  <label>
                    <span>经验</span>
                    <input v-model.number="adminTaskDraft.xpReward" type="number" min="0" step="1">
                  </label>
                  <label>
                    <span>灵石</span>
                    <input v-model.number="adminTaskDraft.spiritReward" type="number" min="0" step="1">
                  </label>
                </div>
                <label>
                  <span>任务详细</span>
                  <textarea v-model.trim="adminTaskDraft.detail" maxlength="180" rows="4"></textarea>
                </label>
                <label class="admin-check">
                  <input v-model="adminTaskDraft.enabled" type="checkbox">
                  <span>启用任务</span>
                </label>
                <div class="admin-actions">
                  <button class="secondary" type="button" @click="resetAdminTaskDraft">新增</button>
                  <button class="secondary" type="button" :disabled="!adminTaskDraft.id" @click="toggleAdminTask()">{{ adminTaskDraft.enabled ? "停用" : "启用" }}</button>
                  <button class="danger" type="button" :disabled="!adminTaskDraft.id" @click="deleteAdminTask()">删除</button>
                  <button class="primary" type="submit" :disabled="isActionPending(adminTaskDraft.id ? '/api/task-definitions/update' : '/api/task-definitions')">保存任务</button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div v-if="imageEditor.open" class="modal-backdrop" @click.self="closeImageEditor">
      <section class="image-cropper modal-panel" role="dialog" aria-modal="true" aria-label="头像裁剪">
        <div class="section-head compact">
          <h3>裁剪头像</h3>
          <button class="secondary" type="button" @click="closeImageEditor">取消</button>
        </div>
        <div class="crop-preview-wrap">
          <canvas ref="cropCanvas" class="crop-preview" :width="cropOutputSize" :height="cropOutputSize"></canvas>
        </div>
        <div class="crop-controls">
          <label><span>缩放</span><input v-model.number="imageEditor.zoom" type="range" min="1" max="3" step="0.01" @input="drawCropPreview"></label>
          <label><span>横向</span><input v-model.number="imageEditor.offsetX" type="range" min="-1" max="1" step="0.01" @input="drawCropPreview"></label>
          <label><span>纵向</span><input v-model.number="imageEditor.offsetY" type="range" min="-1" max="1" step="0.01" @input="drawCropPreview"></label>
        </div>
        <div class="actions">
          <button class="secondary" type="button" @click="closeImageEditor">取消</button>
          <button class="primary" type="button" @click="applyCroppedImage">使用裁剪图</button>
        </div>
      </section>
    </div>
    </template>

    <div v-if="error" class="toast">{{ error }}</div>
  </div>
</template>

<script setup>
import {
  BadgeCent,
  Backpack,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Cloud,
  Coins,
  Dna,
  Dumbbell,
  Flame,
  Gem,
  ImagePlus,
  Landmark,
  Leaf,
  Minus,
  Mountain,
  Orbit,
  Package,
  Plus,
  ShoppingBag,
  Route,
  ScrollText,
  Settings,
  Sparkles,
  Sprout,
  Sun,
  Sword,
  Swords,
  Trophy,
  Waves,
  WandSparkles,
  Zap
} from "lucide-vue-next";
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from "vue";
import { clearCachedState, getBattleReplay, getCachedState, getCultivatorDetail, getCurrentUser, getDuelReplay, getState, login, logout, postAction, register, saveCachedState } from "./api";
import CharacterPortrait from "./components/CharacterPortrait.vue";
import EquipmentIcon from "./components/EquipmentIcon.vue";
import LogPanel from "./components/LogPanel.vue";
import Meter from "./components/Meter.vue";
import MonsterEmblem from "./components/MonsterEmblem.vue";
import StatIcon, { statIconComponent } from "./components/StatIcon.vue";
import { monsterImageEntries, monsterStageNames } from "./monsterImages";
import { equipmentCatalog as fallbackEquipmentCatalog, equipmentSlots as fallbackEquipmentSlots, equipmentTiers as fallbackEquipmentTiers } from "../../shared/equipmentData.mjs";
import { duelLossScore, duelRanks, duelRankForScore, duelSeasonDay, duelSeasonLength, duelSeasonMaxScore, duelSeasonOfDay, duelWinScore } from "../../shared/duelSeasonData.mjs";

const tabs = [
  { id: "practice", label: "首页", icon: Sprout },
  { id: "cultivation", label: "修行", icon: Orbit },
  { id: "tasks", label: "任务", icon: ScrollText },
  { id: "dungeon", label: "副本", icon: Sword },
  { id: "sect", label: "宗门", icon: Landmark },
  { id: "arena", label: "切磋", icon: Swords },
  { id: "market", label: "坊市", icon: ShoppingBag },
  { id: "equipment", label: "装备", icon: Package },
  { id: "rank", label: "榜单", icon: Trophy },
  { id: "admin", label: "后台", icon: Settings }
];

const cultivationSubTabs = [
  { id: "attributes", label: "灵根", icon: BadgeCent },
  { id: "progression", label: "境界", icon: Orbit },
  { id: "skills", label: "技能", icon: WandSparkles }
];

const marketSubTabs = [
  { id: "shop", label: "商城", icon: ShoppingBag },
  { id: "bag", label: "背包", icon: Backpack }
];

const taskCategoryOptions = [
  { id: "生活", label: "生活", icon: Leaf },
  { id: "学习", label: "学习", icon: BookOpen },
  { id: "工作", label: "工作", icon: Landmark },
  { id: "运动", label: "运动", icon: Dumbbell }
];

const rankBoards = [
  { id: "power", label: "个人战力" },
  { id: "duel", label: "切磋段位" },
  { id: "sect", label: "宗门战力" },
  { id: "dungeon", label: "副本闯关" },
  { id: "realmStats", label: "境界统计" }
];

const powerSortOptions = [
  { id: "power", label: "战力" },
  { id: "realm", label: "境界" },
  { id: "maxHp", label: "血量" },
  { id: "attack", label: "攻击" },
  { id: "defense", label: "防御" },
  { id: "divineSense", label: "神识" },
  { id: "maxMana", label: "法力" },
  { id: "spirit", label: "灵石" }
];

const emptyState = {
  day: 1,
  calendarStartDate: "",
  lastSettlementDate: "",
  player: {
    id: "player",
    name: "",
    realm: 0,
    layer: 1,
    xp: 0,
    hp: 0,
    maxHp: 1,
    mood: 0,
    maxMood: 1,
    spirit: 0,
    sect: "",
    root: { key: "metal", name: "金灵根" },
    roots: [],
    attributes: {},
    dailyRecords: [],
    breakthroughs: [],
    skillUpgrades: [],
    duelHistory: [],
    dungeonHistory: [],
    equipment: {}
  },
  sect: { reputation: 0 },
  npcs: [],
  tasks: [],
  taskDefinitions: [],
  taskCompletions: [],
  log: [],
  logDays: [],
  bag: {},
  equipment: [],
  equipmentTransfers: [],
  provinces: [],
  provinceWars: [],
  duelDays: [],
  dungeonDays: [],
  sectProfiles: [],
  catalog: {},
  derived: {}
};

const skillAssetPaths = {
  azure_sword: "/assets/skill-effects/azure_sword.png",
  thunder_pearl: "/assets/skill-effects/thunder_pearl.png",
  blood_escape: "/assets/skill-effects/blood_escape.png",
  poison_flame: "/assets/skill-effects/poison_flame.png",
  magnetic_light: "/assets/skill-effects/magnetic_light.png",
  golden_body: "/assets/skill-effects/golden_body.png",
  soul_hook: "/assets/skill-effects/soul_hook.png",
  green_bamboo: "/assets/skill-effects/green_bamboo.png",
  spirit_armor: "/assets/skill-effects/spirit_armor.png",
  bone_spike: "/assets/skill-effects/bone_spike.png",
  fire_crow: "/assets/skill-effects/fire_crow.png",
  wood_recovery: "/assets/skill-effects/wood_recovery.png",
  ghost_step: "/assets/skill-effects/ghost_step.png",
  demon_cut: "/assets/skill-effects/demon_cut.png",
  ice_seal: "/assets/skill-effects/ice_seal.png",
  starfall: "/assets/skill-effects/starfall.png",
  blood_drink: "/assets/skill-effects/blood_drink.png",
  mirror_water: "/assets/skill-effects/mirror_water.png",
  wind_blade: "/assets/skill-effects/wind_blade.png",
  five_element: "/assets/skill-effects/five_element.png"
};

const skillGlyphs = {
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

const state = shallowRef(null);
const authLoading = ref(true);
const authPending = ref(false);
const authUser = ref(null);
const authMode = ref("login");
const authError = ref("");
const accountMenuOpen = ref(false);
const authForm = reactive({
  username: "",
  password: "",
  registrationCode: ""
});
const loading = ref(true);
const error = ref("");
const pendingActions = ref(new Set());
const fullStateRefreshing = ref(false);
const homeStateRefreshing = ref(false);
const fullStateStale = ref(false);
const personDetails = ref({});
const personDetailLoading = ref(new Set());
const activeTab = ref("practice");
const cultivationSubTab = ref("attributes");
const marketSubTab = ref("shop");
const activeMarketCategory = ref("xp");
const selectedMarketItemId = ref("");
const activeSectSubTab = ref("map");
const activeRankBoard = ref("power");
const rankSearch = ref("");
const rankPage = ref(1);
const rankPageInput = ref("1");
const rankPageSize = 10;
const powerSortKey = ref("power");
const powerSortDirection = ref("desc");
const equipmentTierFilter = ref("");
const equipmentSlotFilter = ref("");
const equipmentOwnedFilter = ref("");
const equipmentSortMode = ref("tier");
const equipmentSortDirection = ref("desc");
const dungeonDayIndex = ref(0);
const activeDungeonRecordTab = ref("blood");
const showDungeonLoot = ref(false);
const selectedVoidHallSect = ref("");
const detailView = ref("rank");
const selectedPersonId = ref("player");
const selectedSectName = ref("");
const detailReturnStack = ref([]);
const selectedRealmStage = ref("");
const selectedDuelDay = ref(null);
const duelSearch = ref("");
const selectedProvinceWarDay = ref(null);
const selectedHomeLogDay = ref(null);
const selectedProvinceWarId = ref("");
const provinceWarSearch = ref("");
const provinceResourceTypeFilter = ref("");
const provinceResourceOwnerFilter = ref("");
const lastBattle = ref(null);
const battleReturnTarget = ref(null);
const replayLoading = ref(false);
const battleCursor = ref(0);
const invalidReplayIds = ref(new Set());
const countdown = ref("--:--:--");
const taskForm = reactive({ category: "", taskId: "", completedAmount: 1 });
const collapsedTaskDays = ref(new Set());
const expandedTaskDays = ref(new Set());
const adminMode = ref("cultivators");
const adminSearch = ref("");
const adminSelectedCultivatorId = ref("player");
const adminSelectedSectName = ref("");
const adminSelectedTaskId = ref("");
const adminCultivatorDraft = reactive({
  id: "player",
  name: "",
  gender: "unknown",
  rootKeys: [],
  portraitUrl: "",
  skillId: "",
  xp: 0,
  spirit: 0,
  maxHp: 1,
  attack: 1,
  defense: 0,
  divineSense: 1,
  maxMana: 1
});
const adminSectDraft = reactive({ oldName: "", name: "", portraitUrl: "", leaderId: "", elderIds: [] });
const adminTaskDraft = reactive({
  id: "",
  name: "",
  detail: "",
  type: "complete",
  category: "生活",
  unitName: "次",
  targetAmount: 1,
  xpReward: 100,
  spiritReward: 10,
  maxMultiplier: 4,
  enabled: true
});
const cropCanvas = ref(null);
const imageEditor = reactive({
  open: false,
  target: "",
  sourceUrl: "",
  image: null,
  zoom: 1,
  offsetX: 0,
  offsetY: 0
});

const cropOutputSize = computed(() => imageEditor.target === "sect" ? 256 : 448);
const cropOutputQuality = computed(() => imageEditor.target === "sect" ? 0.82 : 0.9);
const chinaMapRef = ref(null);
const normalMapMount = ref(null);
const fullscreenMapMount = ref(null);
const mapFullscreen = ref(false);
const hoveredMapSect = ref("");
const hoveredRootKey = ref("");
const fallbackSkill = {
  id: "basic_strike",
  name: "凝气一击",
  cost: 0,
  cooldown: 0,
  text: "技能目录尚未加载时使用的基础攻击。"
};
const playerPortraitOptions = [
  "/portraits/generated/han-li.png",
  "/portraits/custom/lixinshu.jpg"
];

const sectSubTabs = [
  { id: "map", label: "势力地图", icon: "图" },
  { id: "sects", label: "宗门排行", icon: "榜" },
  { id: "provinces", label: "省份资源", icon: "资" },
  { id: "wars", label: "攻城记录", icon: "战" }
];

const gameState = computed(() => state.value || emptyState);
const player = computed(() => gameState.value.player);
const derived = computed(() => gameState.value.derived || {});
const catalog = computed(() => gameState.value.catalog || {});
const accountInitial = computed(() => {
  const name = String(authUser.value?.username || "?").trim();
  return name ? name.slice(0, 1).toUpperCase() : "?";
});
const equipmentSlots = computed(() => catalog.value.equipmentSlots?.length ? catalog.value.equipmentSlots : fallbackEquipmentSlots);
const equipmentTiers = computed(() => catalog.value.equipmentTiers?.length ? catalog.value.equipmentTiers : fallbackEquipmentTiers);
const duelRankList = computed(() => catalog.value.duelRanks?.length ? catalog.value.duelRanks : duelRanks);
const duelSeasonInfo = computed(() => derived.value.duelSeason || {
  season: duelSeasonOfDay(gameState.value.day),
  seasonDay: duelSeasonDay(gameState.value.day),
  length: duelSeasonLength,
  maxScore: duelSeasonMaxScore,
  winScore: duelWinScore,
  lossScore: duelLossScore
});
const fallbackDuelRankMap = computed(() => {
  const people = [gameState.value.player, ...(gameState.value.npcs || [])].filter(Boolean);
  const map = Object.fromEntries(people.map((person) => [person.id, {
    season: duelSeasonInfo.value.season,
    seasonDay: duelSeasonInfo.value.seasonDay,
    score: 0,
    wins: 0,
    losses: 0
  }]));
  const records = [...(gameState.value.duelDays || [])]
    .filter((record) => duelSeasonOfDay(record.day || gameState.value.day) === duelSeasonInfo.value.season)
    .sort((a, b) => a.day - b.day);
  for (const record of records) {
    for (const match of record.matches || []) {
      if (match.type === "bye") {
        continue;
      }
      const winnerId = match.winner?.id || (match.replay?.winner === "left" ? match.replay?.left?.id : match.replay?.right?.id);
      const loserId = match.loser?.id || (winnerId === match.replay?.left?.id ? match.replay?.right?.id : match.replay?.left?.id);
      applyDuelRankRecordDelta(map, winnerId, true, match.winnerScoreDelta);
      applyDuelRankRecordDelta(map, loserId, false, match.loserScoreDelta);
    }
  }
  return Object.fromEntries(Object.entries(map).map(([id, season]) => [id, {
    ...season,
    ...duelRankByScore(season.score)
  }]));
});
const currentDate = computed(() => dateForDay(gameState.value.day));
const currentDateLabel = computed(() => formatDateLabel(currentDate.value));
const taskDefinitions = computed(() => gameState.value.taskDefinitions || []);
const enabledTaskDefinitions = computed(() => taskDefinitions.value.filter((task) => task.enabled !== false));
const taskDailyGoal = computed(() => Math.max(6, enabledTaskDefinitions.value.length || 0));
const frontTaskCategories = computed(() => {
  const categories = [];
  for (const task of enabledTaskDefinitions.value) {
    const category = normalizedTaskCategory(task.category);
    if (!categories.includes(category)) categories.push(category);
  }
  return categories.map((category) => taskCategoryOptions.find((option) => option.id === category) || {
    id: category,
    label: category,
    icon: Leaf
  });
});
const taskJournalDays = 15;
const taskRecentDayFloor = computed(() => Math.max(1, (Number(gameState.value.day) || 1) - taskJournalDays + 1));
const taskDefinitionFrequency = computed(() => {
  const currentDay = Math.max(1, Number(gameState.value.day) || 1);
  const floorDay = taskRecentDayFloor.value;
  const stats = new Map();
  for (const task of taskCompletions.value) {
    const day = Number(task.day) || 0;
    if (day < floorDay || day > currentDay) continue;
    const key = task.taskId || task.name;
    if (!key) continue;
    const entry = stats.get(key) || { count: 0, lastDay: 0 };
    entry.count += 1;
    entry.lastDay = Math.max(entry.lastDay, day);
    stats.set(key, entry);
  }
  return stats;
});
const filteredTaskDefinitions = computed(() => {
  const category = taskForm.category || frontTaskCategories.value[0]?.id || "";
  const stats = taskDefinitionFrequency.value;
  return enabledTaskDefinitions.value
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => normalizedTaskCategory(task.category) === category)
    .sort((a, b) => {
      const aStats = stats.get(a.task.id) || stats.get(a.task.name) || { count: 0, lastDay: 0 };
      const bStats = stats.get(b.task.id) || stats.get(b.task.name) || { count: 0, lastDay: 0 };
      if (bStats.count !== aStats.count) return bStats.count - aStats.count;
      if (bStats.lastDay !== aStats.lastDay) return bStats.lastDay - aStats.lastDay;
      return a.index - b.index;
    })
    .map(({ task }) => task);
});
const selectedTaskDefinition = computed(() => filteredTaskDefinitions.value.find((task) => task.id === taskForm.taskId) || filteredTaskDefinitions.value[0] || null);
const taskCategoryCounts = computed(() => enabledTaskDefinitions.value.reduce((counts, task) => {
  const category = normalizedTaskCategory(task.category);
  counts[category] = (counts[category] || 0) + 1;
  return counts;
}, {}));
const taskCompletions = computed(() => gameState.value.taskCompletions?.length ? gameState.value.taskCompletions : gameState.value.tasks || []);
const todayTaskCompletions = computed(() => taskCompletions.value.filter((task) => task.day === gameState.value.day));
const todayTaskSummary = computed(() => todayTaskCompletions.value.reduce((summary, task) => ({
  count: summary.count + 1,
  xp: summary.xp + (Number(task.xp) || 0),
  spirit: summary.spirit + (Number(task.spirit) || 0)
}), { count: 0, xp: 0, spirit: 0 }));
const recentTaskDays = computed(() => {
  const currentDay = Math.max(1, Number(gameState.value.day) || 1);
  const currentTaskDate = dateForDay(currentDay);
  return Array.from({ length: taskJournalDays }, (_, index) => {
    const day = currentDay - index;
    const tasks = day >= 1
      ? taskCompletions.value
        .filter((task) => Number(task.day) === day)
        .sort((a, b) => String(b.id || "").localeCompare(String(a.id || "")))
      : [];
    const summary = tasks.reduce((total, task) => ({
      count: total.count + 1,
      xp: total.xp + (Number(task.xp) || 0),
      spirit: total.spirit + (Number(task.spirit) || 0)
    }), { count: 0, xp: 0, spirit: 0 });
    return {
      day,
      index,
      date: addDays(currentTaskDate, -index),
      isToday: day === currentDay,
      tasks,
      ...summary
    };
  });
});
const taskRewardPreview = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task) return { xp: 0, baseXp: 0, spirit: 0, multiplier: 0, elixirMultiplier: 1 };
  const amount = task.type === "measurable" ? Math.max(0, Number(taskForm.completedAmount) || 0) : 1;
  const target = Math.max(0.01, Number(task.targetAmount) || 1);
  const maxMultiplier = Math.max(0.01, Number(task.maxMultiplier) || 1);
  const multiplier = task.type === "measurable" ? Math.min(amount / target, maxMultiplier) : 1;
  const baseXp = Math.floor((Number(task.xpReward) || 0) * multiplier);
  const elixirMultiplier = Math.max(1, Number(shopDerived.value.activeEffects?.cultivationMultiplier) || 1);
  return {
    xp: Math.floor(baseXp * elixirMultiplier),
    baseXp,
    spirit: Math.floor((Number(task.spiritReward) || 0) * multiplier),
    multiplier,
    elixirMultiplier
  };
});
const selectedTaskTypeText = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task) return "未选择任务";
  return task.type === "measurable" ? `量化结算 · ${task.unitName || "单位"}` : "完成型任务";
});
const taskAmountStep = computed(() => {
  const unit = selectedTaskDefinition.value?.unitName || "";
  return unit === "小时" ? 0.25 : 1;
});
const taskAmountMax = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task || task.type !== "measurable") return 1;
  const target = Math.max(0.01, Number(task.targetAmount) || 1);
  const maxMultiplier = Math.max(1, Number(task.maxMultiplier) || 1);
  return Math.max(target, Number((target * maxMultiplier).toFixed(2)));
});
const taskAmountProgress = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task || task.type !== "measurable") return 100;
  const max = Math.max(0.01, taskAmountMax.value);
  return Math.max(0, Math.min(100, ((Number(taskForm.completedAmount) || 0) / max) * 100));
});
const taskAmountMarks = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task || task.type !== "measurable") return [];
  const max = Math.max(1, Number(taskAmountMax.value) || 1);
  const target = Math.max(0.01, Number(task.targetAmount) || 1);
  const step = max <= 6 ? Math.max(taskAmountStep.value, 1) : Math.max(1, Math.round(max / 5));
  const marks = new Set([0, target, max]);
  for (let value = step; value < max; value += step) marks.add(Number(value.toFixed(2)));
  return [...marks]
    .sort((a, b) => a - b)
    .slice(0, 7)
    .map(formatTaskAmount);
});
const taskStatusCards = computed(() => {
  const effects = shopDerived.value.activeEffects || {};
  const multiplier = Math.max(1, Number(effects.cultivationMultiplier) || 1);
  const daysLeft = Math.max(0, Number(effects.cultivationMultiplierDaysLeft) || 0);
  return [
    { label: "今日完成", value: `${todayTaskSummary.value.count}/${taskDailyGoal.value}`, note: "现实任务", icon: CheckCircle2, asset: "/assets/tasks/icon-scroll.svg", tone: "count" },
    { label: "今日修为", value: `+${todayTaskSummary.value.xp}`, note: "经验入账", icon: Sprout, asset: "/assets/tasks/icon-life.svg", tone: "xp" },
    { label: "今日灵石", value: `+${todayTaskSummary.value.spirit}`, note: "可用于坊市", icon: Gem, asset: "/assets/tasks/icon-crystal.svg", tone: "spirit" },
    {
      label: "药力加成",
      value: `x${formatMultiplier(multiplier)}`,
      note: daysLeft > 0 ? `剩余 ${daysLeft} 天` : "暂无修为丹",
      icon: Sparkles,
      asset: "/assets/tasks/icon-elixir.svg",
      tone: multiplier > 1 ? "elixir active" : "elixir"
    }
  ];
});
const taskTodayHint = computed(() => {
  if (!todayTaskSummary.value.count) return "今日札记未开笔，先完成一项现实任务积攒修为。";
  if (taskRewardPreview.value.elixirMultiplier > 1) return "修为丹药力正在生效，现实任务会获得额外修为。";
  return "今日已有任务入账，可继续补记现实进度。";
});
const playerPortraitUrl = computed(() => {
  if (player.value.portraitUrl) return player.value.portraitUrl;
  const index = Number(player.value.portraitVariant || 0);
  return playerPortraitOptions[((index % playerPortraitOptions.length) + playerPortraitOptions.length) % playerPortraitOptions.length];
});
const playerPortraitPerson = computed(() => ({
  ...player.value,
  isPlayer: true,
  portraitUrl: playerPortraitUrl.value
}));
const combatSkills = computed(() => catalog.value.combatSkills?.length ? catalog.value.combatSkills : [fallbackSkill]);
const homeSummary = computed(() => gameState.value.home || {});
const skillUpgrade = computed(() => derived.value.skillUpgrade || {});
const skillUpgradePlan = computed(() => derived.value.skillUpgradePlan || []);
const playerSkill = computed(() => skillUpgrade.value.current || player.value.effectiveSkill || skillById(player.value.skillId));
const canUpgradeSkill = computed(() => Boolean(
  skillUpgrade.value.next
    && !skillUpgrade.value.attemptedToday
    && skillUpgrade.value.canMeetRealm
    && skillUpgrade.value.enoughSpirit
));
const skillUpgradeHint = computed(() => {
  const preview = skillUpgrade.value;
  if (!preview.next) return "此术已修至十阶圆满。";
  if (preview.attemptedToday) return "今日已经尝试过技能升级，明日再来。";
  if (!preview.canMeetRealm) return `需要达到${preview.requirementRealm}才能继续升阶。`;
  if (!preview.enoughSpirit) return `灵石不足，升级需要 ${preview.cost} 灵石。`;
  return `失败也会扣除 ${preview.cost} 灵石，今日仅可尝试一次。`;
});
const sectSummaries = computed(() => derived.value.sects || []);
const fallbackRoots = [
  { key: "metal", name: "金灵根", effect: "attack", min: 0.05, max: 0.1, note: "攻击提高 5%-10%。" },
  { key: "wood", name: "木灵根", effect: "hp", min: 0.1, max: 0.2, note: "血量上限提高 10%-20%。" },
  { key: "earth", name: "土灵根", effect: "defense", min: 0.05, max: 0.1, note: "防御提高 5%-10%。" },
  { key: "water", name: "水灵根", effect: "xp", min: 0.4, max: 0.6, breakMultiplier: 1.1, note: "每日经验获取提高 40%-60%，突破率按倍率提高 10%。" },
  { key: "fire", name: "火灵根", effect: "divineSense", min: 0.1, max: 0.2, note: "神识提高 10%-20%。" },
  { key: "heaven", name: "天灵根", effect: "mana", min: 0.1, max: 0.2, note: "法力上限提高 10%-20%。" }
];
const fallbackRootCycle = ["metal", "wood", "earth", "water", "fire", "heaven"];
const fallbackSpecialRoots = [
  { id: "thunder", name: "雷灵根", keys: ["metal", "wood", "earth"], note: "金、木、土齐备时自动转换；克金灵根、木灵根、土灵根，不被其他灵根相克。" },
  { id: "wind", name: "风灵根", keys: ["water", "fire", "heaven"], note: "水、火、天齐备时自动转换；克水灵根、火灵根、天灵根，不被其他灵根相克。" },
  { id: "hidden", name: "隐灵根", keys: ["metal", "wood", "water", "fire", "earth"], note: "金、木、水、火、土齐备时自动转换；克五行灵根，不被其他灵根相克。" }
];
const fallbackRootByKey = Object.fromEntries(fallbackRoots.map((root) => [root.key, root]));
const fallbackRootRules = {
  cycle: fallbackRootCycle.map((key) => {
    const root = fallbackRootByKey[key];
    const target = fallbackRootByKey[fallbackRootCycle[(fallbackRootCycle.indexOf(key) + 1) % fallbackRootCycle.length]];
    return {
      key,
      name: root.name,
      targetKey: target.key,
      targetName: target.name,
      text: `${root.name}克${target.name}`
    };
  }),
  specialRoots: fallbackSpecialRoots.map((special) => ({
    ...special,
    childNames: special.keys.map((key) => fallbackRootByKey[key]?.name || key),
    counterText: `${special.name}克${special.keys.map((key) => fallbackRootByKey[key]?.name || key).join("、")}，不受其他灵根相克。`
  }))
};
const catalogRoots = computed(() => catalog.value.roots?.length ? catalog.value.roots : fallbackRoots);
const catalogRootRules = computed(() => {
  const rules = catalog.value.rootRules || {};
  return {
    cycle: rules.cycle?.length ? rules.cycle : fallbackRootRules.cycle,
    specialRoots: rules.specialRoots?.length ? rules.specialRoots : fallbackRootRules.specialRoots
  };
});
const adminCultivators = computed(() => cultivators.value);
const normalizedAdminSearch = computed(() => adminSearch.value.trim().toLowerCase());
const filteredAdminCultivators = computed(() => {
  const keyword = normalizedAdminSearch.value;
  if (!keyword) return adminCultivators.value;
  return adminCultivators.value.filter((person) => [
    person.name,
    person.sect,
    genderLabel(person.gender),
    realmName(person.realm),
    rootLine(person)
  ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
});
const adminCultivatorPerson = computed(() => filteredAdminCultivators.value.find((person) => person.id === adminSelectedCultivatorId.value) || filteredAdminCultivators.value[0] || adminCultivators.value[0] || null);
const adminSects = computed(() => {
  const summaries = new Map(sectSummaries.value.map((sect) => [sect.name, sect]));
  const profiles = new Map((gameState.value.sectProfiles || []).map((sect) => [sect.name, sect]));
  for (const sect of sectSummaries.value) profiles.set(sect.name, { ...profiles.get(sect.name), ...sect });
  return [...profiles.values()]
    .filter((sect) => sect?.name)
    .map((sect) => ({ ...sect, totalPower: summaries.get(sect.name)?.totalPower || sect.totalPower || 0 }))
    .sort((a, b) => sectTotalPower(b.name) - sectTotalPower(a.name) || a.name.localeCompare(b.name, "zh-Hans-CN"));
});
const filteredAdminSects = computed(() => {
  const keyword = normalizedAdminSearch.value;
  if (!keyword) return adminSects.value;
  return adminSects.value.filter((sect) => [
    sect.name,
    sect.id,
    sectLeaderName(sect),
    ...(sect.elderNames || [])
  ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
});
const adminSectMembers = computed(() => {
  const name = adminSectDraft.oldName || adminSelectedSectName.value;
  return [...(sectByName(name)?.members || cultivators.value.filter((person) => person.sect === name))]
    .sort((a, b) => (b.power || personPower(b)) - (a.power || personPower(a)) || a.name.localeCompare(b.name, "zh-Hans-CN"));
});
const adminEffectiveLeaderId = computed(() => adminSectDraft.leaderId || adminSectMembers.value[0]?.id || "");
const adminElderOptions = computed(() => adminSectMembers.value.filter((member) => member.id !== adminEffectiveLeaderId.value));
const adminSectLeaderName = computed(() => adminSectMembers.value.find((member) => member.id === adminEffectiveLeaderId.value)?.name || "自动择优");
const adminSectElderNames = computed(() => {
  const names = adminSectMembers.value
    .filter((member) => adminSectDraft.elderIds.includes(member.id))
    .map((member) => member.name);
  return names.length ? names.join("、") : "未设置";
});
const filteredAdminTasks = computed(() => {
  const keyword = normalizedAdminSearch.value;
  if (!keyword) return taskDefinitions.value;
  return taskDefinitions.value.filter((task) => [
    task.name,
    task.detail,
    task.category,
    task.type === "measurable" ? "量化" : "完整",
    task.unitName
  ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
});
const adminTaskDefinition = computed(() => taskDefinitions.value.find((task) => task.id === adminSelectedTaskId.value) || null);
const dungeonRecordTabs = [
  { id: "blood", label: "血色禁地" },
  { id: "void", label: "虚天殿" },
  { id: "sea", label: "乱星海猎妖" }
];
const starSeaDropChance = 0.1;
const dungeonMonsterStages = monsterStageNames.map((stageName, stage) => ({
  stage,
  name: stageName,
  monsters: monsterImageEntries.filter((monster) => monster.stage === stage)
}));
const dungeonDays = computed(() => gameState.value.dungeonDays || []);
const selectedDungeonDay = computed(() => dungeonDays.value[dungeonDayIndex.value] || null);
const canShowPreviousDungeonDay = computed(() => dungeonDayIndex.value < dungeonDays.value.length - 1);
const canShowNextDungeonDay = computed(() => dungeonDayIndex.value > 0);
const bloodTrialClearCount = computed(() => (selectedDungeonDay.value?.bloodTrial?.caves || []).reduce((sum, cave) => sum + bloodCaveClearCount(cave), 0));
const sortedVoidHallRecords = computed(() => [...(selectedDungeonDay.value?.sects || [])].sort((a, b) => (
  Number(b.success) - Number(a.success) ||
  voidHallMonsterPower(a) - voidHallMonsterPower(b) ||
  b.totalDamage - a.totalDamage
)));
const selectedVoidHallRecord = computed(() => sortedVoidHallRecords.value.find((record) => record.sect === selectedVoidHallSect.value));
const voidHallSuccessCount = computed(() => (selectedDungeonDay.value?.sects || []).filter((record) => record.success).length);
const voidHallStageOptions = computed(() => {
  const stageCount = catalog.value.realmStages?.length || 9;
  return Array.from({ length: Math.max(0, stageCount - 1) }, (_, index) => index + 1).map((stage) => ({
    stage,
    cave: stage + 1,
    label: realmStageName(stage),
    min: 90 + stage * 82,
    max: 159 + stage * 82
  }));
});
const voidHallSpiritPoolByStage = computed(() => new Map((selectedDungeonDay.value?.voidHallSpiritPools || [])
  .map((pool) => [Number(pool.stage), Number(pool.spirit || 0)])));
const voidHallLootItems = computed(() => normalizeEquipmentDisplayItems(dungeonLootPool("void_hall")?.items || [])
  .sort(compareEquipmentLowToHigh));
const starSeaLootItems = computed(() => normalizeEquipmentDisplayItems(dungeonLootPool("star_sea")?.items || [])
  .filter((item) => !item.ownerId)
  .sort(compareEquipmentLowToHigh));
const equipmentDisplayValue = (item) => Number(item?.value || fallbackEquipmentValue(item) || 0);
const compareEquipmentLowToHigh = (a, b) => (
  equipmentDisplayValue(a) - equipmentDisplayValue(b) ||
  a.tier - b.tier ||
  slotOrder(a.slot) - slotOrder(b.slot) ||
  a.bonus - b.bonus ||
  a.name.localeCompare(b.name, "zh-Hans-CN")
);
const compareEquipmentByTierDesc = (a, b) => (
  b.tier - a.tier ||
  equipmentDisplayValue(b) - equipmentDisplayValue(a) ||
  slotOrder(a.slot) - slotOrder(b.slot) ||
  b.bonus - a.bonus ||
  a.name.localeCompare(b.name, "zh-Hans-CN")
);
const compareEquipmentByValueDesc = (a, b) => (
  equipmentDisplayValue(b) - equipmentDisplayValue(a) ||
  b.tier - a.tier ||
  slotOrder(a.slot) - slotOrder(b.slot) ||
  b.bonus - a.bonus ||
  a.name.localeCompare(b.name, "zh-Hans-CN")
);
const compareEquipmentForMode = (a, b) => {
  const result = equipmentSortMode.value === "value"
    ? compareEquipmentByValueDesc(a, b)
    : compareEquipmentByTierDesc(a, b);
  return equipmentSortDirection.value === "asc" ? -result : result;
};
const normalizeEquipmentDisplayItems = (items) => items.map((item) => ({
  ...item,
  slotName: item.slotName || equipmentSlotName(item.slot),
  stat: item.stat || equipmentSlotStat(item.slot),
  statName: item.statName || equipmentSlotStatName(item.slot),
  tierName: item.tierName || equipmentTierName(item.tier),
  setName: item.setName || "",
  value: item.value || fallbackEquipmentValue(item),
  stealChance: item.stealChance ?? equipmentTierStealChance(item.tier),
  ownerName: item.ownerName || "",
  transferHistory: Array.isArray(item.transferHistory) ? item.transferHistory : [],
  equipped: Boolean(item.equipped)
}));
const voidHallSpiritLines = computed(() => {
  return voidHallStageOptions.value.map((option) => `${option.label}妖物：${voidHallSpiritPoolForStage(option.stage)} 灵石`);
});
const starSeaSpiritLines = computed(() => {
  const range = selectedDungeonDay.value?.public?.spiritPoolRange;
  const pool = selectedDungeonDay.value?.public?.spiritPool;
  if (range) return [`本日总池 ${pool || `${range.min}-${range.max}`} 灵石，前三名重奖，余下按排名递减分配`];
  const monsters = selectedDungeonDay.value?.public?.monsters || [];
  const stage = monsters.length ? Math.max(...monsters.map((monster) => stageIndexFromRealm(monster.realmIndex))) : 0;
  const killed = selectedDungeonDay.value?.public?.killed || 0;
  return [`本日总池 ${240 + stage * 140 + killed * 90}-${380 + stage * 180 + killed * 120} 灵石，前三名重奖，余下按排名递减分配`];
});
const starSeaTeamRanking = computed(() => [...(selectedDungeonDay.value?.public?.teams || [])]
  .sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.score - a.score)
  .slice(0, 10));
const starSeaTodayEquipmentName = computed(() => selectedDungeonDay.value?.public?.item || "无");
const starSeaTodayEquipmentText = computed(() => {
  const record = selectedDungeonDay.value?.public;
  if (!record?.item) return "本日未出现装备";
  const tier = record.tierName ? `${record.tierName} · ` : "";
  const value = record.itemValue ? `${record.itemValue} 灵石` : "待竞拍";
  return `${tier}${value}`;
});
const starSeaAuctionText = computed(() => {
  const record = selectedDungeonDay.value?.public;
  if (!record?.item) return "未掉落或无人出价";
  const price = record.itemValue ? ` · ${record.itemValue} 灵石` : "";
  const dividend = record.auctionDividend ? ` · 分红 ${record.auctionDividend}/人` : "";
  return `${record.itemOwner || "未知修士"}${price}${dividend}`;
});
const starSeaSectRanking = computed(() => {
  const map = new Map();
  for (const entry of selectedDungeonDay.value?.public?.top || []) {
    const item = map.get(entry.sect) || { name: entry.sect, damage: 0, spirit: 0 };
    item.damage += entry.damage || 0;
    item.spirit += entry.spirit || 0;
    map.set(entry.sect, item);
  }
  return [...map.values()].sort((a, b) => b.damage - a.damage).slice(0, 8);
});
const todayEquipmentDrops = computed(() => {
  const today = gameState.value.day;
  return (gameState.value.equipmentTransfers || [])
    .filter((drop) => drop.day === today && drop.itemName)
    .slice(0, 12);
});
const todayBreakthroughs = computed(() => {
  const today = gameState.value.day;
  return cultivators.value.flatMap((person, personIndex) => (person.breakthroughs || [])
    .map((record, recordIndex) => ({
      person,
      record,
      personIndex,
      recordIndex,
      targetRealm: realmIndex(record.to)
    }))
    .filter((item) => item.record.day === today && item.record.success));
});
const todayBreakthroughHighlight = computed(() => [...todayBreakthroughs.value]
  .sort((a, b) => b.targetRealm - a.targetRealm || a.personIndex - b.personIndex || a.recordIndex - b.recordIndex)[0] || null);
const todaySkillUpgrades = computed(() => {
  const today = gameState.value.day;
  return cultivators.value.flatMap((person, personIndex) => (person.skillUpgrades || [])
    .map((record, recordIndex) => ({
      person,
      record,
      personIndex,
      recordIndex
    }))
    .filter((item) => item.record.day === today));
});
const todaySkillUpgradeHighlight = computed(() => [...todaySkillUpgrades.value]
  .sort((a, b) => (b.record.toRank || 0) - (a.record.toRank || 0) || a.personIndex - b.personIndex || a.recordIndex - b.recordIndex)[0] || null);
const todaySpiritHighlight = computed(() => {
  const today = gameState.value.day;
  return cultivators.value
    .map((person, personIndex) => {
      const record = (person.dailyRecords || []).find((item) => item.day === today);
      return {
        person,
        personIndex,
        spirit: Number(record?.spirit || 0)
      };
    })
    .filter((item) => item.spirit > 0)
    .sort((a, b) => b.spirit - a.spirit || a.personIndex - b.personIndex)[0] || null;
});
const dailyTickerItems = computed(() => {
  if (homeSummary.value.ticker?.length) return homeSummary.value.ticker;
  const items = [];
  const drops = todayEquipmentDrops.value;
  if (drops.length) {
    items.push(...drops.slice(0, 6).map((drop) => ({
      key: `equipment-${drop.winnerId || drop.winnerName}-${drop.itemId || drop.itemName}-${equipmentDropKind(drop)}`,
      label: "装备",
      name: drop.winnerName,
      text: `在 ${equipmentDropSource(drop)} 获得${drop.tierName || "法器"}「${drop.itemName}」 · ${equipmentDropSlotName(drop)} · ${equipmentDropStatName(drop)} +${formatPercent(equipmentDropBonus(drop))}${equipmentDropKind(drop) === "steal" && drop.loserName ? ` · 来自 ${drop.loserName}` : ""}`
    })));
    if (drops.length > 6) {
      items.push({
        key: "equipment-more",
        label: "装备",
        name: "今日掉落",
        text: `共 ${drops.length} 件法宝流转，更多可在装备记录查看`
      });
    }
  }
  if (todayBreakthroughHighlight.value) {
    const { person, record } = todayBreakthroughHighlight.value;
    const count = todayBreakthroughs.value.length;
    items.push({
      key: "breakthrough",
      label: "突破",
      name: person.name,
      text: `突破至 ${record.to}，今日共 ${count} 人突破成功`
    });
  }
  if (todaySkillUpgradeHighlight.value) {
    const { person, record } = todaySkillUpgradeHighlight.value;
    const count = todaySkillUpgrades.value.length;
    const succeeded = skillUpgradeRecordSucceeded(record);
    items.push({
      key: "skill-upgrade",
      label: "技能",
      name: person.name,
      text: succeeded
        ? `将「${record.skillName || skillName(record.skillId)}」升至 ${skillRankText(record.toRank)}，今日共 ${count} 次技能尝试`
        : `尝试将「${record.skillName || skillName(record.skillId)}」升至 ${skillRankText(record.toRank)}失败，今日共 ${count} 次技能尝试`
    });
  }
  if (todaySpiritHighlight.value) {
    const { person, spirit } = todaySpiritHighlight.value;
    items.push({
      key: "spirit",
      label: "灵石",
      name: person.name,
      text: `今日获取最多，入账 ${spirit} 灵石`
    });
  }
  return items;
});
const equipmentList = computed(() => {
  const catalogSource = catalog.value.equipmentCatalog?.length ? catalog.value.equipmentCatalog : fallbackEquipmentCatalog;
  const source = gameState.value.equipment?.length ? gameState.value.equipment : catalogSource;
  return normalizeEquipmentDisplayItems(source);
});
const equipmentCollectionCount = computed(() => ({
  acquired: equipmentList.value.filter((item) => item.ownerName).length,
  total: equipmentList.value.length
}));
const filteredEquipment = computed(() => equipmentList.value
  .filter((item) => !equipmentTierFilter.value || String(item.tier) === equipmentTierFilter.value)
  .filter((item) => !equipmentSlotFilter.value || item.slot === equipmentSlotFilter.value)
  .filter((item) => {
    if (equipmentOwnedFilter.value === "owned") return Boolean(item.ownerName);
    if (equipmentOwnedFilter.value === "unowned") return !item.ownerName;
    return true;
  })
  .sort(compareEquipmentForMode));
const showcaseEquipment = computed(() => {
  const source = homeSummary.value.equipment?.length ? homeSummary.value.equipment : filteredEquipment.value.slice(0, 10);
  return source.map((item) => ({
    ...item,
    shortName: equipmentShortName(item.name)
  }));
});
const featuredDungeon = computed(() => ({
  title: homeSummary.value.dungeonSummary?.title || selectedDungeonDay.value?.bloodTrial?.caves?.[0]?.name || "幽冥地宫 · 三层",
  realm: derived.value.nextRealm || realmName(player.value.realm),
  summary: homeSummary.value.dungeonSummary?.summary || todayDungeonSummary.value
}));
const todayDungeonSummary = computed(() => {
  const day = dungeonDays.value.find((item) => item.day === gameState.value.day) || selectedDungeonDay.value;
  if (!day) return [{ key: "none", icon: "今", text: "今日副本尚未结算" }];
  return [
    { key: "blood", icon: "血", text: playerBloodTrialSummary(day) },
    { key: "void", icon: "殿", text: playerVoidHallSummary(day) },
    { key: "sea", icon: "海", text: playerStarSeaSummary(day) }
  ];
});
const homeLogDayRecords = computed(() => {
  const currentDay = Math.max(1, Number(gameState.value.day || 1));
  const firstDay = Math.max(1, currentDay - 29);
  const source = homeSummary.value.logDays?.length
    ? homeSummary.value.logDays
    : gameState.value.logDays?.length ? gameState.value.logDays : [];
  const sourceByDay = new Map(source.map((record) => [Number(record.day), record]));
  const flatLogs = gameState.value.log || [];
  const records = [];
  for (let day = currentDay; day >= firstDay; day -= 1) {
    const saved = sourceByDay.get(day);
    const logs = (saved?.logs?.length ? saved.logs : flatLogs.filter((entry) => Number(entry.day) === day))
      .filter(shouldShowHomeLog)
      .slice(0, 30);
    records.push({
      day,
      date: saved?.date || logs[0]?.date || dateForDay(day),
      logs
    });
  }
  return records;
});
const selectedHomeLogDayRecord = computed(() => {
  if (!homeLogDayRecords.value.length) return null;
  return homeLogDayRecords.value.find((record) => record.day === selectedHomeLogDay.value) || homeLogDayRecords.value[0];
});
const homeLogMinDate = computed(() => homeLogDayRecords.value.at(-1)?.date || currentDate.value);
const homeLogMaxDate = computed(() => homeLogDayRecords.value[0]?.date || currentDate.value);
const selectedHomeLogDate = computed({
  get: () => selectedHomeLogDayRecord.value?.date || currentDate.value,
  set: (value) => {
    const match = homeLogDayRecords.value.find((record) => record.date === value);
    if (match) selectedHomeLogDay.value = match.day;
  }
});
const homeLogs = computed(() => selectedHomeLogDayRecord.value?.logs || []);
const homeRanking = computed(() => {
  if (homeSummary.value.ranking?.length) {
    const top = homeSummary.value.ranking.map((item) => ({ ...item, kind: "person" }));
    if (top.some((item) => item.id === "player")) return top;
    return [...top.slice(0, 4), {
      id: "player",
      kind: "person",
      name: player.value.name,
      value: derived.value.playerPower,
      rank: homeSummary.value.playerRank || playerRank.value
    }];
  }
  const top = powerRanking.value.slice(0, 5).map((item, index) => ({ ...item, rank: index + 1 }));
  if (top.some((item) => item.id === "player")) return top;
  return [...top.slice(0, 4), {
    id: "player",
    kind: "person",
    name: player.value.name,
    value: derived.value.playerPower,
    rank: playerRank.value
  }];
});
const homePodium = computed(() => {
  const top = homeRanking.value.slice(0, 3);
  return [top[1], top[0], top[2]].filter(Boolean);
});
const homeRankRows = computed(() => homeRanking.value.slice(3));
const playerRank = computed(() => {
  if (homeSummary.value.playerRank) return homeSummary.value.playerRank;
  const index = powerRanking.value.findIndex((item) => item.id === "player");
  return index >= 0 ? index + 1 : "-";
});
const todayDuelCount = computed(() => {
  if (typeof homeSummary.value.todayDuelCount === "number") return homeSummary.value.todayDuelCount;
  return todaysDuelRecord.value?.matches?.filter((match) => {
    const ids = [match.left?.id, match.right?.id, match.winner?.id, match.loser?.id].filter(Boolean);
    return ids.includes("player");
  }).length || 0;
});
const provinceWarRecords = computed(() => gameState.value.provinceWars || []);
const provinceTerritories = computed(() => {
  const owners = new Map((gameState.value.provinces || []).map((item) => [item.id, item]));
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
const homeSectTerritorySummary = computed(() => {
  if (homeSummary.value.sectTerritorySummary) return homeSummary.value.sectTerritorySummary;
  const sectName = player.value.sect || gameState.value.sect?.name || "";
  const provinces = provinceTerritories.value
    .filter((province) => province.owner === sectName)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, "zh-Hans-CN"));
  if (!provinces.length) return "当前暂无占领城市";
  const names = provinces.slice(0, 3).map((province) => provinceShortName(province.name));
  const rest = provinces.length - names.length;
  return `占领 ${names.join("、")}${rest > 0 ? ` 等 ${provinces.length} 城` : ""}`;
});
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
      provinceHighlights: provinces.slice(0, 5).map((province) => ({
        id: province.id,
        name: province.name,
        shortName: provinceShortName(province.name),
        tier: provinceGdpTier(province.rank)
      })),
      spirit: spiritItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      xp: xpItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      breakthrough: breakthroughItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      spiritItems,
      xpItems,
      breakthroughItems,
      resourcePlan: sect.resourcePlan || {}
    };
  })
  .sort((a, b) => b.provinceCount - a.provinceCount || b.spirit - a.spirit || b.xp - a.xp));
const topSectTerritories = computed(() => sectTerritoryRanking.value.slice(0, 5));
const provinceResourceRanking = computed(() => {
  if (activeTab.value !== "sect" || activeSectSubTab.value !== "provinces") return [];
  return [...provinceTerritories.value].sort((a, b) => a.rank - b.rank);
});
const provinceResourceOwnerOptions = computed(() => {
  const owners = new Set(provinceTerritories.value.map((province) => province.owner).filter(Boolean));
  return [...owners].sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
});
const filteredProvinceResourceRanking = computed(() => provinceResourceRanking.value.filter((territory) => {
  const typeMatched = !provinceResourceTypeFilter.value || territory.effect.type === provinceResourceTypeFilter.value;
  const ownerMatched = !provinceResourceOwnerFilter.value
    || (provinceResourceOwnerFilter.value === "__none" ? !territory.owner : territory.owner === provinceResourceOwnerFilter.value);
  return typeMatched && ownerMatched;
}));
const topProvinceResourcePreview = computed(() => [...provinceTerritories.value].sort((a, b) => a.rank - b.rank).slice(0, 5));
const provinceWarDayRecords = computed(() => {
  if (activeTab.value !== "sect" && activeTab.value !== "arena") return [];
  const groups = new Map();
  for (const war of provinceWarRecords.value) {
    const day = war.day || gameState.value.day;
    if (!groups.has(day)) groups.set(day, { day, date: war.date || dateForDay(day), wars: [] });
    groups.get(day).wars.push(war);
  }
  return [...groups.values()].sort((a, b) => b.day - a.day);
});
const provinceWarDayOptions = computed(() => {
  if (activeTab.value !== "sect") return [];
  const days = new Set([gameState.value.day, selectedProvinceWarDay.value, ...provinceWarDayRecords.value.map((record) => record.day)]);
  return [...days].filter((day) => day >= 1 && day <= gameState.value.day).sort((a, b) => b - a);
});
const provinceWarDateOptions = computed(() => provinceWarDayOptions.value.map((day) => ({ day, date: dateForDay(day) })));
const selectedProvinceWarDayRecord = computed(() => provinceWarDayRecords.value.find((record) => record.day === selectedProvinceWarDay.value));
const provinceWarMinDate = computed(() => provinceWarDateOptions.value.at(-1)?.date || currentDate.value);
const provinceWarMaxDate = computed(() => provinceWarDateOptions.value[0]?.date || currentDate.value);
const selectedProvinceWarDateInput = computed({
  get: () => selectedProvinceWarDate.value,
  set: (value) => {
    const match = provinceWarDateOptions.value.find((option) => option.date === value);
    if (match) selectedProvinceWarDay.value = match.day;
  }
});
const todayProvinceWarSummary = computed(() => {
  const wars = provinceWarDayRecords.value.find((record) => record.day === gameState.value.day)?.wars || [];
  return wars.reduce((summary, war) => {
    if (war.captured) summary.captured += 1;
    else summary.defended += 1;
    return summary;
  }, { captured: 0, defended: 0 });
});
const selectedProvinceWarSummary = computed(() => {
  const wars = selectedProvinceWarDayRecord.value?.wars || [];
  return wars.reduce((summary, war) => {
    if (war.captured) summary.captured += 1;
    else summary.defended += 1;
    summary.total += 1;
    return summary;
  }, { captured: 0, defended: 0, total: 0 });
});
const normalizedProvinceWarSearch = computed(() => provinceWarSearch.value.trim().toLowerCase());
const filteredProvinceWars = computed(() => {
  const wars = selectedProvinceWarDayRecord.value?.wars || [];
  const keyword = normalizedProvinceWarSearch.value;
  if (!keyword) return wars;
  return wars.filter((war) => provinceWarSearchText(war).includes(keyword));
});
const selectedProvinceWar = computed(() => selectedProvinceWarDayRecord.value?.wars.find((war) => war.id === selectedProvinceWarId.value));
const selectedProvinceWarDate = computed(() => selectedProvinceWarDayRecord.value?.date || dateForDay(selectedProvinceWarDay.value));
const mainLogs = computed(() => gameState.value.log.filter((entry) => !isNpcBreakthroughLog(entry)));
watch(homeLogDayRecords, (records) => {
  if (!records.length) {
    selectedHomeLogDay.value = null;
    return;
  }
  if (!records.some((record) => record.day === selectedHomeLogDay.value)) {
    selectedHomeLogDay.value = records[0].day;
  }
}, { immediate: true });
const duelRecords = computed(() => gameState.value.duelDays || []);
const duelDayOptions = computed(() => {
  if (activeTab.value !== "arena") return [];
  const days = new Set([gameState.value.day, selectedDuelDay.value, ...duelRecords.value.map((record) => record.day)]);
  return [...days].filter((day) => day >= 1 && day <= gameState.value.day).sort((a, b) => b - a);
});
const duelDateOptions = computed(() => duelDayOptions.value.map((day) => ({ day, date: dateForDay(day) })));
const selectedDuelRecord = computed(() => duelRecords.value.find((record) => record.day === selectedDuelDay.value));
const selectedDuelDate = computed(() => selectedDuelRecord.value?.date || dateForDay(selectedDuelDay.value));
const todaysDuelRecord = computed(() => duelRecords.value.find((record) => record.day === gameState.value.day));
const normalizedDuelSearch = computed(() => duelSearch.value.trim().toLowerCase());
const filteredDuelMatches = computed(() => {
  const matches = selectedDuelRecord.value?.matches || [];
  const keyword = normalizedDuelSearch.value;
  const filtered = keyword
    ? matches.filter((match) => duelMatchSearchText(match).includes(keyword))
    : matches;
  return sortDuelMatchesByRank(filtered);
});
const duelPreviewIndex = computed(() => filteredDuelMatches.value.findIndex((match) => match.type === "battle" && (match.hasReplay || match.replay)));
const duelPreviewMatch = computed(() => {
  const index = duelPreviewIndex.value;
  return index >= 0 ? filteredDuelMatches.value[index] : null;
});
const visibleBattleEvents = computed(() => lastBattle.value?.events.slice(0, battleCursor.value) || []);
const displayedBattleEvents = computed(() => [...visibleBattleEvents.value].reverse());
const isBattleReplayDone = computed(() => {
  const total = lastBattle.value?.events.length || 0;
  return total > 0 && battleCursor.value >= total;
});
const battleStatusText = computed(() => {
  if (!lastBattle.value) return "";
  if (!isBattleReplayDone.value) return "战斗正在回放中。";
  const leftName = lastBattle.value.left?.name || "挑战者";
  const isPlayerReplay = lastBattle.value.left?.id === "player" || lastBattle.value.left?.kind === "player";
  if (isPlayerReplay) return lastBattle.value.result === "胜" ? "你胜出了这一场。" : "你败下阵来。";
  return lastBattle.value.result === "胜" ? `${leftName}胜出了这一场。` : `${leftName}败下阵来。`;
});
const battleOutcomeLabel = computed(() => (isBattleReplayDone.value ? lastBattle.value.result : "回放"));
const isStarSeaBattle = computed(() => lastBattle.value?.kind === "starSeaTeam");
const starSeaBattleStatusText = computed(() => {
  if (!lastBattle.value) return "";
  if (!isBattleReplayDone.value) return "十人围猎正在回放中。";
  return lastBattle.value.team?.success ? "妖物已被斩杀。" : "队伍未能击杀妖物。";
});
const battleBackLabel = computed(() => {
  const target = battleReturnTarget.value;
  if (!target) return activeTab.value === "sect" ? "返回攻城记录" : "返回切磋";
  if (target.detailView === "person") return "返回";
  if (target.detailView === "sect") return "返回宗门";
  if (target.activeTab === "sect") return "返回攻城记录";
  if (target.activeTab === "arena") return "返回切磋";
  if (target.activeTab === "rank") return "返回榜单";
  return `返回${tabLabel(target.activeTab)}`;
});
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
const starSeaMembers = computed(() => lastBattle.value?.team?.members || []);
const starSeaCurrentEvent = computed(() => {
  if (!isStarSeaBattle.value) return null;
  return [...visibleBattleEvents.value].reverse().find((event) => event.members || typeof event.monsterHp === "number") || null;
});
const starSeaMonsterFrame = computed(() => {
  const battle = lastBattle.value;
  if (!battle) return { hp: 0, mana: 0 };
  if (isBattleReplayDone.value) return { hp: battle.monster?.endHp || 0, mana: battle.monster?.endMana || 0 };
  const event = starSeaCurrentEvent.value;
  return {
    hp: event?.monsterHp ?? battle.monster?.startHp ?? battle.monster?.maxHp ?? 0,
    mana: event?.monsterMana ?? battle.monster?.startMana ?? battle.monster?.maxMana ?? 0
  };
});
const starSeaAliveCount = computed(() => starSeaMembers.value.filter((member) => starSeaMemberFrame(member).hp > 0).length);
const starSeaMonsterPerson = computed(() => ({
  id: lastBattle.value?.monster?.id || "star-sea-monster",
  name: lastBattle.value?.monster?.name || "乱星海妖物",
  gender: "unknown",
  realm: lastBattle.value?.monster?.realmIndex || 0
}));
const starSeaMonsterStats = computed(() => {
  const monster = lastBattle.value?.monster || {};
  return [
    { label: "血量", value: monster.maxHp || monster.startHp || "?", icon: "health" },
    { label: "法力", value: monster.maxMana || monster.startMana || "?", icon: "mana" },
    { label: "攻击", value: monster.attack || "?", icon: "attack" },
    { label: "防御", value: monster.defense || "?", icon: "defense" },
    { label: "神识", value: monster.divineSense || "?", icon: "sense" },
    { label: "技能", value: skillNameForDisplay(monster), icon: "skill" }
  ];
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

const hudResources = computed(() => [
  { label: "天数", value: `第 ${gameState.value.day || 1} 天`, icon: "day" },
  { label: "灵石", value: player.value.spirit, icon: "spirit" }
]);

const shopDerived = computed(() => derived.value.shop || { items: [], activeEffects: {}, breakthroughAttempts: {} });
const shopItems = computed(() => shopDerived.value.items || []);
const shopGroupMeta = [
  { id: "xp", label: "修为丹", note: "只提升现实任务获得的修为，不影响其他来源。" },
  { id: "breakthrough", label: "破境丹", note: "只对下一次突破生效，成败都会消耗药力。" },
  { id: "attempt", label: "续脉丹", note: "增加今日可突破次数，价格明显高于破境丹。" },
  { id: "permanent", label: "淬体丹", note: "永久提升基础属性，药性上限为 20 枚。" }
];
const shopGroups = computed(() => shopGroupMeta
  .map((group) => ({
    ...group,
    items: shopItems.value.filter((item) => item.category === group.id)
  }))
  .filter((group) => group.items.length));
const activeShopGroup = computed(() => (
  shopGroups.value.find((group) => group.id === activeMarketCategory.value) || shopGroups.value[0] || null
));
const activeShopItems = computed(() => activeShopGroup.value?.items || []);
const bagItems = computed(() => Object.entries(gameState.value.bag || {})
  .map(([id, count]) => ({
    id,
    count: Math.max(0, Math.floor(Number(count) || 0)),
    item: shopItems.value.find((item) => item.id === id) || catalog.value.itemCatalog?.[id]
  }))
  .filter((entry) => entry.count > 0 && entry.item));
const bagItemCount = computed(() => bagItems.value.reduce((sum, entry) => sum + entry.count, 0));
const activeBagItems = computed(() => bagItems.value.filter((entry) => entry.item?.category === activeMarketCategory.value));
const activeBagItemCount = computed(() => activeBagItems.value.reduce((sum, entry) => sum + entry.count, 0));
const selectedBagEntry = computed(() => activeBagItems.value.find((entry) => entry.id === selectedMarketItemId.value) || activeBagItems.value[0] || null);
const selectedMarketItem = computed(() => {
  if (marketSubTab.value === "bag") return selectedBagEntry.value?.item || activeShopItems.value[0] || shopItems.value[0] || null;
  return activeShopItems.value.find((item) => item.id === selectedMarketItemId.value) || activeShopItems.value[0] || shopItems.value[0] || null;
});
const marketStatusCards = computed(() => {
  const effects = shopDerived.value.activeEffects || {};
  const attempts = shopDerived.value.breakthroughAttempts || {};
  return [
    {
      label: "修为丹药力",
      value: `x${Number(effects.cultivationMultiplier || 1).toFixed(Number(effects.cultivationMultiplier || 1) % 1 ? 1 : 0)}`,
      note: Number(effects.cultivationMultiplierDaysLeft || 0) > 0 ? `剩余 ${effects.cultivationMultiplierDaysLeft} 天` : "暂无修为丹药力"
    },
    {
      label: "下次突破",
      value: breakthroughBonusText(Number(effects.nextBreakthroughBonus || 0)),
      note: `${effects.nextBreakthroughBonusCount || 0} / ${effects.nextBreakthroughBonusMax || 4} 枚，突破后失效`
    },
    {
      label: "今日突破",
      value: `${attempts.remaining ?? 0} / ${attempts.total ?? 1}`,
      note: `基础 ${attempts.base ?? 1} 次，额外 ${attempts.extra ?? 0} 次`
    },
    {
      label: "背包丹药",
      value: `${bagItemCount.value} 枚`,
      note: "购买后可在背包服用"
    }
  ];
});
const sidebarElixirEffects = computed(() => {
  const effects = shopDerived.value.activeEffects || {};
  const attempts = shopDerived.value.breakthroughAttempts || {};
  const cards = [];
  const cultivationMultiplier = Number(effects.cultivationMultiplier || 1);
  const cultivationDaysLeft = Number(effects.cultivationMultiplierDaysLeft || 0);
  if (cultivationMultiplier > 1 && cultivationDaysLeft > 0) {
    cards.push({
      label: "任务修为收益",
      value: `x${cultivationMultiplier.toFixed(cultivationMultiplier % 1 ? 1 : 0)}`,
      note: `剩余 ${cultivationDaysLeft} 天，持续到第 ${effects.cultivationMultiplierUntilDay || gameState.value.day} 天`
    });
  }
  const breakthroughBonus = Number(effects.nextBreakthroughBonus || 0);
  if (breakthroughBonus > 0) {
    cards.push({
      label: "下次突破成功率",
      value: breakthroughBonusText(breakthroughBonus),
      note: `${effects.nextBreakthroughBonusCount || 0} / ${effects.nextBreakthroughBonusMax || 4} 枚，成败都会消耗药力`
    });
  }
  const extraAttempts = Number(effects.extraBreakthroughAttemptsToday || attempts.extra || 0);
  if (extraAttempts > 0) {
    cards.push({
      label: "今日额外突破",
      value: `+${extraAttempts} 次`,
      note: `今日可用 ${attempts.remaining ?? 0} / ${attempts.total ?? 1} 次`
    });
  }
  return cards;
});

const stats = computed(() => [
  { label: "战斗力", icon: "power", value: derived.value.playerPower, help: powerFormula.value },
  { label: "血量", icon: "health", value: statTotal(derived.value.effectiveStats.maxHp), help: "切磋、副本、宗门战中归零即判负。" },
  { label: "攻击", icon: "attack", value: statTotal(derived.value.effectiveStats.attack), help: "实际伤害按自身攻击减去对方防御结算。" },
  { label: "防御", icon: "defense", value: statTotal(derived.value.effectiveStats.defense), help: "抵扣对方攻击，最低仍会受到少量伤害。" },
  { label: "神识", icon: "sense", value: statTotal(derived.value.effectiveStats.divineSense), help: "神识更高者优先出手，也会获得闪避机会。" },
  { label: "法力", icon: "mana", value: statTotal(derived.value.effectiveStats.maxMana), help: "用于释放技能，回合战中消耗法力加强攻击。" }
]);

const remainingXp = computed(() => Math.max(0, Math.ceil((derived.value.xpNeed || 0) - (player.value.xp || 0))));
const isMaxRealm = computed(() => {
  const realmList = catalog.value.realms || [];
  return realmList.length > 0 && Number(player.value.realm || 0) >= realmList.length - 1;
});
const hasBreakthroughXp = computed(() => Number(player.value.xp || 0) >= Number(derived.value.xpNeed || 0));
const breakthroughAttemptState = computed(() => shopDerived.value.breakthroughAttempts || {});
const breakthroughAttemptsToday = computed(() => isMaxRealm.value ? 0 : Math.max(0, Number(breakthroughAttemptState.value.remaining) || 0));
const canBreakthroughNow = computed(() => !isMaxRealm.value && breakthroughAttemptsToday.value > 0 && hasBreakthroughXp.value);
const breakthroughAttemptHint = computed(() => {
  if (isMaxRealm.value) return "已至当前境界尽头";
  if (breakthroughAttemptsToday.value <= 0) return "今日已冲关，明日再试";
  if (!hasBreakthroughXp.value) return `还需修为 ${remainingXp.value}`;
  return "修为圆满，可待冲关";
});
const breakthroughActionText = computed(() => {
  if (isActionPending("/api/breakthrough")) return "冲关中...";
  if (isMaxRealm.value) return "已至尽头";
  if (breakthroughAttemptsToday.value <= 0) return "次数用尽";
  if (!hasBreakthroughXp.value) return "修为不足";
  return "突破";
});

function realmName(index) {
  const realmList = catalog.value.realms || [];
  if (!realmList.length) return "凡人";
  return realmList[Math.min(index, realmList.length - 1)];
}

function realmIndex(name) {
  const index = (catalog.value.realms || []).findIndex((realm) => realm === name);
  return index >= 0 ? index : -1;
}

function realmStageName(stage) {
  return catalog.value.realmStages?.[Math.min(Math.max(stage, 0), (catalog.value.realmStages?.length || 1) - 1)] || `第${stage + 1}阶`;
}

function skillUpgradeRealmStageText(preview) {
  const index = Number.isFinite(Number(preview?.requirementRealmIndex))
    ? Number(preview.requirementRealmIndex)
    : Math.max(0, realmIndex(preview?.requirementRealm || realmName(0)));
  return realmStageName(Math.floor(index / 10));
}

function skillById(id) {
  return combatSkills.value.find((skill) => skill.id === id) || combatSkills.value[0];
}

function localSkillRank(skill) {
  return Math.max(1, Math.min(10, Math.floor(Number(player.value.skillRanks?.[skill.id] || skill.rank || 1) || 1)));
}

function skillPlan(skill) {
  const rank = localSkillRank(skill);
  return skillUpgradePlan.value.find((item) => item.skillId === skill.id) || {
    skillId: skill.id,
    rank,
    targetRank: Math.min(10, rank + 1),
    current: { ...skill, rank },
    next: null,
    requirementRealm: realmName(0),
    cost: 0,
    chance: 0
  };
}

function skillRankRows(skill) {
  const plan = skillPlan(skill);
  return plan.ranks?.length ? plan.ranks : [{
    rank: 1,
    requirementRealm: "初始",
    cost: 0,
    chance: 1,
    skill
  }];
}

function skillRankText(rank) {
  return `${Math.max(1, Number(rank) || 1)}阶`;
}

function skillRankCostText(rank) {
  return rank.rank <= 1 ? "初始习得" : `${rank.cost || 0} 灵石`;
}

function skillRankChanceText(rank) {
  return rank.rank <= 1 ? "必定掌握" : `成功率 ${formatPercent(rank.chance)}`;
}

function normalizedTaskCategory(category) {
  if (taskCategoryOptions.some((option) => option.id === category)) return category;
  if (["学习", "读书", "看书", "阅读", "study"].includes(category)) return "学习";
  if (["运动", "锻炼", "健身", "修行", "body"].includes(category)) return "运动";
  if (["工作", "加班", "职业", "work"].includes(category)) return "工作";
  return "生活";
}

function taskCategoryIcon(category) {
  return taskCategoryOptions.find((option) => option.id === normalizedTaskCategory(category))?.icon || Leaf;
}

function taskCategoryAsset(category) {
  const normalized = normalizedTaskCategory(category);
  if (normalized === "学习") return "/assets/tasks/icon-book.svg";
  if (normalized === "工作") return "/assets/tasks/icon-work.svg";
  if (normalized === "运动") return "/assets/tasks/icon-sport.svg";
  return "/assets/tasks/icon-life.svg";
}

function taskIconAsset(task = {}) {
  const name = String(task.name || "");
  if (/看书|读书|阅读/.test(name)) return "/assets/tasks/icon-book.svg";
  if (/写作|创作|复盘/.test(name)) return "/assets/tasks/icon-scroll.svg";
  if (/运动|健身|锻炼/.test(name)) return "/assets/tasks/icon-sport.svg";
  if (/加班|工作/.test(name)) return "/assets/tasks/icon-scroll.svg";
  return taskCategoryAsset(task.category);
}

function shortTaskDate(dateText) {
  const parts = String(dateText || "").split("-");
  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : dateText;
}

function formatDateLabel(dateText) {
  const parts = String(dateText || "").split("-");
  if (parts.length < 3) return dateText || "";
  return `${Number(parts[0])}年 ${Number(parts[1])}月 ${Number(parts[2])}日`;
}

function taskDayDefaultOpen(day) {
  return Number(day?.index) < 4;
}

function isTaskDayOpen(day) {
  const dayNumber = Number(day?.day);
  if (!Number.isFinite(dayNumber)) return false;
  if (collapsedTaskDays.value.has(dayNumber)) return false;
  return taskDayDefaultOpen(day) || expandedTaskDays.value.has(dayNumber);
}

function toggleTaskDay(day) {
  const dayNumber = Number(day?.day);
  if (!Number.isFinite(dayNumber)) return;
  const collapsed = new Set(collapsedTaskDays.value);
  const expanded = new Set(expandedTaskDays.value);
  if (isTaskDayOpen(day)) {
    expanded.delete(dayNumber);
    collapsed.add(dayNumber);
  } else {
    collapsed.delete(dayNumber);
    expanded.add(dayNumber);
  }
  collapsedTaskDays.value = collapsed;
  expandedTaskDays.value = expanded;
}

function selectTaskCategory(category) {
  taskForm.category = category;
  const next = filteredTaskDefinitions.value[0];
  if (next) selectTaskDefinition(next.id);
}

function selectTaskDefinition(id) {
  const task = enabledTaskDefinitions.value.find((item) => item.id === id);
  if (!task) return;
  taskForm.taskId = task.id;
  taskForm.completedAmount = task.type === "measurable" ? Number(task.targetAmount) || 1 : 1;
}

function adjustTaskAmount(delta) {
  const next = Math.max(0, Math.min(taskAmountMax.value, (Number(taskForm.completedAmount) || 0) + Number(delta || 0)));
  taskForm.completedAmount = Number(next.toFixed(2));
}

function formatTaskAmount(value) {
  const amount = Number(value) || 0;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
}

function openTaskAdmin() {
  activeTab.value = "admin";
  adminMode.value = "tasks";
  syncAdminTaskDraft(adminTaskDefinition.value || filteredAdminTasks.value[0] || null);
}

function skillName(id) {
  return skillById(id).name;
}

function skillForDisplay(target) {
  if (!target || typeof target === "string") {
    const skill = skillById(target);
    return { ...skill, rank: 1 };
  }
  if (target.effectiveSkill) return target.effectiveSkill;
  const skillId = target.skillId || skillIdByName(target.skill) || "";
  const skill = skillById(skillId);
  const rawRank = target.skillRank || target.skillRanks?.[skill.id] || skill.rank || 1;
  const rank = Math.max(1, Math.min(10, Math.floor(Number(rawRank) || 1)));
  return skillRankRows(skill).find((item) => Number(item.rank) === rank)?.skill || { ...skill, rank };
}

function skillDisplayRank(target) {
  const skill = skillForDisplay(target);
  return Math.max(1, Number(skill.rank || target?.skillRank || 1) || 1);
}

function skillLabel(target) {
  const skill = skillForDisplay(target);
  return `${skill.name} · ${skillRankText(skillDisplayRank(target))} · ${skill.cost} 法力`;
}

function skillCompactLabel(target) {
  const skill = skillForDisplay(target);
  return `${skill.name} · ${skillRankText(skillDisplayRank(target))}`;
}

function skillNameForDisplay(target) {
  return skillForDisplay(target).name || "普通攻击";
}

function skillEffectSummary(target) {
  return skillForDisplay(target).text || "暂无技能效果";
}

function skillSummary(target) {
  const skill = skillForDisplay(target);
  return `${skill.name} · ${skillRankText(skillDisplayRank(target))} · ${skill.cost} 法力 · ${skill.text || "暂无技能效果"}`;
}

function skillTip(target) {
  const skill = skillForDisplay(target);
  const rank = skillDisplayRank(target);
  return `${skill.name} · ${skillRankText(rank)}：消耗 ${skill.cost} 法力，冷却 ${skill.cooldown} 回合。${skill.text}`;
}

function skillGlyph(skill) {
  return skillGlyphs[skill?.id] || "术";
}

function skillAssetPath(skill) {
  return skillAssetPaths[skill?.id] || "";
}

function skillIconPath(target) {
  return skillAssetPath(skillForDisplay(target));
}

function skillIconGlyph(target) {
  return skillGlyph(skillForDisplay(target));
}

function skillVisualStyle(skill) {
  const image = skillAssetPath(skill);
  return image ? { "--skill-image": `url(${image})` } : {};
}

function showPreviousDungeonDay() {
  dungeonDayIndex.value = Math.min(dungeonDays.value.length - 1, dungeonDayIndex.value + 1);
}

function showNextDungeonDay() {
  dungeonDayIndex.value = Math.max(0, dungeonDayIndex.value - 1);
}

function dungeonLootPool(id) {
  return derived.value.dungeonLootPools?.[id] || null;
}

function lootDropChanceText(pool) {
  const min = pool?.dropChance?.min || 0;
  const max = pool?.dropChance?.max || min;
  return `${formatPercent(min)}-${formatPercent(max)}`;
}

function lootItemChance(item, cave = 1) {
  const entry = (item?.chanceByCave || []).find((rate) => Number(rate.cave) === Number(cave));
  return Number(entry?.chance || 0);
}

function lootItemChanceText(item, cave = 1) {
  const chance = lootItemChance(item, cave);
  if (chance <= 0) return "极微";
  if (chance < 0.0001) return `${(chance * 100).toFixed(4)}%`;
  if (chance < 0.001) return `${(chance * 100).toFixed(3)}%`;
  return `${(chance * 100).toFixed(2)}%`;
}

function bloodCaveLootItems(cave) {
  const caveIndex = Number(cave?.cave || 1);
  return (dungeonLootPool("blood_trial")?.items || [])
    .map((item) => ({ ...item, caveChance: lootItemChance(item, caveIndex) }))
    .sort((a, b) => b.caveChance - a.caveChance || a.tier - b.tier || b.bonus - a.bonus);
}

function voidHallItemChanceLines(item) {
  return voidHallStageOptions.value.map((option) => `${option.label}妖物：${lootItemChanceText(item, option.cave)}`);
}

function bloodCaveSpiritText(cave) {
  const pool = cave?.spiritPool;
  if (pool) {
    const base = Math.max(bloodCaveClearCount(cave), Number(pool.base || 0));
    const bonus = Math.max(0, Number(pool.bonus || 0));
    return `基础包 ${base} 灵石，前三奖金包 ${bonus} 灵石，总计 ${base + bonus}。`;
  }
  const stage = stageIndexFromRealm(cave?.monster?.realmIndex);
  const caveIndex = Number(cave?.cave || 1);
  const baseMin = 22 + stage * 24 + caveIndex * 14;
  const baseMax = 46 + stage * 32 + caveIndex * 18;
  const bonusMin = 8 + stage * 9 + caveIndex * 5;
  const bonusMax = 18 + stage * 12 + caveIndex * 7;
  return `基础包 ${baseMin}-${baseMax} 灵石，前三奖金包 ${bonusMin}-${bonusMax} 灵石。`;
}

function stageIndexFromRealm(realmIndex) {
  if (typeof realmIndex !== "number") return 0;
  return Math.max(0, Math.floor(realmIndex / 10));
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableUnit(text) {
  return stableHash(text) / 0xffffffff;
}

function voidHallSpiritPoolForStage(stage) {
  const recorded = voidHallSpiritPoolByStage.value.get(Number(stage));
  if (recorded) return recorded;
  const seed = `${gameState.value.calendarStartDate || ""}|${selectedDungeonDay.value?.day || gameState.value.day || 1}|void_hall|spirit|${stage}`;
  const min = 90 + stage * 82;
  const max = 159 + stage * 82;
  return min + Math.floor(stableUnit(seed) * (max - min + 1));
}

function voidHallMonsterPower(record) {
  return Number(record?.monsterPower || record?.monsterStats?.power || record?.requiredDamage || record?.monsterStats?.maxHp || 0);
}

function clearDepthFromDungeonHistory(record) {
  const explicit = Number(record?.clears);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const parsed = Number(String(record?.result || "").match(/连破\s*(\d+)\s*洞/)?.[1] || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function playerBloodTrialSummary(day) {
  const solo = (day?.solo || []).find((entry) => entry.id === "player");
  if (!solo) return "血色未入场";
  const listedCleared = (day?.bloodTrial?.caves || []).filter((cave) => (cave.clears || []).some((entry) => entry.id === "player")).length;
  const resultCleared = clearDepthFromDungeonHistory(solo);
  const cleared = Math.max(listedCleared, resultCleared);
  const total = day?.bloodTrial?.caves?.length || 0;
  if (total && cleared >= total) return `血色通关 ${cleared}/${total}`;
  return `血色${solo.result || ""} ${cleared}/${total || "?"} 关`;
}

function playerVoidHallSummary(day) {
  const record = (day?.sects || []).find((item) => item.sect === player.value.sect);
  if (!record) return "虚天殿未参战";
  return record.success ? "虚天殿通关" : "虚天殿未通关";
}

function playerStarSeaSummary(day) {
  const top = day?.public?.top || [];
  const personalRank = top.findIndex((entry) => entry.id === "player") + 1;
  const team = (day?.public?.teams || []).find((record) => (record.members || []).some((member) => member.id === "player"));
  if (!team && !personalRank) return "乱星海未入榜";
  return `乱星海队伍第${team?.rank || "-"}${personalRank ? ` · 个人第${personalRank}` : ""}`;
}

function sectDungeonRecords(sect) {
  if (!sect?.name) return [];
  return dungeonDays.value
    .map((day) => (day.sects || []).find((record) => record.sect === sect.name))
    .filter(Boolean);
}

function sectWarSide(sect, war) {
  if (!sect?.name || !war) return "";
  if (war.attacker === sect.name) return "attack";
  if (war.defender === sect.name) return "defense";
  return "";
}

function sectWonWar(sect, war) {
  const side = sectWarSide(sect, war);
  if (side === "attack") return Boolean(war?.captured);
  if (side === "defense") return !war?.captured;
  return false;
}

function withSectWarDisplay(sect, war) {
  const side = sectWarSide(sect, war);
  const won = sectWonWar(sect, war);
  return {
    ...war,
    sectWarSide: side,
    sectWarSideLabel: side === "attack" ? "攻城" : "守城",
    sectWarWon: won,
    sectWarOutcomeLabel: won ? "胜" : "负"
  };
}

function sectWarStats(sect) {
  const records = provinceWarRecords.value.filter((war) => sectWarSide(sect, war));
  if (!records.length) {
    return { wins: Number(sect?.warWins || 0), losses: Number(sect?.warLosses || 0) };
  }
  const wins = records.filter((war) => sectWonWar(sect, war)).length;
  return { wins, losses: records.length - wins };
}

function sectWarRecords(sect) {
  if (!sect?.name) return [];
  return provinceWarRecords.value
    .filter((war) => war.attacker === sect.name || war.defender === sect.name)
    .sort((a, b) => (b.day || 0) - (a.day || 0))
    .slice(0, 12)
    .map((war) => withSectWarDisplay(sect, war));
}

function sectDungeonRecordMeta(record) {
  const parts = [];
  const top = (record?.top || []).slice(0, 3).map((entry) => `${entry.name} ${entry.damage}`).join("、");
  if (top) parts.push(`前三 ${top}`);
  if (record?.item) parts.push(`装备 ${record.itemOwner || ""} ${record.tierName || ""}「${record.item}」`.replace(/\s+/g, " ").trim());
  return parts.join(" · ") || "暂无贡献明细";
}

function monsterStatItems(monster = {}) {
  return [
    { label: "血量", value: monster.maxHp || "?", icon: "health" },
    { label: "法力", value: monster.maxMana || "?", icon: "mana" },
    { label: "攻击", value: monster.attack || "?", icon: "attack" },
    { label: "防御", value: monster.defense || "?", icon: "defense" },
    { label: "神识", value: monster.divineSense || "?", icon: "sense" },
    { label: "技能", value: skillNameForDisplay(monster), icon: "skill" }
  ];
}

function monsterShortName(name) {
  const text = String(name || "").trim();
  return text.includes("·") ? text.split("·").pop() || text : text || "未知妖物";
}

function voidHallTopEntries(record) {
  const ranked = [...(record?.top || [])]
    .sort((a, b) => (b.damage || 0) - (a.damage || 0))
    .slice(0, 3)
    .map((entry, index) => ({ ...entry, output: entry.damage || 0, rank: index + 1, success: true }));
  return [ranked[1], ranked[0], ranked[2]].filter(Boolean);
}

function numericStat(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function voidHallFallbackManaCost(record, battle, startMana) {
  const monster = record?.monsterStats || {};
  const skill = skillById(monster.skillId || skillIdByName(monster.skill) || stableSkillId(`${record?.monster || "void"}-${record?.day || ""}`));
  if (skill?.cost) return Math.min(startMana, skill.cost);
  return Math.min(startMana, Math.max(1, Math.floor(numericStat(monster.maxMana, startMana) * 0.12)));
}

function hydrateVoidHallBattles(record) {
  const monster = record?.monsterStats || {};
  const maxHp = Math.max(1, numericStat(monster.maxHp || record?.requiredDamage, 1));
  const maxMana = Math.max(1, numericStat(monster.maxMana, 1));
  let runningHp = maxHp;
  let runningMana = maxMana;
  return (record?.battles || []).map((battle) => {
    const damage = Math.max(0, numericStat(battle.damage, 0));
    const startHp = Math.max(0, numericStat(battle.monsterStartHp, runningHp));
    const startMana = Math.max(0, numericStat(battle.monsterStartMana, runningMana));
    const endHp = Math.max(0, numericStat(battle.monsterEndHp, startHp - damage));
    const endMana = Math.max(0, numericStat(battle.monsterEndMana, startMana - voidHallFallbackManaCost(record, battle, startMana)));
    runningHp = endHp;
    runningMana = endMana;
    return {
      ...battle,
      damage,
      monsterStartHp: startHp,
      monsterStartMana: startMana,
      monsterEndHp: endHp,
      monsterEndMana: endMana,
      monsterMaxHp: numericStat(battle.monsterMaxHp, maxHp),
      monsterMaxMana: numericStat(battle.monsterMaxMana, maxMana)
    };
  });
}

function voidHallBattles(record) {
  if (record?.battles?.length) {
    return hydrateVoidHallBattles(record).map((battle) => ({
      ...battle,
      replayExpectation: {
        leftName: battle.challenger?.name || "",
        rightName: record.monster || ""
      },
      fallbackReplay: buildVoidHallBattleSummaryReplay(record, battle)
    }));
  }
  return [];
}

function voidHallBattleChallengerPerson(battle) {
  const ref = battle?.challenger || {};
  const person = matchPerson(ref);
  return {
    ...person,
    ...ref,
    name: ref.name || person?.name || battle?.name || "参战修士",
    realm: Number(ref.realm ?? person?.realm ?? 0),
    sect: ref.sect || person?.sect || ""
  };
}

function voidHallBattleLeftWon(battle) {
  const challengerName = battle?.challenger?.name || battle?.name || "";
  return Boolean(challengerName && battle?.winnerName === challengerName);
}

function voidHallBattleMonster(record) {
  const stats = record?.monsterStats || {};
  return {
    ...stats,
    name: record?.monster || stats.name || "虚天殿妖物",
    rootName: stats.rootName || stats.root?.name || "妖气"
  };
}

function rootKeyFromName(name) {
  return catalogRoots.value.find((root) => root.name === name)?.key || "";
}

function battleRootKey(entity) {
  return entity?.primaryRootKey || entity?.root?.key || rootKeyFromName(entity?.rootName) || "";
}

function battleRootName(entity) {
  const key = battleRootKey(entity);
  return entity?.root?.name || entity?.rootName || catalogRoots.value.find((root) => root.key === key)?.name || "未知灵根";
}

function battleRootCounterTarget(rootKey) {
  const index = fallbackRootCycle.indexOf(rootKey);
  return index >= 0 ? fallbackRootCycle[(index + 1) % fallbackRootCycle.length] : "";
}

function battleRootPenalty(attacker, defender) {
  if (!battleRootKey(attacker) || !battleRootKey(defender)) return 0;
  if (battleRootCounterTarget(battleRootKey(attacker)) !== battleRootKey(defender)) return 0;
  const realmGap = Math.max(0, Math.floor((defender?.realm || 0) / 10) - Math.floor((attacker?.realm || 0) / 10));
  return Math.max(0.01, 0.1 * Math.pow(0.5, realmGap));
}

function applySummaryRootPenalty(stats, penalty) {
  if (!penalty) return stats;
  return {
    ...stats,
    attack: Math.max(1, Math.floor(stats.attack * (1 - penalty))),
    defense: Math.max(0, Math.floor(stats.defense * (1 - penalty))),
    divineSense: Math.max(0, Math.floor(stats.divineSense * (1 - penalty))),
    rootCounterPenalty: penalty
  };
}

function skillIdByName(name) {
  return combatSkills.value.find((skill) => skill.name === name)?.id || "";
}

function stableSkillId(seed) {
  const skills = combatSkills.value;
  if (!skills.length) return "";
  return skills[stableHash(seed) % skills.length].id;
}

function summarySkillText(actorName, targetName, skill, damage) {
  if (!skill) return `${actorName}出手造成 ${damage} 伤害`;
  if (skill.type === "double") return `${actorName}施展${skill.name}，剑光连斩共造成 ${damage} 伤害`;
  if (skill.type === "multi") return `${actorName}催动${skill.name}，剑影分化共造成 ${damage} 伤害`;
  if (skill.type === "pierce") return `${actorName}祭出${skill.name}破开护体灵光，造成 ${damage} 伤害`;
  if (skill.type === "manaBurn") return `${actorName}摇动${skill.name}扰乱${targetName}法力，造成 ${damage} 伤害`;
  if (skill.type === "weaken") return `${actorName}施展${skill.name}封住${targetName}经脉，造成 ${damage} 伤害`;
  if (skill.type === "dotStrike") return `${actorName}放出${skill.name}扑击${targetName}，造成 ${damage} 伤害`;
  if (skill.type === "heavy") return `${actorName}凝出${skill.name}重击，造成 ${damage} 伤害`;
  if (skill.type === "lifesteal") return `${actorName}挥出${skill.name}汲血反攻，造成 ${damage} 伤害`;
  if (skill.type === "speedStrike") return `${actorName}借${skill.name}疾掠突袭，造成 ${damage} 伤害`;
  if (skill.type === "execute") return `${actorName}抓住破绽斩出${skill.name}，造成 ${damage} 伤害`;
  if (["shield", "defenseBuff", "reflect", "heal", "evasionBuff", "dodge", "field", "dot", "stun"].includes(skill.type)) {
    return `${actorName}运转${skill.name}稳住阵脚，并趁势造成 ${damage} 伤害`;
  }
  return `${actorName}施展${skill.name}，造成 ${damage} 伤害`;
}

function splitSummaryDamage(total, parts) {
  const count = Math.max(1, parts);
  const safeTotal = Math.max(0, Math.floor(total));
  if (!safeTotal) return Array.from({ length: count }, () => 0);
  const result = [];
  let remaining = safeTotal;
  for (let index = 0; index < count; index += 1) {
    const slots = count - index;
    const value = index === count - 1
      ? remaining
      : Math.max(1, Math.floor(remaining / slots));
    result.push(value);
    remaining -= value;
  }
  return result;
}

function buildVoidHallSummaryEvents({ battle, challenger, monsterName, leftStats, rightStats, leftSkill, rightSkill, damage, leftWon, endLeftHp, endRightHp, endLeftMana, endRightMana }) {
  const events = [];
  let leftHp = leftStats.hp;
  let rightHp = rightStats.hp;
  let leftMana = leftStats.mana;
  let rightMana = rightStats.mana;
  const leftName = challenger.name || "参战修士";
  const rightName = monsterName;
  const push = (round, kind, text, detail = {}) => events.push({
    round,
    kind,
    text,
    leftHp,
    rightHp,
    leftMana,
    rightMana,
    ...detail
  });
  const attackerForRoot = { ...challenger, realm: Number(challenger.realm) || 0 };
  const monsterForRoot = {
    realm: Number(rightStats.realm) || 0,
    root: rightStats.root,
    rootName: rightStats.rootName,
    primaryRootKey: rightStats.primaryRootKey
  };
  const monsterPenalty = battleRootPenalty(attackerForRoot, monsterForRoot);
  const challengerPenalty = battleRootPenalty(monsterForRoot, attackerForRoot);
  if (challengerPenalty) {
    push(0, "root", `${rightName}${battleRootName(monsterForRoot)}克制${leftName}${battleRootName(attackerForRoot)}，${leftName}攻击、防御、神识降低 ${Math.round(challengerPenalty * 1000) / 10}%。`, {
      side: "left",
      penalty: challengerPenalty
    });
  }
  if (monsterPenalty) {
    push(0, "root", `${leftName}${battleRootName(attackerForRoot)}克制${rightName}${battleRootName(monsterForRoot)}，${rightName}攻击、防御、神识降低 ${Math.round(monsterPenalty * 1000) / 10}%。`, {
      side: "right",
      penalty: monsterPenalty
    });
  }
  if (rightStats.divineSense > leftStats.divineSense) {
    push(0, "status", `${rightName}神识压过${leftName}，抢得先手。`, { actorSide: "right", targetSide: "left" });
  } else if (leftStats.divineSense > rightStats.divineSense) {
    push(0, "status", `${leftName}神识压过${rightName}，抢得先手。`, { actorSide: "left", targetSide: "right" });
  }

  const leftActionCount = damage > 36 ? 2 : 1;
  const leftDamages = splitSummaryDamage(damage, leftActionCount);
  const roundCount = leftWon ? Math.max(2, leftActionCount + 1) : Math.max(2, leftActionCount + 1);
  const rightDamageTotal = leftWon ? Math.max(1, Math.floor(leftStats.hp * 0.45)) : leftStats.hp;
  const rightDamages = splitSummaryDamage(rightDamageTotal, roundCount);
  const order = rightStats.divineSense > leftStats.divineSense ? ["right", "left"] : ["left", "right"];
  let leftActionIndex = 0;
  let rightActionIndex = 0;

  for (let round = 1; round <= roundCount && leftHp > 0 && rightHp > 0; round += 1) {
    push(round, "round", `第 ${battle?.order || 1} 战第 ${round} 回合。`);
    for (const side of order) {
      if (leftHp <= 0 || rightHp <= 0) break;
      if (side === "left") {
        const dealt = leftDamages[leftActionIndex] ?? 0;
        if (dealt <= 0 && leftActionIndex > 0) continue;
        rightHp = Math.max(leftWon ? 0 : endRightHp, rightHp - dealt);
        if (leftWon && round === roundCount) rightHp = 0;
        const useSkill = leftActionIndex === 0 && leftSkill;
        if (useSkill) {
          leftMana = Math.max(0, leftMana - leftSkill.cost);
          push(round, "skill", summarySkillText(leftName, rightName, leftSkill, dealt), {
            actorSide: "left",
            targetSide: "right",
            skill: leftSkill.name,
            damage: dealt
          });
        } else {
          push(round, "attack", `${leftName}寻隙出手造成 ${dealt} 伤害`, {
            actorSide: "left",
            targetSide: "right",
            damage: dealt
          });
        }
        leftActionIndex += 1;
      } else {
        const dealt = rightDamages[rightActionIndex] ?? rightDamages[rightDamages.length - 1] ?? 1;
        leftHp = Math.max(leftWon ? endLeftHp : 0, leftHp - dealt);
        if (!leftWon && round === roundCount) leftHp = 0;
        const useSkill = rightActionIndex === 0 && rightSkill;
        if (useSkill) {
          rightMana = Math.max(0, rightMana - rightSkill.cost);
          push(round, "skill", summarySkillText(rightName, leftName, rightSkill, dealt), {
            actorSide: "right",
            targetSide: "left",
            skill: rightSkill.name,
            damage: dealt
          });
        } else {
          push(round, "attack", `${rightName}妖力压下，造成 ${dealt} 伤害`, {
            actorSide: "right",
            targetSide: "left",
            damage: dealt
          });
        }
        rightActionIndex += 1;
      }
    }
  }

  leftHp = endLeftHp;
  rightHp = endRightHp;
  leftMana = endLeftMana;
  rightMana = endRightMana;
  push(roundCount, "finish", `胜者：${battle?.winnerName || rightName}。`, {
    actorSide: leftWon ? "left" : "right",
    targetSide: leftWon ? "right" : "left"
  });
  return events;
}

function buildVoidHallBattleSummaryReplay(record, battle) {
  const challenger = battle?.challenger || {};
  const monster = record?.monsterStats || {};
  const monsterName = record?.monster || "虚天殿妖物";
  const damage = Math.max(0, Number(battle?.damage) || 0);
  const monsterMaxHp = Math.max(1, numericStat(battle?.monsterMaxHp, numericStat(monster.maxHp || record?.requiredDamage || damage, 1)));
  const monsterMaxMana = Math.max(1, numericStat(battle?.monsterMaxMana, numericStat(monster.maxMana, 1)));
  const monsterStartHp = Math.max(0, numericStat(battle?.monsterStartHp, monsterMaxHp));
  const monsterStartMana = Math.max(0, numericStat(battle?.monsterStartMana, monsterMaxMana));
  const monsterEndHp = Math.max(0, numericStat(battle?.monsterEndHp, monsterStartHp - damage));
  const monsterEndMana = Math.max(0, numericStat(battle?.monsterEndMana, monsterStartMana - voidHallFallbackManaCost(record, battle, monsterStartMana)));
  const leftWon = battle?.winnerName === challenger.name;
  const challengerHp = Math.max(1, Math.min(999, Math.max(80, damage * 2 + 40)));
  const challengerMana = Math.max(1, Math.floor(challengerHp * 0.42));
  const leftStats = {
    hp: challengerHp,
    maxHp: challengerHp,
    mana: challengerMana,
    maxMana: challengerMana,
    attack: Math.max(1, Math.round(damage)),
    defense: Math.max(1, Math.round(challengerHp * 0.12)),
    divineSense: Math.max(1, Math.round(challengerMana * 0.35))
  };
  const rightStats = {
    hp: monsterStartHp,
    maxHp: monsterMaxHp,
    mana: monsterStartMana,
    maxMana: monsterMaxMana,
    attack: Number(monster.attack || 1),
    defense: Number(monster.defense || 1),
    divineSense: Number(monster.divineSense || 1),
    realm: Number(monster.realmIndex ?? realmIndex(record?.monsterRealm)) || 0,
    root: monster.root,
    rootName: monster.rootName,
    primaryRootKey: monster.primaryRootKey || rootKeyFromName(monster.rootName)
  };
  const leftPenalty = battleRootPenalty({ ...rightStats, rootName: monster.rootName, primaryRootKey: rightStats.primaryRootKey }, challenger);
  const rightPenalty = battleRootPenalty(challenger, { ...rightStats, rootName: monster.rootName, primaryRootKey: rightStats.primaryRootKey });
  const effectiveLeftStats = applySummaryRootPenalty(leftStats, leftPenalty);
  const effectiveRightStats = applySummaryRootPenalty(rightStats, rightPenalty);
  const endLeftHp = leftWon ? Math.max(1, Math.floor(challengerHp * 0.45)) : 0;
  const endRightHp = leftWon ? 0 : monsterEndHp;
  const endLeftMana = Math.max(0, Math.floor(challengerMana * 0.55));
  const endRightMana = monsterEndMana;
  const leftSkillId = challenger.skillId || player.value.skillId;
  const rightSkillId = monster.skillId || skillIdByName(monster.skill) || stableSkillId(`${monsterName}-${record?.day || ""}`);
  const leftSkill = skillById(leftSkillId);
  const rightSkill = skillById(rightSkillId);
  const events = buildVoidHallSummaryEvents({
    battle,
    challenger,
    monsterName,
    leftStats: { ...effectiveLeftStats, realm: Number(challenger.realm ?? realmIndex(record?.highestRealmName)) || 0 },
    rightStats: effectiveRightStats,
    leftSkill,
    rightSkill,
    damage,
    leftWon,
    endLeftHp,
    endRightHp,
    endLeftMana,
    endRightMana
  });
  return {
    kind: "duel",
    replayId: `void-summary-${record?.day || gameState.value.day || "x"}-${record?.sect || "sect"}-${battle?.order || 0}`,
    result: leftWon ? "胜" : "负",
    winner: leftWon ? "left" : "right",
    foughtAt: record?.date || dateForDay(record?.day || gameState.value.day),
    left: {
      kind: challenger.kind || (challenger.id === "player" ? "player" : "npc"),
      id: challenger.id || `void-challenger-${battle?.order || 0}`,
      name: challenger.name || "参战修士",
      realm: Number(challenger.realm ?? realmIndex(record?.highestRealmName)) || 0,
      sect: challenger.sect || record?.sect || "",
      root: challenger.root,
      roots: challenger.roots,
      primaryRootKey: challenger.primaryRootKey,
      skillId: leftSkillId,
      power: damage,
      stats: effectiveLeftStats,
      baseStats: leftStats,
      rootCounterPenalty: leftPenalty,
      startHp: challengerHp,
      startMana: challengerMana,
      endHp: endLeftHp,
      endMana: endLeftMana
    },
    right: {
      kind: "monster",
      id: monster.id || `void-monster-${record?.sect || "sect"}`,
      name: monsterName,
      realm: Number(monster.realmIndex ?? realmIndex(record?.monsterRealm)) || 0,
      sect: "虚天殿",
      root: monster.root || { key: rightStats.primaryRootKey, name: battleRootName(rightStats) },
      roots: monster.roots || [{ key: rightStats.primaryRootKey, name: battleRootName(rightStats) }],
      primaryRootKey: rightStats.primaryRootKey,
      skillId: rightSkillId,
      power: Number(record?.monsterPower || monsterMaxHp || 0),
      stats: effectiveRightStats,
      baseStats: rightStats,
      rootCounterPenalty: rightPenalty,
      startHp: monsterStartHp,
      startMana: monsterStartMana,
      endHp: endRightHp,
      endMana: endRightMana
    },
    events
  };
}

function voidHallRemainingHp(record) {
  if (typeof record?.monsterRemainingHp === "number") return Math.max(0, record.monsterRemainingHp);
  const maxHp = Number(record?.monsterStats?.maxHp || record?.requiredDamage || 0);
  return Math.max(0, maxHp - (Number(record?.totalDamage) || 0));
}

function voidHallSectMemberCount(record) {
  const sect = sectSummaries.value.find((item) => item.name === record?.sect);
  return Math.max(1, sectMembers(sect).length || record?.top?.length || 1);
}

function voidHallSectSpirit(record) {
  const direct = Number(record?.sectSpirit || 0);
  if (direct > 0) return direct;
  const base = Number(record?.spiritShare || 0);
  if (!base) return 0;
  return base * voidHallSectMemberCount(record) + Number(record?.spiritRemainder || 0);
}

function voidHallMemberSpiritText(record) {
  const base = Number(record?.spiritShare || 0);
  const remainder = Number(record?.spiritRemainder || 0);
  if (!base) return "成员无分润";
  if (remainder > 0) return `成员各得 ${base}-${base + 1}，输出靠前者多得`;
  return `成员各得 ${base}`;
}

function openVoidHallRecord(record) {
  selectedVoidHallSect.value = record?.sect || "";
  clearBattleReplay();
}

async function openSectVoidHallRecord(record) {
  if (!record) return;
  openDetailFromCurrent("rank");
  activeTab.value = "dungeon";
  activeDungeonRecordTab.value = "void";
  const index = dungeonDays.value.findIndex((day) => (day.sects || []).some((item) => item.sect === record.sect && item.day === record.day));
  if (index >= 0) dungeonDayIndex.value = index;
  await nextTick();
  selectedVoidHallSect.value = record.sect || "";
  clearBattleReplay();
}

function closeVoidHallRecord() {
  selectedVoidHallSect.value = "";
  clearBattleReplay();
}

function bloodCaveEntries(cave) {
  const clears = (cave?.clears || []).map((entry) => ({ ...entry, success: true }));
  const challengers = (cave?.challengers || []).map((entry) => ({ ...entry, success: Boolean(entry.success) }));
  const successful = challengers.filter((entry) => entry.success);
  const source = clears.length ? withBloodCaveDisplayRewards(cave, clears) : successful.length ? successful : challengers.length ? challengers : previousBloodCaveClears(cave);
  const ranked = source
    .sort(compareBloodCaveEntry)
    .slice(0, 3)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
  return ranked;
}

function withBloodCaveDisplayRewards(cave, entries) {
  const ranked = entries
    .map((entry) => ({ ...entry, score: bloodClearScoreValue(entry), spirit: 0, bonusSpirit: 0 }))
    .sort(compareBloodCaveEntry);
  const pool = cave?.spiritPool || {};
  const clearCount = Math.max(bloodCaveClearCount(cave), ranked.length, 1);
  const basePool = Math.max(clearCount, Number(pool.base || 0));
  const baseShare = Math.max(1, Math.floor(basePool / clearCount));
  for (const entry of ranked) entry.spirit = baseShare;
  let baseRemainder = Math.max(0, basePool - baseShare * clearCount);
  for (let index = 0; baseRemainder > 0 && index < ranked.length; index += 1) {
    ranked[index].spirit += 1;
    baseRemainder -= 1;
  }
  const podium = ranked.slice(0, 3);
  const bonusPool = Math.max(0, Number(pool.bonus || 0));
  if (podium.length && bonusPool > 0) {
    const weights = [5, 3, 2].slice(0, podium.length);
    const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
    let assigned = 0;
    podium.forEach((entry, index) => {
      const share = index === podium.length - 1 ? bonusPool - assigned : Math.floor(bonusPool * weights[index] / weightTotal);
      const safeShare = Math.max(0, share);
      entry.spirit += safeShare;
      entry.bonusSpirit += safeShare;
      assigned += safeShare;
    });
  }
  return ranked;
}

function bloodCaveClearCount(cave) {
  return Number(cave?.clearCount ?? cave?.clears?.length ?? 0);
}

function compareBloodCaveEntry(a, b) {
  const successDelta = Number(b.success) - Number(a.success);
  if (successDelta) return successDelta;
  if (a.success && b.success) {
    return compareBloodClearScore(a, b);
  }
  return (b.output || 0) - (a.output || 0) || (a.rounds || 999) - (b.rounds || 999);
}

function compareBloodClearScore(a, b) {
  return bloodClearScoreValue(b) - bloodClearScoreValue(a)
    || (a.rounds || 999) - (b.rounds || 999)
    || bloodClearHpLossRate(a) - bloodClearHpLossRate(b)
    || (b.output || 0) - (a.output || 0);
}

function bloodClearScoreValue(entry) {
  const explicit = Number(entry?.score);
  if (Number.isFinite(explicit) && explicit > 0) return Math.floor(explicit);
  const output = Math.max(0, Number(entry?.output) || 0);
  if (!output) return 0;
  const rounds = Math.max(1, Number(entry?.rounds) || 999);
  const hpRemainRate = 1 - bloodClearHpLossRate(entry);
  const manaRemainRate = bloodClearManaRemainRate(entry);
  const survivalScore = Math.round(output * 0.38 * hpRemainRate);
  const manaScore = Math.round(output * 0.12 * manaRemainRate);
  const speedScore = Math.round(output * 0.18 / Math.sqrt(rounds));
  return Math.max(1, output + survivalScore + manaScore + speedScore);
}

function bloodClearHpLossRate(entry) {
  const startHp = Number(entry?.startHp || 0);
  if (!Number.isFinite(startHp) || startHp <= 0) return 1;
  const endHp = Math.max(0, Math.min(startHp, Number(entry?.endHp ?? startHp)));
  return Math.max(0, Math.min(1, (startHp - endHp) / startHp));
}

function bloodClearManaRemainRate(entry) {
  const startMana = Number(entry?.startMana || 0);
  if (!Number.isFinite(startMana) || startMana <= 0) return 0;
  const endMana = Math.max(0, Math.min(startMana, Number(entry?.endMana ?? startMana)));
  return Math.max(0, Math.min(1, endMana / startMana));
}

function bloodCaveClearNames(cave) {
  return [...(cave?.clears || [])]
    .map((entry) => ({ ...entry, success: true }))
    .sort(compareBloodCaveEntry)
    .map((entry) => entry.name)
    .filter(Boolean);
}

function previousBloodCaveClears(cave) {
  const caveIndex = Number(cave?.cave || 0);
  if (caveIndex <= 1) return [];
  const previous = (selectedDungeonDay.value?.bloodTrial?.caves || []).find((item) => Number(item.cave) === caveIndex - 1);
  return (previous?.clears || []).map((entry) => ({
    ...entry,
    success: true,
    pending: true,
    replay: null,
    spirit: 0,
    item: "",
    tierName: ""
  }));
}

function bloodEntryResultText(entry) {
  if (entry.pending) return "待挑战";
  return entry.success ? "通关" : "败退";
}

function bloodEntryBattleText(entry) {
  if (entry.pending) return "待挑战";
  if (entry.success) return `评分 ${bloodClearScoreValue(entry)} · ${entry.rounds || "?"} 回合`;
  return `败退 · 输出 ${entry.output || 0}`;
}

function podiumRankIcon(rank) {
  return rank === 1 ? "冠" : rank === 2 ? "亚" : "季";
}

function bloodEntryPerson(entry) {
  return personByRef(entry) || entry;
}

function openBloodCaveReplay(entry) {
  openReplay(entry);
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

function starSeaMemberFrame(member) {
  const eventMember = starSeaCurrentEvent.value?.members?.find((item) => item.id === member.id);
  if (eventMember) return {
    hp: eventMember.hp ?? member.maxHp ?? 0,
    mana: eventMember.mana ?? member.maxMana ?? 0,
    damage: eventMember.damage ?? member.damage ?? 0,
    taken: eventMember.taken ?? member.taken ?? 0
  };
  if (isBattleReplayDone.value) return {
    hp: member.endHp ?? 0,
    mana: member.endMana ?? 0,
    damage: member.damage ?? 0,
    taken: member.taken ?? 0
  };
  return {
    hp: member.maxHp ?? 0,
    mana: member.maxMana ?? 0,
    damage: 0,
    taken: 0
  };
}

function skillEffectTitle(event) {
  const skill = skillForEvent(event);
  if (!skill) return event.skill || "技能";
  if (["shield", "defenseBuff", "reflect", "heal", "evasionBuff", "dodge", "field"].includes(skill.type)) {
    return `${skill.name} · 灵光护身`;
  }
  return `${skill.name} · 术法爆发`;
}

function skillDamageText(event) {
  const value = Number(event?.damage) || 0;
  return value > 0 ? `${value} 伤害` : "";
}

function skillEffectImage(event) {
  return skillAssetPath(skillForEvent(event));
}

function skillEffectStyle(event) {
  const image = skillEffectImage(event);
  return image ? { "--skill-image": `url(${image})` } : {};
}

function skillEffectGlyph(event) {
  const skill = skillForEvent(event);
  return skill ? skillGlyph(skill) : "✦";
}

function provinceEffect(province) {
  const rank = Math.max(1, Math.min((catalog.value.provinces || []).length || 34, Number(province.rank) || 34));
  const provinceCount = Math.max(1, (catalog.value.provinces || []).length || 34);
  const tier = Number((0.38 + 0.62 * ((provinceCount - rank) / Math.max(1, provinceCount - 1))).toFixed(4));
  if (province.type === "spirit") {
    const value = Math.round(8 + 16 * tier);
    return { type: province.type, value, text: `灵石包基准 +${value}/人` };
  }
  if (province.type === "xp") {
    const value = Number((0.36 + 0.28 * tier).toFixed(3));
    return { type: province.type, value, text: `经验包基准 +${Math.round(value * 100)}%/人` };
  }
  if (province.type === "breakthrough") {
    const value = Number((0.02 + 0.045 * tier).toFixed(4));
    return { type: province.type, value, text: `突破包基准 +${Math.round(value * 100)}%/人` };
  }
  const value = Math.round(8 + 16 * tier);
  return { type: "spirit", value, text: `灵石包基准 +${value}/人` };
}

function provinceGdpTier(rank) {
  const value = Number(rank) || 99;
  if (value <= 3) return "S";
  if (value <= 8) return "A";
  if (value <= 14) return "B";
  if (value <= 21) return "C";
  if (value <= 28) return "D";
  return "E";
}

function provinceShortName(name) {
  return String(name || "").replace(/省|市|自治区|特别行政区/g, "");
}

function bonusItemsText(items, type) {
  if (!items?.length) return "无对应省份";
  return items.map((item) => {
    const value = Number(item.value) || 0;
    if (type === "spirit") return `${item.name} +${value}`;
    return `${item.name} +${Math.round(value * 100)}%`;
  }).join("、");
}

function resourcePlanValue(plan, type) {
  if (!plan || !Number(plan.total)) return type === "spirit" ? "0" : "+0%";
  const total = Number(plan.total) || 0;
  if (type === "spirit") return `${Math.round(total)}`;
  return `+${Math.round(total * 100)}%`;
}

function resourceShareValue(value, type) {
  const amount = Number(value) || 0;
  if (type === "spirit") return `${Math.round(amount)}`;
  return `+${Math.round(amount * 100)}%`;
}

function provinceResourceIcon(type) {
  if (type === "xp") return Sparkles;
  if (type === "breakthrough") return Zap;
  return Coins;
}

function provinceResourceTotalValue(effect) {
  const type = effect?.type || "spirit";
  const total = (Number(effect?.value) || 0) * 10;
  if (type === "spirit") return `${Math.round(total)}`;
  return `+${Math.round(total * 100)}%`;
}

function provinceResourceTotalLabel(effect) {
  if (effect?.type === "xp") return `经验总包 ${provinceResourceTotalValue(effect)}`;
  if (effect?.type === "breakthrough") return `突破总包 ${provinceResourceTotalValue(effect)}`;
  return `灵石总包 ${provinceResourceTotalValue(effect)}`;
}

function resourceRoleLabel(role) {
  if (role === "leader") return "掌门";
  if (role === "elder") return "长老";
  if (role === "defender") return "守城";
  return "成员";
}

function resourcePlanText(plan, type) {
  if (!plan || !Number(plan.total)) return "暂无占领收益";
  const top = (plan.top || [])
    .slice(0, 3)
    .map((item) => `${resourceRoleLabel(item.role)} ${item.name} ${resourceShareValue(item.share, type)}`)
    .join("、");
  return top ? `倾斜：${top}` : "按宗门成员分配";
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

function defenderTooltip(defender) {
  return `${defender.name} · ${realmName(defender.realm)}`;
}

function clearProvinceResourceFilters() {
  provinceResourceTypeFilter.value = "";
  provinceResourceOwnerFilter.value = "";
}

const cultivators = computed(() => [
  withDuelRank({
    ...player.value,
    name: player.value.name,
    sect: gameState.value.sect?.name || "",
    mood: "求道",
    power: derived.value.playerPower,
    isPlayer: true
  }),
  ...(gameState.value.npcs || []).map((npc) => withDuelRank({ ...npc, power: personPower({ ...npc, isPlayer: false }), isPlayer: false }))
]);

const selectedPerson = computed(() => {
  const base = cultivators.value.find((item) => item.id === selectedPersonId.value);
  const detail = personDetails.value[selectedPersonId.value];
  return detailedPerson(base || detail?.person);
});
const selectedSect = computed(() => sectSummaries.value.find((sect) => sect.name === selectedSectName.value));
const detailBackLabel = computed(() => {
  const last = detailReturnStack.value[detailReturnStack.value.length - 1];
  if (!last) return "返回";
  if (last.detailView === "sect") return "返回宗门";
  if (last.detailView === "person") return "返回人物";
  if (last.activeTab === "rank" && last.detailView === "rank") return "返回榜单";
  return `返回${tabLabel(last.activeTab)}`;
});

function personByRef(ref) {
  if (!ref) return null;
  const person = cultivators.value.find((item) => item.id === ref.id || item.name === ref.name);
  const detail = personDetails.value[ref.id];
  if (detail?.person) return detailedPerson(person || detail.person);
  return detailedPerson(person) || withDuelRank(ref);
}

function detailedPerson(person) {
  if (!person?.id) return person;
  const detail = personDetails.value[person.id];
  const merged = detail?.person
    ? { ...person, ...detail.person, power: detail.power ?? detail.person.power ?? person.power }
    : person;
  return withDuelRank({
    ...merged,
    dailyRecords: merged.dailyRecords || [],
    breakthroughs: merged.breakthroughs || [],
    duelHistory: merged.duelHistory || [],
    dungeonHistory: merged.dungeonHistory || [],
    skillUpgrades: merged.skillUpgrades || [],
    duelSeasonHistory: merged.duelSeasonHistory || [],
    skillRanks: merged.skillRanks || {}
  });
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

function applyDuelRankRecordDelta(map, id, won, delta) {
  if (!id || !map[id]) return;
  const scoreDelta = typeof delta === "number" ? delta : (won ? duelSeasonInfo.value.winScore : duelSeasonInfo.value.lossScore);
  map[id].score = Math.max(0, Math.min(duelSeasonInfo.value.maxScore, map[id].score + scoreDelta));
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

function fallbackEquipmentValue(item) {
  const tier = Math.min(Math.max(Number(item?.tier || 1), 1), 6);
  const baseByTier = [220, 320, 500, 800, 1350, 2700];
  const spreadByTier = [40, 80, 140, 240, 500, 500];
  const tierData = equipmentTier(tier);
  const min = tierData.min || 0;
  const max = tierData.max || min + 0.01;
  const bonusRatio = Math.min(Math.max(((item?.bonus || min) - min) / Math.max(0.01, max - min), 0), 1);
  const slotPremium = item?.slot === "weapon" ? 40 : item?.slot === "trinket" ? 30 : item?.slot === "armor" ? 20 : 0;
  return Math.max(200, Math.round(baseByTier[tier - 1] + spreadByTier[tier - 1] * bonusRatio + slotPremium));
}

function equipmentDropKind(drop) {
  if (drop?.type) return drop.type;
  return drop?.loserId ? "steal" : "dungeon";
}

function equipmentDropSource(drop) {
  const kind = equipmentDropKind(drop);
  if (kind === "steal") return drop?.context ? `抢夺 · ${drop.context}` : "抢夺";
  if (drop?.context) return `副本 · ${drop.context}`;
  return "副本掉落";
}

function equipmentDropItem(drop) {
  return equipmentList.value.find((item) => item.id === drop?.itemId) || {};
}

function equipmentDropSlotName(drop) {
  return drop?.slotName || equipmentDropItem(drop).slotName || "未知部位";
}

function equipmentDropStatName(drop) {
  return drop?.statName || equipmentDropItem(drop).statName || "属性";
}

function equipmentDropBonus(drop) {
  return typeof drop?.bonus === "number" ? drop.bonus : equipmentDropItem(drop).bonus || 0;
}

function equipmentLatestTransfer(item) {
  return (gameState.value.equipmentTransfers || []).find((record) => record.itemId === item?.id) || null;
}

function equipmentTransferRecords(item) {
  const history = Array.isArray(item?.transferHistory) ? item.transferHistory : [];
  if (history.length) return history.slice(0, 5);
  return (gameState.value.equipmentTransfers || [])
    .filter((record) => record.itemId === item?.id)
    .slice(0, 5);
}

function equipmentTransferLine(record) {
  if (!record) return "";
  const day = record.day ? `第${record.day}天 ` : "";
  if (record.text) return `${day}${record.text}`;
  const toName = record.winnerName || record.receiverName || record.toName || "未知修士";
  if (equipmentDropKind(record) === "steal") {
    const fromName = record.loserName || record.fromName || "未知修士";
    return `${day}${toName}从${fromName}手中夺得`;
  }
  const source = record.context || record.fromName || "副本";
  return `${day}${toName}从${source}获得`;
}

function equipmentTransferPathLines(item) {
  const lines = equipmentTransferRecords(item).map(equipmentTransferLine).filter(Boolean);
  return lines.length ? lines : ["暂无流转记录"];
}

function equipmentSpecificSource(item) {
  if (!item?.ownerName) return "";
  const transfer = equipmentLatestTransfer(item);
  const kind = equipmentDropKind(transfer);
  if (kind === "steal") {
    const loser = transfer?.loserName ? `来自 ${transfer.loserName}` : "切磋夺得";
    return transfer?.context ? `${loser} · ${transfer.context}` : loser;
  }
  if (transfer?.context) return transfer.context;
  return item.acquiredDay ? `第 ${item.acquiredDay} 天获得` : "";
}

function equipmentDungeonChanceLines(item) {
  const pools = Object.values(derived.value.dungeonLootPools || {});
  return pools
    .map((pool) => {
      const poolItem = (pool.items || []).find((entry) => entry.id === item?.id);
      if (!poolItem) return "";
      const chances = (poolItem.chanceByCave || []).map((entry) => Number(entry.chance || 0)).filter((chance) => chance > 0);
      if (!chances.length) return `${pool.name}：极微`;
      const min = Math.min(...chances);
      const max = Math.max(...chances);
      const chanceText = min === max ? formatPreciseLootPercent(min) : `${formatPreciseLootPercent(min)}-${formatPreciseLootPercent(max)}`;
      return `${pool.name}：${chanceText}`;
    })
    .filter(Boolean);
}

function equipmentDropSourceLines(item) {
  const lines = [];
  lines.push(`切磋：夺取率 ${formatLootPercent(item?.stealChance)}`);
  lines.push(...equipmentDungeonChanceLines(item));
  return lines;
}

function equipmentDetailRows(item) {
  return [
    { label: "加成", value: `${item.statName} +${formatPercent(item.bonus)}` },
    { label: "价值", value: `${equipmentDisplayValue(item)} 灵石` },
    { label: "品质", value: item.tierName || equipmentTierName(item.tier) },
    { label: "部位", value: item.slotName || equipmentSlotName(item.slot) },
    { label: "归属", value: item.ownerName || "无归属" },
    { label: "来源", value: equipmentSpecificSource(item) },
    { label: "状态", value: item.equipped ? "已穿戴" : item.ownerName ? "收藏" : "流落在外" }
  ];
}

function equipmentCardAria(item) {
  return `${item.name}，${item.tierName}，${item.statName} +${formatPercent(item.bonus)}，价值 ${equipmentDisplayValue(item)} 灵石，归属 ${item.ownerName || "无归属"}`;
}

function equippedFor(person) {
  if (!person?.id) return [];
  return derived.value.equippedItems?.[person.id] || [];
}

function equippedInSlot(person, slotId) {
  return equippedFor(person).find((item) => item.slot === slotId);
}

function equipmentSlotSummary(person, slot) {
  const item = equippedInSlot(person, slot.id);
  if (!item) return `${slot.statName || "属性"} +0%`;
  return `${item.tierName} · ${item.statName} +${formatPercent(item.bonus)}`;
}

function equipmentSlotCardClass(person, slot) {
  const item = equippedInSlot(person, slot.id);
  return [item ? `tier-${item.tier}` : "empty-slot", `slot-${slot.id}`];
}

function equipmentBonus(person, stat) {
  return equippedFor(person)
    .filter((item) => item.stat === stat)
    .reduce((sum, item) => sum + (item.bonus || 0), 0);
}

function matchPerson(ref) {
  return personByRef(ref);
}

function duelMatchPersonSearchText(ref) {
  if (!ref) return "";
  const person = matchPerson(ref);
  return [
    ref.name,
    ref.sect,
    person.name,
    person.sect,
    realmName(ref.realm ?? person.realm),
    duelRankText(person)
  ].filter(Boolean).join(" ");
}

function duelMatchSearchText(match) {
  return [
    duelMatchPersonSearchText(match.left),
    duelMatchPersonSearchText(match.right),
    duelMatchPersonSearchText(match.winner),
    match.summary
  ].filter(Boolean).join(" ").toLowerCase();
}

function battlePerson(ref) {
  return personByRef(ref);
}

function isBattleMonster(ref) {
  return ref?.kind === "monster" || String(ref?.id || "").startsWith("monster-");
}

function battleDisplayName(ref) {
  if (!ref) return "";
  return isBattleMonster(ref) ? monsterShortName(ref.name) : ref.name;
}

function battleMax(side, kind) {
  if (!side) return 1;
  const startKey = kind === "mana" ? "startMana" : "startHp";
  const statKey = kind === "mana" ? "mana" : "hp";
  const fallbackKey = kind === "mana" ? "maxMana" : "maxHp";
  return Math.max(1, Number(side.baseStats?.[fallbackKey] || side.baseStats?.[statKey] || side.stats?.[fallbackKey] || side.stats?.[statKey] || side[startKey] || 1));
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
  if (activeRankBoard.value === "realmStats") return realmStatsRanking.value;
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
  .map((item) => {
    const effective = personEffectiveStats(item);
    return {
    name: item.name,
    id: item.id,
    kind: "person",
    sect: item.sect,
    subtitle: `${item.sect} · ${realmName(item.realm)}`,
    value: item.power,
    sortValue: powerSortValue(item, effective),
    sortLabel: powerSortLabel(item, effective),
    help: `战力 ${item.power}。境界：${realmName(item.realm)}；经验：${Math.floor(item.xp)}；灵根 ${rootLine(item)}；血量 ${effective.maxHp}，攻击 ${effective.attack}，防御 ${effective.defense}，神识 ${effective.divineSense}，法力 ${effective.maxMana}。`
    };
  })
  .sort(comparePowerRankItems));

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
    const warStats = sectWarStats(sect);
    return {
      name: sect.name,
      id: sect.name,
      kind: "sect",
      sect: sect.name,
      subtitle: `${members.length}人 · 掌门 ${sectLeaderName(sect)}`,
      value: sect.totalPower,
      help: `宗门总战力 ${sect.totalPower}；成员 ${members.length} 人；掌门 ${sectLeaderName(sect)}；长老 ${sectElderNames(sect)}。攻守城 ${warStats.wins}胜${warStats.losses}负。`
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

const realmStatsRanking = computed(() => {
  const groups = new Map();
  for (const person of cultivators.value) {
    const realm = Number(person.realm || 0);
    const key = String(realm);
    const current = groups.get(key) || {
      name: realmName(realm),
      id: key,
      kind: "realmStats",
      sect: "",
      realm,
      count: 0,
      totalPower: 0,
      topPower: 0,
      examples: []
    };
    current.count += 1;
    current.totalPower += person.power || 0;
    current.topPower = Math.max(current.topPower, person.power || 0);
    if (current.examples.length < 3) current.examples.push(person.name);
    groups.set(key, current);
  }
  return [...groups.values()]
    .sort((a, b) => b.realm - a.realm)
    .map((item) => ({
      ...item,
      subtitle: `${realmStageName(Math.floor(item.realm / 10))} · ${item.examples.join("、") || "暂无代表"}`,
      value: `${item.count} 人`,
      help: `${item.name}共有 ${item.count} 人；最高战力 ${item.topPower}；平均战力 ${Math.round(item.totalPower / Math.max(1, item.count))}。`
    }));
});

function powerSortValue(person, effective = personEffectiveStats(person)) {
  if (powerSortKey.value === "realm") return Number(person.realm || 0);
  if (powerSortKey.value === "maxHp") return Number(effective.maxHp || 0);
  if (powerSortKey.value === "attack") return Number(effective.attack || 0);
  if (powerSortKey.value === "defense") return Number(effective.defense || 0);
  if (powerSortKey.value === "divineSense") return Number(effective.divineSense || 0);
  if (powerSortKey.value === "maxMana") return Number(effective.maxMana || 0);
  if (powerSortKey.value === "spirit") return Number(person.spirit || 0);
  return Number(person.power || 0);
}

function powerSortLabel(person, effective = personEffectiveStats(person)) {
  const option = powerSortOptions.find((item) => item.id === powerSortKey.value)?.label || "战力";
  return `${option} ${powerSortValue(person, effective)}`;
}

function comparePowerRankItems(a, b) {
  const direction = powerSortDirection.value === "asc" ? 1 : -1;
  const valueDelta = ((a.sortValue || 0) - (b.sortValue || 0)) * direction;
  if (valueDelta) return valueDelta;
  return (b.value || 0) - (a.value || 0) || a.name.localeCompare(b.name, "zh-Hans-CN");
}

function isNpcBreakthroughLog(entry) {
  if (!entry?.text?.includes("突破至")) return false;
  return (gameState.value.npcs || []).some((npc) => entry.text.includes(`${npc.name}在${npc.sect}`));
}

function shouldShowHomeLog(entry) {
  const text = String(entry?.text || "");
  if (!text || isNpcBreakthroughLog(entry)) return false;
  if (text.startsWith("后台")) return false;

  const dailyFlavorLogs = [
    "坊市传来秘境流言",
    "宗门执事清点物资",
    "山雨压城",
    "散修在擂台连胜"
  ];
  if (dailyFlavorLogs.some((keyword) => text.includes(keyword))) return false;

  const dailySettlementLogs = [
    "子时已过",
    "手动推进了一天",
    "今日副本结算",
    "九州攻守结算",
    "全员切磋完成"
  ];
  if (dailySettlementLogs.some((keyword) => text.includes(keyword))) return true;

  if (text.startsWith("在坊市购得")) return true;
  if (text.startsWith("完成「")) return true;
  if (/^完成.+任务，获得/.test(text)) return true;
  if (text.includes("自动突破至") || text.includes("自动冲击境界失败")) return true;
  if (text.includes("服下「") || text.includes("炼化「")) return true;
  if (text.includes("通关") || text.includes("险象环生")) return true;
  if (text.includes("击退") || text.includes("攻势凌厉")) return true;
  if (text.includes("回合切磋") || text.includes("血量见底")) return true;
  if (text.includes("夺得") && text.includes("「")) return true;
  if (text.includes("竞得") && text.includes("「")) return true;
  if (text.includes("获得") && text.includes("「")) return true;
  if (text.includes("得「") && text.includes("」")) return true;
  if (entry?.type === "bad") return true;
  return false;
}

function formatPercent(value) {
  if (typeof value !== "number") return "未记录";
  return `${Math.round(value * 100)}%`;
}

function formatMultiplier(value) {
  const number = Math.max(1, Number(value) || 1);
  return number.toFixed(number % 1 ? 1 : 0);
}

function formatLootPercent(value) {
  if (typeof value !== "number") return "未记录";
  const percent = value * 100;
  if (percent >= 1) return `${Math.round(percent)}%`;
  return `${Number(percent.toFixed(2))}%`;
}

function formatPreciseLootPercent(value) {
  if (typeof value !== "number") return "未记录";
  const percent = value * 100;
  if (percent <= 0) return "极微";
  if (percent < 0.01) return `${Number(percent.toFixed(4))}%`;
  if (percent < 1) return `${Number(percent.toFixed(3))}%`;
  return `${Number(percent.toFixed(2))}%`;
}

function formatCompact(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 100000000) return `${Number((number / 100000000).toFixed(2))}亿`;
  if (Math.abs(number) >= 10000) return `${Number((number / 10000).toFixed(2))}万`;
  return String(Math.floor(number));
}

function equipmentShortName(name = "") {
  return String(name).replace(/[「」]/g, "").replace(/^(血煞|玄天|青冥|九幽|太乙|赤霄|天罡|坤元)/, "");
}

function isLongHomeLogText(text = "") {
  return String(text || "").trim().length > 34;
}

function homeLogTooltip(entry) {
  const text = String(entry?.text || "").trim();
  return isLongHomeLogText(text) ? text : null;
}

function logEntryMinute(time = "") {
  const text = String(time || "").trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function logEntryTimeText(entry) {
  const date = entry?.date || currentDate.value;
  const minute = logEntryMinute(entry?.time);
  return minute ? `${date} ${minute}` : date;
}

function logEntryDateTime(entry) {
  const date = entry?.date || currentDate.value;
  const minute = logEntryMinute(entry?.time);
  return minute ? `${date}T${minute}` : date;
}

function logTone(entry) {
  const text = entry?.text || "";
  if (text.includes("失败") || text.includes("败") || text.includes("未能")) return "loss";
  return "win";
}

function duelRankId(person) {
  return person?.duelSeason?.rankId || duelRankByScore(person?.duelSeason?.score || 0).rankId;
}

function duelRankText(person) {
  const season = person?.duelSeason || duelRankByScore(0);
  return `${season.rankName || "黑铁"} ${season.score || 0}分`;
}

function duelRankName(person) {
  const season = person?.duelSeason || duelRankByScore(0);
  return season.rankName || "黑铁";
}

function duelRankScoreText(person) {
  const season = person?.duelSeason || duelRankByScore(0);
  return `${season.score || 0}分`;
}

function duelRankSortValue(person) {
  const rankId = duelRankId(person);
  const index = duelRankList.value.findIndex((rank) => rank.id === rankId);
  return index >= 0 ? index : 0;
}

function duelMatchSortStats(match) {
  const people = [matchPerson(match.left), matchPerson(match.right), matchPerson(match.winner)].filter(Boolean);
  return people.reduce((best, person) => {
    const rank = duelRankSortValue(person);
    const score = Number(person.duelSeason?.score || 0);
    const power = Number(person.power || 0);
    return {
      rank: Math.max(best.rank, rank),
      score: Math.max(best.score, score),
      power: Math.max(best.power, power)
    };
  }, { rank: 0, score: 0, power: 0 });
}

function duelMatchOriginalOrder(match, index) {
  if (typeof match?.order === "number") return match.order;
  const idOrder = String(match?.id || "").match(/match-(\d+)$/);
  return idOrder ? Number(idOrder[1]) : index + 1;
}

function sortDuelMatchesByRank(matches) {
  return [...matches]
    .map((match, index) => ({
      match,
      order: duelMatchOriginalOrder(match, index),
      stats: duelMatchSortStats(match)
    }))
    .sort((a, b) => (
      b.stats.rank - a.stats.rank
      || b.stats.score - a.stats.score
      || b.stats.power - a.stats.power
      || a.order - b.order
    ))
    .map((item) => item.match);
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
  return addDays(gameState.value.calendarStartDate || gameState.value.lastSettlementDate, Math.max(0, Number(day || 1) - 1));
}

function displayDate(record) {
  return record?.date || dateForDay(record?.day || gameState.value.day);
}

function shortDateText(value) {
  const text = String(value || "");
  const dateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}))?/);
  if (dateMatch) return dateMatch[4] ? `${dateMatch[2]}-${dateMatch[3]} ${dateMatch[4]}` : `${dateMatch[2]}-${dateMatch[3]}`;
  return text || "今日";
}

function shortDisplayDate(record) {
  return shortDateText(displayDate(record));
}

function compactRecordNote(note) {
  return String(note || "")
    .replace(/（[^）]*）/g, "")
    .replace(/，?当前突破率.*$/g, "")
    .replace(/，?当时突破率.*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function dailyRecordMainText(record) {
  const totalXp = Number(record.xp) || 0;
  const spirit = Number(record.spirit) || 0;
  return `经验 +${totalXp} · 灵石 +${spirit}`;
}

function recentDayFloor(person) {
  const days = [
    gameState.value.day,
    ...(person?.dailyRecords || []).map((record) => record.day),
    ...(person?.dungeonHistory || []).map((record) => record.day)
  ]
    .map((day) => Number(day) || 0)
    .filter(Boolean);
  return Math.max(1, Math.max(...days, 1) - 29);
}

function personDailyRecords(person) {
  const floor = recentDayFloor(person);
  return (person?.dailyRecords || []).filter((record) => (Number(record.day) || 0) >= floor).slice(0, 30);
}

function dailyEquipmentDrops(person, record) {
  const day = Number(record?.day) || 0;
  if (!day) return [];
  return (person?.dungeonHistory || [])
    .filter((entry) => Number(entry.day) === day && entry.item)
    .map((entry) => {
      const tier = entry.tierName ? `${entry.tierName}` : "";
      return `${tier}${tier ? "「" : ""}${entry.item}${tier ? "」" : ""}`;
    });
}

function dailyRecordMetaText(person, record) {
  const drops = dailyEquipmentDrops(person, record);
  if (!drops.length) return "";
  return `装备 ${drops.slice(0, 2).join("、")}${drops.length > 2 ? `等${drops.length}件` : ""}`;
}

function recordTextFailed(text = "") {
  return /(失败|败退|未破|未通关|撤出|负|逆冲|见底)/.test(String(text || ""));
}

function recordTextSucceeded(text = "") {
  const value = String(text || "");
  return !recordTextFailed(value) && /(成功|突破至|通关|连破|胜|斩妖|升至)/.test(value);
}

function dailyRecordFailed(record) {
  return recordTextFailed(`${record?.note || ""} ${record?.result || ""}`);
}

function dailyRecordSucceeded(record) {
  return recordTextSucceeded(`${record?.note || ""} ${record?.result || ""}`);
}

function growthCompactText(growth) {
  if (!growth) return "";
  const parts = [
    ["血", growth.maxHp],
    ["攻", growth.attack],
    ["防", growth.defense],
    ["神", growth.divineSense],
    ["法", growth.maxMana]
  ]
    .filter(([, value]) => Number(value) > 0)
    .map(([label, value]) => `${label}+${value}`);
  return parts.length ? parts.join(" ") : "";
}

function breakthroughRecordMetaText(record) {
  const parts = [];
  if (typeof record.chance === "number") parts.push(`突破率 ${formatPercent(record.chance)}`);
  const growth = growthCompactText(record.growth);
  if (growth) parts.push(growth);
  return parts.join(" · ") || "无额外记录";
}

function skillUpgradeRecordTitle(record) {
  const status = skillUpgradeRecordSucceeded(record) ? "" : " · 失败";
  return `${shortDisplayDate(record)} · ${record.skillName || skillName(record.skillId)} · ${skillRankText(record.fromRank)} → ${skillRankText(record.toRank)}${status}`;
}

function skillUpgradeRecordMetaText(record) {
  const parts = [];
  if (record.cost) parts.push(`消耗 ${record.cost} 灵石`);
  if (typeof record.chance === "number") parts.push(`成功率 ${formatPercent(record.chance)}`);
  parts.push(skillUpgradeRecordSucceeded(record) ? "升阶成功" : `升阶失败，仍为 ${skillRankText(record.rank || record.fromRank)}`);
  return parts.join(" · ");
}

function skillUpgradeRecordSucceeded(record) {
  return record?.success !== false;
}

function duelRecordTitle(record) {
  return `${shortDateText(record.foughtAt || displayDate(record))} · ${record.result} · ${record.opponent}`;
}

function duelRecordMeta(record) {
  const parts = [];
  if (record.opponentSect) parts.push(record.opponentSect);
  if (record.opponentRankName) parts.push(record.opponentRankName);
  if (typeof record.scoreDelta === "number") parts.push(`积分 ${record.scoreDelta > 0 ? "+" : ""}${record.scoreDelta}`);
  else parts.push(hasReplay(record) ? "可回放" : "无回放");
  if (!hasReplay(record)) parts.push("七天外无回放");
  return parts.join(" · ");
}

function dungeonRecordTitle(record) {
  const name = String(record.name || "副本").split(/[：·]/)[0].trim() || "副本";
  return `${shortDateText(record.date || (record.day ? `第${record.day}天` : ""))} · ${name} · ${record.result}`;
}

function dungeonRecordFailed(record) {
  if (typeof record?.success === "boolean") return !record.success;
  return recordTextFailed(record?.result);
}

function dungeonRecordSucceeded(record) {
  if (typeof record?.success === "boolean") return record.success;
  return recordTextSucceeded(record?.result);
}

function dungeonRecordMetaText(record) {
  const parts = [];
  if (record.damage) parts.push(`输出 ${record.damage}`);
  parts.push(`灵石 +${record.spirit || 0}`);
  return parts.join(" · ");
}

function dailyChanceText(record) {
  if (typeof record.breakChance !== "number") return "未尝试突破";
  if (typeof record.realmBaseBreakChance === "number" || typeof record.rootBreakMultiplier === "number" || typeof record.sectBreakMultiplier === "number") {
    const realmBase = record.realmBaseBreakChance ?? record.baseBreakChance ?? record.breakChance;
    const rootMultiplier = record.rootBreakMultiplier ?? 1;
    const sectMultiplier = record.sectBreakMultiplier ?? (1 + (record.bonusBreakChance || 0));
    return `突破率 ${formatPercent(record.breakChance)}（境界 ${formatPercent(realmBase)} × 灵根 ${formatPercent(rootMultiplier)} × 宗门 ${formatPercent(sectMultiplier)}）`;
  }
  if (typeof record.baseBreakChance === "number" || typeof record.bonusBreakChance === "number") {
    return `突破率 ${formatPercent(record.breakChance)}（基础 ${formatPercent(record.baseBreakChance || 0)}，宗门 ${formatPercent(1 + (record.bonusBreakChance || 0))}）`;
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

function tabLabel(id) {
  return tabs.find((tab) => tab.id === id)?.label || "上一页";
}

function captureDetailReturn() {
  return {
    activeTab: activeTab.value,
    detailView: detailView.value,
    selectedPersonId: selectedPersonId.value,
    selectedSectName: selectedSectName.value
  };
}

function openDetailFromCurrent(nextView) {
  const current = captureDetailReturn();
  const last = detailReturnStack.value[detailReturnStack.value.length - 1];
  const sameAsLast = last
    && last.activeTab === current.activeTab
    && last.detailView === current.detailView
    && last.selectedPersonId === current.selectedPersonId
    && last.selectedSectName === current.selectedSectName;
  if (!sameAsLast && current.detailView !== nextView) detailReturnStack.value.push(current);
  detailView.value = nextView;
}

function returnFromDetail() {
  const target = detailReturnStack.value.pop();
  if (!target) {
    detailView.value = "rank";
    return;
  }
  activeTab.value = target.activeTab;
  detailView.value = target.detailView;
  selectedPersonId.value = target.selectedPersonId;
  selectedSectName.value = target.selectedSectName;
}

function captureBattleReturn() {
  return {
    activeTab: activeTab.value,
    activeSectSubTab: activeSectSubTab.value,
    detailView: detailView.value,
    selectedPersonId: selectedPersonId.value,
    selectedSectName: selectedSectName.value,
    selectedDuelDay: selectedDuelDay.value,
    selectedProvinceWarDay: selectedProvinceWarDay.value,
    selectedProvinceWarId: selectedProvinceWarId.value
  };
}

function openBattleReplay(replay, target = captureBattleReturn()) {
  if (!replay) return;
  replayLoading.value = false;
  battleReturnTarget.value = target;
  lastBattle.value = replay;
  playBattle();
}

function openReplayLoading(target = captureBattleReturn()) {
  battleReturnTarget.value = target;
  lastBattle.value = null;
  battleCursor.value = 0;
  clearInterval(battleTimer);
  replayLoading.value = true;
}

function cancelReplayLoading() {
  replayLoading.value = false;
}

function hasReplay(record) {
  if (record?.fallbackReplay) return true;
  if (record?.replayId && invalidReplayIds.value.has(record.replayId)) return false;
  if (typeof record?.hasReplay === "boolean") return record.hasReplay;
  return Boolean(record?.replay || record?.replayId || record?.hasReplay);
}

function markReplayInvalid(record) {
  if (record?.replayId) invalidReplayIds.value = new Set([...invalidReplayIds.value, record.replayId]);
  if (record) {
    record.hasReplay = false;
    record.replay = null;
  }
}

function replayMatchesExpectation(record, replay) {
  const expectation = record?.replayExpectation;
  if (!expectation || !replay) return true;
  const leftName = replay.left?.name || replay.team?.name || "";
  const rightName = replay.right?.name || replay.monster?.name || "";
  return (!expectation.leftName || leftName === expectation.leftName)
    && (!expectation.rightName || rightName === expectation.rightName);
}

async function openReplay(record, fallbackRecord = null, target = captureBattleReturn()) {
  const source = hasReplay(record) ? record : fallbackRecord;
  if (!source || !hasReplay(source)) return;
  if (source.replayId && invalidReplayIds.value.has(source.replayId) && source.fallbackReplay) {
    openBattleReplay(source.fallbackReplay, target);
    error.value = "";
    return;
  }
  if (source.replay) {
    if (!replayMatchesExpectation(source, source.replay)) {
      markReplayInvalid(source);
      if (source.fallbackReplay) {
        openBattleReplay(source.fallbackReplay, target);
        error.value = "";
        return;
      }
      error.value = "这条旧回放与当前战斗不匹配，已阻止打开错误战报。新结算的副本记录会自动修正。";
      return;
    }
    openBattleReplay(source.replay, target);
    return;
  }
  if (!source.replayId) return;
  openReplayLoading(target);
  setActionPending("/api/battles/replay", true);
  try {
    const response = await getBattleReplay(source.replayId);
    if (!response?.replay) return;
    if (!replayMatchesExpectation(source, response.replay)) {
      markReplayInvalid(source);
      if (source.fallbackReplay) {
        openBattleReplay(source.fallbackReplay, target);
        error.value = "";
        return;
      }
      error.value = "这条旧回放与当前战斗不匹配，已阻止打开错误战报。新结算的副本记录会自动修正。";
      return;
    }
    source.replay = response.replay;
    openBattleReplay(response.replay, target);
    error.value = "";
  } catch (err) {
    cancelReplayLoading();
    error.value = err.message;
  } finally {
    setActionPending("/api/battles/replay", false);
  }
}

async function openStarSeaTeamReplay(team) {
  await openReplay(team, selectedDungeonDay.value?.public || null, captureBattleReturn());
}

function returnFromBattle() {
  const target = battleReturnTarget.value;
  closeBattleReplay();
  if (!target) return;
  activeTab.value = target.activeTab;
  activeSectSubTab.value = target.activeSectSubTab;
  detailView.value = target.detailView;
  selectedPersonId.value = target.selectedPersonId;
  selectedSectName.value = target.selectedSectName;
  selectedDuelDay.value = target.selectedDuelDay;
  selectedProvinceWarDay.value = target.selectedProvinceWarDay;
  selectedProvinceWarId.value = target.selectedProvinceWarId;
}

function closeBattleReplay() {
  lastBattle.value = null;
  battleReturnTarget.value = null;
  replayLoading.value = false;
  battleCursor.value = 0;
  clearInterval(battleTimer);
}

function resetTabHome(tabId) {
  detailReturnStack.value = [];
  if (tabId === "rank") {
    detailView.value = "rank";
    lastBattle.value = null;
  }
  if (tabId === "sect") {
    activeSectSubTab.value = "map";
    selectedProvinceWarId.value = "";
  }
  if (tabId === "dungeon") {
    activeDungeonRecordTab.value = "blood";
    selectedVoidHallSect.value = "";
  }
  if (tabId === "arena") {
    selectedDuelDay.value = gameState.value.day;
  }
}

function switchTab(tabId) {
  closeBattleReplay();
  if (cultivationSubTabs.some((tab) => tab.id === tabId)) {
    cultivationSubTab.value = tabId;
    activeTab.value = "cultivation";
    resetTabHome("cultivation");
    return;
  }
  activeTab.value = tabId;
  resetTabHome(tabId);
  if (tabId === "practice" && state.value) refresh("home");
}

function adminNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback;
}

function syncAdminCultivatorDraft(person = adminCultivatorPerson.value) {
  if (!person) return;
  adminSelectedCultivatorId.value = person.id;
  adminCultivatorDraft.id = person.id;
  adminCultivatorDraft.name = person.name || "";
  adminCultivatorDraft.gender = person.gender || "unknown";
  adminCultivatorDraft.rootKeys = rootKeys(person).slice(0, 5);
  adminCultivatorDraft.portraitUrl = person.portraitUrl || "";
  adminCultivatorDraft.skillId = person.skillId || combatSkills.value[0]?.id || "";
  adminCultivatorDraft.xp = adminNumber(person.xp);
  adminCultivatorDraft.spirit = adminNumber(person.spirit);
  adminCultivatorDraft.maxHp = Math.max(1, adminNumber(person.maxHp, 1));
  adminCultivatorDraft.attack = Math.max(1, adminNumber(person.attack, 1));
  adminCultivatorDraft.defense = adminNumber(person.defense);
  adminCultivatorDraft.divineSense = Math.max(1, adminNumber(person.divineSense, 1));
  adminCultivatorDraft.maxMana = Math.max(1, adminNumber(person.maxMana, 1));
}

function selectAdminCultivator(id) {
  const person = adminCultivators.value.find((item) => item.id === id);
  if (!person) return;
  syncAdminCultivatorDraft(person);
  ensurePersonDetail(id);
}

function toggleAdminRoot(key) {
  const roots = adminCultivatorDraft.rootKeys;
  if (roots.includes(key)) {
    if (roots.length <= 1) return;
    adminCultivatorDraft.rootKeys = roots.filter((item) => item !== key);
    return;
  }
  if (roots.length >= 5) {
    error.value = "最多选择五种灵根。";
    return;
  }
  adminCultivatorDraft.rootKeys = [...roots, key];
}

function syncAdminSectDraft(name = adminSelectedSectName.value) {
  const sect = filteredAdminSects.value.find((item) => item.name === name) || filteredAdminSects.value[0] || adminSects.value[0];
  if (!sect) return;
  adminSelectedSectName.value = sect.name;
  adminSectDraft.oldName = sect.name;
  adminSectDraft.name = sect.name;
  adminSectDraft.portraitUrl = sect.portraitUrl || "";
  adminSectDraft.leaderId = sect.leaderId || "";
  const memberIds = new Set((sect.members || []).map((member) => member.id));
  adminSectDraft.elderIds = Array.isArray(sect.elderIds) ? sect.elderIds.filter((id) => id !== adminSectDraft.leaderId && (!memberIds.size || memberIds.has(id))) : [];
}

function selectAdminSect(name) {
  syncAdminSectDraft(name);
}

function sanitizeAdminSectOffices() {
  adminSectDraft.elderIds = [...new Set(adminSectDraft.elderIds.filter((id) => id && id !== adminEffectiveLeaderId.value))];
}

function resetAdminTaskDraft() {
  adminSelectedTaskId.value = "";
  Object.assign(adminTaskDraft, {
    id: "",
    name: "",
    detail: "",
    type: "complete",
    category: "生活",
    unitName: "次",
    targetAmount: 1,
    xpReward: 100,
    spiritReward: 10,
    maxMultiplier: 4,
    enabled: true
  });
}

function syncAdminTaskDraft(task = adminTaskDefinition.value || filteredAdminTasks.value[0] || null) {
  if (!task) {
    resetAdminTaskDraft();
    return;
  }
  adminSelectedTaskId.value = task.id;
  Object.assign(adminTaskDraft, {
    id: task.id,
    name: task.name || "",
    detail: task.detail || "",
    type: task.type || "complete",
    category: taskCategoryOptions.some((option) => option.id === task.category) ? task.category : "生活",
    unitName: task.unitName || "次",
    targetAmount: Number(task.targetAmount) || 1,
    xpReward: Number(task.xpReward) || 0,
    spiritReward: Number(task.spiritReward) || 0,
    maxMultiplier: Number(task.maxMultiplier) || 1,
    enabled: task.enabled !== false
  });
}

function selectAdminTask(id) {
  const task = taskDefinitions.value.find((item) => item.id === id);
  if (!task) return;
  syncAdminTaskDraft(task);
}

async function saveCultivatorProfile() {
  if (!adminCultivatorDraft.id) return;
  await act("/api/admin/cultivator", {
    id: adminCultivatorDraft.id,
    name: adminCultivatorDraft.name,
    gender: adminCultivatorDraft.gender,
    rootKeys: adminCultivatorDraft.rootKeys,
    portraitUrl: adminCultivatorDraft.portraitUrl,
    skillId: adminCultivatorDraft.skillId,
    xp: adminNumber(adminCultivatorDraft.xp),
    spirit: adminNumber(adminCultivatorDraft.spirit),
    maxHp: Math.max(1, adminNumber(adminCultivatorDraft.maxHp, 1)),
    attack: Math.max(1, adminNumber(adminCultivatorDraft.attack, 1)),
    defense: adminNumber(adminCultivatorDraft.defense),
    divineSense: Math.max(1, adminNumber(adminCultivatorDraft.divineSense, 1)),
    maxMana: Math.max(1, adminNumber(adminCultivatorDraft.maxMana, 1))
  }, { scope: "full" });
  await ensureFullState();
}

async function saveSectProfile() {
  if (!adminSectDraft.oldName) return;
  sanitizeAdminSectOffices();
  if (adminEffectiveLeaderId.value && adminSectDraft.elderIds.includes(adminEffectiveLeaderId.value)) {
    error.value = "掌门和长老不能是同一个人。";
    return;
  }
  await act("/api/admin/sect", {
    oldName: adminSectDraft.oldName,
    name: adminSectDraft.name,
    portraitUrl: adminSectDraft.portraitUrl,
    leaderId: adminSectDraft.leaderId,
    elderIds: adminSectDraft.elderIds
  }, { scope: "full" });
  await ensureFullState();
  adminSelectedSectName.value = adminSectDraft.name;
  syncAdminSectDraft(adminSectDraft.name);
}

async function saveTaskDefinition() {
  const path = adminTaskDraft.id ? "/api/task-definitions/update" : "/api/task-definitions";
  const saved = await act(path, { ...adminTaskDraft }, { scope: "lite", markStale: true });
  if (saved?.id) syncAdminTaskDraft(saved);
}

async function toggleAdminTask(task = adminTaskDefinition.value) {
  if (!task?.id) return;
  const updated = await act("/api/task-definitions/toggle", { id: task.id, enabled: task.enabled === false }, { scope: "lite", markStale: true });
  if (updated?.id) syncAdminTaskDraft(updated);
}

async function deleteAdminTask(task = adminTaskDefinition.value) {
  if (!task?.id) return;
  if (!confirm(`确定删除现实任务「${task.name}」？历史完成记录会保留。`)) return;
  await act("/api/task-definitions/delete", { id: task.id }, { scope: "lite", markStale: true });
  resetAdminTaskDraft();
}

function openRankItem(item) {
  if (item.kind === "sect") {
    selectedSectName.value = item.id;
    openDetailFromCurrent("sect");
    return;
  }
  selectedPersonId.value = item.id;
  openDetailFromCurrent("person");
  ensurePersonDetail(item.id);
}

function openPracticeRankItem(item) {
  if (item.kind !== "person") return;
  closeBattleReplay();
  selectedPersonId.value = item.id;
  activeTab.value = "rank";
  detailView.value = "person";
  ensurePersonDetail(item.id);
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

function selectRankBoard(id) {
  activeRankBoard.value = id;
  rankPage.value = 1;
  rankPageInput.value = "1";
}

function changeRankPage(offset) {
  rankPage.value = Math.max(1, Math.min(rankPageCount.value, rankPage.value + offset));
  rankPageInput.value = String(rankPage.value);
}

function jumpRankPage() {
  const page = Math.max(1, Math.min(rankPageCount.value, Number(rankPageInput.value) || 1));
  rankPage.value = page;
  rankPageInput.value = String(page);
}

function openPersonById(id) {
  selectedPersonId.value = id;
  openDetailFromCurrent("person");
  ensurePersonDetail(id);
}

function openProgression() {
  selectedRealmStage.value = derived.value.currentRealmInfo?.stage || selectedRealmStage.value;
  cultivationSubTab.value = "progression";
  activeTab.value = "cultivation";
}

function personStats(person) {
  const effective = personEffectiveStats(person);
  const power = personPower(person);
  const powerRank = personPowerRank(person);
  return [
    { label: "性别", value: genderLabel(person.gender), icon: "gender" },
    { label: "灵石", value: Math.floor(person.spirit || 0), icon: "spirit" },
    { label: "血量", value: statWithBonus(effective.maxHp, effective.bonuses.maxHp), icon: "hp" },
    { label: "法力", value: statWithBonus(effective.maxMana, effective.bonuses.maxMana), icon: "mana" },
    { label: "攻击", value: statWithBonus(effective.attack, effective.bonuses.attack), icon: "attack" },
    { label: "防御", value: statWithBonus(effective.defense, effective.bonuses.defense), icon: "defense" },
    { label: "神识", value: statWithBonus(effective.divineSense, effective.bonuses.divineSense), icon: "sense" },
    { label: "技能", value: skillCompactLabel(person), icon: "skill", help: skillTip(person) },
    { label: "战斗力", value: power, icon: "power", help: personPowerFormula(person, effective, power) },
    { label: "战力排名", value: powerRank ? `#${powerRank}` : "未上榜", icon: "rank", help: powerRank ? `当前个人战力榜第 ${powerRank} 名。` : "当前不在个人战力榜中。" }
  ];
}

function detailIconComponent(icon) {
  return {
    gender: CircleUserRound
  }[icon] || statIconComponent(icon) || BadgeCent;
}

function personPowerRank(person) {
  const index = powerRanking.value.findIndex((item) => item.id === person?.id);
  return index >= 0 ? index + 1 : 0;
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

function battleCompactStats(side) {
  const stats = battleStatsFromEffective(side?.stats || side?.baseStats || {});
  const shortLabels = { "攻击": "攻", "防御": "防", "神识": "神" };
  return stats.map((stat) => ({
    ...stat,
    short: shortLabels[stat.label] || stat.label
  }));
}

function personPower(person) {
  if (person.isPlayer) return derived.value.playerPower;
  return personInsight(person).power ?? derived.value.npcPowers?.[person.id] ?? powerFromEffectiveStats(personEffectiveStats(person));
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

function rootName(key) {
  return catalogRoots.value.find((root) => root.key === key)?.name || key;
}

function compactRootNames(names) {
  const cleaned = (names || []).map((name) => String(name || "").replace(/灵根$/, "")).filter(Boolean);
  if (!cleaned.length) return "";
  return `${cleaned.join("、")}灵根`;
}

const rootCycleNodes = computed(() => {
  const cycle = catalogRootRules.value.cycle || [];
  const count = Math.max(1, cycle.length);

  return cycle.map((rule, index) => {
    const angle = -90 + (360 / count) * index;
    const radians = angle * Math.PI / 180;
    const shortName = String(rule.name || "").replace(/灵根$/, "");
    let badge = "克 " + String(rule.targetName || "").replace(/灵根$/, "");

    return {
      ...rule,
      x: 50 + Math.cos(radians) * 35,
      y: 50 + Math.sin(radians) * 36,
      shortName,
      current: false,
      restrains: false,
      restrained: false,
      badge,
      help: `${rule.name} 克 ${rule.targetName}`
    };
  });
});

const rootAstrolabeNodes = computed(() => {
  const profile = personInsight(player.value).rootProfile;
  const ownedKeys = new Set(rootKeys(player.value));
  const activeSpecialId = profile.specialRoot?.id || "";
  const rootPositions = {
    water: [50, 14],
    fire: [78, 32],
    earth: [78, 68],
    heaven: [50, 86],
    metal: [22, 68],
    wood: [22, 32]
  };
  const specialPositions = {
    thunder: [50, 38],
    wind: [37, 61],
    hidden: [63, 61]
  };

  const baseNodes = rootCycleNodes.value.map((node) => ({
    ...node,
    x: rootPositions[node.key]?.[0] ?? node.x,
    y: rootPositions[node.key]?.[1] ?? node.y,
    owned: ownedKeys.has(node.key),
    primary: primaryRoot(player.value).key === node.key,
    special: false,
    highlighted: hoveredRootKey.value === node.key,
    statusText: ownedKeys.has(node.key)
      ? primaryRoot(player.value).key === node.key ? "主灵根" : "副灵根"
      : "未拥有"
  }));

  const specialNodes = (catalogRootRules.value.specialRoots || []).map((special) => {
    const active = activeSpecialId === special.id;
    const [x, y] = specialPositions[special.id] || [50, 50];
    const keys = special.keys || [];
    return {
      key: special.id,
      id: special.id,
      name: special.name,
      shortName: String(special.name || "").replace(/灵根$/, ""),
      note: special.note,
      keys,
      childNames: special.childNames || [],
      x,
      y,
      special: true,
      owned: active,
      primary: active,
      current: false,
      restrained: false,
      restrains: false,
      highlighted: hoveredRootKey.value === special.id,
      badge: "特殊",
      statusText: active ? "当前特殊灵根" : `需 ${keys.map(rootName).join("、") || "子灵根"} 共鸣`
    };
  });

  return [...baseNodes, ...specialNodes];
});

const rootChartEdges = computed(() => {
  const nodes = rootAstrolabeNodes.value.filter((node) => !node.special);
  const nodeMap = new Map(nodes.map((node) => [node.key, node]));
  const hoverKey = hoveredRootKey.value;
  return nodes
    .map((node) => {
      const target = nodeMap.get(node.targetKey);
      if (!target) return null;
      const outgoing = hoverKey === node.key;
      const incoming = hoverKey === target.key;
      return {
        from: node.key,
        to: target.key,
        fromX: node.x,
        fromY: node.y,
        toX: target.x,
        toY: target.y,
        outgoing,
        incoming,
        active: outgoing || incoming
      };
    })
    .filter(Boolean);
});

const hoveredRootDetail = computed(() => {
  const fallbackKey = personInsight(player.value).rootProfile.specialRoot?.id || primaryRoot(player.value).key || rootAstrolabeNodes.value[0]?.key;
  const key = hoveredRootKey.value || fallbackKey;
  const defaultNode = rootAstrolabeNodes.value[0] || {
    key: primaryRoot(player.value).key || "wood",
    name: primaryRoot(player.value).name || rootName("wood"),
    shortName: String(primaryRoot(player.value).name || rootName("wood")).replace(/灵根$/, ""),
    special: false,
    statusText: "未拥有"
  };
  const node = rootAstrolabeNodes.value.find((item) => item.key === key) || defaultNode;
  if (node.special) {
    const targets = node.childNames?.length ? node.childNames : (node.keys || []).map(rootName);
    const targetLine = compactRootNames(targets);
    return {
      ...node,
      effectText: `由 ${targetLine} 组成`,
      note: rootMoodText(node.key),
      counterText: `${node.name}克${targetLine}，不受普通灵根相克`,
      counteredByText: "不被普通灵根克制",
      restrainsText: targetLine || "子灵根",
      statusText: node.statusText || "特殊共鸣未激活"
    };
  }

  const target = catalogRootRules.value.cycle?.find((rule) => rule.key === node.key);
  const incoming = catalogRootRules.value.cycle?.find((rule) => rule.targetKey === node.key);
  const root = catalogRoots.value.find((item) => item.key === node.key);
  return {
    ...node,
    note: rootMoodText(node.key),
    effectText: rootEffectShortText(root || node),
    counterText: `${node.name}克${target?.targetName || "未知"}，受${incoming?.name || "未知"}克`,
    counteredByText: incoming?.name || "未知",
    restrainsText: target?.targetName || "未知",
    statusText: node.statusText || "未拥有"
  };
});

const currentRootCounterSummary = computed(() => {
  const profile = personInsight(player.value).rootProfile;
  if (profile.combatRoot?.type === "special") {
    const targets = (profile.restrainsList || []).map((root) => root.name).join("、") || "子灵根";
    return {
      counteredBy: "不被普通灵根克制",
      restrains: targets
    };
  }
  return {
    counteredBy: profile.restrainedBy?.name || "未知",
    restrains: profile.restrains?.name || "未知"
  };
});

function rootIconComponent(key) {
  return {
    metal: Gem,
    wood: Leaf,
    water: Waves,
    fire: Flame,
    earth: Mountain,
    heaven: Sun,
    thunder: Zap,
    wind: Cloud,
    hidden: Dna
  }[key] || BadgeCent;
}

function rootIconPath(key) {
  return `/assets/cultivation-system/root-icons/${key || "wood"}.png`;
}

function rootMoodText(key) {
  return {
    metal: "霜刃出匣，肃杀而坚凝",
    wood: "青枝破土，生生不息",
    water: "寒潭映月，绵密而深远",
    fire: "丹焰腾空，炽烈而明澈",
    earth: "厚土载山，沉稳而包容",
    thunder: "惊雷破夜，迅疾而刚猛",
    wind: "长风过岭，轻灵而无形",
    hidden: "雾锁幽渊，藏锋而难测",
    heaven: "天光垂落，万象归一"
  }[key] || "随心而动，玄妙自生";
}

function specialRootCompositionText(special) {
  const names = (special?.keys || []).map(rootName).filter(Boolean).join("、");
  return names ? `由 ${names} 组成` : "特殊灵根共鸣";
}

function rootList(person) {
  return personInsight(person).rootProfile.roots?.length ? personInsight(person).rootProfile.roots : [person.root].filter(Boolean);
}

function primaryRoot(person) {
  return personInsight(person).rootProfile.primaryRoot || rootList(person)[0] || person.root || {};
}

function rootKeys(person) {
  return rootList(person).map((root) => root.key);
}

function rootLine(person) {
  return rootList(person).map((root) => root.key === primaryRoot(person).key ? `${root.name}（主）` : root.name).join("、");
}

const profileRootText = computed(() => {
  const roots = rootList(player.value);
  if (roots.length <= 1) return roots[0]?.name || player.value.root?.name || "未知";
  const primaryKey = primaryRoot(player.value).key;
  return [...roots]
    .sort((a, b) => Number(b.key === primaryKey) - Number(a.key === primaryKey))
    .map((root) => String(root.name || "").replace(/灵根$/, ""))
    .filter(Boolean)
    .join("、");
});

function rootEffectiveBonus(person, root) {
  const count = Math.max(1, rootList(person).length);
  return rootBonus(root) / count;
}

function rootEffectLabel(root) {
  return {
    attack: "攻击",
    defense: "防御",
    hp: "血量",
    mana: "法力",
    divineSense: "神识",
    xp: "经验"
  }[root?.effect] || "加成";
}

function rootEffectShortText(root) {
  if (!root) return "暂无加成";
  const range = typeof root.min === "number" && typeof root.max === "number"
    ? ` +${formatPercent(root.min)}~${formatPercent(root.max)}`
    : "";
  const base = `${rootEffectLabel(root)}${range}`;
  if (root.effect === "xp" && typeof root.breakMultiplier === "number") {
    return `${base}，突破 +${formatPercent(root.breakMultiplier - 1)}`;
  }
  return base;
}

function rootBonusText(person, root) {
  return `${rootEffectLabel(root)} +${formatPercent(rootEffectiveBonus(person, root))}`;
}

function rootSummary(person) {
  const insight = personInsight(person);
  const rootsText = rootList(person).map((root) => `${root.name}${root.key === primaryRoot(person).key ? "主" : "副"}：${rootBonusText(person, root)}`).join("；");
  const specialText = insight.rootProfile.specialRoot
    ? `；特殊灵根：${insight.rootProfile.specialRoot.name}`
    : "";
  return `${rootsText}；经验效率 ${formatPercent(insight.rootProfile.cultivationMultiplier)}，突破效率 ${formatPercent(insight.rootProfile.breakthroughMultiplier)}${specialText}`;
}

function rootSummaryLines(person) {
  const insight = personInsight(person);
  const lines = rootList(person).map((root) => `${root.name}${root.key === primaryRoot(person).key ? "主" : "副"}：${rootBonusText(person, root)}`);
  lines.push(`经验效率 ${formatPercent(insight.rootProfile.cultivationMultiplier)}，突破效率 ${formatPercent(insight.rootProfile.breakthroughMultiplier)}`);
  if (insight.rootProfile.specialRoot) {
    lines.push(`特殊灵根：${insight.rootProfile.specialRoot.name}`);
  }
  return lines;
}

function rootCounterText(person) {
  const profile = personInsight(person).rootProfile;
  if (profile.combatRoot?.type === "special") {
    const targets = (profile.restrainsList || []).map((root) => root.name).join("、");
    return `${profile.combatRoot.name}克${targets || "子灵根"}，不受其他灵根相克`;
  }
  if (!profile.restrains || !profile.restrainedBy) return "灵根相克未明";
  return `${profile.primaryRoot.name}克${profile.restrains.name}，受${profile.restrainedBy.name}克`;
}

function personInsight(person) {
  const fallbackBreakthrough = fallbackPersonBreakthroughChance(person);
  const fallback = {
    rootProfile: {
      roots: [person?.root].filter(Boolean),
      primaryRoot: person?.root || {},
      count: 1,
      cultivationMultiplier: 1,
      breakthroughMultiplier: 1,
      combatRoot: person?.root ? { type: "root", key: person.root.key, name: person.root.name, childKeys: [person.root.key], root: person.root } : null,
      restrains: null,
      restrainsList: [],
      restrainedBy: null,
      specialRoot: null,
      resonances: []
    },
    effectiveStats: null,
    power: null,
    tomorrowXp: { baseXp: person?.isPlayer ? 10 : 100, rootMultiplier: 1, sectMultiplier: 1, total: person?.isPlayer ? 10 : 100 },
    breakthrough: { realmBase: baseBreakthroughChance(person?.realm || 0), rootMultiplier: 1, sectMultiplier: 1, base: fallbackBreakthrough, bonus: 0, total: fallbackBreakthrough }
  };
  const insight = derived.value.personInsights?.[person?.id] || {};
  const rootProfile = {
    ...fallback.rootProfile,
    ...(insight.rootProfile || {})
  };
  return {
    ...fallback,
    ...insight,
    rootProfile,
    tomorrowXp: {
      ...fallback.tomorrowXp,
      ...(insight.tomorrowXp || {})
    },
    breakthrough: {
      ...fallback.breakthrough,
      ...(insight.breakthrough || {})
    }
  };
}

function personBreakthroughChance(person) {
  return derived.value.personInsights?.[person?.id]?.breakthrough?.total ?? fallbackPersonBreakthroughChance(person);
}

function fallbackPersonBreakthroughChance(person) {
  return Math.max(minimumBreakthroughChance(person?.realm || 0), Math.min(0.88, baseBreakthroughChance(person?.realm || 0)));
}

function baseBreakthroughChance(realm) {
  const safeRealm = realm || 0;
  const lateMajorChance = lateMajorBreakthroughChance(safeRealm);
  if (lateMajorChance !== null) return lateMajorChance;

  const stageIndex = Math.floor(safeRealm / 10);
  const level = (safeRealm % 10) + 1;
  const levelPenalty = (level - 1) * 0.024;
  const stagePenalty = stageIndex * 0.058;
  const bottleneckPenalty = level === 10 ? 0.26 + stageIndex * 0.04 : 0;
  if (stageIndex === 1 && level === 10) return 0.1;
  if (stageIndex === 2 && level === 10) return 0.06;
  return Math.max(0.04, Math.min(0.86, 0.76 - levelPenalty - stagePenalty - bottleneckPenalty));
}

function lateMajorBreakthroughChance(realm) {
  const safeRealm = Math.max(0, Math.floor(realm || 0));
  if (safeRealm % 10 !== 9 || safeRealm + 1 >= realmNames.length) return null;
  const targetStageIndex = Math.floor((safeRealm + 1) / 10);
  if (targetStageIndex < 4) return null;
  return 0.02 / Math.pow(2, targetStageIndex - 4);
}

function minimumBreakthroughChance(realm) {
  return lateMajorBreakthroughChance(realm) === null ? 0.04 : 0;
}

function rootBonus(root, fallback = 0) {
  return typeof root?.bonus === "number" ? root.bonus : fallback;
}

function personEffectiveStats(person) {
  const serverStats = personInsight(person).effectiveStats;
  if (serverStats) return serverStats;
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

function tomorrowXpText(person) {
  const xp = personInsight(person).tomorrowXp;
  return `基础 ${xp.baseXp} × 灵根 ${formatPercent(xp.rootMultiplier)} × 宗门 ${formatPercent(xp.sectMultiplier)} = ${xp.total}`;
}

function breakthroughPartsText(person) {
  const parts = personInsight(person).breakthrough;
  const sectMultiplier = parts.sectMultiplier ?? (1 + (parts.bonus || 0));
  const potionText = Number(parts.potionBonus || 0) > 0 ? ` + 丹药 ${formatPercent(parts.potionBonus)}` : "";
  return `境界基础 ${formatPercent(parts.realmBase)} × 灵根 ${formatPercent(parts.rootMultiplier)} × 宗门 ${formatPercent(sectMultiplier)}${potionText} = ${formatPercent(parts.total)}`;
}

function statWithBonus(total, bonus = 0) {
  return bonus > 0 ? `${total}（+${bonus}）` : `${total}`;
}

function statTotal(total) {
  return Math.floor(total || 0);
}

function growthText(growth) {
  if (!growth) return "";
  return `成长：血量 +${growth.maxHp || 0}，攻击 +${growth.attack || 0}，防御 +${growth.defense || 0}，神识 +${growth.divineSense || 0}，法力 +${growth.maxMana || 0}`;
}

function personXpNeed(person) {
  return derived.value.realmProgression?.[person?.realm || 0]?.xpNeed || derived.value.xpNeed || 1;
}

function sectMembers(sect) {
  return Array.isArray(sect?.members)
    ? [...sect.members].sort((a, b) => (b.power || personPower(b)) - (a.power || personPower(a)) || a.name.localeCompare(b.name, "zh-Hans-CN"))
    : [];
}

function sectByName(name) {
  return sectSummaries.value.find((sect) => sect.name === name) || null;
}

function sectMemberCount(name) {
  const sect = sectByName(name);
  return sect?.memberCount || sect?.members?.length || cultivators.value.filter((person) => person.sect === name).length;
}

function sectTotalPower(name) {
  return sectByName(name)?.totalPower || 0;
}

function sectLeaderName(sect) {
  return sect?.leaderName || sect?.leader || "无";
}

function sectElderNames(sect) {
  return sect?.elderNames?.length ? sect.elderNames.join("、") : "未设";
}

function sectMemberOffice(sect, member) {
  if (!sect || !member) return "";
  if (member.id === sect.leaderId) return "掌门";
  if ((sect.elderIds || []).includes(member.id)) return "长老";
  return "";
}

function sectAvatarStyle(sect) {
  const name = sect?.name || sect?.oldName || "";
  const portraitUrl = sect?.portraitUrl || "";
  return portraitUrl
    ? { backgroundImage: `url(${portraitUrl})`, backgroundColor: sectColor(name) }
    : { background: sectColor(name) };
}

function sectStats(sect) {
  const members = sectMembers(sect);
  const warStats = sectWarStats(sect);
  return [
    ["总战力", sect.totalPower],
    ["成员", members.length],
    ["掌门", sectLeaderName(sect)],
    ["长老", sectElderNames(sect)],
    ["攻守城", `${warStats.wins}胜${warStats.losses}负`]
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
      extraCssText: "z-index:10001;box-shadow:0 12px 28px rgba(31,41,51,.22);border-radius:8px;padding:9px 11px;",
      formatter: mapTooltipHtml
    },
    series: [
      {
        type: "map",
        map: "china-sect",
        roam: false,
        layoutCenter: ["50%", "51%"],
        layoutSize: "128%",
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

function isActionPending(path) {
  return pendingActions.value.has(path);
}

function setActionPending(path, value) {
  const next = new Set(pendingActions.value);
  if (value) next.add(path);
  else next.delete(path);
  pendingActions.value = next;
}

function mergeCultivatorDetail(detail) {
  const id = detail?.person?.id;
  if (!id) return;
  personDetails.value = {
    ...personDetails.value,
    [id]: detail
  };
  if (!state.value) return;
  const nextDerived = {
    ...(state.value.derived || {}),
    personInsights: {
      ...(state.value.derived?.personInsights || {}),
      [id]: detail.insight
    },
    equippedItems: {
      ...(state.value.derived?.equippedItems || {}),
      [id]: detail.equippedItems || []
    },
    duelRanks: {
      ...(state.value.derived?.duelRanks || {}),
      [id]: detail.duelRank || detail.person.duelSeason
    },
    npcPowers: id === "player"
      ? (state.value.derived?.npcPowers || {})
      : {
        ...(state.value.derived?.npcPowers || {}),
        [id]: detail.power ?? detail.person.power
      },
    playerPower: id === "player" ? (detail.power ?? detail.person.power ?? state.value.derived?.playerPower) : state.value.derived?.playerPower
  };
  state.value = {
    ...state.value,
    player: id === "player" ? { ...(state.value.player || {}), ...detail.person } : state.value.player,
    npcs: id === "player"
      ? (state.value.npcs || [])
      : (state.value.npcs || []).map((npc) => npc.id === id ? { ...npc, ...detail.person } : npc),
    derived: nextDerived
  };
}

async function ensurePersonDetail(id) {
  if (!id || personDetails.value[id] || personDetailLoading.value.has(id)) return;
  const nextLoading = new Set(personDetailLoading.value);
  nextLoading.add(id);
  personDetailLoading.value = nextLoading;
  try {
    mergeCultivatorDetail(await getCultivatorDetail(id));
  } catch (err) {
    error.value = err.message;
  } finally {
    const doneLoading = new Set(personDetailLoading.value);
    doneLoading.delete(id);
    personDetailLoading.value = doneLoading;
  }
}

function mergeGameState(current, incoming, options = {}) {
  if (!incoming) return current || null;
  if (options.replace) {
    const { __scope, ...incomingState } = incoming;
    return {
      ...emptyState,
      ...incomingState,
      catalog: incomingState.catalog || current?.catalog || {},
      derived: incomingState.derived || {}
    };
  }
  if (!["home", "lite"].includes(incoming.__scope) || !current) {
    const { __scope, ...fullState } = incoming;
    return fullState;
  }
  const { __scope, derived: incomingDerived, catalog: incomingCatalog, ...hotState } = incoming;
  return {
    ...current,
    ...hotState,
    player: {
      ...(current.player || {}),
      ...(incoming.player || {})
    },
    sect: {
      ...(current.sect || {}),
      ...(incoming.sect || {})
    },
    tasks: incoming.tasks || current.tasks || [],
    taskDefinitions: incoming.taskDefinitions || current.taskDefinitions || [],
    taskCompletions: incoming.taskCompletions || current.taskCompletions || [],
    home: {
      ...(current.home || {}),
      ...(incoming.home || {})
    },
    catalog: incomingCatalog || current.catalog || {},
    derived: {
      ...(current.derived || {}),
      ...(incomingDerived || {})
    }
  };
}

function applyState(nextState, options = {}) {
  const shouldClearPersonDetails = options.replace || nextState?.__scope !== "home";
  if (shouldClearPersonDetails) personDetails.value = {};
  state.value = mergeGameState(state.value, nextState, options);
  if (state.value && nextState?.__scope === "home") saveCachedState(state.value);
  if (!["home", "lite"].includes(nextState?.__scope)) fullStateStale.value = false;
  else fullStateStale.value = true;
  if (state.value && detailView.value === "person" && selectedPersonId.value) ensurePersonDetail(selectedPersonId.value);
}

function syncSelectedDays() {
  if (!selectedRealmStage.value) {
    selectedRealmStage.value = derived.value.currentRealmInfo?.stage || groupedRealmProgression.value[0]?.stage || "";
  }
  if (!selectedDuelDay.value) selectedDuelDay.value = gameState.value.day;
  else selectedDuelDay.value = clampDay(selectedDuelDay.value);
  if (!selectedProvinceWarDay.value) selectedProvinceWarDay.value = gameState.value.day;
  else selectedProvinceWarDay.value = clampDay(selectedProvinceWarDay.value);
}

function switchAuthMode(mode) {
  authMode.value = mode === "register" ? "register" : "login";
  authError.value = "";
}

function toggleAccountMenu() {
  accountMenuOpen.value = !accountMenuOpen.value;
}

function closeAccountMenu() {
  accountMenuOpen.value = false;
}

function isAuthErrorMessage(message = "") {
  return /请先登录|未登录/.test(String(message || ""));
}

function resetClientStateForAuth() {
  clearCachedState();
  state.value = null;
  personDetails.value = {};
  selectedPersonId.value = "player";
  detailView.value = "rank";
  activeTab.value = "practice";
  fullStateStale.value = false;
}

async function loadGameAfterAuth(user) {
  authUser.value = user;
  loading.value = true;
  resetClientStateForAuth();
  authUser.value = user;
  await refresh("home");
  if (needsHeavyState(activeTab.value)) ensureFullState();
}

async function initializeAuth() {
  authLoading.value = true;
  try {
    const result = await getCurrentUser();
    await loadGameAfterAuth(result.user);
    authError.value = "";
  } catch {
    authUser.value = null;
    loading.value = false;
  } finally {
    authLoading.value = false;
  }
}

async function submitAuth() {
  if (authPending.value) return;
  authPending.value = true;
  authError.value = "";
  try {
    const result = authMode.value === "register"
      ? await register(authForm.username, authForm.password, authForm.registrationCode)
      : await login(authForm.username, authForm.password);
    authForm.password = "";
    authForm.registrationCode = "";
    await loadGameAfterAuth(result.user);
  } catch (err) {
    authError.value = err.message;
  } finally {
    authPending.value = false;
  }
}

async function handleLogout() {
  if (authPending.value) return;
  authPending.value = true;
  try {
    await logout();
  } catch {
    // Local logout should still clear the client if the server session is already gone.
  } finally {
    resetClientStateForAuth();
    authUser.value = null;
    accountMenuOpen.value = false;
    loading.value = false;
    authPending.value = false;
    authError.value = "";
  }
}

async function refresh(scope = "full") {
  if (scope === "full" && fullStateRefreshing.value) return;
  if (scope === "home" && homeStateRefreshing.value) return;
  if (scope === "full") fullStateRefreshing.value = true;
  if (scope === "home") homeStateRefreshing.value = true;
  try {
    applyState(await getState(scope));
    syncSelectedDays();
    error.value = "";
  } catch (err) {
    error.value = err.message;
    if (isAuthErrorMessage(err.message)) {
      resetClientStateForAuth();
      authUser.value = null;
      return;
    }
    if (!state.value) {
      const cachedState = getCachedState();
      if (cachedState) {
        state.value = cachedState;
        fullStateStale.value = true;
        syncSelectedDays();
      }
    }
  } finally {
    loading.value = false;
    if (scope === "full") fullStateRefreshing.value = false;
    if (scope === "home") homeStateRefreshing.value = false;
  }
}

async function ensureFullState() {
  if (fullStateRefreshing.value) return;
  await refresh("full");
}

async function act(path, body = {}, options = {}) {
  if (isActionPending(path)) return null;
  setActionPending(path, true);
  try {
    const response = await postAction(path, body, options);
    const nextState = response.state || (response.result !== undefined ? null : response);
    const refreshHomeAfterAction = options.refreshHome !== false && shouldRefreshHomeState(path);
    if (nextState) {
      applyState(nextState, options);
      syncSelectedDays();
      if (nextState?.__scope === "lite" && (options.markStale || shouldMarkFullStateStale(path))) {
        fullStateStale.value = true;
        if (!options.deferFullRefresh && needsHeavyState(activeTab.value)) ensureFullState();
      }
    } else if (options.markStale || shouldMarkFullStateStale(path)) {
      fullStateStale.value = true;
      if (!options.deferFullRefresh && needsHeavyState(activeTab.value)) ensureFullState();
    }
    if (refreshHomeAfterAction) await refresh("home");
    error.value = "";
    return response.result;
  } catch (err) {
    error.value = err.message;
    if (isAuthErrorMessage(err.message)) {
      resetClientStateForAuth();
      authUser.value = null;
    }
    return null;
  } finally {
    setActionPending(path, false);
  }
}

function shouldMarkFullStateStale(path) {
  return ["/api/day/advance", "/api/tasks", "/api/breakthrough"].includes(path);
}

function shouldRefreshHomeState(path) {
  return [
    "/api/reset",
    "/api/day/advance",
    "/api/tasks",
    "/api/breakthrough",
    "/api/skills/upgrade",
    "/api/rest",
    "/api/dungeons/run",
    "/api/sect/mission",
    "/api/sect/war",
    "/api/duel",
    "/api/duels/day",
    "/api/items/buy",
    "/api/items/use",
    "/api/items/sell",
    "/api/player/portrait",
    "/api/admin/cultivator",
    "/api/admin/sect"
  ].includes(path);
}

function needsHeavyState(tab = activeTab.value) {
  return ["dungeon", "sect", "arena", "market", "equipment", "rank", "admin"].includes(tab);
}

function needsLiteState(tab = activeTab.value) {
  return ["cultivation", "tasks", "market"].includes(tab);
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

function clearBattleReplay() {
  lastBattle.value = null;
  battleReturnTarget.value = null;
  battleCursor.value = 0;
  clearInterval(battleTimer);
}

async function openDuelReplay(record) {
  if (!hasReplay(record)) return;
  const target = captureBattleReturn();
  activeTab.value = "arena";
  detailView.value = "rank";
  await openReplay(record, null, target);
}

async function openMatchReplay(match, dayRecord) {
  if (!match || !hasReplay(match)) return;
  if (match.replay) {
    openBattleReplay(match.replay);
    return;
  }
  if (match.replayId) {
    await openReplay(match);
    return;
  }
  openReplayLoading(captureBattleReturn());
  setActionPending("/api/duels/replay", true);
  try {
    const response = await getDuelReplay(dayRecord?.day || selectedDuelDay.value, match.id);
    if (!response?.replay) return;
    match.replay = response.replay;
    openBattleReplay(response.replay);
    error.value = "";
  } catch (err) {
    cancelReplayLoading();
    error.value = err.message;
  } finally {
    setActionPending("/api/duels/replay", false);
  }
}

function openProvinceBattle(battle) {
  if (!hasReplay(battle)) return;
  openReplay(battle);
}

function openProvinceWarDetail(war) {
  selectedProvinceWarId.value = war.id;
  clearBattleReplay();
}

function openSectWarRecord(war) {
  if (!war) return;
  openDetailFromCurrent("rank");
  activeTab.value = "sect";
  activeSectSubTab.value = "wars";
  selectedProvinceWarDay.value = clampDay(war.day || gameState.value.day);
  selectedProvinceWarId.value = war.id;
  provinceWarSearch.value = "";
  clearBattleReplay();
}

function closeProvinceWarDetail() {
  selectedProvinceWarId.value = "";
  clearBattleReplay();
}

function clampDay(day) {
  if (!state.value) return Math.max(1, Number(day) || 1);
  return Math.max(1, Math.min(gameState.value.day, Number(day) || gameState.value.day));
}

function changeDuelDay(offset) {
  selectedDuelDay.value = clampDay(selectedDuelDay.value + offset);
  clearBattleReplay();
}

function changeProvinceWarDay(offset) {
  selectedProvinceWarDay.value = clampDay(selectedProvinceWarDay.value + offset);
  selectedProvinceWarId.value = "";
  clearBattleReplay();
}

async function startDailyDuels() {
  const result = await act("/api/duels/day", {}, { scope: "lite", markStale: true, deferFullRefresh: true });
  if (!result) return;
  upsertDuelDayRecord(result);
  selectedDuelDay.value = result.day;
  clearBattleReplay();
}

function upsertDuelDayRecord(record) {
  if (!record || !state.value) return;
  const current = gameState.value.duelDays || [];
  const next = [record, ...current.filter((item) => item.day !== record.day)]
    .sort((a, b) => (Number(b.day) || 0) - (Number(a.day) || 0));
  state.value = {
    ...state.value,
    duelDays: next
  };
}

async function submitTask() {
  const task = selectedTaskDefinition.value;
  if (!task) {
    error.value = "请先在后台新增一个可用的现实任务。";
    return;
  }
  await act("/api/tasks", {
    taskId: task.id,
    completedAmount: task.type === "measurable" ? taskForm.completedAmount : 1
  });
  taskForm.completedAmount = task.type === "measurable" ? task.targetAmount : 1;
}

async function submitBreakthrough() {
  if (!canBreakthroughNow.value) return;
  await act("/api/breakthrough");
}

async function advanceDay() {
  await act("/api/day/advance");
}

async function upgradeSkill() {
  await act("/api/skills/upgrade", {}, { scope: "lite" });
}

async function buyMarketItem(id) {
  await act("/api/items/buy", { kind: id }, { scope: "lite" });
}

async function useMarketItem(id) {
  await act("/api/items/use", { kind: id }, { scope: "lite" });
}

async function sellMarketItem(id) {
  await act("/api/items/sell", { kind: id }, { scope: "lite" });
}

function remainingText(item) {
  if (item.remaining === null || item.remaining === undefined) return "不限";
  return `${item.remaining} / ${item.limitMax}`;
}

function breakthroughBonusText(bonus = 0) {
  return `+${Math.round(Math.max(0, Number(bonus) || 0) * 100)}%`;
}

function marketItemText(item = {}) {
  if (item.effect?.type === "breakthroughBonus") {
    const suffix = String(item.text || "").includes("本境界") ? "本境界限购 1 枚。" : "突破后失效。";
    return `下次突破成功率 ${breakthroughBonusText(item.effect.bonus)}，可叠加，${suffix}`;
  }
  return item.text || "";
}

function marketItemIconSrc(item = {}) {
  return item.id ? `/assets/market/elixirs/${item.id}.png` : "/assets/market/elixir-category-sheet.png";
}

function priceFactorText(item) {
  const factor = Number(item.priceFactor || 1);
  const percent = Math.round((factor - 1) * 100);
  if (percent === 0) return "持平";
  return `${percent > 0 ? "+" : ""}${percent}%`;
}

function openImageEditor(event, target) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    error.value = "请选择图片文件。";
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    error.value = "图片过大，请选择 12MB 以内的图片。";
    return;
  }
  const image = new Image();
  const url = URL.createObjectURL(file);
  image.onload = () => {
    if (imageEditor.sourceUrl) URL.revokeObjectURL(imageEditor.sourceUrl);
    imageEditor.open = true;
    imageEditor.target = target;
    imageEditor.sourceUrl = url;
    imageEditor.image = image;
    imageEditor.zoom = 1;
    imageEditor.offsetX = 0;
    imageEditor.offsetY = 0;
    nextTick(drawCropPreview);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    error.value = "头像读取失败，请换一张图片试试。";
  };
  image.src = url;
}

function drawCropPreview() {
  const canvas = cropCanvas.value;
  const image = imageEditor.image;
  if (!canvas || !image) return;
  const size = cropOutputSize.value;
  if (canvas.width !== size) canvas.width = size;
  if (canvas.height !== size) canvas.height = size;
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#f7edd7";
  context.fillRect(0, 0, size, size);
  const baseScale = Math.max(size / image.width, size / image.height);
  const scale = baseScale * Math.max(1, Number(imageEditor.zoom) || 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const maxOffsetX = Math.max(0, (drawWidth - size) / 2);
  const maxOffsetY = Math.max(0, (drawHeight - size) / 2);
  const x = (size - drawWidth) / 2 + maxOffsetX * Number(imageEditor.offsetX || 0);
  const y = (size - drawHeight) / 2 + maxOffsetY * Number(imageEditor.offsetY || 0);
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function applyCroppedImage() {
  drawCropPreview();
  const canvas = cropCanvas.value;
  if (!canvas) return;
  const dataUrl = canvas.toDataURL("image/webp", cropOutputQuality.value);
  if (imageEditor.target === "sect") adminSectDraft.portraitUrl = dataUrl;
  else adminCultivatorDraft.portraitUrl = dataUrl;
  closeImageEditor();
}

function closeImageEditor() {
  imageEditor.open = false;
  imageEditor.target = "";
  imageEditor.image = null;
  if (imageEditor.sourceUrl) URL.revokeObjectURL(imageEditor.sourceUrl);
  imageEditor.sourceUrl = "";
}

async function saveActiveAdminDraftBeforeReset() {
  if (activeTab.value !== "admin") return;
  if (adminMode.value === "cultivators" && adminCultivatorPerson.value && adminCultivatorDraft.id) {
    await saveCultivatorProfile();
    return;
  }
  if (adminMode.value === "sects" && adminSectDraft.oldName) {
    await saveSectProfile();
  }
}

async function resetGame() {
  if (!confirm("确定重开一世？将删除当前主角、NPC、成长、突破、切磋、闯关、宗门战等全部历史记录，并重新生成。")) return;
  await saveActiveAdminDraftBeforeReset();
  const result = await act("/api/reset", {}, { scope: "lite", replace: true, markStale: true, deferFullRefresh: true });
  if (result === null) return;
  activeTab.value = "practice";
  activeRankBoard.value = "power";
  detailView.value = "rank";
  detailReturnStack.value = [];
  selectedPersonId.value = "player";
  selectedSectName.value = "";
  selectedRealmStage.value = derived.value.currentRealmInfo?.stage || "";
  selectedDuelDay.value = gameState.value.day;
  selectedProvinceWarDay.value = gameState.value.day;
  selectedProvinceWarId.value = "";
  clearBattleReplay();
  clearCachedState();
  saveCachedState(state.value);
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
    if (countdown.value === "00:00:00" && authUser.value) refresh();
  }, 1000);
  await initializeAuth();
  window.addEventListener("resize", resizeChinaMap);
  window.addEventListener("keydown", handleMapFullscreenKey);
  window.addEventListener("click", closeAccountMenu);
});

onUnmounted(() => {
  clearInterval(timer);
  clearInterval(battleTimer);
  window.removeEventListener("resize", resizeChinaMap);
  window.removeEventListener("keydown", handleMapFullscreenKey);
  window.removeEventListener("click", closeAccountMenu);
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

watch(activeTab, () => {
  if (needsHeavyState(activeTab.value) && state.value && fullStateStale.value) {
    ensureFullState();
  } else if (needsLiteState(activeTab.value) && state.value && fullStateStale.value) {
    refresh("lite");
  }
  if (activeTab.value === "rank" && detailView.value === "person") ensurePersonDetail(selectedPersonId.value);
  if (activeTab.value === "admin") {
    if (adminMode.value === "cultivators") ensurePersonDetail(adminCultivatorPerson.value?.id);
    if (adminMode.value === "cultivators") syncAdminCultivatorDraft(adminCultivatorPerson.value);
    if (adminMode.value === "sects") syncAdminSectDraft(adminSelectedSectName.value);
    if (adminMode.value === "tasks") syncAdminTaskDraft(adminTaskDefinition.value || filteredAdminTasks.value[0]);
  }
});

watch([adminCultivatorPerson, () => player.value.portraitUrl], () => {
  if (activeTab.value === "admin" && adminMode.value === "cultivators") {
    ensurePersonDetail(adminCultivatorPerson.value?.id);
    syncAdminCultivatorDraft(adminCultivatorPerson.value);
  }
});

watch([filteredAdminSects, adminSects], () => {
  if (activeTab.value === "admin" && adminMode.value === "sects") syncAdminSectDraft(adminSelectedSectName.value);
});

watch([adminSearch, adminMode], () => {
  if (activeTab.value !== "admin") return;
  if (adminMode.value === "cultivators") {
    ensurePersonDetail(adminCultivatorPerson.value?.id);
    syncAdminCultivatorDraft(adminCultivatorPerson.value);
  }
  else if (adminMode.value === "sects") syncAdminSectDraft(adminSelectedSectName.value);
  else syncAdminTaskDraft(adminTaskDefinition.value || filteredAdminTasks.value[0]);
});

watch([detailView, selectedPersonId], () => {
  if (detailView.value === "person") ensurePersonDetail(selectedPersonId.value);
});

watch([enabledTaskDefinitions, () => taskForm.category], () => {
  if (!enabledTaskDefinitions.value.length) {
    taskForm.category = "";
    taskForm.taskId = "";
    return;
  }
  const firstCategory = frontTaskCategories.value[0]?.id || "";
  const hasCategory = frontTaskCategories.value.some((category) => category.id === taskForm.category);
  if (!hasCategory && firstCategory) taskForm.category = firstCategory;
  const selected = filteredTaskDefinitions.value.find((task) => task.id === taskForm.taskId) || filteredTaskDefinitions.value[0];
  if (taskForm.taskId !== selected.id) taskForm.taskId = selected.id;
}, { immediate: true });

watch(() => taskForm.taskId, () => {
  const task = selectedTaskDefinition.value;
  if (!task) return;
  taskForm.completedAmount = task.type === "measurable" ? Number(task.targetAmount) || 1 : 1;
});

watch([filteredAdminTasks, taskDefinitions], () => {
  if (activeTab.value === "admin" && adminMode.value === "tasks" && adminSelectedTaskId.value && !adminTaskDefinition.value) {
    syncAdminTaskDraft(filteredAdminTasks.value[0] || null);
  }
});

watch([activeTab, activeSectSubTab, selectedProvinceWarDay], () => {
  if (activeTab.value !== "sect" || activeSectSubTab.value !== "wars") {
    selectedProvinceWarId.value = "";
    return;
  }
  if (selectedProvinceWarId.value && !selectedProvinceWar.value) selectedProvinceWarId.value = "";
});

watch([activeRankBoard, rankSearch, powerSortKey, powerSortDirection], () => {
  rankPage.value = 1;
  rankPageInput.value = "1";
});

watch(rankPageCount, () => {
  if (rankPage.value > rankPageCount.value) rankPage.value = rankPageCount.value;
  rankPageInput.value = String(rankPage.value);
});

watch(rankPage, () => {
  rankPageInput.value = String(rankPage.value);
});

watch(dungeonDays, () => {
  if (dungeonDayIndex.value > Math.max(0, dungeonDays.value.length - 1)) {
    dungeonDayIndex.value = Math.max(0, dungeonDays.value.length - 1);
  }
});

watch([activeDungeonRecordTab, dungeonDayIndex], () => {
  selectedVoidHallSect.value = "";
});
</script>
