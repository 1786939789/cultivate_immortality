<template>
  <div class="meter">
    <div class="meter-head">
      <span>{{ label }}</span>
      <span>{{ Math.floor(value) }} / {{ max }}</span>
    </div>
    <div class="bar" :class="tone">
      <span :style="{ width: percent }"></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, required: true },
  tone: { type: String, default: "" }
});

const percent = computed(() => `${Math.max(0, Math.min(100, (props.value / props.max) * 100))}%`);
</script>
