<template>
  <component
    :is="statIconComponent(name)"
    class="stat-icon"
    :size="size"
    :stroke-width="strokeWidth"
    aria-hidden="true"
  />
</template>

<script>
import {
  Axe,
  BadgeCent,
  Brain,
  CalendarDays,
  Coins,
  Gauge,
  HeartPulse,
  Medal,
  ShieldCheck,
  Sparkles,
  VenusAndMars,
  WandSparkles
} from "lucide-vue-next";

export function statIconComponent(icon) {
  return {
    attack: Axe,
    defense: ShieldCheck,
    day: CalendarDays,
    gender: VenusAndMars,
    health: HeartPulse,
    hp: HeartPulse,
    mana: Sparkles,
    power: Gauge,
    rank: Medal,
    sense: Brain,
    skill: WandSparkles,
    spirit: Coins
  }[icon] || BadgeCent;
}
</script>

<script setup>
defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 16 },
  strokeWidth: { type: Number, default: 2.4 }
});
</script>
