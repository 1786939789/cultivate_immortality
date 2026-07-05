<template>
  <section class="log">
    <div v-for="(entry, index) in logs" :key="`${entry.day}-${entry.time || ''}-${entry.text}-${index}`">
      {{ entry.date || "未知日期" }} {{ entry.time }}｜{{ entry.text }}
    </div>
  </section>
</template>

<script setup>
defineProps({
  logs: { type: Array, required: true }
});
</script>
