<template>
  <div class="meter">
    <div class="meter-head">
      <span class="meter-label">
        <StatIcon v-if="icon" :name="icon" />
        <span>{{ label }}</span>
      </span>
      <span>{{ Math.floor(value) }} / {{ max }}</span>
    </div>
    <div class="bar" :class="tone">
      <span :style="{ width: percent }"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import StatIcon from "./StatIcon.vue";

const props = defineProps({
  label: { type: String, required: true },
  icon: { type: String, default: "" },
  value: { type: Number, required: true },
  max: { type: Number, required: true },
  tone: { type: String, default: "" }
});

const percent = computed(() => `${Math.max(0, Math.min(100, (props.value / props.max) * 100))}%`);
</script>
