import { dungeons, itemCatalog, npcNames, realms, roots, sects, talents, taskTemplates } from "./gameData.mjs";

export function dateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function xpNeed(realm) {
  return Math.floor(100 * Math.pow(1.34, realm));
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeNpc(name, index) {
  const root = pick(roots);
  const talent = pick(talents);
  const realm = Math.floor(Math.random() * 4);
  const body = 7 + Math.floor(Math.random() * 7);
  const wisdom = 7 + Math.floor(Math.random() * 8);
  const attack = 12 + realm * 4 + talent.attack + Math.floor(Math.random() * 8);
  const defense = 9 + realm * 3 + Math.floor(Math.random() * 7);
  const bestDungeonPower = Math.floor(Math.random() * 90);

  return {
    id: `npc-${index}`,
    name,
    sect: sects[index % sects.length],
    root,
    talent,
    realm,
    xp: Math.floor(Math.random() * 90),
    hp: 100 + realm * 18 + body * 2,
    maxHp: 100 + realm * 18 + body * 2,
    mind: clamp(58 + talent.mind + Math.floor(Math.random() * 22), 0, 120),
    spirit: 30 + Math.floor(Math.random() * 90),
    reputation: Math.floor(Math.random() * 28),
    body,
    wisdom,
    attack,
    defense,
    chance: 4 + Math.floor(Math.random() * 8),
    wealth: 0,
    heartDemon: Math.floor(Math.random() * 8),
    mood: pick(["谨慎", "好斗", "闭关", "游历"]),
    duelWins: Math.floor(Math.random() * 6),
    duelLosses: Math.floor(Math.random() * 4),
    dungeonClears: Math.floor(Math.random() * 5),
    bestDungeonPower,
    bestDungeonName: bestDungeonPower > 65 ? "沉星矿脉" : bestDungeonPower > 0 ? "雾隐药谷" : "未入秘境",
    dailyRecords: [],
    breakthroughs: [],
    duelHistory: []
  };
}

function log(state, text, type = "") {
  state.log.unshift({
    text,
    type,
    day: state.day,
    time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
  });
  state.log = state.log.slice(0, 80);
}

export function createDefaultState() {
  const root = pick(roots);
  const talent = pick(talents);

  return {
    day: 1,
    player: {
      id: "player",
      name: "无名散修",
      root,
      talent,
      realm: 0,
      xp: 0,
      hp: 100,
      maxHp: 100,
      mind: 60 + talent.mind,
      spirit: 80,
      reputation: 0,
      body: 8,
      wisdom: 8,
      attack: 12 + talent.attack,
      defense: 9,
      chance: 5,
      wealth: 0,
      heartDemon: 0,
      duelWins: 0,
      duelLosses: 0,
      dungeonClears: 0,
      bestDungeonPower: 0,
      bestDungeonName: "未入秘境",
      dailyRecords: [],
      breakthroughs: [],
      duelHistory: []
    },
    bag: { focus: 1, blood: 1, insight: 0 },
    tasks: [],
    npcs: npcNames.map((name, index) => makeNpc(name, index)),
    sect: {
      name: "云麓盟",
      reputation: 20,
      supplies: 80,
      rivalHeat: 18,
      warWins: 0,
      warLosses: 0
    },
    lastSettlementDate: dateKey(),
    log: [{ text: "你在山脚租下一间小屋，翻开第一卷长生札记。", type: "", day: 1, time: "初入" }]
  };
}

export function ensureStateShape(state) {
  state.player.id ??= "player";
  state.player.duelWins ??= 0;
  state.player.duelLosses ??= 0;
  state.player.dungeonClears ??= 0;
  state.player.bestDungeonPower ??= 0;
  state.player.bestDungeonName ??= "未入秘境";
  state.player.dailyRecords ??= [];
  state.player.breakthroughs ??= [];
  state.player.duelHistory ??= [];
  state.sect.warWins ??= 0;
  state.sect.warLosses ??= 0;

  state.npcs = state.npcs.map((npc, index) => {
    const full = makeNpc(npc.name, index);
    Object.assign(full, npc);
    full.id ??= `npc-${index}`;
    full.root ??= pick(roots);
    full.talent ??= pick(talents);
    full.maxHp ??= 100 + (full.realm || 0) * 18 + (full.body || 8) * 2;
    full.hp ??= full.maxHp;
    full.mind ??= clamp(58 + full.talent.mind, 0, 120);
    full.spirit ??= 30 + Math.floor(Math.random() * 90);
    full.reputation ??= Math.floor(Math.random() * 28);
    full.body ??= 7 + Math.floor(Math.random() * 7);
    full.wisdom ??= 7 + Math.floor(Math.random() * 8);
    full.attack ??= 12 + (full.realm || 0) * 4 + full.talent.attack + Math.floor(Math.random() * 8);
    full.defense ??= 9 + (full.realm || 0) * 3 + Math.floor(Math.random() * 7);
    full.chance ??= 4 + Math.floor(Math.random() * 8);
    full.wealth ??= 0;
    full.heartDemon ??= Math.floor(Math.random() * 8);
    full.mood ??= pick(["谨慎", "好斗", "闭关", "游历"]);
    full.dailyRecords ??= [];
    full.breakthroughs ??= [];
    full.duelHistory ??= [];
    full.duelWins ??= Math.floor(Math.random() * 6);
    full.duelLosses ??= Math.floor(Math.random() * 4);
    full.dungeonClears ??= Math.floor(Math.random() * 5);
    full.bestDungeonPower ??= Math.floor(Math.random() * 90);
    full.bestDungeonName ??= full.bestDungeonPower > 65 ? "沉星矿脉" : full.bestDungeonPower > 0 ? "雾隐药谷" : "未入秘境";
    return full;
  });
  return state;
}

export function powerOf(entity, state) {
  const realm = entity.realm || 0;
  const base = 30 + realm * 23;
  return Math.floor(
    base +
    (entity.attack || 0) * 2.4 +
    (entity.defense || 0) * 1.7 +
    (entity.body || 0) * 1.5 +
    (entity.wisdom || 0) * 1.3 +
    (entity.mind || 0) * 0.35 +
    (entity.reputation || 0) * 0.2 +
    (entity.xp || 0) * 0.08 +
    (entity.mood === "好斗" ? 14 : 0)
  );
}

export function getPublicState(state) {
  ensureStateShape(state);
  const nextRealm = realms[Math.min(state.player.realm + 1, realms.length - 1)];
  const breakChance = clamp(
    0.48 +
    state.player.mind / 240 +
    state.player.root.breakBonus -
    state.player.heartDemon / 220 +
    state.player.wisdom / 600,
    0.18,
    0.92
  );

  return {
    ...state,
    catalog: { realms, dungeons, taskTemplates, itemCatalog, sects },
    derived: {
      xpNeed: xpNeed(state.player.realm),
      playerPower: powerOf(state.player, state),
      nextRealm,
      breakChance,
      npcPowers: Object.fromEntries(state.npcs.map((npc) => [npc.id, powerOf(npc)])),
      sects: buildSectSummaries(state)
    }
  };
}

function buildSectSummaries(state) {
  const members = [
    { ...state.player, sect: state.sect.name, mood: "求道", power: powerOf(state.player, state), isPlayer: true },
    ...state.npcs.map((npc) => ({ ...npc, power: powerOf(npc), isPlayer: false }))
  ];
  const groups = new Map();

  for (const member of members) {
    const current = groups.get(member.sect) || {
      name: member.sect,
      reputation: member.sect === state.sect.name ? state.sect.reputation : 12 + Math.floor(Math.random() * 28),
      supplies: member.sect === state.sect.name ? state.sect.supplies : 40 + Math.floor(Math.random() * 90),
      rivalHeat: member.sect === state.sect.name ? state.sect.rivalHeat : 20 + Math.floor(Math.random() * 50),
      warWins: member.sect === state.sect.name ? state.sect.warWins : Math.floor(Math.random() * 5),
      warLosses: member.sect === state.sect.name ? state.sect.warLosses : Math.floor(Math.random() * 4),
      members: [],
      totalPower: 0
    };
    current.members.push({
      id: member.id,
      name: member.name,
      realm: member.realm,
      mood: member.mood,
      power: member.power,
      isPlayer: member.isPlayer
    });
    current.totalPower += member.power;
    groups.set(member.sect, current);
  }

  return [...groups.values()]
    .map((sect) => ({
      ...sect,
      totalPower: Math.round(sect.totalPower),
      leader: [...sect.members].sort((a, b) => b.power - a.power)[0]?.name || "无"
    }))
    .sort((a, b) => b.totalPower - a.totalPower);
}

export function settleIfNeeded(state) {
  const today = dateKey();
  if (!state.lastSettlementDate) state.lastSettlementDate = today;
  if (state.lastSettlementDate === today) return false;
  dailySettlement(state, { auto: true });
  return true;
}

export function dailySettlement(state, options = {}) {
  state.day += 1;
  const events = [
    "坊市传来秘境流言，众修士人心浮动。",
    "宗门执事清点物资，贡献高者可先得丹药。",
    "山雨压城，灵气却格外活跃。",
    "有散修在擂台连胜三场，榜单排名变动。"
  ];

  for (const npc of state.npcs) {
    const gain = Math.floor(35 + Math.random() * 85 + npc.realm * 6);
    const spirit = Math.floor(8 + Math.random() * 22 + npc.realm * 2);
    const beforeRealm = npc.realm;
    const breakChance = breakthroughChance(npc);
    npc.xp += gain;
    npc.spirit += spirit;
    const need = xpNeed(npc.realm);
    if (npc.xp >= need && npc.realm < realms.length - 1) {
      npc.xp -= need;
      npc.realm += 1;
      npc.maxHp += 16 + npc.realm * 2;
      npc.hp = npc.maxHp;
      npc.attack += 4 + Math.ceil(npc.realm / 2);
      npc.defense += 3 + Math.ceil(npc.realm / 3);
      npc.reputation += 4 + npc.realm;
      npc.breakthroughs.unshift({ day: state.day, from: realms[beforeRealm], to: realms[npc.realm], success: true, chance: breakChance });
      npc.breakthroughs = npc.breakthroughs.slice(0, 12);
    }
    npc.dailyRecords.unshift({
      day: state.day,
      xp: gain,
      spirit,
      realm: realms[npc.realm],
      breakChance,
      note: npc.realm > beforeRealm ? `突破至${realms[npc.realm]}` : "日常修炼"
    });
    npc.dailyRecords = npc.dailyRecords.slice(0, 14);
    npc.mood = pick(["谨慎", "好斗", "闭关", "游历"]);
  }

  state.sect.supplies = clamp(state.sect.supplies + Math.floor(Math.random() * 18) - 5, 0, 160);
  state.sect.rivalHeat = clamp(state.sect.rivalHeat + Math.floor(Math.random() * 15) - 4, 0, 100);
  const beforeHp = state.player.hp;
  const beforeMind = state.player.mind;
  state.player.hp = clamp(state.player.hp + 10, 0, state.player.maxHp);
  state.player.mind = clamp(state.player.mind + 4, 0, 120);
  state.player.dailyRecords.unshift({
    day: state.day,
    xp: 0,
    spirit: 0,
    realm: realms[state.player.realm],
    note: `自然恢复：气血 +${state.player.hp - beforeHp}，心境 +${state.player.mind - beforeMind}`
  });
  state.player.dailyRecords = state.player.dailyRecords.slice(0, 14);
  state.lastSettlementDate = dateKey();

  if (options.auto) log(state, "子时已过，天地灵机一转，今日自动结算完成。", "gold");
  if (options.manual) log(state, "你翻过一页札记，手动推进了一天。", "gold");
  log(state, pick(events), "gold");
}

function breakthroughChance(entity) {
  return clamp(
    0.48 +
    (entity.mind || 0) / 240 +
    (entity.root?.breakBonus || 0) -
    (entity.heartDemon || 0) / 220 +
    (entity.wisdom || 0) / 600,
    0.18,
    0.92
  );
}

export function addTask(state, payload) {
  const type = payload.type || "study";
  const diff = clamp(Number(payload.diff || 3), 1, 5);
  const template = taskTemplates[type];
  if (!template) throw new Error("未知任务类型");

  const name = String(payload.name || template.label).trim().slice(0, 40);
  const p = state.player;
  const xpGain = Math.floor(template.xp * diff * p.root.speed * (p.talent.name === "苦修" ? 1.12 : 1));

  p.xp += xpGain;
  p.hp = clamp(p.hp + template.hp * diff, 0, p.maxHp);
  p.mind = clamp(p.mind + template.mind * diff, 0, 120);
  p.spirit += template.spirit * diff;
  p[template.stat] = (p[template.stat] || 0) + Math.ceil(diff / 2);

  if (type === "body") {
    p.maxHp += diff;
    p.attack += Math.ceil(diff / 2);
  }
  if (type === "study") p.defense += 1;
  if (type === "discipline") p.heartDemon = Math.max(0, p.heartDemon - diff * 2);

  state.tasks.unshift({ name, type: template.label, diff, xp: xpGain, day: state.day });
  state.tasks = state.tasks.slice(0, 16);
  log(state, `完成「${name}」，获得 ${xpGain} 修为。${template.label}让你的道基更扎实。`, "gold");
}

export function attemptBreakthrough(state) {
  const p = state.player;
  const need = xpNeed(p.realm);
  if (p.realm >= realms.length - 1) {
    log(state, "前路被天地法则遮蔽，此版本暂未开放更高境界。");
    return;
  }
  if (p.xp < need) {
    log(state, `修为尚浅，还差 ${need - p.xp} 点修为才能冲击下一境。`, "bad");
    return;
  }

  const chance = breakthroughChance(p);
  p.xp -= need;
  if (Math.random() < chance) {
    p.realm += 1;
    p.maxHp += 18 + p.realm * 2;
    p.hp = p.maxHp;
    p.attack += 5 + Math.ceil(p.realm / 2);
    p.defense += 4 + Math.ceil(p.realm / 3);
    p.mind = clamp(p.mind + 10, 0, 120);
    p.reputation += 6 + p.realm;
    p.heartDemon = Math.max(0, p.heartDemon - 8);
    p.breakthroughs.unshift({ day: state.day, from: realms[p.realm - 1], to: realms[p.realm], success: true, chance });
    p.breakthroughs = p.breakthroughs.slice(0, 12);
    log(state, `灵气贯通周天，你成功突破至「${realms[p.realm]}」。`, "gold");
  } else {
    p.hp = clamp(p.hp - 26, 1, p.maxHp);
    p.mind = clamp(p.mind - 16, 0, 120);
    p.heartDemon += p.talent.name === "稳心" ? 8 : 14;
    p.breakthroughs.unshift({ day: state.day, from: realms[p.realm], to: realms[p.realm + 1] || "未知境界", success: false, chance });
    p.breakthroughs = p.breakthroughs.slice(0, 12);
    log(state, "突破失败，灵力逆冲经脉。心魔渐生，需要调息或完成自律任务。", "bad");
  }
}

export function rest(state) {
  const p = state.player;
  p.hp = clamp(p.hp + 24 + p.body, 0, p.maxHp);
  p.mind = clamp(p.mind + 14, 0, 120);
  p.heartDemon = Math.max(0, p.heartDemon - 5);
  log(state, "你闭门调息一夜，气血与心境渐复。");
}

export function runDungeon(state, id) {
  const dungeon = dungeons.find((item) => item.id === id);
  if (!dungeon) throw new Error("未知副本");
  const p = state.player;
  if (p.realm < dungeon.min) {
    log(state, `境界不足，至少需要「${realms[dungeon.min]}」才能进入${dungeon.name}。`, "bad");
    return;
  }

  const score = powerOf(p, state) * (0.82 + Math.random() * 0.42) + p.chance * 2;
  if (score >= dungeon.power) {
    const xp = Math.floor(dungeon.power * 0.48 + Math.random() * 35);
    const spirit = Math.floor(24 + Math.random() * 30);
    p.xp += xp;
    p.spirit += spirit;
    p.chance += 1;
    p.dungeonClears += 1;
    if (dungeon.power > p.bestDungeonPower) {
      p.bestDungeonPower = dungeon.power;
      p.bestDungeonName = dungeon.name;
    }
    p.hp = clamp(p.hp - Math.floor(8 + Math.random() * 14), 1, p.maxHp);
    log(state, `你通关${dungeon.name}，获得 ${xp} 修为与 ${spirit} 灵石。`, "gold");
  } else {
    p.hp = clamp(p.hp - Math.floor(24 + Math.random() * 24), 1, p.maxHp);
    p.mind = clamp(p.mind - 8, 0, 120);
    p.xp += Math.floor(dungeon.power * 0.12);
    log(state, `${dungeon.name}险象环生，你负伤撤出，只带回少量感悟。`, "bad");
  }
}

export function sectMission(state) {
  const p = state.player;
  const xp = 32 + p.realm * 7;
  const rep = 5 + Math.floor(Math.random() * 6);
  p.xp += xp;
  p.reputation += rep;
  p.spirit += 16;
  state.sect.reputation += rep;
  state.sect.supplies += 10;
  p.hp = clamp(p.hp - 6, 1, p.maxHp);
  log(state, `完成云麓盟任务，获得 ${xp} 修为、${rep} 声望与 16 灵石。`, "gold");
}

export function sectWar(state) {
  const enemy = pick(sects);
  const our = powerOf(state.player, state) + state.sect.reputation + state.sect.supplies * 0.4 + Math.random() * 80;
  const their = 90 + state.sect.rivalHeat * 1.2 + Math.random() * 120;

  if (our >= their) {
    state.player.reputation += 14;
    state.player.spirit += 45;
    state.sect.reputation += 18;
    state.sect.warWins += 1;
    state.sect.rivalHeat = Math.max(0, state.sect.rivalHeat - 20);
    log(state, `云麓盟击退${enemy}挑衅，你在战中扬名，获得 45 灵石。`, "gold");
  } else {
    state.player.hp = clamp(state.player.hp - 28, 1, state.player.maxHp);
    state.player.mind = clamp(state.player.mind - 10, 0, 120);
    state.sect.supplies = Math.max(0, state.sect.supplies - 28);
    state.sect.warLosses += 1;
    log(state, `${enemy}攻势凌厉，云麓盟小败一阵，你负伤退回山门。`, "bad");
  }
}

export function duel(state, index) {
  const npc = state.npcs[Number(index)];
  if (!npc) throw new Error("未知对手");
  const p = state.player;
  const mine = powerOf(p, state) * (0.82 + Math.random() * 0.44);
  const theirs = powerOf(npc) * (0.86 + Math.random() * 0.36);

  if (mine >= theirs) {
    const xp = 24 + npc.realm * 8;
    p.xp += xp;
    p.reputation += 5;
    p.spirit += 12;
    p.duelWins += 1;
    npc.duelLosses += 1;
    p.duelHistory.unshift({ day: state.day, opponent: npc.name, result: "胜", xp, spirit: 12 });
    npc.duelHistory.unshift({ day: state.day, opponent: p.name, result: "负", xp: 0, spirit: 0 });
    log(state, `你胜过${npc.name}，对方拱手称服。获得 ${xp} 修为。`, "gold");
  } else {
    const damage = 18 + npc.realm * 3;
    p.hp = clamp(p.hp - 18 - npc.realm * 3, 1, p.maxHp);
    p.xp += 10;
    p.mind = clamp(p.mind - 4, 0, 120);
    p.duelLosses += 1;
    npc.duelWins += 1;
    p.duelHistory.unshift({ day: state.day, opponent: npc.name, result: "负", xp: 10, spirit: 0, hpLoss: damage });
    npc.duelHistory.unshift({ day: state.day, opponent: p.name, result: "胜", xp: 0, spirit: 0 });
    log(state, `${npc.name}招式老辣，你败下阵来，但记住了关键破绽。`, "bad");
  }
  p.duelHistory = p.duelHistory.slice(0, 20);
  npc.duelHistory = npc.duelHistory.slice(0, 20);
}

export function buyItem(state, kind) {
  const item = itemCatalog[kind];
  if (!item) throw new Error("未知物品");
  if (state.player.spirit < item.price) {
    log(state, "灵石不足，掌柜只是笑着摇头。", "bad");
    return;
  }
  state.player.spirit -= item.price;
  state.bag[kind] += 1;
  log(state, `购得${item.name}一份。`);
}

export function useItem(state, kind) {
  if (!itemCatalog[kind]) throw new Error("未知物品");
  if (state.bag[kind] <= 0) return;
  const p = state.player;
  state.bag[kind] -= 1;

  if (kind === "focus") {
    p.mind = clamp(p.mind + 22, 0, 120);
    p.heartDemon = Math.max(0, p.heartDemon - 8);
    log(state, "服下清心散，杂念渐消。");
  }
  if (kind === "blood") {
    p.hp = clamp(p.hp + 45, 0, p.maxHp);
    log(state, "服下养血丹，气血翻涌。");
  }
  if (kind === "insight") {
    p.xp += 55;
    p.wisdom += 2;
    log(state, "饮下悟道茶，数处疑难豁然贯通。", "gold");
  }
}
