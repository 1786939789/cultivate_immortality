<template>
  <span class="equipment-icon" :class="[`tier-${tier}`, `slot-${slot}`]" aria-hidden="true">
    <img :src="iconUrl" :alt="alt" loading="lazy" @error="useFallback = true">
  </span>
</template>

<script setup>
import { computed, ref, watch } from "vue";

const props = defineProps({
  id: { type: String, default: "" },
  name: { type: String, default: "装备" },
  slot: { type: String, default: "trinket" },
  tier: { type: [Number, String], default: 1 }
});

const iconMap = {
  green_bamboo_cloud_sword: "bamboo",
  gold_thunder_bamboo_sword: "lightning-sword",
  blood_shadow_blade: "curved-dagger",
  mystic_fire_flying_sword: "flaming-trident",
  evilward_thunder_edge: "sword-brandish",
  black_gold_soft_armor: "leather-armor",
  black_turtle_spirit_armor: "turtle-shell",
  gold_silkworm_robe: "robe",
  azure_heart_guard: "breastplate",
  sky_crystal_treasure_armor: "crystal-shine",
  soul_gathering_crown: "crown",
  mystic_jade_crown: "jeweled-chalice",
  azure_void_spirit_crown: "laurel-crown",
  star_pattern_browguard: "star-swirl",
  taiyin_treasure_crown: "queen-crown",
  cloud_treading_boots: "boots",
  wind_chasing_boots: "wingfoot",
  azure_shadow_escape_boots: "running-shoe",
  mystic_water_steps: "walking-boot",
  wind_thunder_cloud_boots: "sonic-shoes",
  soul_nourishing_jade: "emerald",
  soul_focus_pearl: "pearl-necklace",
  evilward_jade_pendant: "necklace",
  soul_stabilizing_ring: "ring",
  void_heaven_fragment_token: "rune-stone"
};

const fallbackBySlot = {
  weapon: "crossed-swords",
  armor: "armor-vest",
  head: "crown",
  legs: "boots",
  trinket: "gems"
};

const useFallback = ref(false);
const iconName = computed(() => useFallback.value
  ? fallbackBySlot[props.slot] || fallbackBySlot.trinket
  : iconMap[props.id] || fallbackBySlot[props.slot] || fallbackBySlot.trinket);
const iconUrl = computed(() => `https://api.iconify.design/game-icons:${iconName.value}.svg?color=currentColor`);
const alt = computed(() => `${props.name}图标`);

watch(() => [props.id, props.slot], () => {
  useFallback.value = false;
});
</script>
