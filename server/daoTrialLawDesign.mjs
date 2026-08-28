const stackLevels = [1, 2, 3, 4, 5];

export const daoTrialLawBranches = {
  "攻伐连锁": ["连击", "破防", "斩杀", "战意延续"],
  "技能循环": ["免耗", "术法回响", "冷却", "法力转化"],
  "守御反击": ["致命防护", "储伤反击", "无伤护盾", "反照"],
  "生机转化": ["复苏", "吸血", "持续恢复", "治疗反转"],
  "风险流派": ["低血爆发", "燃血施法", "受伤成长", "风险收益"],
  "同行共鸣": ["技能共鸣", "协击", "替劫", "独行化身"],
  "五行衍化": ["五行轮转", "异常熔炼", "逆克化生", "天劫道域"],
  "命数经营": ["重观改命", "残悟", "福祸转化", "命数积累"]
};

const schoolIds = {
  "攻伐连锁": "attack",
  "技能循环": "focus",
  "守御反击": "guard",
  "生机转化": "vitality",
  "风险流派": "risk",
  "同行共鸣": "bond",
  "五行衍化": "element",
  "命数经营": "fate"
};

const silverSuffixes = ["启灵", "循行", "凝意", "化境", "归真"];

function mechanic(type, action, event, summary, params = {}, buffs = {}) {
  return { type, action, event, summary, params, buffs };
}

function diamondStackPlan(core, second, third, fourth, fifth) {
  return [core, second, third, fourth, fifth].map((text, index) => ({ stack: index + 1, text }));
}

function diamond(name, trigger, text, effects, mechanics, stackPlan) {
  return { name, trigger, text, effects, mechanics, stackPlan, designRole: "规则改变" };
}

const diamondDefinitions = {
  "攻伐连锁": [
    diamond("万剑归宗", "onAttackCount", "每第三次普通攻击引动剑阵追击，并强化下一次术法。", { attack: 0.08 }, [
      mechanic("sword-domain", "attackEcho", "afterAttack", "第三次普通攻击引动剑阵追击", { every: [3, 3, 3, 2, 2], power: [0.5, 0.64, 0.72, 0.8, 0.88], nextSkillPower: [0.12, 0.16, 0.2, 0.24, 0.3] })
    ], diamondStackPlan("解锁三击剑阵", "追击与术法增幅提高", "剑阵强化下一次术法", "追击威力提高", "两次攻击即可引动剑阵")),
    diamond("破界天锋", "afterSkill", "每场战斗首次伤害术法撕裂护体灵光，并追加一次破界斩。", { skillPower: 0.08 }, [
      mechanic("world-rending-edge", "openingSurge", "afterSkill", "首次伤害术法追加破界斩", { power: [0.42, 0.55, 0.64, 0.74, 0.85], targetAbove: [0.7, 0.65, 0.6, 0.55, 0.5], once: true })
    ], diamondStackPlan("首次术法追加破界斩", "破界斩提高", "触发气血门槛降低", "破界斩再次提高", "半血以上即可破界")),
    diamond("追魂夺魄", "afterDamage", "敌方气血低于三成后，攻击与术法会引动追魂斩。", { divineSense: 0.08 }, [
      mechanic("soul-reaping-mark", "executeStrike", ["afterAttack", "afterSkill"], "低血目标受到额外追魂伤害", { threshold: [0.3, 0.34, 0.38, 0.42, 0.46], power: [0.3, 0.38, 0.46, 0.54, 0.65], oncePerRound: true })
    ], diamondStackPlan("解锁低血追魂斩", "斩杀伤害提高", "斩杀线提高", "追魂斩再次提高", "斩杀线与伤害达到极境")),
    diamond("战意不熄", "afterBattle", "每次战斗胜利都会积累本轮战意，后续战斗持续增强。", { nextBattleAttack: 0.08 }, [
      mechanic("undying-battle-will", "battleMomentum", "afterBattle", "胜利后积累整轮有效的战意", { gain: [0.035, 0.045, 0.055, 0.065, 0.08], cap: [0.18, 0.22, 0.26, 0.3, 0.36] })
    ], diamondStackPlan("胜利积累战意", "每层战意提高", "战意上限提高", "积累速度提高", "战意上限达到三成以上"))
  ],
  "技能循环": [
    diamond("周天无尽", "onSkillCount", "每第二次施法不消耗法力，每第四次施法引发术法余波。", { maxMana: 0.08 }, [
      mechanic("boundless-casting", "freeCast", ["beforeSkill", "afterSkill"], "周期性免除技能法力消耗", { every: [2, 2, 2, 2, 2], echoEvery: [4, 4, 3, 3, 2], echoPower: [0.28, 0.36, 0.42, 0.5, 0.58] })
    ], diamondStackPlan("每第二次施法免费", "术法余波提高", "每第三次施法产生余波", "余波再次提高", "每第二次施法同时产生余波")),
    diamond("一念双生", "afterSkill", "每第三次伤害术法会被道韵复制，产生一次削弱的重复攻击。", { skillPower: 0.06 }, [
      mechanic("dual-thought", "repeatSkill", "afterSkill", "周期性复制伤害术法", { every: [3, 3, 3, 3, 2], power: [0.52, 0.66, 0.72, 0.82, 0.9] })
    ], diamondStackPlan("每第三次术法复制", "复制威力提高", "复制威力继续提高", "复制接近完整威力", "每第二次术法复制")),
    diamond("逆流归元", "afterAttack", "普通攻击会额外推动技能冷却，并恢复法力。", { divineSense: 0.08 }, [
      mechanic("returning-current", "cooldownFlow", "afterAttack", "普通攻击缩短冷却并回流法力", { every: [2, 2, 2, 1, 1], cooldown: [1, 1, 1, 1, 1], mana: [0.04, 0.055, 0.07, 0.08, 0.1] })
    ], diamondStackPlan("每两次攻击推动冷却", "回流法力提高", "回流再次提高", "每次攻击均可推动", "法力回流达到极境")),
    diamond("灵海无涯", "afterSkill", "每次消耗法力都会激起灵潮，对敌人造成额外冲击并返还部分法力。", { maxMana: 0.12 }, [
      mechanic("endless-mana-tide", "manaTide", "afterSkill", "法力消耗转化为灵潮冲击", { power: [0.25, 0.34, 0.42, 0.5, 0.6], refund: [0.04, 0.055, 0.07, 0.085, 0.1] })
    ], diamondStackPlan("法力化为灵潮", "冲击与返还提高", "返还继续提高", "灵潮威力提高", "灵潮达到完整循环"))
  ],
  "守御反击": [
    diamond("不灭金身", "onLethal", "每场战斗首次致命伤保留一线生机，并展开护体金身。", { defense: 0.08 }, [
      mechanic("immortal-golden-body", "lethalWard", "onLethal", "首次致命伤触发护持", { heal: [0, 0.05, 0.08, 0.1, 0.14], reduction: [0.16, 0.2, 0.24, 0.28, 0.34], duration: [1, 1, 2, 2, 2] })
    ], diamondStackPlan("免除一次致命伤", "触发后恢复气血", "金身持续两回合", "减伤提高", "触发后恢复更多气血")),
    diamond("以伤还伤", "onTakeDamage", "储存受到的部分伤害，下一次普通攻击将其化为反击。", { maxHp: 0.08 }, [
      mechanic("stored-retribution", "damageStore", ["onDamageTaken", "afterAttack"], "储存伤害并由下一次普通攻击释放", { ratio: [0.28, 0.36, 0.44, 0.52, 0.62], capHp: [0.18, 0.22, 0.26, 0.3, 0.36] })
    ], diamondStackPlan("储存并释放受伤", "储伤比例提高", "储伤上限提高", "转化率继续提高", "大部分伤害可化为反击")),
    diamond("无隙玄甲", "roundStart", "上一回合未受伤时获得玄甲；玄甲维持时会反击来敌。", { defense: 0.1 }, [
      mechanic("flawless-mystic-armor", "noHitCounter", "roundStart", "无伤回合获得减伤并准备反击", { reduction: [0.14, 0.18, 0.22, 0.26, 0.32], counterPower: [0.18, 0.24, 0.3, 0.36, 0.45] })
    ], diamondStackPlan("无伤回合展开玄甲", "减伤提高", "玄甲附带反击", "反击威力提高", "玄甲防护达到极境")),
    diamond("山河反照", "onTakeDamage", "承受伤害时立即反照一部分伤害，低血时反照效果翻倍。", { maxHp: 0.08 }, [
      mechanic("mountain-river-reflection", "damageReflect", "onDamageTaken", "承伤后立即反照", { ratio: [0.22, 0.28, 0.34, 0.4, 0.48], lowHpMultiplier: [1.5, 1.6, 1.7, 1.85, 2] })
    ], diamondStackPlan("承伤触发反照", "反照比例提高", "低血反照增强", "反照再次提高", "低血时反照翻倍"))
  ],
  "生机转化": [
    diamond("枯木逢春", "onLethal", "首次致命伤触发复苏，恢复气血并强化本场治疗。", { healing: 0.12 }, [
      mechanic("spring-rebirth", "lethalWard", "onLethal", "致命伤触发复苏", { heal: [0.16, 0.22, 0.28, 0.34, 0.42], reduction: [0, 0.08, 0.12, 0.16, 0.2], duration: [0, 1, 1, 2, 2] })
    ], diamondStackPlan("致命时复苏", "复苏恢复提高", "复苏后获得减伤", "减伤持续两回合", "复苏恢复达到四成")),
    diamond("血海生莲", "afterDamage", "造成伤害时恢复气血，溢出治疗会形成护势。", { maxHp: 0.08 }, [
      mechanic("blood-sea-lotus", "lifesteal", "afterDamage", "全部伤害均可转化为治疗", { ratio: [0.08, 0.105, 0.13, 0.155, 0.19], overhealShield: [0.35, 0.45, 0.55, 0.65, 0.8] })
    ], diamondStackPlan("伤害转化治疗", "转化比例提高", "溢疗转为护势", "吸血再次提高", "溢疗护势大幅增强")),
    diamond("生生不息", "roundStart", "每回合恢复气血，连续未受伤时恢复会逐步增强。", { maxHp: 0.1 }, [
      mechanic("endless-vitality", "roundRegen", "roundStart", "每回合恢复并因无伤而成长", { heal: [0.025, 0.032, 0.04, 0.048, 0.06], noHitBonus: [0.5, 0.6, 0.7, 0.85, 1] })
    ], diamondStackPlan("每回合恢复气血", "基础恢复提高", "无伤增幅提高", "恢复再次提高", "无伤时恢复翻倍")),
    diamond("造化逆转", "onHeal", "治疗会同时化为对敌伤害，并强化下一次伤害术法。", { healing: 0.1 }, [
      mechanic("creation-reversal", "healStrike", "afterHeal", "实际治疗转化为伤害", { ratio: [0.42, 0.52, 0.62, 0.72, 0.85], nextSkillPower: [0.08, 0.11, 0.14, 0.18, 0.24] })
    ], diamondStackPlan("治疗同步伤敌", "转化比例提高", "治疗强化下一术法", "伤害再次提高", "大部分治疗均可逆转"))
  ],
  "风险流派": [
    diamond("向死而生", "onLowHp", "低血时伤害术法产生额外回响，但受到的恢复效果降低。", { maxHp: -0.08 }, [
      mechanic("death-defiance", "lowHpEcho", "afterSkill", "低血时术法产生绝境回响", { threshold: [0.32, 0.35, 0.38, 0.42, 0.46], power: [0.45, 0.55, 0.65, 0.75, 0.9], healingPenalty: [0.25, 0.22, 0.18, 0.14, 0.1] })
    ], diamondStackPlan("低血术法回响", "回响提高", "低血线提高", "治疗惩罚降低", "半血附近即可爆发")),
    diamond("燃命真诀", "beforeSkill", "法力不足时可以燃烧气血强行施法，并提高该次术法威力。", { skillPower: 0.06 }, [
      mechanic("life-burning-art", "bloodCast", "beforeSkill", "法力不足时燃血施法", { hpCost: [0.1, 0.09, 0.08, 0.07, 0.06], power: [0.2, 0.27, 0.34, 0.42, 0.52] })
    ], diamondStackPlan("解锁燃血施法", "燃血代价降低", "燃血术法提高", "代价再次降低", "低代价获得强力术法")),
    diamond("百劫成道", "onTakeDamage", "每次受伤都会积累劫意，劫意令后续攻击越来越强。", { defense: 0.06 }, [
      mechanic("hundred-tribulation-path", "adversityGrowth", ["onDamageTaken", "afterAttack", "afterSkill"], "承伤积累本场劫意", { gain: [0.035, 0.045, 0.055, 0.065, 0.08], cap: [5, 5, 6, 6, 7] })
    ], diamondStackPlan("承伤积累劫意", "每层劫意提高", "层数上限提高", "成长再次提高", "可积累七层劫意")),
    diamond("赌命问天", "battleStart", "战斗开始失去部分当前气血，换取整场伤害和风险得分。", { scoreRisk: 0.14 }, [
      mechanic("fate-wager", "battleWager", "battleStart", "开战献祭气血换取伤害", { hpCost: [0.16, 0.15, 0.14, 0.13, 0.12], power: [0.16, 0.21, 0.26, 0.32, 0.4] }, { scoreRisk: [0.04, 0.055, 0.07, 0.085, 0.1] })
    ], diamondStackPlan("献血换取威能", "威能提高", "献血代价降低", "威能再次提高", "以更低代价获得四成增幅"))
  ],
  "同行共鸣": [
    diamond("两仪同心", "onCompanionAssist", "同行支援会强化下一次术法，每第三次支援复制玩家术法。", { companionPower: 0.18 }, [
      mechanic("dual-heart-resonance", "companionSkillEcho", "afterCompanion", "同行支援积累技能共鸣", { every: [3, 3, 3, 2, 2], power: [0.45, 0.55, 0.65, 0.75, 0.88], nextSkillPower: [0.1, 0.13, 0.16, 0.2, 0.25] })
    ], diamondStackPlan("第三次支援复制术法", "复制威力提高", "术法强化提高", "每两次支援复制", "复制接近完整威力")),
    diamond("并肩破阵", "afterSkill", "玩家施放伤害术法后，同行者会按间隔立即追加一次协击。", { companion: 0.14 }, [
      mechanic("joint-array-assault", "companionFollowup", "afterSkill", "术法唤起同行协击", { cooldown: [4, 4, 3, 3, 2], power: [0.4, 0.5, 0.6, 0.72, 0.86] })
    ], diamondStackPlan("术法触发同行协击", "协击威力提高", "协击间隔缩短", "协击再次提高", "两回合即可协击")),
    diamond("替劫护道", "onLethal", "同行者会替玩家承受一次致命伤，随后本场不再支援。", { companion: 0.12 }, [
      mechanic("companion-tribulation-ward", "companionLethalWard", "onLethal", "同行者替玩家承受致命伤", { heal: [0.04, 0.07, 0.1, 0.13, 0.18], shield: [0, 0.06, 0.1, 0.14, 0.2] })
    ], diamondStackPlan("同行替劫一次", "替劫后恢复气血", "替劫后展开护势", "护势提高", "替劫后恢复近两成")),
    diamond("孤星照命", "afterSkill", "独行时召出自身道影，按间隔复制攻击或伤害术法。", { maxHpWithoutCompanion: 0.1 }, [
      mechanic("lone-star-avatar", "soloEcho", ["afterAttack", "afterSkill"], "独行道影复制行动", { every: [4, 4, 3, 3, 2], power: [0.35, 0.44, 0.52, 0.62, 0.75] })
    ], diamondStackPlan("独行道影每四次行动复制", "道影威力提高", "三次行动即可复制", "道影再次提高", "两次行动即可复制"))
  ],
  "五行衍化": [
    diamond("五行轮转", "roundStart", "金木水火土随回合轮转，依次带来伤害、恢复、法力、异常和护持。", { rootResist: 0.25 }, [
      mechanic("five-phase-cycle", "elementCycle", "roundStart", "每回合轮转一种五行效果", { power: [0.12, 0.15, 0.18, 0.22, 0.27], healing: [0.025, 0.032, 0.04, 0.048, 0.06] })
    ], diamondStackPlan("解锁五行轮转", "五行效果提高", "恢复轮转增强", "伤害轮转提高", "五行效果达到极境")),
    diamond("万象熔炉", "onStatus", "持续伤害每积累三层就会被熔炼，引发爆发伤害。", { statusPower: 0.12 }, [
      mechanic("myriad-status-furnace", "statusDetonate", "afterStatus", "异常层数达到门槛时熔炼爆发", { every: [3, 3, 3, 2, 2], power: [0.42, 0.52, 0.62, 0.72, 0.86] })
    ], diamondStackPlan("三层异常引爆", "熔炼伤害提高", "熔炼再次提高", "两层异常即可引爆", "熔炼威力达到极境")),
    diamond("逆克化生", "battleStart", "遭受灵根克制时免除惩罚，并将部分克制转为自身增益。", { rootResist: 1 }, [
      mechanic("counter-cycle-reversal", "rootReversal", "battleStart", "灵根受克时转化为增益", { bonus: [0.06, 0.08, 0.1, 0.12, 0.15] })
    ], diamondStackPlan("免除克制并获得增益", "转化增益提高", "增益达到一成", "转化再次提高", "受克时获得显著增益")),
    diamond("天劫道域", "roundStart", "每第三回合降下一次与主灵根呼应的天劫。", { divineSense: 0.08 }, [
      mechanic("elemental-tribulation-domain", "elementPulse", "roundStart", "周期性降下五行天劫", { every: [3, 3, 3, 2, 2], power: [0.4, 0.5, 0.6, 0.72, 0.86] })
    ], diamondStackPlan("每三回合降下天劫", "天劫威力提高", "天劫再次提高", "每两回合降下天劫", "天劫威力达到极境"))
  ],
  "命数经营": [
    diamond("改命一掷", "onReroll", "每次法则抉择的首次重观免费，并额外获得一次改命收益。", { eventLossResist: 0.12 }, [
      mechanic("fate-changing-reroll", "freeReroll", "onReroll", "每次法则抉择首次重观免费", { insight: [0, 0, 1, 1, 2], bonusOptions: [0, 0, 0, 0, 1] })
    ], diamondStackPlan("每次抉择首次重观免费", "重观后获得额外悟机", "每轮初次重观获得悟机", "悟机收益提高", "重观时额外展示一个选项")),
    diamond("一法化三", "onLawChosen", "选择法则后，从未选法则中取得一份残悟，转化为本轮攻防神识。", { attack: 0.04, defense: 0.04 }, [
      mechanic("one-law-three-insights", "residualChoice", "onLawChosen", "选择法则时吸收未选项残悟", { gain: [0.018, 0.024, 0.03, 0.038, 0.05] })
    ], diamondStackPlan("选择后吸收残悟", "残悟属性提高", "残悟同时滋养神识", "残悟再次提高", "每次选择获得显著成长")),
    diamond("福祸相生", "onEvent", "负面事件会转化为悟机与临时防护，损失越大收益越高。", { eventLossResist: 0.16 }, [
      mechanic("fortune-from-misfortune", "eventCompensation", "afterEvent", "负面事件转化为悟机", { insight: [1, 1, 2, 2, 3], defense: [0.02, 0.03, 0.04, 0.05, 0.07] })
    ], diamondStackPlan("负面事件获得悟机", "同时获得临时防御", "悟机提高至两点", "临时防御提高", "重大损失获得三点悟机")),
    diamond("天命所归", "afterBattle", "每次胜利积累命数，命数强化后续战斗并提高检查点收益。", { postBattleHeal: 0.06, postBattleMana: 0.06 }, [
      mechanic("destined-fortune", "fortune", "afterBattle", "胜利积累可跨战斗的命数", { gain: [1, 1, 1, 2, 2], cap: [5, 6, 7, 8, 10], powerPerStack: [0.012, 0.015, 0.018, 0.022, 0.028] })
    ], diamondStackPlan("胜利积累命数", "命数上限提高", "每层命数强化", "每胜积累两层", "命数上限达到十层"))
  ]
};

const goldActions = {
  "攻伐连锁": ["attackEcho", "openingSurge", "executeStrike", "battleMomentum"],
  "技能循环": ["freeCast", "repeatSkill", "cooldownFlow", "manaTide"],
  "守御反击": ["lethalWard", "damageStore", "noHitCounter", "damageReflect"],
  "生机转化": ["lethalWard", "lifesteal", "roundRegen", "healStrike"],
  "风险流派": ["lowHpEcho", "bloodCast", "adversityGrowth", "battleWager"],
  "同行共鸣": ["companionSkillEcho", "companionFollowup", "companionLethalWard", "soloEcho"],
  "五行衍化": ["elementCycle", "statusDetonate", "rootReversal", "elementPulse"],
  "命数经营": ["freeReroll", "residualChoice", "eventCompensation", "fortune"]
};

const goldEvents = {
  attackEcho: "afterAttack", openingSurge: "afterSkill", executeStrike: ["afterAttack", "afterSkill"], battleMomentum: "afterBattle",
  freeCast: ["beforeSkill", "afterSkill"], cooldownFlow: "afterAttack", repeatSkill: "afterSkill", manaTide: "afterSkill",
  lethalWard: "onLethal", damageStore: ["onDamageTaken", "afterAttack"], noHitCounter: "roundStart", damageReflect: "onDamageTaken",
  lifesteal: "afterDamage", roundRegen: "roundStart", healStrike: "afterHeal", lowHpEcho: "afterSkill", bloodCast: "beforeSkill",
  adversityGrowth: ["onDamageTaken", "afterAttack", "afterSkill"], battleWager: "battleStart", companionSkillEcho: "afterCompanion",
  companionFollowup: "afterSkill", companionLethalWard: "onLethal", soloEcho: ["afterAttack", "afterSkill"], elementCycle: "roundStart",
  statusDetonate: "afterStatus", rootReversal: "battleStart", elementPulse: "roundStart", freeReroll: "onReroll",
  residualChoice: "onLawChosen", eventCompensation: "afterEvent", fortune: "afterBattle"
};

function goldParams(action, strong) {
  const high = strong ? 1 : 0;
  const params = {
    attackEcho: { every: [4, 4, 3, 3, 3], power: [0.24 + high * 0.05, 0.3 + high * 0.05, 0.36 + high * 0.05, 0.42 + high * 0.05, 0.5 + high * 0.05] },
    openingSurge: { power: [0.25 + high * 0.05, 0.31 + high * 0.05, 0.37 + high * 0.05, 0.43 + high * 0.05, 0.5 + high * 0.05], targetAbove: [0.8, 0.75, 0.7, 0.65, 0.6], once: true },
    executeStrike: { threshold: [0.22, 0.24, 0.26, 0.28, 0.3], power: [0.18 + high * 0.04, 0.23 + high * 0.04, 0.28 + high * 0.04, 0.34 + high * 0.04, 0.4 + high * 0.04], oncePerRound: true },
    battleMomentum: { gain: [0.018 + high * 0.004, 0.023 + high * 0.004, 0.028 + high * 0.004, 0.033 + high * 0.004, 0.04 + high * 0.004], cap: [0.1, 0.12, 0.14, 0.16, 0.2] },
    freeCast: { every: [4, 4, 4, 3, 3], echoEvery: [0, 0, 0, 0, 0], echoPower: [0, 0, 0, 0, 0] },
    cooldownFlow: { every: [3, 3, 2, 2, 2], cooldown: [1, 1, 1, 1, 1], mana: [0.025, 0.032, 0.04, 0.048, 0.06] },
    repeatSkill: { every: [4, 4, 4, 3, 3], power: [0.3 + high * 0.05, 0.37 + high * 0.05, 0.44 + high * 0.05, 0.52 + high * 0.05, 0.6 + high * 0.05] },
    manaTide: { power: [0.14 + high * 0.03, 0.18 + high * 0.03, 0.22 + high * 0.03, 0.27 + high * 0.03, 0.33 + high * 0.03], refund: [0.025, 0.032, 0.04, 0.048, 0.06] },
    lethalWard: { heal: [0.04 + high * 0.03, 0.06 + high * 0.03, 0.08 + high * 0.03, 0.1 + high * 0.03, 0.13 + high * 0.03], reduction: [0, 0.06, 0.09, 0.12, 0.16], duration: [0, 1, 1, 1, 2] },
    damageStore: { ratio: [0.16 + high * 0.03, 0.21 + high * 0.03, 0.26 + high * 0.03, 0.31 + high * 0.03, 0.38 + high * 0.03], capHp: [0.1, 0.12, 0.14, 0.16, 0.2] },
    noHitCounter: { reduction: [0.08 + high * 0.02, 0.11 + high * 0.02, 0.14 + high * 0.02, 0.17 + high * 0.02, 0.21 + high * 0.02], counterPower: [0, 0.12, 0.16, 0.2, 0.26] },
    damageReflect: { ratio: [0.14 + high * 0.03, 0.18 + high * 0.03, 0.22 + high * 0.03, 0.27 + high * 0.03, 0.32 + high * 0.03], lowHpMultiplier: [1.2, 1.25, 1.3, 1.4, 1.5] },
    lifesteal: { ratio: [0.045 + high * 0.015, 0.06 + high * 0.015, 0.075 + high * 0.015, 0.09 + high * 0.015, 0.11 + high * 0.015], overhealShield: [0, 0.2, 0.3, 0.4, 0.5] },
    roundRegen: { heal: [0.014 + high * 0.004, 0.018 + high * 0.004, 0.023 + high * 0.004, 0.028 + high * 0.004, 0.035 + high * 0.004], noHitBonus: [0.3, 0.4, 0.5, 0.6, 0.75] },
    healStrike: { ratio: [0.24 + high * 0.05, 0.3 + high * 0.05, 0.36 + high * 0.05, 0.43 + high * 0.05, 0.5 + high * 0.05], nextSkillPower: [0, 0.05, 0.07, 0.09, 0.12] },
    lowHpEcho: { threshold: [0.25, 0.28, 0.3, 0.32, 0.35], power: [0.24 + high * 0.05, 0.3 + high * 0.05, 0.36 + high * 0.05, 0.43 + high * 0.05, 0.52 + high * 0.05], healingPenalty: [0.2, 0.18, 0.16, 0.14, 0.12] },
    bloodCast: { hpCost: [0.13, 0.12, 0.11, 0.1, 0.09], power: [0.12 + high * 0.04, 0.17 + high * 0.04, 0.22 + high * 0.04, 0.28 + high * 0.04, 0.35 + high * 0.04] },
    adversityGrowth: { gain: [0.02 + high * 0.004, 0.026 + high * 0.004, 0.032 + high * 0.004, 0.038 + high * 0.004, 0.046 + high * 0.004], cap: [4, 4, 5, 5, 6] },
    battleWager: { hpCost: [0.12, 0.115, 0.11, 0.105, 0.1], power: [0.09 + high * 0.03, 0.12 + high * 0.03, 0.15 + high * 0.03, 0.19 + high * 0.03, 0.24 + high * 0.03] },
    companionSkillEcho: { every: [4, 4, 3, 3, 3], power: [0.28 + high * 0.05, 0.34 + high * 0.05, 0.4 + high * 0.05, 0.47 + high * 0.05, 0.55 + high * 0.05], nextSkillPower: [0.06, 0.08, 0.1, 0.12, 0.15] },
    companionFollowup: { cooldown: [5, 5, 4, 4, 3], power: [0.25 + high * 0.05, 0.32 + high * 0.05, 0.39 + high * 0.05, 0.47 + high * 0.05, 0.56 + high * 0.05] },
    companionLethalWard: { heal: [0.02 + high * 0.02, 0.04 + high * 0.02, 0.06 + high * 0.02, 0.08 + high * 0.02, 0.11 + high * 0.02], shield: [0, 0.04, 0.06, 0.08, 0.12] },
    soloEcho: { every: [5, 5, 4, 4, 3], power: [0.22 + high * 0.04, 0.28 + high * 0.04, 0.34 + high * 0.04, 0.41 + high * 0.04, 0.5 + high * 0.04] },
    elementCycle: { power: [0.07 + high * 0.02, 0.09 + high * 0.02, 0.11 + high * 0.02, 0.14 + high * 0.02, 0.18 + high * 0.02], healing: [0.012, 0.016, 0.02, 0.025, 0.032] },
    statusDetonate: { every: [4, 4, 3, 3, 3], power: [0.25 + high * 0.05, 0.31 + high * 0.05, 0.37 + high * 0.05, 0.44 + high * 0.05, 0.52 + high * 0.05] },
    rootReversal: { bonus: [0.025 + high * 0.01, 0.035 + high * 0.01, 0.045 + high * 0.01, 0.055 + high * 0.01, 0.07 + high * 0.01] },
    elementPulse: { every: [4, 4, 3, 3, 3], power: [0.24 + high * 0.05, 0.3 + high * 0.05, 0.36 + high * 0.05, 0.43 + high * 0.05, 0.52 + high * 0.05] },
    freeReroll: { insight: [0, 0, 0, 1, 1], bonusOptions: [0, 0, 0, 0, 0] },
    residualChoice: { gain: [0.01 + high * 0.003, 0.014 + high * 0.003, 0.018 + high * 0.003, 0.023 + high * 0.003, 0.03 + high * 0.003] },
    eventCompensation: { insight: [1, 1, 1, 2, 2], defense: [0, 0.015, 0.02, 0.03, 0.04] },
    fortune: { gain: [1, 1, 1, 1, 2], cap: [3, 4, 5, 6, 7], powerPerStack: [0.008 + high * 0.002, 0.01 + high * 0.002, 0.012 + high * 0.002, 0.014 + high * 0.002, 0.017 + high * 0.002] }
  };
  return params[action] || {};
}

const goldActionLabels = {
  attackEcho: "连击后追加余波", openingSurge: "首次术法追加攻势", executeStrike: "低血目标触发追击", battleMomentum: "胜利积累本轮战意",
  freeCast: "周期性免除法力消耗", cooldownFlow: "普通攻击推动技能周天", repeatSkill: "周期性复制伤害术法", manaTide: "法力消耗化为灵潮",
  lethalWard: "致命伤触发一次护持", damageStore: "储存受伤并反击", noHitCounter: "无伤回合获得玄甲", damageReflect: "承伤后立即反照",
  lifesteal: "伤害转化为治疗", roundRegen: "每回合持续恢复", healStrike: "治疗同步伤敌", lowHpEcho: "低血术法产生回响",
  bloodCast: "法力不足时燃血施法", adversityGrowth: "承伤积累本场成长", battleWager: "开战献血换取威能", companionSkillEcho: "同行支援积累技能共鸣",
  companionFollowup: "术法触发同行协击", companionLethalWard: "同行替劫一次", soloEcho: "独行道影复制行动", elementCycle: "五行随回合轮转",
  statusDetonate: "异常叠层后熔炼爆发", rootReversal: "削弱克制并转化增益", elementPulse: "周期性降下天劫", freeReroll: "每次抉择首次重观免费",
  residualChoice: "选择后吸收未选残悟", eventCompensation: "负面事件转化悟机", fortune: "胜利积累命数"
};

function goldMechanic(school, branchIndex, variant) {
  const action = goldActions[school][branchIndex];
  return mechanic(
    `gold-${schoolIds[school]}-${branchIndex + 1}-${variant + 1}`,
    action,
    goldEvents[action],
    goldActionLabels[action],
    goldParams(action, variant === 1)
  );
}

function genericStackPlan(rarity, summary = "核心效果") {
  if (rarity === "silver") {
    return ["获得基础效果", "效果提升至 160%", "效果提升至 200%", "效果提升至 225%", "效果提升至 240%"]
      .map((text, index) => ({ stack: index + 1, text }));
  }
  return [
    `解锁：${summary}`,
    "核心效果增强",
    "触发效率或作用范围提高",
    "核心数值再次增强",
    "构筑效果达到圆满"
  ].map((text, index) => ({ stack: index + 1, text }));
}

function resolveValue(value, stack) {
  if (!Array.isArray(value)) return value;
  return value[Math.max(0, Math.min(value.length - 1, stack - 1))];
}

export function resolveLawMechanics(law, stack = 1) {
  const safeStack = Math.max(1, Math.min(5, Math.floor(Number(stack) || 1)));
  return (law?.mechanics || []).map((entry) => ({
    ...entry,
    params: Object.fromEntries(Object.entries(entry.params || {}).map(([key, value]) => [key, resolveValue(value, safeStack)])),
    buffs: Object.fromEntries(Object.entries(entry.buffs || {}).map(([key, value]) => [key, resolveValue(value, safeStack)])),
    stack: safeStack
  }));
}

export function applyDaoTrialLawDesign(baseLaws) {
  const rarityCounts = {};
  return baseLaws.map((law) => {
    const key = `${law.school}|${law.rarity}`;
    const rarityIndex = rarityCounts[key] || 0;
    rarityCounts[key] = rarityIndex + 1;
    const branches = daoTrialLawBranches[law.school] || ["问道"];
    const branchIndex = rarityIndex % branches.length;
    const branch = branches[branchIndex];
    const safeEffects = { ...(law.effects || {}) };
    if (law.rarity !== "diamond" && safeEffects.lethalGuard) {
      delete safeEffects.lethalGuard;
      safeEffects.maxHp = Math.max(Number(safeEffects.maxHp) || 0, law.rarity === "gold" ? 0.1 : 0.07);
    }
    const base = { ...law, effects: safeEffects, branch, mechanics: [...(law.mechanics || [])], designRole: law.rarity === "silver" ? "基础组件" : "构筑核心" };

    if (law.rarity === "diamond") {
      const definition = diamondDefinitions[law.school]?.[branchIndex];
      return { ...base, ...definition, branch, tags: [...new Set([...(law.tags || []), schoolIds[law.school], "signature"])] };
    }

    if (law.rarity === "gold") {
      const variant = Math.floor(rarityIndex / branches.length);
      const gold = goldMechanic(law.school, branchIndex, variant);
      return {
        ...base,
        mechanics: [gold],
        designRole: "构筑核心",
        text: `${law.text.replace(/。$/, "")}；${gold.summary}。`,
        stackPlan: genericStackPlan("gold", gold.summary),
        tags: [...new Set([...(law.tags || []), schoolIds[law.school], "engine"])]
      };
    }

    const branchOccurrence = Math.floor(rarityIndex / branches.length);
    const generated = law.id.startsWith("expanded-law-");
    return {
      ...base,
      name: generated ? `${branch}${silverSuffixes[branchOccurrence]}` : law.name,
      stackPlan: genericStackPlan("silver"),
      tags: [...new Set([...(law.tags || []), schoolIds[law.school], "foundation"])]
    };
  });
}

export const daoTrialDiamondMechanicTypes = Object.values(diamondDefinitions)
  .flatMap((entries) => entries.flatMap((entry) => entry.mechanics.map((item) => item.type)));
