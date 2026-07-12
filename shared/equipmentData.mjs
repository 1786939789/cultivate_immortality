export const equipmentSlots = [
  { id: "weapon", name: "武器", stat: "attack", statName: "攻击" },
  { id: "armor", name: "胸甲", stat: "defense", statName: "防御" },
  { id: "head", name: "头部", stat: "maxHp", statName: "血量" },
  { id: "legs", name: "腿部", stat: "maxMana", statName: "法力" },
  { id: "trinket", name: "饰品", stat: "divineSense", statName: "神识" }
];

export const equipmentTiers = [
  { id: 1, name: "凡器", min: 0.03, max: 0.05, stealChance: 0.004 },
  { id: 2, name: "法器", min: 0.06, max: 0.09, stealChance: 0.003 },
  { id: 3, name: "灵器", min: 0.1, max: 0.14, stealChance: 0.002 },
  { id: 4, name: "古宝", min: 0.15, max: 0.2, stealChance: 0.0015 },
  { id: 5, name: "法宝", min: 0.21, max: 0.28, stealChance: 0.001 },
  { id: 6, name: "通天灵宝", min: 0.3, max: 0.4, stealChance: 0.0005 }
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
  { id: "void_heaven_fragment_token", name: "虚天残令", slot: "trinket", tier: 6, bonus: 0.33 },

  { id: "yellow_maple_green_edge_sword", name: "青锋木剑", slot: "weapon", tier: 1, bonus: 0.04, setId: "yellow_maple_initiate", setName: "黄枫谷入门套" },
  { id: "yellow_maple_cloth_armor", name: "黄枫布甲", slot: "armor", tier: 1, bonus: 0.04, setId: "yellow_maple_initiate", setName: "黄枫谷入门套" },
  { id: "yellow_maple_initiate_crown", name: "入门束冠", slot: "head", tier: 1, bonus: 0.03, setId: "yellow_maple_initiate", setName: "黄枫谷入门套" },
  { id: "yellow_maple_light_grass_boots", name: "轻身草履", slot: "legs", tier: 1, bonus: 0.04, setId: "yellow_maple_initiate", setName: "黄枫谷入门套" },
  { id: "yellow_maple_meditation_wood_talisman", name: "静心木符", slot: "trinket", tier: 1, bonus: 0.03, setId: "yellow_maple_initiate", setName: "黄枫谷入门套" },

  { id: "blood_trial_red_vine_blade", name: "赤藤短刃", slot: "weapon", tier: 1, bonus: 0.05, setId: "blood_trial_relic", setName: "血色禁地遗物套" },
  { id: "blood_trial_rotten_leaf_guard", name: "腐叶护衣", slot: "armor", tier: 1, bonus: 0.04, setId: "blood_trial_relic", setName: "血色禁地遗物套" },
  { id: "blood_trial_vine_headband", name: "血藤头箍", slot: "head", tier: 1, bonus: 0.04, setId: "blood_trial_relic", setName: "血色禁地遗物套" },
  { id: "blood_trial_thorn_boots", name: "荆棘行履", slot: "legs", tier: 1, bonus: 0.05, setId: "blood_trial_relic", setName: "血色禁地遗物套" },
  { id: "blood_trial_broken_tablet", name: "禁地残牌", slot: "trinket", tier: 1, bonus: 0.05, setId: "blood_trial_relic", setName: "血色禁地遗物套" },

  { id: "moon_covering_moonlight_sword", name: "月华飞剑", slot: "weapon", tier: 2, bonus: 0.08, setId: "moon_covering_lunar", setName: "掩月宗月华套" },
  { id: "moon_covering_silver_robe", name: "银月法衣", slot: "armor", tier: 2, bonus: 0.08, setId: "moon_covering_lunar", setName: "掩月宗月华套" },
  { id: "moon_covering_jade_crown", name: "素月玉冠", slot: "head", tier: 2, bonus: 0.07, setId: "moon_covering_lunar", setName: "掩月宗月华套" },
  { id: "moon_covering_soft_boots", name: "踏月软靴", slot: "legs", tier: 2, bonus: 0.08, setId: "moon_covering_lunar", setName: "掩月宗月华套" },
  { id: "moon_covering_lunar_ring", name: "月魄环", slot: "trinket", tier: 2, bonus: 0.09, setId: "moon_covering_lunar", setName: "掩月宗月华套" },

  { id: "ghost_spirit_yin_bone_blade", name: "阴煞骨刃", slot: "weapon", tier: 2, bonus: 0.09, setId: "ghost_spirit_yinsha", setName: "鬼灵门阴煞套" },
  { id: "ghost_spirit_black_armor", name: "鬼纹黑甲", slot: "armor", tier: 2, bonus: 0.08, setId: "ghost_spirit_yinsha", setName: "鬼灵门阴煞套" },
  { id: "ghost_spirit_soul_banner_crown", name: "魂幡冠", slot: "head", tier: 2, bonus: 0.07, setId: "ghost_spirit_yinsha", setName: "鬼灵门阴煞套" },
  { id: "ghost_spirit_shadow_boots", name: "影遁靴", slot: "legs", tier: 2, bonus: 0.08, setId: "ghost_spirit_yinsha", setName: "鬼灵门阴煞套" },
  { id: "ghost_spirit_yin_bell", name: "聚阴铃", slot: "trinket", tier: 2, bonus: 0.09, setId: "ghost_spirit_yinsha", setName: "鬼灵门阴煞套" },

  { id: "star_sea_tide_hunting_fork", name: "碧潮猎叉", slot: "weapon", tier: 2, bonus: 0.08, setId: "star_sea_hunter", setName: "乱星海猎妖套" },
  { id: "star_sea_scale_soft_armor", name: "海鳞软甲", slot: "armor", tier: 2, bonus: 0.09, setId: "star_sea_hunter", setName: "乱星海猎妖套" },
  { id: "star_sea_wave_crown", name: "镇浪冠", slot: "head", tier: 2, bonus: 0.07, setId: "star_sea_hunter", setName: "乱星海猎妖套" },
  { id: "star_sea_wave_splitting_boots", name: "分波靴", slot: "legs", tier: 2, bonus: 0.08, setId: "star_sea_hunter", setName: "乱星海猎妖套" },
  { id: "star_sea_demon_core_pendant", name: "妖丹坠", slot: "trinket", tier: 2, bonus: 0.09, setId: "star_sea_hunter", setName: "乱星海猎妖套" },

  { id: "extreme_yin_mystic_bone_sword", name: "玄骨魔剑", slot: "weapon", tier: 3, bonus: 0.13, setId: "extreme_yin_mystic_bone", setName: "极阴岛玄骨套" },
  { id: "extreme_yin_white_bone_armor", name: "白骨灵甲", slot: "armor", tier: 3, bonus: 0.12, setId: "extreme_yin_mystic_bone", setName: "极阴岛玄骨套" },
  { id: "extreme_yin_flame_bone_crown", name: "阴火骨冠", slot: "head", tier: 3, bonus: 0.11, setId: "extreme_yin_mystic_bone", setName: "极阴岛玄骨套" },
  { id: "extreme_yin_ghost_mist_boots", name: "鬼雾履", slot: "legs", tier: 3, bonus: 0.12, setId: "extreme_yin_mystic_bone", setName: "极阴岛玄骨套" },
  { id: "extreme_yin_soul_bone_ring", name: "玄魂骨环", slot: "trinket", tier: 3, bonus: 0.14, setId: "extreme_yin_mystic_bone", setName: "极阴岛玄骨套" },

  { id: "star_palace_sea_suppressing_sword", name: "星辉镇海剑", slot: "weapon", tier: 3, bonus: 0.13, setId: "star_palace_sea_guard", setName: "星宫镇海套" },
  { id: "star_palace_silver_tide_armor", name: "银潮星甲", slot: "armor", tier: 3, bonus: 0.12, setId: "star_palace_sea_guard", setName: "星宫镇海套" },
  { id: "star_palace_observing_crown", name: "观星冠", slot: "head", tier: 3, bonus: 0.11, setId: "star_palace_sea_guard", setName: "星宫镇海套" },
  { id: "star_palace_wave_star_boots", name: "踏澜星履", slot: "legs", tier: 3, bonus: 0.12, setId: "star_palace_sea_guard", setName: "星宫镇海套" },
  { id: "star_palace_sea_pearl", name: "定海星珠", slot: "trinket", tier: 3, bonus: 0.14, setId: "star_palace_sea_guard", setName: "星宫镇海套" },

  { id: "great_jin_taiyi_light_sword", name: "太一玄光剑", slot: "weapon", tier: 3, bonus: 0.14, setId: "great_jin_taiyi", setName: "大晋太一套" },
  { id: "great_jin_clear_void_robe", name: "清虚道袍", slot: "armor", tier: 3, bonus: 0.12, setId: "great_jin_taiyi", setName: "大晋太一套" },
  { id: "great_jin_taizhen_crown", name: "太真法冠", slot: "head", tier: 3, bonus: 0.11, setId: "great_jin_taiyi", setName: "大晋太一套" },
  { id: "great_jin_cloud_crane_boots", name: "云鹤履", slot: "legs", tier: 3, bonus: 0.12, setId: "great_jin_taiyi", setName: "大晋太一套" },
  { id: "great_jin_xuanyi_jade_talisman", name: "玄一玉符", slot: "trinket", tier: 3, bonus: 0.13, setId: "great_jin_taiyi", setName: "大晋太一套" },

  { id: "void_hall_broken_blade", name: "虚天断刃", slot: "weapon", tier: 4, bonus: 0.18, setId: "void_hall_relic", setName: "虚天殿残宝套" },
  { id: "void_hall_cold_jade_armor", name: "寒玉宝甲", slot: "armor", tier: 4, bonus: 0.17, setId: "void_hall_relic", setName: "虚天殿残宝套" },
  { id: "void_hall_void_spirit_crown", name: "虚灵冠", slot: "head", tier: 4, bonus: 0.16, setId: "void_hall_relic", setName: "虚天殿残宝套" },
  { id: "void_hall_ice_soul_boots", name: "冰魄遁履", slot: "legs", tier: 4, bonus: 0.17, setId: "void_hall_relic", setName: "虚天殿残宝套" },
  { id: "void_hall_sky_mending_token", name: "补天残令", slot: "trinket", tier: 4, bonus: 0.2, setId: "void_hall_relic", setName: "虚天殿残宝套" },

  { id: "little_polar_mystic_ice_sword", name: "玄冰寒魄剑", slot: "weapon", tier: 4, bonus: 0.19, setId: "little_polar_mystic_ice", setName: "小极宫玄冰套" },
  { id: "little_polar_ice_crystal_armor", name: "冰魄晶甲", slot: "armor", tier: 4, bonus: 0.18, setId: "little_polar_mystic_ice", setName: "小极宫玄冰套" },
  { id: "little_polar_hanli_crown", name: "寒骊冠", slot: "head", tier: 4, bonus: 0.16, setId: "little_polar_mystic_ice", setName: "小极宫玄冰套" },
  { id: "little_polar_snow_escape_boots", name: "雪遁靴", slot: "legs", tier: 4, bonus: 0.17, setId: "little_polar_mystic_ice", setName: "小极宫玄冰套" },
  { id: "little_polar_ancient_jade_pendant", name: "万年玄玉佩", slot: "trinket", tier: 4, bonus: 0.2, setId: "little_polar_mystic_ice", setName: "小极宫玄冰套" },

  { id: "fallen_demon_ancient_halberd", name: "古修裂魂戟", slot: "weapon", tier: 4, bonus: 0.2, setId: "fallen_demon_ancient_cultivator", setName: "坠魔谷古修套" },
  { id: "fallen_demon_magic_pattern_armor", name: "魔纹古甲", slot: "armor", tier: 4, bonus: 0.18, setId: "fallen_demon_ancient_cultivator", setName: "坠魔谷古修套" },
  { id: "fallen_demon_sealing_crown", name: "封灵古冠", slot: "head", tier: 4, bonus: 0.16, setId: "fallen_demon_ancient_cultivator", setName: "坠魔谷古修套" },
  { id: "fallen_demon_earth_escape_boots", name: "遁地古履", slot: "legs", tier: 4, bonus: 0.17, setId: "fallen_demon_ancient_cultivator", setName: "坠魔谷古修套" },
  { id: "fallen_demon_suppression_fragment", name: "镇魔残璧", slot: "trinket", tier: 4, bonus: 0.19, setId: "fallen_demon_ancient_cultivator", setName: "坠魔谷古修套" },

  { id: "sky_abyss_spirit_slashing_sword", name: "天渊斩灵剑", slot: "weapon", tier: 5, bonus: 0.26, setId: "sky_abyss_guard", setName: "天渊城镇守套" },
  { id: "sky_abyss_city_armor", name: "镇城玄甲", slot: "armor", tier: 5, bonus: 0.25, setId: "sky_abyss_guard", setName: "天渊城镇守套" },
  { id: "sky_abyss_watch_crown", name: "望阙战冠", slot: "head", tier: 5, bonus: 0.23, setId: "sky_abyss_guard", setName: "天渊城镇守套" },
  { id: "sky_abyss_patrol_boots", name: "巡天云靴", slot: "legs", tier: 5, bonus: 0.24, setId: "sky_abyss_guard", setName: "天渊城镇守套" },
  { id: "sky_abyss_command_talisman", name: "天渊令符", slot: "trinket", tier: 5, bonus: 0.27, setId: "sky_abyss_guard", setName: "天渊城镇守套" },

  { id: "flying_spirit_golden_feather_blade", name: "金羽裂空刃", slot: "weapon", tier: 5, bonus: 0.27, setId: "flying_spirit_sacred_bird", setName: "飞灵族圣禽套" },
  { id: "flying_spirit_feather_robe", name: "圣禽羽衣", slot: "armor", tier: 5, bonus: 0.24, setId: "flying_spirit_sacred_bird", setName: "飞灵族圣禽套" },
  { id: "flying_spirit_feather_crown", name: "鸣灵羽冠", slot: "head", tier: 5, bonus: 0.23, setId: "flying_spirit_sacred_bird", setName: "飞灵族圣禽套" },
  { id: "flying_spirit_sky_breaking_boots", name: "破空羽履", slot: "legs", tier: 5, bonus: 0.25, setId: "flying_spirit_sacred_bird", setName: "飞灵族圣禽套" },
  { id: "flying_spirit_true_feather_pendant", name: "真羽魂坠", slot: "trinket", tier: 5, bonus: 0.28, setId: "flying_spirit_sacred_bird", setName: "飞灵族圣禽套" },

  { id: "demon_gold_mountain_breaking_axe", name: "魔金破岳斧", slot: "weapon", tier: 6, bonus: 0.36, setId: "demon_gold_ancient", setName: "魔金山脉荒古套" },
  { id: "demon_gold_ancient_armor", name: "荒古魔金甲", slot: "armor", tier: 6, bonus: 0.35, setId: "demon_gold_ancient", setName: "魔金山脉荒古套" },
  { id: "demon_gold_obsidian_crown", name: "黑曜战冠", slot: "head", tier: 6, bonus: 0.32, setId: "demon_gold_ancient", setName: "魔金山脉荒古套" },
  { id: "demon_gold_mountain_treading_boots", name: "踏岳重履", slot: "legs", tier: 6, bonus: 0.33, setId: "demon_gold_ancient", setName: "魔金山脉荒古套" },
  { id: "demon_gold_source_core", name: "魔金源核", slot: "trinket", tier: 6, bonus: 0.37, setId: "demon_gold_ancient", setName: "魔金山脉荒古套" },

  { id: "wide_cold_moon_wheel", name: "广寒月轮", slot: "weapon", tier: 6, bonus: 0.38, setId: "wide_cold_immortal_relic", setName: "广寒界仙遗套" },
  { id: "wide_cold_taiyin_robe", name: "太阴仙衣", slot: "armor", tier: 6, bonus: 0.36, setId: "wide_cold_immortal_relic", setName: "广寒界仙遗套" },
  { id: "wide_cold_moon_crown", name: "月华仙冠", slot: "head", tier: 6, bonus: 0.34, setId: "wide_cold_immortal_relic", setName: "广寒界仙遗套" },
  { id: "wide_cold_frost_boots", name: "凌霜仙履", slot: "legs", tier: 6, bonus: 0.35, setId: "wide_cold_immortal_relic", setName: "广寒界仙遗套" },
  { id: "wide_cold_jade_bi", name: "广寒玉璧", slot: "trinket", tier: 6, bonus: 0.39, setId: "wide_cold_immortal_relic", setName: "广寒界仙遗套" }
];
