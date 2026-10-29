<script setup lang="ts">
import type { DailyMission } from '../game/types';
import { playClick } from '../game/sounds';

defineProps<{
  isOpen: boolean;
  missions: DailyMission[];
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'claim', missionId: string): void;
}>();

const close = () => {
  playClick();
  emit('update:isOpen', false);
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="isOpen"
        class="dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Misiones Diarias"
        @click.self="close"
      >
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card missions-card">
            <div class="window-tab">
              <span>🎯 MISIONES</span>
            </div>

            <button
              type="button"
              class="modal-close-corner"
              @click="close"
              title="Cerrar"
              aria-label="Cerrar misiones diarias"
            >
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <div class="missions-header">
              <h2 class="missions-title">MISIONES DIARIAS</h2>
              <p class="missions-sub">¡Completa retos cada día para ganar monedas extra!</p>
            </div>

            <div class="missions-list">
              <div
                v-for="m in missions"
                :key="m.id"
                class="mission-item"
                :class="{
                  'is-ready': !m.claimed && m.progress >= m.target,
                  'is-claimed': m.claimed,
                }"
              >
                <div class="mission-icon" aria-hidden="true">{{ m.icon }}</div>

                <div class="mission-info">
                  <div class="mission-top-row">
                    <span class="mission-name">{{ m.title }}</span>
                    <span class="mission-reward">+{{ m.rewardCoins }} 🪙</span>
                  </div>
                  <span class="mission-desc">{{ m.description }}</span>

                  <div class="mission-progress-bar">
                    <div
                      class="mission-progress-fill"
                      :style="{ width: `${Math.min(100, (m.progress / m.target) * 100)}%` }"
                    ></div>
                  </div>
                  <span class="mission-counter">{{ m.progress }} / {{ m.target }}</span>
                </div>

                <button
                  type="button"
                  class="mission-action-btn"
                  :disabled="m.claimed || m.progress < m.target"
                  @click="emit('claim', m.id)"
                >
                  <span v-if="m.claimed">✅ LISTO</span>
                  <span v-else-if="m.progress >= m.target">🎁 RECLAMAR</span>
                  <span v-else>EN CURSO</span>
                </button>
              </div>
            </div>

            <button type="button" class="missions-close-btn" @click="close">
              <span>VOLVER AL JUEGO</span>
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 14px;
  box-sizing: border-box;
}

.missions-card {
  width: 94%;
  max-width: 390px;
  background: #f8fafc;
  border: 4px solid #ec4899;
  border-radius: 28px;
  box-shadow:
    0 10px 0 #be185d,
    0 25px 40px rgba(0, 0, 0, 0.35);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 16px 16px;
  box-sizing: border-box;
  margin-top: 15px;
}

.window-tab {
  position: absolute;
  top: -30px;
  left: 20px;
  background: #ec4899;
  border: 3px solid #be185d;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 4px 14px 2px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
}

.modal-close-corner {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ef4444;
  border: 2px solid #b91c1c;
  box-shadow: 0 3px 0 #991b1b;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-icon {
  width: 14px;
  height: 14px;
}

.missions-header {
  text-align: center;
  margin-bottom: 12px;
}

.missions-title {
  font-family: var(--game-font, sans-serif);
  font-size: 1.15rem;
  font-weight: 900;
  color: #9d174d;
  margin: 0;
}

.missions-sub {
  font-size: 11px;
  font-weight: 600;
  color: #64748b;
  margin: 4px 0 0;
}

.missions-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

.mission-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 10px;
  box-shadow: 0 2px 0 #cbd5e1;
}

.mission-item.is-ready {
  border-color: #f59e0b;
  background: #fffbeb;
}

.mission-item.is-claimed {
  opacity: 0.72;
  background: #f1f5f9;
}

.mission-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #fdf2f8;
  border: 1.5px solid #fbcfe8;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.mission-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mission-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mission-name {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #1e293b;
}

.mission-reward {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #d97706;
}

.mission-desc {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

.mission-progress-bar {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 3px;
}

.mission-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #ec4899, #f43f5e);
  transition: width 0.25s ease;
}

.mission-counter {
  font-size: 9px;
  font-weight: 800;
  color: #475569;
}

.mission-action-btn {
  flex-shrink: 0;
  border-radius: 12px;
  padding: 7px 10px;
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 900;
  cursor: pointer;
  background: #f59e0b;
  border: 1.5px solid #d97706;
  box-shadow: 0 3px 0 #b45309;
  color: #ffffff;
}

.mission-action-btn:disabled {
  background: #e2e8f0;
  border-color: #cbd5e1;
  box-shadow: none;
  color: #64748b;
  cursor: default;
}

.missions-close-btn {
  background: #ec4899;
  border: 3px solid #be185d;
  box-shadow: 0 5px 0 #9d174d;
  border-radius: 18px;
  padding: 10px 16px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
</style>

