<script setup lang="ts">
import type { LevelIntroInfo } from '../composables/useGameState';

defineProps<{
  intro: LevelIntroInfo | null;
}>();

const emit = defineEmits<{
  (e: 'dismiss'): void;
}>();
</script>

<template>
  <Transition name="intro-pop">
    <div
      v-if="intro"
      class="level-intro-overlay"
      role="status"
      aria-live="polite"
      @click="emit('dismiss')"
    >
      <div class="level-intro-card">
        <div class="intro-window-tab">
          <span>MUNDO {{ intro.worldId }}</span>
        </div>

        <div class="intro-world-icon" aria-hidden="true">
          {{ intro.worldIcon }}
        </div>

        <h3 class="intro-world-title">{{ intro.worldName }}</h3>

        <div class="intro-level-pill">
          <span class="intro-level-num">⭐ NIVEL {{ intro.level }}</span>
          <span class="intro-archetype">{{ intro.archetypeName }}</span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.level-intro-overlay {
  position: absolute;
  inset: 0;
  z-index: 950;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  padding: 16px;
}

.level-intro-card {
  position: relative;
  width: min(86vw, 300px);
  background: linear-gradient(180deg, #2b99ff 0%, #1d7fe0 100%);
  border: 4px solid #155ca8;
  border-radius: 26px;
  box-shadow:
    0 9px 0 #0e3f75,
    0 22px 38px rgba(15, 23, 42, 0.45);
  padding: 20px 18px 16px;
  text-align: center;
  color: #ffffff;
  cursor: pointer;
  user-select: none;
}

.intro-window-tab {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: #f8be14;
  border: 3px solid #b8860b;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 3px 16px 2px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #78350f;
  letter-spacing: 0.6px;
  white-space: nowrap;
}

.intro-world-icon {
  font-size: 46px;
  line-height: 1.05;
  margin-bottom: 4px;
  filter: drop-shadow(0 5px 6px rgba(0, 0, 0, 0.28));
  animation: iconFloat 0.9s ease-in-out infinite alternate;
}

.intro-world-title {
  margin: 0 0 10px;
  font-family: var(--game-font, sans-serif);
  font-size: 1.25rem;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
}

.intro-level-pill {
  background: #ffffff;
  border: 3px solid #f8be14;
  box-shadow: 0 3px 0 #b8860b;
  border-radius: 16px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.intro-level-num {
  font-family: var(--game-font, sans-serif);
  font-size: 13px;
  font-weight: 900;
  color: #0f172a;
}

.intro-archetype {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
}

@keyframes iconFloat {
  from { transform: translateY(0) scale(1); }
  to { transform: translateY(-4px) scale(1.06); }
}

.intro-pop-enter-active {
  animation: introBounceIn 0.32s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.intro-pop-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.intro-pop-leave-to {
  opacity: 0;
  transform: scale(0.86) translateY(-10px);
}

@keyframes introBounceIn {
  0% {
    opacity: 0;
    transform: scale(0.55) translateY(18px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>

