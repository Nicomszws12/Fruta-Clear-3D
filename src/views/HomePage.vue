<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  alertController,
} from '@ionic/vue';
import { useGameState } from '../composables/useGameState';
import { useFirebase } from '../composables/useFirebase';
import { getAssetByKey } from '../game/tileAssets';
import LeaderboardModal from '../components/LeaderboardModal.vue';
import GameDialog from '../components/GameDialog.vue';
import SettingsModal from '../components/SettingsModal.vue';
import { playTap } from '../game/sounds';

// ─── Composables ──────────────────────────────────────────────
const {
  username,
  userUid,
  userHighScore,
  userCurrentLevel,
  leaderboardList,
  userRank,
  isLeaderboardLoading,
  authenticateAndLoadProfile,
  registerNewUser,
  saveProgress,
  updateUsername,
  fetchLeaderboard,
} = useFirebase();

const {
  boardTiles,
  tray,
  score,
  level,
  moveHistory,
  powerUpState,
  gameStatus,
  hintedTileIds,
  isAnimating,
  MAX_TRAY,
  totalLevelTiles,
  remainingTiles,
  levelProgress,
  isTrayCritical,
  comboBanner,
  lastLevelBonus,
  gridCols,
  gridRows,
  levelName,
  worldName,
  generateBoard,
  selectTile,
  undoMove,
  shuffleBoard,
  autoMatch,
  nextLevel,
  retryLevel,
} = useGameState();

// ─── Dialog States ────────────────────────────────────────────
const isWelcomeOpen = ref(false);
const isWinOpen = ref(false);
const isLoseOpen = ref(false);

const handleWelcomeSubmit = async (name: string) => {
  isWelcomeOpen.value = false;
  await registerNewUser(name);
  generateBoard();
};

const handleNextLevel = () => {
  isWinOpen.value = false;
  nextLevel();
};

const handleRetryLevel = () => {
  isLoseOpen.value = false;
  score.value = 0;
  retryLevel();
};

// ─── Leaderboard Modal State ──────────────────────────────────
const isLeaderboardOpen = ref(false);

const openLeaderboard = async () => {
  playTap();
  isLeaderboardOpen.value = true;
  await fetchLeaderboard();
};

const handleUpdateName = async (newName: string) => {
  const ok = await updateUsername(newName);
  if (ok) {
    await fetchLeaderboard();
  }
};

// ─── Settings Modal State ─────────────────────────────────────
const isSettingsOpen = ref(false);

const openSettings = () => {
  playTap();
  isSettingsOpen.value = true;
};

const promptEditNameFromSettings = async () => {
  isSettingsOpen.value = false;
  const alert = await alertController.create({
    header: 'Cambiar Apodo ✏️',
    message: 'Ingresa el nuevo nombre que verán los demás jugadores:',
    inputs: [
      {
        name: 'nameInput',
        type: 'text',
        placeholder: 'Tu Apodo',
        value: username.value,
        attributes: { maxlength: 18 },
      },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Guardar',
        handler: async (data: Record<string, string>) => {
          const clean = (data.nameInput || '').trim();
          if (clean && clean !== username.value) {
            await handleUpdateName(clean);
          }
        },
      },
    ],
  });
  await alert.present();
};

// ─── Win / Lose Alerts ────────────────────────────────────────
watch(gameStatus, async (status) => {
  if (status === 'won') {
    const nextLvl = level.value + 1;
    await saveProgress(score.value, nextLvl);
    isWinOpen.value = true;
  } else if (status === 'lost') {
    await saveProgress(score.value, level.value);
    isLoseOpen.value = true;
  }
});

// ─── Format Score ─────────────────────────────────────────────
const formatScore = (num: number) => {
  return new Intl.NumberFormat('es-ES').format(num);
};

// ─── Init ─────────────────────────────────────────────────────
onMounted(async () => {
  const result = await authenticateAndLoadProfile();
  if (result) {
    if (result.isNewUser) {
      isWelcomeOpen.value = true;
      // Board generation is deferred until they submit name
    } else {
      score.value = result.savedScore;
      level.value = result.savedLevel;
      generateBoard();
    }
  } else {
    // Fallback if network fails
    generateBoard();
  }
});
</script>


<template>
  <ion-page>
    <!-- ════════ HEADER GAMER (HUD) ════════ -->
    <ion-header class="ion-no-border">
      <ion-toolbar class="game-hud-toolbar">
        <div class="hud-container">
          <!-- Left: User Profile Chip -->
          <div class="hud-profile" @click="openLeaderboard" title="Ver perfil y ranking">
            <div class="hud-avatar">
              {{ username.charAt(0).toUpperCase() }}
            </div>
            <div class="hud-user-details">
              <span class="hud-username">{{ username }}</span>
              <span class="hud-high-score">Récord: {{ formatScore(userHighScore) }}</span>
            </div>
          </div>

          <!-- Center: Level & Progress Indicator -->
          <div class="hud-level-box">
            <div class="hud-level-badge">
              <span class="level-icon">⭐</span>
              <span class="level-number">Nv. {{ level }}</span>
            </div>
            <div class="hud-progress-bar-bg">
              <div
                class="hud-progress-bar-fill"
                :style="{ width: `${levelProgress * 100}%` }"
              ></div>
            </div>
            <span class="hud-tiles-counter">
              {{ totalLevelTiles - remainingTiles }}/{{ totalLevelTiles }} fichas
            </span>
          </div>

          <!-- Right: Score & Leaderboard Button -->
          <div class="hud-right">
            <div class="hud-score-chip">
              <span class="score-coin">🪙</span>
              <span class="score-val">{{ formatScore(score) }}</span>
            </div>

            <button class="hud-leaderboard-btn" @click="openLeaderboard" title="Tabla de Clasificación">
              <span class="btn-trophy">🏆</span>
              <span class="btn-trophy-text">Top</span>
            </button>

            <button class="hud-settings-btn" @click="openSettings" title="Ajustes de Juego">
              <span class="btn-gear">⚙️</span>
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="game-background" :scroll-y="false">
      <div class="game-layout">
        <!-- ════════ WORLD THEME HEADER ════════ -->
        <div class="world-subbar">
          <span class="world-name-tag">{{ worldName }}</span>
          <span class="archetype-name-tag">{{ levelName }}</span>
        </div>

        <!-- ════════ FLOATING COMBO BANNER ════════ -->
        <transition name="combo-pop">
          <div v-if="comboBanner" class="combo-banner-overlay">
            <div class="combo-badge" :class="`combo-x${comboBanner.multiplier}`">
              <span class="combo-text">{{ comboBanner.text }}</span>
              <span class="combo-points">+{{ comboBanner.points }} pts</span>
            </div>
          </div>
        </transition>

        <!-- ════════ BACKGROUND FLOATING DECORATIONS ════════ -->
        <div class="bg-decorations" aria-hidden="true">
          <div class="bg-shape circle-1"></div>
          <div class="bg-shape circle-2"></div>
          <div class="bg-shape circle-3"></div>
          <div class="bg-shape diamond-1">◆</div>
          <div class="bg-shape diamond-2">★</div>
          <div class="bg-shape diamond-3">◆</div>
          <div class="bg-shape star-deco">★</div>
        </div>

        <!-- ════════ BOARD MAT / ARENA ════════ -->
        <div class="board-arena">
          <div class="board-mat">
            <!-- Decorative Corner Rivets / Stitches -->
            <div class="mat-corner corner-tl">✦</div>
            <div class="mat-corner corner-tr">✦</div>
            <div class="mat-corner corner-bl">✦</div>
            <div class="mat-corner corner-br">✦</div>

            <div
              class="board-container"
              :style="`--grid-cols: ${gridCols}; --grid-rows: ${gridRows};`"
            >
              <div
                v-for="tile in boardTiles"
                :key="tile.id"
                class="tile"
                :class="{
                  'is-blocked': tile.isBlocked,
                  'is-hinted': hintedTileIds.has(tile.id),
                }"
                :style="{
                  left: `calc(${tile.gridX} * var(--tile-size))`,
                  top: `calc(${tile.gridY} * var(--tile-size))`,
                  zIndex: tile.z * 10 + 2,
                  '--tile-z': tile.z,
                }"
                @click="selectTile(tile)"
              >
                <!-- Tile Face -->
                <div class="tile-face">
                  <img
                    v-if="getAssetByKey(tile.type).imagePath"
                    :src="getAssetByKey(tile.type).imagePath"
                    :alt="getAssetByKey(tile.type).label"
                    class="tile-img"
                  />
                  <span v-else class="tile-emoji">
                    {{ getAssetByKey(tile.type).emoji }}
                  </span>

                  <!-- Blocked Shade Overlay -->
                  <div v-if="tile.isBlocked" class="blocked-lock-overlay">
                    <span class="lock-glyph">🔒</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ════════ BOTTOM CONTROLS (POWERUPS + TRAY) ════════ -->
        <div class="bottom-controls">
          <!-- Powerups Bar -->
          <div class="powerups-bar">
            <!-- Undo Powerup -->
            <button
              class="powerup-btn btn-undo"
              :disabled="
                moveHistory.length === 0 ||
                powerUpState.undoCount <= 0 ||
                isAnimating
              "
              @click="undoMove()"
            >
              <div class="powerup-icon-wrapper">
                <span class="powerup-icon">↩️</span>
                <span class="powerup-badge">{{ powerUpState.undoCount }}</span>
              </div>
              <span class="powerup-label">Deshacer</span>
            </button>

            <!-- Shuffle Powerup -->
            <button
              class="powerup-btn btn-shuffle"
              :disabled="
                boardTiles.length === 0 ||
                powerUpState.shuffleCount <= 0 ||
                isAnimating
              "
              @click="shuffleBoard()"
            >
              <div class="powerup-icon-wrapper">
                <span class="powerup-icon">🔀</span>
                <span class="powerup-badge">{{ powerUpState.shuffleCount }}</span>
              </div>
              <span class="powerup-label">Mezclar</span>
            </button>

            <!-- Hint / Magic Wand Powerup -->
            <button
              class="powerup-btn btn-hint"
              :disabled="
                powerUpState.hintCount <= 0 ||
                tray.length > MAX_TRAY - 3 ||
                isAnimating
              "
              @click="autoMatch()"
            >
              <div class="powerup-icon-wrapper">
                <span class="powerup-icon">✨</span>
                <span class="powerup-badge">{{ powerUpState.hintCount }}</span>
              </div>
              <span class="powerup-label">Varita</span>
            </button>
          </div>

          <!-- Tray Container (Bandeja) -->
          <div class="tray-container" :class="{ 'is-critical': isTrayCritical }">
            <div class="tray-warning-label" v-if="isTrayCritical">
              ⚠️ ¡Cuidado! Espacio casi lleno
            </div>
            <div class="tray-slots">
              <div
                v-for="tile in tray"
                :key="'tray-' + tile.id"
                class="tray-tile"
              >
                <img
                  v-if="getAssetByKey(tile.type).imagePath"
                  :src="getAssetByKey(tile.type).imagePath"
                  :alt="getAssetByKey(tile.type).label"
                  class="tile-img"
                />
                <span v-else class="tile-emoji">
                  {{ getAssetByKey(tile.type).emoji }}
                </span>
              </div>
              <div
                v-for="n in MAX_TRAY - tray.length"
                :key="'empty-' + n"
                class="empty-slot"
              >
                <span class="empty-slot-num">{{ tray.length + n }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- ════════ CUSTOM DIALOGS ════════ -->
    <GameDialog
      :is-open="isWelcomeOpen"
      variant="welcome"
      @submit="handleWelcomeSubmit"
    />

    <GameDialog
      :is-open="isWinOpen"
      variant="win"
      :level="level"
      :bonus="lastLevelBonus"
      @next="handleNextLevel"
      @retry="handleRetryLevel"
    />

    <GameDialog
      :is-open="isLoseOpen"
      variant="lose"
      :level="level"
      :score="score"
      @retry="handleRetryLevel"
    />

    <!-- ════════ LEADERBOARD MODAL ════════ -->
    <LeaderboardModal
      :is-open="isLeaderboardOpen"
      :leaderboard="leaderboardList"
      :current-user-id="userUid"
      :current-username="username"
      :user-high-score="userHighScore"
      :user-current-level="userCurrentLevel"
      :user-rank="userRank"
      :is-loading="isLeaderboardLoading"
      @update:is-open="isLeaderboardOpen = $event"
      @refresh="fetchLeaderboard"
      @update-name="handleUpdateName"
    />

    <!-- ════════ SETTINGS MODAL ════════ -->
    <SettingsModal
      :is-open="isSettingsOpen"
      :username="username"
      @update:is-open="isSettingsOpen = $event"
      @edit-name="promptEditNameFromSettings"
    />
  </ion-page>
</template>

<style scoped>
/* ─── Background & Theme ──────────────────────────────────── */
.game-background {
  --background: #0284c7;
  --overflow: hidden;
  overflow: hidden;
  height: 100%;
}

/* ─── Gamer HUD Header ────────────────────────────────────── */
.game-hud-toolbar {
  --background: rgba(255, 255, 255, 0.95);
  --color: #0f172a;
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-bottom: 3px solid #0284c7;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
  padding-top: env(safe-area-inset-top, 0px);
}

.hud-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 10px;
  gap: 6px;
  width: 100%;
  box-sizing: border-box;
}

/* Left Profile */
.hud-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f0f9ff;
  border: 2px solid #bae6fd;
  box-shadow: 0 3px 0 #7dd3fc;
  border-radius: 20px;
  padding: 3px 8px 3px 4px;
  cursor: pointer;
  transition: transform 0.12s, background 0.12s;
}

.hud-profile:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #7dd3fc;
  background: #e0f2fe;
}

.hud-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  border: 1.5px solid rgba(255, 255, 255, 0.8);
}

.hud-user-details {
  display: flex;
  flex-direction: column;
}

.hud-username {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #1e293b;
  max-width: 75px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hud-high-score {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 9px;
  color: #64748b;
}

/* Center Level */
.hud-level-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 90px;
}

.hud-level-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: linear-gradient(135deg, #f59e0b, #fbbf24);
  padding: 3px 8px;
  border-radius: 12px;
  box-shadow: 0 2px 0 #b45309;
}

.level-icon {
  font-size: 11px;
}

.level-number {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.hud-progress-bar-bg {
  width: 100%;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 2px;
}

.hud-progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  border-radius: 4px;
  transition: width 0.3s ease;
}

.hud-tiles-counter {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 9px;
  font-weight: 700;
  color: #64748b;
}

/* Right Score & Trophy */
.hud-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hud-score-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(245, 158, 11, 0.12);
  border: 1.5px solid rgba(245, 158, 11, 0.35);
  padding: 4px 8px;
  border-radius: 14px;
}

.score-coin {
  font-size: 13px;
}

.score-val {
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #d97706;
}

.hud-leaderboard-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #38c644;
  border: 2px solid #278d30;
  box-shadow: 0 4px 0 #1b6822;
  border-radius: 14px;
  padding: 4px 9px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.hud-leaderboard-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #1b6822;
}

.btn-trophy {
  font-size: 14px;
}

.btn-trophy-text {
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.hud-settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #38bdf8;
  border: 2px solid #0284c7;
  box-shadow: 0 4px 0 #0369a1;
  border-radius: 14px;
  padding: 4px 8px;
  color: #fff;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
}

.hud-settings-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 #0369a1;
}

.btn-gear {
  font-size: 14px;
  line-height: 1;
}

/* ─── World Subbar ────────────────────────────────────────── */
.world-subbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 4px 12px;
  flex-shrink: 0;
}

.world-name-tag {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #334155;
  background: #ffffff;
  padding: 3px 10px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 0 #cbd5e1;
}

.archetype-name-tag {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  color: #64748b;
  font-weight: 700;
}

/* ─── Main Game Layout ────────────────────────────────────── */
.game-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  max-height: 100%;
  width: 100%;
  padding: 4px 6px 0;
  box-sizing: border-box;
  position: relative;
  overflow: hidden;

  /* Animated arcade background: radial glow + diagonal stripes + cyan/blue gradient */
  background:
    radial-gradient(ellipse at 50% 15%, rgba(255, 255, 255, 0.22) 0%, transparent 65%),
    repeating-linear-gradient(
      -45deg,
      rgba(255, 255, 255, 0.05) 0px,
      rgba(255, 255, 255, 0.05) 24px,
      transparent 24px,
      transparent 48px
    ),
    linear-gradient(180deg, #38bdf8 0%, #0ea5e9 45%, #0284c7 100%);
  background-size: 100% 100%, 68px 68px, 100% 100%;
  animation: bgStripeSlide 40s linear infinite;
}

@keyframes bgStripeSlide {
  0% { background-position: 0 0, 0 0, 0 0; }
  100% { background-position: 0 0, 680px 680px, 0 0; }
}

/* ─── Floating Background Decorations ─────────────────────── */
.bg-decorations {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 1;
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
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
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

/* ─── Floating Combo Overlay ──────────────────────────────── */
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
  animation: pulseScale 0.35s ease;
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
  font-size: 15px;
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.combo-points {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 13px;
  font-weight: 800;
  color: #fef08a;
}

.combo-pop-enter-active {
  animation: popEnter 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.combo-pop-leave-active {
  animation: popLeave 0.3s ease forwards;
}

@keyframes popEnter {
  0% { transform: scale(0) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@keyframes popLeave {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.2) translateY(-25px); opacity: 0; }
}

/* ─── Board Arena & Mat (Tapete con Líneas) ───────────────── */
.board-arena {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  width: 100%;
  padding: 2px 6px;
  box-sizing: border-box;
  z-index: 2;
  min-height: 0;
  overflow: visible;
}

.board-mat {
  position: relative;
  background: rgba(255, 255, 255, 0.88);
  border: 3px solid #ffffff;
  border-radius: 24px;
  padding: 10px 8px;
  box-shadow: 
    0 8px 0 rgba(2, 132, 199, 0.5),
    0 18px 28px rgba(0, 0, 0, 0.22);
  
  /* Geometric blueprint grid lines */
  background-image: 
    linear-gradient(to right, rgba(2, 132, 199, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(2, 132, 199, 0.07) 1px, transparent 1px);
  background-size: 26px 26px;
  
  /* Stitched dashed perimeter line */
  outline: 2px dashed rgba(2, 132, 199, 0.35);
  outline-offset: -6px;
  transition: all 0.3s ease;
  margin: auto;
  max-width: 96vw;
  box-sizing: border-box;
}

.mat-corner {
  position: absolute;
  font-size: 13px;
  color: #0284c7;
  opacity: 0.55;
  user-select: none;
  pointer-events: none;
}

.corner-tl { top: 4px; left: 6px; }
.corner-tr { top: 4px; right: 6px; }
.corner-bl { bottom: 4px; left: 6px; }
.corner-br { bottom: 4px; right: 6px; }

.board-container {
  /* Dynamic Responsive Tile Size: strictly balances width & vertical space */
  --tile-size: min(
    calc((100vw - 36px) / var(--grid-cols)),
    calc((100dvh - 270px) / var(--grid-rows)),
    calc((100vh - 270px) / var(--grid-rows)),
    50px
  );

  position: relative;
  width: calc(var(--grid-cols) * var(--tile-size));
  height: calc(var(--grid-rows) * var(--tile-size));
  margin: auto;
}

/* ─── 3D Ceramic Tiles ────────────────────────────────────── */
.tile {
  position: absolute;
  width: var(--tile-size);
  height: var(--tile-size);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    transform 0.12s ease,
    filter 0.2s ease,
    box-shadow 0.12s ease;
}

.tile-face {
  width: 100%;
  height: 100%;
  border-radius: calc(var(--tile-size) * 0.18);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;

  /* Glossy ceramic 3D styling */
  background: linear-gradient(155deg, #ffffff 0%, #f4f4f7 50%, #e2e4ea 100%);
  border: 1px solid rgba(255, 255, 255, 0.9);

  /* Layered 3D Shadow projecting according to Z layer */
  box-shadow:
    inset 0 1.5px 1px rgba(255, 255, 255, 0.9),
    inset 0 -1.5px 2px rgba(0, 0, 0, 0.08),
    1px 2px 0px #c2c5d1,
    2px 4px 0px #a4a8b8,
    0 calc(3px + var(--tile-z, 0) * 2px) calc(6px + var(--tile-z, 0) * 3px) rgba(0, 0, 0, 0.35);
}

.tile:active:not(.is-blocked) .tile-face {
  transform: scale(0.9) translateY(3px);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.6),
    0 1px 0px #a4a8b8,
    0 2px 5px rgba(0, 0, 0, 0.2);
}

/* Blocked Tile (dimmed and locked) */
.tile.is-blocked .tile-face {
  filter: brightness(0.48) grayscale(0.4);
  cursor: not-allowed;
  box-shadow:
    1px 1px 0px #888,
    0 2px 4px rgba(0, 0, 0, 0.4);
}

.blocked-lock-overlay {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: calc(var(--tile-size) * 0.22);
  opacity: 0.65;
}

/* Hint glow */
.tile.is-hinted {
  animation: hintPulse 0.5s ease infinite alternate;
  z-index: 999 !important;
}

@keyframes hintPulse {
  from {
    filter: drop-shadow(0 0 6px #ffd700);
    transform: scale(1);
  }
  to {
    filter: drop-shadow(0 0 16px #ffea00);
    transform: scale(1.08);
  }
}

/* Emoji / Image in Tile */
.tile-emoji {
  font-size: calc(var(--tile-size) * 0.55);
  line-height: 1;
  pointer-events: none;
}

.tile-img {
  width: 70%;
  height: 70%;
  object-fit: contain;
  pointer-events: none;
}

/* ─── Bottom Controls Container (Powerups + Tray) ─────────── */
.bottom-controls {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  z-index: 5;
  margin-top: auto;
  padding-bottom: max(8px, env(safe-area-inset-bottom, 8px));
}

/* ─── Power-ups Bar ───────────────────────────────────────── */
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
  text-shadow: 0 1px 1px rgba(0,0,0,0.3);
}

.powerup-label {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  color: #334155;
  letter-spacing: 0.5px;
}

/* ─── Tray Container (Bandeja) ────────────────────────────── */
.tray-container {
  width: 94vw;
  max-width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  z-index: 2;
  margin: 0;
}

.tray-warning-label {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #ef4444;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
  animation: blinkWarning 0.8s ease infinite alternate;
}

@keyframes blinkWarning {
  from { opacity: 0.6; }
  to { opacity: 1; }
}

.tray-slots {
  display: flex;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  padding: 8px;
  border-radius: 22px;
  gap: 6px;
  border: 3px solid #ffffff;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.05),
    0 8px 0 rgba(2, 132, 199, 0.5),
    0 18px 28px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
}

/* Danger pulsating tray */
.tray-container.is-critical .tray-slots {
  border-color: #ef4444;
  box-shadow:
    0 0 15px rgba(239, 68, 68, 0.5),
    inset 0 0 10px rgba(239, 68, 68, 0.2);
  animation: trayCriticalPulse 1s ease infinite alternate;
}

@keyframes trayCriticalPulse {
  from { border-color: rgba(239, 68, 68, 0.4); }
  to { border-color: rgba(239, 68, 68, 1); }
}

.tray-tile,
.empty-slot {
  flex: 1;
  aspect-ratio: 1;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 52px;
}

.tray-tile {
  background: linear-gradient(155deg, #ffffff 0%, #f4f4f7 50%, #e2e4ea 100%);
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 3px 0px #b4b8c6,
    0 4px 10px rgba(0, 0, 0, 0.15);
  animation: trayBounceIn 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.tray-tile .tile-emoji {
  font-size: min(5vw, 24px);
}

.tray-tile .tile-img {
  width: 65%;
  height: 65%;
  object-fit: contain;
}

.empty-slot {
  background: #f0f9ff;
  border: 2px dashed #7dd3fc;
}

.empty-slot-num {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #0284c7;
  opacity: 0.6;
}

/* ─── Keyframe Animations ─────────────────────────────────── */
@keyframes trayBounceIn {
  0% {
    transform: scale(0.2) rotate(-10deg);
    opacity: 0;
  }
  70% {
    transform: scale(1.18) rotate(3deg);
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

/* ─── Compact Mode for Short Mobile Screens (e.g. iPhone SE, 667-700px) ── */
@media (max-height: 700px) {
  .bottom-controls {
    gap: 4px;
    padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
  }
  .world-subbar {
    padding: 1px 8px;
    gap: 4px;
  }
  .world-name-tag,
  .archetype-name-tag {
    font-size: 10px;
    padding: 2px 8px;
  }
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
  .tray-slots {
    padding: 5px;
    gap: 4px;
    border-radius: 16px;
  }
  .tray-tile,
  .empty-slot {
    max-height: 40px;
    border-radius: 10px;
  }
  .board-mat {
    padding: 6px 4px;
    border-radius: 16px;
  }
}

/* ─── Narrow Screen Optimizations (<= 360px width) ────────── */
@media (max-width: 360px) {
  .hud-container {
    padding: 4px 6px;
    gap: 4px;
  }
  .hud-username {
    max-width: 52px;
    font-size: 10px;
  }
  .hud-level-box {
    min-width: 72px;
  }
  .btn-trophy-text {
    display: none;
  }
  .hud-leaderboard-btn {
    padding: 4px 6px;
  }
  .hud-settings-btn {
    padding: 4px 6px;
  }
  .hud-score-chip {
    padding: 3px 6px;
  }
  .score-val {
    font-size: 11px;
  }
  .tray-container {
    width: 98vw;
  }
  .tray-slots {
    gap: 3px;
    padding: 4px;
  }
}
</style>