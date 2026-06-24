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
      heartDemon: 0
    },
    bag: { focus: 1, blood: 1, insight: 0 },
    tasks: [],
    npcs: npcNames.map((name, index) => ({
      name,
      sect: sects[index % sects.length],
      realm: Math.floor(Math.random() * 4),
      xp: Math.floor(Math.random() * 90),
      mood: pick(["谨慎", "好斗", "闭关", "游历"])
    })),
    sect: {
      name: "云麓盟",
      reputation: 20,
      supplies: 80,
      rivalHeat: 18
    },
    lastSettlementDate: dateKey(),
    log: [{ text: "你在山脚租下一间小屋，翻开第一卷长生札记。", type: "", day: 1, time: "初入" }]
  };
}

export function powerOf(entity, state) {
  const realm = entity.realm || 0;
  const base = 30 + realm * 23;
  if (state && entity === state.player) {
    return Math.floor(
      base +
      entity.attack * 2.4 +
      entity.defense * 1.7 +
      entity.body * 1.5 +
      entity.wisdom * 1.3 +
      entity.mind * 0.35 +
      entity.reputation * 0.2
    );
  }
  return Math.floor(base + entity.xp * 0.12 + (entity.mood === "好斗" ? 14 : 0));
}

export function getPublicState(state) {
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
      breakChance
    }
  };
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
    npc.xp += gain;
    const need = xpNeed(npc.realm);
    if (npc.xp >= need && npc.realm < realms.length - 1) {
      npc.xp -= need;
      npc.realm += 1;
      log(state, `${npc.name}在${npc.sect}闭关有成，突破至「${realms[npc.realm]}」。`);
    }
    npc.mood = pick(["谨慎", "好斗", "闭关", "游历"]);
  }

  state.sect.supplies = clamp(state.sect.supplies + Math.floor(Math.random() * 18) - 5, 0, 160);
  state.sect.rivalHeat = clamp(state.sect.rivalHeat + Math.floor(Math.random() * 15) - 4, 0, 100);
  state.player.hp = clamp(state.player.hp + 10, 0, state.player.maxHp);
  state.player.mind = clamp(state.player.mind + 4, 0, 120);
  state.lastSettlementDate = dateKey();

  if (options.auto) log(state, "子时已过，天地灵机一转，今日自动结算完成。", "gold");
  log(state, pick(events), "gold");
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

  const chance = clamp(0.48 + p.mind / 240 + p.root.breakBonus - p.heartDemon / 220 + p.wisdom / 600, 0.18, 0.92);
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
    log(state, `灵气贯通周天，你成功突破至「${realms[p.realm]}」。`, "gold");
  } else {
    p.hp = clamp(p.hp - 26, 1, p.maxHp);
    p.mind = clamp(p.mind - 16, 0, 120);
    p.heartDemon += p.talent.name === "稳心" ? 8 : 14;
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
    state.sect.rivalHeat = Math.max(0, state.sect.rivalHeat - 20);
    log(state, `云麓盟击退${enemy}挑衅，你在战中扬名，获得 45 灵石。`, "gold");
  } else {
    state.player.hp = clamp(state.player.hp - 28, 1, state.player.maxHp);
    state.player.mind = clamp(state.player.mind - 10, 0, 120);
    state.sect.supplies = Math.max(0, state.sect.supplies - 28);
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
    log(state, `你胜过${npc.name}，对方拱手称服。获得 ${xp} 修为。`, "gold");
  } else {
    p.hp = clamp(p.hp - 18 - npc.realm * 3, 1, p.maxHp);
    p.xp += 10;
    p.mind = clamp(p.mind - 4, 0, 120);
    log(state, `${npc.name}招式老辣，你败下阵来，但记住了关键破绽。`, "bad");
  }
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
