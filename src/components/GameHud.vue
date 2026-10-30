<script setup lang="ts">
import { IonHeader, IonToolbar } from '@ionic/vue';

defineProps<{
  username: string;
  userCoins: number;
  score: number;
  highScore: number;
  level: number;
  worldName: string;
  levelProgress: number;
  clearedTiles: number;
  totalLevelTiles: number;
  unclaimedMissionsCount: number;
}>();

const emit = defineEmits<{
  (e: 'open-leaderboard'): void;
  (e: 'open-shop'): void;
  (e: 'open-map'): void;
  (e: 'open-settings'): void;
  (e: 'open-missions'): void;
  (e: 'open-pause'): void;
}>();

const formatScore = (num: number) => {
  return new Intl.NumberFormat('es-ES').format(num);
};
</script>

<template>
  <ion-header class="ion-no-border">
    <ion-toolbar class="game-hud-toolbar">
      <div class="hud-container">
        <!-- 1. Avatar & Profile Button (>= 44px touch target) -->
        <button
          type="button"
          class="hud-touch-pill hud-profile"
          @click="emit('open-leaderboard')"
          title="Ver perfil y clasificación"
          :aria-label="`Perfil de ${username}, ver clasificación`"
        >
          <div class="hud-avatar" aria-hidden="true">
            {{ username.charAt(0).toUpperCase() }}
          </div>
          <span class="hud-username">{{ username }}</span>
        </button>

        <!-- 2. Coins Button (>= 44px touch target, opens Shop) -->
        <button
          type="button"
          class="hud-touch-pill hud-coin-chip"
          @click="emit('open-shop')"
          title="Monedas — Abrir Tienda"
          aria-label="Abrir tienda"
        >
          <span class="coin-icon" aria-hidden="true">🪙</span>
          <span class="coin-val">{{ formatScore(userCoins) }}</span>
        </button>

        <!-- 3. Level & Progress Pill (>= 44px touch target, opens World Map) -->
        <button
          type="button"
          class="hud-touch-pill hud-level-pill"
          @click="emit('open-map')"
          :title="`${worldName} · Puntos: ${formatScore(score)}`"
          :aria-label="`Nivel ${level}, ${worldName}. Progreso ${clearedTiles} de ${totalLevelTiles} fichas. Abrir mapa de mundos`"
        >
          <div class="level-top-row">
            <span class="level-badge">
              <img src="/assets/ui/Yellow/Double/star.png" alt="" class="level-star" />
              Nv. {{ level }}
            </span>
            <span class="progress-count">{{ clearedTiles }}/{{ totalLevelTiles }}</span>
          </div>
          <div class="level-progress-track" aria-hidden="true">
            <div
              class="level-progress-fill"
              :style="{ width: `${Math.round(levelProgress * 100)}%` }"
            ></div>
          </div>
        </button>

        <!-- 4. Pause & Menu Hub Button (44x44px touch target + mission badge) -->
        <button
          type="button"
          class="hud-pause-btn"
          @click="emit('open-pause')"
          title="Pausa y Menú"
          aria-label="Pausar partida"
        >
          <span class="pause-icon" aria-hidden="true">
            <span class="pause-bar"></span>
            <span class="pause-bar"></span>
          </span>
          <span
            v-if="unclaimedMissionsCount > 0"
            class="hud-notif-dot"
            :title="`${unclaimedMissionsCount} misión(es) lista(s) para reclamar`"
          >
            {{ unclaimedMissionsCount }}
          </span>
        </button>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.game-hud-toolbar {
  --background: rgba(255, 255, 255, 0.96);
  --color: #0f172a;
  border-bottom: 3px solid #0284c7;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.14);
  padding-top: env(safe-area-inset-top, 0px);
}

.hud-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  gap: 6px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  box-sizing: border-box;
}

/* Minimum 44px touch height across all HUD interactive controls (#1) */
.hud-touch-pill {
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  border-radius: 16px;
  cursor: pointer;
  box-sizing: border-box;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  padding: 4px 8px;
}

.hud-touch-pill:active {
  transform: translateY(2px);
}

/* 1. Avatar & Username */
.hud-profile {
  gap: 5px;
  background: #f0f9ff;
  border: 2px solid #bae6fd;
  box-shadow: 0 3px 0 #7dd3fc;
  padding: 4px 8px 4px 5px;
  flex: 0 1 auto;
  min-width: 0;
}

.hud-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.35);
}

.hud-username {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 56px;
}

/* 2. Coins Pill */
.hud-coin-chip {
  gap: 4px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 2px solid #f59e0b;
  box-shadow: 0 3px 0 #d97706;
  padding: 4px 8px;
  flex-shrink: 0;
}

.coin-icon {
  font-size: 14px;
  line-height: 1;
}

.coin-val {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #92400e;
  white-space: nowrap;
}

/* 3. Level & Progress Pill */
.hud-level-pill {
  flex: 1 0 auto;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
  gap: 4px;
  background: #ffffff;
  border: 2px solid #bae6fd;
  box-shadow: 0 3px 0 #38bdf8;
  padding: 5px 9px;
  min-width: 112px;
}

.level-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.level-badge {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #0369a1;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.level-star {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
}

.progress-count {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #475569;
  white-space: nowrap;
  flex-shrink: 0;
}

.level-progress-track {
  width: 100%;
  height: 6px;
  background: #e2e8f0;
  border-radius: 999px;
  overflow: hidden;
}

.level-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 999px;
  transition: width 0.25s ease;
}

/* 4. Pause & Menu Hub Button (44x44px minimum touch area, Kenney texture) */
.hud-pause-btn {
  position: relative;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  border-radius: 12px;
  background: url('/assets/ui/Blue/Double/button_square_depth_gloss.png') center / 100% 100% no-repeat;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0 0 4px;
  transition: transform 0.1s ease, filter 0.1s ease;
}

.hud-pause-btn:active {
  transform: translateY(2px);
  filter: brightness(0.94);
}

.pause-icon {
  display: flex;
  gap: 4px;
  line-height: 1;
}

.pause-bar {
  width: 5px;
  height: 16px;
  border-radius: 2px;
  background: #ffffff;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.25);
}

.hud-notif-dot {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 900;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

@media (max-width: 360px) {
  .hud-container {
    padding: 5px 5px;
    gap: 4px;
  }
  .hud-username {
    max-width: 42px;
    font-size: 10.5px;
  }
  .hud-level-pill {
    min-width: 102px;
    padding: 4px 7px;
  }
}
</style>
