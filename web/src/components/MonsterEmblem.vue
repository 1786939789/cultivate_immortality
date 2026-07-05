<template>
  <span class="monster-emblem" :class="[size, `monster-${kind}`, { 'has-image': imagePath && !imageFailed }]" :style="styleVars" aria-hidden="true">
    <img v-if="imagePath && !imageFailed" :src="imagePath" :alt="`${displayName}图像`" loading="lazy" decoding="async" @error="imageFailed = true">
    <component v-else :is="icon" :size="iconSize" :stroke-width="2.15" />
  </span>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import { Bug, Cat, CloudLightning, Flame, Ghost, MountainSnow, Shell, Skull, Sparkles, Waves } from "lucide-vue-next";
import { baseMonsterName, monsterImagePath } from "../monsterImages";

const props = defineProps({
  monster: { type: Object, default: null },
  size: { type: String, default: "md" }
});

const name = computed(() => props.monster?.name || "");
const displayName = computed(() => baseMonsterName(name.value));
const imagePath = computed(() => monsterImagePath(props.monster));
const imageFailed = ref(false);
const rootName = computed(() => props.monster?.rootName || "");
const kind = computed(() => {
  if (/鹰|鸟|羽|鹏/.test(name.value)) return "wing";
  if (/蟒|蛇|蛟|龙/.test(name.value)) return "serpent";
  if (/虎|狼|豹|狮/.test(name.value)) return "beast";
  if (/龟|甲|玄武/.test(name.value)) return "shell";
  if (/鬼|魂|煞|魔/.test(name.value)) return "shade";
  if (/火|焰/.test(name.value + rootName.value)) return "flame";
  return "spirit";
});
const icon = computed(() => ({
  beast: Cat,
  flame: Flame,
  serpent: Waves,
  shade: Ghost,
  shell: Shell,
  spirit: Sparkles,
  wing: CloudLightning
})[kind.value] || Bug);
const iconSize = computed(() => props.size === "lg" ? 38 : props.size === "sm" ? 22 : 30);
const styleVars = computed(() => ({
  "--monster-hue": String(hueFor(displayName.value || rootName.value || "monster"))
}));

function hueFor(text) {
  let hash = 0;
  for (const char of text) hash = (hash * 29 + char.charCodeAt(0)) % 360;
  return hash;
}

watch(imagePath, () => {
  imageFailed.value = false;
});
</script>
