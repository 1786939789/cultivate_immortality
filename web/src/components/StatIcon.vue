<template>
  <svg class="stat-icon" viewBox="0 0 24 24" aria-hidden="true">
    <g v-if="name === 'attack'">
      <path d="M5 19 17.8 6.2" />
      <path d="M14.8 5.2h4v4" />
      <path d="m4.4 15.4 4.2 4.2" />
    </g>
    <g v-else-if="name === 'defense'">
      <path d="M12 3.8 18.2 6v5.1c0 4.2-2.4 7.5-6.2 9.1-3.8-1.6-6.2-4.9-6.2-9.1V6L12 3.8Z" />
      <path d="M12 7.2v9.3" />
    </g>
    <g v-else-if="name === 'sense'">
      <path d="M3.8 12s3-5.2 8.2-5.2 8.2 5.2 8.2 5.2-3 5.2-8.2 5.2S3.8 12 3.8 12Z" />
      <circle cx="12" cy="12" r="2.4" />
      <path d="M12 2.8v2" />
      <path d="M12 19.2v2" />
    </g>
    <g v-else-if="name === 'health'">
      <path d="M12 20.2C7.8 16.5 5 13.8 5 10.4A3.8 3.8 0 0 1 8.8 6.6c1.4 0 2.5.7 3.2 1.8.7-1.1 1.8-1.8 3.2-1.8A3.8 3.8 0 0 1 19 10.4c0 3.4-2.8 6.1-7 9.8Z" />
      <path d="M8.3 12h2.2l.8-1.8 1.3 3.6.9-1.8h2.2" />
    </g>
    <g v-else-if="name === 'mana'">
      <path d="M12 3.5c3.2 3.3 5 6.1 5 9.4a5 5 0 0 1-10 0c0-3.3 1.8-6.1 5-9.4Z" />
      <path d="M9.4 14.2c.6 1.1 1.4 1.7 2.6 1.7s2-.6 2.6-1.7" />
    </g>
    <g v-else>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 8v4l2.6 2" />
    </g>
  </svg>
</template>

<script setup>
defineProps({
  name: { type: String, required: true }
});
</script>
