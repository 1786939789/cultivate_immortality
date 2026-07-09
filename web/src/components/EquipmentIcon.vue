<template>
  <span class="equipment-icon" :class="[`tier-${tier}`, `slot-${slot}`]" aria-hidden="true">
    <img v-if="!useFallback" :src="iconUrl" :alt="alt" loading="lazy" @error="useFallback = true">
    <span v-else class="equipment-icon-fallback">{{ fallbackText }}</span>
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

const fallbackBySlot = {
  weapon: "剑",
  armor: "甲",
  head: "冠",
  legs: "履",
  trinket: "佩"
};

const useFallback = ref(false);
const iconUrl = computed(() => `/assets/equipment-icons/items/${props.id}.webp?v=6`);
const alt = computed(() => `${props.name}图标`);
const fallbackText = computed(() => fallbackBySlot[props.slot] || fallbackBySlot.trinket);

watch(() => props.id, () => {
  useFallback.value = false;
});
</script>
