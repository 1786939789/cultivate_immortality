export const equipmentSlots = [
  { id: "weapon", name: "武器", stat: "attack", statName: "攻击" },
  { id: "armor", name: "胸甲", stat: "defense", statName: "防御" },
  { id: "head", name: "头部", stat: "maxHp", statName: "血量" },
  { id: "legs", name: "腿部", stat: "maxMana", statName: "法力" },
  { id: "trinket", name: "饰品", stat: "divineSense", statName: "神识" }
];

export const equipmentTiers = [
  { id: 1, name: "凡器", min: 0.03, max: 0.05, stealChance: 0.012 },
  { id: 2, name: "法器", min: 0.06, max: 0.09, stealChance: 0.01 },
  { id: 3, name: "灵器", min: 0.1, max: 0.14, stealChance: 0.008 },
  { id: 4, name: "古宝", min: 0.15, max: 0.2, stealChance: 0.005 },
  { id: 5, name: "法宝", min: 0.21, max: 0.28, stealChance: 0.003 },
  { id: 6, name: "通天灵宝", min: 0.3, max: 0.4, stealChance: 0.0015 }
];

export const equipmentCatalog = [
  { id: "green_bamboo_cloud_sword", name: "青竹蜂云剑", slot: "weapon", tier: 4, bonus: 0.18 },
  { id: "gold_thunder_bamboo_sword", name: "金雷竹剑", slot: "weapon", tier: 5, bonus: 0.25 },
  { id: "blood_shadow_blade", name: "血影刃", slot: "weapon", tier: 3, bonus: 0.13 },
  { id: "mystic_fire_flying_sword", name: "玄火飞剑", slot: "weapon", tier: 2, bonus: 0.08 },
  { id: "evilward_thunder_edge", name: "辟邪雷刃", slot: "weapon", tier: 6, bonus: 0.36 },
  { id: "black_gold_soft_armor", name: "乌金软甲", slot: "armor", tier: 2, bonus: 0.08 },
  { id: "black_turtle_spirit_armor", name: "玄龟灵甲", slot: "armor", tier: 4, bonus: 0.17 },
  { id: "gold_silkworm_robe", name: "金蚕法衣", slot: "armor", tier: 3, bonus: 0.12 },
  { id: "azure_heart_guard", name: "青元护心甲", slot: "armor", tier: 5, bonus: 0.24 },
  { id: "sky_crystal_treasure_armor", name: "天晶宝甲", slot: "armor", tier: 6, bonus: 0.34 },
  { id: "soul_gathering_crown", name: "凝神冠", slot: "head", tier: 2, bonus: 0.07 },
  { id: "mystic_jade_crown", name: "玄玉发冠", slot: "head", tier: 3, bonus: 0.11 },
  { id: "azure_void_spirit_crown", name: "青冥灵冠", slot: "head", tier: 4, bonus: 0.18 },
  { id: "star_pattern_browguard", name: "星纹护额", slot: "head", tier: 1, bonus: 0.05 },
  { id: "taiyin_treasure_crown", name: "太阴宝冠", slot: "head", tier: 5, bonus: 0.23 },
  { id: "cloud_treading_boots", name: "踏云履", slot: "legs", tier: 1, bonus: 0.04 },
  { id: "wind_chasing_boots", name: "追风靴", slot: "legs", tier: 2, bonus: 0.08 },
  { id: "azure_shadow_escape_boots", name: "青影遁靴", slot: "legs", tier: 3, bonus: 0.12 },
  { id: "mystic_water_steps", name: "玄水法履", slot: "legs", tier: 4, bonus: 0.16 },
  { id: "wind_thunder_cloud_boots", name: "风雷云履", slot: "legs", tier: 5, bonus: 0.24 },
  { id: "soul_nourishing_jade", name: "养魂佩", slot: "trinket", tier: 2, bonus: 0.08 },
  { id: "soul_focus_pearl", name: "凝神珠", slot: "trinket", tier: 3, bonus: 0.13 },
  { id: "evilward_jade_pendant", name: "辟邪玉佩", slot: "trinket", tier: 4, bonus: 0.17 },
  { id: "soul_stabilizing_ring", name: "定魂环", slot: "trinket", tier: 5, bonus: 0.22 },
  { id: "void_heaven_fragment_token", name: "虚天残令", slot: "trinket", tier: 6, bonus: 0.33 }
];
