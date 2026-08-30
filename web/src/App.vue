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
          <p>第 {{ state?.day ?? 0 }} 日 · {{ currentDate }} · {{ realmName(player.realm) }}</p>
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
              <div class="loot-ticker-content" :style="dailyTickerStyle">
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

    <div v-else-if="state" class="layout" :class="{ 'dossier-layout': activeTab === 'rank' && detailView === 'person' }">
      <aside class="sidebar">
        <section class="avatar hero-profile-card">
          <button class="profile-avatar-link" type="button" :aria-label="`查看${player.name}个人属性`" @click="openPlayerPersonDetail">
            <CharacterPortrait :person="playerPortraitPerson" size="xl" />
          </button>
          <div class="name-plaque">
            <span>{{ player.name }}</span>
          </div>
        </section>

        <section class="profile-scroll">
          <div class="profile-title-row">
            <strong>{{ player.name }}</strong>
          </div>

          <div class="profile-info-list">
            <button
              class="profile-info-item profile-nav-link profile-sect-link"
              type="button"
              :disabled="!playerSectName"
              :aria-label="playerSectName ? `查看${playerSectName}宗门属性` : '暂无宗门可查看'"
              @click="openPlayerSectDetail"
            >
              <Landmark :size="17" :stroke-width="2.4" aria-hidden="true" />
              <span>宗门</span>
              <strong>{{ player.sect || "散修" }}</strong>
            </button>
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
            <button class="profile-info-item profile-nav-link profile-root-link" :class="{ 'fortune-resonant': dailyRootFortune.playerMatched }" type="button" @click="openRootAttributes" :aria-label="dailyRootFortune.playerMatched ? `查看灵根页面，今日${dailyRootFortune.name}天运共鸣` : '查看灵根页面'">
              <component :is="rootIconComponent(player.primaryRootKey || player.root?.key)" :size="17" :stroke-width="2.4" aria-hidden="true" />
              <span>灵根</span>
              <strong>{{ profileRootText }}<small v-if="dailyRootFortune.playerMatched">天运共鸣</small></strong>
            </button>
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
            v-for="tab in visibleTabs"
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
              <p>段位排名：{{ playerDuelRankPosition || "未上榜" }}</p>
              <p>今日切磋：{{ todayDuelCount }} 场</p>
              <p>段位：<strong>{{ playerDuelRankText }}</strong></p>
              <div class="duel-mark" aria-hidden="true">⚔</div>
              <button class="primary game-cta" type="button" @click="switchTab('arena')">进入切磋</button>
            </article>

            <article class="panel game-card encounter-home" :class="{ 'has-encounter': activeEncounter }">
              <div class="section-head compact encounter-home-head">
                <div>
                  <h3><Handshake :size="19" aria-hidden="true" /> 因缘奇遇簿</h3>
                  <p>每 {{ encounterState.minGapDays || 2 }}-{{ encounterState.maxGapDays || 4 }} 天一场因缘 · {{ encounterState.definitionCount || 240 }} 个事件节点</p>
                </div>
                <div class="encounter-home-metrics">
                  <span><small>待决</small><b>{{ pendingEncounters.length }}</b></span>
                  <span><small>下次因缘</small><b>{{ encounterState.daysUntilNext || 0 }} 天</b></span>
                  <span><small>进行中</small><b>{{ encounterState.activeChains?.length || 0 }} 条</b></span>
                  <span><small>已发现</small><b>{{ encounterCollection.discovered || 0 }} / {{ encounterCollection.total || 240 }}</b></span>
                </div>
              </div>

              <template v-if="activeEncounter">
                <div v-if="pendingEncounters.length > 1" class="encounter-queue" role="tablist" aria-label="待处理因缘">
                  <button
                    v-for="event in pendingEncounters"
                    :key="event.id"
                    type="button"
                    :class="{ active: activeEncounter.id === event.id }"
                    @click="selectEncounter(event.id)"
                  >
                    <span>{{ encounterRarityLabel(event.rarity) }}</span>{{ event.title }}
                  </button>
                </div>
                <div class="encounter-home-body">
                  <div class="encounter-actor-column">
                    <CharacterPortrait :person="activeEncounter.actor" size="lg" />
                    <strong>{{ activeEncounter.actor?.name }}</strong>
                    <span>{{ activeEncounter.actor?.sect }}</span>
                    <em>{{ activeEncounter.categoryLabel }}</em>
                  </div>
                  <div class="encounter-story-column">
                    <div class="encounter-title-line">
                      <span class="encounter-rarity" :class="`rarity-${activeEncounter.rarity}`">{{ encounterRarityLabel(activeEncounter.rarity) }}</span>
                      <h4>{{ activeEncounter.title }}</h4>
                      <small v-if="activeEncounter.chainId">{{ activeEncounter.chainTitle }} · {{ activeEncounter.chainStep }}/{{ activeEncounter.chainLength }}</small>
                    </div>
                    <p>{{ activeEncounter.text }}</p>
                    <div class="encounter-choice-list">
                      <button
                        v-for="choice in activeEncounter.choices"
                        :key="choice.id"
                        type="button"
                        :class="['encounter-choice', `tone-${choice.tone}`]"
                        :disabled="!choice.canChoose || isActionPending('/api/encounters/choose')"
                        :title="choice.canChoose ? choice.hint : choice.reason"
                        @click="chooseEncounter(choice)"
                      >
                        <span>{{ choice.label }}</span>
                        <small>{{ choice.canChoose ? encounterChoiceHint(choice) : choice.reason }}</small>
                      </button>
                    </div>
                    <small class="encounter-expiry">第 {{ activeEncounter.expiresDay }} 天结束前可处理，逾期平淡归档且不受处罚。</small>
                  </div>
                  <div class="encounter-recent-column">
                    <strong>近日因缘</strong>
                    <button
                      v-for="record in encounterHistory.slice(0, 3)"
                      :key="`${record.id}-${record.resolvedDay}`"
                      type="button"
                      :disabled="!record.replayId"
                      @click="openEncounterReplay(record)"
                    >
                      <span>{{ record.title }}</span>
                      <small>{{ record.choiceLabel }} · {{ record.actor?.name }}</small>
                      <Play v-if="record.replayId" :size="13" aria-label="查看切磋回放" />
                    </button>
                    <span v-if="!encounterHistory.length" class="encounter-empty-copy">札记尚无旧缘。</span>
                  </div>
                </div>
              </template>
              <div v-else class="encounter-quiet-state">
                <span class="encounter-quiet-mark"><Compass :size="28" aria-hidden="true" /></span>
                <div>
                  <strong>今日天机平静</strong>
                  <p>因缘不会天天出现，下一场将在 {{ encounterState.daysUntilNext || 0 }} 天后开启。每个选择都会改变修行、资源或人物关系。</p>
                </div>
                <div v-if="encounterHistory.length" class="encounter-last-note">
                  <small>最近一笔</small>
                  <b>{{ encounterHistory[0].title }}</b>
                  <span>{{ encounterHistory[0].outcome }}</span>
                </div>
              </div>
              <div class="encounter-longterm-strip">
                <span><small>当前时序</small><b>{{ encounterSeasonLabel }}</b></span>
                <span><small>因缘记忆</small><b>{{ encounterState.memoryCount || 0 }} 条</b></span>
                <span><small>完成事件链</small><b>{{ encounterCollection.completedChains || 0 }} 条</b></span>
                <span><small>待兑现承诺</small><b>{{ encounterState.promises?.length || 0 }} 项</b></span>
              </div>
              <div v-if="encounterState.promises?.length" class="encounter-promise-list">
                <span v-for="promise in encounterState.promises.slice(0, 4)" :key="promise.id">
                  <b>{{ promise.title }}</b><small>第 {{ promise.dueDay }} 天回响</small>
                </span>
              </div>
            </article>

            <article class="panel game-card equipment-home">
              <div class="section-head compact">
                <h3>装备</h3>
                <button class="link-button" type="button" @click="switchTab('equipment')">查看全部 ›</button>
              </div>
              <div class="equipment-showcase">
                <div class="gear-slot" v-for="item in showcaseEquipment" :key="item.id" :class="`tier-${item.tier}`" :title="`${item.name} · ${item.statName} +${formatEquipmentPercent(item.bonus)}`" :data-tooltip="`${item.name} · ${item.statName} +${formatEquipmentPercent(item.bonus)}`" :aria-label="`${item.name}，${item.statName} +${formatEquipmentPercent(item.bonus)}`">
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
                  <b>{{ item.name }}<small v-if="isNpcFortuneResonant(rankPerson(item))" class="npc-fortune-badge">天运共鸣</small></b>
                  <em>{{ realmName(rankPerson(item)?.realm) }}</em>
                  <strong>{{ formatCompact(item.value) }}</strong>
                </button>
              </div>
            </article>

            <article class="panel game-card log-home">
              <div class="section-head compact">
                <h3>战斗日志</h3>
                <label class="log-day-select" v-if="homeLogDayRecords.length">
                  <span>游戏日期</span>
                  <input
                    v-model="selectedHomeLogDate"
                    type="date"
                    :min="homeLogMinDate"
                    :max="homeLogMaxDate"
                    step="1"
                    aria-label="选择游戏日志日期"
                  />
                </label>
              </div>
              <div class="battle-log-list" v-if="homeLogs.length">
                <div v-for="(entry, index) in homeLogs" :key="`${entry.day}-${entry.time || ''}-${entry.text}-${index}`" :class="[logTone(entry), `log-category-${logCategory(entry).id}`]">
                  <b :title="logCategory(entry).label">{{ logCategory(entry).mark }}</b>
                  <span
                    class="home-log-text"
                    :class="{ 'is-long': isLongHomeLogText(entry.text) }"
                    :title="homeLogTooltip(entry)"
                  >{{ entry.text }}</span>
                  <time :datetime="logEntryDateTime(entry)">{{ logEntryTimeText(entry) }}</time>
                </div>
              </div>
              <div class="battle-log-empty" v-else>
                <b>第 {{ selectedHomeLogDayRecord?.day || gameState.day }} 天</b>
                <span>本日暂无战斗日志</span>
              </div>
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

            <section class="daily-root-fortune-card" :class="[`fortune-${dailyRootFortune.rootKey || 'metal'}`, { resonant: dailyRootFortune.playerMatched }]">
              <span class="daily-root-fortune-icon" aria-hidden="true"><img :src="rootIconPath(dailyRootFortune.rootKey)" alt=""></span>
              <div>
                <span class="daily-root-fortune-kicker"><Sparkles :size="15" aria-hidden="true" /> 今日幸运灵根</span>
                <h4>{{ dailyRootFortune.name }}</h4>
                <p>{{ dailyRootFortune.effectText }}</p>
              </div>
              <aside>
                <strong>{{ dailyRootFortune.playerMatched ? "天运共鸣" : "今日未共鸣" }}</strong>
                <span>{{ dailyRootFortune.playerEffectText }}</span>
                <small>今日共有 {{ dailyRootFortune.resonantCount || 0 }} 名修士受益</small>
              </aside>
              <div class="daily-root-fortune-history" aria-label="最近六日幸运灵根">
                <span v-for="entry in dailyRootFortune.recent || []" :key="`fortune-${entry.day}`" :class="{ current: entry.day === gameState.day }">
                  <img :src="rootIconPath(entry.rootKey)" alt="">
                  <small>第 {{ entry.day }} 天</small>
                  <b>{{ entry.name }}</b>
                </span>
              </div>
            </section>

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
                    { highlighted: node.highlighted, special: node.special, owned: node.owned, primary: node.primary, fortunate: node.fortunate },
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
                  <div v-if="hoveredRootDetail.fortuneText" class="root-fortune-detail-row">
                    <span>今日天运</span>
                    <strong>{{ hoveredRootDetail.fortuneText }}</strong>
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
                <span>{{ realmBaseBreakChanceText(realm) }}</span>
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
                <strong>{{ selectedTaskDayMeta?.text || `第 ${gameState.day} 天` }}</strong>
                <span>{{ selectedTaskDayMeta?.label || "今日" }} · {{ formatDateLabel(selectedTaskDate) }}</span>
                <label class="task-calendar-field">
                  <span>补记日期</span>
                  <input v-model="selectedTaskDate" type="date" :min="taskDateMin" :max="taskDateMax" aria-label="选择现实任务补记日期">
                </label>
                <button v-if="authUser?.isAdmin" class="icon-button task-admin-button" type="button" title="管理现实任务" aria-label="管理现实任务" @click="openTaskAdmin">
                  <Settings :size="17" :stroke-width="2.4" aria-hidden="true" />
                </button>
              </div>
            </header>

            <section class="task-cultivation-plan" aria-label="今日修行计划">
              <div class="task-cultivation-plan-head">
                <div>
                  <h4>今日修行计划</h4>
                  <span>还差 {{ todayPlan.remainingXp || remainingXp }} 修为</span>
                </div>
                <small>{{ featuredDungeonForecast }}</small>
              </div>
              <div class="plan-home-grid">
                <div><span>有效任务修为</span><strong>{{ todayPlan.effectiveTaskXp || 0 }} / {{ todayPlan.fullTaskXpBudget || 500 }}</strong></div>
                <div><span>追赶助益</span><strong>x{{ Number(todayPlan.catchup?.multiplier || 1).toFixed(2) }}</strong></div>
                <div><span>推荐行动</span><strong>{{ todayPlan.suggestedTask?.name || "今日任务已完成" }}</strong></div>
              </div>
            </section>

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
                      <span>{{ selectedTaskProgressText }}</span>
                    </div>

                    <div v-if="selectedTaskDefinition.type === 'measurable'" class="task-amount-panel">
                      <div class="task-amount-head">
                        <span>任务量</span>
                      </div>
                      <div class="task-amount-controls">
                        <div class="task-range-stack">
                          <input
                            v-model.number="taskForm.completedAmount"
                            type="range"
                            min="0"
                            :max="taskAmountMax"
                            :step="taskAmountStep"
                            :style="{ '--task-range-progress': `${taskAmountProgress}%` }"
                            aria-label="完成量"
                          >
                          <div class="task-range-marks" aria-hidden="true">
                            <span
                              v-for="mark in taskAmountMarks"
                              :key="mark.value"
                              :class="{ start: mark.percent === 0, end: mark.percent === 100 }"
                              :style="{ left: `${mark.percent}%` }"
                            >{{ mark.label }}</span>
                          </div>
                        </div>
                        <input class="task-amount-input" v-model.number="taskForm.completedAmount" type="number" min="0" :max="taskAmountMax" :step="taskAmountStep" :placeholder="`标准 ${selectedTaskDefinition.targetAmount}`" aria-label="手动完成量">
                        <em class="task-amount-unit">{{ selectedTaskDefinition.unitName }}</em>
                      </div>
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
                      <div
                        class="task-reward-token elixir task-reward-has-tip"
                        :class="{ muted: taskRewardPreview.xpMultiplier <= 1 }"
                        tabindex="0"
                        :aria-label="`加成：${formatTaskBonusPercent(taskRewardPreview.xpMultiplier)}。${taskRewardFormulaText}`"
                      >
                        <img src="/assets/tasks/icon-elixir.svg" alt="" aria-hidden="true">
                        <span>加成</span>
                        <strong>{{ formatTaskBonusPercent(taskRewardPreview.xpMultiplier) }}</strong>
                        <small class="task-reward-tip" role="tooltip">{{ taskRewardFormulaText }}</small>
                      </div>
                    </div>

                    <div class="task-detail-footer">
                      <button class="primary task-complete-button" :disabled="isActionPending('/api/tasks') || !taskCanSettle">
                        {{ isActionPending("/api/tasks") ? "结算中..." : "结算" }}
                      </button>
                    </div>
                  </form>
                </div>

                <div v-else class="task-empty-state">
                  <ScrollText :size="28" :stroke-width="2.2" aria-hidden="true" />
                  <strong>暂无可用现实任务</strong>
                  <span>可到后台添加任务定义，历史完成记录会继续保留。</span>
                  <button v-if="authUser?.isAdmin" class="secondary" type="button" @click="openTaskAdmin">去后台配置</button>
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
                      <span
                        class="task-day-totals"
                        :aria-label="`当日经验 ${day.xp}，当日灵石 ${day.spirit}`"
                      >
                        <span class="task-day-total xp">
                          <Sprout :size="15" :stroke-width="2.4" aria-hidden="true" />
                          <span>经验 <strong>+{{ day.xp }}</strong></span>
                        </span>
                        <span class="task-day-total spirit">
                          <Gem :size="15" :stroke-width="2.4" aria-hidden="true" />
                          <span>灵石 <strong>+{{ day.spirit }}</strong></span>
                        </span>
                      </span>
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
                            <span
                              class="task-reward xp task-reward-has-tip"
                              tabindex="0"
                              :aria-label="`经验 ${task.xp}。${taskCompletionFormulaText(task)}`"
                            >
                              +经验 {{ task.xp }}
                              <small class="task-reward-tip" role="tooltip">{{ taskCompletionFormulaText(task) }}</small>
                            </span>
                            <span class="task-reward spirit">+灵石 {{ task.spirit || 0 }}</span>
                          </span>
                          <button
                            v-if="day.isToday"
                            class="task-record-revert"
                            type="button"
                            :disabled="isActionPending('/api/tasks/delete')"
                            @click="deleteTaskCompletion(task)"
                          >
                            {{ isActionPending("/api/tasks/delete") ? "撤回中..." : "撤回并扣除收益" }}
                          </button>
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

        <section v-if="activeTab === 'dungeon' || (activeTab === 'trial' && lastBattle)" class="view active">
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
              <p class="battle-retention-note">完整副本战报保留最近 10 天；更早记录每 10 天归档为摘要并清理详情<span v-if="latestBattleArchive">，已归档 {{ battleArchives.length }} 个周期</span>。</p>
            </div>
          </div>

          <div class="subtabs">
            <button
              v-for="tab in dungeonRecordTabs"
              :key="tab.id"
              type="button"
              class="segment"
              :class="{ active: activeDungeonRecordTab === tab.id }"
              @click="switchDungeonRecordTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          </div>
          <div class="dungeon-loot-toggle">
            <button class="secondary" type="button" @click="showDungeonLoot = !showDungeonLoot">
              {{ showDungeonLoot ? "收起装备池" : "展开装备池" }}
            </button>
            <button class="secondary" type="button" @click="showDungeonBestiary = !showDungeonBestiary">
              {{ showDungeonBestiary ? "收起妖物图鉴" : "展开妖物图鉴" }}
            </button>
          </div>

          <section v-if="showDungeonBestiary" class="panel dungeon-bestiary-panel" aria-label="副本妖物图鉴">
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
                  <span>{{ realmStageName(stage.stage) }}</span>
                </div>
                <div class="bestiary-monster-list">
                  <span class="bestiary-monster" v-for="monster in stage.monsters" :key="monster.name">
                    <MonsterEmblem :monster="monster" size="sm" />
                    <span>
                      <b>{{ monster.name }}</b>
                      <small :class="`monster-role-${monster.archetype}`" :title="monster.archetypeText">{{ monster.archetypeLabel }}</small>
                    </span>
                  </span>
                </div>
              </article>
            </div>
          </section>

          <div v-if="selectedDungeonDay && activeDungeonRecordTab === 'blood'" class="panel dungeon-record-panel">
            <div class="section-head compact">
              <div>
                <h3>血色禁地</h3>
              </div>
              <span class="tag">{{ bloodTrialClearCount }} 人次通关</span>
            </div>
            <div class="dungeon-day-nav dungeon-record-day-nav">
              <button class="secondary" type="button" :disabled="!canShowPreviousDungeonDay" @click="showPreviousDungeonDay">前一日</button>
              <label class="dungeon-date-select">
                <span>查看日期</span>
                <input v-model="selectedDungeonCalendarDate" type="date" :min="dungeonDateMin" :max="dungeonDateMax" aria-label="选择血色禁地记录日期">
              </label>
              <button class="secondary" type="button" :disabled="!canShowNextDungeonDay" @click="showNextDungeonDay">后一日</button>
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
                      <div class="monster-identity-heading">
                        <h4 :title="cave.monster?.name || ''">{{ monsterShortName(cave.monster?.name) }}</h4>
                        <small class="monster-role-badge" :class="`monster-role-${cave.monster?.archetype || monsterArchetypeOf(cave.monster).id}`" :title="cave.monster?.archetypeText || monsterArchetypeOf(cave.monster).text">
                          {{ cave.monster?.archetypeLabel || monsterArchetypeOf(cave.monster).label }}
                        </small>
                      </div>
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
                      <small>{{ item.slotName }} · {{ item.statName }} +{{ formatEquipmentPercent(item.bonus) }}</small>
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
              <span class="tag void-hall-success-tag">{{ voidHallSuccessCount }} 宗通关</span>
            </div>
            <div class="dungeon-day-nav dungeon-record-day-nav">
              <button class="secondary" type="button" :disabled="!canShowPreviousDungeonDay" @click="showPreviousDungeonDay">前一日</button>
              <label class="dungeon-date-select">
                <span>查看日期</span>
                <input v-model="selectedDungeonCalendarDate" type="date" :min="dungeonDateMin" :max="dungeonDateMax" aria-label="选择虚天殿记录日期">
              </label>
              <button class="secondary" type="button" :disabled="!canShowNextDungeonDay" @click="showNextDungeonDay">后一日</button>
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
                      <small>{{ item.tierName }} · {{ item.statName }} +{{ formatEquipmentPercent(item.bonus) }}</small>
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
                        <small>{{ realmName(lastBattle.left.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.left)} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                        <small>{{ realmName(lastBattle.right.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.right)} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                    <p>{{ monsterShortName(record.monster) }} · {{ record.monsterRealm }}</p>
                  </div>
                  <span class="tag">{{ record.success ? `宗门灵石 +${voidHallSectSpirit(record)}` : "未通关无灵石" }}</span>
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
                <em>每期必出 1 件 · 低品质权重更高</em>
              </div>
              <div class="loot-pool-summary">
                <span v-if="showDungeonLoot">{{ dungeonLootPool('star_sea').acquiredCount || 0 }} 已获取</span>
                <span v-if="showDungeonLoot">{{ dungeonLootPool('star_sea').remainingCount || 0 }} 未获取</span>
              </div>
              <div v-if="showDungeonLoot" class="loot-pool-items">
                <span v-for="item in starSeaLootItems" :key="item.id" class="loot-pool-item" :class="[{ acquired: item.ownerId }, `tier-${item.tier}`]">
                  <EquipmentIcon :id="item.id" :name="item.name" :slot="item.slot" :tier="item.tier" />
                  <span>
                    <b>{{ item.name }} <em>{{ item.tierName }}</em></b>
                    <small>{{ item.statName }} +{{ formatEquipmentPercent(item.bonus) }} · {{ item.value || 200 }} 灵石</small>
                  </span>
                </span>
              </div>
            </section>
            <div class="grid dungeon-sea-grid">
              <div class="panel flat sea-cycle-history" v-if="starSeaCycleOptionList.length">
                <div class="section-head compact">
                  <div>
                    <h3>近十期总评分榜</h3>
                    <p>按十日周期汇总队伍总评分，可切换查看最近 10 期。</p>
                  </div>
                  <span class="tag">当前查看：第 {{ activeStarSeaCycle?.cycle || selectedDungeonDay?.public?.cycle || "-" }} 期</span>
                </div>
                <div class="star-sea-cycle-tabs" v-if="starSeaCycleOptionList.length > 1">
                  <button
                    v-for="cycle in starSeaCycleOptionList"
                    :key="`cycle-tab-${cycle.cycle}`"
                    type="button"
                    :class="{ active: Number(activeStarSeaCycle?.cycle) === Number(cycle.cycle), empty: !cycle.hasData }"
                    @click="selectedStarSeaCycle = cycle.cycle"
                  >
                    第 {{ cycle.cycle }} 期<span v-if="!cycle.hasData">暂无</span>
                  </button>
                </div>
                <article class="star-sea-cycle-board" v-if="activeStarSeaCycle">
                  <div class="star-sea-cycle-board-modes">
                    <span class="star-sea-cycle-mode-buttons" role="tablist" aria-label="周期排行榜类型">
                      <button type="button" :class="{ active: activeStarSeaCycleBoard === 'teams' }" @click="activeStarSeaCycleBoard = 'teams'">队伍总评分</button>
                      <button type="button" :class="{ active: activeStarSeaCycleBoard === 'members' }" @click="activeStarSeaCycleBoard = 'members'">个人总输出</button>
                    </span>
                    <label v-if="activeStarSeaCycleBoard === 'members'" class="star-sea-cycle-search">
                      <span class="search-field">
                        <Search :size="15" aria-hidden="true" />
                        <input v-model.trim="starSeaCycleMemberSearch" type="search" placeholder="搜索姓名或宗门" aria-label="搜索周期个人总输出榜姓名或宗门">
                        <button v-if="starSeaCycleMemberSearch" class="search-clear" type="button" aria-label="清空周期个人总输出榜搜索" @click="starSeaCycleMemberSearch = ''"><X :size="14" aria-hidden="true" /></button>
                      </span>
                    </label>
                  </div>
                  <div class="star-sea-cycle-board-head">
                    <div>
                      <strong>第 {{ activeStarSeaCycle.cycle }} 期{{ activeStarSeaCycleBoard === "teams" ? "总评分榜" : "个人输出榜" }}</strong>
                      <span>第 {{ activeStarSeaCycle.cycleStartDay }}-{{ activeStarSeaCycle.cycleEndDay }} 日 · {{ activeStarSeaCycle.settled ? "已结算" : "进行中" }} · 已计 {{ activeStarSeaCycle.dayCount || 0 }}/10 日 · {{ activeStarSeaCycleBoard === "teams" ? "按队伍总评分" : "按个人累计输出" }}</span>
                    </div>
                    <em v-if="starSeaCycleRewardText(activeStarSeaCycle)">{{ starSeaCycleRewardText(activeStarSeaCycle) }}</em>
                  </div>
                  <div v-if="activeStarSeaCycleBoard === 'teams'" class="star-sea-cycle-board-list" v-show="pagedStarSeaCycleTeams.length">
                    <div
                      class="star-sea-cycle-team-row"
                      :class="{ 'rank-first': Number(team.rank) === 1 }"
                      v-for="team in pagedStarSeaCycleTeams"
                      :key="`${activeStarSeaCycle.cycle}-${team.id || team.name}`"
                    >
                      <span class="cycle-rank-wrap">
                        <span class="cycle-rank">{{ team.rank }}</span>
                        <span
                          class="cycle-rank-shift"
                          :class="starSeaCycleTeamRankChange(team).direction"
                          :title="starSeaCycleTeamRankChange(team).title"
                        >{{ starSeaCycleTeamRankChange(team).text }}</span>
                      </span>
                      <span class="cycle-team-identity">
                        <CharacterPortrait :person="starSeaTeamLeader(team)" size="sm" />
                        <span class="cycle-team-copy">
                          <span class="cycle-team-name">{{ team.name }}</span>
                          <small>队长 · {{ starSeaTeamLeader(team)?.name || starSeaTeamLeaderName(team) }}</small>
                        </span>
                      </span>
                      <span class="cycle-score-bar" aria-hidden="true">
                        <i :style="{ width: `${starSeaCycleScorePercent(team, activeStarSeaCycle)}%` }"></i>
                      </span>
                      <strong>{{ team.totalScore }}</strong>
                    </div>
                  </div>
                  <div v-else class="star-sea-cycle-board-list" v-show="pagedStarSeaCycleMembers.length">
                    <div
                      class="star-sea-cycle-member-row"
                      :class="{ 'rank-first': member.rank === 1 }"
                      v-for="(member, index) in pagedStarSeaCycleMembers"
                      :key="`${activeStarSeaCycle.cycle}-${member.id}-${member.teamName || ''}`"
                    >
                      <span class="cycle-rank">{{ member.rank }}</span>
                      <CharacterPortrait :person="personByRef(member)" size="sm" />
                      <span class="cycle-member-copy">
                        <strong>{{ member.name }}</strong>
                        <small>{{ member.teamName || "猎妖小队" }} · {{ member.sect || "散修" }}</small>
                      </span>
                      <span class="cycle-score-bar personal" aria-hidden="true">
                        <i :style="{ width: `${starSeaCycleMemberDamagePercent(member)}%` }"></i>
                      </span>
                      <strong>{{ member.damage }}</strong>
                    </div>
                  </div>
                  <div v-if="activeStarSeaCycleBoard === 'teams' && starSeaCycleTeamRankPageCount > 1" class="star-sea-rank-pager" aria-label="周期队伍总评分榜分页">
                    <button class="secondary" type="button" :disabled="safeStarSeaCycleTeamRankPage <= 1" @click="starSeaCycleTeamRankPage--">上一页</button>
                    <span>第 {{ safeStarSeaCycleTeamRankPage }} / {{ starSeaCycleTeamRankPageCount }} 页</span>
                    <button class="secondary" type="button" :disabled="safeStarSeaCycleTeamRankPage >= starSeaCycleTeamRankPageCount" @click="starSeaCycleTeamRankPage++">下一页</button>
                  </div>
                  <div v-else-if="activeStarSeaCycleBoard === 'members' && starSeaCycleMemberRankPageCount > 1" class="star-sea-rank-pager" aria-label="周期个人总输出榜分页">
                    <button class="secondary" type="button" :disabled="safeStarSeaCycleMemberRankPage <= 1" @click="starSeaCycleMemberRankPage--">上一页</button>
                    <span>第 {{ safeStarSeaCycleMemberRankPage }} / {{ starSeaCycleMemberRankPageCount }} 页</span>
                    <button class="secondary" type="button" :disabled="safeStarSeaCycleMemberRankPage >= starSeaCycleMemberRankPageCount" @click="starSeaCycleMemberRankPage++">下一页</button>
                  </div>
                  <div v-if="activeStarSeaCycleBoard === 'teams' ? !pagedStarSeaCycleTeams.length : !pagedStarSeaCycleMembers.length" class="star-sea-cycle-empty">
                    <template v-if="activeStarSeaCycleBoard === 'members' && starSeaCycleMemberSearch">
                      <b>没有匹配“{{ starSeaCycleMemberSearch }}”的修士或宗门</b>
                      <span>可尝试输入完整姓名或宗门名。</span>
                    </template>
                    <template v-else>
                      <b>暂无第 {{ activeStarSeaCycle.cycle }} 期{{ activeStarSeaCycleBoard === "teams" ? "总评分" : "个人输出" }}记录</b>
                      <span>该期没有可汇总的乱星海战报。</span>
                    </template>
                  </div>
                </article>
              </div>
              <div class="panel flat star-sea-overview-panel">
                <h3>猎妖概览</h3>
                <div class="star-sea-overview-line">
                  <div class="star-sea-overview-controls">
                    <div class="dungeon-day-nav">
                      <button class="secondary" type="button" :disabled="!canShowPreviousDungeonDay" @click="showPreviousDungeonDay">前一日</button>
                      <label class="dungeon-date-select">
                        <span>查看日期</span>
                        <input v-model="selectedDungeonCalendarDate" type="date" :min="dungeonDateMin" :max="dungeonDateMax" aria-label="选择乱星海记录日期">
                      </label>
                      <button class="secondary" type="button" :disabled="!canShowNextDungeonDay" @click="showNextDungeonDay">后一日</button>
                    </div>
                    <div class="star-sea-daily-pool">
                      <span v-for="line in starSeaSpiritLines" :key="line">{{ line }}</span>
                    </div>
                  </div>
                  <div class="monster-strip compact-monster-strip" v-if="selectedDungeonDay.public?.monsters?.length">
                    <div class="monster-chip with-emblem star-sea-monster-summary" v-for="monster in selectedDungeonDay.public.monsters" :key="monster.id || monster.name">
                      <MonsterEmblem :monster="monster" size="sm" />
                      <span class="star-sea-monster-body">
                        <span class="star-sea-monster-title">
                          <strong>{{ monster.name }}</strong>
                          <em>{{ monster.realm }}</em>
                        </span>
                        <span class="star-sea-monster-root">{{ monster.rootName }}</span>
                        <span class="star-sea-monster-stats-mini">
                          <small><span>血</span><b>{{ monster.maxHp }}</b></small>
                          <small><span>攻</span><b>{{ monster.attack }}</b></small>
                          <small><span>防</span><b>{{ monster.defense }}</b></small>
                          <small><span>神</span><b>{{ monster.divineSense }}</b></small>
                        </span>
                      </span>
                    </div>
                  </div>
                  <div class="star-sea-summary-chip star-sea-metric-card cycle" v-if="selectedDungeonDay.public?.cycle">
                    <span class="star-sea-card-icon"><CalendarDays :size="20" aria-hidden="true" /></span>
                    <span class="star-sea-card-copy">
                      <span>队伍周期</span>
                      <b>第 {{ selectedDungeonDay.public.cycle }} 期</b>
                      <small>第 {{ selectedDungeonDay.public.cycleStartDay }} 日至第 {{ selectedDungeonDay.public.cycleEndDay }} 日 · {{ selectedDungeonDay.public.teamSize || 10 }} 人一队</small>
                    </span>
                  </div>
                  <div class="star-sea-summary-chip star-sea-metric-card contribution">
                    <span class="star-sea-card-icon"><Zap :size="20" aria-hidden="true" /></span>
                    <span class="star-sea-card-copy">
                      <span>总贡献</span>
                      <b>{{ selectedDungeonDay.public?.totalDamage || 0 }}</b>
                      <small>{{ selectedDungeonDay.public?.teams?.length || 0 }} 支队伍合计</small>
                    </span>
                  </div>
                  <div class="star-sea-summary-chip star-sea-equipment-chip" :class="{ empty: !starSeaTodayEquipmentItem }">
                    <EquipmentIcon
                      v-if="starSeaTodayEquipmentItem"
                      :id="starSeaTodayEquipmentItem.id"
                      :name="starSeaTodayEquipmentItem.name"
                      :slot="starSeaTodayEquipmentItem.slot"
                      :tier="starSeaTodayEquipmentItem.tier"
                    />
                    <span v-else class="star-sea-equipment-empty">装</span>
                    <span>
                      <span>期末奖励</span>
                      <b>{{ starSeaTodayEquipmentName }}</b>
                      <small>{{ starSeaTodayEquipmentText }}</small>
                    </span>
                  </div>
                  <div class="star-sea-summary-chip star-sea-metric-card auction" v-if="selectedStarSeaCycleReward">
                    <span class="star-sea-card-icon"><Coins :size="20" aria-hidden="true" /></span>
                    <span class="star-sea-card-copy">
                      <span>竞拍结果</span>
                      <b>{{ selectedStarSeaCycleReward.winnerName || "全员平分" }}</b>
                      <small>{{ starSeaAuctionText }}</small>
                    </span>
                  </div>
                </div>
              </div>
              <div class="panel flat sea-team-rank">
                <div class="star-sea-rank-head">
                  <span class="star-sea-rank-icon team"><Trophy :size="18" aria-hidden="true" /></span>
                  <span><h3>队伍排名</h3><small>按当日猎妖评分排序</small></span>
                </div>
                <div class="star-sea-rank-list">
                  <button class="star-sea-rank-row team" :class="{ 'rank-first': Number(team.rank) === 1, 'player-team': starSeaTeamHasPlayer(team) }" type="button" v-for="team in pagedStarSeaTeamRanking" :key="team.id || team.name" :disabled="!hasReplay(team)" @click="openStarSeaTeamReplay(team)">
                    <span class="star-sea-rank-number">{{ team.rank }}</span>
                    <CharacterPortrait :person="starSeaTeamLeader(team)" size="sm" />
                    <span class="star-sea-rank-copy">
                      <strong>{{ team.name }}</strong>
                      <small>队长 · {{ starSeaTeamLeader(team)?.name || starSeaTeamLeaderName(team) }}</small>
                    </span>
                    <span class="star-sea-rank-result" :class="team.success ? 'success' : 'failed'">
                      {{ team.success ? `${team.rounds} 回合击杀` : "未击杀" }}
                    </span>
                    <span class="star-sea-rank-stat"><small>评分</small><b>{{ team.score }}</b></span>
                    <span class="star-sea-rank-stat"><small>输出</small><b>{{ team.damage }}</b></span>
                    <span class="star-sea-rank-reward"><Gem :size="14" aria-hidden="true" /> +{{ team.spirit }}</span>
                  </button>
                </div>
                <div v-if="starSeaTeamRankPageCount > 1" class="star-sea-rank-pager" aria-label="队伍排名分页">
                  <button class="secondary" type="button" :disabled="safeStarSeaTeamRankPage <= 1" @click="starSeaTeamRankPage--">上一页</button>
                  <span>第 {{ safeStarSeaTeamRankPage }} / {{ starSeaTeamRankPageCount }} 页</span>
                  <button class="secondary" type="button" :disabled="safeStarSeaTeamRankPage >= starSeaTeamRankPageCount" @click="starSeaTeamRankPage++">下一页</button>
                </div>
              </div>
              <div class="panel flat sea-personal-rank">
                <div class="star-sea-rank-head">
                  <span class="star-sea-rank-icon personal"><Zap :size="18" aria-hidden="true" /></span>
                  <span><h3>个人输出</h3><small>当日修士伤害贡献</small></span>
                </div>
                <div class="star-sea-rank-list">
                  <button class="star-sea-rank-row personal" :class="{ 'rank-first': starSeaPersonalRankStart + index === 0 }" type="button" v-for="(entry, index) in pagedStarSeaPersonalRanking" :key="`${entry.id}-${entry.teamRank || entry.teamName || ''}`" :disabled="!hasStarSeaMemberReplay(entry)" @click="openStarSeaMemberReplay(entry)">
                    <span class="star-sea-rank-number">{{ starSeaPersonalRankStart + index + 1 }}</span>
                    <CharacterPortrait :person="personByRef(entry)" size="sm" />
                    <span class="star-sea-rank-copy">
                      <strong>{{ entry.name }}</strong>
                      <small>{{ entry.teamName || entry.sect }}</small>
                    </span>
                    <span class="star-sea-output-value"><small>输出</small><b>{{ entry.damage }}</b></span>
                    <span class="star-sea-rank-reward"><Gem :size="14" aria-hidden="true" /> +{{ entry.spirit }}</span>
                  </button>
                </div>
                <div v-if="starSeaPersonalRankPageCount > 1" class="star-sea-rank-pager" aria-label="个人输出分页">
                  <button class="secondary" type="button" :disabled="safeStarSeaPersonalRankPage <= 1" @click="starSeaPersonalRankPage--">上一页</button>
                  <span>第 {{ safeStarSeaPersonalRankPage }} / {{ starSeaPersonalRankPageCount }} 页</span>
                  <button class="secondary" type="button" :disabled="safeStarSeaPersonalRankPage >= starSeaPersonalRankPageCount" @click="starSeaPersonalRankPage++">下一页</button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="panel empty">
            暂无副本战报。
          </div>
          </template>

        </section>

        <section v-if="activeTab === 'trial' && !lastBattle" :class="['view', 'active', { 'dao-trial-running-view': activeDaoTrialRun }]">
          <div class="subtabs dao-trial-subtabs" role="tablist" aria-label="秘境子导航">
            <button type="button" role="tab" :aria-selected="daoTrialSubTab === 'play'" :class="{ active: daoTrialSubTab === 'play' }" @click="daoTrialSubTab = 'play'"><Compass :size="15" aria-hidden="true" /> 问道</button>
            <button type="button" role="tab" :aria-selected="daoTrialSubTab === 'archive'" :class="{ active: daoTrialSubTab === 'archive' }" @click="daoTrialSubTab = 'archive'"><BookOpen :size="15" aria-hidden="true" /> 档案</button>
            <button type="button" role="tab" :aria-selected="daoTrialSubTab === 'analytics'" :class="{ active: daoTrialSubTab === 'analytics' }" @click="daoTrialSubTab = 'analytics'"><TrendingUp :size="15" aria-hidden="true" /> 数据析卷</button>
          </div>
          <div v-if="daoTrialSubTab === 'play'" :class="['dao-trial-surface', { 'dao-trial-running': activeDaoTrialRun }]">
            <div v-if="!activeDaoTrialRun" class="panel dao-trial-header">
              <div>
                <span class="section-kicker"><Compass :size="16" aria-hidden="true" /> 每日游历</span>
                <h3>第 {{ daoTrialState.cycle }} 期 · 问道秘境</h3>
              </div>
              <div class="dao-trial-header-stats">
                <span><small>问道签</small><b>{{ daoTrialState.tickets || 0 }} / {{ daoTrialState.ticketCap || 2 }}</b></span>
                <span><small>最深记录</small><b>{{ daoTrialState.bestFloor || 0 }} 层</b></span>
                <span><small>最佳得分</small><b>{{ daoTrialState.bestScore || 0 }}</b></span>
              </div>
              <div class="dao-trial-affix-banner">
                <span><Sparkles :size="15" aria-hidden="true" /> 本期异象</span>
                <strong>{{ daoTrialState.affix?.name }}</strong>
                <small>{{ daoTrialState.affix?.text }}</small>
              </div>
            </div>

            <template v-if="activeDaoTrialRun">
              <div class="panel dao-trial-run-board">
                <div class="dao-trial-run-heading">
                  <div>
                    <span class="section-kicker">{{ activeDaoTrialRun.practice ? "无奖励演练" : `今日第 ${activeDaoTrialRun.attempt} 次` }}</span>
                    <h3>{{ activeDaoTrialRun.route?.name }} · 第 {{ activeDaoTrialRun.floor }} 层<span v-if="activeDaoTrialRun.endless"> · 问天阶</span></h3>
                    <p>{{ activeDaoTrialRun.currentNode?.name }} · 已通过 {{ activeDaoTrialRun.maxFloor }} 层</p>
                    <p>行囊 {{ daoTrialBagText(activeDaoTrialRun.bag) }} · 战败时你带回 40%，胜方修士获得余下 60% · 主动离境带回 80% · 检查点收功按 120% 结算</p>
                  </div>
                  <div class="actions">
                    <span v-if="activeDaoTrialRun.affix" class="dao-trial-run-affix"><Sparkles :size="14" aria-hidden="true" /> {{ activeDaoTrialRun.affix.name }}</span>
                    <span v-if="activeDaoTrialRun.firstExploreSupport?.applied" class="dao-trial-run-first-explore"><Compass :size="14" aria-hidden="true" /> 首探护持 · 悟机 +{{ activeDaoTrialRun.firstExploreSupport.insight }}<template v-if="activeDaoTrialRun.firstExploreSupport.freeRerolls"> · 免费重观 +{{ activeDaoTrialRun.firstExploreSupport.freeRerolls }}</template></span>
                    <span class="dao-trial-live-score">当前 {{ activeDaoTrialRun.score }} 分</span>
                    <button class="secondary compact-button" type="button" :disabled="!activeDaoTrialRun.canWithdraw || isActionPending('/api/dao-trial/abandon')" :title="activeDaoTrialRun.canWithdraw ? '带回当前行囊的 80%' : '完成前五层并处理当前选择后可离境'" @click="abandonCurrentDaoTrial">
                      收功离境
                    </button>
                  </div>
                </div>

                <div class="dao-trial-path" aria-label="问道节点进度">
                  <div v-for="node in visibleDaoTrialNodes" :key="node.id" :class="[`state-${node.state}`, { boss: node.boss }]">
                    <span>{{ node.floor || node.index + 1 }}</span><b>{{ node.name }}</b><small>{{ node.boss ? (node.floor === 30 ? "问心终试" : "阶段守关") : node.elite ? (node.checkpoint ? "精英检查点" : "精英") : node.type === "battle" ? "斗法" : node.type === "rest" ? "调息" : "取舍" }}</small>
                  </div>
                </div>

                <div class="dao-trial-boon-strip" v-if="activeDaoTrialRun.taskBoons?.length">
                  <span v-for="boon in activeDaoTrialRun.taskBoons" :key="boon.id"><b>{{ boon.name }}</b><small>{{ boon.text }}</small></span>
                </div>

                <div class="dao-trial-score-breakdown" aria-label="本轮评分拆分">
                  <span><small>进度</small><b>{{ activeDaoTrialRun.scoreBreakdown?.progress || 0 }}</b></span>
                  <span><small>战斗表现</small><b>{{ activeDaoTrialRun.scoreBreakdown?.quality || 0 }}</b></span>
                  <span><small>风险</small><b>{{ activeDaoTrialRun.scoreBreakdown?.risk || 0 }}</b></span>
                  <span><small>构筑</small><b>{{ activeDaoTrialRun.scoreBreakdown?.build || 0 }}</b></span>
                  <span v-if="activeDaoTrialRun.scoreBreakdown?.modifier"><small>异象修正</small><b>{{ signedNumber(activeDaoTrialRun.scoreBreakdown.modifier) }}</b></span>
                </div>

                <div class="dao-trial-play-grid">
                  <section class="dao-trial-status">
                    <div class="dao-trial-player-line">
                      <CharacterPortrait :person="player" size="sm" />
                      <div><small>本轮状态</small><strong>{{ player.name }}</strong><small>悟机 {{ activeDaoTrialRun.insight }} · {{ activeDaoTrialRun.seals.length }} 道印 · {{ activeDaoTrialRun.laws.length }} 法则</small></div>
                    </div>
                    <Meter label="秘境血量" icon="health" :value="activeDaoTrialRun.combat.hp" :max="activeDaoTrialRun.combat.maxHp" tone="health" />
                    <Meter label="秘境法力" icon="mana" :value="activeDaoTrialRun.combat.mana" :max="activeDaoTrialRun.combat.maxMana" tone="focus" />
                    <div v-if="activeDaoTrialRun.combatModifiers" class="dao-trial-combat-modifiers" aria-label="秘境实战加成">
                      <div class="dao-trial-modifier-head"><strong>属性原值与当前值</strong></div>
                      <div v-if="activeDaoTrialRun.statComparisons?.length" class="dao-trial-stat-comparisons">
                        <span v-for="entry in activeDaoTrialRun.statComparisons" :key="entry.key">
                          <small>{{ entry.label }}</small>
                          <b><i>{{ entry.base }}</i><em>→</em><strong>{{ entry.current }}</strong></b>
                          <small :class="{ positive: entry.percent > 0, negative: entry.percent < 0 }">{{ entry.percent > 0 ? '+' : '' }}{{ formatPercent(entry.percent) }}</small>
                        </span>
                      </div>
                      <div v-if="activeDaoTrialRun.combatModifiers.skill" class="dao-trial-skill-comparison">
                        <strong>{{ activeDaoTrialRun.combatModifiers.skill.name }}</strong>
                        <span>
                          <small>法力消耗</small>
                          <b><i>{{ activeDaoTrialRun.combatModifiers.skill.baseCost }}</i><em>→</em><strong>{{ activeDaoTrialRun.combatModifiers.skill.cost }}</strong></b>
                        </span>
                        <span v-for="effect in activeDaoTrialRun.combatModifiers.skill.effectComparisons" :key="effect.key">
                          <small>{{ effect.label }}</small>
                          <b><i>{{ effect.display === 'number' ? effect.base : formatPercent(effect.base) }}</i><em>→</em><strong>{{ effect.display === 'number' ? effect.current : formatPercent(effect.current) }}</strong></b>
                        </span>
                        <span>
                          <small>技能冷却</small>
                          <b><i>{{ activeDaoTrialRun.combatModifiers.skill.baseCooldown }}</i><em>→</em><strong>{{ activeDaoTrialRun.combatModifiers.skill.cooldown }}</strong></b>
                        </span>
                      </div>
                    </div>
                    <button v-if="activeDaoTrialRun.taskBoons?.some(boon => boon.id === 'life')" class="secondary compact-button" type="button" :disabled="!activeDaoTrialRun.canUseLifeHeal || isActionPending('/api/dao-trial/advance')" @click="useDaoTrialLifeHeal">
                      {{ activeDaoTrialRun.canUseLifeHeal ? "使用回春符 · 恢复 20%" : "回春符暂不可用" }}
                    </button>
                    <div v-if="activeDaoTrialRun.companion" class="dao-trial-companion-mini">
                      <CharacterPortrait :person="activeDaoTrialRun.companion.person" size="sm" />
                      <span><small>同行 · {{ activeDaoTrialRun.companion.relationship }}</small><b>{{ activeDaoTrialRun.companion.person.name }}</b><em>{{ activeDaoTrialRun.companion.support.active?.name }} · {{ activeDaoTrialRun.companion.support.text }}</em></span>
                      <button class="secondary compact-button" type="button" :disabled="activeDaoTrialRun.companion.supportUsed || isActionPending('/api/dao-trial/advance')" @click="useDaoTrialCompanionSupport">{{ activeDaoTrialRun.companion.supportUsed ? "已支援" : "主动支援" }}</button>
                    </div>
                    <div v-if="activeDaoTrialRun.companion" class="dao-trial-companion-contribution">
                      <span>伤害 <b>{{ activeDaoTrialRun.companionContribution?.damage || 0 }}</b></span><span>治疗 <b>{{ activeDaoTrialRun.companionContribution?.healing || 0 }}</b></span><span>护势 <b>{{ activeDaoTrialRun.companionContribution?.shields || 0 }}</b></span><span>支援 <b>{{ activeDaoTrialRun.companionContribution?.assists || 0 }}</b></span>
                    </div>
                  </section>

                  <section :class="['dao-trial-decision', { 'has-enemy': activeDaoTrialRun.currentNode?.type === 'battle' && activeDaoTrialRun.opponentPreview }]">
                    <div class="dao-trial-current-node">
                      <span>{{ activeDaoTrialRun.currentNode?.boss ? "问心守关" : activeDaoTrialRun.currentNode?.elite ? "精英守关" : "当前节点" }}</span>
                      <h3>{{ activeDaoTrialRun.currentNode?.name }}</h3>
                      <small>悟机 {{ activeDaoTrialRun.insight }} · 免费重观 {{ activeDaoTrialRun.freeRerolls || 0 }} 次</small>
                    </div>
                    <div v-if="activeDaoTrialRun.synergies?.length" class="dao-trial-synergy-list">
                      <span v-for="synergy in activeDaoTrialRun.synergies" :key="synergy.id"><CheckCircle2 :size="14" aria-hidden="true" /><b>{{ synergy.name }}</b><small>{{ synergy.text }}</small></span>
                    </div>
                    <div v-if="activeDaoTrialRun.resonanceProgress?.length" class="dao-trial-resonance-progress" aria-label="道印共鸣进度">
                      <span v-for="entry in activeDaoTrialRun.resonanceProgress" :key="entry.school" :class="{ complete: entry.complete }"><b>{{ entry.school }}</b><i><em :style="{ width: `${Math.min(100, entry.count / 6 * 100)}%` }"></em></i><small>{{ entry.count }} / {{ entry.nextThreshold }}</small></span>
                    </div>
                    <div v-if="activeDaoTrialRun.lastLawEvent" class="dao-trial-law-event"><Sparkles :size="14" aria-hidden="true" /><span><b>{{ activeDaoTrialRun.lastLawEvent.lawName }}</b><small>{{ activeDaoTrialRun.lastLawEvent.text }}</small></span></div>
                    <div v-if="activeDaoTrialRun.lawOffer.length" class="dao-trial-law-offer">
                      <div class="dao-trial-offer-head"><span title="法则等权随机出现；重复选择会提升叠层效果">择一问道法则改变本轮构筑 · 等权随机</span><button class="secondary compact-button" type="button" :disabled="!activeDaoTrialRun.canReroll || isActionPending('/api/dao-trial/advance')" @click="rerollDaoTrialLaws"><RefreshCw :size="14" aria-hidden="true" /> {{ activeDaoTrialRun.freeRerolls ? "免费重观" : "重观 · 1悟机" }}</button></div>
                      <button v-for="law in activeDaoTrialRun.lawOffer" :key="law.id" :class="`rarity-${law.rarity}`" type="button" :aria-label="`${law.rarityLabel}法则：${law.name}。${law.text}`" :disabled="isActionPending('/api/dao-trial/advance')" @click="chooseDaoTrialLaw(law.id)">
                        <strong class="dao-law-name"><Sparkles :size="15" aria-hidden="true" />{{ law.name }}<small v-if="law.stack > 1">叠层 {{ law.stack }}</small></strong>
                        <span class="dao-law-kicker"><Gem :size="14" aria-hidden="true" /><i>{{ law.school }}</i><small class="dao-law-branch">{{ law.branch }}</small></span>
                        <p class="dao-law-effect"><Zap :size="14" aria-hidden="true" />{{ law.text }}</p>
                        <span class="dao-law-meta"><span><Orbit :size="12" aria-hidden="true" />{{ daoTrialTriggerLabel(law.trigger) }}</span><span v-if="law.mechanics?.[0]?.summary">{{ law.mechanics[0].summary }}</span></span>
                        <small v-if="law.nextStack" class="dao-law-next"><TrendingUp :size="12" aria-hidden="true" />再次选择：{{ law.nextStack.text }}</small>
                        <small v-else class="dao-law-next complete"><CheckCircle2 :size="12" aria-hidden="true" />已达五层圆满</small>
                      </button>
                    </div>
                    <div v-else-if="activeDaoTrialRun.checkpointPending" class="dao-trial-checkpoint">
                      <span>第 {{ activeDaoTrialRun.checkpointFloor }} 层阶段检查点</span><h3>收功结算，或继续深入问天阶</h3><small>安全离境按 120% 带回行囊；继续挑战会恢复 {{ activeDaoTrialRun.checkpointRecovery?.hpPercent || 0 }}% 气血与 {{ activeDaoTrialRun.checkpointRecovery?.manaPercent || 0 }}% 法力，并保留道印、法则和全部得分。</small><div class="actions"><button class="secondary" type="button" :disabled="isActionPending('/api/dao-trial/advance')" @click="exitDaoTrialCheckpoint">安全离境</button><button class="primary" type="button" :disabled="isActionPending('/api/dao-trial/advance')" @click="continueDaoTrialCheckpoint">继续深入</button></div>
                    </div>
                    <div v-else-if="activeDaoTrialRun.sealOffer.length" class="dao-trial-seal-offer">
                      <div class="dao-trial-offer-head"><span>择一道印收入本轮</span><button class="secondary compact-button" type="button" :disabled="!activeDaoTrialRun.canReroll || isActionPending('/api/dao-trial/advance')" @click="rerollDaoTrialSeals"><RefreshCw :size="14" aria-hidden="true" /> {{ activeDaoTrialRun.freeRerolls ? "免费重观" : "重观 · 1悟机" }}</button></div>
                      <button v-for="seal in activeDaoTrialRun.sealOffer" :key="seal.id" class="dao-seal-card" type="button" :disabled="isActionPending('/api/dao-trial/advance')" @click="chooseDaoTrialSeal(seal.id)">
                        <strong class="dao-seal-name"><Sparkles :size="15" aria-hidden="true" />{{ seal.name }}<small v-if="seal.stack > 1">叠层 {{ seal.stack }}</small></strong>
                        <span class="dao-seal-kicker"><ShieldCheck :size="14" aria-hidden="true" /><b>{{ seal.school }}</b><i v-if="seal.family">{{ seal.family }}</i></span>
                        <p class="dao-seal-effect"><Zap :size="14" aria-hidden="true" />{{ seal.text }}</p>
                        <small class="dao-seal-hint"><TrendingUp :size="12" aria-hidden="true" />收入本轮构筑</small>
                      </button>
                    </div>
                    <div v-else-if="activeDaoTrialRun.currentNode?.type === 'battle' && activeDaoTrialRun.opponentPreview" class="dao-trial-enemy-preview">
                      <div class="dao-trial-enemy-head">
                        <MonsterEmblem v-if="activeDaoTrialRun.opponentPreview.encounterKind === 'monster'" :monster="activeDaoTrialRun.opponentPreview" size="lg" />
                        <CharacterPortrait v-else :person="activeDaoTrialRun.opponentPreview.person" size="lg" />
                        <span><small>{{ activeDaoTrialRun.opponentPreview.kind }} · {{ activeDaoTrialRun.opponentPreview.realm }} · {{ activeDaoTrialRun.opponentPreview.sect }}</small><strong>{{ activeDaoTrialRun.opponentPreview.name }}</strong><em>{{ activeDaoTrialRun.opponentPreview.rootName }} · {{ activeDaoTrialRun.opponentPreview.skill }} · {{ skillRankText(activeDaoTrialRun.opponentPreview.skillRank) }}<template v-if="activeDaoTrialRun.opponentPreview.law"> · 法则：{{ activeDaoTrialRun.opponentPreview.law.name }}</template><template v-if="activeDaoTrialRun.opponentPreview.archetypeLabel"> · {{ activeDaoTrialRun.opponentPreview.archetypeLabel }}</template></em></span>
                        <b :class="`threat-${activeDaoTrialRun.opponentPreview.threat.key}`">{{ activeDaoTrialRun.opponentPreview.threat.label }}</b>
                      </div>
                      <div class="dao-trial-power-matchup" aria-label="双方战力对比">
                        <span><small>当前状态战力</small><strong>{{ activeDaoTrialRun.opponentPreview.playerPower }}</strong></span>
                        <i>对阵</i>
                        <span><small>秘境战力</small><strong>{{ activeDaoTrialRun.opponentPreview.power }}</strong></span>
                        <em>你的满状态 {{ activeDaoTrialRun.opponentPreview.playerMaxPower }} · 对方基础战力 {{ activeDaoTrialRun.opponentPreview.basePower }} · {{ daoTrialProjectionText(activeDaoTrialRun.opponentPreview) }}<template v-if="activeDaoTrialRun.opponentPreview.rootCounterPenalty"> · 灵根受克 -{{ formatPercent(activeDaoTrialRun.opponentPreview.rootCounterPenalty) }}</template> · 约为你当前状态的 {{ activeDaoTrialRun.opponentPreview.powerRatio }}%</em>
                      </div>
                      <div class="dao-trial-enemy-stats">
                        <span><Sword :size="14" aria-hidden="true" /><small>攻击</small><b>{{ activeDaoTrialRun.opponentPreview.attack }}</b></span>
                        <span><ShieldCheck :size="14" aria-hidden="true" /><small>防御</small><b>{{ activeDaoTrialRun.opponentPreview.defense }}</b></span>
                        <span><Flame :size="14" aria-hidden="true" /><small>气血</small><b>{{ activeDaoTrialRun.opponentPreview.maxHp }}</b></span>
                        <span><Eye :size="14" aria-hidden="true" /><small>神识</small><b>{{ activeDaoTrialRun.opponentPreview.divineSense }}</b></span>
                        <span><Waves :size="14" aria-hidden="true" /><small>法力</small><b>{{ activeDaoTrialRun.opponentPreview.maxMana }}</b></span>
                      </div>
                      <p class="dao-trial-opponent-stake">{{ activeDaoTrialRun.opponentPreview.encounterKind === 'monster' ? '战胜妖物可获得本层奖励；妖物获胜时本层不新增奖励，结算仍保留本轮行囊的 40%。' : '若守关修士获胜，其将取得本轮行囊原始奖励的 60%；玩家保留 40%。' }}<template v-if="activeDaoTrialRun.opponentPreview.enhancePercent"> · 秘境战意 +{{ activeDaoTrialRun.opponentPreview.enhancePercent }}%</template> · 预计灵石 +{{ activeDaoTrialRun.opponentPreview.rewardPreview?.spirit || 0 }}<template v-if="activeDaoTrialRun.opponentPreview.rewardPreview?.dust"> · 灵尘 +{{ activeDaoTrialRun.opponentPreview.rewardPreview.dust }}</template></p>
                      <button class="primary" type="button" :disabled="isActionPending('/api/dao-trial/advance')" @click="fightDaoTrial"><Play :size="15" aria-hidden="true" /><strong>开始战斗</strong></button>
                    </div>
                    <div v-else class="dao-trial-event-options"><span>此处如何取舍</span><button v-for="option in activeDaoTrialRun.eventOptions" :key="option.id" type="button" :disabled="isActionPending('/api/dao-trial/advance')" @click="chooseDaoTrialEvent(option.id)"><strong>{{ option.label }}</strong><small>{{ option.hint }}</small></button></div>
                  </section>

                  <aside class="dao-trial-seal-rack">
                    <strong>问道法则</strong>
                    <span
                      v-for="law in activeDaoTrialRun.laws"
                      :key="law.id"
                      class="dao-trial-rack-item"
                      :class="`rarity-${law.rarity}`"
                      :aria-label="`${law.name}：${law.text}`"
                      tabindex="0"
                    ><b>{{ law.name }}</b><em>{{ law.stack || 1 }}阶</em></span>
                    <p v-if="!activeDaoTrialRun.laws.length">入境后先选择第一项法则。</p>
                    <strong>本轮道印</strong>
                    <span
                      v-for="seal in activeDaoTrialRun.seals"
                      :key="seal.id"
                      class="dao-trial-rack-item"
                      :class="`rarity-${seal.rarity || 'silver'}`"
                      :aria-label="`${seal.name}：${seal.text}`"
                      tabindex="0"
                    ><b>{{ seal.name }}</b><em>{{ seal.stack || 1 }}阶</em></span>
                    <p v-if="!activeDaoTrialRun.seals.length">战斗得胜后可选择道印。</p>
                  </aside>
                </div>
              </div>
            </template>

            <template v-else>
              <div class="dao-trial-entry-stage">
              <div class="dao-trial-boon-panel">
                <div><strong>今日现实任务助力</strong></div>
                <span v-for="boon in (daoTrialState.boonsAvailable ? daoTrialState.taskBoons : [])" :key="boon.id"><b>{{ boon.category }} · {{ boon.name }}</b><small>{{ boon.text }}</small></span>
                <span v-if="!daoTrialState.boonsAvailable"><b>今日助力已使用</b></span>
                <span v-else-if="!daoTrialState.taskBoons?.length"><b>尚无助力</b></span>
              </div>
              <section class="dao-trial-harmony-panel" aria-labelledby="dao-trial-harmony-title">
                <div class="dao-trial-harmony-head">
                  <span><Sparkles :size="16" aria-hidden="true" /><b id="dao-trial-harmony-title">本期三脉合参</b></span>
                  <strong>{{ daoTrialState.harmony?.progress || 0 }} / {{ daoTrialState.harmony?.maxProgress || 45 }}</strong>
                </div>
                <div class="dao-trial-harmony-track" role="progressbar" aria-label="本期三脉合参进度" :aria-valuenow="daoTrialState.harmony?.progress || 0" aria-valuemin="0" :aria-valuemax="daoTrialState.harmony?.maxProgress || 45"><i :style="{ width: `${Math.min(100, (daoTrialState.harmony?.progress || 0) / Math.max(1, daoTrialState.harmony?.maxProgress || 45) * 100)}%` }"></i></div>
                <div class="dao-trial-harmony-milestones">
                  <span v-for="milestone in daoTrialState.harmony?.milestones || []" :key="milestone.id" :class="{ reached: milestone.reached, claimed: milestone.claimed }">
                    <b>{{ milestone.target }}</b>
                    <small>{{ milestone.label }}</small>
                    <em>{{ milestone.claimed ? "已领取" : daoTrialHarmonyRewardText(milestone.reward) }}</em>
                  </span>
                </div>
              </section>
              <div class="dao-trial-route-grid">
                <button v-for="route in daoTrialState.routes" :key="route.id" type="button" :class="[`route-${route.accent}`, { active: selectedDaoTrialRoute?.id === route.id }]" :aria-pressed="selectedDaoTrialRoute?.id === route.id" @click="selectedDaoTrialRouteId = route.id">
                  <span class="dao-route-root"><img :src="rootIconPath(route.rootKey)" alt=""></span><span><small>三十层核心 · 路线精通 {{ daoTrialState.routeMastery?.[route.id]?.level || 0 }} 级</small><strong>{{ route.name }}</strong><em>{{ route.subtitle }}</em><small>最深 {{ daoTrialState.routeMastery?.[route.id]?.bestFloor || 0 }} 层 · 最佳 {{ daoTrialState.routeMastery?.[route.id]?.bestScore || 0 }} 分</small><span class="dao-trial-route-cycle"><b>{{ route.cycleProgress?.bestFloor ? `本期 ${route.cycleProgress.bestFloor} 层` : "本期未探索" }}</b><small>合参 {{ route.cycleProgress?.contribution || 0 }} / {{ daoTrialState.harmony?.perRouteCap || 15 }}</small><span v-if="route.firstExplore?.available && route.firstExplore?.rewardEligible" class="dao-trial-route-first-explore">首探 · 悟机 +{{ route.firstExplore.insight }}<template v-if="route.firstExplore.freeRerolls"> · 重观 +{{ route.firstExplore.freeRerolls }}</template></span></span></span>
                </button>
              </div>
              <section v-if="selectedDaoTrialRoute" class="dao-trial-mastery-card" aria-live="polite">
                <div v-if="selectedDaoTrialMastery.unlocks?.length" class="dao-trial-mastery-unlocks" aria-label="当前路线精通解锁">
                  <span v-for="unlock in selectedDaoTrialMastery.unlocks" :key="unlock.id"><b>{{ unlock.name }}</b><small>{{ unlock.text }}</small></span>
                </div>
                <div v-else class="dao-trial-mastery-empty">继续深入此路线，可逐步解锁精通效果。</div>
              </section>
              <div class="dao-trial-prepare">
                <div class="section-head compact"><div><h3>选择同行者</h3></div></div>
                <div class="dao-trial-companion-list"><button type="button" :class="{ active: !selectedDaoTrialCompanionId }" @click="selectedDaoTrialCompanionId = ''"><span class="dao-companion-none">独</span><span><strong>独自问道</strong><small>不获得同行支援</small></span></button><button v-for="entry in daoTrialState.companions" :key="entry.person.id" type="button" :class="{ active: selectedDaoTrialCompanionId === entry.person.id }" @click="selectedDaoTrialCompanionId = entry.person.id"><CharacterPortrait :person="entry.person" size="sm" /><span><strong>{{ entry.person.name }}</strong><small>{{ entry.neutral ? '临时同道' : entry.relationship }} · {{ entry.support.text }}</small><small class="dao-trial-companion-relation"><span>亲和 <b>{{ entry.affinity }}</b></span><span>敬意 <b>{{ entry.respect }}</b></span></small></span></button></div>
                <div class="dao-trial-entry-action"><button class="primary" type="button" :disabled="!selectedDaoTrialRoute || isActionPending('/api/dao-trial/start')" @click="startSelectedDaoTrial"><Compass :size="16" aria-hidden="true" />{{ isActionPending('/api/dao-trial/start') ? '踏入中...' : daoTrialState.tickets > 0 ? `消耗问道签 · 踏入${selectedDaoTrialRoute?.name || '秘境'}` : '开始无奖励演练' }}</button></div>
              </div>
              </div>
            </template>
          </div>
          <div v-else-if="daoTrialSubTab === 'archive'" class="dao-trial-surface dao-trial-archive-page">
              <div class="panel dao-trial-header dao-trial-archive-header">
                <div><span class="section-kicker"><BookOpen :size="16" aria-hidden="true" /> 长期记录</span><h3>档案</h3><p>查看年度目标、最近游历与法则道印图鉴。</p></div>
                <div><span><small>已发现法则</small><b>{{ daoTrialState.collection?.discoveredLawCount || 0 }} / {{ daoTrialState.collection?.totalLawCount || 256 }}</b></span><span><small>已发现道印</small><b>{{ daoTrialState.collection?.discoveredSealCount || 0 }} / {{ daoTrialState.collection?.totalSealCount || 1024 }}</b></span></div>
              </div>
              <div class="grid dao-trial-lower-grid">
                <section class="panel dao-trial-year-goals dao-trial-archive-section"><div class="section-head compact"><div><h3>年度问道志</h3><p>保留周期最佳成绩、路线精通和长期目标。</p></div><span class="tag">第 {{ daoTrialState.yearGoals?.year || 1 }} 年</span></div><div class="dao-trial-goal-grid"><div v-for="goal in daoTrialState.yearGoals?.goals || []" :key="goal.id" :class="{ complete: goal.completed }"><span><b>{{ goal.label }}</b><small>{{ Math.min(goal.current, goal.target) }} / {{ goal.target }}</small></span><i><em :style="{ width: `${Math.min(100, (goal.current / Math.max(1, goal.target)) * 100)}%` }"></em></i></div></div></section>
                <section class="panel dao-trial-history dao-trial-archive-section"><div class="section-head compact"><div><h3>最近游历</h3><p>正式游历和演练都会记录，奖励只在正式游历结算。</p></div></div><div class="timeline detail-scroll"><button v-for="record in daoTrialState.history" :key="record.id" class="event event-button" :class="{ gold: record.success, bad: !record.success, replayable: record.lastReplayId }" type="button" :disabled="!record.lastReplayId" @click="openEncounterReplay({ replayId: record.lastReplayId })"><strong>第 {{ record.cycle }} 期 · {{ record.routeName }} · {{ record.result }}</strong><span>最深 {{ record.floor || record.nodesCleared }} 层 · {{ record.score }} 分</span><small>完成时间 {{ daoTrialRecordDateTime(record) }}</small><small>{{ daoTrialScoreBreakdownText(record) }}</small><small>{{ record.practice ? '演练' : `正式第 ${record.attempt} 次` }} · {{ daoTrialRewardText(record) }}</small></button><div v-if="!daoTrialState.history?.length" class="empty">尚未留下游历记录。</div></div></section>
              </div>
              <section class="panel dao-trial-catalog dao-trial-archive-section">
                <div class="section-head compact"><div><h3>问道图鉴</h3><p>已发现 {{ daoTrialState.collection?.discoveredLawCount || 0 }} / {{ daoTrialState.collection?.totalLawCount || 256 }} 法则 · {{ daoTrialState.collection?.discoveredSealCount || 0 }} / {{ daoTrialState.collection?.totalSealCount || 1024 }} 道印</p></div><div class="dao-trial-catalog-modes"><button type="button" :class="{ active: daoTrialCatalogMode === 'laws' }" @click="resetDaoTrialCatalogFilters('laws')">法则</button><button type="button" :class="{ active: daoTrialCatalogMode === 'seals' }" @click="resetDaoTrialCatalogFilters('seals')">道印</button></div></div>
                <div class="dao-trial-catalog-toolbar">
                  <input v-model="daoTrialCatalogQuery" type="search" placeholder="搜索名称、流派或效果" aria-label="搜索问道图鉴" @input="daoTrialCatalogPage = 1">
                  <select v-model="daoTrialCatalogSchool" aria-label="按流派筛选" @change="daoTrialCatalogPage = 1"><option value="">全部流派</option><option v-for="school in daoTrialCatalogSchools" :key="school" :value="school">{{ school }}</option></select>
                  <select v-if="daoTrialCatalogMode === 'laws'" v-model="daoTrialCatalogBranch" aria-label="按构筑分支筛选" @change="daoTrialCatalogPage = 1"><option value="">全部分支</option><option v-for="branch in daoTrialCatalogBranches" :key="branch" :value="branch">{{ branch }}</option></select>
                  <select v-if="daoTrialCatalogMode === 'laws'" v-model="daoTrialCatalogRarity" aria-label="按品质筛选" @change="daoTrialCatalogPage = 1"><option value="">全部品质</option><option value="diamond">钻石</option><option value="gold">黄金</option><option value="silver">白银</option></select>
                  <select v-model="daoTrialCatalogDiscovery" aria-label="按发现状态筛选" @change="daoTrialCatalogPage = 1"><option value="">全部状态</option><option value="seen">已发现</option><option value="unseen">未发现</option></select>
                  <span>{{ filteredDaoTrialCatalog.length }} 项</span>
                </div>
                <div class="dao-trial-catalog-grid">
                  <article v-for="entry in pagedDaoTrialCatalog" :key="entry.id" :class="[daoTrialCatalogMode === 'laws' ? `rarity-${entry.rarity}` : `school-${entry.school}`, { undiscovered: !entry.discovered }]" :title="entry.discovered ? entry.text : '尚未在问道选择中遇见'">
                    <span><b>{{ entry.discovered ? entry.name : "未悟之印" }}</b><em v-if="daoTrialCatalogMode === 'laws'">{{ entry.rarityLabel }}</em></span>
                    <small>{{ entry.school }}<template v-if="entry.discovered && entry.branch"> · {{ entry.branch }}</template><template v-else-if="entry.discovered && entry.family"> · {{ entry.family }}</template></small>
                    <p>{{ entry.discovered ? entry.text : "继续问道以发现此项。" }}</p>
                    <p v-if="entry.discovered && entry.mechanics?.[0]?.summary" class="dao-law-mechanic">核心机制：{{ entry.mechanics[0].summary }}</p>
                    <small v-if="entry.discovered && entry.stackPlan?.[1]" class="dao-law-next">重复强化：{{ entry.stackPlan[1].text }}</small>
                  </article>
                  <div v-if="!pagedDaoTrialCatalog.length" class="empty">没有符合筛选条件的图鉴项。</div>
                </div>
                <div class="dao-trial-catalog-pager"><button class="secondary" type="button" :disabled="daoTrialCatalogPage <= 1" @click="daoTrialCatalogPage -= 1">上一页</button><span>{{ Math.min(daoTrialCatalogPage, daoTrialCatalogPageCount) }} / {{ daoTrialCatalogPageCount }}</span><button class="secondary" type="button" :disabled="daoTrialCatalogPage >= daoTrialCatalogPageCount" @click="daoTrialCatalogPage += 1">下一页</button></div>
              </section>
          </div>
          <DaoTrialAnalytics v-else :routes="daoTrialState.routes" :cycle="daoTrialState.cycle" @open-replay="(replayId) => openEncounterReplay({ replayId })" />
        </section>

        <section v-if="activeTab === 'sect'" class="view active sect-war-room">
          <div class="panel section-head compact sect-command-header">
            <div class="sect-command-title">
              <h3>宗门疆域</h3>
              <p>各宗门每日按资源、距离、疲劳与守城价值制定攻守；受袭城市会临战增援，你也可手动安排明日战略。</p>
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
              <span>灵尘总包</span>
              <span>经验总包</span>
              <span>突破总包</span>
              <span>主要占领省份</span>
            </div>
            <div class="sect-territory-list sect-rank-table">
              <article v-for="(sect, index) in sectTerritoryRanking" :key="sect.name" class="sect-territory-card" :style="{ '--sect-color': sectColor(sect.name) }">
                <div class="sect-territory-rank">
                  <span class="sect-rank-medal">{{ index + 1 }}</span>
                </div>
                <button class="sect-rank-name" type="button" :aria-label="`查看${sect.name}宗门属性`" @click="openSectTerritoryDetail(sect.name)">
                  <span class="sect-emblem" :style="{ background: sectColor(sect.name) }">{{ sect.name.slice(0, 1) }}</span>
                  <strong>{{ sect.name }}</strong>
                </button>
                <span class="rank-number territory-count">
                  <b>{{ sect.provinceCount }}</b>
                  <small
                    :class="sectProvinceChange(sect.name, sect.provinceCount).direction"
                    :title="sectProvinceChange(sect.name, sect.provinceCount).title"
                  >{{ sectProvinceChange(sect.name, sect.provinceCount).text }}</small>
                </span>
                <span class="resource-pill spirit" aria-label="灵石总包">
                  <Coins :size="18" :stroke-width="2.6" aria-hidden="true" />
                  <b>{{ resourcePlanValue(sect.resourcePlan?.spirit, "spirit") }}</b>
                </span>
                <span class="resource-pill dust" aria-label="灵尘总包">
                  <Gem :size="18" :stroke-width="2.6" aria-hidden="true" />
                  <b>{{ resourcePlanValue(sect.resourcePlan?.dust, "dust") }}</b>
                </span>
                <span class="resource-pill xp" aria-label="经验总包">
                  <Sparkles :size="18" :stroke-width="2.6" aria-hidden="true" />
                  <b>{{ resourcePlanValue(sect.resourcePlan?.xp, "xp") }}</b>
                </span>
                <span class="resource-pill breakthrough" aria-label="突破总包" :title="breakthroughResourcePlanTitle(sect.resourcePlan?.breakthrough)">
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
                  <option value="dust">灵尘</option>
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
                <span>今日战果人员</span>
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
                <span v-if="provinceBattleRoster(territory).participants.length" class="province-battle-roster">
                  <small class="province-roster-label" :class="provinceBattleRoster(territory).status">{{ provinceBattleRoster(territory).label }}</small>
                  <span class="defender-stack" :class="{ compact: provinceBattleRoster(territory).participants.length > maxSiegeTeamSize }">
                    <template
                      v-for="participant in provinceBattleRoster(territory).participants"
                      :key="`${territory.id}-${provinceBattleRoster(territory).status}-${participant.id}`"
                    >
                      <span
                        v-if="participant.kind === 'monster'"
                        class="defender-chip icon-only monster"
                        :aria-label="provinceRosterParticipantTooltip(participant)"
                      >
                        <MonsterEmblem :monster="participant" size="xs" />
                      </span>
                      <button
                        v-else
                        class="defender-chip icon-only person"
                        type="button"
                        :aria-label="`查看${provinceRosterParticipantTooltip(participant)}的个人属性`"
                        :title="`${provinceRosterParticipantTooltip(participant)} · 点击查看个人属性`"
                        @click="openProvinceRosterPerson(participant)"
                      >
                        <CharacterPortrait :person="participant" size="xs" />
                      </button>
                    </template>
                  </span>
                </span>
                <span v-else class="province-intel-label" :class="provinceBattleRoster(territory).status">{{ provinceBattleRoster(territory).label }}</span>
              </div>
              <div v-if="!filteredProvinceResourceRanking.length" class="empty province-filter-empty">没有符合筛选条件的省份。</div>
            </div>
          </div>

          <div v-else-if="activeSectSubTab === 'strategy'" class="panel sect-system-panel sect-province-panel sect-strategy-board">
            <div class="section-head compact sect-panel-title strategy-board-heading">
              <div class="strategy-title-copy">
                <h3>明日战略</h3>
                <p>第 {{ planTargetDay }} 天执行 · {{ sectPlanControlLabel }}；未设置的攻守由宗门自行补齐。</p>
              </div>
              <span class="strategy-sect-mark">{{ playerSectNameForPlan || "本宗" }} · {{ sectPlanControlLabel }}</span>
            </div>
            <div class="strategy-command-deck">
              <div class="strategy-mode-field">
                <span class="strategy-field-label">战略态度</span>
                <div class="strategy-mode-options" role="group" aria-label="战略态度">
                  <button type="button" :class="{ active: sectPlanDraft.mode === 'conservative' }" @click="sectPlanDraft.mode = 'conservative'">
                    保守
                    <span class="strategy-mode-tooltip" role="tooltip">优先稳守城池，仅在战前情报较有利时攻城；默认保留更多人员休整。</span>
                  </button>
                  <button type="button" :class="{ active: sectPlanDraft.mode === 'balanced' }" @click="sectPlanDraft.mode = 'balanced'">
                    均衡
                    <span class="strategy-mode-tooltip" role="tooltip">兼顾守备与扩张，按目标价值、距离和模糊守备情报安排攻守。</span>
                  </button>
                  <button type="button" :class="{ active: sectPlanDraft.mode === 'aggressive' }" @click="sectPlanDraft.mode = 'aggressive'">
                    激进
                    <span class="strategy-mode-tooltip" role="tooltip">优先争夺城池，可接受守备情报不利的攻势；休整名额更少。</span>
                  </button>
                </div>
              </div>
              <label class="strategy-target-field"><span class="strategy-field-label">攻城目标</span>
                <select v-model="sectPlanDraft.attackTarget">
                  <option value="">自动选择</option>
                  <option v-for="province in attackableProvinces" :key="province.id" :value="province.id">
                    {{ planProvinceLabel(province) }}
                  </option>
                </select>
              </label>
              <div v-if="selectedAttackForecast" class="strategy-forecast-card" aria-label="攻城预测">
                <span>战前研判</span>
                <strong>{{ selectedAttackForecast.outlook }}</strong>
                <small>{{ selectedAttackForecast.risk }} · 远征 {{ selectedAttackForecast.distance }} 格</small>
              </div>
              <label v-if="sectPlanDraft.attackTarget" class="strategy-target-field"><span class="strategy-field-label">目标冲突</span>
                <select v-model="sectPlanDraft.onConflict">
                  <option value="retarget">改攻备选目标</option>
                  <option value="cancel">取消出征并休整</option>
                </select>
              </label>
              <div class="strategy-command-actions">
                <button class="secondary" type="button" @click="resetSectPlanAuto">恢复自动</button>
                <button class="primary" type="button" :disabled="isActionPending('/api/sect/plan')" @click="saveSectPlan">
                  {{ isActionPending("/api/sect/plan") ? "保存中..." : "颁布明日军令" }}
                </button>
              </div>
            </div>

            <div class="grid strategy-columns">
              <article class="panel flat strategy-roster-panel attack-roster-panel">
                <div class="section-head compact strategy-section-heading">
                  <div>
                    <h3>攻城队伍</h3>
                    <p>{{ selectedAttackProvince ? `目标 ${selectedAttackProvince.name}，最多 ${selectedAttackProvince.attackerLimit || playerAttackTeamLimit} 人，距离 ${selectedAttackProvince.distance}` : `不指定目标时由 AI 选城选人；${playerOwnedProvinces.length ? `攻守双方均不超过 ${maxSiegeTeamSize} 人` : `本宗暂无城市，攻城最多 ${playerAttackTeamLimit} 人，守城仍最多 ${maxSiegeTeamSize} 人`}` }}</p>
                  </div>
                  <span class="strategy-count-badge attack">已选 {{ sectPlanDraft.attackMemberIds.length }} / {{ playerAttackTeamLimit }}</span>
                </div>
                <div class="timeline compact-list strategy-member-list">
                  <button
                    v-for="member in playerSectMembers"
                    :key="`attack-${member.id}`"
                    class="event event-button strategy-member-row"
                    type="button"
                    :class="{ active: assignedAttackIds.has(member.id), guarding: assignedDefenseIds.has(member.id) }"
                    :disabled="assignedDefenseIds.has(member.id)"
                    :title="assignedDefenseIds.has(member.id) ? '已被指定守城，不能同时参与攻城' : planMemberLabel(member)"
                    @click="togglePlanAttackMember(member.id)"
                  >
                    <span class="strategy-member-index" aria-hidden="true">{{ assignedAttackIds.has(member.id) ? "攻" : assignedDefenseIds.has(member.id) ? "守" : "候" }}</span>
                    <span class="strategy-member-main">
                      <strong>{{ member.name }}</strong>
                      <small>{{ realmName(member.realm) }}</small>
                    </span>
                    <span class="strategy-member-stats">
                      <b>战力 {{ formatCompact(personPower(member)) }}</b>
                      <span class="fatigue-help" tabindex="0" @click.stop>
                        疲劳 {{ member.fatigue || 0 }}
                        <em v-if="fatigueDelta(member).known" class="fatigue-delta" :class="fatigueDelta(member).direction">{{ fatigueDelta(member).text }}</em>
                        <span class="fatigue-tooltip" role="tooltip">{{ fatigueHelpText(member) }}</span>
                      </span>
                    </span>
                  </button>
                </div>
              </article>

              <article class="panel flat strategy-roster-panel defense-roster-panel">
                <div class="section-head compact strategy-section-heading">
                  <div>
                    <h3>己方布防</h3>
                    <p>来敌目标与人数在结算前未知；请按城市价值、边境风险和疲劳安排守军与休整。</p>
                  </div>
                  <span class="strategy-count-badge defense">{{ playerOwnedProvinces.length }} 座城池</span>
                </div>
                <div class="timeline compact-list strategy-defense-list">
                  <div v-if="playerOwnedProvinces.length" class="strategy-defense-city-picker" role="group" aria-label="选择布防城池">
                    <span class="strategy-defense-picker-label">布防城池</span>
                    <div class="strategy-defense-city-options">
                      <button
                        v-for="province in playerOwnedProvinces"
                        :key="`defense-city-${province.id}`"
                        type="button"
                        class="strategy-defense-city-option"
                        :class="{ active: selectedDefenseProvinceId === province.id }"
                        :aria-pressed="selectedDefenseProvinceId === province.id"
                        @click="selectedDefenseProvinceId = province.id"
                      >
                        <span>{{ province.name }}</span>
                        <b>{{ (sectPlanDraft.defense[province.id] || []).length }} / {{ province.defenderLimit || maxSiegeTeamSize }}</b>
                      </button>
                    </div>
                  </div>
                  <section v-if="selectedDefenseProvince" class="event strategy-city-card selected-defense-city">
                    <div class="strategy-city-heading">
                      <span class="strategy-city-seal" aria-hidden="true">守</span>
                      <div>
                        <strong>驻守 {{ selectedDefenseProvince.name }}</strong>
                        <span>{{ selectedDefenseProvince.effect.label || "宗门资源" }} · {{ selectedDefenseProvince.effect.text || "暂无资源产出" }} · 防守价值 {{ selectedDefenseProvince.defenseValue || 0 }}</span>
                      </div>
                      <b>{{ (sectPlanDraft.defense[selectedDefenseProvince.id] || []).length }} / {{ selectedDefenseProvince.defenderLimit || maxSiegeTeamSize }}</b>
                    </div>
                    <p class="strategy-defense-assignment-hint">点击成员，即指定其驻守「{{ selectedDefenseProvince.name }}」。同一成员仅能守一座城，也不能同时攻城。</p>
                    <div class="defender-stack plan-defender-stack">
                      <button
                        v-for="member in playerSectMembers"
                        :key="`defense-member-${member.id}`"
                        type="button"
                        class="defender-chip"
                        :class="{
                          'guarding-current': (sectPlanDraft.defense[selectedDefenseProvince.id] || []).includes(member.id),
                          muted: assignedAttackIds.has(member.id),
                          'guarding-other': assignedDefenseIds.has(member.id) && !(sectPlanDraft.defense[selectedDefenseProvince.id] || []).includes(member.id)
                        }"
                        :disabled="assignedAttackIds.has(member.id) || (assignedDefenseIds.has(member.id) && !(sectPlanDraft.defense[selectedDefenseProvince.id] || []).includes(member.id))"
                        :title="`${planMemberLabel(member)}${assignedAttackIds.has(member.id) ? ' · 已在攻城队，不能守城' : assignedDefenseIds.has(member.id) && !(sectPlanDraft.defense[selectedDefenseProvince.id] || []).includes(member.id) ? ' · 已驻守其他城池，不能重复派驻' : ''}`"
                        @click="togglePlanDefender(selectedDefenseProvince.id, member.id)"
                      >
                        {{ member.name }}
                      </button>
                    </div>
                  </section>
                  <div v-if="!playerOwnedProvinces.length" class="empty">本宗暂无城市，明日可全员攻城。</div>
                </div>
              </article>
            </div>
          </div>

          <div v-else-if="lastBattle && !selectedProvinceWar" class="sect-war-replay-shell">
            <section class="duel-replay-panel live sect-war-replay-panel">
              <div class="duel-replay-title">
                <div>
                  <h3>攻城实况</h3>
                  <p>{{ battleDisplayName(lastBattle.left) }} 对阵 {{ battleDisplayName(lastBattle.right) }}，{{ battleStatusText }}</p>
                </div>
                <div class="duel-replay-actions">
                  <button class="secondary" @click="replayBattle">重播</button>
                  <button class="primary" @click="returnFromBattle">{{ battleBackLabel }}</button>
                </div>
              </div>

              <div class="duel-arena-stage">
                <div class="duel-fighter left">
                  <MonsterEmblem v-if="isBattleMonster(lastBattle.left)" :monster="lastBattle.left" size="lg" />
                  <CharacterPortrait v-else :person="battlePerson(lastBattle.left)" size="lg" />
                  <strong>{{ battleDisplayName(lastBattle.left) }}</strong>
                  <small>{{ realmName(lastBattle.left.realm) }}</small>
                  <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.left)} 战斗属性`">
                    <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                    <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                  <small>{{ realmName(lastBattle.right.realm) }}</small>
                  <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.right)} 战斗属性`">
                    <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                    <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                  </div>
                  <span>{{ event.round ? `回合 ${event.round}` : "回合 1" }}</span>
                  <p>{{ siegeBattleEventText(event) }}</p>
                </div>
              </div>
            </section>
          </div>

          <div v-else-if="selectedProvinceWar" class="panel sect-system-panel sect-war-detail-panel">
              <div class="section-head compact sect-panel-title">
                <div>
                  <h3>{{ selectedProvinceWar.provinceName }} 攻城详情</h3>
                  <p>{{ selectedProvinceWar.result }}。</p>
                  <p class="war-owner-timeline">战后归属：{{ warOwnerAfterLabel(selectedProvinceWar) }} · 当前归属：{{ currentWarProvinceOwnerLabel(selectedProvinceWar) }}</p>
                </div>
                <button class="primary" type="button" @click="closeProvinceWarDetail">返回今日总览</button>
            </div>

            <div class="war-day-card captured-detail" :class="{ captured: selectedProvinceWar.captured }">
              <div class="war-day-title">
                <div>
                  <strong>{{ selectedProvinceWar.attacker }} 攻 {{ selectedProvinceWar.defender }}</strong>
                  <small>{{ selectedProvinceWar.provinceName }} · {{ selectedProvinceWar.battles.length ? `${selectedProvinceWar.battles.length} 场 PK` : "无主接管" }}</small>
                </div>
                <span class="tag">{{ selectedProvinceWar.captured ? "易主" : "守住" }}</span>
              </div>
              <section v-if="warStrategySections(selectedProvinceWar).length" class="war-strategy-panel" aria-label="攻守策略复盘">
                <header>
                  <span aria-hidden="true">策</span>
                  <div>
                    <strong>军师复盘</strong>
                    <small>{{ selectedProvinceWar.strategy?.summary || warStrategyPreview(selectedProvinceWar)[0] }}</small>
                  </div>
                </header>
                <div v-if="selectedProvinceWar.strategy?.preBattle || selectedProvinceWar.strategy?.postBattle" class="war-intelligence-review">
                  <article v-if="selectedProvinceWar.strategy?.preBattle" class="war-strategy-note pre-battle">
                    <span>战前</span>
                    <strong>{{ selectedProvinceWar.strategy.preBattle.title }}</strong>
                    <p v-for="point in strategyPointList(selectedProvinceWar.strategy.preBattle.points)" :key="point">{{ point }}</p>
                    <div class="war-strategy-metrics">
                      <em v-for="metric in strategyMetricList(selectedProvinceWar.strategy.preBattle.metrics)" :key="`pre-${metric.label}`">{{ metric.label }}<b>{{ metric.value }}</b></em>
                    </div>
                  </article>
                  <article v-if="selectedProvinceWar.strategy?.postBattle" class="war-strategy-note post-battle">
                    <span>战后</span>
                    <strong>{{ selectedProvinceWar.strategy.postBattle.title }}</strong>
                    <p v-for="point in strategyPointList(selectedProvinceWar.strategy.postBattle.points)" :key="point">{{ point }}</p>
                    <div class="war-strategy-metrics">
                      <em v-for="metric in strategyMetricList(selectedProvinceWar.strategy.postBattle.metrics)" :key="`post-${metric.label}`">{{ metric.label }}<b>{{ metric.value }}</b></em>
                    </div>
                  </article>
                </div>
                <div class="war-strategy-grid">
                  <article v-for="section in warStrategySections(selectedProvinceWar)" :key="section.key" class="war-strategy-note">
                    <span>{{ section.label }}</span>
                    <strong>{{ section.title }}</strong>
                    <p v-for="(point, index) in section.points" :key="point">
                      <b class="war-strategy-point-type">{{ warStrategyPointType(section.key, index) }}</b>{{ point }}
                    </p>
                    <div v-if="section.roster.length" class="war-strategy-roster" :aria-label="`${section.title}完整名单`">
                      <div v-for="member in section.roster" :key="`${section.key}-${member.id}`" :class="{ selected: member.selected }">
                        <b>{{ member.selected ? "入选" : "未选" }}</b>
                        <strong>{{ member.name }}</strong>
                        <small>战力 {{ member.power }} · 疲劳 {{ member.fatigue }} · {{ member.reason }}</small>
                      </div>
                    </div>
                    <div v-if="section.metrics.length" class="war-strategy-metrics">
                      <em v-for="metric in section.metrics" :key="`${section.key}-${metric.label}`">
                        {{ metric.label }}<b>{{ metric.value }}</b>
                      </em>
                    </div>
                  </article>
                </div>
              </section>
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
                        <MonsterEmblem v-if="isBattleMonster(battle.attacker)" :monster="battle.attacker" size="sm" />
                        <CharacterPortrait v-else :person="battlePerson(battle.attacker)" size="sm" />
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
                        <MonsterEmblem v-if="isBattleMonster(battle.defender)" :monster="battle.defender" size="sm" />
                        <CharacterPortrait v-else :person="battlePerson(battle.defender)" size="sm" />
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
                        <small>{{ realmName(lastBattle.left.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.left)} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                        <small>{{ realmName(lastBattle.right.realm) }}</small>
                        <div class="duel-fighter-attrs" :aria-label="`${battleDisplayName(lastBattle.right)} 战斗属性`">
                          <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                          <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                        </div>
                        <span>{{ event.round ? `回合 ${event.round}` : "回合 1" }}</span>
                        <p>{{ siegeBattleEventText(event) }}</p>
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
                <span class="war-log-kicker">九州军情司 · 第 {{ selectedProvinceWarDay }} 日</span>
                <h3>攻城战报</h3>
                <p>{{ selectedProvinceWarDate }}，共记录 {{ selectedProvinceWarSummary.total }} 场攻守交锋</p>
                <p class="battle-retention-note">完整攻城战报保留最近 10 天；更早记录每 10 天归档为摘要并清理详情<span v-if="latestBattleArchive">，已归档 {{ battleArchives.length }} 个周期</span>。</p>
              </div>
              <div class="war-log-summary-strip">
                <span class="captured"><small>城池易主</small><b>{{ selectedProvinceWarSummary.captured }}</b><em>攻方得胜</em></span>
                <span class="defended"><small>守城告捷</small><b>{{ selectedProvinceWarSummary.defended }}</b><em>守方得胜</em></span>
                <span class="shown"><small>当前战报</small><b>{{ filteredProvinceWars.length }}</b><em>筛选结果</em></span>
              </div>
            </div>

            <div class="war-log-toolbar">
              <div class="war-log-date-controls">
                <button class="war-day-step" type="button" aria-label="查看前一天战报" @click="changeProvinceWarDay(-1)">
                  <ChevronLeft :size="18" aria-hidden="true" />
                </button>
                <label><span><CalendarDays :size="15" aria-hidden="true" />战报日期</span>
                  <input
                    v-model="selectedProvinceWarDateInput"
                    type="date"
                    :min="provinceWarMinDate"
                    :max="provinceWarMaxDate"
                    step="1"
                    aria-label="选择攻城记录日期"
                  >
                </label>
                <button class="war-day-step" type="button" :disabled="selectedProvinceWarDay >= state.day" aria-label="查看后一天战报" @click="changeProvinceWarDay(1)">
                  <ChevronRight :size="18" aria-hidden="true" />
                </button>
              </div>
              <label class="war-search"><span><Search :size="15" aria-hidden="true" />检索战报</span>
                <span class="search-field">
                  <input v-model.trim="provinceWarSearch" type="search" placeholder="输入省份或宗门名称">
                  <button v-if="provinceWarSearch" class="search-clear" type="button" aria-label="清空攻城记录搜索" @click="provinceWarSearch = ''">×</button>
                </span>
              </label>
              <label class="war-filter"><span>战果筛选</span>
                <select v-model="provinceWarOutcomeFilter" aria-label="筛选攻城战果">
                  <option value="all">全部战果</option>
                  <option value="captured">攻破城市</option>
                  <option value="defended">守住城市</option>
                </select>
              </label>
              <label class="war-filter"><span>城市档位</span>
                <select v-model="provinceWarTierSort" aria-label="城市档位排序">
                  <option value="default">原始顺序</option>
                  <option value="desc">档位高到低</option>
                  <option value="asc">档位低到高</option>
                </select>
              </label>
            </div>

            <div class="war-day-list" v-if="selectedProvinceWarDayRecord">
              <button v-for="(war, warIndex) in filteredProvinceWars" :key="war.id" class="war-matchup-card" :class="{ captured: war.captured, defended: !war.captured }" type="button" :aria-label="`查看${war.provinceName}攻城战详情`" @click="openProvinceWarDetail(war)">
                <div class="war-matchup-head">
                  <div class="war-battle-identity">
                    <span class="war-battle-number">第 {{ String(warIndex + 1).padStart(2, "0") }} 战</span>
                    <strong>{{ war.provinceName }}</strong>
                    <small>{{ provinceWarTierText(war) }}</small>
                  </div>
                  <span class="war-outcome" :class="war.captured ? 'captured' : 'defended'">
                    <Sword v-if="war.captured" :size="16" aria-hidden="true" />
                    <ShieldCheck v-else :size="16" aria-hidden="true" />
                    {{ war.captured ? "攻破" : "守住" }}
                  </span>
                </div>

                <div class="war-lineup war-versus-board" v-if="warTeam(war, 'attacker').length || warTeam(war, 'defender').length">
                  <div class="war-team war-team-attacker" :class="{ victor: war.captured, compact: warTeam(war, 'attacker').length > maxSiegeTeamSize }">
                    <span class="war-team-name"><i :style="{ '--banner-color': sectColor(war.attacker) }">攻</i><span><small>攻城方 {{ war.captured ? "· 胜" : "" }}</small>{{ war.attacker }}</span></span>
                    <div class="war-team-row">
                      <div
                        v-for="member in warTeam(war, 'attacker')"
                        :key="`${war.id}-attacker-${member.id || member.name}`"
                        class="war-roster-card"
                      >
                        <span class="war-portrait-frame">
                          <MonsterEmblem v-if="isBattleMonster(member)" :monster="member" size="sm" />
                          <CharacterPortrait v-else :person="battlePerson(member)" size="sm" />
                        </span>
                        <strong>{{ battleDisplayName(member) }}</strong>
                        <small>{{ realmName(member.realm) }}</small>
                      </div>
                    </div>
                  </div>
                  <div class="war-lineup-vs" aria-label="对阵结果">
                    <i></i>
                    <small>{{ war.battles.length ? `${war.battles.length} 场车轮战` : "兵不血刃" }}</small>
                    <strong>战</strong>
                    <span>{{ war.captured ? "攻破城防" : "固守成功" }}</span>
                    <i></i>
                  </div>
                  <div class="war-team war-team-defender" :class="{ victor: !war.captured, compact: warTeam(war, 'defender').length > maxSiegeTeamSize }">
                    <span class="war-team-name defender"><i :style="{ '--banner-color': sectColor(war.defender) }">守</i><span><small>守城方 {{ !war.captured ? "· 胜" : "" }}</small>{{ war.defender }}</span></span>
                    <div class="war-team-row">
                      <div
                        v-for="member in warTeam(war, 'defender')"
                        :key="`${war.id}-defender-${member.id || member.name}`"
                        class="war-roster-card"
                      >
                        <span class="war-portrait-frame">
                          <MonsterEmblem v-if="isBattleMonster(member)" :monster="member" size="sm" />
                          <CharacterPortrait v-else :person="battlePerson(member)" size="sm" />
                        </span>
                        <strong>{{ battleDisplayName(member) }}</strong>
                        <small>{{ realmName(member.realm) }}</small>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="war-direct-capture">
                  <Sword :size="17" aria-hidden="true" /> 无主之地，攻城方直接接管
                </div>

                <div v-if="warStrategyPreview(war).length" class="war-strategy-preview" aria-label="攻守策略摘要">
                  <strong>战术简报</strong>
                  <span v-for="item in warStrategyPreview(war)" :key="`${war.id}-${item}`">{{ item }}</span>
                </div>
                <div class="war-result-footer">
                  <p>{{ war.result }}</p>
                  <span>查看完整战报 <ChevronRight :size="15" aria-hidden="true" /></span>
                </div>
              </button>
              <div v-if="!filteredProvinceWars.length" class="empty">没有符合当前检索、战果或城市档位筛选的战报。</div>
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
              <p class="battle-retention-note">完整切磋战报保留最近 10 天；更早记录每 10 天归档为摘要并清理详情<span v-if="latestBattleArchive">，已归档 {{ battleArchives.length }} 个周期</span>。</p>
              <div class="duel-season-strip" :class="duelSeasonInfo.phase" aria-label="切磋赛季状态">
                <span><i class="duel-mini-icon season" aria-hidden="true"></i>第 {{ duelSeasonInfo.season }} 赛季</span>
                <span>第 {{ duelSeasonInfo.seasonDay }} / {{ duelSeasonInfo.length }} 天</span>
                <span class="duel-phase-chip" :class="duelSeasonInfo.phase">{{ duelPhaseText }}</span>
                <template v-if="duelSeasonInfo.phase === 'ladder'">
                  <span class="duel-gain">胜利 +{{ duelSeasonInfo.winScore }} 分</span>
                  <span class="duel-loss">失败 {{ duelSeasonInfo.lossScore }} 分</span>
                  <span>积分 0-{{ duelSeasonInfo.maxScore }}</span>
                </template>
                <span v-else>淘汰赛不增减段位积分</span>
              </div>
            </div>

            <section class="tournament-ceremony" :class="{ active: duelSeasonInfo.phase === 'tournament' || duelLatestCompletedTournament, complete: Boolean(duelLatestCompletedTournament) }">
              <template v-if="duelLatestCompletedTournament">
                <div class="champion-coronation">
                  <div class="champion-celestial-effect" aria-hidden="true">
                    <i v-for="spark in 12" :key="spark"></i>
                  </div>
                  <button
                    class="champion-portrait-stage"
                    type="button"
                    :title="`查看${duelLatestCompletedTournament.champion?.name || '冠军'}人物详情`"
                    :aria-label="`查看冠军${duelLatestCompletedTournament.champion?.name || ''}人物详情`"
                    @click="openDuelChampion(duelLatestCompletedTournament.champion)"
                  >
                    <Crown class="champion-crown" :size="34" :stroke-width="1.6" aria-hidden="true" />
                    <span class="champion-portrait-frame">
                      <CharacterPortrait :person="withDuelRank(duelLatestCompletedTournament.champion)" size="xl" />
                    </span>
                  </button>

                  <div class="champion-coronation-copy">
                    <span class="champion-season-title">第 {{ duelLatestCompletedTournament.season }} 届天骄淘汰赛</span>
                    <div class="champion-name-lockup">
                      <small>天南魁首</small>
                      <strong>{{ duelLatestCompletedTournament.champion?.name || '未知修士' }}</strong>
                    </div>
                    <p>踏尽群雄，问鼎演武台。此名将高悬于斗法场，直至下一位魁首诞生。</p>
                    <div class="champion-origin">
                      <span>{{ duelLatestCompletedTournament.champion?.sect || '散修' }}</span>
                      <span>{{ realmName(duelLatestCompletedTournament.champion?.realm || 0) }}</span>
                    </div>
                  </div>

                  <div class="champion-reward-podium" aria-label="淘汰赛奖励">
                    <div class="champion-grand-prize">
                      <Trophy :size="28" :stroke-width="1.6" aria-hidden="true" />
                      <span>
                        <b>冠军封赏</b>
                        <strong>350 灵石</strong>
                        <small>修为圆满 · 魁首道韵</small>
                      </span>
                    </div>
                    <div class="champion-secondary-prizes">
                      <span>
                        <b>亚军</b>
                        <strong>{{ duelAwardName(duelLatestCompletedTournament.runnerUp) }} · 220 灵石</strong>
                      </span>
                      <span>
                        <b>四强</b>
                        <strong>{{ duelSemifinalistNames(duelLatestCompletedTournament) }} · 各 100 灵石</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="tournament-ceremony-main">
                  <span class="tournament-mark" aria-hidden="true">冠</span>
                  <div>
                    <strong>{{ duelSeasonInfo.phase === 'tournament' ? (duelTournamentRound?.name || '天骄淘汰赛') : '天骄淘汰赛将在第 53 天开启' }}</strong>
                    <p v-if="duelSeasonInfo.phase === 'ladder'">前 {{ duelSeasonInfo.ladderDays }} 天每日积分演武。积分决定种子，前 56 名获得首轮轮空。</p>
                    <p v-else>第 {{ duelTournamentRound?.round || 1 }} 轮每日一战，满血入场，胜者晋级。</p>
                  </div>
                </div>
                <div class="tournament-reward-list">
                  <span><b>冠军</b> 350 灵石 + 修为圆满 + 道韵</span>
                  <span><b>亚军</b> 220 灵石</span>
                  <span><b>四强</b> 100 灵石</span>
                </div>
              </template>
              <div v-if="championDaoRhyme" class="dao-rhyme-status">
                <b>魁首道韵</b><span>下次突破 +10%，突破成功前持续</span>
              </div>
            </section>

            <section ref="tournamentBracketPanel" v-if="duelTournament" class="tournament-bracket-panel">
              <div class="tournament-bracket-head">
                <div><strong>天骄签表</strong><span>种子与晋级路径已锁定，未到赛日保留空位。</span></div>
                <div class="tournament-bracket-tools">
                  <em v-if="playerTournamentEntry">你的种子：{{ playerTournamentEntry.seed }} 号</em>
                  <div class="tournament-zoom-controls" aria-label="签表缩放控制">
                    <button type="button" title="缩小签表" aria-label="缩小签表" @click="adjustTournamentZoom(-0.1)"><ZoomOut :size="15" /></button>
                    <span>{{ Math.round(tournamentBracketZoom * 100) }}%</span>
                    <button type="button" title="放大签表" aria-label="放大签表" @click="adjustTournamentZoom(0.1)"><ZoomIn :size="15" /></button>
                    <button type="button" title="复位签表视图" aria-label="复位签表视图" @click="resetTournamentBracketView"><LocateFixed :size="15" /></button>
                    <button type="button" :title="tournamentBracketFullscreen ? '退出全屏查看' : '全屏查看签表'" :aria-label="tournamentBracketFullscreen ? '退出全屏查看签表' : '全屏查看签表'" @click="toggleTournamentBracketFullscreen">
                      <component :is="tournamentBracketFullscreen ? Minimize2 : Maximize2" :size="15" />
                    </button>
                  </div>
                </div>
              </div>
              <div
                ref="tournamentBracketViewport"
                class="tournament-bracket-viewport"
                aria-label="天骄淘汰赛完整对阵图"
                @wheel.prevent="onTournamentBracketWheel"
                @pointerdown="startTournamentBracketPan"
                @pointermove="moveTournamentBracketPan"
                @pointerup="endTournamentBracketPan"
                @pointercancel="endTournamentBracketPan"
              >
                <div class="tournament-bracket-canvas" :style="tournamentBracketCanvasStyle">
                  <svg
                    class="tournament-bracket-links"
                    width="2312"
                    height="13500"
                    viewBox="0 0 2312 13500"
                    aria-hidden="true"
                  >
                    <path v-for="connector in tournamentBracketConnectors" :key="connector.id" :d="connector.path" />
                  </svg>
                  <section
                    v-for="(round, roundIndex) in tournamentBracketRounds"
                    :key="`round-${round.round}`"
                    class="tournament-bracket-round"
                    :class="{ collapsed: isTournamentRoundCollapsed(round) }"
                    :style="tournamentRoundStyle(roundIndex)"
                    :aria-label="round.name"
                  >
                    <h4>
                      <span>第 {{ round.day }} 日</span>
                      <strong>{{ round.name }}</strong>
                      <button
                        v-if="canToggleTournamentRound(round, roundIndex)"
                        type="button"
                        :title="isTournamentRoundCollapsed(round) ? '显示本日记录' : '隐藏本日记录'"
                        :aria-label="isTournamentRoundCollapsed(round) ? `显示第${round.day}日记录` : `隐藏第${round.day}日记录`"
                        @click.stop="toggleTournamentRound(round)"
                      >
                        <component :is="isTournamentRoundCollapsed(round) ? Eye : EyeOff" :size="14" />
                      </button>
                    </h4>
                    <template v-for="(match, matchIndex) in round.matches" :key="match.id">
                      <article
                        v-if="!isTournamentRoundCollapsed(round)"
                        class="tournament-canvas-match"
                        :class="{ player: isTournamentPlayerMatch(match), bye: match.type === 'bye', resolved: Boolean(match.winner), pending: !match.left && !match.right }"
                        :style="tournamentMatchPosition(roundIndex, matchIndex)"
                      >
                      <header><em>{{ tournamentMatchStatus(match) }}</em></header>
                      <div class="tournament-canvas-combatant" :class="{ winner: match.winner?.id === match.left?.id, empty: !match.left }">
                        <CharacterPortrait v-if="match.left" :person="matchPerson(match.left)" size="xs" />
                        <i v-if="match.left?.seed">{{ match.left.seed }}</i>
                        <b>{{ tournamentCombatantLabel(match.left, tournamentSlotLabel(match, 'left')) }}</b>
                      </div>
                      <div class="tournament-canvas-combatant" :class="{ winner: match.winner?.id === match.right?.id, empty: !match.right }">
                        <CharacterPortrait v-if="match.right" :person="matchPerson(match.right)" size="xs" />
                        <i v-if="match.right?.seed">{{ match.right.seed }}</i>
                        <b>{{ match.type === 'bye' ? '轮空晋级' : tournamentCombatantLabel(match.right, tournamentSlotLabel(match, 'right')) }}</b>
                      </div>
                      </article>
                    </template>
                  </section>
                </div>
              </div>
            </section>

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
                <input
                  v-model="selectedDuelCalendarDate"
                  type="date"
                  :min="duelDateMin"
                  :max="duelDateMax"
                  step="1"
                  aria-label="查看日期"
                />
              </label>
              <label class="duel-search war-search">
                <span class="search-field">
                  <input v-model.trim="duelSearch" type="search" placeholder="搜索姓名 / 宗门">
                  <button v-if="duelSearch" class="search-clear" type="button" aria-label="清空切磋搜索" @click="duelSearch = ''">×</button>
                </span>
              </label>
              <button class="secondary duel-nav-button" type="button" :disabled="selectedDuelDay >= state.day" @click="changeDuelDay(1)">后一天</button>
              <button class="primary duel-start-button" type="button" @click="startDailyDuels">{{ duelSeasonInfo.phase === 'tournament' ? (duelTournamentRound?.day === state.day ? '查看今日赛程' : '推进淘汰赛') : (todaysDuelRecord ? '查看今日切磋' : '开始切磋') }}</button>
            </div>

            <div class="duel-system-grid">
              <section class="duel-match-board">
                <div class="duel-board-title">
                  <h3>{{ selectedDuelRecord?.tournament ? `${selectedDuelRecord.tournamentName} · 今日对阵` : '今日对阵' }}</h3>
                  <span v-if="selectedDuelRecord">{{ selectedDuelRecord.createdAt }}</span>
                  <span v-else>未开赛</span>
                </div>

                <div class="match-list" v-if="selectedDuelRecord && !duelMatchPageLoading">
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
                      <div class="duel-rank-stamp" :class="`duel-rank-${duelRankId(match.left)}`">
                        <i class="duel-rank-medal" aria-hidden="true"></i>
                        <span>{{ duelRankName(match.left) }}</span>
                        <small>{{ duelRankScoreText(match.left) }}</small>
                      </div>
                      <div class="duel-match-vs">
                        <strong>VS</strong>
                        <span>第 {{ match.order || index + 1 }} 场</span>
                      </div>
                      <div class="duel-rank-stamp" :class="`duel-rank-${duelRankId(match.right)}`">
                        <i class="duel-rank-medal" aria-hidden="true"></i>
                        <span>{{ duelRankName(match.right) }}</span>
                        <small>{{ duelRankScoreText(match.right) }}</small>
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
                      <div class="duel-rank-stamp" :class="`duel-rank-${duelRankId(match.winner)}`">
                        <i class="duel-rank-medal" aria-hidden="true"></i>
                        <span>{{ duelRankName(match.winner) }}</span>
                        <small>{{ duelRankScoreText(match.winner) }}</small>
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

                <div v-if="selectedDuelRecord && duelMatchPageLoading" class="empty duel-empty">正在载入本页对阵...</div>
                <div v-if="selectedDuelRecord && duelMatchPage.totalPages > 0" class="duel-match-pager" aria-label="今日对阵分页">
                  <button class="secondary" type="button" :disabled="duelMatchPage.page <= 1 || duelMatchPageLoading" @click="changeDuelMatchPage(-1)">上一页</button>
                  <span>第 {{ duelMatchPage.page }} / {{ duelMatchPage.totalPages }} 页 · 共 {{ duelMatchPage.total }} 场</span>
                  <button class="secondary" type="button" :disabled="duelMatchPage.page >= duelMatchPage.totalPages || duelMatchPageLoading" @click="changeDuelMatchPage(1)">下一页</button>
                </div>

                <div v-if="!selectedDuelRecord && duelMatchPageLoading" class="empty duel-empty">正在读取本日切磋记录...</div>
                <div v-else-if="!selectedDuelRecord && selectedDuelDay === state.day" class="empty duel-empty">{{ currentDate }} 尚未开赛。</div>
                <div v-else-if="!selectedDuelRecord" class="empty duel-empty">没有找到 {{ selectedDuelDate }} 的切磋记录。</div>
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
                      <small>{{ realmName(lastBattle.left.realm) }}</small>
                      <div class="duel-fighter-attrs" :aria-label="`${lastBattle.left.name} 战斗属性`">
                        <span class="root">{{ battleRootName(lastBattle.left) }}</span>
                        <span v-for="stat in battleCompactStats(lastBattle.left)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                      <small>{{ realmName(lastBattle.right.realm) }}</small>
                      <div class="duel-fighter-attrs" :aria-label="`${lastBattle.right.name} 战斗属性`">
                        <span class="root">{{ battleRootName(lastBattle.right) }}</span>
                        <span v-for="stat in battleCompactStats(lastBattle.right)" :key="stat.label">{{ stat.short }}{{ stat.value }}</span>
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
                <small>第 {{ gameState.day ?? 0 }} 日行情</small>
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
                    <span class="market-product-icon" aria-hidden="true"><img :src="marketItemIconSrc(item)" alt="" loading="lazy"></span>
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
                    <span class="market-product-icon" aria-hidden="true"><img :src="marketItemIconSrc(entry.item)" alt="" loading="lazy"></span>
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
                <span class="market-detail-orb" aria-hidden="true">
                  <img :src="marketItemIconSrc(selectedMarketItem)" alt="" loading="lazy">
                </span>
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
                    <span class="market-bag-mini-icon" aria-hidden="true"><img :src="marketItemIconSrc(entry.item)" alt="" loading="lazy"></span>
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
                <p>唯一装备 · 含真品与仿制品 · 自动穿戴最优同部位。</p>
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
                :class="[`tier-${item.tier}`, { owned: item.ownerName, equipped: item.equipped, replica: item.isReplica }]"
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
              <span class="rank-count">{{ rankRosterReady ? `共 ${filteredRanking.length} 条` : "正在读取榜单" }}</span>
            </div>
            <div v-if="!rankRosterReady" class="rank-loading-state">
              正在读取天南修士名录...
            </div>
            <div v-else class="rank-list">
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
                <div class="rank-copy">
                  <strong>{{ item.name }}<small v-if="isNpcFortuneResonant(rankPerson(item))" class="npc-fortune-badge">天运共鸣</small></strong>
                  <small>{{ item.subtitle }}</small>
                  <span v-if="activeRankBoard === 'combat'" class="combat-rank-components" aria-hidden="true">
                    <i :style="{ '--combat-score': `${item.rating.dungeonScore}%` }">副本 {{ Math.round(item.rating.dungeonScore) }}</i>
                    <i :style="{ '--combat-score': `${item.rating.duelScore}%` }">切磋 {{ Math.round(item.rating.duelScore) }}</i>
                    <i :style="{ '--combat-score': `${item.rating.provinceScore}%` }">攻守 {{ Math.round(item.rating.provinceScore) }}</i>
                  </span>
                </div>
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
            <div class="dossier-frame">
              <div class="detail-hero compact dossier-header">
                <button class="secondary back-button dossier-back-button" @click="returnFromDetail">{{ detailBackLabel }}</button>
                <div>
                  <h3>{{ selectedPerson.name }}<small v-if="isNpcFortuneResonant(selectedPerson)" class="npc-fortune-badge dossier-fortune-badge">天运共鸣</small></h3>
                  <p>
                    <span>宗门：{{ selectedPerson.sect }}</span>
                    <span>性别：{{ genderLabel(selectedPerson.gender) }}</span>
                    <span>境界：{{ realmName(selectedPerson.realm) }}</span>
                    <span class="dossier-root-line">
                      <span>根线：</span>
                      <span
                        v-for="(root, rootIndex) in rootList(selectedPerson)"
                        :key="`${selectedPerson.id}-header-root-${root.key}`"
                        class="dossier-root-hover"
                        tabindex="0"
                      >
                        <span class="dossier-root-name">{{ root.name }}{{ root.key === primaryRoot(selectedPerson).key ? "（主）" : "" }}{{ rootIndex < rootList(selectedPerson).length - 1 ? "、" : "" }}</span>
                        <span class="dossier-root-tooltip" role="tooltip">
                          <strong>{{ root.name }} · {{ root.key === primaryRoot(selectedPerson).key ? "主灵根" : "副灵根" }}</strong>
                          <span>基础：{{ rootEffectShortText(root) }}</span>
                          <span>当前：{{ rootBonusText(selectedPerson, root) }}</span>
                          <span>{{ rootEfficiencyText(selectedPerson) }}</span>
                        </span>
                      </span>
                    </span>
                  </p>
                </div>
                <div class="dossier-header-tags">
                  <span class="tag skill-detail-tag" :title="skillTip(selectedPerson)">本命神通：{{ skillNameForDisplay(selectedPerson) }}</span>
                  <span class="tag rank-tag" :class="`duel-rank-${duelRankId(selectedPerson)}`">斗法排名：{{ duelRankText(selectedPerson) }}</span>
                  <span class="tag" :title="talentHint(selectedPerson)">天赋：{{ talentInfo(selectedPerson).grade }} · {{ talentInfo(selectedPerson).score }}</span>
                  <span v-if="selectedPerson.championDaoRhyme?.active && selectedPerson.championDaoRhyme.realm === selectedPerson.realm" class="tag dossier-champion-tag">魁首道韵 · 突破 +10%</span>
                  <span class="tag">{{ rootCounterText(selectedPerson) }}</span>
                  <span class="tag equipment-count-tag">装备：{{ equippedFor(selectedPerson).length }}/{{ equipmentSlots.length }}</span>
                </div>
              </div>

              <div class="detail-overview dossier-overview">
                <div class="detail-side-stats dossier-stat-bank">
                <div
                  class="detail-box"
                  v-for="item in personStats(selectedPerson).slice(0, 6)"
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
                    <div class="equipment-slot-card" v-for="slot in dossierEquipmentSlotColumns[0]" :key="slot.id" :class="equipmentSlotCardClass(selectedPerson, slot)" tabindex="0" :title="equipmentSlotTooltip(selectedPerson, slot)" :aria-label="equipmentSlotTooltip(selectedPerson, slot)">
                      <EquipmentIcon v-if="equippedInSlot(selectedPerson, slot.id)" :id="equippedInSlot(selectedPerson, slot.id)?.id" :name="equippedInSlot(selectedPerson, slot.id)?.name" :slot="slot.id" :tier="equippedInSlot(selectedPerson, slot.id)?.tier" />
                      <span>{{ slot.name }}</span>
                      <strong v-if="!equippedInSlot(selectedPerson, slot.id)">空</strong>
                      <small v-if="!equippedInSlot(selectedPerson, slot.id)">{{ equipmentSlotSummary(selectedPerson, slot) }}</small>
                      <div v-if="equippedInSlot(selectedPerson, slot.id)" class="equipment-slot-tooltip" role="tooltip">
                        <strong>{{ equippedInSlot(selectedPerson, slot.id)?.name }}</strong>
                        <span>{{ equipmentSlotSummary(selectedPerson, slot) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="equipment-character-core">
                    <CharacterPortrait :person="withDuelRank(selectedPerson)" size="xl" />
                    <div class="dossier-power-line" :aria-label="`战斗力：${personPower(selectedPerson)}`">
                      <span>战斗力：<b>{{ personPower(selectedPerson) }}</b></span>
                    </div>
                    <div class="dossier-combat-rating" :class="{ provisional: !selectedPersonCombatRating.sampleEnough }" :aria-label="selectedPersonCombatRatingLabel">
                      <span>战斗评分</span>
                      <strong>{{ selectedPersonCombatRating.score }}</strong>
                    </div>
                  </div>
                  <div class="equipment-slot-column">
                    <div class="equipment-slot-card" v-for="slot in dossierEquipmentSlotColumns[1]" :key="slot.id" :class="equipmentSlotCardClass(selectedPerson, slot)" tabindex="0" :title="equipmentSlotTooltip(selectedPerson, slot)" :aria-label="equipmentSlotTooltip(selectedPerson, slot)">
                      <EquipmentIcon v-if="equippedInSlot(selectedPerson, slot.id)" :id="equippedInSlot(selectedPerson, slot.id)?.id" :name="equippedInSlot(selectedPerson, slot.id)?.name" :slot="slot.id" :tier="equippedInSlot(selectedPerson, slot.id)?.tier" />
                      <span>{{ slot.name }}</span>
                      <strong v-if="!equippedInSlot(selectedPerson, slot.id)">空</strong>
                      <small v-if="!equippedInSlot(selectedPerson, slot.id)">{{ equipmentSlotSummary(selectedPerson, slot) }}</small>
                      <div v-if="equippedInSlot(selectedPerson, slot.id)" class="equipment-slot-tooltip" role="tooltip">
                        <strong>{{ equippedInSlot(selectedPerson, slot.id)?.name }}</strong>
                        <span>{{ equipmentSlotSummary(selectedPerson, slot) }}</span>
                      </div>
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
                  v-for="item in personStats(selectedPerson).slice(6)"
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

            <div class="panel flat dossier-pearl-panel dossier-pearl-strip dossier-treasury">
                <div class="dossier-pearl-head">
                  <div class="dossier-pearl-title">
                    <small>灵藏宝匣 · SPIRIT TREASURY</small>
                    <h3>灵珠资产</h3>
                    <span>每日结算：每 10 灵尘自动换 1 枚随机一阶碎片</span>
                  </div>
                  <div class="dossier-pearl-summary" aria-label="灵珠资产汇总">
                    <span><small>灵尘</small><b>{{ personSpiritPearls(selectedPerson).dust || 0 }}</b></span>
                    <span><small>碎片总计</small><b>{{ personPearlFragmentTotal(selectedPerson) }}</b></span>
                    <span><small>已凝成</small><b>{{ personFormedPearlCount(selectedPerson) }} / 9</b></span>
                  </div>
                </div>
                <div v-if="hasPersonSpiritPearlSnapshot(selectedPerson)" class="dossier-pearl-grid">
                  <span
                    v-for="pearl in personSpiritPearls(selectedPerson).pearls || []"
                    :key="`${selectedPerson.id}-pearl-${pearl.id}`"
                    class="dossier-pearl-item"
                    :class="[
                      personPearlTierClass(pearl),
                      { formed: pearl.tier > 0, matched: pearl.tier > 0 && pearl.matchMultiplier > 1 }
                    ]"
                    tabindex="0"
                  >
                    <span class="dossier-pearl-orb">
                      <img :src="rootIconPath(pearl.config?.rootKey || pearl.id)" alt="" width="96" height="96" decoding="async">
                    </span>
                    <small>{{ pearl.config?.name || pearl.name }}</small>
                    <b>{{ personPearlStatusText(pearl) }}</b>
                    <span class="dossier-pearl-progress" aria-hidden="true"><i :style="{ width: `${personPearlProgressInfo(pearl).percent}%` }"></i></span>
                    <span class="dossier-pearl-tooltip" role="tooltip">
                      <span class="dossier-pearl-tooltip-head">
                        <span><strong>{{ pearl.config?.name || pearl.name }}</strong><small>{{ personPearlStatusText(pearl) }}</small></span>
                      </span>
                      <span><small>材料分阶</small><b>{{ personPearlFragmentBreakdown(pearl) }}</b></span>
                      <span><small>下一步</small><b>{{ personPearlProgressInfo(pearl).detail }}</b></span>
                      <span><small>属性加成</small><b>{{ personPearlEffectText(pearl) }}</b></span>
                      <span><small>灵根契合</small><b>{{ personPearlMatchText(pearl) }}</b></span>
                    </span>
                  </span>
                </div>
                <div v-else-if="personDetailLoading.has(selectedPerson.id)" class="dossier-pearl-grid dossier-pearl-loading" aria-label="灵珠档案读取中" aria-busy="true">
                  <span v-for="index in 9" :key="`${selectedPerson.id}-pearl-skeleton-${index}`" class="dossier-pearl-item dossier-pearl-skeleton" aria-hidden="true">
                    <span class="dossier-pearl-orb"></span>
                    <small></small>
                    <b></b>
                    <span class="dossier-pearl-progress"></span>
                  </span>
                </div>
                <div v-else class="empty">暂无灵珠档案。</div>
            </div>

            <div class="panel flat dossier-combat-panel dossier-combat-summary dossier-ranking-vault" :class="{ 'dossier-history-pending': isPersonDetailHistoryPending(selectedPerson) }">
              <div class="dossier-section-banner">
                <span aria-hidden="true">榜</span>
                <div><small>战绩卷轴</small><strong>排名与战斗走势</strong></div>
              </div>
              <div v-if="isPersonDetailHistoryPending(selectedPerson)" class="dossier-history-loader" aria-label="战绩档案读取中" aria-busy="true">
                <span aria-hidden="true"><i></i><i></i><i></i></span>
                <strong>战绩档案读取中...</strong>
              </div>
              <div class="dossier-ranking-tabs" role="tablist" aria-label="每日排名走势类型">
                <button
                  v-for="tab in dossierRankingTabs"
                  :key="tab.id"
                  class="segment"
                  :class="{ active: activeDossierRanking === tab.id }"
                  type="button"
                  role="tab"
                  :aria-selected="activeDossierRanking === tab.id"
                  @click="activeDossierRanking = tab.id"
                >
                  {{ tab.label }}
                </button>
              </div>
              <template v-if="activeDossierRanking === 'combat'">
              <div class="dossier-combat-head">
                <div>
                  <h3>近十日战斗评分</h3>
                  <p>副本 40% · 切磋 30% · 攻守城 30%</p>
                </div>
                <strong>{{ selectedPersonCombatRating.score }}</strong>
              </div>
              <div class="dossier-combat-components">
                <span><small>副本</small><b>{{ formatCombatComponent(selectedPersonCombatRating.dungeonScore) }}</b><i><em :style="{ width: `${selectedPersonCombatRating.dungeonScore}%` }"></em></i></span>
                <span><small>切磋</small><b>{{ formatCombatComponent(selectedPersonCombatRating.duelScore) }}</b><i><em :style="{ width: `${selectedPersonCombatRating.duelScore}%` }"></em></i></span>
                <span><small>攻守城</small><b>{{ formatCombatComponent(selectedPersonCombatRating.provinceScore) }}</b><i><em :style="{ width: `${selectedPersonCombatRating.provinceScore}%` }"></em></i></span>
              </div>
              <div v-if="selectedPersonCombatTrend.length" class="combat-rating-trend-block">
                <div class="combat-rating-trend" aria-label="最近十日每日战斗评分排名走势">
                  <svg class="combat-rating-line" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
                    <polyline :points="combatRatingTrendPoints(selectedPersonCombatTrend)" />
                    <circle v-for="(entry, index) in selectedPersonCombatTrend" :key="`${selectedPerson.id}-combat-point-${entry.day}`" :cx="combatRatingTrendPointX(index)" :cy="combatRatingTrendPointY(entry)" r="4" />
                  </svg>
                  <span v-for="entry in selectedPersonCombatTrend" :key="`${selectedPerson.id}-combat-${entry.day}`" :title="combatRatingDayTitle(entry)">
                    <i :style="{ height: `${combatRatingRankPercent(entry)}%` }"></i>
                    <small>第{{ entry.rank }}名</small>
                  </span>
                </div>
              </div>
              <p v-else class="empty compact-empty">最近十天暂无实际出战记录。</p>
              </template>
              <template v-else>
                <div class="dossier-combat-head dossier-ranking-head">
                  <div>
                    <h3>{{ activeDossierRankingMeta.title }}</h3>
                    <p>{{ activeDossierRankingMeta.description }}</p>
                  </div>
                  <strong>{{ activeDossierRankingMeta.value }}</strong>
                </div>
                <div v-if="selectedPersonDailyRankingTrend.length" class="combat-rating-trend-block">
                  <div class="combat-rating-trend" :aria-label="activeDossierRankingMeta.ariaLabel">
                    <svg class="combat-rating-line" viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
                      <polyline :points="combatRatingTrendPoints(selectedPersonDailyRankingTrend)" />
                      <circle v-for="(entry, index) in selectedPersonDailyRankingTrend" :key="`${selectedPerson.id}-${activeDossierRanking}-point-${entry.day}`" :cx="combatRatingTrendPointX(index)" :cy="combatRatingTrendPointY(entry)" r="4" />
                    </svg>
                    <span v-for="entry in selectedPersonDailyRankingTrend" :key="`${selectedPerson.id}-${activeDossierRanking}-${entry.day}`" :title="dailyRankingDayTitle(entry)">
                      <i :style="{ height: `${combatRatingRankPercent(entry)}%` }"></i>
                      <small>第{{ entry.rank }}名</small>
                    </span>
                  </div>
                </div>
                <p v-else class="empty compact-empty">最近十天暂无排名记录。</p>
              </template>
            </div>

            <div class="grid detail-sections record-sections dossier-records" :class="{ 'dossier-history-pending': isPersonDetailHistoryPending(selectedPerson) }">
              <div class="panel flat dossier-record-panel dossier-root-panel">
                <h3>根盘</h3>
                <div class="root-chip-list">
                  <span class="root-chip" v-for="root in rootList(selectedPerson)" :key="`${selectedPerson.id}-${root.key}`" :class="{ primary: root.key === primaryRoot(selectedPerson).key }">
                    {{ root.name }}<small>{{ root.key === primaryRoot(selectedPerson).key ? "主" : "副" }} · {{ rootBonusText(selectedPerson, root) }}</small>
                  </span>
                </div>
                <ul class="root-summary-list">
                  <li v-for="line in rootSummaryLines(selectedPerson)" :key="line">{{ line }}</li>
                </ul>
              </div>
              <div class="panel flat dossier-record-panel dossier-forecast-panel">
                <h3>明日预估</h3>
                <div class="attribute-list compact">
                  <div class="attribute-row">
                    <span>经验</span>
                    <strong>{{ tomorrowXpTotal(selectedPerson) }}</strong>
                    <small>{{ tomorrowXpText(selectedPerson) }}</small>
                  </div>
                  <div class="attribute-row">
                    <span>突破</span>
                    <strong>{{ formatPercent(personInsight(selectedPerson).breakthrough.total) }}</strong>
                    <small>{{ breakthroughPartsText(selectedPerson) }}</small>
                  </div>
                </div>
              </div>
              <div v-if="isPersonDetailHistoryPending(selectedPerson)" class="panel flat dossier-record-panel dossier-history-loader" aria-label="人物历史读取中" aria-busy="true">
                <span aria-hidden="true"><i></i><i></i><i></i></span>
                <strong>人物历史读取中...</strong>
              </div>
              <div class="panel flat dossier-record-panel dossier-growth-panel">
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
              <div class="panel flat dossier-record-panel dossier-breakthrough-panel">
                <h3>突破记录</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ bad: !record.success, gold: record.success }" v-for="record in selectedPerson.breakthroughs" :key="`${record.day}-${record.from}-${record.to}`">
                    <strong>{{ shortDisplayDate(record) }} · {{ record.from }} → {{ record.to }} · {{ record.success ? "成功" : "失败" }}</strong>
                    <span>{{ breakthroughRecordMetaText(record) }}</span>
                  </div>
                  <div v-if="!selectedPerson.breakthroughs.length" class="empty">暂无突破记录。</div>
                </div>
              </div>
              <div class="panel flat dossier-record-panel dossier-dungeon-panel">
                <h3>秘境记录</h3>
                <p v-if="selectedPerson.daoTrialDefenses" class="dao-trial-defense-summary">
                  问道守关 {{ selectedPerson.daoTrialDefenses }} 次 · 得胜 {{ selectedPerson.daoTrialWins || 0 }} 次 · 累计获得修为 {{ selectedPerson.daoTrialRewards?.xp || 0 }}、灵石 {{ selectedPerson.daoTrialRewards?.spirit || 0 }}、灵尘 {{ selectedPerson.daoTrialRewards?.dust || 0 }}
                </p>
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
              <div class="panel flat dossier-record-panel pearl-history-panel">
                <h3>灵珠流水 · 近30天</h3>
                <div class="timeline detail-scroll">
                  <div
                    class="event"
                    :class="{ gold: pearlHistoryIsExchange(record) || pearlHistoryIsUpgrade(record) }"
                    v-for="record in personPearlHistory(selectedPerson)"
                    :key="pearlHistoryKey(record)"
                  >
                    <strong>{{ pearlHistoryTitle(record) }}</strong>
                    <span>{{ pearlHistoryMeta(record) }}</span>
                  </div>
                  <div v-if="!personPearlHistory(selectedPerson).length" class="empty">近 30 天暂无灵尘或灵珠记录。</div>
                </div>
              </div>
              <div class="panel flat dossier-record-panel dossier-duel-panel">
                <h3>切磋战绩</h3>
                <p>第 {{ duelSeasonInfo.season }} 赛季：{{ duelRankText(selectedPerson) }}，{{ selectedPerson.duelSeason?.wins || 0 }} 胜 {{ selectedPerson.duelSeason?.losses || 0 }} 负；累计 {{ selectedPerson.duelWins || 0 }} 胜 {{ selectedPerson.duelLosses || 0 }} 负。</p>
                <div class="duel-history-strip" v-if="selectedPerson.duelSeasonHistory?.length">
                  <span v-for="record in selectedPerson.duelSeasonHistory" :key="`${selectedPerson.id}-season-${record.season}`" class="duel-season-badge" :class="`duel-rank-${record.rankId}`">
                    S{{ record.season }} {{ record.rankName }} {{ record.score }}分<span v-if="record.spiritReward"> · +{{ record.spiritReward }}灵石</span>
                  </span>
                </div>
                <div class="duel-history-strip" v-if="selectedPerson.duelTournamentAwards?.length" aria-label="切磋淘汰赛奖励">
                  <span v-for="award in selectedPerson.duelTournamentAwards" :key="`${selectedPerson.id}-tournament-${award.season}-${award.place}`" class="duel-tournament-badge" :class="{ champion: award.place === '冠军' }">
                    S{{ award.season }} 淘汰赛·{{ award.place }} · +{{ award.spirit }}灵石
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
              <div class="panel flat dossier-record-panel dossier-skill-panel">
                <h3>技能升阶</h3>
                <div class="timeline detail-scroll">
                  <div class="event" :class="{ gold: skillUpgradeRecordSucceeded(record), bad: !skillUpgradeRecordSucceeded(record) }" v-for="record in selectedPerson.skillUpgrades || []" :key="`${record.day}-${record.skillId}-${record.toRank}-${record.success === false ? 'fail' : 'success'}`">
                    <strong>{{ skillUpgradeRecordTitle(record) }}</strong>
                    <span>{{ skillUpgradeRecordMetaText(record) }}</span>
                  </div>
                  <div v-if="!selectedPerson.skillUpgrades?.length" class="empty">暂无技能升阶记录。</div>
                </div>
              </div>
              <div class="panel flat dossier-record-panel dossier-encounter-panel">
                <div class="dossier-encounter-head">
                  <h3>{{ selectedPerson.id === "player" ? "因缘总览" : "与你的因缘" }}</h3>
                  <button
                    v-if="selectedPerson.id !== 'player'"
                    class="secondary compact-button"
                    type="button"
                    :disabled="isActionPending('/api/encounters/focus')"
                    @click="toggleEncounterFocus(selectedPerson)"
                  >
                    <Handshake :size="14" aria-hidden="true" />
                    {{ selectedPersonRelationship?.focused ? "取消关注" : "关注此人" }}
                  </button>
                </div>
                <div v-if="selectedPersonRelationship" class="relationship-gauges">
                  <div>
                    <span><b>{{ selectedPersonRelationship.title }}</b><small>{{ selectedPersonRelationship.interactions || 0 }} 次往来</small></span>
                  </div>
                  <label>
                    <span>交情 <b>{{ selectedPersonRelationship.affinity }}</b></span>
                    <i><em :style="{ width: `${Math.max(0, Math.min(100, (selectedPersonRelationship.affinity + 100) / 2))}%` }"></em></i>
                  </label>
                  <label>
                    <span>敬意 <b>{{ selectedPersonRelationship.respect }}</b></span>
                    <i><em :style="{ width: `${Math.max(0, Math.min(100, selectedPersonRelationship.respect))}%` }"></em></i>
                  </label>
                </div>
                <div class="timeline detail-scroll encounter-detail-scroll">
                  <button
                    v-for="record in selectedPersonEncounterHistory"
                    :key="`${record.id}-${record.resolvedDay}`"
                    class="event event-button"
                    :class="{ replayable: record.replayId, gold: record.rarity === 'rare' || record.rarity === 'fated' }"
                    type="button"
                    :disabled="!record.replayId"
                    @click="openEncounterReplay(record)"
                  >
                    <strong>{{ record.title }} · {{ record.choiceLabel }}</strong>
                    <span>{{ record.outcome }}</span>
                    <small>对方：{{ encounterCounterpartName(record, selectedPerson) }} · 第 {{ record.resolvedDay }} 天 · {{ record.relationTitle || record.categoryLabel }}</small>
                  </button>
                  <div v-if="!selectedPersonEncounterHistory.length" class="empty">暂无因缘纪事。</div>
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
              <div ref="sectMemberPanelEl" class="panel flat sect-member-panel">
                <div class="section-head compact">
                  <div>
                    <h3>人物列表</h3>
                    <p>{{ sectMembers(selectedSect).length }} 人 · 按战力展示宗门成员</p>
                  </div>
                </div>
                <div class="sect-member-grid">
                  <button class="sect-member-card" :class="{ leader: member.id === selectedSect.leaderId, elder: (selectedSect.elderIds || []).includes(member.id) }" v-for="member in sectMembers(selectedSect)" :key="member.id" @click="openPersonById(member.id)">
                    <CharacterPortrait :person="member" size="md" />
                    <div class="sect-member-main">
                      <div class="sect-member-topline">
                        <span class="tag">{{ realmName(member.realm) }}</span>
                        <span v-if="sectMemberOffice(selectedSect, member) && member.id !== selectedSect.leaderId && !(selectedSect.elderIds || []).includes(member.id)" class="member-badge office">{{ sectMemberOffice(selectedSect, member) }}</span>
                        <span class="member-badge" :class="{ player: member.isPlayer }">{{ member.isPlayer ? "你" : "NPC" }}</span>
                      </div>
                      <strong>{{ member.name }}<small v-if="isNpcFortuneResonant(member)" class="npc-fortune-badge">天运共鸣</small></strong>
                      <small class="sect-member-meta">
                        <span>{{ genderLabel(member.gender) }}</span>
                        <i aria-hidden="true">·</i>
                        <span class="sect-member-fatigue" :class="{ tired: (sectMemberFatigue(member) ?? 0) >= 8 }">
                          {{ sectMemberFatigue(member) === null ? "疲劳未知" : `疲劳 ${sectMemberFatigue(member)}` }}
                        </span>
                      </small>
                    </div>
                    <div class="sect-member-power">
                      <b>{{ member.power }}</b>
                      <span>战力</span>
                    </div>
                  </button>
                </div>
              </div>
              <div ref="sectWarPanelEl" class="panel flat sect-war-panel" :style="sectWarPanelHeight ? { height: `${sectWarPanelHeight}px` } : null">
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
                <p>管理普通用户存档；修改会同步影响该用户及其 NPC。</p>
              </div>
              <div class="admin-head-actions">
                <div class="admin-day-badge" aria-label="当前游戏日">
                  <span>普通用户游戏日</span>
                  <strong>第 {{ state?.day ?? 0 }} 天</strong>
                </div>
                <label v-if="!['accounts', 'settings'].includes(adminMode)" class="admin-search">
                  <span>搜索</span>
                  <input v-model.trim="adminSearch" :placeholder="adminMode === 'cultivators' ? '人物名或宗门名' : adminMode === 'sects' ? '宗门名' : adminMode === 'tasks' ? '任务名或分类' : '搜索指导书'">
                </label>
                <div class="segmented">
                  <button class="segment" :class="{ active: adminMode === 'accounts' }" type="button" @click="adminMode = 'accounts'">账户</button>
                  <button class="segment" :class="{ active: adminMode === 'cultivators' }" type="button" @click="adminMode = 'cultivators'">角色</button>
                  <button class="segment" :class="{ active: adminMode === 'sects' }" type="button" @click="adminMode = 'sects'">宗门</button>
                  <button class="segment" :class="{ active: adminMode === 'tasks' }" type="button" @click="adminMode = 'tasks'">现实任务</button>
                  <button class="segment" :class="{ active: adminMode === 'settings' }" type="button" @click="adminMode = 'settings'">游戏设置</button>
                </div>
              </div>
            </div>

            <section class="admin-game-actions" aria-label="存档与结算操作">
              <div class="admin-game-actions-copy">
                <span>存档与结算</span>
                <strong>仅在需要时手动干预游戏进程</strong>
                <small>推进一天会结算攻守城、副本、灵珠与切磋；重开一世会清空当前本地存档。</small>
              </div>
              <div class="admin-game-actions-buttons">
                <button class="secondary" :disabled="isActionPending('/api/day/advance')" @click="openRiskConfirmation('advance')">{{ isActionPending("/api/day/advance") ? "结算中..." : "推进一天" }}</button>
                <button class="danger" :disabled="isActionPending('/api/reset')" @click="openRiskConfirmation('reset')">重开一世</button>
              </div>
            </section>

            <div v-if="adminMode === 'accounts'" class="admin-layout">
              <div class="admin-list" role="list" aria-label="账户列表">
                <button
                  v-for="account in adminAccounts"
                  :key="account.id"
                  class="admin-list-row admin-account-row"
                  :class="{ active: adminSelectedAccountId === account.id }"
                  type="button"
                  @click="selectManagedAdminAccount(account.id)"
                >
                  <span>
                    <strong>{{ account.username }}</strong>
                    <small>{{ account.id }}</small>
                  </span>
                  <b>{{ adminSelectedAccountId === account.id ? "管理中" : account.active ? "自动推进" : account.hasSave ? "存档" : "未建档" }}</b>
                </button>
                <div v-if="adminAccountsLoading" class="admin-editor empty">正在读取账户...</div>
                <div v-else-if="!adminAccounts.length" class="admin-editor empty">暂无普通用户。</div>
              </div>

              <section v-if="adminSelectedAccount" class="admin-editor admin-account-editor">
                <div class="admin-editor-head">
                  <div>
                    <span>账户推进</span>
                    <strong>{{ adminSelectedAccount.username }}</strong>
                    <small>当前后台操作目标；{{ adminSelectedAccount.active ? "参与每日自动推进" : "已暂停每日自动推进" }}</small>
                  </div>
                </div>
                <div class="admin-account-facts">
                  <span>存档 ID <b>{{ adminSelectedAccount.id }}</b></span>
                  <span>创建时间 <b>{{ formatDateTime(adminSelectedAccount.createdAt) }}</b></span>
                  <span>最后登录 <b>{{ adminSelectedAccount.lastLoginAt ? formatDateTime(adminSelectedAccount.lastLoginAt) : "未记录" }}</b></span>
                  <span>存档大小 <b>{{ formatBytes(adminSelectedAccount.saveBytes) }}</b></span>
                </div>
                <div class="admin-actions">
                  <button class="primary" type="button" :disabled="adminAccountsSaving" @click="setActiveAdminAccount(adminSelectedAccount.id, !adminSelectedAccount.active)">
                    {{ adminAccountsSaving ? "保存中..." : adminSelectedAccount.active ? "暂停自动推进" : "启用自动推进" }}
                  </button>
                  <button class="secondary" type="button" :disabled="adminAccountsLoading" @click="loadAdminAccounts">刷新账户</button>
                </div>
              </section>
              <div v-else class="admin-editor empty">选择一个普通用户作为每日结算账户。</div>
            </div>

            <div v-else-if="adminMode === 'cultivators'" class="admin-layout">
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
                    <label>
                      <span>预期境界</span>
                      <select v-model.number="adminCultivatorDraft.potentialRealm">
                        <option v-for="(realm, index) in catalog.realms || []" :key="`admin-potential-${index}`" :value="index">{{ realm }}</option>
                      </select>
                    </label>
                    <label>
                      <span>天赋模式</span>
                      <select v-model="adminCultivatorDraft.talentMode">
                        <option value="auto">随预期境界随机</option>
                        <option value="manual">手动锁定</option>
                      </select>
                    </label>
                    <label v-if="adminCultivatorDraft.talentMode === 'manual'">
                      <span>天赋分数</span>
                      <input v-model.number="adminCultivatorDraft.talentScore" type="number" min="1" max="100" step="1">
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

            <div v-else-if="adminMode === 'tasks'" class="admin-layout">
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
                  <button class="primary" type="submit" :disabled="isActionPending(adminTaskDraft.id ? '/api/admin/task-definitions/update' : '/api/admin/task-definitions')">保存任务</button>
                </div>
              </form>
            </div>

            <form v-else-if="adminMode === 'settings'" class="admin-editor admin-game-settings" @submit.prevent="saveGameSettings">
              <div class="admin-editor-head">
                <div>
                  <strong>任务、战斗与播报设置</strong>
                  <small>调整后会立即应用到后续任务结算、战斗回放和顶部今日播报。</small>
                </div>
              </div>
              <div class="admin-editor-section">
                <div class="admin-section-title">每日有效任务修为</div>
                <label>
                  <span>满额额度</span>
                  <input v-model.number="adminGameSettingsDraft.taskDailyFullXpBudget" type="number" min="0" max="100000" step="1">
                  <small>当天累计基础修为超过此额度后，超出部分按既有衰减规则结算。</small>
                </label>
              </div>
              <div class="admin-editor-section">
                <div class="admin-section-title">战斗回放速度</div>
                <label>
                  <span>播放倍率</span>
                  <select v-model.number="adminGameSettingsDraft.battleReplaySpeed">
                    <option v-for="option in battleReplaySpeedOptions" :key="`replay-speed-${option.value}`" :value="option.value">{{ option.label }}</option>
                  </select>
                  <small>倍率越高，战斗事件切换越快；仅影响前端回放播放，不改变战斗结算结果。</small>
                </label>
              </div>
              <div class="admin-editor-section">
                <div class="admin-section-title">今日播报速度</div>
                <label>
                  <span>滚动倍率</span>
                  <select v-model.number="adminGameSettingsDraft.dailyTickerSpeed">
                    <option v-for="option in dailyTickerSpeedOptions" :key="`ticker-speed-${option.value}`" :value="option.value">{{ option.label }}</option>
                  </select>
                  <small>倍率越高，顶部“今日播报”滚动越快；不影响播报内容。</small>
                </label>
              </div>
              <div class="admin-actions">
                <button class="primary" type="submit" :disabled="isActionPending('/api/admin/settings')">{{ isActionPending("/api/admin/settings") ? "保存中..." : "保存设置" }}</button>
              </div>
            </form>

            <div v-else-if="adminMode === 'wiki'" class="admin-wiki-layout">
              <aside class="admin-wiki-toc" aria-label="游戏指导书目录">
                <div class="admin-wiki-toc-head">
                  <BookOpen :size="19" aria-hidden="true" />
                  <span>游戏指导书</span>
                </div>
                <p>规则以当前版本实际结算逻辑为准。</p>
                <button
                  v-for="article in filteredAdminWikiArticles"
                  :key="article.id"
                  class="admin-wiki-toc-row"
                  :class="{ active: adminWikiArticleId === article.id }"
                  type="button"
                  @click="adminWikiArticleId = article.id"
                >
                  <span>{{ article.order }}</span>
                  <strong>{{ article.title }}</strong>
                  <small>{{ article.summary }}</small>
                </button>
                <div v-if="!filteredAdminWikiArticles.length" class="empty">没有匹配的指导文章。</div>
              </aside>

              <article v-if="adminWikiArticle" class="admin-wiki-reader">
                <header>
                  <span>{{ adminWikiArticle.order }} · {{ adminWikiArticle.category }}</span>
                  <h3>{{ adminWikiArticle.title }}</h3>
                  <p>{{ adminWikiArticle.summary }}</p>
                </header>
                <section v-for="section in adminWikiArticle.sections" :key="section.title" class="admin-wiki-section">
                  <h4>{{ section.title }}</h4>
                  <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                  <ul v-if="section.bullets?.length">
                    <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
                  </ul>
                  <p v-if="section.tip" class="admin-wiki-tip"><b>提示</b>{{ section.tip }}</p>
                </section>
              </article>
            </div>
          </div>
        </section>

        <section v-if="activeTab === 'cultivation' && cultivationSubTab === 'guide'" class="view active cultivation-surface guide-surface">
          <div class="panel">
            <div class="section-head">
              <div>
                <h3>游戏指导书</h3>
                <p>规则以当前版本实际结算逻辑为准。</p>
              </div>
              <span class="tag">第 {{ state?.day ?? 0 }} 天</span>
            </div>
            <div class="admin-wiki-layout">
              <aside class="admin-wiki-toc" aria-label="游戏指导书目录">
                <div class="admin-wiki-toc-head">
                  <BookOpen :size="19" aria-hidden="true" />
                  <span>修行目录</span>
                </div>
                <button
                  v-for="article in adminWikiArticles"
                  :key="`guide-${article.id}`"
                  class="admin-wiki-toc-row"
                  :class="{ active: guideArticleId === article.id }"
                  type="button"
                  @click="guideArticleId = article.id"
                >
                  <span>{{ article.order }}</span>
                  <strong>{{ article.title }}</strong>
                  <small>{{ article.summary }}</small>
                </button>
              </aside>
              <article v-if="guideArticle" class="admin-wiki-reader">
                <header>
                  <span>{{ guideArticle.order }} · {{ guideArticle.category }}</span>
                  <h3>{{ guideArticle.title }}</h3>
                  <p>{{ guideArticle.summary }}</p>
                </header>
                <section v-for="section in guideArticle.sections" :key="section.title" class="admin-wiki-section">
                  <h4>{{ section.title }}</h4>
                  <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                  <ul v-if="section.bullets?.length">
                    <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
                  </ul>
                  <p v-if="section.tip" class="admin-wiki-tip"><b>提示</b>{{ section.tip }}</p>
                </section>
              </article>
            </div>
          </div>
        </section>
      </main>
    </div>

    <div v-if="riskConfirmation.open" class="modal-backdrop risk-confirm-backdrop" @click.self="closeRiskConfirmation">
      <form class="modal-panel risk-confirm-panel" role="dialog" aria-modal="true" :aria-label="riskConfirmationCopy.title" @submit.prevent="confirmRiskAction">
        <div class="risk-confirm-heading">
          <span class="risk-confirm-mark" aria-hidden="true">!</span>
          <div>
            <small>高风险操作</small>
            <h3>{{ riskConfirmationCopy.title }}</h3>
          </div>
        </div>
        <p>{{ riskConfirmationCopy.description }}</p>
        <div class="risk-confirm-warning">
          <strong>{{ riskConfirmationCopy.warning }}</strong>
          <span>请输入下方文字以确认你已理解风险：</span>
          <code>{{ riskConfirmationPhrase }}</code>
        </div>
        <label class="risk-confirm-field">
          <span>风险确认</span>
          <input
            ref="riskConfirmInput"
            v-model="riskConfirmation.input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="riskConfirmationPhrase"
          >
        </label>
        <div class="actions risk-confirm-actions">
          <button class="secondary" type="button" :disabled="riskConfirmation.submitting" @click="closeRiskConfirmation">取消</button>
          <button class="danger" type="submit" :disabled="!riskConfirmationReady || riskConfirmation.submitting">
            {{ riskConfirmation.submitting ? riskConfirmationCopy.pendingLabel : riskConfirmationCopy.confirmLabel }}
          </button>
        </div>
      </form>
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

    <teleport to="body">
      <transition name="breakthrough-effect">
        <section
          v-if="breakthroughEffect"
          class="breakthrough-effect-layer"
          :class="breakthroughEffect.success ? 'success' : 'failure'"
          role="dialog"
          aria-modal="true"
          :aria-label="breakthroughEffect.success ? '突破成功' : '突破失败'"
          @click.self="dismissBreakthroughEffect"
        >
          <div class="breakthrough-effect-aura" aria-hidden="true">
            <i v-for="ray in 18" :key="ray" :style="{ '--ray': ray }"></i>
          </div>
          <div class="breakthrough-effect-sigil" aria-hidden="true">
            <span class="breakthrough-effect-ring ring-one"></span>
            <span class="breakthrough-effect-ring ring-two"></span>
            <span class="breakthrough-effect-core">{{ breakthroughEffect.success ? '破' : '裂' }}</span>
          </div>
          <div class="breakthrough-effect-copy">
            <h2>{{ breakthroughEffect.success ? `恭喜突破到 ${breakthroughEffect.to}` : '突破失败' }}</h2>
            <p>{{ breakthroughEffect.success ? `${breakthroughEffect.from} → ${breakthroughEffect.to}` : '灵力逆冲经脉，今日不可再次突破。' }}</p>
            <small>本次突破成功率 {{ formatPercent(breakthroughEffect.chance) }}</small>
          </div>
          <button class="breakthrough-effect-dismiss" type="button" @click="dismissBreakthroughEffect">
            {{ breakthroughEffect.success ? '收下这份机缘' : '调息再来' }}
          </button>
        </section>
      </transition>
    </teleport>

    <div v-if="error" class="toast">{{ error }}</div>
  </div>
</template>

<script setup>
import {
  BadgeCent,
  Backpack,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Compass,
  Coins,
  Crown,
  Dna,
  Dumbbell,
  Eye,
  EyeOff,
  Flame,
  Gem,
  Handshake,
  ImagePlus,
  Landmark,
  Leaf,
  Mountain,
  Orbit,
  Package,
  Play,
  ShoppingBag,
  Route,
  RefreshCw,
  Search,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Sprout,
  Sun,
  Sword,
  Swords,
  Trophy,
  TrendingUp,
  Waves,
  WandSparkles,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
  LocateFixed,
  Maximize2,
  Minimize2
} from "lucide-vue-next";
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, shallowRef, watch } from "vue";
import { clearCachedState, getAdminAccounts, getBattleReplay, getCachedState, getCultivatorDetail, getCurrentUser, getDuelDayPage, getDuelReplay, getState, login, logout, postAction, register, saveCachedState, setAdminActiveAccount, setAdminManagedAccount } from "./api";
import { replayStatMax } from "./battleReplay";
import CharacterPortrait from "./components/CharacterPortrait.vue";
import DaoTrialAnalytics from "./components/DaoTrialAnalytics.vue";
import EquipmentIcon from "./components/EquipmentIcon.vue";
import Meter from "./components/Meter.vue";
import MonsterEmblem from "./components/MonsterEmblem.vue";
import StatIcon, { statIconComponent } from "./components/StatIcon.vue";
import { monsterArchetype, monsterImageEntries, monsterStageNames } from "./monsterImages";
import { equipmentCatalog as fallbackEquipmentCatalog, equipmentSlots as fallbackEquipmentSlots, equipmentTiers as fallbackEquipmentTiers } from "../../shared/equipmentData.mjs";
import { duelLadderDays, duelLossScore, duelRanks, duelRankForScore, duelSeasonDay, duelSeasonLength, duelSeasonMaxScore, duelSeasonOfDay, duelTournamentDays, duelWinScore } from "../../shared/duelSeasonData.mjs";

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
  { id: "trial", label: "秘境", icon: Compass },
  { id: "admin", label: "后台", icon: Settings }
];

const visibleTabs = computed(() => authUser.value?.isAdmin
  ? tabs.filter((tab) => tab.id === "admin")
  : tabs.filter((tab) => tab.id !== "admin"));

const cultivationSubTabs = [
  { id: "attributes", label: "灵根", icon: BadgeCent },
  { id: "progression", label: "境界", icon: Orbit },
  { id: "skills", label: "技能", icon: WandSparkles },
  { id: "guide", label: "指导", icon: BookOpen }
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
  { id: "combat", label: "战斗评分" },
  { id: "sect", label: "宗门战力" },
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
  { id: "spirit", label: "灵石" },
  { id: "talent", label: "天赋" },
  { id: "equipmentCount", label: "装备" },
  { id: "formedPearlCount", label: "灵珠" }
];

const emptyState = {
  day: 0,
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
  gameSettings: { taskDailyFullXpBudget: 500, battleReplaySpeed: 1, dailyTickerSpeed: 1 },
  taskDefinitions: [],
  taskCompletions: [],
  taskMultiplierRecords: [],
  log: [],
  logDays: [],
  bag: {},
  equipment: [],
  equipmentTransfers: [],
  provinces: [],
  provinceWars: [],
  duelDays: [],
  dungeonDays: [],
  battleArchives: { summaries: [] },
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
const breakthroughEffect = ref(null);
let breakthroughEffectTimer = null;
const pendingActions = ref(new Set());
const fullStateRefreshing = ref(false);
const homeStateRefreshing = ref(false);
const fullStateStale = ref(false);
let fullStateRefreshPromise = null;
let homeStateRefreshPromise = null;
const stateRefreshControllers = new Map();
let authGeneration = 0;
let highestStateRevision = -1;
const personDetails = ref({});
const personDetailLoading = ref(new Set());
const personDetailHistoryLoading = ref(new Set());
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
const dungeonDayIndexes = reactive({ blood: 0, void: 0, sea: 0 });
const activeDungeonRecordTab = ref("blood");
const selectedEncounterId = ref("");
const selectedDaoTrialRouteId = ref("golden-pass");
const selectedDaoTrialCompanionId = ref("");
const daoTrialSubTab = ref("play");
const daoTrialCatalogMode = ref("laws");
const daoTrialCatalogQuery = ref("");
const daoTrialCatalogSchool = ref("");
const daoTrialCatalogBranch = ref("");
const daoTrialCatalogRarity = ref("");
const daoTrialCatalogDiscovery = ref("");
const daoTrialCatalogPage = ref(1);
const daoTrialCatalogPageSize = 48;
const showDungeonLoot = ref(false);
const showDungeonBestiary = ref(false);
const selectedStarSeaCycle = ref(null);
const starSeaRankPageSize = 10;
const activeStarSeaCycleBoard = ref("teams");
const starSeaCycleTeamRankPage = ref(1);
const starSeaCycleMemberRankPage = ref(1);
const starSeaCycleMemberSearch = ref("");
const starSeaTeamRankPage = ref(1);
const starSeaPersonalRankPage = ref(1);
const selectedVoidHallSect = ref("");
const detailView = ref("rank");
const selectedPersonId = ref("player");
const activeDossierRanking = ref("combat");
const selectedSectName = ref("");
const detailReturnStack = ref([]);
const selectedRealmStage = ref("");
const selectedDuelDay = ref(null);
const duelSearch = ref("");
const duelMatchPage = ref({ day: null, matches: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
const duelMatchPageLoading = ref(false);
const tournamentBracketPanel = ref(null);
const tournamentBracketViewport = ref(null);
const tournamentBracketZoom = ref(0.72);
const tournamentBracketFullscreen = ref(false);
const tournamentBracketPan = reactive({ x: 0, y: 0 });
const tournamentBracketDrag = reactive({ active: false, pointerId: null, startX: 0, startY: 0, originX: 0, originY: 0 });
const collapsedTournamentRounds = ref(new Set());
let duelSearchTimer = null;
let duelMatchPageRequestId = 0;
const selectedProvinceWarDay = ref(null);
const selectedHomeLogDay = ref(null);
const selectedProvinceWarId = ref("");
const provinceWarSearch = ref("");
const provinceWarOutcomeFilter = ref("all");
const provinceWarTierSort = ref("default");
const provinceResourceTypeFilter = ref("");
const provinceResourceOwnerFilter = ref("");
const selectedDefenseProvinceId = ref("");
const sectPlanDraft = reactive({
  mode: "balanced",
  attackTarget: "",
  attackMemberIds: [],
  onConflict: "retarget",
  defense: {}
});
const maxSiegeTeamSize = 5;
const zeroTerritorySiegeTeamSize = 6;
const lastBattle = ref(null);
const battleReturnTarget = ref(null);
const replayLoading = ref(false);
const battleCursor = ref(0);
const invalidReplayIds = ref(new Set());
const countdown = ref("--:--:--");
const taskForm = reactive({ category: "", taskId: "", completedAmount: 1, targetDay: 0 });
const collapsedTaskDays = ref(new Set());
const expandedTaskDays = ref(new Set());
const adminMode = ref("accounts");
const adminSearch = ref("");
const adminSelectedCultivatorId = ref("player");
const adminSelectedSectName = ref("");
const adminSelectedTaskId = ref("");
const adminWikiArticleId = ref("home-cycle");
const adminAccounts = ref([]);
const adminAccountsLoading = ref(false);
const adminAccountsSaving = ref(false);
const adminSelectedAccountId = ref("");
const guideArticleId = ref("home-cycle");
const adminGameSettingsDraft = reactive({ taskDailyFullXpBudget: 500, battleReplaySpeed: 1, dailyTickerSpeed: 1 });
const riskConfirmationPhrase = "我已确认风险";
const riskConfirmInput = ref(null);
const riskConfirmation = reactive({ open: false, action: "", input: "", submitting: false });
const riskConfirmationReady = computed(() => riskConfirmation.input.trim() === riskConfirmationPhrase);
const riskConfirmationCopy = computed(() => riskConfirmation.action === "reset"
  ? {
      title: "确认重开一世",
      description: "此操作会覆盖当前存档，并重新生成主角、NPC 与世界进度。",
      warning: "当前角色成长、任务、宗门战、切磋、副本及全部历史记录都将被清空，且无法恢复。",
      confirmLabel: "确认重开一世",
      pendingLabel: "正在重开..."
    }
  : {
      title: "确认推进一天",
      description: "此操作会立即推进游戏日，并执行整套每日结算。",
      warning: "攻守城、副本、灵珠、切磋及 NPC 成长将立即结算，结果写入存档后无法撤销。",
      confirmLabel: "确认推进一天",
      pendingLabel: "正在结算..."
    });
const battleReplaySpeedOptions = [
  { value: 0.5, label: "0.5x · 慢速" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x · 标准" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x · 快速" },
  { value: 3, label: "3x" },
  { value: 4, label: "4x · 极速" }
];
const dailyTickerSpeedOptions = [
  { value: 0.5, label: "0.5x · 慢速" },
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x · 标准" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x · 快速" },
  { value: 3, label: "3x" },
  { value: 4, label: "4x · 极速" }
];
const sectMemberPanelEl = ref(null);
const sectWarPanelEl = ref(null);
const sectWarPanelHeight = ref(0);
let sectMemberPanelObserver = null;
const adminCultivatorDraft = reactive({
  id: "player",
  name: "",
  gender: "unknown",
  rootKeys: [],
  portraitUrl: "",
  skillId: "",
  potentialRealm: 0,
  talentMode: "auto",
  talentScore: 50,
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
const adminWikiArticles = [
  {
    id: "home-cycle",
    order: "01",
    category: "首页与每日循环",
    title: "首页：看懂一天如何推进",
    summary: "从第 0 天开始积累修为、资源与因缘；推进一天会统一结算整个世界。",
    sections: [
      {
        title: "开局与推进",
        paragraphs: [
          "新存档和“重开一世”都从第 0 天开始。第 0 天可以熟悉属性、接取现实任务、购买丹药和查看目录；第一次推进一天后进入第 1 天。",
          "点击首页“推进一天”会手动推进游戏日；服务器跨过现实日期时也会自动结算。手动推进不改变现实日期，只改变游戏内天数。"
        ],
        bullets: [
          "玩家每日基础修为为 10；经验城、灵根、天赋和任务加成会在此基础上增加收益。",
          "每日结算会处理领地资源、NPC 修炼与突破、玩家被动修为、三类副本、灵珠自动兑换、全员切磋和因缘生成。",
          "玩家突破仍需在修行页手动发起；每日突破次数默认 1 次，续脉丹可增加次数但总上限为 4 次。",
          "结算后玩家气血与心境会恢复；副本战损、突破失败造成的损失会在结算前保留。"
        ],
        tip: "推荐顺序：完成现实任务 → 检查丹药与突破条件 → 安排宗门明日战略 → 查看日志后推进一天。"
      },
      {
        title: "首页状态与因缘奇遇簿",
        paragraphs: [
          "首页显示当前境界、修为、气血、法力、灵石、心境和最近日志。气血归零会导致战斗失败，法力不足时技能会退回普通攻击。",
          "因缘事件不会天天出现，生成间隔为 2–4 个游戏日，最多同时保留 3 个待处理事件。事件通常有 3 天有效期，过期会记为“未及赴约”，不会造成额外损失。",
          "每个选择都会直接影响修为、灵石、灵尘、气血、法力、声望、宗门物资、宗门敌意、心魔或与事件对方的亲和/尊重；部分选择还会触发切磋、后续事件链或数日后的承诺回响。"
        ],
        bullets: [
          "因缘事件池当前包含 240 个事件节点，按季节、人物关系、宗门、灵根和近期选择筛选。",
          "事件选择后的影响会在事件卡和因缘档案中展示；人物详情会显示对方姓名、关系阶段、亲和、尊重和近期互动。",
          "事件关系阶段依次为陌路、相识、故交、同道、知己；亲和偏低而尊重较高时可能形成宿敌。"
        ]
      },
      {
        title: "战力和战斗基础",
        paragraphs: [
          "战力是用于榜单和匹配的综合指标，不等于一次战斗的必胜保证。实际战斗会按回合应用攻击、防御、血量、神识、法力、灵根克制、技能、装备、灵珠和临时状态。",
          "基础战力公式为：攻击×2.8 + 防御×2 + 血量×0.42 + 神识×1.35 + 法力×0.55。有效属性是基础属性叠加灵根、装备和灵珠后的结果，并向下取整。"
        ],
        bullets: [
          "五行克制时，被克方的战斗五维通常降低 10%；跨大境界时惩罚按 10%、5%、2.5% 逐级减半，最低 1%。",
          "技能有法力消耗和冷却；治疗、护盾、增益、斩杀和吸蓝技能会在满足条件时才释放，避免满血或无目标时浪费法力。",
          "战斗回放记录开战时快照，换装、突破或灵珠升级不会回溯修改旧回放。"
        ],
        tip: "不要只看战力差；先看灵根克制、技能类型和当前有效气血/法力。"
      }
    ]
  },
  {
    id: "cultivation-system",
    order: "02",
    category: "修行页面",
    title: "修行：灵根、境界、技能与突破",
    summary: "修行页分为灵根、境界、技能和指导四个子页，成长规则与完整说明都在这里查看。",
    sections: [
      {
        title: "境界与经验",
        paragraphs: [
          "境界共 9 个大境界：练气、筑基、结丹、元婴、化神、炼虚、合体、大乘、真仙；每个大境界 10 层，共 90 个层级。",
          "修为达到当前层的经验需求后，才可以尝试突破。突破成功进入下一层并按境界获得基础属性成长；成功后气血和法力恢复至上限。"
        ],
        bullets: [
          "突破失败不会掉境界，但会损失 26 点气血和 18 点法力；失败后当日不可再次突破。",
          "默认每日 1 次突破；续脉丹增加当日次数，突破总次数最多 4 次。",
          "破境丹为下一次突破提供 +4%、+8%、+12% 或 +16% 成功率，最多同时保留 4 枚，尝试后消耗。",
          "水灵根提高修为获取并使突破倍率提高 10%；宗门突破城也会提供额外突破加成。"
        ],
        tip: "突破前先确认成功率、丹药、突破城加成和今日剩余次数。"
      },
      {
        title: "灵根与相克",
        paragraphs: [
          "基础灵根分别强化一种方向：金灵根攻击 +5%–10%，木灵根血量 +10%–20%，水灵根修为 +40%–60%且突破倍率 +10%，火灵根神识 +10%–20%，土灵根防御 +5%–10%，天灵根法力 +10%–20%。",
          "多灵根会分摊同类加成，并使修为和突破倍率进一步衰减；金木土组合转雷灵根，水火天组合转风灵根，金木水火土组合转隐灵根。"
        ],
        bullets: [
          "特殊灵根克制其组成的普通灵根，且不被普通灵根反克；属性仍按子灵根加成和多灵根衰减计算。",
          "修行页灵根星盘会显示当前灵根、被谁克制和克制谁；战斗中克制关系直接影响五维。"
        ]
      },
      {
        title: "技能与升级",
        paragraphs: [
          "每位修士拥有一项主动技能。技能目录包含伤害、穿透、持续伤害、控制、护盾、减伤、吸蓝、治疗、吸血、反伤和领域等类型；技能释放由法力、冷却和战况共同决定。",
          "技能升级在修行页进行，每日最多尝试一次。升级需要达到对应境界并支付灵石，失败同样扣除灵石；技能最高 10 阶。"
        ],
        bullets: [
          "技能法力消耗当前约为 14–32 点，冷却约为 2–5 回合，具体以技能卡片和战斗回放为准。",
          "治疗技能在非满血时才会优先考虑；斩杀技能需要目标进入斩杀线；持续伤害、控制、护盾和削弱不会重复覆盖同类有效状态。",
          "升级成功率会随阶数下降，升级成本从低阶的几十灵石逐步提高到高阶数千灵石。"
        ]
      }
    ]
  },
  {
    id: "tasks",
    order: "03",
    category: "现实任务页面",
    title: "现实任务：把行动记入修为",
    summary: "完成型和量化型任务都能换取修为与灵石，并保留最近三天的补记窗口。",
    sections: [
      {
        title: "任务类型与奖励",
        paragraphs: [
          "现实任务按锻炼、学习、工作、创作、自律等分类展示。完成型任务提交一次结算；量化型任务按完成量 ÷ 标准数量计算倍率，最高不超过任务设定的最高倍率。",
          "任务奖励由基础修为、灵石、修为丹、天赋和追赶加成共同决定。修为丹只放大任务修为，不放大灵石。"
        ],
        bullets: [
          "每日有效任务修为预算默认为 500；超出预算的基础修为按 40% 计入，页面预览会显示这一段折算。",
          "任务定义最多 80 项，完成记录最多 120 条；旧记录会按上限裁剪。",
          "同一完成型任务每天只能结算一次；量化任务可分次提交，但只能结算新增完成量。",
          "只能补记今天、昨天和前天，不能提交未来日期；停用任务不能新增记录，但历史记录不会消失。"
        ]
      },
      {
        title: "任务页操作顺序",
        paragraphs: [
          "先选择日期、任务分类和任务定义，再填写完成量并查看奖励预览。提交后，任务日志会记录基础修为、丹药倍率、天赋倍率、追赶倍率和最终修为。",
          "任务奖励到账后，回到修行页检查经验是否达到突破线；需要资源时再去坊市购买丹药。"
        ],
        bullets: [
          "页面上的奖励预览是当前日期和当前丹药状态的快照；补记过去日期时，以该日保存的倍率记录为准。",
          "灵石、声望和宗门资源不会因为任务修为预算折算而减少；只有基础修为超出预算的部分按 40% 计算。"
        ]
      }
    ]
  },
  {
    id: "dungeons-trials",
    order: "04",
    category: "副本与秘境页面",
    title: "副本与秘境：三种资源线与周期试炼",
    summary: "副本记录个人、宗门与队伍资源线，秘境承载主动周期试炼，二者都会保留奖励与战斗回放。",
    sections: [
      {
        title: "血色禁地、虚天殿、乱星海",
        paragraphs: [
          "血色禁地是每日个人连续闯关，最多 9 洞；越深处妖物更强、装备品质上限更高，胜利后会恢复部分气血和法力。",
          "虚天殿是宗门车轮战，妖王在成员之间继承剩余气血与法力；宗门通关后按贡献分配灵石和装备。",
          "乱星海猎妖按固定 10 人队伍作战，每期 10 天；队伍每日按击杀和输出分润灵石，装备以低概率竞拍方式产生。"
        ],
        bullets: [
          "三类副本都可能产出灵珠碎片；未触发碎片时通常转为灵尘。碎片判定基础率约为血色 18%、虚天殿 55%、乱星海 42%，还会受深度、阶段和胜负修正。",
          "血色禁地战报会显示本关灵石包、前三奖金包、输出排名和装备归属；虚天殿会显示宗门车轮战顺序；乱星海会显示队伍与个人贡献。",
          "副本每天自动运行一次，玩家手动点击副本页主要用于查看最新战报、回放和历史记录。"
        ],
        tip: "个人想稳定拿灵石优先看血色禁地；想拿宗门收益关注虚天殿；想追求队伍排名和稀有装备再看乱星海。"
      },
      {
        title: "问道秘境：七日一期的路线试炼",
        paragraphs: [
          "秘境页提供每日可主动进入的问道路线试炼，同时每 7 天更换一期异象。当前有金石关、风雷径、玄阴泽三条路线，前 30 层为核心层，第 31 层后进入问天阶；战斗层会在真实修士与路线妖物之间轮换，精英与首领拥有更高强度和奖励。",
          "每日补充 1 枚问道签，最多积存 2 枚；没有问道签时仍可无奖励演练。路线中的选择会改变血量、法力、悟机、道印和同行者效果。"
        ],
        bullets: [
          "每期会应用一个异象，例如敌方投影战力 +6%、技能消耗提高 6%、治疗效果提高 12%或问心得分提高 20%。",
          "学习、运动、工作、生活四类现实任务会在当天首轮正式游历中分别提供免费重观、血量提升、灵石加成和回春符。",
          "每轮不会重复遇到同一名守关修士，同行者也不会成为对手；NPC 以真实身份和养成属性生成入境快照，只接受秘境战意向上强化，妖物则按路线机制生成。",
          "战败时玩家带回原始行囊的 40%，胜方 NPC 获得余下 60%；主动离境带回 80%，检查点安全收功按 120% 结算。演练不会给 NPC 发放资源。",
          "道印按攻伐、守御、灵息、身法、险道、生机分为六类，效果覆盖攻击、防御、血量、神识、法力、技能消耗、冷却、治疗和战后恢复。",
          "问道秘境记录会保存路线熟练度、最高得分、精英/首领通关和年度目标进度。"
        ],
        tip: "路线选择要结合当前血量、法力和已持有道印；低血量时优先调息，追求高分时再承担事件损耗。"
      }
    ]
  },
  {
    id: "sect",
    order: "05",
    category: "宗门页面",
    title: "宗门：任务、领地与明日战略",
    summary: "宗门页同时管理宗门任务、势力地图、省份资源、攻守城记录和明日部署。",
    sections: [
      {
        title: "宗门任务与资源",
        paragraphs: [
          "宗门任务每次消耗少量气血，奖励 5–10 点声望、16 灵石、宗门声望和物资。宗门声望影响势力排行，物资用于宗门经营和战争消耗。",
          "领地分为灵石、经验、突破和灵尘资源。全国 34 座省份按排名分为 S、A、B、C、D、E 六档，排名越高资源越好。"
        ],
        bullets: [
          "资源城会在每日结算时按掌门、长老、守城成员和普通成员权重分配；同类多城效果可以累加。",
          "经验城增加每日修为，突破城提高突破成功率，灵石城直接提供灵石，灵尘城提供灵尘。",
          "宗门成员数量会限制可占领省份数量；失守后省份易主，妖潮攻破会暂时变为无主并留下瘴气。"
        ]
      },
      {
        title: "明日战略、攻城与守城",
        paragraphs: [
          "明日战略支持保守、均衡和激进三种风格，并可手动指定目标省份、攻城成员和守军；各宗门基于同一份公开情报同时提交计划，结算前无法获知敌方今日阵容。",
          "常规攻城队最多 5 人；暂无城市的宗门拥有一次破局优势，攻城队最多 6 人，夺得城市后恢复 5 人。距离越远、疲劳越高，实际攻城战力越低；守城方享受城防阵法加成。攻守城战报会记录目标、队伍、距离、疲劳、灵根克制、城防和胜负。"
        ],
        bullets: [
          "疲劳范围 0–20；每点使战斗五维降低 2.5%。实际守城 +2，攻占无主城 +2，正常攻城基础 +3，远征额外增加；驻防未遇袭恢复 1 点。完全休整时，低疲劳恢复 1 点、中疲劳恢复 2 点、高疲劳恢复 3 点。",
          "自动战略会先锁定轮换休整组，再按保守、均衡或激进策略安排攻守人数；持城越多，攻城编制会逐级收缩。疲劳达到 16 后只会提高休整优先级，不会禁止出战。",
          "布防首先覆盖全部己方城市，每座城至少安排 1 名守军；结算时先把人员充足宗门的受袭城市增援到 2 人，再加强高价值、边境暴露或近期受袭的重点城。若成员数只够覆盖全部城市，则优先保证不断防。",
          "攻方只会看到薄弱、寻常、森严等模糊守备迹象；守方也不知道今日会有多少敌人来袭，精确人数、名单与战力只在战后揭晓。",
          "妖潮从第 1–49 日每天 1 场开始，之后每满 50 日增加 1 场，最多 4 场；高档省份会出现更多妖物。",
          "攻守城胜利方有极低概率夺取失败方当天以前穿戴的装备；切磋不会抢装备。"
        ],
        tip: "优先占领距离近、资源类型适合当前阶段的省份；不要让高战修士连续远征。"
      }
    ]
  },
  {
    id: "arena",
    order: "06",
    category: "切磋页面",
    title: "切磋：积分演武与天骄淘汰赛",
    summary: "切磋是纯竞技回合战，记录积分、段位、战绩和回放，不会损失装备。",
    sections: [
      {
        title: "积分演武",
        paragraphs: [
          "每日结算时，全员会在不同宗门、段位差不超过两档的范围内自动匹配；找不到合适对手就轮空。每场切磋满血满蓝开局，结束后恢复状态。",
          "胜者 +2 分，负者 -1 分，积分范围 0–104。段位和积分只影响竞技排行与赛季奖励，不影响普通存档资源。"
        ],
        bullets: [
          "段位从黑铁、青铜、白银、黄金、铂金、钻石、超凡大师到最强王者，共 8 档；当前赛季最多 52 天积分演武。",
          "匹配会优先选择段位和战力相近者，近 3 日交手过的对手权重降低；同宗门修士不会互相切磋。",
          "切磋不触发装备掠夺、不消耗副本次数，也不会把战损带回角色面板。"
        ]
      },
      {
        title: "赛季末淘汰赛与奖励",
        paragraphs: [
          "每个赛季共 60 天：前 52 天进行积分演武，后 8 天进行天骄淘汰赛。淘汰赛使用赛季积分筛选最多 256 名参赛者，按对阵图逐轮决出冠军。",
          "赛季结束时按最终段位发放灵石并重置赛季积分；人物详情会保留赛季战绩、对手、胜负和回放。"
        ],
        bullets: [
          "赛季奖励依次为：黑铁 30、青铜 60、白银 100、黄金 150、铂金 220、钻石 320、超凡大师 450、最强王者 650 灵石。",
          "淘汰赛页面支持缩放和展开对阵图；已结束比赛可以查看双方开战快照和战斗回放。"
        ]
      }
    ]
  },
  {
    id: "market",
    order: "07",
    category: "坊市页面",
    title: "坊市：丹药、价格和使用时机",
    summary: "坊市把灵石转成短期修为加成、突破资源和永久属性。",
    sections: [
      {
        title: "价格与限购",
        paragraphs: [
          "坊市价格会随每日行情和已购买的永久丹次数浮动。今日价格 =（基础价 + 永久丹涨价步长）×每日因子，每日因子范围为 0.800–1.200。出售按当日行情九折结算。",
          "每种丹药都有每日、周期或本境界限购；永久丹还设有单项服用上限。购买、服用、出售都会写入日志和背包记录。"
        ],
        bullets: [
          "黄龙丹/金髓丸：现实任务修为 ×1.5/×2，持续 1 天。",
          "聚灵丹/合气丹：现实任务修为 ×1.5/×2，持续 3 天；参灵丹/九窍聚元丹：×1.5/×2，持续 7 天。",
          "护脉丹、凝元丹等破境丹提高下一次突破成功率；续脉丹增加当日突破次数；淬体丹永久提高攻击、防御、神识、血量或法力。"
        ]
      },
      {
        title: "使用规划",
        paragraphs: [
          "修为丹适合在连续完成现实任务前使用；破境丹应在经验已满、成功率偏低时使用；续脉丹只在当天确实需要多次突破时使用。",
          "更强的同类修为丹不会被更弱药力覆盖；永久丹效果直接进入基础属性，战斗有效值还会继续叠加装备和灵珠。"
        ],
        bullets: [
          "破境丹效果最多同时保留 4 枚，突破成功或失败后统一清除。",
          "淬体丹每类最多服用 100 枚；每枚通常为攻击、防御、神识 +2，血量、法力 +10。",
          "坊市的限购与价格以当前卡片为准，攻略中的数值只用于理解区间。"
        ],
        tip: "先看任务页的修为预览，再决定是否购买修为丹；不要为了追求倍率耗尽突破所需灵石。"
      }
    ]
  },
  {
    id: "equipment-pearls",
    order: "08",
    category: "装备与灵珠页面",
    title: "装备与灵珠：长期有效属性",
    summary: "装备按部位选最优，灵珠靠碎片凝练；两者都会直接进入有效属性。",
    sections: [
      {
        title: "装备规则",
        paragraphs: [
          "装备分武器、胸甲、头部、腿部、饰品五个部位，品质从凡器、法器、灵器、古宝、法宝到通天灵宝。每个部位只取评分最高的一件进入有效属性。",
          "血色禁地、虚天殿和乱星海是主要装备来源；攻守城才会触发极低概率的装备夺取，切磋永不抢装备。"
        ],
        bullets: [
          "品质加成区间：凡器 3%–5%、法器 6%–9%、灵器 10%–14%、古宝 15%–20%、法宝 21%–28%、通天灵宝 30%–40%。",
          "武器、胸甲、头部、腿部、饰品分别作用于攻击、防御、血量、法力、神识。",
          "装备数量榜统计角色拥有的装备数量；角色属性中的装备数量不是当前穿戴件数。"
        ]
      },
      {
        title: "灵尘、碎片与灵珠",
        paragraphs: [
          "灵珠最高九阶五星。灵尘每满 10 点会在每日结算时自动兑换 1 枚一阶碎片，碎片足够后自动凝练或升星；不是获得灵尘的瞬间完成。",
          "与自身本命灵根或特殊灵根契合的灵珠效果翻倍；雷、风和隐灵根对相关灵珠有部分契合加成。"
        ],
        bullets: [
          "金、木、水、火、土、天灵珠分别对应攻击、血量、修为、神识、防御、法力；雷、风、隐灵珠提供复合效果，隐灵珠还可提供突破加成。",
          "一阶凝成需要 20 枚一阶碎片；后续升星按阶数和目标星级递增，五星后消耗下一阶碎片升阶。",
          "人物详情和装备页会显示已凝成灵珠数量；榜单的“灵珠”排序按已凝成的数量，不按碎片总量。"
        ],
        tip: "装备和灵珠都是有效属性的一部分；比较人物时要同时看数量、部位、品质、阶数和契合关系。"
      }
    ]
  },
  {
    id: "rank-details",
    order: "09",
    category: "榜单与人物详情页面",
    title: "榜单：比较战力，也查看成长来源",
    summary: "榜单支持个人、切磋、宗门、副本和境界等维度；点击人物可查看因缘、装备和灵珠。",
    sections: [
      {
        title: "排序与榜单维度",
        paragraphs: [
          "个人榜单可按战力、境界、血量、攻击、防御、神识、法力、灵石、天赋、装备和灵珠排序。装备与灵珠按钮展示的是数量，灵珠按已凝成数量排序。",
          "宗门榜单按总战力、成员数、声望、物资和战绩查看；副本榜单按血色禁地、虚天殿和乱星海贡献查看。"
        ],
        bullets: [
          "人物详情显示基础属性、有效属性、装备数量、已凝成灵珠数量、每日成长、突破记录、切磋战绩、副本记录和与你的因缘。",
          "因缘记录会显示事件对方姓名、选择结果、关系变化和资源影响；详情中的回放与日志都使用当时快照。",
          "副本、切磋、攻守城和人物流水均有近期保留窗口，旧记录被裁剪后不能从前端恢复。"
        ]
      },
      {
        title: "看懂人物详情",
        paragraphs: [
          "人物详情中的基础属性是角色成长结果，有效属性还会叠加灵根、装备、灵珠和临时效果；战力使用有效属性计算。",
          "每日成长记录用于解释修为、灵石、声望、灵尘、突破和副本变化；切磋/副本回放用于确认技能、克制、战损和装备归属。"
        ],
        bullets: [
          "当前属性变化不会改写已经发生的战斗；请用回放中的开战快照核对历史结果。",
          "因缘关系的亲和与尊重独立记录；同一个 NPC 可能同时影响事件链、切磋匹配和问道秘境同行邀约。"
        ]
      }
    ]
  }
];

const legacyWikiArticles = [
  {
    id: "getting-started",
    order: "01",
    category: "入门总览",
    title: "从一天开始的修行循环",
    summary: "先完成现实任务，再规划突破与资源；每日结算会集中推进世界。",
    sections: [
      {
        title: "一天会结算什么",
        paragraphs: [
          "点击“推进一天”或跨越现实子时都会触发同一套每日结算。游戏日数前进后，今日突破次数重置，宗门攻守城、领地资源、NPC 修炼、副本、灵珠自动兑换与全员切磋依次处理。",
          "玩家每日基础获得 10 点修为；若宗门持有经验城，还会按个人分配获得额外经验。灵石则主要来自副本、领地资源、赛季奖励与任务。"
        ],
        bullets: [
          "每日副本、攻守城和全员切磋均在推进一天时自动结算。",
          "手动推进不会改变现实日期，只推进游戏内日期；自动结算在服务器跨日时触发。",
          "气血、法力、装备与灵珠的有效属性会共同影响当日战斗结果。",
          "当天先处理攻守城和领地灵石，再让 NPC 获得日常修为并尝试突破；玩家获得每日修为与三类副本，突破需在修行页手动发起，最后处理灵珠和全员切磋。",
          "玩家、NPC 的每日成长、突破、切磋、副本与灵珠流水都会写进人物详情；近期记录有保留窗口，不应把历史面板当成永久档案。"
        ],
        tip: "推进前可先使用丹药、安排明日战略；推进后查看日志、战报与人物记录复盘。"
      },
      {
        title: "核心属性与战斗",
        paragraphs: [
          "攻击决定正面伤害，防御抵扣伤害，血量归零即负；神识影响先手与闪避机会，法力用于施放技能。战力面板以攻击、防御、血量、神识和法力的加权结果展示，仅用于衡量，实际胜负仍取决于回合战。",
          "普通攻击的基础结算为“攻击×技能倍率 − 防御×(1−穿透) + 0 至 4 的随机浮动”，最低仍会造成 1 点伤害；护盾类效果在此之后按比例减伤。技能会受法力和冷却约束，无法施放时改为普通攻击。",
          "战斗会应用灵根相克、技能冷却、法力消耗、持续状态与装备/灵珠加成。五行相克时被克方五维默认降低 10%；若被克方高出攻击方一个大境界，惩罚减半，最低仍为 1%。攻守城回放展示的是开战当日的快照，不能与之后成长过的个人面板直接比较。"
        ],
        bullets: [
          "战力公式：攻击×2.8 + 防御×2 + 血量×0.42 + 神识×1.35 + 法力×0.55。",
          "有效属性采用“基础属性×(1 + 灵根加成 + 同部位装备加成 + 灵珠加成)”后向下取整；面板基础值与战斗有效值可能不同。",
          "持续伤害、治疗、护盾、眩晕、闪避、吸血、反伤等均由技能类型决定，建议用回放确认实际触发。"
        ]
      }
    ]
  },
  {
    id: "cultivation",
    order: "02",
    category: "修行与突破",
    title: "境界、灵根、技能与突破",
    summary: "经验到线后才可冲关；大境界瓶颈更难，丹药和领地可以提供助力。",
    sections: [
      {
        title: "境界与突破条件",
        paragraphs: [
          "境界从练气到真仙，每个大境界各十层。经验达到当前层所需总经验后，才能尝试进入下一层；第十层进入下一大境界属于瓶颈，基础成功率会显著下降。",
          "突破成功会提升基础成长并刷新气血、法力上限；失败会损失部分气血与法力，但不会倒退境界。高阶大境界瓶颈设有 1% 的最低概率上限保护。"
        ],
        bullets: [
          "每日默认可尝试 1 次突破；续脉丹可在当日增加额外次数，含额外次数在内每日最多 4 次。",
          "水灵根会提高修为获取并提升突破倍率；突破城会提供额外突破加成。",
          "破境丹只作用于下一次突破，可叠加但最多同时保留 4 枚，成败后都会消耗。",
          "基础概率按层数和大境界递减：一般公式为 72% − (当前小层−1)×2.8% − 大境界序号×6.8%，第十层另扣 30% + 大境界序号×4.5%；筑基十层固定 10%，结丹十层固定 6%。"
        ],
        tip: "经验刚满且成功率偏低时，先服用破境丹并确认今日次数，比直接反复尝试更稳妥。"
      },
      {
        title: "灵根与技能",
        paragraphs: [
          "金、木、水、火、土、天灵根分别偏向攻击、血量、修为/突破、神识、防御和法力。多灵根会分摊对应加成；特定组合会转化为雷、风或隐灵根，并拥有更特殊的相克关系。",
          "每位修士装备一项主动技能，技能有法力消耗与冷却。技能升级会提高战斗表现，战斗记录和回放能用于观察法力是否足够、技能是否适合当前敌人。"
        ],
        bullets: [
          "单灵根获得完整属性区间：金/土为 5%–10%，木/火/天为 10%–20%，水为 40%–60% 修为；多灵根将同类加成除以灵根数。",
          "多灵根还有额外衰减：修为倍率每多一根灵根−8%（最低 60%），突破倍率每多一根−6%（最低 70%）。",
          "组合仅为金木土时转雷灵根，仅为水火天时转风灵根，金木水火土五根齐全时转隐灵根；特殊灵根克其组成的普通灵根，不被其他灵根相克。"
        ]
      }
    ]
  },
  {
    id: "tasks-market",
    order: "03",
    category: "现实任务与坊市",
    title: "把现实行动转为修为与丹药规划",
    summary: "任务是主动成长主来源；坊市丹药针对修为、突破次数和永久属性提供补强。",
    sections: [
      {
        title: "现实任务结算",
        paragraphs: [
          "后台可配置任务名称、分类、奖励、是否量化及上限。完整任务完成一次给固定奖励；量化任务按完成量/标准数量换算，最高不超过该任务的最高倍数。",
          "任务可补记最近 3 个游戏日。修为丹会乘算现实任务获得的修为，任务记录会写明基础修为、丹药倍率和最终收益；灵石奖励不受修为丹倍率影响。"
        ],
        bullets: [
          "任务定义停用后不能提交，但历史完成记录保留。",
          "服用更弱的修为丹不会覆盖现有更强效果；同级或更强效果会延长有效天数。",
          "完成任务后若经验达到门槛，可前往修行页手动尝试突破。",
          "量化倍率 = 完成量 ÷ 标准数量，再限制到 0 至最高倍数；基础修为与灵石奖励都会先向下取整。",
          "任务定义最多保留 80 项，完成记录最多保留 120 条；补记日期不能早于当前日往前第 2 日，也不能是未来日期。"
        ]
      },
      {
        title: "坊市与丹药",
        paragraphs: [
          "坊市价格每日浮动，购买需满足灵石与限购条件；出售按当日行情九折换灵石。今日价格 =（基础价 + 已购永久丹次数×涨价步长）×每日因子，因子范围为 0.800–1.200。修为丹提高现实任务修为；破境丹累积下一次突破成功率；续脉丹增加当日突破次数；淬体丹永久提高一项基础属性。",
          "永久丹药存在单项服用上限，且随着购买次数价格上涨。购买、服用和出售都会反映在背包、人物属性与日志中；永久丹出售时按最近一枚的阶梯价再打九折，避免通过重复买卖获利。"
        ],
        bullets: [
          "修为丹：x1.5 或 x2，持续 1、3 或 7 日，仅作用现实任务修为。",
          "破境丹：单枚 +4%、+8%、+12% 或 +16%，每日/周期/本境界限购以具体丹方为准，最多同时存 4 枚效果。",
          "续脉丹：当日额外 +1 或 +2 次突破，但总次数仍封顶 4。",
          "淬体丹：攻击、防御、神识各 +2，血量、法力各 +10；每类永久药性最多服用 100 枚。"
        ]
      }
    ]
  },
  {
    id: "dungeons",
    order: "04",
    category: "副本",
    title: "三类副本：血色禁地、虚天殿、乱星海",
    summary: "副本每日自动运行，分别对应个人闯关、宗门协作和十日组队竞拍。",
    sections: [
      {
        title: "血色禁地：单人九关",
        paragraphs: [
          "每位修士每日从第一洞开始连续挑战，最多九关；越深处的妖物境界与装备品质上限越高。每关胜利后，幸存者会恢复部分气血和法力再前进，败退则停止当日闯关。",
          "每一关的通关者共享该关灵石基础包，排名前三再按 5:3:2 分配奖金包。排名会综合输出、回合数、剩余气血和法力；装备掉落在通关时立即归属获胜者，不参与赛后抽签。"
        ],
        bullets: [
          "通关有机会得到灵珠碎片；失败通常获得少量灵尘。",
          "装备部位只会自动保留当前更优者；更弱同部位装备会折价处理。",
          "战报中的“本关灵石包”与个人实际所得有关，前三奖励只奖励该关前三。",
          "第 n 关、当前大境界档位为 s 时：基础包为 22 + 24s + 14n 至 46 + 32s + 18n；前三奖金包为 8 + 9s + 5n 至 18 + 12s + 7n。",
          "每关战斗上限为 13 + 关数回合；胜利后以本关结束气血/法力为基础，各恢复自身上限的 50%，再进下一关。"
        ]
      },
      {
        title: "虚天殿：宗门车轮战",
        paragraphs: [
          "同一宗门成员按顺序车轮挑战妖王，妖王血量和法力会在成员之间继承。妖王境界依据宗门最高境界生成：较低阶段以本境界十层为基准，随后转为下一大境界一层，最高不超过真仙。",
          "每个胜利宗门独立进入该境界档次的灵石池判定，宗门之间平分该档次总池；宗门所得再在全体成员中分配，剩余灵石优先补给输出靠前者。通关装备会优先给输出高且该部位能提升的人，若都不能提升才给最高输出者。"
        ],
        bullets: [
          "未破殿门时没有通关灵石池与装备奖励。",
          "宗门通关成员可获得灵珠碎片判定；人物详情与副本页保留战报和回放。",
          "第 s 个大境界档的灵石池为 90 + 82s 至 159 + 82s；同档所有通关宗门先均分，再在该宗门所有成员之间均分，余数依次补给输出靠前者。",
          "每名成员与妖王对战最多 16 回合；妖王未被击杀时，后续成员继续面对剩余的妖王气血与法力。",
          "装备候选按总输出降序；系统先寻找能替换该成员当前同部位装备的人，找不到才给第一名。"
        ]
      },
      {
        title: "乱星海：十日一队",
        paragraphs: [
          "所有修士按固定队伍参加乱星海猎妖，一期 10 天。每日同队共同挑战妖物，队伍排名综合击杀、回合数和输出；每日灵石总池按队伍排名递减分配，并记录队伍与个人输出榜。",
          "每日只有 3% 概率生成一件装备竞拍；若有人愿意支付装备价值则最高可支付者获得，其余同场成员分红；无人竞拍时按装备价值折算灵石平分。每期结束另有 50% 概率必定结算一次装备竞拍，具体装备品质仍按妖物境界随机，高品质概率更低。"
        ],
        bullets: [
          "期末未掉落时会明确记录“未发现可竞拍装备”，不是漏结算。",
          "竞拍赢家可能自动卖出被替换的旧同部位装备，所得灵石会写入流转记录。",
          "乱星海也会产出灵珠碎片或灵尘。",
          "每日总池为 240 + 140s + 90×击杀队数 至 380 + 180s + 120×击杀队数，至少不低于实际参赛人数，确保每人保底 1 灵石。",
          "每队固定 10 人，妖物对一支队伍的车轮战最多 100 回合；总榜每期按 10 日累积队伍评分或个人输出统计。",
          "期末“50% 概率一定获得一件”指每期独立一次 50% 判定；触发后才进入竞拍，未触发不补发等值装备。"
        ],
        tip: "不要把每日竞拍当作稳定装备来源；十日期末的 50% 判定才是该玩法的主要装备期望。"
      }
    ]
  },
  {
    id: "sect-war",
    order: "05",
    category: "宗门与攻守城",
    title: "领地资源、明日战略与妖潮守城",
    summary: "城市提供资源；攻城队和守军会受距离、疲劳、城防与战斗胜负影响。",
    sections: [
      {
        title: "城市与资源分配",
        paragraphs: [
          "城市按全国排名分为 S 至 E 档，S 档资源价值最高。领地提供灵石、经验或突破三类资源；同宗门成员按身份权重分配，掌门权重最高、长老其次、当日成功守城者再次，普通成员也保有基础份额。",
          "宗门成员数同时约束可占领城市数量。城市被攻破后易主；妖潮攻破时城市会变为无主，并在短期内留下瘴气状态。"
        ],
        bullets: [
          "经验城在每日结算中增加修为，灵石城增加灵石，突破城增加突破成功率。",
          "后台可指定掌门与长老，影响资源分配身份；宗门页展示各项分润。",
          "城市档位排序的“高到低”即 S→A→B→C→D→E。",
          "34 座城市按全国排名换算：第 1–3 名为 S，4–8 为 A，9–14 为 B，15–21 为 C，22–28 为 D，其余为 E。",
          "单城基准随排名变化：灵石 +14 至 +24/人，经验 +47% 至 +64%/人，突破 +3.8% 至 +6.5%/人；同类多城会累加。",
          "资源分配权重为掌门 6、长老 3、当日成功守城者 2、普通成员 1；成员较多时掌门最高不超过总池 22%，单位长老不超过 12%。"
        ]
      },
      {
        title: "明日战略与攻城顺序",
        paragraphs: [
          "可为玩家宗门保存下一日的保守、均衡或激进策略，并手动指定攻城目标、攻城成员和守军。所有宗门基于同一份战前公开情报同时生成计划；多个宗门争夺同一目标时统一裁决，落选方按军令改攻备选目标或取消出征。",
          "常规攻城成员最多 5 人；0 城宗门最多可派 6 人争夺立足之地，取得城市后恢复 5 人。有效攻城战力会扣除疲劳与远征距离；守城成员始终最多 5 人并享受城防加成。攻守城战报会解释择城、选将、布防、疲劳、灵根相克和城防等快照因素。"
        ],
        bullets: [
          "妖潮每天会随机挑选若干已占领城市，优先关注资源高、持有久、领地多的目标，并为刚被袭击的城市提供短暂保护权重。",
          "守城胜利的成员会获得守妖灵珠碎片判定。",
          "装备夺取只可能发生在攻守城战斗胜利方对失败方的极低概率判定；品质越高，夺取率越低。切磋绝不触发装备夺取。",
          "疲劳范围 0–20；每点使五维降低 2.5%。实际守城 +2；攻占无主城 +2；正常攻城基础 +3，远征每多 1 格再 +1。驻防未遇袭恢复 1 点；完全休整按疲劳分段恢复 1–3 点。",
          "自动布防会按城市价值、边境暴露和近期受袭风险分配人员，并保留轮换休整组。结算时先把人员充足宗门的受袭城市增援到 2 人，再加强重点城；领地过多时优先保证每城不断防。",
          "装备抢夺仅从失败者已穿戴且非当天新得的装备中随机抽取一件：凡器 0.4%、法器 0.3%、灵器 0.2%、古宝 0.15%、法宝 0.1%、通天灵宝 0.05%。",
          "妖潮数量随游戏日增长：第 1–49 日每天 1 场，之后每满 50 日增加 1 场，最多 4 场；S/A/B/C/D/E 城每次妖潮为 3–4/3/2–3/2/1–2/1 只妖物。"
        ],
        tip: "先占一座资源适配的近城建立据点，再扩张；远征与疲劳会明显拉低实际攻城战力。"
      }
    ]
  },
  {
    id: "duel",
    order: "06",
    category: "切磋与赛季",
    title: "段位切磋、积分与赛季奖励",
    summary: "切磋是纯竞技回合战，只改变战绩和积分，不会抢装备。",
    sections: [
      {
        title: "匹配与战斗",
        paragraphs: [
          "每日结算时，全员会在不同宗门、段位差不超过两档的范围内自动匹配；没有合适对手则轮空。每场切磋均以满气血、满法力开局，结束后恢复双方状态。",
          "胜者 +2 分，负者 -1 分，积分范围为 0 到 120。切磋记录、赛季战绩和可用回放都会写入人物详情。"
        ],
        bullets: [
          "段位区间依次为：黑铁 0–14、青铜 15–29、白银 30–44、黄金 45–59、铂金 60–74、钻石 75–89、超凡大师 90–104、最强王者 105–120。",
          "一个赛季为 60 个游戏日；赛季切换时按最终段位发放 30、60、100、150、220、320、450、650 灵石并重置赛季积分。",
          "切磋不会造成装备丢失、不会触发装备掠夺，也不消耗副本次数。",
          "自动匹配会在段位合法的候选中加权随机：段位与战力更接近者更容易被抽中，但其他合法对手也有机会；近 3 日交手过的对手会降低再次抽中的概率。同宗门修士不互相切磋，找不到对手即轮空。"
        ]
      }
    ]
  },
  {
    id: "equipment-pearls",
    order: "07",
    category: "装备与灵珠",
    title: "装备自动择优、极低夺取与灵珠养成",
    summary: "装备按部位选最优，灵珠靠碎片凝练；两者都会直接进入有效属性。",
    sections: [
      {
        title: "装备规则",
        paragraphs: [
          "装备分武器、胸甲、头部、腿部、饰品五个部位，以及凡器到通天灵宝六档品质。系统会为每个部位自动装备评分更高的那一件，属性加成按对应部位作用于攻击、防御、血量、法力或神识。",
          "血色禁地装备立即归属；虚天殿按通关输出与可提升性确定归属；乱星海通过竞拍决定归属。攻守城才存在掠取失败方装备的判定，基础概率本就极低，品质越高概率越低；切磋永不抢装备。"
        ],
        bullets: [
          "若新装备无法超过当前同部位装备，会折算补偿或在竞拍中处理。",
          "装备图鉴可查看掉落源、最近流转和当前归属。",
          "套装会在装备库中按所属展示，优先关注能补齐当前短板的部位。",
          "品质加成区间：凡器 3%–5%、法器 6%–9%、灵器 10%–14%、古宝 15%–20%、法宝 21%–28%、通天灵宝 30%–40%。",
          "装备比较先看品质，再看百分比加成；每个部位只取评分最高的一件进入有效属性。"
        ]
      },
      {
        title: "灵尘、碎片与灵珠",
        paragraphs: [
          "副本胜利有机会掉落灵珠碎片，未获得碎片时常改为灵尘。每次每日结算，灵尘每满 10 会自动随机兑换 1 枚一阶灵珠碎片；随后系统会检查所有灵珠，碎片足够便自动凝练或升星。",
          "灵珠最高九阶五星。凝练与升星都消耗对应阶的碎片；与自身灵根或特殊灵根契合时效果翻倍，部分特殊灵根对子灵珠也有部分契合加成。人物详情保留近 30 天的灵尘、碎片、兑换与凝练记录。"
        ],
        bullets: [
          "金、木、水、火、土、天灵珠分别强化攻击、血量、修为、神识、防御、法力。",
          "雷、风、隐灵珠提供复合效果；隐灵珠还可提供突破相关加成。",
          "自动兑换发生在推进一天的结算阶段，不是获得灵尘的瞬间。",
          "碎片判定基础率：血色禁地 18%、虚天殿 55%、乱星海 42%；再受洞窟深度、阶段和胜负修正，最终被限制在 8%–88%。未触发时，成功一般获得 2 + 楼层/2 向下取整的灵尘起点，失败获得 1 灵尘。",
          "一阶凝练需要 20 枚一阶碎片；后续同阶升星费用为 6 + 阶数×5 + 下一星数×(4 + 阶数×2)，五星后升下一阶改用下一阶碎片。",
          "灵珠基础效果随阶数和星数增长；本命灵根/特殊灵根同名灵珠为 x2，雷/风对子灵珠为 x1.25，隐灵根对子灵珠为 x1.15。"
        ]
      }
    ]
  },
  {
    id: "records-admin",
    order: "08",
    category: "记录与管理",
    title: "日志、回放、榜单与后台管理",
    summary: "用记录复盘数值和战斗；后台负责维护人物、宗门、任务和本指南。",
    sections: [
      {
        title: "如何复盘",
        paragraphs: [
          "首页日志记录关键事件；人物详情汇总每日成长、突破、切磋、副本和灵珠流水；副本、攻守城、切磋都提供战斗回放。回放属性是战斗发生时的快照，因此可能与之后已成长或已换装的人物面板不同。",
          "榜单可从个人战力、切磋段位、宗门战力、副本闯关和境界统计切换。乱星海提供队伍与个人输出两个榜单，并支持十日期榜回看。"
        ],
        bullets: [
          "攻城战报可按关键词、攻破/守住结果与城市档位排序筛选。",
          "副本日期、切磋日期和乱星海日期各自独立控制，可用于查看近期历史。",
          "部分历史记录有保留天数上限，应在近期及时复盘。",
          "装备单件保存最近 5 次流转；日志、战报和人物详情各有独立裁剪窗口，旧记录被清理后无法从前端恢复。",
          "回放里的气血、法力、疲劳、距离、灵根相克和城防文字均是开战时快照；不要用当前属性反推旧战斗是否异常。"
        ]
      },
      {
        title: "后台使用边界",
        paragraphs: [
          "后台的角色页可维护名称、性别、技能、资源、基础属性、灵根和头像；宗门页可维护名称、头像、掌门与长老；现实任务页可新增、修改、停用或删除任务定义。保存角色时即使只改性别，也会提交完整档案。",
          "本指导书是只读规则说明，内容依据当前游戏逻辑编写。调整后端数值、掉落概率、赛季或资源规则时，应同步更新对应文章，避免页面说明与实际结算脱节。"
        ],
        bullets: [
          "修改角色基础属性会立即影响后续有效属性与战斗；已保存的旧回放不会被改写。",
          "修改宗门掌门/长老会影响后续领地资源分配，不回溯已经结算的灵石。",
          "后台搜索在角色、宗门、任务和指导书四个分类中独立生效；指导书按文章标题、分类、正文、列表与提示全文检索。"
        ]
      }
    ]
  }
];
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
  { id: "strategy", label: "明日战略", icon: "策" },
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
const dossierEquipmentSlotColumns = computed(() => {
  const slotById = new Map(equipmentSlots.value.map((slot) => [slot.id, slot]));
  return [
    ["trinket", "armor", "legs"],
    ["head", "weapon"]
  ].map((column) => column.map((id) => slotById.get(id)).filter(Boolean));
});
const equipmentTiers = computed(() => catalog.value.equipmentTiers?.length ? catalog.value.equipmentTiers : fallbackEquipmentTiers);
const duelRankList = computed(() => catalog.value.duelRanks?.length ? catalog.value.duelRanks : duelRanks);
const duelSeasonInfo = computed(() => derived.value.duelSeason || {
  season: duelSeasonOfDay(gameState.value.day),
  seasonDay: duelSeasonDay(gameState.value.day),
  length: duelSeasonLength,
  ladderDays: duelLadderDays,
  tournamentDays: duelTournamentDays,
  phase: duelSeasonDay(gameState.value.day) <= duelLadderDays ? "ladder" : "tournament",
  maxScore: duelSeasonMaxScore,
  winScore: duelWinScore,
  lossScore: duelLossScore
});
const duelTournament = computed(() => gameState.value.duelTournament || derived.value.duelTournament || null);
const duelLatestCompletedTournament = computed(() => derived.value.duelTournamentChampion || null);
const duelTournamentRound = computed(() => duelTournament.value?.rounds?.at(-1) || null);
const playerTournamentEntry = computed(() => duelTournament.value?.entrants?.find((entry) => entry.id === player.value?.id) || null);
const championDaoRhyme = computed(() => player.value?.championDaoRhyme || null);
const duelPhaseText = computed(() => duelSeasonInfo.value.phase === "tournament" ? "天骄淘汰赛" : "积分演武");
const tournamentBracketLayout = { column: 284, card: 248, row: 90, groupGap: 24, cardHeight: 76, offsetX: 20, offsetY: 70 };
const tournamentCollapsedColumnWidth = 92;
const tournamentBracketRounds = computed(() => {
  const tournament = duelTournament.value;
  const plannedRounds = tournament?.bracket?.rounds || [];
  if (!plannedRounds.length) return tournament?.rounds || [];
  const resolvedMatches = new Map();
  return plannedRounds.map((plannedRound) => {
    const playedRound = tournament.rounds?.find((round) => Number(round.round) === Number(plannedRound.round));
    const playedMatches = playedRound?.matches || [];
    return {
      ...plannedRound,
      matches: plannedRound.matches.map((plannedMatch, matchIndex) => {
        const left = plannedMatch.left || resolvedMatches.get(`tournament-${tournament.season}-r${plannedMatch.leftFrom?.round}-m${plannedMatch.leftFrom?.match}`)?.winner || null;
        const right = plannedMatch.right || resolvedMatches.get(`tournament-${tournament.season}-r${plannedMatch.rightFrom?.round}-m${plannedMatch.rightFrom?.match}`)?.winner || null;
        const visualMatch = { ...plannedMatch, left, right, day: plannedRound.day, date: plannedRound.date };
        const playedMatch = plannedRound.round > 1
          ? playedMatches.find((match) => match.planId === plannedMatch.id || match.id === plannedMatch.id) || playedMatches[matchIndex]
          : playedMatches.find((match) => (
            match.planId === plannedMatch.id || match.id === plannedMatch.id
          ) && tournamentMatchParticipantsMatch(match, visualMatch))
            || playedMatches.find((match) => tournamentMatchParticipantsMatch(match, visualMatch));
        const mergedMatch = playedMatch ? { ...visualMatch, ...playedMatch } : visualMatch;
        resolvedMatches.set(plannedMatch.id, mergedMatch);
        return mergedMatch;
      })
    };
  });
});

const tournamentBracketGeometry = computed(() => {
  const firstVisibleRoundIndex = Math.min(
    tournamentCollapsedPrefixLength.value,
    Math.max(0, tournamentBracketRounds.value.length - 1)
  );
  const firstVisibleRoundMatches = tournamentBracketRounds.value[firstVisibleRoundIndex]?.matches?.length || 1;
  return {
    width: tournamentBracketRounds.value.reduce((width, round) => (
      width + (isTournamentRoundCollapsed(round) ? tournamentCollapsedColumnWidth : tournamentBracketLayout.column)
    ), tournamentBracketLayout.offsetX * 2),
    height: Math.max(
      380,
      tournamentMatchCenter(firstVisibleRoundIndex, firstVisibleRoundMatches - 1)
        + tournamentBracketLayout.cardHeight / 2
        + 60
    )
  };
});

const tournamentBracketCanvasStyle = computed(() => {
  return {
    width: `${tournamentBracketGeometry.value.width}px`,
    height: `${tournamentBracketGeometry.value.height}px`,
    transform: `translate(${tournamentBracketPan.x}px, ${tournamentBracketPan.y}px) scale(${tournamentBracketZoom.value})`
  };
});

const tournamentBracketConnectors = computed(() => {
  const connectors = [];
  for (let roundIndex = 0; roundIndex < tournamentBracketRounds.value.length - 1; roundIndex += 1) {
    const currentRound = tournamentBracketRounds.value[roundIndex];
    const nextRound = tournamentBracketRounds.value[roundIndex + 1];
    if (isTournamentRoundCollapsed(currentRound) || isTournamentRoundCollapsed(nextRound)) continue;
    for (let matchIndex = 0; matchIndex < (nextRound.matches || []).length; matchIndex += 1) {
      const firstY = tournamentMatchCenter(roundIndex, matchIndex * 2);
      const secondY = tournamentMatchCenter(roundIndex, matchIndex * 2 + 1);
      const nextY = tournamentMatchCenter(roundIndex + 1, matchIndex);
      const startX = tournamentRoundLeft(roundIndex) + tournamentBracketLayout.card;
      const jointX = startX + 14;
      const nextX = tournamentRoundLeft(roundIndex + 1);
      connectors.push({
        id: `connector-${roundIndex}-${matchIndex}`,
        path: `M ${startX} ${firstY} H ${jointX} V ${secondY} M ${jointX} ${nextY} H ${nextX}`
      });
    }
  }
  return connectors;
});

function tournamentMatchPosition(roundIndex, matchIndex) {
  return { top: `${tournamentMatchCenter(roundIndex, matchIndex) - tournamentBracketLayout.cardHeight / 2}px` };
}

function tournamentRoundStyle(roundIndex) {
  const round = tournamentBracketRounds.value[roundIndex];
  return {
    left: `${tournamentRoundLeft(roundIndex)}px`,
    width: `${isTournamentRoundCollapsed(round) ? tournamentCollapsedColumnWidth : tournamentBracketLayout.card}px`
  };
}

function tournamentRoundLeft(roundIndex) {
  let left = tournamentBracketLayout.offsetX;
  for (let index = 0; index < roundIndex; index += 1) {
    left += isTournamentRoundCollapsed(tournamentBracketRounds.value[index])
      ? tournamentCollapsedColumnWidth
      : tournamentBracketLayout.column;
  }
  return left;
}

function tournamentRoundKey(round) {
  return `${duelTournament.value?.season || 0}-${round?.round || 0}`;
}

const tournamentCollapsedPrefixLength = computed(() => {
  let count = 0;
  for (const round of tournamentBracketRounds.value) {
    if (!collapsedTournamentRounds.value.has(tournamentRoundKey(round))) break;
    count += 1;
  }
  return count;
});

function isTournamentRoundCollapsed(round) {
  const roundIndex = tournamentBracketRounds.value.indexOf(round);
  return roundIndex >= 0 && roundIndex < tournamentCollapsedPrefixLength.value;
}

function canToggleTournamentRound(round, roundIndex) {
  const collapsedCount = tournamentCollapsedPrefixLength.value;
  if (isTournamentRoundCollapsed(round)) return roundIndex === collapsedCount - 1;
  return roundIndex === collapsedCount && roundIndex < tournamentBracketRounds.value.length - 1;
}

function toggleTournamentRound(round) {
  const rounds = tournamentBracketRounds.value;
  const roundIndex = rounds.indexOf(round);
  const collapsedCount = tournamentCollapsedPrefixLength.value;
  if (!canToggleTournamentRound(round, roundIndex)) return;
  const nextCount = roundIndex < collapsedCount ? collapsedCount - 1 : collapsedCount + 1;
  collapsedTournamentRounds.value = new Set(rounds.slice(0, nextCount).map(tournamentRoundKey));
}

function tournamentMatchCenter(roundIndex, matchIndex) {
  const visibleRoundIndex = Math.max(0, roundIndex - tournamentCollapsedPrefixLength.value);
  return tournamentMatchCenterAtDepth(visibleRoundIndex, matchIndex);
}

function tournamentMatchCenterAtDepth(roundDepth, matchIndex) {
  if (roundDepth <= 0) {
    return tournamentBracketLayout.offsetY
      + matchIndex * tournamentBracketLayout.row
      + Math.floor(matchIndex / 2) * tournamentBracketLayout.groupGap
      + tournamentBracketLayout.cardHeight / 2;
  }
  return (
    tournamentMatchCenterAtDepth(roundDepth - 1, matchIndex * 2)
    + tournamentMatchCenterAtDepth(roundDepth - 1, matchIndex * 2 + 1)
  ) / 2;
}

function tournamentMatchParticipantsMatch(actual, planned) {
  const actualIds = [actual?.left?.id, actual?.right?.id].filter(Boolean).sort();
  const plannedIds = [planned?.left?.id, planned?.right?.id].filter(Boolean).sort();
  return actualIds.length === plannedIds.length && actualIds.every((id, index) => id === plannedIds[index]);
}

function tournamentSlotLabel(match, side) {
  if (match?.[`${side}From`]) return "胜者待定";
  return side === "right" && match?.type === "bye" ? "轮空晋级" : "待定";
}

function tournamentCombatantLabel(person, fallback) {
  if (!person) return fallback;
  const rank = person.rankName || person.duelSeason?.rankName || duelRankText(matchPerson(person));
  return rank ? `${person.name} · ${rank}` : person.name;
}

function tournamentMatchStatus(match) {
  if (match?.winner) return "已结束";
  if (Number(match?.day) === Number(gameState.value.day)) return "今日待战";
  return Number(match?.day) > Number(gameState.value.day) ? "待开赛" : "待补赛";
}

function adjustTournamentZoom(delta) {
  tournamentBracketZoom.value = Math.min(1.15, Math.max(0.38, Number((tournamentBracketZoom.value + delta).toFixed(2))));
}

function resetTournamentBracketView() {
  tournamentBracketZoom.value = 0.72;
  tournamentBracketPan.x = 0;
  tournamentBracketPan.y = 0;
}

async function toggleTournamentBracketFullscreen() {
  const panel = tournamentBracketPanel.value;
  if (!panel) return;
  if (document.fullscreenElement === panel) {
    await document.exitFullscreen?.();
    return;
  }
  await panel.requestFullscreen?.();
}

function syncTournamentBracketFullscreen() {
  tournamentBracketFullscreen.value = document.fullscreenElement === tournamentBracketPanel.value;
}

function onTournamentBracketWheel(event) {
  adjustTournamentZoom(event.deltaY < 0 ? 0.08 : -0.08);
}

function startTournamentBracketPan(event) {
  if (event.button !== 0 || event.target?.closest?.("button")) return;
  tournamentBracketDrag.active = true;
  tournamentBracketDrag.pointerId = event.pointerId;
  tournamentBracketDrag.startX = event.clientX;
  tournamentBracketDrag.startY = event.clientY;
  tournamentBracketDrag.originX = tournamentBracketPan.x;
  tournamentBracketDrag.originY = tournamentBracketPan.y;
  tournamentBracketViewport.value?.setPointerCapture?.(event.pointerId);
}

function moveTournamentBracketPan(event) {
  if (!tournamentBracketDrag.active || event.pointerId !== tournamentBracketDrag.pointerId) return;
  tournamentBracketPan.x = tournamentBracketDrag.originX + event.clientX - tournamentBracketDrag.startX;
  tournamentBracketPan.y = tournamentBracketDrag.originY + event.clientY - tournamentBracketDrag.startY;
}

function endTournamentBracketPan(event) {
  if (event.pointerId !== tournamentBracketDrag.pointerId) return;
  tournamentBracketDrag.active = false;
  tournamentBracketDrag.pointerId = null;
  tournamentBracketViewport.value?.releasePointerCapture?.(event.pointerId);
}

function isTournamentPlayerMatch(match) {
  return Boolean(match?.left?.id === player.value?.id || match?.right?.id === player.value?.id);
}
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
const taskProgressState = computed(() => {
  const progress = gameState.value.taskProgress || {};
  return progress.entries ? progress : { entries: progress, baseXp: 0, fullXpBudget: 500, reducedMultiplier: 0.4 };
});
const todayPlan = computed(() => derived.value.todayPlan || {});
const dailyRootFortune = computed(() => derived.value.dailyRootFortune || player.value.dailyRootFortune || {
  rootKey: "metal",
  name: "金灵根",
  effectText: "攻击提高 12%",
  playerMatched: false,
  playerRate: 0,
  playerEffectText: "今日未触发属性共鸣",
  resonantCount: 0,
  recent: []
});
const encounterState = computed(() => gameState.value.encounters || { pending: [], history: [], relationships: [], focusedNpcIds: [], activeChains: [], definitionCount: 240, minGapDays: 2, maxGapDays: 4, daysUntilNext: 0, collection: { discovered: 0, total: 240 } });
const pendingEncounters = computed(() => encounterState.value.pending || []);
const activeEncounter = computed(() => pendingEncounters.value.find((event) => event.id === selectedEncounterId.value) || pendingEncounters.value[0] || null);
const encounterHistory = computed(() => encounterState.value.history || []);
const daoTrialState = computed(() => gameState.value.daoTrial || { routes: [], companions: [], history: [], attemptsRemaining: 0, officialAttempts: 3, activeRun: null });
const activeDaoTrialRun = computed(() => daoTrialState.value.activeRun || null);
const visibleDaoTrialNodes = computed(() => {
  const nodes = activeDaoTrialRun.value?.nodes || [];
  const windowSize = 7;
  if (nodes.length <= windowSize) return nodes;

  const activeIndex = nodes.findIndex((node) => node.state === "current");
  const fallbackIndex = Math.max(0, Math.min(nodes.length - 1, Number(activeDaoTrialRun.value?.floor || 1) - 1));
  const currentIndex = activeIndex >= 0 ? activeIndex : fallbackIndex;
  const start = Math.max(0, Math.min(nodes.length - windowSize, currentIndex - Math.floor(windowSize / 2)));
  return nodes.slice(start, start + windowSize);
});
const selectedDaoTrialRoute = computed(() => daoTrialState.value.routes?.find((route) => route.id === selectedDaoTrialRouteId.value) || daoTrialState.value.routes?.[0] || null);
const selectedDaoTrialMastery = computed(() => daoTrialState.value.routeMastery?.[selectedDaoTrialRoute.value?.id] || { level: 0, bestFloor: 0, bestScore: 0, unlocks: [] });
const selectedDaoTrialCompanion = computed(() => daoTrialState.value.companions?.find((entry) => entry.person?.id === selectedDaoTrialCompanionId.value) || null);
const encounterSeasonLabel = computed(() => ({ spring: "春序", summer: "夏序", autumn: "秋序", winter: "冬序" })[encounterState.value.season] || "四时");
const encounterCollection = computed(() => encounterState.value.collection || { discovered: 0, total: encounterState.value.definitionCount || 240, completedChains: 0, endedChains: 0 });
const daoTrialCatalogSource = computed(() => daoTrialCatalogMode.value === "laws"
  ? (daoTrialState.value.lawCatalog || [])
  : (daoTrialState.value.sealCatalog || []));
const daoTrialCatalogSchools = computed(() => [...new Set(daoTrialCatalogSource.value.map((entry) => entry.school).filter(Boolean))]);
const daoTrialCatalogBranches = computed(() => [...new Set(daoTrialCatalogSource.value
  .filter((entry) => !daoTrialCatalogSchool.value || entry.school === daoTrialCatalogSchool.value)
  .map((entry) => entry.branch)
  .filter(Boolean))]);
const filteredDaoTrialCatalog = computed(() => {
  const query = daoTrialCatalogQuery.value.trim().toLocaleLowerCase("zh-Hans-CN");
  const rarityOrder = { diamond: 3, gold: 2, silver: 1 };
  return daoTrialCatalogSource.value.filter((entry) => {
    if (daoTrialCatalogSchool.value && entry.school !== daoTrialCatalogSchool.value) return false;
    if (daoTrialCatalogMode.value === "laws" && daoTrialCatalogBranch.value && entry.branch !== daoTrialCatalogBranch.value) return false;
    if (daoTrialCatalogMode.value === "laws" && daoTrialCatalogRarity.value && entry.rarity !== daoTrialCatalogRarity.value) return false;
    if (daoTrialCatalogDiscovery.value === "seen" && !entry.discovered) return false;
    if (daoTrialCatalogDiscovery.value === "unseen" && entry.discovered) return false;
    if (query && !`${entry.name} ${entry.school} ${entry.branch || ""} ${entry.text} ${(entry.mechanics || []).map((mechanic) => mechanic.summary).join(" ")}`.toLocaleLowerCase("zh-Hans-CN").includes(query)) return false;
    return true;
  }).sort((a, b) => (
    Number(b.discovered) - Number(a.discovered)
    || (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0)
    || a.school.localeCompare(b.school, "zh-Hans-CN")
    || a.name.localeCompare(b.name, "zh-Hans-CN")
  ));
});
const daoTrialCatalogPageCount = computed(() => Math.max(1, Math.ceil(filteredDaoTrialCatalog.value.length / daoTrialCatalogPageSize)));
const pagedDaoTrialCatalog = computed(() => {
  const page = Math.min(daoTrialCatalogPage.value, daoTrialCatalogPageCount.value);
  const offset = (page - 1) * daoTrialCatalogPageSize;
  return filteredDaoTrialCatalog.value.slice(offset, offset + daoTrialCatalogPageSize);
});

function resetDaoTrialCatalogFilters(mode = daoTrialCatalogMode.value) {
  daoTrialCatalogMode.value = mode;
  daoTrialCatalogQuery.value = "";
  daoTrialCatalogSchool.value = "";
  daoTrialCatalogBranch.value = "";
  daoTrialCatalogRarity.value = "";
  daoTrialCatalogDiscovery.value = "";
  daoTrialCatalogPage.value = 1;
}
const taskSelectableDayCount = 3;
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
const taskSelectableDays = computed(() => {
  const currentDay = Math.max(1, Number(gameState.value.day) || 1);
  return Array.from({ length: Math.min(taskSelectableDayCount, currentDay) }, (_, index) => {
    const day = currentDay - index;
    const date = dateForDay(day);
    return {
      day,
      date,
      label: index === 0 ? "今日" : index === 1 ? "昨日" : "前日",
      text: `第 ${day} 天`
    };
  });
});
const taskDateMin = computed(() => taskSelectableDays.value.at(-1)?.date || currentDate.value);
const taskDateMax = computed(() => taskSelectableDays.value[0]?.date || currentDate.value);
const selectedTaskDay = computed(() => {
  const currentDay = Math.max(1, Number(gameState.value.day) || 1);
  const day = Math.max(1, Math.floor(Number(taskForm.targetDay) || currentDay));
  return Math.max(Math.max(1, currentDay - taskSelectableDayCount + 1), Math.min(currentDay, day));
});
const selectedTaskDate = computed({
  get() {
    return dateForDay(selectedTaskDay.value);
  },
  set(value) {
    const match = taskSelectableDays.value.find((day) => day.date === value);
    taskForm.targetDay = match?.day || gameState.value.day;
  }
});
const selectedTaskDayMeta = computed(() => taskSelectableDays.value.find((day) => day.day === selectedTaskDay.value) || taskSelectableDays.value[0]);
const taskMultiplierRecords = computed(() => gameState.value.taskMultiplierRecords || []);
const selectedTaskMultiplierRecord = computed(() => {
  const day = selectedTaskDay.value;
  const found = taskMultiplierRecords.value.find((record) => Number(record.day) === day);
  if (day === gameState.value.day) {
    const effects = shopDerived.value.activeEffects || {};
    const elixirMultiplier = Math.max(1, Number(effects.cultivationMultiplier) || 1);
    const sectXpMultiplier = Math.max(1, Number(personInsight(player.value).tomorrowXp?.sectMultiplier) || 1);
    return {
      day,
      date: found?.date || selectedTaskDate.value,
      elixirMultiplier,
      sectXpMultiplier,
      totalMultiplier: elixirMultiplier * sectXpMultiplier
    };
  }
  if (found) return normalizeTaskMultiplierRecord(found, day, selectedTaskDate.value);
  return {
    day,
    date: selectedTaskDate.value,
    elixirMultiplier: 1,
    sectXpMultiplier: 1,
    totalMultiplier: 1
  };
});
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
const selectedTaskProgress = computed(() => taskProgressState.value.entries?.[selectedTaskDefinition.value?.id] || { amount: 0, awardedMultiplier: 0 });
const selectedTaskProgressText = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task) return "";
  if (task.type !== "measurable") return selectedTaskProgress.value.awardedMultiplier >= 1 ? "今日已结算" : "今日可结算 1 次";
  const max = Math.max(0.01, Number(task.targetAmount) || 1) * Math.max(1, Number(task.maxMultiplier) || 1);
  return `已计入 ${formatTaskAmount(selectedTaskProgress.value.amount)} / ${formatTaskAmount(max)} ${task.unitName}`;
});
const taskCanSettle = computed(() => {
  const task = selectedTaskDefinition.value;
  if (!task) return false;
  const progress = selectedTaskProgress.value;
  if (task.type !== "measurable") return Number(progress.awardedMultiplier) < 1;
  const target = Math.max(0.01, Number(task.targetAmount) || 1);
  const requested = Math.min(taskAmountMax.value, Math.max(0, Number(taskForm.completedAmount) || 0));
  return requested / target > Number(progress.awardedMultiplier || 0) + 0.000001;
});
const taskCategoryCounts = computed(() => enabledTaskDefinitions.value.reduce((counts, task) => {
  const category = normalizedTaskCategory(task.category);
  counts[category] = (counts[category] || 0) + 1;
  return counts;
}, {}));
const taskCompletions = computed(() => gameState.value.taskCompletions || []);
const todayTaskCompletions = computed(() => taskCompletions.value.filter((task) => task.day === gameState.value.day));
const todayTaskSummary = computed(() => todayTaskCompletions.value.reduce((summary, task) => ({
  count: summary.count + 1,
  xp: summary.xp + (Number(task.xp) || 0),
  spirit: summary.spirit + (Number(task.spirit) || 0)
}), { count: 0, xp: 0, spirit: 0 }));
const selectedTaskCompletions = computed(() => taskCompletions.value.filter((task) => Number(task.day) === selectedTaskDay.value));
const selectedTaskSummary = computed(() => selectedTaskCompletions.value.reduce((summary, task) => ({
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
  if (!task) return { xp: 0, rawXp: 0, baseXp: 0, spirit: 0, multiplier: 0, elixirMultiplier: 1, sectXpMultiplier: 1, talentMultiplier: 1, catchupMultiplier: 1, fortuneMultiplier: 1, xpMultiplier: 1 };
  const amount = task.type === "measurable" ? Math.max(0, Number(taskForm.completedAmount) || 0) : 1;
  const target = Math.max(0.01, Number(task.targetAmount) || 1);
  const maxMultiplier = Math.max(0.01, Number(task.maxMultiplier) || 1);
  const completedMultiplier = task.type === "measurable" ? Math.min(amount / target, maxMultiplier) : 1;
  const multiplier = Math.max(0, completedMultiplier - Number(selectedTaskProgress.value.awardedMultiplier || 0));
  const rawXp = Number(task.xpReward) || 0;
  const requestedBaseXp = Math.round(rawXp * multiplier);
  const usedBaseXp = Math.max(0, Number(taskProgressState.value.baseXp) || 0);
  const fullBudget = Math.max(0, Number(taskProgressState.value.fullXpBudget) || 500);
  const full = Math.min(requestedBaseXp, Math.max(0, fullBudget - usedBaseXp));
  const reduced = Math.max(0, requestedBaseXp - full);
  const baseXp = Math.round(full + reduced * Number(taskProgressState.value.reducedMultiplier || 0.4));
  const elixirMultiplier = Math.max(1, Number(selectedTaskMultiplierRecord.value?.elixirMultiplier) || 1);
  const sectXpMultiplier = Math.max(1, Number(selectedTaskMultiplierRecord.value?.sectXpMultiplier) || 1);
  const talentMultiplier = Math.max(1, Number(talentInfo(player.value).xpMultiplier) || 1);
  const catchupMultiplier = Math.max(1, Number(todayPlan.value.catchup?.multiplier) || 1);
  const selectedFortune = selectedTaskDay.value === gameState.value.day
    ? dailyRootFortune.value
    : dailyRootFortune.value.recent?.find((entry) => Number(entry.day) === Number(selectedTaskDay.value));
  const fortuneMultiplier = selectedFortune?.stat === "xp" && (selectedFortune.playerMatched ?? selectedFortune.matched)
    ? 1 + Math.max(0, Number(selectedFortune.playerRate ?? selectedFortune.rate) || 0)
    : 1;
  const afterElixirXp = Math.round(baseXp * elixirMultiplier);
  const beforeTalentXp = Math.round(afterElixirXp * sectXpMultiplier);
  const xpMultiplier = elixirMultiplier * sectXpMultiplier * talentMultiplier * catchupMultiplier * fortuneMultiplier;
  return {
    xp: Math.round(beforeTalentXp * talentMultiplier * catchupMultiplier * fortuneMultiplier),
    rawXp,
    baseXp,
    spirit: Math.round((Number(task.spiritReward) || 0) * multiplier),
    multiplier,
    completedMultiplier,
    requestedBaseXp,
    reducedBaseXp: reduced,
    elixirMultiplier,
    sectXpMultiplier,
    talentMultiplier,
    catchupMultiplier,
    fortuneMultiplier,
    xpMultiplier
  };
});
const taskRewardFormulaText = computed(() => {
  const task = selectedTaskDefinition.value;
  const preview = taskRewardPreview.value;
  const dayLabel = selectedTaskDayMeta.value?.label || "所选日";
  if (!task) return `${dayLabel}修为公式：请选择任务。`;
  const parts = [`基础 +${Math.floor(preview.rawXp || 0)}`];
  if (task.type === "measurable") parts.push(`新增进度 x${formatFormulaMultiplier(preview.multiplier)}`);
  parts.push(`丹药 x${formatFormulaMultiplier(preview.elixirMultiplier)}`);
  parts.push(`宗门 x${formatFormulaMultiplier(preview.sectXpMultiplier)}`);
  parts.push(`天赋 x${formatFormulaMultiplier(preview.talentMultiplier)}`);
  parts.push(`追赶 x${formatFormulaMultiplier(preview.catchupMultiplier)}`);
  if (preview.fortuneMultiplier > 1) parts.push(`天运 x${formatFormulaMultiplier(preview.fortuneMultiplier)}`);
  const budget = preview.reducedBaseXp ? "；超出有效修行预算部分按 40% 计入" : "";
  return `${dayLabel}修为公式：${parts.join(" × ")} = +${preview.xp}（总加成 ${formatTaskBonusPercent(preview.xpMultiplier)}，各阶段四舍五入）${budget}`;
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
  const divisions = max <= 6 && Number.isInteger(max) ? max : 4;
  return Array.from({ length: divisions + 1 }, (_, index) => {
    const value = Number((max * index / divisions).toFixed(2));
    return {
      value,
      label: formatTaskAmount(value),
      percent: Math.round((value / max) * 10000) / 100
    };
  });
});
const taskStatusCards = computed(() => {
  const effects = shopDerived.value.activeEffects || {};
  const multiplier = Math.max(1, Number(selectedTaskMultiplierRecord.value?.totalMultiplier) || 1);
  const elixirMultiplier = Math.max(1, Number(selectedTaskMultiplierRecord.value?.elixirMultiplier) || 1);
  const sectXpMultiplier = Math.max(1, Number(selectedTaskMultiplierRecord.value?.sectXpMultiplier) || 1);
  const daysLeft = selectedTaskDay.value === gameState.value.day ? Math.max(0, Number(effects.cultivationMultiplierDaysLeft) || 0) : 0;
  const dayLabel = selectedTaskDayMeta.value?.label || "所选日";
  return [
    { label: `${dayLabel}完成`, value: selectedTaskSummary.value.count, note: "现实任务", icon: CheckCircle2, asset: "/assets/tasks/icon-scroll.svg", tone: "count" },
    { label: `${dayLabel}修为`, value: `+${selectedTaskSummary.value.xp}`, note: "经验入账", icon: Sprout, asset: "/assets/tasks/icon-life.svg", tone: "xp" },
    { label: `${dayLabel}灵石`, value: `+${selectedTaskSummary.value.spirit}`, note: "可用于坊市", icon: Gem, asset: "/assets/tasks/icon-crystal.svg", tone: "spirit" },
    {
      label: "修为加成",
      value: formatTaskBonusPercent(multiplier),
      note: selectedTaskDay.value === gameState.value.day
        ? `丹药 x${formatFormulaMultiplier(elixirMultiplier)} · 宗门 x${formatFormulaMultiplier(sectXpMultiplier)}${daysLeft > 0 ? ` · 药力剩余 ${daysLeft} 天` : ""}`
        : "当日丹药与宗门快照",
      icon: Sparkles,
      asset: "/assets/tasks/icon-elixir.svg",
      tone: multiplier > 1 ? "elixir active" : "elixir"
    }
  ];
});
const taskTodayHint = computed(() => {
  if (!todayTaskSummary.value.count) return "今日札记未开笔，先完成一项现实任务积攒修为。";
  if (taskRewardPreview.value.xpMultiplier > 1) return "修为加成正在生效，现实任务会获得额外修为。";
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
const playerSectName = computed(() => player.value?.sect || gameState.value.sect?.name || "");
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
  { id: "thunder", name: "雷灵根", keys: ["metal", "wood", "earth"], note: "灵根仅由金、木、土组成时自动转换；克金灵根、木灵根、土灵根，不被其他灵根相克。" },
  { id: "wind", name: "风灵根", keys: ["water", "fire", "heaven"], note: "灵根仅由水、火、天组成时自动转换；克水灵根、火灵根、天灵根，不被其他灵根相克。" },
  { id: "hidden", name: "隐灵根", keys: ["metal", "wood", "water", "fire", "earth"], note: "灵根仅由金、木、水、火、土组成时自动转换；克五行灵根，不被其他灵根相克。" }
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
const adminSelectedAccount = computed(() => adminAccounts.value.find((account) => account.id === adminSelectedAccountId.value) || adminAccounts.value[0] || null);
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
const filteredAdminWikiArticles = computed(() => {
  const keyword = normalizedAdminSearch.value;
  if (!keyword) return adminWikiArticles;
  return adminWikiArticles.filter((article) => [
    article.category,
    article.title,
    article.summary,
    ...article.sections.flatMap((section) => [section.title, ...(section.paragraphs || []), ...(section.bullets || []), section.tip])
  ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
});
const adminWikiArticle = computed(() => filteredAdminWikiArticles.value.find((article) => article.id === adminWikiArticleId.value)
  || filteredAdminWikiArticles.value[0]
  || null);
const guideArticle = computed(() => adminWikiArticles.find((article) => article.id === guideArticleId.value)
  || adminWikiArticles[0]
  || null);
const dungeonRecordTabs = [
  { id: "blood", label: "血色禁地" },
  { id: "void", label: "虚天殿" },
  { id: "sea", label: "乱星海猎妖" }
];
const dungeonMonsterStages = monsterStageNames.map((stageName, stage) => ({
  stage,
  name: stageName,
  monsters: monsterImageEntries.filter((monster) => monster.stage === stage)
}));
const dungeonDays = computed(() => gameState.value.dungeonDays || []);
const battleArchives = computed(() => gameState.value.battleArchives?.summaries || []);
const latestBattleArchive = computed(() => battleArchives.value[0] || null);
const activeDungeonDayIndex = computed(() => dungeonDayIndexes[activeDungeonRecordTab.value] || 0);
const selectedDungeonDay = computed(() => dungeonDays.value[activeDungeonDayIndex.value] || null);
const canShowPreviousDungeonDay = computed(() => activeDungeonDayIndex.value < dungeonDays.value.length - 1);
const canShowNextDungeonDay = computed(() => activeDungeonDayIndex.value > 0);
const dungeonDateMin = computed(() => dateForDay(recentBattleDayFloor()));
const dungeonDateMax = computed(() => currentDate.value);
const selectedDungeonCalendarDate = computed({
  get() {
    return selectedDungeonDay.value?.date || dateForDay(selectedDungeonDay.value?.day || gameState.value.day);
  },
  set(value) {
    const day = clampRecentBattleDay(dayForDate(value));
    const index = dungeonDays.value.findIndex((record) => Number(record.day) === Number(day));
    if (index >= 0) {
      dungeonDayIndexes[activeDungeonRecordTab.value] = index;
      closeBattleReplay();
    }
  }
});
const bloodTrialClearCount = computed(() => (selectedDungeonDay.value?.bloodTrial?.caves || []).reduce((sum, cave) => sum + bloodCaveClearCount(cave), 0));
const sortedVoidHallRecords = computed(() => [...(selectedDungeonDay.value?.sects || [])].sort((a, b) => (
  Number(b.success) - Number(a.success) ||
  Number(b.totalDamage || 0) - Number(a.totalDamage || 0) ||
  String(a.sect || "").localeCompare(String(b.sect || ""), "zh-Hans-CN")
)));
const selectedVoidHallRecord = computed(() => sortedVoidHallRecords.value.find((record) => record.sect === selectedVoidHallSect.value));
function switchDungeonRecordTab(tabId) {
  if (!dungeonRecordTabs.some((tab) => tab.id === tabId)) return;
  activeDungeonRecordTab.value = tabId;
  selectedVoidHallSect.value = "";
  clearBattleReplay();
}

function encounterRarityLabel(rarity) {
  return ({ common: "寻常", uncommon: "少见", rare: "稀有", fated: "奇缘" })[rarity] || "因缘";
}

function encounterChoiceHint(choice) {
  if (!choice) return "";
  return choice.impact ? `${choice.hint} · ${choice.impact}` : choice.hint;
}

function selectEncounter(eventId) {
  if (pendingEncounters.value.some((event) => event.id === eventId)) selectedEncounterId.value = eventId;
}

async function chooseEncounter(choice) {
  const event = activeEncounter.value;
  if (!event || !choice?.canChoose) return;
  const target = captureBattleReturn();
  const result = await act("/api/encounters/choose", { eventId: event.id, choiceId: choice.id }, { scope: "lite", markStale: true });
  selectedEncounterId.value = pendingEncounters.value[0]?.id || "";
  if (result?.replay) {
    activeTab.value = "trial";
    openBattleReplay(result.replay, target);
  }
}

async function toggleEncounterFocus(person = selectedPerson.value) {
  if (!person?.id || person.id === "player") return;
  const relationship = selectedPersonRelationship.value;
  const result = await act("/api/encounters/focus", { npcId: person.id, focused: !relationship?.focused }, { scope: "lite", markStale: true });
  if (result) await ensurePersonDetail(person.id, true);
}

async function startSelectedDaoTrial() {
  const route = selectedDaoTrialRoute.value;
  if (!route) return;
  await act("/api/dao-trial/start", {
    routeId: route.id,
    companionId: selectedDaoTrialCompanionId.value || ""
  }, { scope: "dao-trial" });
}

async function chooseDaoTrialSeal(sealId) {
  await act("/api/dao-trial/advance", { action: "seal", sealId }, { scope: "dao-trial" });
}

async function rerollDaoTrialSeals() {
  await act("/api/dao-trial/advance", { action: "reroll" }, { scope: "dao-trial" });
}

async function chooseDaoTrialLaw(lawId) {
  await act("/api/dao-trial/advance", { action: "law", lawId }, { scope: "dao-trial" });
}

async function rerollDaoTrialLaws() {
  await act("/api/dao-trial/advance", { action: "reroll-law" }, { scope: "dao-trial" });
}

async function continueDaoTrialCheckpoint() {
  await act("/api/dao-trial/advance", { action: "continue" }, { scope: "dao-trial" });
}

async function exitDaoTrialCheckpoint() {
  await act("/api/dao-trial/advance", { action: "checkpoint-exit" }, { scope: "dao-trial" });
}

async function useDaoTrialCompanionSupport() {
  await act("/api/dao-trial/advance", { action: "companion" }, { scope: "dao-trial" });
}

async function useDaoTrialLifeHeal() {
  await act("/api/dao-trial/advance", { action: "life-heal" }, { scope: "dao-trial" });
}

async function chooseDaoTrialEvent(optionId) {
  await act("/api/dao-trial/advance", { optionId }, { scope: "dao-trial" });
}

async function fightDaoTrial() {
  const target = captureBattleReturn();
  const result = await act("/api/dao-trial/advance", { action: "battle" }, { scope: "dao-trial" });
  if (result?.replay) openBattleReplay(result.replay, target);
}

async function abandonCurrentDaoTrial() {
  if (!confirm("确定收功离境？将带回当前行囊的 80%，问道签不会返还。")) return;
  await act("/api/dao-trial/abandon", {}, { scope: "dao-trial" });
}

async function openEncounterReplay(record) {
  if (!record?.replayId) return;
  await openReplay(record, null, captureBattleReturn());
}
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
  .sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.score - a.score));
const starSeaPersonalRanking = computed(() => (selectedDungeonDay.value?.public?.teams || [])
  .flatMap((team) => (team.members || []).map((member) => ({
    ...member,
    teamName: member.teamName || team.name,
    teamRank: member.teamRank || team.rank
  })))
  .sort((a, b) => b.damage - a.damage || b.spirit - a.spirit));
const starSeaTeamRankPageCount = computed(() => Math.max(1, Math.ceil(starSeaTeamRanking.value.length / starSeaRankPageSize)));
const safeStarSeaTeamRankPage = computed(() => Math.min(starSeaTeamRankPage.value, starSeaTeamRankPageCount.value));
const pagedStarSeaTeamRanking = computed(() => starSeaTeamRanking.value.slice(
  (safeStarSeaTeamRankPage.value - 1) * starSeaRankPageSize,
  safeStarSeaTeamRankPage.value * starSeaRankPageSize
));
const starSeaPersonalRankPageCount = computed(() => Math.max(1, Math.ceil(starSeaPersonalRanking.value.length / starSeaRankPageSize)));
const safeStarSeaPersonalRankPage = computed(() => Math.min(starSeaPersonalRankPage.value, starSeaPersonalRankPageCount.value));
const starSeaPersonalRankStart = computed(() => (safeStarSeaPersonalRankPage.value - 1) * starSeaRankPageSize);
const pagedStarSeaPersonalRanking = computed(() => starSeaPersonalRanking.value.slice(
  starSeaPersonalRankStart.value,
  starSeaPersonalRankStart.value + starSeaRankPageSize
));
const currentStarSeaCycleSummary = computed(() => visibleStarSeaCycleSummary(selectedDungeonDay.value?.public?.cycle));
const starSeaRecentCycles = computed(() => {
  const byCycle = new Map((gameState.value.starSeaCycleHistory || []).map((record) => [record.cycle, record]));
  const current = currentStarSeaCycleSummary.value;
  if (current?.cycle) {
    const persisted = byCycle.get(current.cycle);
    byCycle.set(current.cycle, {
      ...persisted,
      ...current,
      dayCount: Math.max(Number(persisted?.dayCount || 0), Number(current.dayCount || 0)),
      reward: persisted?.reward || current.reward || null,
      settled: Boolean(persisted?.settled || current.settled)
    });
  }
  return [...byCycle.values()]
    .filter(Boolean)
    .sort((a, b) => (b.cycle || 0) - (a.cycle || 0))
    .slice(0, 10);
});
const starSeaCycleOptions = computed(() => {
  const dataByCycle = new Map(starSeaRecentCycles.value.map((record) => [Number(record.cycle), { ...record, hasData: true }]));
  const latestCycle = Math.max(
    1,
    Number(selectedDungeonDay.value?.public?.cycle || 0),
    Number(currentStarSeaCycleSummary.value?.cycle || 0),
    starSeaCycleForDay(gameState.value.day || 1),
    ...[...dataByCycle.keys()]
  );
  return Array.from({ length: Math.min(10, latestCycle) }, (_, index) => {
    const cycle = latestCycle - index;
    const known = dataByCycle.get(cycle);
    if (known) return known;
    const cycleStartDay = (cycle - 1) * 10 + 1;
    const cycleEndDay = cycleStartDay + 9;
    return {
      cycle,
      cycleStartDay,
      cycleEndDay,
      teamSize: 10,
      dayCount: starSeaCycleElapsedDays({ cycleStartDay, cycleEndDay }),
      totalScore: 0,
      totalDamage: 0,
      settled: cycleEndDay < Number(gameState.value.day || 1),
      reward: null,
      topTeams: [],
      hasData: false
    };
  });
});
const starSeaCycleOptionList = computed(() => (Array.isArray(starSeaCycleOptions.value) ? starSeaCycleOptions.value : []));
const selectedStarSeaCycleSummary = computed(() => {
  const cycle = selectedDungeonDay.value?.public?.cycle;
  return starSeaRecentCycles.value.find((record) => record.cycle === cycle)
    || selectedDungeonDay.value?.public?.cycleSummary
    || null;
});
const activeStarSeaCycle = computed(() => {
  const selected = Number(selectedStarSeaCycle.value || 0);
  const current = Number(selectedDungeonDay.value?.public?.cycle || 0);
  return starSeaCycleOptions.value.find((record) => selected && Number(record.cycle) === selected)
    || starSeaCycleOptions.value.find((record) => current && Number(record.cycle) === current)
    || starSeaCycleOptions.value[0]
    || null;
});
const activeStarSeaCycleTeams = computed(() => activeStarSeaCycle.value?.topTeams || []);
const activeStarSeaCycleTeamList = computed(() => (Array.isArray(activeStarSeaCycleTeams.value) ? activeStarSeaCycleTeams.value : []));
const activeStarSeaCyclePreviousRanks = computed(() => {
  const cycle = Number(activeStarSeaCycle.value?.cycle || 0);
  if (!cycle) return new Map();

  const recordsByDay = new Map();
  for (const dayRecord of dungeonDays.value) {
    const record = dayRecord?.public;
    if (record && Number(record.cycle) === cycle) recordsByDay.set(Number(record.day || dayRecord.day), record);
  }
  const selectedRecord = selectedDungeonDay.value?.public;
  if (selectedRecord && Number(selectedRecord.cycle) === cycle) {
    recordsByDay.set(Number(selectedRecord.day || selectedDungeonDay.value?.day), selectedRecord);
  }
  const records = [...recordsByDay.values()].filter((record) => Number.isFinite(Number(record.day)));
  const latestDay = Math.max(...records.map((record) => Number(record.day)));
  if (!Number.isFinite(latestDay)) return new Map();

  const totals = new Map();
  for (const record of records) {
    if (Number(record.day) >= latestDay) continue;
    for (const team of record.teams || []) {
      const key = team.id || team.name;
      if (!key) continue;
      const current = totals.get(key) || { score: 0, damage: 0, successes: 0 };
      current.score += Number(team.score || 0);
      current.damage += Number(team.damage || 0);
      current.successes += team.success ? 1 : 0;
      totals.set(key, current);
    }
  }
  return new Map([...totals.entries()]
    .sort(([, a], [, b]) => b.score - a.score || b.damage - a.damage || b.successes - a.successes)
    .map(([key], index) => [key, index + 1]));
});
const activeStarSeaCycleMemberList = computed(() => [...(activeStarSeaCycle.value?.topMembers || [])]
  .sort((a, b) => b.damage - a.damage || b.spirit - a.spirit)
  .map((member, index) => ({ ...member, rank: index + 1 })));
const filteredStarSeaCycleMemberList = computed(() => {
  const keyword = starSeaCycleMemberSearch.value.trim().toLowerCase();
  if (!keyword) return activeStarSeaCycleMemberList.value;
  return activeStarSeaCycleMemberList.value.filter((member) => [member.name, member.sect]
    .some((value) => String(value || "").toLowerCase().includes(keyword)));
});
const starSeaCycleTeamRankPageCount = computed(() => Math.max(1, Math.ceil(activeStarSeaCycleTeamList.value.length / starSeaRankPageSize)));
const safeStarSeaCycleTeamRankPage = computed(() => Math.min(starSeaCycleTeamRankPage.value, starSeaCycleTeamRankPageCount.value));
const pagedStarSeaCycleTeams = computed(() => activeStarSeaCycleTeamList.value.slice(
  (safeStarSeaCycleTeamRankPage.value - 1) * starSeaRankPageSize,
  safeStarSeaCycleTeamRankPage.value * starSeaRankPageSize
));
const starSeaCycleMemberRankPageCount = computed(() => Math.max(1, Math.ceil(filteredStarSeaCycleMemberList.value.length / starSeaRankPageSize)));
const safeStarSeaCycleMemberRankPage = computed(() => Math.min(starSeaCycleMemberRankPage.value, starSeaCycleMemberRankPageCount.value));
const starSeaCycleMemberRankStart = computed(() => (safeStarSeaCycleMemberRankPage.value - 1) * starSeaRankPageSize);
const pagedStarSeaCycleMembers = computed(() => filteredStarSeaCycleMemberList.value.slice(
  starSeaCycleMemberRankStart.value,
  starSeaCycleMemberRankStart.value + starSeaRankPageSize
));
const selectedStarSeaCycleReward = computed(() => selectedStarSeaCycleSummary.value?.reward || null);
const starSeaTodayEquipmentName = computed(() => selectedStarSeaCycleReward.value?.itemName || "待结算");
const starSeaTodayEquipmentItem = computed(() => {
  const record = selectedStarSeaCycleReward.value;
  if (!record?.itemName) return null;
  const direct = record.itemId ? equipmentList.value.find((item) => item.id === record.itemId) : null;
  const byName = equipmentList.value.find((item) => item.name === record.itemName);
  const item = direct || byName;
  if (item) return item;
  return {
    id: record.itemId || "",
    name: record.itemName,
    slot: record.itemSlot || "trinket",
    tier: record.itemTier || 1,
    tierName: record.tierName || equipmentTierName(record.itemTier || 1),
    value: record.itemValue || 0
  };
});
const starSeaTodayEquipmentText = computed(() => {
  const record = selectedStarSeaCycleReward.value;
  if (!record?.itemName) return "本期进行中，期末必结算";
  if (record.reason === "equipment_exhausted") return `装备池已空 · 平分 ${record.share || 0}/人`;
  if (record.reason === "auction_unsold") return `无人竞拍 · 平分 ${record.share || 0}/人`;
  if (record.reason === "history_backfill") return `历史补录 · ${record.itemValue || 0} 灵石`;
  const tier = record.tierName ? `${record.tierName} · ` : "";
  const value = record.itemValue ? `${record.itemValue} 灵石` : "待竞拍";
  return `${tier}${value}`;
});
const starSeaAuctionText = computed(() => {
  const record = selectedStarSeaCycleReward.value;
  if (!record?.itemName) return "本期尚未结算";
  if (record.type === "auction") {
    const price = record.itemValue ? ` · ${record.itemValue} 灵石` : "";
    const dividend = record.dividend ? ` · 分红 ${record.dividend}/人` : "";
    return `${record.winnerName || "未知修士"}${price}${dividend}`;
  }
  const share = record.share ? ` · 平分 ${record.share}/人` : "";
  return `${record.itemValue || 0} 灵石${share}`;
});
function visibleStarSeaCycleSummary(cycle) {
  const safeCycle = Number(cycle || 0);
  if (!safeCycle) return null;
  const records = dungeonDays.value
    .map((day) => day?.public)
    .filter((record) => record && Number(record.cycle) === safeCycle);
  const selectedRecord = selectedDungeonDay.value?.public;
  if (selectedRecord && Number(selectedRecord.cycle) === safeCycle && !records.some((record) => record.day === selectedRecord.day)) {
    records.push(selectedRecord);
  }
  if (!records.length) return null;

  const teamMap = new Map();
  const memberMap = new Map();
  for (const record of records) {
    for (const team of record.teams || []) {
      const key = team.id || team.name;
      const summary = teamMap.get(key) || {
        id: team.id || key,
        name: team.name || "猎妖小队",
        rank: 0,
        totalScore: 0,
        totalDamage: 0,
        totalSpirit: 0,
        successes: 0,
        battles: 0,
        memberCount: 0
      };
      summary.totalScore += Number(team.score || 0);
      summary.totalDamage += Number(team.damage || 0);
      summary.totalSpirit += Number(team.spirit || 0);
      summary.successes += team.success ? 1 : 0;
      summary.battles += 1;
      summary.memberCount = Math.max(summary.memberCount, (team.members || []).length);
      teamMap.set(key, summary);

      for (const member of team.members || []) {
        const memberKey = member.id || `${team.id || team.name}-${member.name}`;
        const memberSummary = memberMap.get(memberKey) || {
          id: member.id || memberKey,
          name: member.name || "无名修士",
          sect: member.sect || "",
          realm: member.realm,
          gender: member.gender,
          portraitUrl: member.portraitUrl,
          teamName: team.name || "猎妖小队",
          teamRank: team.rank || 0,
          damage: 0,
          spirit: 0
        };
        memberSummary.damage += Number(member.damage || 0);
        memberSummary.spirit += Number(member.spirit || 0);
        memberMap.set(memberKey, memberSummary);
      }
    }
  }

  const topTeams = [...teamMap.values()]
    .sort((a, b) => b.totalScore - a.totalScore || b.totalDamage - a.totalDamage || b.successes - a.successes)
    .map((team, index) => ({ ...team, rank: index + 1 }));
  const topMembers = [...memberMap.values()]
    .sort((a, b) => b.damage - a.damage || b.spirit - a.spirit);
  const latest = records.sort((a, b) => Number(b.day || 0) - Number(a.day || 0))[0] || {};
  const cycleStartDay = Number(latest.cycleStartDay || ((safeCycle - 1) * 10 + 1));
  const cycleEndDay = Number(latest.cycleEndDay || (cycleStartDay + 9));
  return {
    cycle: safeCycle,
    cycleStartDay,
    cycleEndDay,
    teamSize: latest.teamSize || 10,
    dayCount: Math.max(records.length, starSeaCycleElapsedDays({ cycleStartDay, cycleEndDay })),
    totalScore: topTeams.reduce((sum, team) => sum + team.totalScore, 0),
    totalDamage: topTeams.reduce((sum, team) => sum + team.totalDamage, 0),
    settled: false,
    reward: null,
    topTeams,
    topMembers
  };
}
function starSeaCycleForDay(day = 1) {
  return Math.floor((Math.max(1, Number(day || 1)) - 1) / 10) + 1;
}

function starSeaCycleElapsedDays(cycle) {
  const start = Number(cycle?.cycleStartDay || 0);
  const end = Number(cycle?.cycleEndDay || 0);
  const day = Math.floor(Number(gameState.value.day || selectedDungeonDay.value?.day || 1));
  if (!start || !end || day < start) return 0;
  return Math.min(10, Math.max(0, day - start + 1));
}
function starSeaCycleRewardText(cycle) {
  const reward = cycle?.reward;
  if (!reward?.settled) {
    const ended = Number(gameState.value.day || 1) > Number(cycle?.cycleEndDay || 0);
    return ended ? "装备奖励待补录" : "期末待结算";
  }
  if (reward.reason === "cycle_no_drop") return "";
  if (reward.type === "auction") {
    return `${reward.winnerName || "未知修士"}竞得${reward.tierName || ""}「${reward.itemName || "装备"}」 · ${reward.itemValue || 0} 灵石 · 分红 ${reward.dividend || 0}/人`;
  }
  if (reward.reason === "history_backfill") {
    return `历史补录 · 掉落${reward.tierName || ""}「${reward.itemName || "装备"}」 · 价值 ${reward.itemValue || 0} 灵石`;
  }
  const reason = reward.reason === "equipment_exhausted" ? "装备池已空" : "无人竞拍";
  return `${reason} · 按「${reward.itemName || "装备"}」价值 ${reward.itemValue || 0} 灵石平分 · ${reward.share || 0}/人`;
}
function starSeaCycleScorePercent(team, cycle) {
  const max = Math.max(...((cycle?.topTeams || []).map((item) => Number(item.totalScore || 0))), 1);
  return Math.max(5, Math.min(100, Math.round(Number(team?.totalScore || 0) / max * 100)));
}

function starSeaCycleMemberDamagePercent(member) {
  const max = Math.max(...activeStarSeaCycleMemberList.value.map((item) => Number(item.damage || 0)), 1);
  return Math.max(5, Math.min(100, Math.round(Number(member?.damage || 0) / max * 100)));
}

function starSeaTeamLeader(team) {
  return personByRef({
    ...(team?.leader || {}),
    id: team?.leader?.id || team?.leaderId || "",
    name: team?.leader?.name || team?.leaderName || starSeaTeamLeaderName(team)
  });
}

function starSeaTeamLeaderName(team) {
  return team?.leaderName || String(team?.name || "猎妖修士").replace(/之队$/, "");
}

function starSeaTeamHasPlayer(team) {
  return (team?.members || []).some((member) => member?.id === "player");
}

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
      text: `在 ${equipmentDropSource(drop)} 获得${drop.tierName || "法器"}「${drop.itemName}」 · ${equipmentDropSlotName(drop)} · ${equipmentDropStatName(drop)} +${formatEquipmentPercent(equipmentDropBonus(drop))}${equipmentDropKind(drop) === "steal" && drop.loserName ? ` · 来自 ${drop.loserName}` : ""}`
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
const dailyTickerStyle = computed(() => {
  const speed = Number(gameState.value.gameSettings?.dailyTickerSpeed);
  const normalizedSpeed = Number.isFinite(speed) && speed > 0 ? speed : 1;
  return { animationDuration: `${Math.round(52000 / normalizedSpeed)}ms` };
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
const featuredDungeonForecast = computed(() => {
  const forecast = todayPlan.value.dungeonForecasts?.[0];
  if (!forecast) return "副本预测将在日结算后生成";
  return `${forecast.name} ${forecast.risk} · 预计胜率 ${formatPercent(forecast.winChance)}`;
});
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
  const records = [];
  for (let day = currentDay; day >= firstDay; day -= 1) {
    const logs = uniqueHomeLogs([
      ...playerDailyProgressHomeLogs(day),
      ...playerBreakthroughHomeLogs(day),
      ...playerDungeonHomeLogs(day),
      ...playerDuelHomeLogs(day),
      ...playerSectWarHomeLogs(day),
      ...playerEquipmentHomeLogs(day),
      ...playerActionHomeLogs(day)
    ])
      .map((entry) => ({ ...entry, date: dateForDay(day) }))
      .sort((a, b) => (a.order || 0) - (b.order || 0) || String(a.text).localeCompare(String(b.text), "zh-Hans-CN"))
      .slice(0, 30);
    records.push({
      day,
      date: dateForDay(day),
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
const playerDuelRankPosition = computed(() => {
  if (typeof homeSummary.value.playerDuelRankPosition === "number") return homeSummary.value.playerDuelRankPosition;
  return personDuelRankPosition(player.value);
});
const playerDuelRankText = computed(() => homeSummary.value.playerDuelRankText || duelRankText(withDuelRank(player.value)));
const todayDuelCount = computed(() => {
  if (typeof homeSummary.value.todayDuelCount === "number") return homeSummary.value.todayDuelCount;
  const playerId = player.value?.id || "player";
  return todaysDuelRecord.value?.matches?.filter((match) => {
    const ids = [match.left?.id, match.right?.id, match.winner?.id, match.loser?.id].filter(Boolean);
    return ids.includes(playerId);
  }).length || 0;
});
const provinceWarRecords = computed(() => gameState.value.provinceWars || []);
const todayProvinceWarsByProvinceId = computed(() => {
  const records = new Map();
  for (const war of provinceWarRecords.value) {
    if (Number(war.day) === Number(gameState.value.day) && war.provinceId && !records.has(war.provinceId)) {
      records.set(war.provinceId, war);
    }
  }
  return records;
});
const provinceTerritories = computed(() => {
  const owners = new Map((gameState.value.provinces || []).map((item) => [item.id, item]));
  const strategy = derived.value.sectStrategy || {};
  return (catalog.value.provinces || []).map((province) => {
    const territory = owners.get(province.id) || {};
    const currentProvince = { ...province, type: province.type || "spirit" };
    const strategyValue = strategy.values?.[province.id] || {};
    return {
      ...currentProvince,
      owner: territory.owner || "",
      defenders: territory.defenders || [],
      defenseIntel: territory.defenseIntel || null,
      heldDays: territory.heldDays || 0,
      miasmaUntilDay: territory.miasmaUntilDay || 0,
      distance: strategy.distances?.[province.id] || 0,
      resourceValue: strategyValue.resourceValue || 0,
      defenseValue: strategyValue.defenseValue || 0,
      defenderLimit: strategyValue.defenderLimit || maxSiegeTeamSize,
      attackerLimit: strategyValue.attackerLimit || maxSiegeTeamSize,
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
    const highlightedProvinces = [...provinces].sort((a, b) =>
      provinceHighlightSortValue(a) - provinceHighlightSortValue(b)
      || (a.rank || 99) - (b.rank || 99)
      || a.name.localeCompare(b.name, "zh-Hans-CN")
    );
    const spiritItems = provinces.filter((province) => province.effect.type === "spirit").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    const dustItems = provinces.filter((province) => province.effect.type === "dust").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    const xpItems = provinces.filter((province) => province.effect.type === "xp").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    const breakthroughItems = provinces.filter((province) => province.effect.type === "breakthrough").map((province) => ({ name: province.name, value: province.effect.value, text: province.effect.text }));
    return {
      name: sect.name,
      provinceCount: provinces.length,
      highestProvinceRank: Math.min(...provinces.map((province) => Number(province.rank) || 99), 99),
      provinceNames: provinces.map((province) => province.name),
      provinceHighlights: highlightedProvinces.slice(0, 5).map((province) => ({
        id: province.id,
        name: province.name,
        shortName: provinceShortName(province.name),
        tier: provinceGdpTier(province.rank)
      })),
      spirit: spiritItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      dust: dustItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      xp: xpItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      breakthrough: breakthroughItems.reduce((sum, item) => sum + (Number(item.value) || 0), 0),
      spiritItems,
      dustItems,
      xpItems,
      breakthroughItems,
      resourcePlan: sect.resourcePlan || {}
    };
  })
  .sort((a, b) => b.provinceCount - a.provinceCount
    || a.highestProvinceRank - b.highestProvinceRank
    || b.spirit - a.spirit
    || b.dust - a.dust
    || b.xp - a.xp
    || a.name.localeCompare(b.name, "zh-Hans-CN")));
const topSectTerritories = computed(() => sectTerritoryRanking.value.slice(0, 5));
const previousProvinceCountBySectName = computed(() => {
  const ownerByProvinceId = new Map(provinceTerritories.value.map((province) => [province.id, province.owner]));
  for (const war of provinceWarRecords.value) {
    if (Number(war.day) !== Number(gameState.value.day) || !war.captured || !war.provinceId) continue;
    const ownerBefore = Object.hasOwn(war, "ownerBefore")
      ? war.ownerBefore
      : (war.defender === "无主之地" ? "" : war.defender || "");
    ownerByProvinceId.set(war.provinceId, ownerBefore || "");
  }
  const counts = new Map(sectSummaries.value.map((sect) => [sect.name, 0]));
  for (const owner of ownerByProvinceId.values()) {
    if (owner) counts.set(owner, (counts.get(owner) || 0) + 1);
  }
  return counts;
});
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
const playerSectNameForPlan = computed(() => gameState.value.sect?.name || player.value?.sect || "");
const playerSectMembers = computed(() => sectMembers(sectByName(playerSectNameForPlan.value)).map((member) => ({
  ...member,
  fatigue: derived.value.sectStrategy?.fatigue?.[member.id] || 0
})));
const playerOwnedProvinces = computed(() => provinceTerritories.value
  .filter((province) => province.owner === playerSectNameForPlan.value)
  .sort((a, b) => (b.defenseValue || 0) - (a.defenseValue || 0) || (a.rank || 99) - (b.rank || 99)));
const playerAttackTeamLimit = computed(() => Math.max(
  maxSiegeTeamSize,
  Number(derived.value.sectStrategy?.attackTeamLimit) || (playerOwnedProvinces.value.length ? maxSiegeTeamSize : zeroTerritorySiegeTeamSize)
));
const attackableProvinces = computed(() => provinceTerritories.value
  .filter((province) => province.owner && province.owner !== playerSectNameForPlan.value)
  .sort((a, b) => (a.distance || 9) - (b.distance || 9) || (b.resourceValue || 0) - (a.resourceValue || 0)));
const selectedAttackProvince = computed(() => provinceTerritories.value.find((province) => province.id === sectPlanDraft.attackTarget) || null);
const selectedAttackForecast = computed(() => {
  const province = selectedAttackProvince.value || attackableProvinces.value[0];
  return province ? derived.value.sectStrategy?.forecasts?.[province.id] || null : null;
});
const selectedDefenseProvince = computed(() => playerOwnedProvinces.value
  .find((province) => province.id === selectedDefenseProvinceId.value) || null);
const sectPlanMemberById = computed(() => new Map(playerSectMembers.value.map((member) => [member.id, member])));
const assignedAttackIds = computed(() => new Set(sectPlanDraft.attackMemberIds));
const assignedDefenseIds = computed(() => new Set(Object.values(sectPlanDraft.defense).flat()));
const planTargetDay = computed(() => (derived.value.sectStrategy?.plan?.targetDay || gameState.value.day + 1));
const sectPlanControlLabel = computed(() => derived.value.sectStrategy?.plan?.isManual ? "手动军令" : "自动推演");
const spiritPearlState = computed(() => derived.value.spiritPearls || gameState.value.spiritPearls || { pearls: [], bonuses: {}, dust: 0, history: [] });
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
  const floor = recentBattleDayFloor();
  return [...days].filter((day) => day >= floor && day <= gameState.value.day).sort((a, b) => b - a);
});
const provinceWarDateOptions = computed(() => provinceWarDayOptions.value.map((day) => ({ day, date: dateForDay(day) })));
const selectedProvinceWarDayRecord = computed(() => provinceWarDayRecords.value.find((record) => record.day === selectedProvinceWarDay.value));
const provinceWarMinDate = computed(() => dateForDay(recentBattleDayFloor()));
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
  const outcome = provinceWarOutcomeFilter.value;
  const direction = provinceWarTierSort.value;
  const rankByProvince = new Map(provinceTerritories.value.map((province) => [province.id, Number(province.rank) || 999]));
  const filtered = wars.filter((war) => (
    (!keyword || provinceWarSearchText(war).includes(keyword)) &&
    (outcome === "all" || (outcome === "captured" ? war.captured : !war.captured))
  ));
  if (direction === "default") return filtered;
  return [...filtered].sort((left, right) => {
    // A smaller national rank represents a higher city tier (S before A through E).
    const delta = (rankByProvince.get(left.provinceId) || 999) - (rankByProvince.get(right.provinceId) || 999);
    return direction === "desc" ? delta : -delta;
  });
});
const selectedProvinceWar = computed(() => selectedProvinceWarDayRecord.value?.wars.find((war) => war.id === selectedProvinceWarId.value));
const selectedProvinceWarDate = computed(() => selectedProvinceWarDayRecord.value?.date || dateForDay(selectedProvinceWarDay.value));
watch(homeLogDayRecords, (records, previousRecords) => {
  if (!records.length) {
    selectedHomeLogDay.value = null;
    return;
  }
  const previousNewestDay = previousRecords?.[0]?.day;
  const wasFollowingNewestDay = selectedHomeLogDay.value == null || selectedHomeLogDay.value === previousNewestDay;
  if (wasFollowingNewestDay || !records.some((record) => record.day === selectedHomeLogDay.value)) {
    selectedHomeLogDay.value = records[0].day;
  }
}, { immediate: true });
const duelRecords = computed(() => gameState.value.duelDays || []);
const tournamentDuelRecords = computed(() => (duelTournament.value?.rounds || []).map((round) => ({
  day: round.day,
  date: round.date,
  createdAt: round.createdAt || `${round.date || ''} · ${round.name || '淘汰赛'}`,
  matchCount: (round.matches || []).length,
  battleCount: (round.matches || []).filter((match) => match.type === 'battle').length,
  tournament: true,
  tournamentName: round.name || '天骄淘汰赛',
  matches: round.matches || []
})));
const duelDayOptions = computed(() => {
  if (activeTab.value !== "arena") return [];
  const floor = recentBattleDayFloor();
  const days = new Set([
    gameState.value.day,
    selectedDuelDay.value,
    ...duelRecords.value.map((record) => record.day),
    ...tournamentDuelRecords.value.map((record) => record.day)
  ]);
  return [...days].filter((day) => day >= floor && day <= gameState.value.day).sort((a, b) => b - a);
});
const duelDateMin = computed(() => dateForDay(recentBattleDayFloor()));
const duelDateMax = computed(() => currentDate.value);
const selectedDuelCalendarDate = computed({
  get() {
    return dateForDay(selectedDuelDay.value || gameState.value.day);
  },
  set(value) {
    selectedDuelDay.value = clampRecentBattleDay(dayForDate(value));
    clearBattleReplay();
  }
});
const selectedDuelRecord = computed(() => (
  tournamentDuelRecords.value.find((record) => Number(record.day) === Number(selectedDuelDay.value))
  || duelRecords.value.find((record) => Number(record.day) === Number(selectedDuelDay.value))
  || (Number(duelMatchPage.value.day) === Number(selectedDuelDay.value) && duelMatchPage.value.tournament
    ? duelMatchPage.value
    : null)
));
const selectedDuelDate = computed(() => selectedDuelRecord.value?.date || dateForDay(selectedDuelDay.value));
const todaysDuelRecord = computed(() => selectedDuelRecord.value?.day === gameState.value.day
  ? selectedDuelRecord.value
  : tournamentDuelRecords.value.find((record) => Number(record.day) === Number(gameState.value.day))
    || duelRecords.value.find((record) => Number(record.day) === Number(gameState.value.day)));
const normalizedDuelSearch = computed(() => duelSearch.value.trim().toLowerCase());
const filteredDuelMatches = computed(() => {
  if (selectedDuelRecord.value?.tournament) {
    const keyword = normalizedDuelSearch.value;
    return (selectedDuelRecord.value.matches || [])
      .map((match, index) => ({ match, index }))
      .filter(({ match }) => !keyword || [
        match.left?.name,
        match.left?.sect,
        match.right?.name,
        match.right?.sect,
        match.winner?.name
      ].filter(Boolean).join(' ').toLowerCase().includes(keyword))
      .sort((left, right) => (left.match.type === 'bye') - (right.match.type === 'bye') || left.index - right.index)
      .map(({ match }) => match);
  }
  if (Number(duelMatchPage.value.day) !== Number(selectedDuelDay.value)) return [];
  return duelMatchPage.value.matches || [];
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
  { label: "天数", value: `第 ${gameState.value.day ?? 0} 天`, icon: "day" },
  { label: "灵石", value: player.value.spirit, icon: "spirit" }
]);

const shopDerived = computed(() => derived.value.shop || { items: [], activeEffects: {}, breakthroughAttempts: {} });
const shopItems = computed(() => shopDerived.value.items || []);
const shopGroupMeta = [
  { id: "xp", label: "修为丹", note: "只提升现实任务获得的修为，不影响其他来源。" },
  { id: "breakthrough", label: "破境丹", note: "只对下一次突破生效，成败都会消耗药力。" },
  { id: "attempt", label: "续脉丹", note: "增加今日可突破次数，价格明显高于破境丹。" },
  { id: "permanent", label: "淬体丹", note: "永久提升基础属性，药性上限为 100 枚。" }
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
  const progress = taskProgressState.value.entries?.[task.id];
  taskForm.completedAmount = task.type === "measurable"
    ? Math.max(Number(task.targetAmount) || 1, Number(progress?.amount) || 0)
    : 1;
}

function formatTaskAmount(value) {
  const amount = Number(value) || 0;
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2).replace(/\.?0+$/, "");
}

function openTaskAdmin() {
  if (!authUser.value?.isAdmin) return;
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

function skillNameOnlyLabel(target) {
  return skillForDisplay(target).name || "普通攻击";
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
  dungeonDayIndexes[activeDungeonRecordTab.value] = Math.min(dungeonDays.value.length - 1, activeDungeonDayIndex.value + 1);
}

function showNextDungeonDay() {
  dungeonDayIndexes[activeDungeonRecordTab.value] = Math.max(0, activeDungeonDayIndex.value - 1);
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

function uniqueHomeLogs(logs = []) {
  const seen = new Set();
  return logs.filter((entry) => {
    const key = [entry.category || "", entry.day || "", entry.time || "", entry.text || ""].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function playerDailyProgressHomeLogs(day) {
  const record = (player.value?.dailyRecords || []).find((item) => Number(item.day) === Number(day));
  if (!record) return [];
  const xp = Number(record.xp || record.passiveXp || 0);
  const provinceSpirit = Number(record.provinceSpirit || 0);
  const provinceDust = Number(record.provinceDust || 0);
  const duelSeasonReward = Number(record.duelSeasonReward || 0);
  const progressText = dailyProgressText(record);
  if (!xp && !provinceSpirit && !provinceDust && !duelSeasonReward && !progressText) return [];
  const gains = [
    progressText || (xp ? `经验 +${xp}` : ""),
    provinceSpirit ? `宗门灵石包 +${provinceSpirit}` : "",
    provinceDust ? `宗门灵尘包 +${provinceDust}` : "",
    duelSeasonReward ? `切磋赛季奖励 +${duelSeasonReward}` : ""
  ].filter(Boolean).join("，");
  return [{
    day: record.day || day,
    date: record.date || dateForDay(day),
    time: logEntryMinute(record.time || record.createdAt || record.updatedAt) || settlementMinuteForDay(record.day || day),
    order: 120,
    category: "progress",
    type: "good",
    text: `修行入账，${gains}。`
  }];
}

function dailyProgressText(record) {
  const xp = Number(record?.xp || record?.passiveXp || 0);
  const provinceXp = Number(record?.provinceXp || record?.bonusXp || 0);
  if (xp) return `经验 +${xp}${provinceXp ? `（宗门资源 +${provinceXp}）` : ""}`;
  const note = String(record?.note || "").trim();
  const progress = note.split("；副本：")[0].replace(/^每日修行：/, "").trim();
  if (progress) return normalizeDailyProgressText(progress);
  return xp ? `经验 +${xp}` : "";
}

function normalizeDailyProgressText(text) {
  return String(text || "")
    .split("，")
    .map((part) => part.trim())
    .filter((part) => !/(?:气血恢复|法力恢复|血量|法力) \+\d+$/.test(part))
    .join("，");
}

function playerBreakthroughHomeLogs(day) {
  return (player.value?.breakthroughs || [])
    .filter((record) => Number(record.day) === Number(day))
    .map((record, index) => {
      const success = record.success !== false;
      const chance = typeof record.chance === "number" ? `，成功率 ${formatPercent(record.chance)}` : "";
      const growth = growthCompactText(record.growth);
      return {
        day: record.day || day,
        date: record.date || dateForDay(day),
        time: logEntryMinute(record.time || record.createdAt) || settlementMinuteForDay(record.day || day),
        order: 240 + index,
        category: "breakthrough",
        type: success ? "good" : "bad",
        text: `突破${success ? "成功" : "失败"}，${record.from || "当前境界"} → ${record.to || "下一境界"}${chance}${growth ? `，${growth}` : ""}。`
      };
    });
}

function playerDungeonHomeLogs(day) {
  const historyLogs = (player.value?.dungeonHistory || [])
    .filter((record) => Number(record.day) === Number(day))
    .map((record, index) => {
      const success = dungeonRecordSucceeded(record);
      const spirit = Number(record.spirit || 0);
      const item = record.item ? `，获得${record.tierName || "法器"}「${record.item}」` : "";
      const result = record.result ? `，${record.result}` : "";
      return {
        day: record.day || day,
        date: record.date || dateForDay(day),
        time: logEntryMinute(record.foughtAt || record.createdAt) || settlementMinuteForDay(record.day || day),
        order: 520 + index,
        category: "dungeon",
        type: success ? "good" : "bad",
        text: `副本${success ? "告捷" : "受挫"}，${record.name || dungeonRecordTitle(record)}${result}${spirit ? `，获得 ${spirit} 灵石` : ""}${item}。`
      };
    });
  if (historyLogs.length) return historyLogs;
  const dailyRecord = (player.value?.dailyRecords || []).find((item) => Number(item.day) === Number(day));
  const summary = dailyDungeonSummaryText(dailyRecord);
  if (!summary) return [];
  const dungeonSpirit = Math.max(0, Number(dailyRecord?.spirit || 0) - Number(dailyRecord?.provinceSpirit || 0) - Number(dailyRecord?.duelSeasonReward || 0));
  return [{
    day: dailyRecord.day || day,
    date: dailyRecord.date || dateForDay(day),
    time: settlementMinuteForDay(dailyRecord.day || day),
    order: 520,
    category: "dungeon",
    type: recordTextFailed(summary) ? "bad" : "good",
    text: `副本结算，${summary}${dungeonSpirit ? `，获得 ${dungeonSpirit} 灵石` : ""}。`
  }];
}

function dailyDungeonSummaryText(record) {
  const note = String(record?.note || "");
  const match = note.match(/副本：([^；。]+)/);
  return match?.[1]?.trim() || "";
}

function playerEquipmentHomeLogs(day) {
  const playerId = player.value?.id || "player";
  const drops = (gameState.value.equipmentTransfers || [])
    .filter((drop) => Number(drop.day) === Number(day) && drop.itemName)
    .slice(0, 12);
  const logs = drops.slice(0, 6).map((drop, index) => {
    const kind = equipmentDropKind(drop);
    const source = equipmentDropSource(drop);
    const isPlayerDrop = [drop.winnerId, drop.receiverId].includes(playerId);
    const owner = isPlayerDrop ? "你" : (drop.winnerName || drop.receiverName || "未知修士");
    const action = kind === "steal" ? "夺得" : kind === "auction" ? "竞得" : "获得";
    const loser = kind === "steal" && drop.loserName ? `，来自 ${drop.loserName}` : "";
    return {
      day: drop.day || day,
      date: drop.date || dateForDay(day),
      time: logEntryMinute(drop.time || drop.createdAt) || settlementMinuteForDay(drop.day || day),
      order: 760 + index,
      category: "equipment",
      type: "good",
      text: `装备${kind === "steal" ? "流转" : "掉落"}，${owner}在 ${source} ${action}${drop.tierName || "法器"}「${drop.itemName}」 · ${equipmentDropSlotName(drop)} · ${equipmentDropStatName(drop)} +${formatEquipmentPercent(equipmentDropBonus(drop))}${loser}。`
    };
  });
  if (drops.length > 6) {
    logs.push({
      day,
      date: dateForDay(day),
      time: "",
      order: 790,
      category: "equipment",
      type: "good",
      text: `今日装备流转共 ${drops.length} 件，更多可在装备页查看。`
    });
  }
  return logs;
}

function playerActionHomeLogs(day) {
  return (gameState.value.log || [])
    .filter((entry) => Number(entry.day) === Number(day))
    .filter((entry) => isPlayerHomeActionLog(entry?.text || ""))
    .map((entry, index) => ({
      ...entry,
      category: playerHomeActionCategory(entry?.text || ""),
      order: 3000 + index
    }));
}

function isPlayerHomeActionLog(text = "") {
  const value = String(text || "");
  return value.startsWith("在坊市购得「")
    || value.startsWith("售出「")
    || value.startsWith("服下「")
    || value.startsWith("当前修为丹药力更强")
    || value.startsWith("下次突破最多")
    || value.startsWith("今日经脉承载")
    || value.startsWith("灵石不足")
    || value.startsWith("完成「")
    || value.startsWith("经验圆满")
    || value.startsWith("你通关")
    || value.includes("血量见底后撤出")
    || value.includes("你在回合战中取胜")
    || /^完成.+任务，获得/.test(value);
}

function playerHomeActionCategory(text = "") {
  const value = String(text || "");
  if (value.startsWith("在坊市购得「") || value.startsWith("售出「") || value.startsWith("服下「") || value.includes("丹药")) return "elixir";
  if (value.startsWith("完成「") || /^完成.+任务，获得/.test(value)) return "task";
  if (value.startsWith("经验圆满")) return "breakthrough";
  if (value.startsWith("你通关") || value.includes("血量见底后撤出")) return "dungeon";
  if (value.includes("你在回合战中取胜")) return "duel";
  return "note";
}

function playerSectWarHomeLogs(day) {
  const sectName = player.value?.sect || gameState.value.sect?.name || "";
  if (!sectName) return [];
  const sect = { name: sectName };
  return provinceWarRecords.value
    .filter((war) => Number(war.day || gameState.value.day) === Number(day))
    .filter((war) => sectWarSide(sect, war))
    .sort((a, b) => {
      if (a.captured !== b.captured) return a.captured ? -1 : 1;
      return String(a.provinceName || "").localeCompare(String(b.provinceName || ""), "zh-Hans-CN");
    })
    .map((war) => {
      const side = sectWarSide(sect, war);
      const won = sectWonWar(sect, war);
      const province = war.provinceName || "未知城池";
      const opponent = side === "attack" ? war.defender : war.attacker;
      const text = side === "attack"
        ? won
          ? `攻城胜利，攻下${province}，从${opponent || "敌宗"}手中夺城。`
          : `攻城失败，未能攻下${province}，${opponent || "守军"}守住城池。`
        : won
          ? `守城胜利，守下${province}，击退${opponent || "来犯宗门"}。`
          : `守城失败，${province}被${opponent || "敌宗"}攻下。`;
      return {
        day: war.day || day,
        date: war.date || dateForDay(day),
        time: logEntryMinute(war.time || war.createdAt) || settlementMinuteForDay(war.day || day),
        order: 2000,
        category: "siege",
        type: won ? "good" : "bad",
        text
      };
    });
}

function playerDuelHomeLogs(day) {
  const record = (gameState.value.duelDays || []).find((item) => Number(item.day) === Number(day));
  const playerId = player.value?.id || "player";
  const matchLogs = (!record?.matches?.length || !playerId) ? [] : (record.matches || [])
    .filter((match) => match.type !== "bye")
    .filter((match) => [match.left?.id, match.right?.id, match.winner?.id, match.loser?.id].includes(playerId))
    .map((match) => {
      const participantIds = [match.left?.id, match.right?.id, match.winner?.id, match.loser?.id];
      const isPlayerMatch = participantIds.includes(playerId);
      const playerWon = match.winner?.id === playerId;
      const winnerName = match.winner?.name || matchPerson(match.winner)?.name || "未知胜者";
      const loserName = match.loser?.name || matchPerson(match.loser)?.name || "未知对手";
      const opponentRef = match.left?.id === playerId ? match.right : match.left;
      const opponent = isPlayerMatch ? matchPerson(opponentRef) : null;
      const delta = isPlayerMatch
        ? (playerWon ? match.winnerScoreDelta : match.loserScoreDelta)
        : match.winnerScoreDelta;
      const scoreText = typeof delta === "number" ? `积分 ${delta > 0 ? "+" : ""}${delta}` : "积分未记录";
      const text = isPlayerMatch
        ? `切磋${playerWon ? "胜利" : "失败"}，对战${opponent?.name || opponentRef?.name || "未知对手"}，段位${duelRankText(opponent)}，${scoreText}。`
        : `切磋战报，${winnerName}战胜${loserName}，${scoreText}。`;
      return {
        day: record.day || day,
        date: record.date || dateForDay(day),
        time: logEntryMinute(match.time || match.foughtAt || record.createdAt) || settlementMinuteForDay(record.day || day),
        order: (isPlayerMatch ? 900 : 1000) + Number(match.order || 0),
        category: "duel",
        type: isPlayerMatch && !playerWon ? "bad" : "good",
        text
      };
    });
  if (matchLogs.length) return matchLogs;
  return (player.value?.duelHistory || [])
    .filter((entry) => entry.day != null
      ? Number(entry.day) === Number(day)
      : String(entry.foughtAt || "").startsWith(dateForDay(day)))
    .map((entry, index) => {
      const won = entry.result === "胜";
      const scoreText = typeof entry.scoreDelta === "number" ? `积分 ${entry.scoreDelta > 0 ? "+" : ""}${entry.scoreDelta}` : "积分未记录";
      return {
        day: entry.day || day,
        date: String(entry.foughtAt || "").match(/^\d{4}-\d{2}-\d{2}/)?.[0] || dateForDay(day),
        time: logEntryMinute(entry.foughtAt) || settlementMinuteForDay(entry.day || day),
        order: 1100 + index,
        category: "duel",
        type: won ? "good" : "bad",
        text: `切磋${won ? "胜利" : "失败"}，对战${entry.opponent || "未知对手"}，段位${entry.opponentRankName || "未记录"}，${scoreText}。`
      };
    });
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
  const afterMarker = text.includes("·") ? text.split("·").pop() || text : text;
  const provinceNames = provinceTerritories.value
    .map((province) => province.name)
    .sort((a, b) => b.length - a.length);
  let shortName = afterMarker.replace(/^妖潮/, "");
  for (const provinceName of provinceNames) {
    if (shortName.startsWith(provinceName)) {
      shortName = shortName.slice(provinceName.length);
      break;
    }
  }
  return shortName || "未知妖物";
}

function siegeBattleEventText(event) {
  const text = String(event?.text || "");
  const provinceNames = provinceTerritories.value
    .map((province) => province.name)
    .sort((a, b) => b.length - a.length);
  if (!provinceNames.length) return text.replace(/妖潮·?/g, "");
  return text.replace(new RegExp(`妖潮·?(?:${provinceNames.join("|")})?`, "g"), "");
}

function monsterArchetypeOf(monster) {
  return {
    ...monsterArchetype(monster),
    id: monster?.archetype || monsterArchetype(monster).id,
    label: monster?.archetypeLabel || monsterArchetype(monster).label,
    text: monster?.archetypeText || monsterArchetype(monster).text
  };
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
  if (index >= 0) dungeonDayIndexes.void = index;
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
  if (province.type === "dust") {
    const value = Math.max(1, Math.floor(Number(province.dustYield) || (1 + 3 * tier)));
    return { type: province.type, value, text: `灵尘包基准 +${value}/人` };
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

function provinceWarTierText(war) {
  const province = provinceTerritories.value.find((item) => item.id === war?.provinceId);
  const rank = province?.rank || 99;
  return `城市档位 ${provinceGdpTier(rank)} · 全国第 ${rank}`;
}

function warOwnerAfterLabel(war) {
  if (Object.hasOwn(war || {}, "ownerAfter")) return war.ownerAfter || "无主之地";
  if (!war?.captured) return war?.defender || "无主之地";
  return war?.kind === "monster" || war?.attacker === "妖物" ? "无主之地" : (war?.attacker || "无主之地");
}

function currentWarProvinceOwnerLabel(war) {
  return provinceTerritories.value.find((province) => province.id === war?.provinceId)?.owner || "无主之地";
}

function provinceHighlightSortValue(province) {
  const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5 };
  return tierOrder[provinceGdpTier(province?.rank)] ?? 99;
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
  if (!plan || !Number(plan.total)) return type === "spirit" || type === "dust" ? "0" : "+0%";
  const total = Number(plan.total) || 0;
  if (type === "spirit" || type === "dust") return `${Math.round(total)}`;
  return `+${Math.round(total * 100)}%`;
}

function resourceShareValue(value, type) {
  const amount = Number(value) || 0;
  if (type === "spirit" || type === "dust") return `${Math.round(amount)}`;
  return `+${Math.round(amount * 100)}%`;
}

function provinceResourceIcon(type) {
  if (type === "dust") return Gem;
  if (type === "xp") return Sparkles;
  if (type === "breakthrough") return Zap;
  return Coins;
}

function provinceResourceTotalValue(effect) {
  const type = effect?.type || "spirit";
  const total = (Number(effect?.value) || 0) * 10;
  if (type === "spirit" || type === "dust") return `${Math.round(total)}`;
  return `+${Math.round(total * 100)}%`;
}

function provinceResourceTotalLabel(effect) {
  if (effect?.type === "dust") return `灵尘总包 ${provinceResourceTotalValue(effect)}`;
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

function provinceBattleRoster(territory) {
  if (!territory.owner) return { status: "vacant", label: "无主", participants: [] };
  const war = todayProvinceWarsByProvinceId.value.get(territory.id);
  if (!war) {
    if (territory.owner === playerSectNameForPlan.value) {
      const participants = defendersFor(territory);
      return { status: "garrison", label: participants.length ? "己方驻军" : "己方空城", participants };
    }
    return {
      status: `intel-${territory.defenseIntel?.level || "unknown"}`,
      label: territory.defenseIntel?.label || "守备情报未知",
      participants: []
    };
  }
  const attackersWon = Boolean(war.captured);
  const refs = attackersWon ? war.attackerLineup || [] : war.defenderLineup || [];
  const people = new Map(cultivators.value.map((person) => [person.id, person]));
  return {
    status: attackersWon ? "attack" : "defense",
    label: attackersWon ? (war.attacker === "妖物" ? "妖破" : "攻破") : "守住",
    participants: refs.map((ref) => (ref?.kind === "monster" ? ref : people.get(ref?.id) || ref)).filter(Boolean)
  };
}

function provinceRosterParticipantTooltip(participant) {
  if (participant?.kind === "monster") return `${participant.name} · 妖潮攻城者`;
  return defenderTooltip(participant);
}

function openProvinceRosterPerson(participant) {
  if (!participant?.id || participant.kind === "monster") return;
  openDetailFromCurrent("person");
  selectedPersonId.value = participant.id;
  activeTab.value = "rank";
  ensurePersonDetail(participant.id);
}

function sectProvinceChange(sectName, currentCount) {
  const previousCount = previousProvinceCountBySectName.value.get(sectName) || 0;
  const change = Number(currentCount || 0) - previousCount;
  if (change > 0) return { direction: "gain", text: `↑${change}`, title: `较昨日新增 ${change} 座城池` };
  if (change < 0) return { direction: "loss", text: `↓${Math.abs(change)}`, title: `较昨日失去 ${Math.abs(change)} 座城池` };
  return { direction: "stable", text: "—", title: "与昨日占领城市数持平" };
}

function starSeaCycleTeamRankChange(team) {
  const key = team?.id || team?.name;
  const currentRank = Number(team?.rank || 0);
  const previousRank = activeStarSeaCyclePreviousRanks.value.get(key);
  if (!currentRank || !previousRank) return { direction: "new", text: "新", title: "昨日无排名" };
  const change = previousRank - currentRank;
  if (change > 0) return { direction: "gain", text: `↑${change}`, title: `较昨日上升 ${change} 名` };
  if (change < 0) return { direction: "loss", text: `↓${Math.abs(change)}`, title: `较昨日下降 ${Math.abs(change)} 名` };
  return { direction: "stable", text: "—", title: "与昨日排名持平" };
}

function breakthroughResourcePlanTitle(plan) {
  const candidates = plan?.priorityCandidates || [];
  if (plan?.priorityMode === "breakthrough-ready" && candidates.length) {
    return `今日优先：${candidates.map((item) => item.name).join("、")}已满足突破条件，获得更高突破资源权重。`;
  }
  return "今日暂无可突破成员，按掌门、长老、守城成员与普通成员的既有权重分配。";
}

function defenderTooltip(defender) {
  return `${defender.name} · ${realmName(defender.realm)}`;
}

function clearProvinceResourceFilters() {
  provinceResourceTypeFilter.value = "";
  provinceResourceOwnerFilter.value = "";
}

function syncSectPlanDraft() {
  const plan = derived.value.sectStrategy?.plan || gameState.value.playerSectPlan || {};
  sectPlanDraft.mode = plan.mode || "balanced";
  sectPlanDraft.attackTarget = plan.attack?.targetProvinceId || "";
  sectPlanDraft.attackMemberIds = Array.isArray(plan.attack?.memberIds) ? [...new Set(plan.attack.memberIds)].slice(0, playerAttackTeamLimit.value) : [];
  sectPlanDraft.onConflict = plan.attack?.onConflict === "cancel" ? "cancel" : "retarget";
  const unavailableIds = new Set(sectPlanDraft.attackMemberIds);
  sectPlanDraft.defense = Object.fromEntries(Object.entries(plan.defense?.provinceIdToMemberIds || {})
    .map(([provinceId, ids]) => {
      const uniqueIds = [...new Set(Array.isArray(ids) ? ids : [])]
        .filter((memberId) => !unavailableIds.has(memberId))
        .slice(0, maxSiegeTeamSize);
      uniqueIds.forEach((memberId) => unavailableIds.add(memberId));
      return [provinceId, uniqueIds];
    }));
  if (!playerOwnedProvinces.value.some((province) => province.id === selectedDefenseProvinceId.value)) {
    selectedDefenseProvinceId.value = playerOwnedProvinces.value[0]?.id || "";
  }
}

function togglePlanAttackMember(id) {
  if (assignedDefenseIds.value.has(id)) return;
  const next = new Set(sectPlanDraft.attackMemberIds);
  if (next.has(id)) next.delete(id);
  else if (next.size < (selectedAttackProvince.value?.attackerLimit || playerAttackTeamLimit.value)) next.add(id);
  sectPlanDraft.attackMemberIds = [...next];
}

function togglePlanDefender(provinceId, id) {
  const currentDefenseIds = new Set(sectPlanDraft.defense[provinceId] || []);
  if (assignedAttackIds.value.has(id) || (assignedDefenseIds.value.has(id) && !currentDefenseIds.has(id))) return;
  const next = currentDefenseIds;
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  const province = provinceTerritories.value.find((item) => item.id === provinceId);
  sectPlanDraft.defense[provinceId] = [...next].slice(0, province?.defenderLimit || maxSiegeTeamSize);
}

function planMemberLabel(member) {
  return `${member.name} · ${realmName(member.realm)} · 战力 ${formatCompact(personPower(member))} · 疲劳 ${member.fatigue || 0}`;
}

function sectMemberFatigue(member) {
  const value = derived.value.sectStrategy?.fatigue?.[member?.id] ?? gameState.value.sectFatigue?.[member?.id];
  if (value === undefined || value === null) return null;
  return Math.max(0, Number(value) || 0);
}

function fatigueDelta(member) {
  const previous = derived.value.sectStrategy?.fatiguePrevious || {};
  if (!member?.id || !Object.hasOwn(previous, member.id)) return { known: false, previous: 0, change: 0, direction: "stable", text: "" };
  const previousValue = Math.max(0, Number(previous[member.id]) || 0);
  const currentValue = sectMemberFatigue(member);
  if (currentValue === null) return { known: false, previous: previousValue, change: 0, direction: "stable", text: "" };
  const change = currentValue - previousValue;
  if (change > 0) return { known: true, previous: previousValue, change, direction: "gain", text: `较昨日 +${change}` };
  if (change < 0) return { known: true, previous: previousValue, change, direction: "loss", text: `较昨日 ${change}` };
  return { known: true, previous: previousValue, change, direction: "stable", text: "较昨日持平" };
}

function fatigueHelpText(member) {
  const fatigue = Math.max(0, Number(member?.fatigue) || 0);
  const penalty = Math.round(fatigue * 2.5);
  const delta = fatigueDelta(member);
  const comparison = delta.known ? `昨日疲劳 ${delta.previous} 点，${delta.text}` : "昨日疲劳暂无记录";
  return `疲劳来自连续参与攻守城：实际守城 +2，攻占无主城 +2，正常攻城基础 +3，远征每多 1 格再 +1，最高 20 点；驻防未遇袭恢复 1 点。完全休整时，疲劳 0–9 恢复 1 点、10–15 恢复 2 点、16–20 恢复 3 点。疲劳 16 以上优先轮换休整，但宗门仍会维持最低攻守编制。当前 ${fatigue} 点，使攻守城五维降低约 ${penalty}%；${comparison}。`;
}

function planProvinceLabel(province) {
  return `${province.name} · 距离 ${province.distance || "-"} · 价值 ${province.resourceValue || 0}`;
}

async function saveSectPlan() {
  await act("/api/sect/plan", {
    mode: sectPlanDraft.mode,
    attack: {
      targetProvinceId: sectPlanDraft.attackTarget,
      memberIds: sectPlanDraft.attackMemberIds,
      autoFill: true,
      onConflict: sectPlanDraft.onConflict
    },
    defense: {
      provinceIdToMemberIds: sectPlanDraft.defense,
      autoFill: true
    },
    scope: "lite"
  }, { scope: "lite", markStale: true });
}

async function openSectTerritoryDetail(sectName) {
  if (!sectName) return;
  openDetailFromCurrent("sect");
  selectedSectName.value = sectName;
  activeTab.value = "rank";
  if (state.value && (!sectByName(sectName) || fullStateStale.value || !hasFullCultivatorRoster())) await ensureFullState();
}

async function resetSectPlanAuto() {
  sectPlanDraft.mode = "balanced";
  sectPlanDraft.attackTarget = "";
  sectPlanDraft.attackMemberIds = [];
  sectPlanDraft.onConflict = "retarget";
  sectPlanDraft.defense = {};
  await saveSectPlan();
}

function pearlEffectText(pearl) {
  const effects = pearl.config?.effects || [];
  const value = Number(pearl.value || 0) * Number(pearl.matchMultiplier || 1);
  if (!pearl.tier) return "尚未凝成";
  return effects.map((effect) => `${effect.label} +${Math.round(value * (effect.weight || 1) * 1000) / 10}%`).join("、");
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
const combatRatingMinimumDays = computed(() => derived.value.combatRatings?.minimumActiveDays || personDetails.value[selectedPersonId.value]?.combatRatingMeta?.minimumActiveDays || 3);
const selectedPersonCombatRating = computed(() => (
  personDetails.value[selectedPersonId.value]?.combatRating
  || combatRatingById.value.get(selectedPersonId.value)
  || { score: 500, dungeonScore: 50, duelScore: 50, provinceScore: 50, activeDays: 0, sampleEnough: false, daily: [] }
));
const selectedPersonCombatTrend = computed(() => [...(selectedPersonCombatRating.value.daily || [])].reverse());
const dossierRankingTabs = [
  { id: "combat", label: "战斗评分排名" },
  { id: "power", label: "战斗力排名" },
  { id: "duel", label: "段位排名" }
];
const selectedPersonRankingTrends = computed(() => personDetails.value[selectedPersonId.value]?.rankingTrends || { power: [], duel: [] });
const selectedPersonDailyRankingTrend = computed(() => selectedPersonRankingTrends.value[activeDossierRanking.value] || []);
const activeDossierRankingMeta = computed(() => {
  const latest = selectedPersonDailyRankingTrend.value[selectedPersonDailyRankingTrend.value.length - 1];
  if (activeDossierRanking.value === "duel") {
    return {
      title: "近十日每日段位排名",
      description: latest ? `当前 ${latest.rankName || "未定段"} · ${latest.value || 0} 分` : "按每日切磋积分排名",
      value: latest ? `#${latest.rank}` : "-",
      ariaLabel: "最近十日每日段位排名走势"
    };
  }
  return {
    title: "近十日每日战斗力排名",
    description: latest ? `当前战斗力 ${latest.value || 0}` : "按每日角色战斗力排名",
    value: latest ? `#${latest.rank}` : "-",
    ariaLabel: "最近十日每日战斗力排名走势"
  };
});
watch(selectedPersonId, () => {
  activeDossierRanking.value = "combat";
});
const selectedPersonCombatRatingLabel = computed(() => {
  const rating = selectedPersonCombatRating.value;
  return `近十日战斗评分 ${rating.score}，副本 ${formatCombatComponent(rating.dungeonScore)}，切磋 ${formatCombatComponent(rating.duelScore)}，攻守城 ${formatCombatComponent(rating.provinceScore)}，有效 ${rating.activeDays} 天`;
});

function formatCombatComponent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(1) : "50.0";
}

function combatRatingDayTitle(entry) {
  const parts = [
    `第 ${entry.day} 天`,
    `排名 第 ${entry.rank} / ${entry.participantCount}`,
    `排名点 ${entry.rankPoints}`,
    `综合分 ${formatCombatComponent(entry.score)}`
  ];
  if (Number.isFinite(entry.dungeonScore)) parts.push(`副本 ${formatCombatComponent(entry.dungeonScore)}`);
  if (Number.isFinite(entry.duelScore)) parts.push(`切磋 ${formatCombatComponent(entry.duelScore)}`);
  if (Number.isFinite(entry.provinceScore)) parts.push(`攻守 ${formatCombatComponent(entry.provinceScore)}`);
  return parts.join(" · ");
}

function dailyRankingDayTitle(entry) {
  const valueLabel = activeDossierRanking.value === "duel"
    ? `${entry.rankName || "未定段"} ${entry.value || 0} 分`
    : `战斗力 ${entry.value || 0}`;
  return `第 ${entry.day} 天 · 排名 第 ${entry.rank} / ${entry.participantCount} · ${valueLabel}`;
}

function combatRatingRankPercent(entry) {
  const rankPoints = Math.max(1, Math.min(200, Number(entry?.rankPoints) || 1));
  return Math.max(3, rankPoints / 2);
}

function combatRatingTrendPoints(entries) {
  return entries.map((entry, index) => {
    return `${combatRatingTrendPointX(index)},${combatRatingTrendPointY(entry)}`;
  }).join(" ");
}

function combatRatingTrendPointX(index) {
  return (index + 0.5) * 100;
}

function combatRatingTrendPointY(entry) {
  return Math.round((120 - combatRatingRankPercent(entry) * 1.2) * 10) / 10;
}
const selectedPersonRelationship = computed(() => {
  const id = selectedPerson.value?.id;
  if (!id || id === "player") return null;
  return personDetails.value[id]?.relationship
    || encounterState.value.relationships?.find((relationship) => relationship.npcId === id)
    || { npcId: id, affinity: 0, respect: 0, interactions: 0, title: "陌路", focused: encounterState.value.focusedNpcIds?.includes(id) };
});
const selectedPersonEncounterHistory = computed(() => {
  const id = selectedPerson.value?.id;
  if (!id) return [];
  return personDetails.value[id]?.encounterHistory
    || encounterHistory.value.filter((event) => id === "player" || event.actorId === id).slice(0, 30);
});

function encounterCounterpartName(record, person) {
  if (person?.id !== "player") return player.value.name || "你";
  const counterpartId = record?.actorId;
  if (!counterpartId) return "未知修士";
  return cultivators.value.find((candidate) => candidate.id === counterpartId)?.name || "未知修士";
}

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
    spiritExpenses: merged.spiritExpenses || [],
    dailyRecords: merged.dailyRecords || [],
    breakthroughs: merged.breakthroughs || [],
    duelHistory: merged.duelHistory || [],
    dungeonHistory: merged.dungeonHistory || [],
    skillUpgrades: merged.skillUpgrades || [],
    duelSeasonHistory: merged.duelSeasonHistory || [],
    skillRanks: merged.skillRanks || {}
  });
}

function personSpiritPearls(person) {
  return personDetails.value[person?.id]?.spiritPearls
    || (person?.id === "player" ? spiritPearlState.value : null)
    || { dust: 0, pearls: [], history: [], bonuses: {} };
}

function hasPersonSpiritPearlSnapshot(person) {
  return (personSpiritPearls(person).pearls || []).length > 0;
}

function isPersonDetailHistoryPending(person) {
  const id = person?.id;
  return Boolean(id && (personDetailLoading.value.has(id) || personDetailHistoryLoading.value.has(id)));
}

function personPearlFragmentCount(pearl) {
  return Object.values(pearl?.fragments || {}).reduce((sum, value) => sum + Math.max(0, Number(value) || 0), 0);
}

function personPearlFragmentTotal(person) {
  return (personSpiritPearls(person).pearls || []).reduce((sum, pearl) => sum + personPearlFragmentCount(pearl), 0);
}

function personPearlProgressInfo(pearl) {
  const next = pearl?.next || {};
  const fragmentTier = Math.max(1, Number(next.fragmentTier) || 1);
  const cost = Math.max(1, Number(next.cost) || 20);
  const count = Math.max(0, Number(pearl?.fragments?.[String(fragmentTier)]) || 0);
  const complete = Number(pearl?.tier) >= 9 && Number(pearl?.star) >= 5;
  return {
    fragmentTier,
    cost,
    count,
    percent: complete ? 100 : Math.max(0, Math.min(100, Math.round(count / cost * 100))),
    detail: complete ? "已至圆满" : `${fragmentTier}阶碎片 ${count} / ${cost}`
  };
}

function personPearlStatusText(pearl) {
  if (pearl?.tier) return `${pearl.tier}阶${pearl.star}星`;
  const progress = personPearlProgressInfo(pearl);
  return `${progress.fragmentTier}阶 ${progress.count}/${progress.cost}`;
}

function personPearlTierClass(pearl) {
  const tier = Math.max(0, Math.min(9, Number(pearl?.tier) || 0));
  return tier ? `pearl-tier-${tier}` : "pearl-unformed";
}

function personPearlMatchText(pearl) {
  const multiplier = Number(pearl?.matchMultiplier) || 1;
  return multiplier > 1 ? `本命契合 ×${multiplier}` : "普通契合";
}

function personPearlEffectText(pearl) {
  const effects = pearl?.config?.effects || [];
  const labels = effects.map((effect) => effect.label).filter(Boolean).join("、") || "属性加成";
  if (!pearl?.tier) return `凝成后提升${labels}（当前未生效）`;
  const value = Number(pearl.value || 0) * Number(pearl.matchMultiplier || 1);
  return effects.map((effect) => `${effect.label} +${formatPercent(value * Number(effect.weight || 1))}`).join("、");
}

function personPearlFragmentBreakdown(pearl) {
  const parts = Object.entries(pearl?.fragments || {})
    .map(([tier, count]) => [Math.max(1, Number(tier) || 1), Math.max(0, Number(count) || 0)])
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a - b)
    .map(([tier, count]) => `${tier}阶 ${count}`);
  return parts.join("、") || "无";
}

function personFormedPearlCount(person) {
  return (personSpiritPearls(person).pearls || []).filter((pearl) => pearl.tier > 0).length;
}

function personPearlHistory(person) {
  const history = personSpiritPearls(person).history || [];
  const latestDay = Math.max(...history.map((record) => Number(record.day) || 0), Number(gameState.value.day) || 1);
  const floor = Math.max(1, latestDay - 29);
  return history.filter((record) => (Number(record.day) || 0) >= floor).slice(0, 120);
}

function pearlHistoryIsExchange(record) {
  return record?.type === "dust_exchange";
}

function pearlHistoryIsUpgrade(record) {
  return record?.type === "upgrade";
}

function pearlHistoryKey(record) {
  return [record?.day, record?.type, record?.pearlId || "dust", record?.tier || "", record?.star || "", record?.amount || "", record?.cost || "", record?.context || ""].join("-");
}

function pearlHistoryTitle(record) {
  const date = shortDisplayDate(record);
  if (record?.type === "dust") return `${date} · 灵尘 +${record.amount || 0}`;
  if (record?.type === "dust_exchange") return `${date} · 灵尘兑换 · ${record.pearlName || "灵珠"}碎片 +${record.amount || 0}`;
  if (record?.type === "fragment") return `${date} · ${record.pearlName || "灵珠"}${record.tier || 1}阶碎片 +${record.amount || 0}`;
  if (record?.type === "upgrade") return `${date} · ${record.pearlName || "灵珠"}凝练至 ${record.tier || 1}阶${record.star || 0}星`;
  return `${date} · 灵珠记录`;
}

function pearlHistoryMeta(record) {
  if (record?.type === "dust_exchange") return `消耗 ${record.dustCost || 10} 灵尘 · ${record.context || "每日自动兑换"}`;
  if (record?.type === "upgrade") return `消耗 ${record.fragmentTier || 1}阶碎片 ${record.cost || 0} · ${record.context || "每日自动兑换"}`;
  return record?.context || "灵珠获取";
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
    { label: "品相", value: item.isReplica ? "仿制品（属性为真品 50%）" : "真品" },
    { label: "加成", value: `${item.statName} +${formatEquipmentPercent(item.bonus)}` },
    { label: "价值", value: `${equipmentDisplayValue(item)} 灵石` },
    { label: "品质", value: item.tierName || equipmentTierName(item.tier) },
    { label: "部位", value: item.slotName || equipmentSlotName(item.slot) },
    { label: "归属", value: item.ownerName || "无归属" },
    { label: "来源", value: equipmentSpecificSource(item) },
    { label: "状态", value: item.equipped ? "已穿戴" : item.ownerName ? "收藏" : "流落在外" }
  ];
}

function equipmentCardAria(item) {
  return `${item.name}，${item.isReplica ? "仿制品" : "真品"}，${item.tierName}，${item.statName} +${formatEquipmentPercent(item.bonus)}，价值 ${equipmentDisplayValue(item)} 灵石，归属 ${item.ownerName || "无归属"}`;
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
  return `${item.tierName} · ${item.statName} +${formatEquipmentPercent(item.bonus)}`;
}

function equipmentSlotTooltip(person, slot) {
  const item = equippedInSlot(person, slot.id);
  if (!item) return `${slot.name}：空`;
  const tierName = item.tierName || equipmentTierName(item.tier);
  const statName = item.statName || slot.statName || "属性";
  return `${item.name} · ${tierName} · ${statName} +${formatEquipmentPercent(item.bonus)}`;
}

function equipmentSlotCardClass(person, slot) {
  const item = equippedInSlot(person, slot.id);
  return [item ? `tier-${item.tier}` : "empty-slot", item ? "has-equipment" : "", `slot-${slot.id}`];
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
  return replayStatMax(side, kind);
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
  return battleDisplayName(battlePerson(ref) || ref) || "未知修士";
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
    const current = kills.get(key) || { id: person?.id || ref?.id || key, name: battleDisplayName(person || ref) || "未知修士", kills: 0 };
    current.kills += 1;
    kills.set(key, current);
  }
  return [...kills.values()].sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

function strategyPointList(points, limit = 3) {
  return (Array.isArray(points) ? points : [])
    .filter((point) => typeof point === "string" && point.trim())
    .slice(0, limit);
}

function strategyMetricList(metrics) {
  return (Array.isArray(metrics) ? metrics : [])
    .filter((metric) => metric?.label && metric?.value !== undefined && metric?.value !== null)
    .map((metric) => ({ label: metric.label, value: metric.value }));
}

function strategyRosterList(roster, role = "") {
  return (Array.isArray(roster) ? roster : [])
    .filter((member) => member?.id && member?.name && member?.reason)
    .map((member) => ({
      id: member.id,
      name: member.name,
      power: Math.max(0, Number(member.power) || 0),
      fatigue: Math.max(0, Number(member.fatigue) || 0),
      selected: Boolean(member.selected),
      reason: (() => {
        const reason = String(member.reason || "");
        if (member.selected && role === "defenders" && /^守备排第 \d+，负责驻守/.test(reason)) {
          const rank = reason.match(/^守备排第 (\d+)/)?.[1] || "-";
          return `守备战力第 ${rank} 仅作参考；本次先满足每座城至少 1 名守军，再综合疲劳、连续出勤和历史负担轮换，因此战力排名靠后也可能入选。`;
        }
        if (member.selected && role === "attackers" && /^攻城战力排第 \d+，补入/.test(reason)) {
          const rank = reason.match(/^攻城战力排第 (\d+)/)?.[1] || "-";
          return `攻城战力第 ${rank} 仅作参考；守城覆盖和休整名额先锁定后，再综合疲劳、连续出勤、历史负担与远征战力确定攻城队。`;
        }
        if (!member.selected && role === "defenders" && /^守备排第 \d+，/.test(reason)) {
          return reason.replace(/^守备排第 (\d+)，/, "守备战力第 $1 仅作参考；按覆盖与轮换分配后，");
        }
        if (!member.selected && role === "attackers" && /^攻城战力排第 \d+，/.test(reason)) {
          return reason.replace(/^攻城战力排第 (\d+)，/, "攻城战力第 $1 仅作参考；按守城覆盖、休整与轮换分配后，");
        }
        return reason;
      })()
    }));
}

function warStrategyPointType(sectionKey, index) {
  const labels = {
    attack: ["判断", "依据", "预估"],
    attackers: ["选将", "主力", "疲劳"],
    defenders: ["布防", "守备", "风险"]
  };
  return labels[sectionKey]?.[index] || "说明";
}

function fallbackWarStrategySections(war) {
  const attackers = warTeam(war, "attacker");
  const defenders = warTeam(war, "defender");
  const direct = !war?.battles?.length || war?.defender === "无主之地";
  return [
    {
      key: "attack",
      label: "择城",
      title: "旧战报推断",
      points: [
        direct
          ? `${war?.attacker || "攻方"}选择接管${war?.provinceName || "此地"}，主要因为当时没有守军。`
          : `${war?.attacker || "攻方"}挑战${war?.defender || "守方"}，目标是夺取${war?.provinceName || "此城"}的资源与据点。`,
        war?.result || "旧记录未保存完整推演，只能按战况复盘。"
      ],
      metrics: []
    },
    {
      key: "attackers",
      label: "选将",
      title: "攻城名单",
      points: [`战报记录攻城队 ${attackers.length} 人${attackers.length ? `，包括 ${attackers.slice(0, 3).map((item) => item.name).join("、")}` : ""}。`],
      metrics: []
    },
    {
      key: "defenders",
      label: "布防",
      title: direct ? "无主之地" : "守城名单",
      points: [direct ? "当日没有守军，攻方兵不血刃占下城池。" : `战报记录守城队 ${defenders.length} 人${defenders.length ? `，核心为 ${defenders.slice(0, 3).map((item) => item.name).join("、")}` : ""}。`],
      metrics: []
    }
  ];
}

function warStrategySections(war) {
  const strategy = war?.strategy;
  if (!strategy) return fallbackWarStrategySections(war);
  const labels = {
    attack: "择城",
    attackers: "选将",
    defenders: "布防"
  };
  return ["attack", "attackers", "defenders"]
    .map((key) => {
      const section = strategy[key];
      if (!section) return null;
      const points = strategyPointList(section.points).map((point) => {
        if (key === "attackers" && /^从未参与守城的成员里，按攻城战力、距离惩罚和疲劳排序/.test(point)) {
          return point.replace(
            /^从未参与守城的成员里，按攻城战力、距离惩罚和疲劳排序，取 (\d+) 人出阵。$/,
            "先锁定每城保底守军与休整位，再从剩余成员里综合疲劳、连续出勤、历史负担与远征战力，轮换 $1 人出阵。"
          );
        }
        return point;
      });
      return {
        key,
        label: labels[key],
        title: section.title || labels[key],
        points,
        roster: strategyRosterList(section.roster, key),
        metrics: strategyMetricList(section.metrics)
      };
    })
    .filter((section) => section && (section.points.length || section.metrics.length));
}

function warStrategyPreview(war) {
  const strategy = war?.strategy;
  if (!strategy) {
    return fallbackWarStrategySections(war).map((section) => section.points[0]).filter(Boolean).slice(0, 2);
  }
  return [
    strategy.summary,
    strategy.attack?.points?.[0],
    strategy.attackers?.points?.[0]
  ].filter((point) => typeof point === "string" && point.trim()).slice(0, 3);
}

function warStrategySearchText(war) {
  return warStrategySections(war)
    .flatMap((section) => [section.title, ...section.points, ...section.metrics.map((metric) => `${metric.label}${metric.value}`)])
    .join(" ");
}

function provinceWarSearchText(war) {
  return [
    war.provinceName,
    war.attacker,
    war.defender,
    war.strategy?.summary,
    warStrategySearchText(war)
  ].filter(Boolean).join(" ").toLowerCase();
}

function rankPerson(item) {
  return personByRef(item);
}

const rankRosterReady = computed(() => {
  if (activeRankBoard.value === "sect") return true;
  if (!hasFullCultivatorRoster()) return false;
  return activeRankingCandidateCount.value > 1;
});

const activeRankingCandidateCount = computed(() => {
  if (activeRankBoard.value === "sect") return sectRanking.value.length;
  return cultivators.value.length;
});

const activeRanking = computed(() => {
  if (!state.value) return [];
  if (!rankRosterReady.value && activeRankBoard.value !== "sect") return [];
  if (activeRankBoard.value === "duel") return duelRanking.value;
  if (activeRankBoard.value === "sect") return sectRanking.value;
  if (activeRankBoard.value === "combat") return combatRanking.value;
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
      help: `战力 ${item.power}。境界：${realmName(item.realm)}；经验：${Math.floor(item.xp)}；灵根 ${rootLine(item)}；血量 ${effective.maxHp}，攻击 ${effective.attack}，防御 ${effective.defense}，神识 ${effective.divineSense}，法力 ${effective.maxMana}；装备 ${item.equipmentCount || 0} 件；灵珠 ${item.formedPearlCount || 0} 颗。`
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

const combatRatingById = computed(() => new Map((derived.value.combatRatings?.entries || []).map((entry) => [entry.id, entry])));

const combatRanking = computed(() => cultivators.value
  .map((item) => {
    const rating = combatRatingById.value.get(item.id) || {
      score: 500,
      dungeonScore: 50,
      duelScore: 50,
      provinceScore: 50,
      activeDays: 0,
      sampleEnough: false
    };
    return {
      name: item.name,
      id: item.id,
      kind: "person",
      sect: item.sect,
      subtitle: `${item.sect} · ${realmName(item.realm)} · 战斗力 ${personPower(item)}`,
      value: rating.score,
      score: rating.score,
      sampleEnough: rating.sampleEnough,
      activeDays: rating.activeDays,
      rating,
      help: `最近 ${derived.value.combatRatings?.windowDays || 10} 天战斗评分 ${rating.score}；副本 ${rating.dungeonScore.toFixed(1)}，切磋 ${rating.duelScore.toFixed(1)}，攻守城 ${rating.provinceScore.toFixed(1)}；有效战斗 ${rating.activeDays} 天。未参战、轮空、待命和兵不血刃不计分。`
    };
  })
  .sort((a, b) => Number(b.sampleEnough) - Number(a.sampleEnough) || b.score - a.score || b.activeDays - a.activeDays));

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
  if (powerSortKey.value === "talent") return Number(talentInfo(person).score || 0);
  if (powerSortKey.value === "equipmentCount") return Number(person.equipmentCount || 0);
  if (powerSortKey.value === "formedPearlCount") return Number(person.formedPearlCount || 0);
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
  if (text.startsWith("突破成功") || text.startsWith("突破失败")) return true;
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
  const percent = value * 100;
  if (percent > 0 && percent < 1) return "1%";
  return `${Math.round(percent)}%`;
}

function formatEquipmentPercent(value) {
  if (typeof value !== "number") return "未记录";
  const percent = value * 100;
  return `${Number.isInteger(percent) ? percent : Number(percent.toFixed(1))}%`;
}

function realmBaseBreakChanceText(realm) {
  if (!realm || typeof realm.baseBreakChance !== "number") return "未记录";
  const stageIndex = Math.floor(Number(realm.index || 0) / 10);
  if (stageIndex >= 8 && Math.round(realm.baseBreakChance * 100) <= 4) return "1%";
  return formatPercent(realm.baseBreakChance);
}

function formatMultiplier(value) {
  const number = Math.max(1, Number(value) || 1);
  return number.toFixed(number % 1 ? 1 : 0);
}

function formatFormulaMultiplier(value) {
  const number = Math.max(0, Number(value) || 0);
  return number.toFixed(2).replace(/\.?0+$/, "");
}

function taskCompletionFormulaText(task) {
  const requestedBaseXp = Math.max(0, Number(task?.requestedBaseXp ?? task?.baseXp) || 0);
  const baseXp = Math.max(0, Number(task?.baseXp) || 0);
  const elixirMultiplier = Math.max(1, Number(task?.elixirMultiplier) || 1);
  const sectXpMultiplier = Math.max(1, Number(task?.sectXpMultiplier) || 1);
  const talentMultiplier = Math.max(1, Number(task?.talentMultiplier) || 1);
  const catchupMultiplier = Math.max(1, Number(task?.catchupMultiplier) || 1);
  const baseText = requestedBaseXp !== baseXp
    ? `基础 ${requestedBaseXp} → 额度结算 ${baseXp}`
    : `有效修为 ${baseXp}`;
  const roundingText = task?.roundingMode === "round" ? "各阶段四舍五入" : "阶段取整";
  return `修为公式：${baseText} × 丹药 x${formatFormulaMultiplier(elixirMultiplier)} × 宗门 x${formatFormulaMultiplier(sectXpMultiplier)} × 天赋 x${formatFormulaMultiplier(talentMultiplier)} × 追赶 x${formatFormulaMultiplier(catchupMultiplier)} = +${Math.max(0, Number(task?.xp) || 0)}（${roundingText}）`;
}

function formatTaskBonusPercent(value) {
  const number = Math.max(1, Number(value) || 1);
  const percent = Math.round((number - 1) * 100);
  return percent > 0 ? `+${percent}%` : "+0%";
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
  const minute = logEntryMinute(entry?.time);
  const date = shortDateText(entry?.date || dateForDay(entry?.day || gameState.value.day));
  return minute ? `${date} · ${minute}` : date;
}

function logEntryDateTime(entry) {
  const date = entry?.date || currentDate.value;
  const minute = logEntryMinute(entry?.time);
  return minute ? `${date}T${minute}` : date;
}

function settlementMinuteForDay(day) {
  const targetDay = Number(day);
  const dayRecords = [
    ...(gameState.value.logDays || []),
    ...(homeSummary.value.logDays || [])
  ];
  const record = dayRecords.find((item) => Number(item.day) === targetDay);
  if (!record) return "";
  const settlementLog = (record.logs || []).find((entry) => {
    const text = String(entry?.text || "");
    return text.includes("自动结算完成")
      || text.includes("手动推进了一天")
      || text.startsWith("今日副本结算")
      || text.includes("全员切磋完成")
      || text.includes("九州攻守结算完成");
  });
  return logEntryMinute(settlementLog?.time);
}

function logTone(entry) {
  if (entry?.type === "bad") return "loss";
  if (entry?.type === "good") return "win";
  const text = entry?.text || "";
  if (text.includes("失败") || text.includes("败") || text.includes("未能")) return "loss";
  return "win";
}

function logCategory(entry) {
  const text = entry?.text || "";
  const category = entry?.category || "";
  if (category === "duel" || text.startsWith("切磋")) return { id: "duel", mark: "斗", label: "切磋" };
  if (category === "siege" || text.includes("攻城") || text.includes("守城")) return { id: "siege", mark: "城", label: "攻守城" };
  if (category === "dungeon" || text.startsWith("副本") || text.startsWith("你通关")) return { id: "dungeon", mark: "副", label: "副本" };
  if (category === "breakthrough" || text.startsWith("突破") || text.startsWith("经验圆满")) return { id: "breakthrough", mark: "破", label: "突破" };
  if (category === "equipment" || text.startsWith("装备掉落")) return { id: "equipment", mark: "装", label: "装备" };
  if (category === "progress" || text.startsWith("修行入账")) return { id: "progress", mark: "修", label: "修行收益" };
  if (category === "task" || text.startsWith("完成「")) return { id: "task", mark: "务", label: "现实任务" };
  if (category === "elixir" || text.startsWith("在坊市购得「") || text.startsWith("售出「") || text.startsWith("服下「")) return { id: "elixir", mark: "丹", label: "丹药买卖服用" };
  return { id: "note", mark: "记", label: "记录" };
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
  const refs = [match?.left, match?.right, match?.winner].filter(Boolean);
  return refs.reduce((best, ref) => {
    const rank = duelRankSortValue(ref);
    const score = Number(ref.duelSeason?.score || 0);
    const power = Number(ref.power || matchPerson(ref)?.power || 0);
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
  return addDays(gameState.value.calendarStartDate || gameState.value.lastSettlementDate, Math.max(0, Number(day ?? 0)));
}

function dayForDate(dateText) {
  const startTime = utcDateValue(gameState.value.calendarStartDate || gameState.value.lastSettlementDate);
  const targetTime = utcDateValue(dateText);
  if (startTime === null || targetTime === null) return gameState.value.day;
  return Math.floor((targetTime - startTime) / 86400000) + 1;
}

function utcDateValue(dateText) {
  const [year, month, day] = String(dateText || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return Date.UTC(year, month - 1, day);
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

function daoTrialBestText(record) {
  if (!record) return "暂无记录";
  return `${record.floor || record.nodesCleared || 0} 层 · ${record.score || 0} 分`;
}

function daoTrialRecordDateTime(record) {
  const timestamp = String(record?.endedAt || record?.startedAt || "");
  const match = timestamp.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (match) return `${match[1]} ${match[2]}`;
  const date = record?.date || record?.startedDate;
  return date ? `${date}（时间未记录）` : "时间未记录";
}

function signedNumber(value) {
  const number = Number(value) || 0;
  return number > 0 ? `+${number}` : `${number}`;
}

function daoTrialScoreBreakdownText(record) {
  if (record?.scoreBreakdown?.legacy) return "旧版记录 · 无评分明细";
  const modifier = Number(record?.scoreBreakdown?.modifier) || 0;
  return `进度 ${record?.scoreBreakdown?.progress || 0} · 表现 ${record?.scoreBreakdown?.quality || 0} · 风险 ${record?.scoreBreakdown?.risk || 0} · 构筑 ${record?.scoreBreakdown?.build || 0}${modifier ? ` · 修正 ${signedNumber(modifier)}` : ""}`;
}

function daoTrialRewardText(record) {
  if (record?.practice) return "无奖励";
  if (!record?.rewards) return "旧记录未记载奖励";
  const parts = [];
  if (Number(record.rewards.xp) > 0) parts.push(`修为 +${record.rewards.xp}`);
  if (Number(record.rewards.spirit) > 0) parts.push(`灵石 +${record.rewards.spirit}`);
  if (Number(record.rewards.dust) > 0) parts.push(`灵尘 +${record.rewards.dust}`);
  const milestones = (record.rewards.milestones || []).filter(Boolean);
  if (milestones.length) parts.unshift(milestones.join("、"));
  const harmony = record.harmonyRewards;
  if (harmony) {
    const harmonyLabels = (harmony.milestones || []).map((milestone) => milestone.label).filter(Boolean).join("、");
    const harmonyParts = daoTrialHarmonyRewardText(harmony);
    parts.push(`合参${harmonyLabels ? `「${harmonyLabels}」` : ""} ${harmonyParts}`.trim());
  }
  const playerReward = parts.length ? `你带回 ${parts.join(" · ")}` : "你未带回奖励";
  const opponentReward = record.rewards.opponentReward;
  if (!opponentReward) return playerReward;
  const opponentParts = [];
  if (Number(opponentReward.xp) > 0) opponentParts.push(`修为 +${opponentReward.xp}`);
  if (Number(opponentReward.spirit) > 0) opponentParts.push(`灵石 +${opponentReward.spirit}`);
  if (Number(opponentReward.dust) > 0) opponentParts.push(`灵尘 +${opponentReward.dust}`);
  return `${playerReward} · ${opponentReward.opponent?.name || record.defeatedBy?.name || "守关修士"}获得 ${opponentParts.join(" · ") || "0"}`;
}

function daoTrialProjectionText(opponent) {
  const percent = Number(opponent?.projectionPercent) || 0;
  if (percent <= 0) return "秘境不削弱";
  return `${opponent?.projectionLabel || "秘境战意"} ${signedNumber(percent)}%`;
}

function daoTrialHarmonyRewardText(reward) {
  if (!reward) return "";
  const parts = [];
  if (Number(reward.xp) > 0) parts.push(`修为 +${reward.xp}`);
  if (Number(reward.spirit) > 0) parts.push(`灵石 +${reward.spirit}`);
  if (Number(reward.dust) > 0) parts.push(`灵尘 +${reward.dust}`);
  return parts.join(" · ");
}

function daoTrialBagText(bag) {
  if (!bag) return "尚无收获";
  const parts = [];
  if (Number(bag.xp) > 0) parts.push(`${bag.xp} 修为`);
  if (Number(bag.spirit) > 0) parts.push(`${bag.spirit} 灵石`);
  if (Number(bag.dust) > 0) parts.push(`${bag.dust} 灵尘`);
  return parts.length ? parts.join(" · ") : "尚无收获";
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
  return `经验 +${totalXp} · 灵石收入 +${spirit}`;
}

function recentDayFloor(person) {
  const days = [
    gameState.value.day,
    ...(person?.dailyRecords || []).map((record) => record.day),
    ...(person?.spiritExpenses || []).map((record) => record.day),
    ...(person?.dungeonHistory || []).map((record) => record.day)
  ]
    .map((day) => Number(day) || 0)
    .filter(Boolean);
  return Math.max(1, Math.max(...days, 1) - 29);
}

function personDailyRecords(person) {
  const floor = recentDayFloor(person);
  const records = new Map((person?.dailyRecords || []).map((record) => [Number(record.day), record]));
  for (const expense of person?.spiritExpenses || []) {
    const day = Number(expense.day) || 0;
    if (!day || records.has(day)) continue;
    records.set(day, { day, date: expense.date, time: expense.time, xp: 0, spirit: 0, note: "当日灵石支出" });
  }
  return [...records.values()]
    .filter((record) => (Number(record.day) || 0) >= floor)
    .sort((left, right) => Number(right.day) - Number(left.day))
    .slice(0, 30);
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
  const expenses = (person?.spiritExpenses || []).filter((entry) => Number(entry.day) === Number(record?.day));
  const expenseTotal = expenses.reduce((sum, entry) => sum + Math.max(0, Math.floor(Number(entry.amount) || 0)), 0);
  const expenseText = expenses.slice(0, 3).map((entry) => `${entry.purpose || "其他支出"} ${Math.max(0, Math.floor(Number(entry.amount) || 0))}`).join("、");
  const parts = [];
  if (expenseTotal) parts.push(`支出 ${expenseTotal}：${expenseText}${expenses.length > 3 ? `等${expenses.length}项` : ""}`);
  if (drops.length) parts.push(`装备 ${drops.slice(0, 2).join("、")}${drops.length > 2 ? `等${drops.length}件` : ""}`);
  return parts.join(" · ");
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
  const scoreAfter = duelRecordScoreAfter(record);
  if (scoreAfter !== null) parts.push(`当日积分 ${scoreAfter}`);
  if (!hasReplay(record)) parts.push("十天外无回放");
  return parts.join(" · ");
}

function duelRecordScoreAfter(record) {
  if (typeof record?.scoreAfter === "number") return record.scoreAfter;
  if (typeof record?.scoreBefore === "number" && typeof record?.scoreDelta === "number") {
    return clampDuelRecordScore(record.scoreBefore + record.scoreDelta);
  }
  const inferredScore = inferDuelRecordScoreAfter(record);
  if (inferredScore !== null) return inferredScore;
  return null;
}

function inferDuelRecordScoreAfter(record) {
  const person = selectedPerson.value;
  const records = (person?.duelHistory || []).filter((entry) => {
    const entrySeason = Number(entry.season || duelSeasonOfDay(entry.day || gameState.value.day));
    const recordSeason = Number(record?.season || duelSeasonOfDay(record?.day || gameState.value.day));
    return entrySeason === recordSeason;
  });
  if (!records.length || typeof person?.duelSeason?.score !== "number") return null;
  let runningScore = clampDuelRecordScore(person.duelSeason.score);
  for (const entry of records) {
    const scoreAfter = runningScore;
    if (entry === record) return scoreAfter;
    if (typeof entry.scoreDelta === "number") runningScore = clampDuelRecordScore(runningScore - entry.scoreDelta);
  }
  return null;
}

function clampDuelRecordScore(score) {
  const maxScore = Number(duelSeasonInfo.value?.maxScore || 0);
  const value = Number(score) || 0;
  return maxScore > 0 ? Math.max(0, Math.min(maxScore, value)) : Math.max(0, value);
}

function dungeonRecordTitle(record) {
  if (record?.type === "dao-trial-defense") {
    return `${shortDateText(record.date || (record.day ? `第${record.day}天` : ""))} · 问道守关 · ${record.result}`;
  }
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
  if (record?.type === "dao-trial-defense") {
    const parts = [`${record.routeName || "问道秘境"}第 ${record.floor || 1} 层`, `对阵${record.opponentName || "未知修士"}`];
    if (Number(record.xp) > 0) parts.push(`修为 +${record.xp}`);
    if (Number(record.spirit) > 0) parts.push(`灵石 +${record.spirit}`);
    if (Number(record.dust) > 0) parts.push(`灵尘 +${record.dust}`);
    if (!Number(record.xp) && !Number(record.spirit) && !Number(record.dust)) parts.push("未获资源");
    return parts.join(" · ");
  }
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

async function openPlayerSectDetail() {
  const sectName = playerSectName.value;
  if (!sectName) return;
  const alreadyOpen = activeTab.value === "rank" && detailView.value === "sect" && selectedSectName.value === sectName;
  closeBattleReplay();
  if (!alreadyOpen) {
    const current = captureDetailReturn();
    const last = detailReturnStack.value[detailReturnStack.value.length - 1];
    const sameAsLast = last
      && last.activeTab === current.activeTab
      && last.detailView === current.detailView
      && last.selectedPersonId === current.selectedPersonId
      && last.selectedSectName === current.selectedSectName;
    if (!sameAsLast) detailReturnStack.value.push(current);
  }
  selectedSectName.value = sectName;
  activeTab.value = "rank";
  detailView.value = "sect";
  if (state.value && (!sectByName(sectName) || fullStateStale.value || !hasFullCultivatorRoster())) await ensureFullState();
}

function openPlayerPersonDetail() {
  closeBattleReplay();
  openDetailFromCurrent("person");
  selectedPersonId.value = "player";
  selectedSectName.value = "";
  activeTab.value = "rank";
  ensurePersonDetail("player");
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
    activeDungeonRecordTab: activeDungeonRecordTab.value,
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
  if (!source.replayId) {
    if (source.fallbackReplay) {
      openBattleReplay(source.fallbackReplay, target);
      error.value = "";
    }
    return;
  }
  openReplayLoading(target);
  setActionPending("/api/battles/replay", true);
  try {
    const generation = authGeneration;
    const response = await getBattleReplay(source.replayId);
    if (generation !== authGeneration) return;
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
    if (source.fallbackReplay) {
      openBattleReplay(source.fallbackReplay, target);
      error.value = "";
    } else {
      cancelReplayLoading();
      error.value = err.message;
    }
  } finally {
    setActionPending("/api/battles/replay", false);
  }
}

async function openStarSeaTeamReplay(team) {
  await openReplay(team, null, captureBattleReturn());
}

function starSeaTeamForMember(entry) {
  const teams = selectedDungeonDay.value?.public?.teams || [];
  if (!entry || !teams.length) return null;
  return teams.find((team) => entry.teamName && team.name === entry.teamName)
    || teams.find((team) => entry.teamRank && Number(team.rank) === Number(entry.teamRank))
    || teams.find((team) => (team.members || []).some((member) => member.id === entry.id))
    || null;
}

function hasStarSeaMemberReplay(entry) {
  const team = starSeaTeamForMember(entry);
  return Boolean(team && hasReplay(team));
}

async function openStarSeaMemberReplay(entry) {
  const team = starSeaTeamForMember(entry);
  if (!team) {
    error.value = `未找到${entry?.name || "该修士"}所在队伍的战报。`;
    return;
  }
  await openStarSeaTeamReplay(team);
}

function returnFromBattle() {
  const target = battleReturnTarget.value;
  closeBattleReplay();
  if (!target) return;
  activeTab.value = target.activeTab;
  activeDungeonRecordTab.value = target.activeDungeonRecordTab || activeDungeonRecordTab.value;
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
  if (authUser.value?.isAdmin && tabId !== "admin") return;
  if (!authUser.value?.isAdmin && tabId === "admin") return;
  closeBattleReplay();
  if (cultivationSubTabs.some((tab) => tab.id === tabId)) {
    cultivationSubTab.value = tabId;
    activeTab.value = "cultivation";
    resetTabHome("cultivation");
    return;
  }
  activeTab.value = tabId;
  resetTabHome(tabId);
  if (needsHeavyState(tabId) && state.value && (fullStateStale.value || !hasFullCultivatorRoster())) ensureFullState();
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
  adminCultivatorDraft.potentialRealm = Number(person.potentialRealm ?? person.talent?.potentialRealm ?? 0);
  adminCultivatorDraft.talentMode = person.talent?.overridden ? "manual" : "auto";
  adminCultivatorDraft.talentScore = Number(person.talent?.score || 50);
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

function syncSectRecordPanelHeight() {
  const memberPanel = sectMemberPanelEl.value;
  if (!memberPanel || detailView.value !== "sect") {
    sectWarPanelHeight.value = 0;
    return;
  }
  sectWarPanelHeight.value = Math.ceil(memberPanel.getBoundingClientRect().height);
}

function observeSectRecordPanelHeight() {
  sectMemberPanelObserver?.disconnect();
  sectMemberPanelObserver = null;
  if (typeof ResizeObserver === "undefined") return;
  const memberPanel = sectMemberPanelEl.value;
  if (!memberPanel || detailView.value !== "sect") return;
  sectMemberPanelObserver = new ResizeObserver(syncSectRecordPanelHeight);
  sectMemberPanelObserver.observe(memberPanel);
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

function syncAdminGameSettingsDraft() {
  const value = Number(gameState.value.gameSettings?.taskDailyFullXpBudget);
  adminGameSettingsDraft.taskDailyFullXpBudget = Number.isFinite(value) ? value : 500;
  const speed = Number(gameState.value.gameSettings?.battleReplaySpeed);
  adminGameSettingsDraft.battleReplaySpeed = Number.isFinite(speed) ? speed : 1;
  const tickerSpeed = Number(gameState.value.gameSettings?.dailyTickerSpeed);
  adminGameSettingsDraft.dailyTickerSpeed = Number.isFinite(tickerSpeed) ? tickerSpeed : 1;
}

function selectAdminTask(id) {
  const task = taskDefinitions.value.find((item) => item.id === id);
  if (!task) return;
  syncAdminTaskDraft(task);
}

function formatDateTime(value) {
  if (!value) return "";
  return String(value).replace("T", " ").replace(/\.\d+Z$/, "").replace(/Z$/, "");
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function applyAdminAccounts(payload) {
  const accounts = Array.isArray(payload?.accounts) ? payload.accounts : [];
  adminAccounts.value = accounts;
  const managed = accounts.find((account) => account.id === payload?.managedSaveId);
  adminSelectedAccountId.value = managed?.id || accounts[0]?.id || "";
}

async function selectManagedAdminAccount(saveId) {
  if (!saveId || saveId === adminSelectedAccountId.value || adminAccountsSaving.value) return;
  adminAccountsSaving.value = true;
  abortStateRefreshes();
  const generation = ++authGeneration;
  highestStateRevision = -1;
  try {
    const result = await setAdminManagedAccount(saveId, "full");
    if (generation !== authGeneration) return;
    applyAdminAccounts(result.accounts);
    applyState(result.state, { replace: true, force: true });
    syncSelectedDays();
    error.value = "";
  } catch (err) {
    if (err?.name !== "AbortError") error.value = err.message;
  } finally {
    adminAccountsSaving.value = false;
  }
}

async function loadAdminAccounts() {
  if (!authUser.value?.isAdmin || adminAccountsLoading.value) return;
  adminAccountsLoading.value = true;
  try {
    applyAdminAccounts(await getAdminAccounts());
  } catch (err) {
    error.value = err.message;
  } finally {
    adminAccountsLoading.value = false;
  }
}

async function setActiveAdminAccount(saveId, active) {
  if (!saveId || adminAccountsSaving.value) return;
  adminAccountsSaving.value = true;
  try {
    const result = await setAdminActiveAccount(saveId, active, "full");
    applyAdminAccounts(result.accounts);
    error.value = "";
  } catch (err) {
    error.value = err.message;
  } finally {
    adminAccountsSaving.value = false;
  }
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
    potentialRealm: adminNumber(adminCultivatorDraft.potentialRealm),
    talentMode: adminCultivatorDraft.talentMode,
    talentScore: Math.max(1, Math.min(100, adminNumber(adminCultivatorDraft.talentScore, 50))),
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
  const path = adminTaskDraft.id ? "/api/admin/task-definitions/update" : "/api/admin/task-definitions";
  const saved = await act(path, { ...adminTaskDraft }, { scope: "lite", markStale: true });
  if (saved?.id) syncAdminTaskDraft(saved);
}

async function saveGameSettings() {
  const value = Math.max(0, Math.min(100000, Math.floor(adminNumber(adminGameSettingsDraft.taskDailyFullXpBudget, 500))));
  const speed = Math.max(0.5, Math.min(4, Math.round(adminNumber(adminGameSettingsDraft.battleReplaySpeed, 1) * 4) / 4));
  const tickerSpeed = Math.max(0.5, Math.min(4, Math.round(adminNumber(adminGameSettingsDraft.dailyTickerSpeed, 1) * 4) / 4));
  const saved = await act("/api/admin/settings", { taskDailyFullXpBudget: value, battleReplaySpeed: speed, dailyTickerSpeed: tickerSpeed }, { scope: "lite", markStale: true });
  if (saved) syncAdminGameSettingsDraft();
}

async function toggleAdminTask(task = adminTaskDefinition.value) {
  if (!task?.id) return;
  const updated = await act("/api/admin/task-definitions/toggle", { id: task.id, enabled: task.enabled === false }, { scope: "lite", markStale: true });
  if (updated?.id) syncAdminTaskDraft(updated);
}

async function deleteAdminTask(task = adminTaskDefinition.value) {
  if (!task?.id) return;
  if (!confirm(`确定删除现实任务「${task.name}」？历史完成记录会保留。`)) return;
  await act("/api/admin/task-definitions/delete", { id: task.id }, { scope: "lite", markStale: true });
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

function openDuelChampion(person) {
  if (!person?.id) return;
  closeBattleReplay();
  openDetailFromCurrent("person");
  selectedPersonId.value = person.id;
  activeTab.value = "rank";
  ensurePersonDetail(person.id);
}

function duelAwardName(person) {
  return person?.name || "未知修士";
}

function duelSemifinalistNames(tournament) {
  const names = (tournament?.semifinalists || []).map((person) => person?.name).filter(Boolean);
  return names.length ? names.join("、") : "未知修士";
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

function openRootAttributes() {
  cultivationSubTab.value = "attributes";
  activeTab.value = "cultivation";
}

function personStats(person) {
  const effective = personEffectiveStats(person);
  const power = personPower(person);
  const powerRank = personPowerRank(person);
  const talent = talentInfo(person);
  const combatRank = personCombatRank(person);
  const duelRankPosition = personDuelRankPosition(person);
  return [
    { label: "性别", value: genderLabel(person.gender), icon: "gender" },
    { label: "灵石", value: Math.floor(person.spirit || 0), icon: "spirit" },
    dossierStatLine("血量", effective.maxHp, effective.bonuses.maxHp, "hp", effective.bonusSources?.maxHp),
    dossierStatLine("法力", effective.maxMana, effective.bonuses.maxMana, "mana", effective.bonusSources?.maxMana),
    dossierStatLine("攻击", effective.attack, effective.bonuses.attack, "attack", effective.bonusSources?.attack),
    dossierStatLine("防御", effective.defense, effective.bonuses.defense, "defense", effective.bonusSources?.defense),
    dossierStatLine("神识", effective.divineSense, effective.bonuses.divineSense, "sense", effective.bonusSources?.divineSense),
    { label: "技能", value: skillNameOnlyLabel(person), icon: "skill", help: skillTip(person) },
    { label: "天赋", value: talent.score, icon: "power", help: talentHint(person) },
    { label: "战力排名", value: powerRank ? `#${powerRank}` : "未上榜", icon: "rank", help: powerRank ? `当前个人战力榜第 ${powerRank} 名。` : "当前不在个人战力榜中。" },
    { label: "评分排名", value: combatRank ? `#${combatRank}` : "未上榜", icon: "rank", help: combatRank ? `当前战斗评分榜第 ${combatRank} 名。` : "当前不在战斗评分榜中。" },
    { label: "段位排名", value: duelRankPosition ? `#${duelRankPosition}` : "未上榜", icon: "rank", help: duelRankPosition ? `当前切磋段位榜第 ${duelRankPosition} 名。` : "当前不在切磋段位榜中。" }
  ];
}

function dossierStatLine(label, total, bonus = 0, icon = "default", sources = []) {
  const value = statTotal(total);
  const gain = Math.floor(Number(bonus) || 0);
  const signed = (amount) => `${amount >= 0 ? "+" : ""}${amount}`;
  const sourceText = (Array.isArray(sources) ? sources : [])
    .filter((source) => Number(source?.value) || Number(source?.rate))
    .map((source) => `${source.label} ${formatPercent(Number(source.rate) || 0)}（${signed(Math.floor(Number(source.value) || 0))}）`)
    .join("；");
  return {
    label,
    value,
    icon,
    help: gain !== 0
      ? `基础 ${value - gain}；${sourceText || `属性加成 ${signed(gain)}`}；合计 ${signed(gain)}。`
      : `基础 ${value}；暂无属性加成。`
  };
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

function personCombatRank(person) {
  const index = combatRanking.value.findIndex((item) => item.id === person?.id);
  return index >= 0 ? index + 1 : 0;
}

function personDuelRankPosition(person) {
  const index = duelRanking.value.findIndex((item) => item.id === person?.id);
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
    fortunate: dailyRootFortune.value.rootKey === node.key,
    special: false,
    highlighted: hoveredRootKey.value === node.key,
    statusText: ownedKeys.has(node.key)
      ? `${primaryRoot(player.value).key === node.key ? "主灵根" : "副灵根"}${dailyRootFortune.value.rootKey === node.key ? " · 今日天运" : ""}`
      : dailyRootFortune.value.rootKey === node.key ? "今日幸运灵根 · 未拥有" : "未拥有"
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
    statusText: node.statusText || "未拥有",
    fortuneText: dailyRootFortune.value.rootKey === node.key
      ? dailyRootFortune.value.playerMatched
        ? dailyRootFortune.value.playerEffectText
        : `今日天运：${dailyRootFortune.value.effectText}`
      : ""
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

function isNpcFortuneResonant(person) {
  if (!person || person.id === "player" || person.isPlayer) return false;
  if (typeof person.dailyRootFortune?.playerMatched === "boolean") return person.dailyRootFortune.playerMatched;
  return rootKeys(person).includes(dailyRootFortune.value.rootKey);
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

function rootEfficiencyText(person) {
  const profile = personInsight(person).rootProfile;
  return `经验效率 ${formatPercent(profile.cultivationMultiplier)}，突破效率 ${formatPercent(profile.breakthroughMultiplier)}`;
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
  lines.push(rootEfficiencyText(person));
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
    talent: person?.talent || { score: 50, grade: "上品", xpMultiplier: 1.06, breakthroughMultiplier: 1.015, potentialRealm: person?.realm || 0 },
    tomorrowXp: { baseXp: person?.isPlayer ? 10 : 100, rootMultiplier: 1, talentMultiplier: 1, sectMultiplier: 1, total: person?.isPlayer ? 10 : 100 },
    breakthrough: { realmBase: baseBreakthroughChance(person?.realm || 0), rootMultiplier: 1, talentMultiplier: 1, sectMultiplier: 1, base: fallbackBreakthrough, bonus: 0, total: fallbackBreakthrough }
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

function talentInfo(person) {
  return personInsight(person).talent || person?.talent || { score: 50, grade: "上品", xpMultiplier: 1.06, breakthroughMultiplier: 1.015, potentialRealm: person?.realm || 0 };
}

function talentHint(person) {
  const talent = talentInfo(person);
  return `${talent.grade}天赋 ${talent.score}；预期境界 ${realmName(talent.potentialRealm ?? person?.potentialRealm ?? 0)}；经验效率 ${formatPercent(talent.xpMultiplier)}；突破效率 ${formatPercent(talent.breakthroughMultiplier)}${talent.overridden ? "；后台锁定" : ""}`;
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
  const realmCount = catalog.value.realms?.length || safeRealm + 2;
  if (safeRealm % 10 !== 9 || safeRealm + 1 >= realmCount) return null;
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
  return `基础 ${xp.baseXp} × 灵根 ${formatPercent(xp.rootMultiplier)} × 天赋 ${formatPercent(xp.talentMultiplier)} × 宗门 ${formatPercent(xp.sectMultiplier)} = ${tomorrowXpTotal(person)}`;
}

function tomorrowXpTotal(person) {
  const xp = personInsight(person).tomorrowXp;
  if (typeof xp.baseXp === "number" && typeof xp.rootMultiplier === "number" && typeof xp.sectMultiplier === "number") {
    return Math.floor(xp.baseXp * xp.rootMultiplier * (xp.talentMultiplier ?? 1) * xp.sectMultiplier);
  }
  return Math.floor(Number(xp.total) || 0);
}

function breakthroughPartsText(person) {
  const parts = personInsight(person).breakthrough;
  const sectMultiplier = parts.sectMultiplier ?? (1 + (parts.bonus || 0));
  const potionText = Number(parts.potionBonus || 0) > 0 ? ` + 丹药 ${formatPercent(parts.potionBonus)}` : "";
  const championText = Number(parts.championBonus || 0) > 0 ? ` + 魁首道韵 ${formatPercent(parts.championBonus)}` : "";
  return `境界基础 ${formatPercent(parts.realmBase)} × 灵根 ${formatPercent(parts.rootMultiplier)} × 天赋 ${formatPercent(parts.talentMultiplier ?? 1)} × 宗门 ${formatPercent(sectMultiplier)}${potionText}${championText} = ${formatPercent(parts.total)}`;
}

function statWithBonus(total, bonus = 0) {
  return bonus > 0 ? `${total}（+${bonus}）` : `${total}`;
}

function statTotal(total) {
  return Math.floor(total || 0);
}

function normalizeTaskMultiplierRecord(record, day, date) {
  const elixirMultiplier = Math.max(1, Number(record?.elixirMultiplier ?? record?.cultivationMultiplier) || 1);
  const sectXpMultiplier = Math.max(1, Number(record?.sectXpMultiplier) || 1);
  return {
    day,
    date: record?.date || date,
    elixirMultiplier,
    sectXpMultiplier,
    totalMultiplier: elixirMultiplier * sectXpMultiplier
  };
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
  const occupiedCities = provinceTerritories.value.filter((province) => province.owner === sect.name).length;
  return [
    ["总战力", sect.totalPower],
    ["成员", members.length],
    ["掌门", sectLeaderName(sect)],
    ["长老", sectElderNames(sect)],
    ["攻占城市", occupiedCities]
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
  const previous = personDetails.value[id] || {};
  const scope = detail.__scope || "full";
  const previousCombatDaily = previous.combatRating?.daily;
  const preserveCombatDaily = scope === "summary"
    && Array.isArray(previousCombatDaily)
    && previousCombatDaily.length > 0;
  const combatRating = Object.prototype.hasOwnProperty.call(detail, "combatRating")
    ? (preserveCombatDaily
      ? { ...(previous.combatRating || {}), ...(detail.combatRating || {}), daily: previousCombatDaily }
      : detail.combatRating)
    : previous.combatRating;
  const mergedDetail = {
    ...previous,
    ...detail,
    combatRating,
    person: {
      ...(previous.person || {}),
      ...(detail.person || {})
    },
    spiritPearls: detail.spiritPearls
      ? {
        ...(previous.spiritPearls || {}),
        ...detail.spiritPearls
      }
      : previous.spiritPearls,
    __summaryLoaded: previous.__summaryLoaded || scope === "summary" || scope === "full",
    __historyLoaded: previous.__historyLoaded || scope === "history" || scope === "full"
  };
  personDetails.value = {
    ...personDetails.value,
    [id]: mergedDetail
  };
  if (!state.value) return;
  const nextDerived = { ...(state.value.derived || {}) };
  if (Object.prototype.hasOwnProperty.call(detail, "insight")) {
    nextDerived.personInsights = {
      ...(state.value.derived?.personInsights || {}),
      [id]: detail.insight
    };
  }
  if (Object.prototype.hasOwnProperty.call(detail, "equippedItems")) {
    nextDerived.equippedItems = {
      ...(state.value.derived?.equippedItems || {}),
      [id]: detail.equippedItems || []
    };
  }
  if (Object.prototype.hasOwnProperty.call(detail, "duelRank")) {
    nextDerived.duelRanks = {
      ...(state.value.derived?.duelRanks || {}),
      [id]: detail.duelRank || detail.person?.duelSeason
    };
  }
  if (Object.prototype.hasOwnProperty.call(detail, "power")) {
    if (id === "player") nextDerived.playerPower = detail.power ?? detail.person?.power ?? state.value.derived?.playerPower;
    else {
      nextDerived.npcPowers = {
        ...(state.value.derived?.npcPowers || {}),
        [id]: detail.power ?? detail.person?.power
      };
    }
  }
  state.value = {
    ...state.value,
    player: id === "player" ? { ...(state.value.player || {}), ...(detail.person || {}) } : state.value.player,
    npcs: id === "player"
      ? (state.value.npcs || [])
      : (state.value.npcs || []).map((npc) => npc.id === id ? { ...npc, ...(detail.person || {}) } : npc),
    derived: nextDerived
  };
}

function daoTrialTriggerLabel(trigger) {
  return ({
    runStart: "入境生效",
    battleStart: "战斗开始",
    roundStart: "回合开始",
    onAttackCount: "普攻连击",
    onSkill: "施展技能",
    afterSkill: "技能命中",
    onSkillCount: "技能循环",
    onTakeDamage: "受到伤害",
    onLethal: "致命伤害",
    onHeal: "获得治疗",
    onHealCount: "连续治疗",
    onLowHp: "气血过半以下",
    onStatus: "持续效果",
    onCompanionAssist: "同行支援",
    onCompanionSkill: "同行技能",
    onRest: "调息节点",
    onEvent: "取舍节点",
    afterBattle: "战斗胜利",
    beforeSkill: "施法之前",
    afterDamage: "造成伤害",
    onReroll: "重观法则",
    onLawChosen: "选择法则"
  })[trigger] || "持续生效";
}

async function ensurePersonDetail(id, force = false) {
  if (!id) return;
  if (force && personDetails.value[id]) {
    const nextDetails = { ...personDetails.value };
    delete nextDetails[id];
    personDetails.value = nextDetails;
  }
  const generation = authGeneration;
  if (!personDetails.value[id]?.__summaryLoaded) {
    if (personDetailLoading.value.has(id)) return;
    const nextLoading = new Set(personDetailLoading.value);
    nextLoading.add(id);
    personDetailLoading.value = nextLoading;
    try {
      const detail = await getCultivatorDetail(id, "summary");
      if (generation !== authGeneration) return;
      mergeCultivatorDetail(detail);
    } catch (err) {
      error.value = err.message;
      return;
    } finally {
      const doneLoading = new Set(personDetailLoading.value);
      doneLoading.delete(id);
      personDetailLoading.value = doneLoading;
    }
  }
  if (generation !== authGeneration || personDetails.value[id]?.__historyLoaded || personDetailHistoryLoading.value.has(id)) return;
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (generation !== authGeneration || personDetails.value[id]?.__historyLoaded) return;
  const nextHistoryLoading = new Set(personDetailHistoryLoading.value);
  nextHistoryLoading.add(id);
  personDetailHistoryLoading.value = nextHistoryLoading;
  try {
    const detail = await getCultivatorDetail(id, "history");
    if (generation !== authGeneration) return;
    mergeCultivatorDetail(detail);
  } catch (err) {
    error.value = err.message;
  } finally {
    const doneLoading = new Set(personDetailHistoryLoading.value);
    doneLoading.delete(id);
    personDetailHistoryLoading.value = doneLoading;
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
  if (!["home", "lite", "dao-trial", "task"].includes(incoming.__scope) || !current) {
    const { __scope, ...fullState } = incoming;
    return fullState;
  }
  const { __scope, derived: incomingDerived, catalog: incomingCatalog, taskDelta, ...hotState } = incoming;
  const taskCompletion = taskDelta?.completion;
  const deletedCompletionId = taskDelta?.deletedCompletionId;
  const mergeTaskRecords = (records = [], limit = 120) => {
    const remaining = deletedCompletionId
      ? records.filter((record) => record.id !== deletedCompletionId)
      : records;
    if (!taskCompletion) return remaining;
    return [taskCompletion, ...remaining.filter((record) => record.id !== taskCompletion.id)].slice(0, limit);
  };
  const mergedDerived = {
    ...(current.derived || {}),
    ...(incomingDerived || {})
  };
  if (__scope === "task" && incomingDerived?.todayPlan) {
    mergedDerived.todayPlan = {
      ...(current.derived?.todayPlan || {}),
      ...incomingDerived.todayPlan
    };
  }
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
    taskDefinitions: incoming.taskDefinitions || current.taskDefinitions || [],
    taskCompletions: __scope === "task" ? mergeTaskRecords(current.taskCompletions || []) : incoming.taskCompletions || current.taskCompletions || [],
    taskMultiplierRecords: incoming.taskMultiplierRecords || current.taskMultiplierRecords || [],
    home: {
      ...(current.home || {}),
      ...(incoming.home || {})
    },
    log: incoming.log || current.log || [],
    logDays: incoming.logDays || current.logDays || [],
    catalog: incomingCatalog || current.catalog || {},
    derived: mergedDerived
  };
}

function applyState(nextState, options = {}) {
  const incomingRevision = Number(nextState?.stateRevision);
  if (!options.force && Number.isFinite(incomingRevision) && incomingRevision < highestStateRevision) return false;
  if (Number.isFinite(incomingRevision)) highestStateRevision = Math.max(highestStateRevision, incomingRevision);
  const activePersonDetailInFlight = detailView.value === "person"
    && selectedPersonId.value
    && (personDetailLoading.value.has(selectedPersonId.value) || personDetailHistoryLoading.value.has(selectedPersonId.value));
  const shouldClearPersonDetails = options.replace
    || (!activePersonDetailInFlight && !["home", "dao-trial", "task"].includes(nextState?.__scope));
  if (shouldClearPersonDetails) personDetails.value = {};
  else if (nextState?.__scope === "task" && personDetails.value.player?.person) {
    personDetails.value = {
      ...personDetails.value,
      player: {
        ...personDetails.value.player,
        person: {
          ...personDetails.value.player.person,
          ...(nextState.player || {})
        }
      }
    };
  }
  state.value = mergeGameState(state.value, nextState, options);
  if (state.value && nextState?.__scope === "home") saveCachedState(state.value);
  if (!nextState?.__scope) fullStateStale.value = false;
  else if (["home", "lite", "task"].includes(nextState.__scope)) fullStateStale.value = true;
  if (
    nextState?.__scope === "home"
    && typeof nextState.home?.playerDuelRankPosition !== "number"
    && !(state.value?.npcs || []).length
  ) {
    ensureFullState().catch((err) => {
      error.value = err.message;
    });
  }
  if (state.value && detailView.value === "person" && selectedPersonId.value) ensurePersonDetail(selectedPersonId.value);
  return true;
}

function syncSelectedDays() {
  if (!selectedRealmStage.value) {
    selectedRealmStage.value = derived.value.currentRealmInfo?.stage || groupedRealmProgression.value[0]?.stage || "";
  }
  if (!selectedDuelDay.value) selectedDuelDay.value = gameState.value.day;
  else selectedDuelDay.value = clampRecentBattleDay(selectedDuelDay.value);
  if (!selectedProvinceWarDay.value) selectedProvinceWarDay.value = gameState.value.day;
  else selectedProvinceWarDay.value = clampRecentBattleDay(selectedProvinceWarDay.value);
  const currentDay = Math.max(1, Number(gameState.value.day) || 1);
  const floorDay = Math.max(1, currentDay - taskSelectableDayCount + 1);
  taskForm.targetDay = Math.max(floorDay, Math.min(currentDay, Number(taskForm.targetDay) || currentDay));
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
  authGeneration += 1;
  abortStateRefreshes();
  highestStateRevision = -1;
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
  activeTab.value = user?.isAdmin ? "admin" : "practice";
  await refresh(user?.isAdmin ? "full" : "home");
  if (user?.isAdmin) await loadAdminAccounts();
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
  if (scope === "full" && fullStateRefreshPromise) return fullStateRefreshPromise;
  if (scope === "home" && homeStateRefreshPromise) return homeStateRefreshPromise;
  const run = refreshStateNow(scope);
  if (scope === "full") fullStateRefreshPromise = run;
  if (scope === "home") homeStateRefreshPromise = run;
  try {
    return await run;
  } finally {
    if (scope === "full" && fullStateRefreshPromise === run) fullStateRefreshPromise = null;
    if (scope === "home" && homeStateRefreshPromise === run) homeStateRefreshPromise = null;
  }
}

async function refreshStateNow(scope = "full") {
  stateRefreshControllers.get(scope)?.abort();
  const controller = new AbortController();
  stateRefreshControllers.set(scope, controller);
  const generation = authGeneration;
  if (scope === "full") fullStateRefreshing.value = true;
  if (scope === "home") homeStateRefreshing.value = true;
  try {
    const nextState = await getState(scope, controller.signal);
    if (generation !== authGeneration) return;
    if (!applyState(nextState)) return;
    syncSelectedDays();
    error.value = "";
  } catch (err) {
    if (err?.name === "AbortError") return;
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
    if (stateRefreshControllers.get(scope) === controller) stateRefreshControllers.delete(scope);
    loading.value = false;
    if (scope === "full") fullStateRefreshing.value = false;
    if (scope === "home") homeStateRefreshing.value = false;
  }
}

async function ensureFullState() {
  await refresh("full");
}

async function act(path, body = {}, options = {}) {
  if (isActionPending(path)) return null;
  setActionPending(path, true);
  abortStateRefreshes();
  const generation = authGeneration;
  try {
    const requestBody = authUser.value?.isAdmin ? { ...body, saveId: adminSelectedAccountId.value } : body;
    const response = await postAction(path, requestBody, options);
    if (generation !== authGeneration) return null;
    const nextState = response.state || (response.result !== undefined ? null : response);
    if (nextState) {
      applyState(nextState, options);
      syncSelectedDays();
      if (["lite", "task"].includes(nextState?.__scope) && (options.markStale || shouldMarkFullStateStale(path))) {
        fullStateStale.value = true;
        if (!options.deferFullRefresh && needsHeavyState(activeTab.value)) ensureFullState();
      }
    } else if (options.markStale || shouldMarkFullStateStale(path)) {
      fullStateStale.value = true;
      if (!options.deferFullRefresh && needsHeavyState(activeTab.value)) ensureFullState();
    }
    const refreshHomeAfterAction = options.refreshHome !== false
      && shouldRefreshHomeState(path)
      && !nextState;
    if (refreshHomeAfterAction) await refresh("home");
    error.value = "";
    return response.result;
  } catch (err) {
    if (err?.name === "AbortError") return null;
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

function abortStateRefreshes() {
  for (const controller of stateRefreshControllers.values()) controller.abort();
  stateRefreshControllers.clear();
  fullStateRefreshPromise = null;
  homeStateRefreshPromise = null;
}

function shouldMarkFullStateStale(path) {
  return ["/api/day/advance", "/api/tasks", "/api/tasks/delete", "/api/breakthrough", "/api/sect/plan"].includes(path);
}

function shouldRefreshHomeState(path) {
  return [
    "/api/reset",
    "/api/day/advance",
    "/api/tasks",
    "/api/tasks/delete",
    "/api/breakthrough",
    "/api/skills/upgrade",
    "/api/rest",
    "/api/dungeons/run",
    "/api/sect/mission",
    "/api/sect/war",
    "/api/sect/plan",
    "/api/duels/day",
    "/api/items/buy",
    "/api/items/use",
    "/api/items/sell",
    "/api/player/portrait",
    "/api/admin/cultivator",
    "/api/admin/sect",
    "/api/admin/settings"
  ].includes(path);
}

function needsHeavyState(tab = activeTab.value) {
  return ["dungeon", "sect", "arena", "market", "equipment", "rank", "admin"].includes(tab);
}

function hasFullCultivatorRoster() {
  return Array.isArray(state.value?.npcs) && state.value.npcs.length > 0;
}

function needsLiteState(tab = activeTab.value) {
  return ["cultivation", "tasks", "trial", "market"].includes(tab);
}

function playBattle() {
  clearInterval(battleTimer);
  battleCursor.value = 0;
  const total = lastBattle.value?.events.length || 0;
  if (!total) return;
  const speed = Number(gameState.value?.gameSettings?.battleReplaySpeed);
  const replayInterval = Math.max(120, Math.round(680 / (Number.isFinite(speed) && speed > 0 ? speed : 1)));
  battleTimer = setInterval(() => {
    battleCursor.value += 1;
    if (battleCursor.value >= total) clearInterval(battleTimer);
  }, replayInterval);
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
  const generation = authGeneration;
  try {
    const response = await getDuelReplay(dayRecord?.day || selectedDuelDay.value, match.id);
    if (generation !== authGeneration) return;
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
  selectedProvinceWarDay.value = clampRecentBattleDay(war.day || gameState.value.day);
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

function recentBattleDayFloor() {
  return Math.max(1, (Number(gameState.value.day) || 1) - 10 + 1);
}

function clampRecentBattleDay(day) {
  if (!state.value) return Math.max(1, Number(day) || 1);
  return Math.max(recentBattleDayFloor(), Math.min(gameState.value.day, Number(day) || gameState.value.day));
}

async function loadDuelMatchPage(page = 1) {
  const record = selectedDuelRecord.value;
  const day = Number(selectedDuelDay.value);
  if (!day) {
    duelMatchPage.value = { day: null, matches: [], page: 1, pageSize: 10, total: 0, totalPages: 0 };
    return;
  }
  if (record?.tournament) {
    duelMatchPageLoading.value = false;
    duelMatchPage.value = {
      day,
      date: record.date || "",
      createdAt: record.createdAt || "",
      tournament: true,
      tournamentName: record.tournamentName || "天骄淘汰赛",
      matches: record.matches || [],
      page: 1,
      pageSize: (record.matches || []).length,
      total: (record.matches || []).length,
      totalPages: 1
    };
    return;
  }
  const requestId = ++duelMatchPageRequestId;
  const generation = authGeneration;
  duelMatchPageLoading.value = true;
  try {
    const result = await getDuelDayPage({ day, page, pageSize: 10, search: normalizedDuelSearch.value });
    if (generation !== authGeneration || requestId !== duelMatchPageRequestId || Number(selectedDuelDay.value) !== day) return;
    duelMatchPage.value = result;
    error.value = "";
  } catch (err) {
    if (requestId === duelMatchPageRequestId) error.value = err.message;
  } finally {
    if (requestId === duelMatchPageRequestId) duelMatchPageLoading.value = false;
  }
}

function changeDuelMatchPage(offset) {
  const nextPage = Math.max(1, Math.min(duelMatchPage.value.totalPages || 1, duelMatchPage.value.page + offset));
  if (nextPage !== duelMatchPage.value.page) loadDuelMatchPage(nextPage);
}

function changeDuelDay(offset) {
  selectedDuelDay.value = clampRecentBattleDay(selectedDuelDay.value + offset);
  duelMatchPage.value = { day: null, matches: [], page: 1, pageSize: 10, total: 0, totalPages: 0 };
  clearBattleReplay();
}

function changeProvinceWarDay(offset) {
  selectedProvinceWarDay.value = clampRecentBattleDay(selectedProvinceWarDay.value + offset);
  selectedProvinceWarId.value = "";
  clearBattleReplay();
}

async function startDailyDuels() {
  const result = await act("/api/duels/day", {}, { scope: "lite", markStale: true, deferFullRefresh: true });
  if (!result) return;
  if (duelSeasonInfo.value.phase === "tournament") {
    await refresh();
    selectedDuelDay.value = result.day;
    await loadDuelMatchPage(1);
    clearBattleReplay();
    return;
  }
  upsertDuelDayRecord(result);
  selectedDuelDay.value = result.day;
  await loadDuelMatchPage(1);
  clearBattleReplay();
}

function upsertDuelDayRecord(record) {
  if (!record || !state.value) return;
  const summary = {
    day: record.day,
    date: record.date,
    createdAt: record.createdAt,
    matchCount: record.matchCount ?? record.matches?.length ?? 0,
    battleCount: record.battleCount ?? (record.matches || []).filter((match) => match.type === "battle").length
  };
  const current = gameState.value.duelDays || [];
  const next = [summary, ...current.filter((item) => item.day !== summary.day)]
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
    completedAmount: task.type === "measurable" ? taskForm.completedAmount : 1,
    day: selectedTaskDay.value
  });
  taskForm.completedAmount = task.type === "measurable" ? task.targetAmount : 1;
}

async function deleteTaskCompletion(task) {
  if (!task?.id) return;
  if (!confirm(`确定撤回「${task.name}」？将扣除 ${task.xp} 经验与 ${task.spirit || 0} 灵石。`)) return;
  await act("/api/tasks/delete", { id: task.id });
}

async function submitBreakthrough() {
  if (!canBreakthroughNow.value) return;
  const result = await act("/api/breakthrough");
  if (!result) return;
  const latest = (player.value.breakthroughs || []).find((record) => Number(record.day) === Number(gameState.value.day));
  if (!latest) return;
  showBreakthroughEffect(latest);
}

function showBreakthroughEffect(record) {
  clearTimeout(breakthroughEffectTimer);
  breakthroughEffect.value = {
    success: record.success !== false,
    from: record.from || realmName(player.value.realm),
    to: record.to || realmName(player.value.realm),
    chance: Number(record.chance) || 0
  };
}

function dismissBreakthroughEffect() {
  clearTimeout(breakthroughEffectTimer);
  breakthroughEffectTimer = null;
  breakthroughEffect.value = null;
}

async function advanceDay() {
  return act("/api/day/advance");
}

function openRiskConfirmation(action) {
  riskConfirmation.action = action;
  riskConfirmation.input = "";
  riskConfirmation.submitting = false;
  riskConfirmation.open = true;
  nextTick(() => riskConfirmInput.value?.focus());
}

function clearRiskConfirmation() {
  riskConfirmation.open = false;
  riskConfirmation.action = "";
  riskConfirmation.input = "";
}

function closeRiskConfirmation() {
  if (riskConfirmation.submitting) return;
  clearRiskConfirmation();
}

async function confirmRiskAction() {
  if (!riskConfirmationReady.value || riskConfirmation.submitting) return;
  riskConfirmation.submitting = true;
  try {
    const result = riskConfirmation.action === "reset" ? await resetGame() : await advanceDay();
    if (result !== null) clearRiskConfirmation();
  } finally {
    riskConfirmation.submitting = false;
  }
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
  await saveActiveAdminDraftBeforeReset();
  const result = await act("/api/reset", {}, { scope: "lite", replace: true, markStale: true, deferFullRefresh: true });
  if (result === null) return null;
  activeTab.value = authUser.value?.isAdmin ? "admin" : "practice";
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
  return result;
}

let timer;
let battleTimer;
let chinaMapChart;
let echartsModulePromise;
let echartsInstance;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
  let observedDate = localDateKey();
  updateCountdown();
  timer = setInterval(() => {
    const currentDate = localDateKey();
    updateCountdown();
    if (currentDate !== observedDate) {
      observedDate = currentDate;
      if (authUser.value) refresh("home");
    }
  }, 1000);
  await initializeAuth();
  window.addEventListener("resize", resizeChinaMap);
  window.addEventListener("keydown", handleMapFullscreenKey);
  window.addEventListener("click", closeAccountMenu);
  document.addEventListener("fullscreenchange", syncTournamentBracketFullscreen);
});

onUnmounted(() => {
  clearInterval(timer);
  clearInterval(battleTimer);
  clearTimeout(duelSearchTimer);
  clearTimeout(breakthroughEffectTimer);
  sectMemberPanelObserver?.disconnect();
  window.removeEventListener("resize", resizeChinaMap);
  window.removeEventListener("keydown", handleMapFullscreenKey);
  window.removeEventListener("click", closeAccountMenu);
  document.removeEventListener("fullscreenchange", syncTournamentBracketFullscreen);
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

watch([state, activeTab, activeSectSubTab], () => {
  if (activeTab.value === "sect" && activeSectSubTab.value === "strategy") syncSectPlanDraft();
}, { immediate: true });

watch(activeTab, () => {
  if (needsHeavyState(activeTab.value) && state.value && (fullStateStale.value || !hasFullCultivatorRoster())) {
    ensureFullState();
  } else if (needsLiteState(activeTab.value) && state.value && fullStateStale.value) {
    refresh("lite");
  }
  if (activeTab.value === "rank" && detailView.value === "person") ensurePersonDetail(selectedPersonId.value);
  if (activeTab.value === "admin") {
    if (adminMode.value === "accounts") loadAdminAccounts();
    if (adminMode.value === "cultivators") ensurePersonDetail(adminCultivatorPerson.value?.id);
    if (adminMode.value === "cultivators") syncAdminCultivatorDraft(adminCultivatorPerson.value);
    if (adminMode.value === "sects") syncAdminSectDraft(adminSelectedSectName.value);
    if (adminMode.value === "tasks") syncAdminTaskDraft(adminTaskDefinition.value || filteredAdminTasks.value[0]);
    if (adminMode.value === "settings") syncAdminGameSettingsDraft();
    if (adminMode.value === "wiki" && !filteredAdminWikiArticles.value.some((article) => article.id === adminWikiArticleId.value)) {
      adminWikiArticleId.value = filteredAdminWikiArticles.value[0]?.id || "";
    }
  }
});

watch([activeTab, selectedDuelDay, () => selectedDuelRecord.value?.day], () => {
  if (activeTab.value !== "arena" || !selectedDuelDay.value) return;
  loadDuelMatchPage(1);
});

watch(duelSearch, () => {
  clearTimeout(duelSearchTimer);
  duelSearchTimer = setTimeout(() => {
    if (activeTab.value === "arena" && selectedDuelRecord.value) loadDuelMatchPage(1);
  }, 180);
});

watch([activeTab, activeRankBoard, () => state.value?.npcs?.length || 0], () => {
  if (activeTab.value === "rank" && !rankRosterReady.value) ensureFullState();
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
  if (adminMode.value === "accounts") loadAdminAccounts();
  else if (adminMode.value === "cultivators") {
    ensurePersonDetail(adminCultivatorPerson.value?.id);
    syncAdminCultivatorDraft(adminCultivatorPerson.value);
  }
  else if (adminMode.value === "sects") syncAdminSectDraft(adminSelectedSectName.value);
  else if (adminMode.value === "tasks") syncAdminTaskDraft(adminTaskDefinition.value || filteredAdminTasks.value[0]);
  else if (adminMode.value === "settings") syncAdminGameSettingsDraft();
  else if (!filteredAdminWikiArticles.value.some((article) => article.id === adminWikiArticleId.value)) {
    adminWikiArticleId.value = filteredAdminWikiArticles.value[0]?.id || "";
  }
});

watch([detailView, selectedPersonId], () => {
  if (detailView.value === "person") ensurePersonDetail(selectedPersonId.value);
});

watch([detailView, selectedSectName, () => selectedSect.value?.members?.length], async () => {
  await nextTick();
  observeSectRecordPanelHeight();
  syncSectRecordPanelHeight();
}, { flush: "post" });

watch(() => selectedDungeonDay.value?.public?.cycle, (cycle) => {
  selectedStarSeaCycle.value = cycle || null;
});

watch([activeDungeonRecordTab, activeDungeonDayIndex], () => {
  if (activeDungeonRecordTab.value !== "sea") return;
  starSeaTeamRankPage.value = 1;
  starSeaPersonalRankPage.value = 1;
});

watch(() => activeStarSeaCycle.value?.cycle, () => {
  starSeaCycleTeamRankPage.value = 1;
  starSeaCycleMemberRankPage.value = 1;
  starSeaCycleMemberSearch.value = "";
});

watch([starSeaCycleMemberSearch, activeStarSeaCycleBoard], () => {
  starSeaCycleMemberRankPage.value = 1;
});

watch(starSeaTeamRankPageCount, () => {
  if (starSeaTeamRankPage.value > starSeaTeamRankPageCount.value) starSeaTeamRankPage.value = starSeaTeamRankPageCount.value;
});

watch(starSeaPersonalRankPageCount, () => {
  if (starSeaPersonalRankPage.value > starSeaPersonalRankPageCount.value) starSeaPersonalRankPage.value = starSeaPersonalRankPageCount.value;
});

watch(starSeaCycleTeamRankPageCount, () => {
  if (starSeaCycleTeamRankPage.value > starSeaCycleTeamRankPageCount.value) starSeaCycleTeamRankPage.value = starSeaCycleTeamRankPageCount.value;
});

watch(starSeaCycleMemberRankPageCount, () => {
  if (starSeaCycleMemberRankPage.value > starSeaCycleMemberRankPageCount.value) starSeaCycleMemberRankPage.value = starSeaCycleMemberRankPageCount.value;
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
  const maxIndex = Math.max(0, dungeonDays.value.length - 1);
  for (const tab of dungeonRecordTabs) {
    if (dungeonDayIndexes[tab.id] > maxIndex) dungeonDayIndexes[tab.id] = maxIndex;
  }
});

watch([activeDungeonRecordTab, activeDungeonDayIndex], () => {
  selectedVoidHallSect.value = "";
});

watch(pendingEncounters, (events) => {
  if (!events.some((event) => event.id === selectedEncounterId.value)) selectedEncounterId.value = events[0]?.id || "";
}, { immediate: true });

watch(daoTrialState, (trial) => {
  if (!trial.routes?.some((route) => route.id === selectedDaoTrialRouteId.value)) {
    selectedDaoTrialRouteId.value = trial.routes?.[0]?.id || "golden-pass";
  }
  if (selectedDaoTrialCompanionId.value && !trial.companions?.some((entry) => entry.person?.id === selectedDaoTrialCompanionId.value)) {
    selectedDaoTrialCompanionId.value = "";
  }
}, { immediate: true });
</script>
