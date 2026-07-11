<template>
  <span class="character-portrait" :class="[size, rankClass, { npc: !person?.isPlayer, failed: imageFailed }]" :style="portraitStyle" aria-hidden="true">
    <img v-if="imageSrc && !imageFailed" :src="imageSrc" :alt="person?.name || '角色头像'" decoding="async" @error="imageFailed = true">
    <span v-else>{{ initial }}</span>
  </span>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { portraitFor } from "../portraits.js";

const props = defineProps({
  person: { type: Object, default: null },
  size: { type: String, default: "md" }
});

const imageFailed = ref(false);
const imageSrc = computed(() => props.person?.portraitUrl || portraitFor(props.person));
const initial = computed(() => props.person?.name?.slice(0, 1) || "?");
const rankClass = computed(() => {
  const rankId = props.person?.duelSeason?.rankId || props.person?.rankId;
  return rankId ? `duel-frame-${rankId}` : "";
});
const portraitStyle = computed(() => ({
  "--portrait-hue": String(hueFor(props.person?.name || "player")),
  ...(props.person?.duelSeason?.rankColor || props.person?.rankColor ? { "--duel-frame": props.person.duelSeason?.rankColor || props.person.rankColor } : {})
}));

watch(imageSrc, () => {
  imageFailed.value = false;
});

function hueFor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360;
  return hash;
}
</script>
