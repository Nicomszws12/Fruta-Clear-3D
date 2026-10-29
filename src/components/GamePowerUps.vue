<script setup lang="ts">
import type { PowerUpState } from '../game/types';

defineProps<{
  powerUpState: PowerUpState;
  canUndo: boolean;
  canShuffle: boolean;
  canUseHint: boolean;
  isAnimating: boolean;
}>();

const emit = defineEmits<{
  (e: 'undo'): void;
  (e: 'shuffle'): void;
  (e: 'hint'): void;
  (e: 'open-powerup-shop'): void;
}>();
</script>

<template>
  <div class="powerups-bar" role="group" aria-label="Ayudas de juego">
    <!-- Undo Powerup -->
    <button
      type="button"
      class="powerup-btn btn-undo"
      :disabled="(!canUndo && powerUpState.undoCount > 0) || isAnimating"
      :aria-label="`Deshacer movimiento, ${powerUpState.undoCount} disponibles`"
      @click="powerUpState.undoCount > 0 ? emit('undo') : emit('open-powerup-shop')"
    >
      <div class="powerup-icon-wrapper">
        <span class="powerup-icon" aria-hidden="true">↩️</span>
        <span
          class="powerup-badge"
          :class="{ 'is-empty': powerUpState.undoCount <= 0 }"
        >
          {{ powerUpState.undoCount > 0 ? powerUpState.undoCount : '+' }}
        </span>
      </div>
      <span class="powerup-label">Deshacer</span>
    </button>

    <!-- Shuffle Powerup -->
    <button
      type="button"
      class="powerup-btn btn-shuffle"
      :disabled="(!canShuffle && powerUpState.shuffleCount > 0) || isAnimating"
      :aria-label="`Mezclar tablero, ${powerUpState.shuffleCount} disponibles`"
      @click="powerUpState.shuffleCount > 0 ? emit('shuffle') : emit('open-powerup-shop')"
    >
      <div class="powerup-icon-wrapper">
        <span class="powerup-icon" aria-hidden="true">🔀</span>
        <span
          class="powerup-badge"
          :class="{ 'is-empty': powerUpState.shuffleCount <= 0 }"
        >
          {{ powerUpState.shuffleCount > 0 ? powerUpState.shuffleCount : '+' }}
        </span>
      </div>
      <span class="powerup-label">Mezclar</span>
    </button>

    <!-- Hint / Magic Wand Powerup -->
    <button
      type="button"
      class="powerup-btn btn-hint"
      :disabled="(!canUseHint && powerUpState.hintCount > 0) || isAnimating"
      :aria-label="`Varita mágica, ${powerUpState.hintCount} disponibles`"
      @click="powerUpState.hintCount > 0 ? emit('hint') : emit('open-powerup-shop')"
    >
      <div class="powerup-icon-wrapper">
        <span class="powerup-icon" aria-hidden="true">✨</span>
        <span
          class="powerup-badge"
          :class="{ 'is-empty': powerUpState.hintCount <= 0 }"
        >
          {{ powerUpState.hintCount > 0 ? powerUpState.hintCount : '+' }}
        </span>
      </div>
      <span class="powerup-label">Varita</span>
    </button>
  </div>
</template>

<style scoped>
.powerups-bar {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-shrink: 0;
  margin: 0;
}

.powerup-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #ffffff;
  border: 2px solid #cbd5e1;
  border-radius: 18px;
  padding: 8px 14px 6px;
  color: #1e293b;
  cursor: pointer;
  min-width: 76px;
  box-shadow: 0 5px 0 #94a3b8;
  transition: transform 0.1s ease, box-shadow 0.1s ease, background 0.15s;
}

.powerup-btn.btn-undo {
  background: #f0fdf4;
  border-color: #86efac;
  box-shadow: 0 5px 0 #22c55e;
}

.powerup-btn.btn-undo:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #22c55e;
}

.powerup-btn.btn-shuffle {
  background: #fefce8;
  border-color: #fde047;
  box-shadow: 0 5px 0 #eab308;
}

.powerup-btn.btn-shuffle:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #eab308;
}

.powerup-btn.btn-hint {
  background: #faf5ff;
  border-color: #d8b4fe;
  box-shadow: 0 5px 0 #a855f7;
}

.powerup-btn.btn-hint:active:not(:disabled) {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #a855f7;
}

.powerup-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  box-shadow: 0 2px 0 #cbd5e1 !important;
  background: #f1f5f9 !important;
  border-color: #e2e8f0 !important;
}

.powerup-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.powerup-icon {
  font-size: 22px;
}

.powerup-badge {
  position: absolute;
  top: -6px;
  right: -12px;
  background: #f8be14;
  border: 1.5px solid #b8860b;
  box-shadow: 0 2px 0 #8c6503;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
}

.powerup-badge.is-empty {
  background: #3b82f6;
  border-color: #1d4ed8;
  box-shadow: 0 2px 0 #1e40af;
}

.powerup-label {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #334155;
  letter-spacing: 0.5px;
}

@media (max-height: 700px) {
  .powerups-bar {
    margin: 0;
    gap: 8px;
  }
  .powerup-btn {
    min-width: 62px;
    padding: 4px 8px 3px;
    border-radius: 12px;
  }
  .powerup-icon {
    font-size: 16px;
  }
  .powerup-label {
    font-size: 9px;
  }
}
</style>

