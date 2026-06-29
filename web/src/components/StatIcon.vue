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
  Activity,
  BadgeCent,
  Coins,
  Eye,
  HeartPulse,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Zap
} from "lucide-vue-next";

export function statIconComponent(icon) {
  return {
    attack: Swords,
    defense: Shield,
    health: HeartPulse,
    hp: HeartPulse,
    mana: Sparkles,
    power: Zap,
    rank: Trophy,
    sense: Eye,
    skill: Activity,
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
