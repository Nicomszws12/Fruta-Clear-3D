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
        <!-- Left: User Profile Chip -->
        <button
          type="button"
          class="hud-profile"
          @click="emit('open-leaderboard')"
          title="Ver perfil y clasificación"
          :aria-label="`Perfil de ${username}, ver clasificación`"
        >
          <div class="hud-avatar" aria-hidden="true">
            {{ username.charAt(0).toUpperCase() }}
          </div>
          <span class="hud-username">{{ username }}</span>
        </button>

        <!-- Center: Currency & Score Chips -->
        <div class="hud-center-chips">
          <button
            type="button"
            class="hud-coin-chip"
            @click="emit('open-shop')"
            title="Monedas — Abrir Tienda"
            :aria-label="`${userCoins} monedas, abrir tienda`"
          >
            <span class="coin-icon" aria-hidden="true">🪙</span>
            <span class="coin-val">{{ formatScore(userCoins) }}</span>
          </button>

          <div
            class="hud-score-chip"
            :title="`Puntos de sesión: ${formatScore(score)} · Récord: ${formatScore(highScore)}`"
            :aria-label="`Puntaje actual ${score}`"
          >
            <span class="score-coin" aria-hidden="true">⭐</span>
            <span class="score-val">{{ formatScore(score) }}</span>
          </div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="hud-actions">
          <button
            type="button"
            class="hud-btn hud-missions-btn"
            @click="emit('open-missions')"
            title="Misiones Diarias"
            aria-label="Abrir Misiones Diarias"
          >
            <span class="btn-icon" aria-hidden="true">🎯</span>
            <span v-if="unclaimedMissionsCount > 0" class="hud-notif-dot">
              {{ unclaimedMissionsCount }}
            </span>
          </button>

          <button
            type="button"
            class="hud-btn hud-map-btn"
            @click="emit('open-map')"
            title="Mapa de Mundos"
            aria-label="Abrir Mapa de Mundos"
          >
            <span class="btn-icon" aria-hidden="true">🗺️</span>
          </button>

          <button
            type="button"
            class="hud-btn hud-shop-btn"
            @click="emit('open-shop')"
            title="Tienda"
            aria-label="Abrir Tienda"
          >
            <span class="btn-icon" aria-hidden="true">🛒</span>
          </button>

          <button
            type="button"
            class="hud-btn hud-leaderboard-btn"
            @click="emit('open-leaderboard')"
            title="Tabla de Clasificación"
            aria-label="Abrir Tabla de Clasificación"
          >
            <span class="btn-icon" aria-hidden="true">🏆</span>
          </button>

          <button
            type="button"
            class="hud-btn hud-pause-btn"
            @click="emit('open-pause')"
            title="Pausar Juego"
            aria-label="Pausar Juego"
          >
            <span class="btn-icon" aria-hidden="true">⏸️</span>
          </button>

          <button
            type="button"
            class="hud-btn hud-settings-btn"
            @click="emit('open-settings')"
            title="Ajustes de Juego"
            aria-label="Abrir Ajustes de Juego"
          >
            <span class="btn-icon" aria-hidden="true">⚙️</span>
          </button>
        </div>
      </div>

      <!-- World & Level Subbar -->
      <div class="subbar-host">
        <button
          type="button"
          class="world-subbar"
          @click="emit('open-map')"
          title="Ver Mapa de Mundos y Niveles"
          :aria-label="`Nivel ${level}, ${worldName}. Progreso ${clearedTiles} de ${totalLevelTiles} fichas. Toca para abrir mapa.`"
        >
          <div class="subbar-left">
            <span class="subbar-level-badge">⭐ Nv. {{ level }}</span>
            <span class="subbar-world-name">{{ worldName }}</span>
            <span class="subbar-map-icon" aria-hidden="true">🗺️</span>
          </div>

          <div class="subbar-right">
            <div class="subbar-progress-track" aria-hidden="true">
              <div
                class="subbar-progress-fill"
                :style="{ width: `${levelProgress * 100}%` }"
              ></div>
            </div>
            <span class="subbar-tiles-counter">
              {{ clearedTiles }}/{{ totalLevelTiles }} fichas
            </span>
          </div>
        </button>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<style scoped>
.game-hud-toolbar {
  --background: rgba(255, 255, 255, 0.98);
  --color: #0f172a;
  border-bottom: 2.5px solid #0284c7;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.08);
  padding-top: env(safe-area-inset-top, 0px);
}

.hud-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 6px;
  gap: 4px;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
}

.hud-profile {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f0f9ff;
  border: 1.5px solid #bae6fd;
  box-shadow: 0 2px 0 #7dd3fc;
  border-radius: 14px;
  padding: 2px 6px 2px 3px;
  cursor: pointer;
  flex-shrink: 0;
  max-width: 80px;
  transition: transform 0.1s;
}

.hud-profile:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 #7dd3fc;
}

.hud-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.hud-username {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 900;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 48px;
}

.hud-center-chips {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 1;
  min-width: 0;
}

.hud-coin-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 1.5px solid #f59e0b;
  padding: 2px 5px;
  border-radius: 10px;
  cursor: pointer;
  box-shadow: 0 2px 0 #d97706;
  transition: transform 0.1s;
  flex-shrink: 0;
}

.hud-coin-chip:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 #d97706;
}

.coin-icon {
  font-size: 11px;
  line-height: 1;
}

.coin-val {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 900;
  color: #92400e;
  white-space: nowrap;
}

.hud-score-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  background: rgba(245, 158, 11, 0.1);
  border: 1.5px solid rgba(245, 158, 11, 0.35);
  padding: 2px 5px;
  border-radius: 10px;
  flex-shrink: 0;
}

.score-coin {
  font-size: 10px;
  line-height: 1;
}

.score-val {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 900;
  color: #d97706;
  white-space: nowrap;
}

.hud-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.hud-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 25px;
  height: 25px;
  border-radius: 8px;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.hud-btn:active {
  transform: translateY(1px);
}

.btn-icon {
  font-size: 12px;
  line-height: 1;
}

.hud-notif-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: #fff;
  font-size: 8px;
  font-weight: 900;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #fff;
}

.hud-missions-btn {
  background: #ec4899;
  border: 1.5px solid #db2777;
  box-shadow: 0 2px 0 #9d174d;
}

.hud-map-btn {
  background: #3b82f6;
  border: 1.5px solid #1d4ed8;
  box-shadow: 0 2px 0 #1e40af;
}

.hud-shop-btn {
  background: #f59e0b;
  border: 1.5px solid #d97706;
  box-shadow: 0 2px 0 #b45309;
}

.hud-leaderboard-btn {
  background: #38c644;
  border: 1.5px solid #278d30;
  box-shadow: 0 2px 0 #1b6822;
}

.hud-pause-btn {
  background: #8b5cf6;
  border: 1.5px solid #6d28d9;
  box-shadow: 0 2px 0 #4c1d95;
}

.hud-settings-btn {
  background: #0ea5e9;
  border: 1.5px solid #0284c7;
  box-shadow: 0 2px 0 #0369a1;
}

.subbar-host {
  padding: 2px 6px 4px;
  background: rgba(240, 249, 255, 0.85);
  border-top: 1px solid rgba(2, 132, 199, 0.12);
}

.world-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 440px;
  margin: 0 auto;
  padding: 3px 10px;
  background: #ffffff;
  border: 1.5px solid #bae6fd;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  box-sizing: border-box;
  transition: transform 0.1s ease;
}

.world-subbar:active {
  transform: scale(0.98);
}

.subbar-left {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  flex-shrink: 1;
}

.subbar-level-badge {
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  padding: 2px 6px;
  border-radius: 8px;
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 900;
  color: #ffffff;
  box-shadow: 0 1.5px 0 #b45309;
  white-space: nowrap;
  flex-shrink: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.subbar-world-name {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.subbar-map-icon {
  font-size: 11px;
  opacity: 0.85;
  flex-shrink: 0;
}

.subbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.subbar-progress-track {
  width: 50px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 4px;
  overflow: hidden;
}

.subbar-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 4px;
  transition: width 0.2s ease;
}

.subbar-tiles-counter {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 9px;
  font-weight: 800;
  color: #475569;
  white-space: nowrap;
}

@media (max-width: 360px) {
  .hud-container {
    padding: 3px 4px;
    gap: 2px;
  }
  .hud-username {
    max-width: 40px;
    font-size: 9px;
  }
  .hud-btn {
    width: 23px;
    height: 23px;
  }
}
</style>

