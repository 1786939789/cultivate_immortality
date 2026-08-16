<template>
  <div ref="rootRef" class="trial-analytics">
    <header class="analytics-heading">
      <div>
        <span class="analytics-kicker"><ChartNoAxesCombined :size="16" aria-hidden="true" /> 数据析卷</span>
        <h2>每日问道轨迹</h2>
        <p>以每日最佳正式游历为准，追踪层数、得分与战斗质量的变化。</p>
      </div>
      <button class="secondary compact-button" type="button" :disabled="loading" @click="loadAnalytics">
        <RefreshCw :size="14" aria-hidden="true" /> {{ loading ? "推演中" : "刷新" }}
      </button>
    </header>

    <div class="analytics-toolbar" aria-label="数据析卷筛选">
      <div class="analytics-filter-group" aria-label="时间范围">
        <span>观察周期</span>
        <div class="analytics-segments">
          <button v-for="option in rangeOptions" :key="option" type="button" :class="{ active: range === option }" :aria-pressed="range === option" @click="range = option">近 {{ option }} 日</button>
        </div>
      </div>
      <div class="analytics-filter-group route-filter" aria-label="秘境路线">
        <span>问道路数</span>
        <div class="analytics-segments">
          <button type="button" :class="{ active: !routeId }" :aria-pressed="!routeId" @click="routeId = ''">全部路线</button>
          <button v-for="route in routes" :key="route.id" type="button" :class="{ active: routeId === route.id }" :aria-pressed="routeId === route.id" @click="routeId = route.id">{{ route.name }}</button>
        </div>
      </div>
    </div>

    <div v-if="loading && !analytics" class="analytics-state" aria-live="polite">
      <span class="analytics-loader" aria-hidden="true"></span>
      <strong>正在整理问道卷宗</strong>
      <small>汇总每日最佳成绩与战斗细节</small>
    </div>

    <div v-else-if="loadError" class="analytics-state analytics-error" role="alert">
      <strong>卷宗暂时无法读取</strong>
      <small>{{ loadError }}</small>
      <button class="secondary compact-button" type="button" @click="loadAnalytics">重新读取</button>
    </div>

    <div v-else-if="analytics && !playedDays.length" class="analytics-state analytics-empty">
      <ChartNoAxesCombined :size="34" aria-hidden="true" />
      <strong>这段时间尚无正式游历</strong>
      <small>演练不会进入数据析卷；完成一次正式问道后，这里会记录每日变化。</small>
    </div>

    <template v-else-if="analytics">
      <section class="analytics-summary" aria-label="周期概览">
        <div>
          <span><Trophy :size="15" aria-hidden="true" />最近最佳</span>
          <strong>{{ analytics.summary.latest?.floor || 0 }} 层 <em>·</em> {{ formatNumber(analytics.summary.latest?.score) }} 分</strong>
          <small>第 {{ analytics.summary.latestDay }} 天 · {{ analytics.summary.latest?.routeName }}</small>
        </div>
        <div>
          <span><TrendingUp :size="15" aria-hidden="true" />较上个挑战日</span>
          <strong :class="deltaTone">{{ scoreDeltaText }} <em>·</em> {{ floorDeltaText }}</strong>
          <small>{{ analytics.summary.previous ? `对比第 ${analytics.summary.previousDay} 天` : "需要至少两个挑战日" }}</small>
        </div>
        <div>
          <span><CalendarCheck2 :size="15" aria-hidden="true" />成绩提升日</span>
          <strong>{{ analytics.summary.improvementRate == null ? "—" : `${analytics.summary.improvementRate}%` }}</strong>
          <small>{{ analytics.summary.improvedDays }} / {{ analytics.summary.comparableDays }} 个可比较日 · {{ analytics.summary.attempts }} 次游历</small>
        </div>
      </section>

      <section class="analytics-trend" aria-labelledby="trial-trend-title">
        <div class="analytics-section-head">
          <div>
            <span class="analytics-kicker"><TrendingUp :size="15" aria-hidden="true" /> 日进有功</span>
            <h3 id="trial-trend-title">每日最佳表现</h3>
            <p>柱体为最深层数，折线为同日最高分；空白日期表示当天没有正式游历。</p>
          </div>
          <label class="analytics-day-picker">
            <span>查看日期</span>
            <select v-model.number="selectedDay" aria-label="选择要查看的问道日期">
              <option v-for="entry in playedDays" :key="entry.day" :value="entry.day">第 {{ entry.day }} 天 · {{ shortDate(entry.date) }}</option>
            </select>
          </label>
        </div>
        <div ref="chartRef" class="analytics-chart" role="img" :aria-label="chartDescription"></div>
      </section>

      <section v-if="selectedEntry?.best" class="analytics-detail" aria-live="polite">
        <div class="analytics-detail-title">
          <div>
            <span>第 {{ selectedEntry.day }} 天 · {{ shortDate(selectedEntry.date) }} · 当日 {{ selectedEntry.attempts }} 次取最高分</span>
            <h3>当日最佳 · {{ selectedEntry.best.routeName }} · {{ selectedEntry.best.companion?.name || "独自问道" }}</h3>
            <small>{{ selectedEntry.best.result }}<template v-if="selectedEntry.best.affixName"> · {{ selectedEntry.best.affixName }}</template></small>
          </div>
          <button v-if="selectedEntry.best.lastReplayId" class="secondary compact-button" type="button" @click="$emit('open-replay', selectedEntry.best.lastReplayId)">
            <Play :size="14" aria-hidden="true" /> 战斗回放
          </button>
        </div>
        <div class="analytics-detail-metrics">
          <span><small>最佳成绩</small><b>{{ selectedEntry.best.floor }} 层</b></span>
          <span><small>最高得分</small><b>{{ formatNumber(selectedEntry.best.score) }}</b></span>
          <span><small>总战斗回合</small><b>{{ selectedEntry.best.combatStats.rounds }}</b></span>
          <span><small>结束气血</small><b>{{ selectedEntry.best.remainingHpRate == null ? "未记录" : `${selectedEntry.best.remainingHpRate}%` }}</b></span>
          <span><small>当日所得</small><b>修为 {{ formatNumber(selectedEntry.rewards.xp) }} · 灵石 {{ formatNumber(selectedEntry.rewards.spirit) }}<template v-if="selectedEntry.rewards.dust"> · 灵尘 {{ formatNumber(selectedEntry.rewards.dust) }}</template></b></span>
        </div>
      </section>

      <div class="analytics-lower-grid">
        <section class="analytics-breakdown" aria-labelledby="trial-breakdown-title">
          <div class="analytics-section-head compact">
            <div>
              <span class="analytics-kicker"><Layers3 :size="15" aria-hidden="true" /> 得分因由</span>
              <h3 id="trial-breakdown-title">评分构成变化</h3>
            </div>
          </div>
          <div class="breakdown-list">
            <button v-for="entry in breakdownDays" :key="entry.day" type="button" :class="{ active: selectedDay === entry.day }" @click="selectedDay = entry.day">
              <span class="breakdown-date">{{ shortDate(entry.date) }}</span>
              <span class="breakdown-track" :aria-label="`第 ${entry.day} 天评分构成`">
                <i v-for="segment in breakdownSegments(entry.best)" :key="segment.key" :class="`segment-${segment.key}`" :style="{ width: `${segment.width}%` }"></i>
              </span>
              <b>{{ formatNumber(entry.best.score) }}</b>
              <em v-if="entry.best.scoreBreakdown.modifier">{{ signed(entry.best.scoreBreakdown.modifier) }}</em>
            </button>
          </div>
          <div class="breakdown-legend" aria-label="评分构成图例">
            <span><i class="segment-progress"></i>进度</span>
            <span><i class="segment-quality"></i>战斗表现</span>
            <span><i class="segment-risk"></i>风险</span>
            <span><i class="segment-build"></i>构筑</span>
            <span><i class="segment-legacy"></i>旧记录无拆分</span>
            <span>异象修正以数字标注</span>
          </div>
        </section>

        <section class="analytics-routes" aria-labelledby="trial-routes-title">
          <div class="analytics-section-head compact">
            <div>
              <span class="analytics-kicker"><Route :size="15" aria-hidden="true" /> 路数参照</span>
              <h3 id="trial-routes-title">路线效率</h3>
            </div>
          </div>
          <div class="analytics-table-wrap">
            <table>
              <thead><tr><th>路线</th><th>次数</th><th>均分</th><th>平均层</th><th>最深</th><th>问心率</th></tr></thead>
              <tbody>
                <tr v-for="route in analytics.routeStats" :key="route.routeId" :class="{ active: routeId === route.routeId }">
                  <td><b>{{ route.routeName }}</b></td>
                  <td>{{ route.attempts }}</td>
                  <td>{{ route.attempts ? formatNumber(route.averageScore) : "—" }}</td>
                  <td>{{ route.attempts ? route.averageFloor : "—" }}</td>
                  <td>{{ route.attempts ? `${route.bestFloor} 层` : "—" }}</td>
                  <td>{{ route.attempts ? `${route.clearRate}%` : "—" }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section v-if="selectedEntry?.best" class="analytics-combat" aria-labelledby="trial-combat-title">
        <div class="analytics-section-head compact">
          <div>
            <span class="analytics-kicker"><Swords :size="15" aria-hidden="true" /> 战斗留痕</span>
            <h3 id="trial-combat-title">当日最佳战斗细节</h3>
          </div>
          <small>{{ selectedEntry.best.sealCount }} 道印 · {{ selectedEntry.best.lawCount }} 法则 · {{ selectedEntry.best.synergyCount }} 协同</small>
        </div>
        <div v-if="selectedEntry.best.scoreBreakdown.legacy" class="combat-legacy">
          <strong>旧版记录未保存战斗统计</strong>
          <small>层数、得分与奖励仍可用于趋势比较；详细伤害、回合与同行贡献从新版游历开始记录。</small>
        </div>
        <div v-else class="combat-metrics">
          <span v-for="metric in combatMetrics" :key="metric.label"><small>{{ metric.label }}</small><b>{{ formatNumber(metric.value) }}</b></span>
        </div>
        <div v-if="selectedEntry.best.companion && !selectedEntry.best.scoreBreakdown.legacy" class="companion-contribution">
          <strong>{{ selectedEntry.best.companion.name }}的同行贡献</strong>
          <span>伤害 {{ formatNumber(selectedEntry.best.companionContribution.damage) }}</span>
          <span>治疗 {{ formatNumber(selectedEntry.best.companionContribution.healing) }}</span>
          <span>护盾 {{ formatNumber(selectedEntry.best.companionContribution.shields) }}</span>
          <span>支援 {{ formatNumber(selectedEntry.best.companionContribution.assists) }} 次</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { CalendarCheck2, ChartNoAxesCombined, Layers3, Play, RefreshCw, Route, Swords, TrendingUp, Trophy } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { getDaoTrialAnalytics } from "../api";

const props = defineProps({
  routes: { type: Array, default: () => [] },
  cycle: { type: Number, default: 1 }
});

defineEmits(["open-replay"]);

const rangeOptions = [7, 14, 30];
const rootRef = ref(null);
const chartRef = ref(null);
const range = ref(14);
const routeId = ref("");
const selectedDay = ref(null);
const analytics = ref(null);
const loading = ref(false);
const loadError = ref("");
let chart = null;
let resizeObserver = null;
let requestGeneration = 0;
let chartRuntimePromise = null;

const playedDays = computed(() => analytics.value?.days?.filter((entry) => entry.best) || []);
const selectedEntry = computed(() => analytics.value?.days?.find((entry) => entry.day === selectedDay.value) || playedDays.value.at(-1) || null);
const breakdownDays = computed(() => playedDays.value.slice(-7));
const scoreDelta = computed(() => (analytics.value?.summary?.latest?.score || 0) - (analytics.value?.summary?.previous?.score || 0));
const floorDelta = computed(() => (analytics.value?.summary?.latest?.floor || 0) - (analytics.value?.summary?.previous?.floor || 0));
const scoreDeltaText = computed(() => analytics.value?.summary?.previous ? `${signed(scoreDelta.value)} 分` : "—");
const floorDeltaText = computed(() => analytics.value?.summary?.previous ? `${signed(floorDelta.value)} 层` : "—");
const deltaTone = computed(() => scoreDelta.value > 0 || floorDelta.value > 0 ? "positive" : scoreDelta.value < 0 || floorDelta.value < 0 ? "negative" : "");
const chartDescription = computed(() => `近 ${range.value} 日问道趋势，共 ${playedDays.value.length} 个正式挑战日，最近最佳为 ${analytics.value?.summary?.latest?.floor || 0} 层、${analytics.value?.summary?.latest?.score || 0} 分。`);
const combatMetrics = computed(() => {
  const stats = selectedEntry.value?.best?.combatStats || {};
  return [
    { label: "战斗场次", value: stats.battles },
    { label: "累计回合", value: stats.rounds },
    { label: "造成伤害", value: stats.damageDealt },
    { label: "承受伤害", value: stats.damageTaken },
    { label: "治疗量", value: stats.healing },
    { label: "护盾量", value: stats.shields },
    { label: "施法次数", value: stats.skillCasts },
    { label: "法力消耗", value: stats.manaSpent },
    { label: "法则触发", value: stats.lawTriggers }
  ];
});

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Math.max(0, Number(value) || 0));
}

function shortDate(value) {
  const text = String(value || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text.slice(5).replace("-", "/") : text || "未知日期";
}

function signed(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${number}`;
}

function breakdownSegments(best) {
  const breakdown = best?.scoreBreakdown || {};
  if (breakdown.legacy) return [{ key: "legacy", width: 100 }];
  const values = [
    ["progress", Math.max(0, Number(breakdown.progress) || 0)],
    ["quality", Math.max(0, Number(breakdown.quality) || 0)],
    ["risk", Math.max(0, Number(breakdown.risk) || 0)],
    ["build", Math.max(0, Number(breakdown.build) || 0)]
  ];
  const total = Math.max(1, values.reduce((sum, [, value]) => sum + value, 0));
  return values.map(([key, value]) => ({ key, width: value / total * 100 }));
}

async function loadAnalytics() {
  const generation = ++requestGeneration;
  loading.value = true;
  loadError.value = "";
  try {
    const result = await getDaoTrialAnalytics({ range: range.value, routeId: routeId.value });
    if (generation !== requestGeneration) return;
    analytics.value = result;
    const availableDays = result.days?.filter((entry) => entry.best) || [];
    if (!availableDays.some((entry) => entry.day === selectedDay.value)) selectedDay.value = availableDays.at(-1)?.day || null;
  } catch (error) {
    if (generation !== requestGeneration) return;
    loadError.value = error.message || "未知错误";
  } finally {
    if (generation === requestGeneration) loading.value = false;
  }
}

function chartColors() {
  const style = getComputedStyle(rootRef.value || document.documentElement);
  return {
    ink: style.getPropertyValue("--analytics-ink").trim(),
    muted: style.getPropertyValue("--analytics-muted").trim(),
    line: style.getPropertyValue("--analytics-line").trim(),
    gold: style.getPropertyValue("--analytics-gold").trim(),
    jade: style.getPropertyValue("--analytics-jade").trim(),
    tooltip: style.getPropertyValue("--analytics-tooltip").trim()
  };
}

function loadChartRuntime() {
  if (!chartRuntimePromise) {
    chartRuntimePromise = Promise.all([
      import("echarts/core"),
      import("echarts/components"),
      import("echarts/charts"),
      import("echarts/renderers")
    ]).then(([echarts, components, charts, renderers]) => {
      echarts.use([
        components.GridComponent,
        components.LegendComponent,
        components.TooltipComponent,
        charts.BarChart,
        charts.LineChart,
        renderers.CanvasRenderer
      ]);
      return echarts;
    });
  }
  return chartRuntimePromise;
}

async function renderChart() {
  await nextTick();
  if (!chartRef.value || !analytics.value || !playedDays.value.length) return;
  if (!chart) {
    const echarts = await loadChartRuntime();
    if (!chartRef.value) return;
    chart = echarts.init(chartRef.value, null, { renderer: "canvas" });
    chart.on("click", (params) => {
      const entry = analytics.value?.days?.[params.dataIndex];
      if (entry?.best) selectedDay.value = entry.day;
    });
    resizeObserver = new ResizeObserver(() => chart?.resize());
    resizeObserver.observe(chartRef.value);
  }
  const colors = chartColors();
  const days = analytics.value.days || [];
  chart.setOption({
    animationDuration: 260,
    color: [colors.jade, colors.gold],
    grid: { left: 56, right: 62, top: 52, bottom: 44 },
    legend: {
      top: 10,
      left: "center",
      itemWidth: 14,
      itemHeight: 7,
      textStyle: { color: colors.muted, fontSize: 12 },
      data: ["最深层数", "最高得分"]
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: colors.tooltip,
      borderColor: colors.line,
      textStyle: { color: colors.ink },
      formatter(params) {
        const entry = days[params[0]?.dataIndex];
        if (!entry?.best) return `${shortDate(entry?.date)}<br/>当日无正式游历`;
        return `<strong>第 ${entry.day} 天 · ${shortDate(entry.date)}</strong><br/>${entry.best.routeName}<br/>最深 ${entry.best.floor} 层<br/>最高 ${formatNumber(entry.best.score)} 分`;
      }
    },
    xAxis: {
      type: "category",
      data: days.map((entry) => shortDate(entry.date)),
      axisLine: { lineStyle: { color: colors.line } },
      axisTick: { show: false },
      axisLabel: { color: colors.muted, interval: days.length > 14 ? 4 : days.length > 7 ? 2 : 0, hideOverlap: true }
    },
    yAxis: [
      {
        type: "value",
        min: 0,
        minInterval: 1,
        axisLabel: { color: colors.muted, formatter: "{value}层" },
        splitLine: { lineStyle: { color: colors.line } }
      },
      {
        type: "value",
        min: 0,
        axisLabel: { color: colors.muted },
        splitLine: { show: false }
      }
    ],
    series: [
      {
        name: "最深层数",
        type: "bar",
        barMaxWidth: 26,
        data: days.map((entry) => entry.best ? {
          value: entry.best.floor,
          itemStyle: selectedDay.value === entry.day ? { color: colors.jade, borderColor: colors.gold, borderWidth: 2 } : { color: colors.jade }
        } : null),
        itemStyle: { borderRadius: [3, 3, 0, 0] }
      },
      {
        name: "最高得分",
        type: "line",
        yAxisIndex: 1,
        connectNulls: false,
        smooth: 0.2,
        symbol: "circle",
        symbolSize: 7,
        lineStyle: { width: 3, color: colors.gold },
        itemStyle: { color: colors.gold },
        data: days.map((entry) => entry.best?.score ?? null)
      }
    ]
  }, true);
}

watch([range, routeId, () => props.cycle], loadAnalytics, { immediate: true });
watch([analytics, selectedDay], renderChart);

onBeforeUnmount(() => {
  requestGeneration += 1;
  resizeObserver?.disconnect();
  chart?.dispose();
});
</script>

<style scoped>
.trial-analytics {
  --analytics-ink: #2f2518;
  --analytics-muted: #796344;
  --analytics-line: rgba(113, 82, 39, .25);
  --analytics-gold: #aa741d;
  --analytics-jade: #2f7d69;
  --analytics-red: #9a4d3d;
  --analytics-violet: #765184;
  --analytics-tooltip: #fff8e6;
  display: grid;
  gap: 14px;
  min-width: 0;
  color: var(--analytics-ink);
}

.analytics-heading,
.analytics-toolbar,
.analytics-summary,
.analytics-detail,
.analytics-combat,
.analytics-trend,
.analytics-breakdown,
.analytics-routes {
  border: 1px solid var(--analytics-line);
  background: rgba(255, 249, 232, .78);
}

.analytics-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 17px 18px;
  background:
    linear-gradient(100deg, rgba(255, 249, 231, .96), rgba(236, 220, 177, .78)),
    url("/assets/tasks/task-bg-mountains.svg") right bottom / auto 108% no-repeat;
}

.analytics-heading h2,
.analytics-section-head h3,
.analytics-detail h3 {
  margin: 3px 0;
  letter-spacing: 0;
}

.analytics-heading h2 { font-size: 24px; }
.analytics-heading p,
.analytics-section-head p { margin: 0; color: var(--analytics-muted); }
.analytics-kicker { display: inline-flex; align-items: center; gap: 6px; color: #85601f; font-size: 12px; font-weight: 800; }

.analytics-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 12px 14px;
}

.analytics-filter-group { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.analytics-filter-group > span { color: var(--analytics-muted); font-size: 12px; font-weight: 800; }
.analytics-segments { display: flex; flex-wrap: wrap; gap: 5px; }
.analytics-segments button {
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid rgba(110, 81, 41, .34);
  border-radius: 3px;
  background: rgba(249, 239, 211, .74);
  color: #604821;
}
.analytics-segments button.active { border-color: #376f5e; background: #315f51; color: #fff1c5; }

.analytics-state { display: grid; place-items: center; gap: 7px; min-height: 280px; padding: 30px; border: 1px dashed var(--analytics-line); color: var(--analytics-muted); text-align: center; }
.analytics-state strong { color: var(--analytics-ink); font-size: 17px; }
.analytics-loader { width: 26px; height: 26px; border: 3px solid rgba(47, 125, 105, .18); border-top-color: var(--analytics-jade); border-radius: 50%; animation: trial-spin .8s linear infinite; }
@keyframes trial-spin { to { transform: rotate(360deg); } }

.analytics-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); background: rgba(49, 55, 43, .96); }
.analytics-summary > div { display: grid; gap: 5px; min-width: 0; padding: 13px 16px; border-right: 1px solid rgba(238, 207, 137, .18); }
.analytics-summary > div:last-child { border-right: 0; }
.analytics-summary span { display: flex; align-items: center; gap: 6px; color: #c8b991; font-size: 12px; }
.analytics-summary strong { color: #ffe09a; font-size: 21px; font-variant-numeric: tabular-nums; }
.analytics-summary strong.positive { color: #8fd2ad; }
.analytics-summary strong.negative { color: #efa08b; }
.analytics-summary em { color: #9e9177; font-style: normal; }
.analytics-summary small { color: #aaa087; overflow-wrap: anywhere; }

.analytics-trend,
.analytics-breakdown,
.analytics-routes,
.analytics-combat { padding: 15px 16px; }
.analytics-section-head { display: flex; align-items: end; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
.analytics-section-head.compact { align-items: center; }
.analytics-section-head h3 { font-size: 18px; }
.analytics-section-head > small { color: var(--analytics-muted); }
.analytics-day-picker { display: grid; gap: 3px; min-width: 190px; color: var(--analytics-muted); font-size: 12px; }
.analytics-day-picker select { min-height: 34px; padding: 5px 8px; border-radius: 3px; border-color: rgba(110, 81, 41, .32); background: rgba(255, 251, 238, .9); }
.analytics-chart { width: 100%; height: 340px; border-top: 1px solid var(--analytics-line); border-bottom: 1px solid var(--analytics-line); }

.analytics-detail { border-left: 4px solid var(--analytics-jade); }
.analytics-detail-title { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 12px 14px 9px; }
.analytics-detail-title span,
.analytics-detail-title small { color: var(--analytics-muted); }
.analytics-detail-title h3 { font-size: 18px; }
.analytics-detail-metrics { display: grid; grid-template-columns: repeat(4, minmax(105px, 1fr)) minmax(210px, 1.5fr); border-top: 1px solid var(--analytics-line); }
.analytics-detail-metrics > span { display: grid; gap: 3px; min-width: 0; padding: 10px 13px; border-right: 1px solid var(--analytics-line); }
.analytics-detail-metrics > span:last-child { border-right: 0; }
.analytics-detail-metrics small { color: var(--analytics-muted); }
.analytics-detail-metrics b { overflow-wrap: anywhere; font-size: 15px; }

.analytics-lower-grid { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(360px, .85fr); gap: 14px; }
.analytics-breakdown .analytics-kicker { font-size: 13px; }
.analytics-breakdown .analytics-section-head h3 { font-size: 20px; }
.breakdown-list { display: grid; gap: 7px; }
.breakdown-list button { display: grid; grid-template-columns: 54px minmax(0, 1fr) 66px auto; gap: 9px; align-items: center; min-width: 0; padding: 8px 9px; border: 1px solid transparent; background: transparent; color: var(--analytics-ink); font-size: 14px; text-align: left; }
.breakdown-list button:hover,
.breakdown-list button.active { border-color: rgba(47, 125, 105, .34); background: rgba(47, 125, 105, .08); }
.breakdown-date { color: #654f30; font-weight: 600; font-variant-numeric: tabular-nums; }
.breakdown-track { display: flex; height: 18px; overflow: hidden; background: rgba(113, 82, 39, .1); }
.breakdown-track i { display: block; height: 100%; }
.breakdown-list b { font-size: 14px; text-align: right; font-variant-numeric: tabular-nums; }
.breakdown-list em { color: var(--analytics-red); font-size: 12px; font-weight: 700; font-style: normal; }
.segment-progress { background: var(--analytics-gold); }
.segment-quality { background: var(--analytics-jade); }
.segment-risk { background: var(--analytics-red); }
.segment-build { background: var(--analytics-violet); }
.segment-legacy { background: #b3a488; }
.breakdown-legend { display: flex; flex-wrap: wrap; gap: 9px 14px; margin-top: 12px; color: #654f30; font-size: 13px; font-weight: 600; }
.breakdown-legend span { display: inline-flex; align-items: center; gap: 4px; }
.breakdown-legend i { width: 10px; height: 10px; }

.analytics-table-wrap { overflow-x: auto; }
.analytics-routes table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.analytics-routes th,
.analytics-routes td { padding: 9px 7px; border-bottom: 1px solid var(--analytics-line); text-align: right; white-space: nowrap; }
.analytics-routes th { color: var(--analytics-muted); font-size: 12px; font-weight: 700; }
.analytics-routes th:first-child,
.analytics-routes td:first-child { text-align: left; }
.analytics-routes tr.active { background: rgba(47, 125, 105, .08); }

.combat-metrics { display: grid; grid-template-columns: repeat(9, minmax(78px, 1fr)); border-top: 1px solid var(--analytics-line); border-bottom: 1px solid var(--analytics-line); }
.combat-legacy { display: grid; gap: 4px; padding: 16px; border-top: 1px solid var(--analytics-line); background: rgba(113, 82, 39, .06); color: var(--analytics-muted); text-align: center; }
.combat-legacy strong { color: var(--analytics-ink); }
.combat-metrics span { display: grid; gap: 4px; min-width: 0; padding: 10px 8px; border-right: 1px solid var(--analytics-line); text-align: center; }
.combat-metrics span:last-child { border-right: 0; }
.combat-metrics small { color: var(--analytics-muted); }
.combat-metrics b { font-size: 16px; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.companion-contribution { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; margin-top: 10px; color: var(--analytics-muted); }
.companion-contribution strong { color: var(--analytics-ink); }

@media (max-width: 1040px) {
  .analytics-summary { grid-template-columns: 1fr; }
  .analytics-summary > div { border-right: 0; border-bottom: 1px solid rgba(238, 207, 137, .18); }
  .analytics-summary > div:last-child { border-bottom: 0; }
  .analytics-lower-grid { grid-template-columns: 1fr; }
  .analytics-detail-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .analytics-detail-metrics > span { border-bottom: 1px solid var(--analytics-line); }
  .analytics-detail-metrics > span:last-child { grid-column: 1 / -1; border-bottom: 0; }
  .combat-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .combat-metrics span:nth-child(3n) { border-right: 0; }
  .combat-metrics span:nth-child(-n + 6) { border-bottom: 1px solid var(--analytics-line); }
}

@media (max-width: 720px) {
  .analytics-heading,
  .analytics-section-head,
  .analytics-detail-title { align-items: stretch; flex-direction: column; }
  .analytics-heading > button,
  .analytics-detail-title > button { align-self: flex-start; }
  .analytics-toolbar { display: grid; }
  .analytics-filter-group { display: grid; }
  .analytics-day-picker { width: 100%; min-width: 0; }
  .analytics-chart { height: 290px; }
  .analytics-detail-metrics { grid-template-columns: 1fr 1fr; }
  .analytics-detail-metrics > span:nth-child(even) { border-right: 0; }
  .breakdown-list button { grid-template-columns: 42px minmax(90px, 1fr) 54px; }
  .breakdown-list em { grid-column: 2 / -1; }
  .combat-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .combat-metrics span:nth-child(3n) { border-right: 1px solid var(--analytics-line); }
  .combat-metrics span:nth-child(even) { border-right: 0; }
  .combat-metrics span:nth-child(-n + 8) { border-bottom: 1px solid var(--analytics-line); }
}

@media (max-width: 420px) {
  .analytics-heading,
  .analytics-trend,
  .analytics-breakdown,
  .analytics-routes,
  .analytics-combat { padding: 12px; }
  .analytics-segments button { flex: 1 1 auto; }
  .analytics-detail-metrics { grid-template-columns: 1fr; }
  .analytics-detail-metrics > span,
  .analytics-detail-metrics > span:nth-child(even) { border-right: 0; }
  .analytics-detail-metrics > span:last-child { grid-column: auto; }
}
</style>
