<script setup lang="ts">
import type { ComboBanner } from '../composables/useGameState';

defineProps<{
  isPaused: boolean;
  comboBanner: ComboBanner | null;
}>();
</script>

<template>
  <!-- ════════ FLOATING COMBO BANNER ════════ -->
  <transition name="combo-pop">
    <div v-if="comboBanner" class="combo-banner-overlay" role="status" aria-live="polite">
      <div class="combo-badge" :class="`combo-x${comboBanner.multiplier}`">
        <span class="combo-text">{{ comboBanner.text }}</span>
        <span class="combo-points">+{{ comboBanner.points }} pts</span>
      </div>
    </div>
  </transition>

  <!-- ════════ BACKGROUND FLOATING DECORATIONS ════════ -->
  <div
    class="bg-decorations"
    :class="{ 'is-paused': isPaused }"
    aria-hidden="true"
  >
    <div class="bg-shape circle-1"></div>
    <div class="bg-shape circle-2"></div>
    <div class="bg-shape circle-3"></div>
    <div class="bg-shape diamond-1">◆</div>
    <div class="bg-shape diamond-2">★</div>
    <div class="bg-shape diamond-3">◆</div>
    <div class="bg-shape star-deco">★</div>
  </div>
</template>

<style scoped>
.bg-decorations {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  contain: strict;
  overflow: hidden;
  z-index: 1;
}

.bg-decorations.is-paused .bg-shape {
  animation-play-state: paused !important;
}

.bg-shape {
  position: absolute;
  color: rgba(255, 255, 255, 0.16);
  font-family: var(--game-font, sans-serif);
  user-select: none;
}

.circle-1 {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  border: 3px dashed rgba(255, 255, 255, 0.15);
  top: 8%;
  left: -40px;
  animation: floatSlow 8s ease-in-out infinite alternate;
}

.circle-2 {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  border: 3px dashed rgba(255, 255, 255, 0.12);
  bottom: 12%;
  right: -50px;
  animation: floatSlow 10s ease-in-out infinite alternate-reverse;
}

.circle-3 {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%);
  top: 45%;
  right: 8%;
  animation: floatSlow 6s ease-in-out infinite alternate;
}

.diamond-1 {
  font-size: 26px;
  top: 18%;
  right: 14%;
  animation: spinSlow 16s linear infinite;
}

.diamond-2 {
  font-size: 34px;
  bottom: 25%;
  left: 8%;
  animation: floatSlow 7s ease-in-out infinite alternate;
}

.diamond-3 {
  font-size: 20px;
  top: 60%;
  left: 12%;
  animation: spinSlow 20s linear infinite reverse;
}

.star-deco {
  font-size: 24px;
  top: 14%;
  right: 28%;
  animation: floatSlow 5s ease-in-out infinite alternate;
}

@keyframes floatSlow {
  0% { transform: translateY(0px) rotate(0deg); }
  100% { transform: translateY(-16px) rotate(10deg); }
}

@keyframes spinSlow {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.combo-banner-overlay {
  position: absolute;
  top: 15%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  pointer-events: none;
}

.combo-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: 2px solid #fecaca;
  padding: 8px 18px;
  border-radius: 20px;
  box-shadow:
    0 0 20px rgba(239, 68, 68, 0.6),
    0 6px 15px rgba(0, 0, 0, 0.4);
}

.combo-badge.combo-x3 {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #fde68a;
  box-shadow: 0 0 25px rgba(245, 158, 11, 0.7);
}

.combo-badge.combo-x4 {
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-color: #fbcfe8;
  box-shadow: 0 0 30px rgba(236, 72, 153, 0.8);
}

.combo-text {
  font-family: var(--game-font, sans-serif);
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
  letter-spacing: 0.5px;
}

.combo-points {
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 800;
  color: #fef08a;
  margin-top: 2px;
}

.combo-pop-enter-active {
  animation: comboBounceIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.combo-pop-leave-active {
  transition: all 0.25s ease-out;
}

.combo-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px) scale(0.85);
}

@keyframes comboBounceIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) scale(0.4) translateY(20px);
  }
  70% {
    transform: translateX(-50%) scale(1.1) translateY(-4px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) scale(1) translateY(0);
  }
}
</style>

