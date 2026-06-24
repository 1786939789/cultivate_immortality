<template>
  <section class="log">
    <div v-for="entry in logs" :key="`${entry.day}-${entry.time}-${entry.text}`">
      第{{ entry.day }}日 {{ entry.time }}｜{{ entry.text }}
    </div>
  </section>
</template>

<script setup>
defineProps({
  logs: { type: Array, required: true }
});
</script>
