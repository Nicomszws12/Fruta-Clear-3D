<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonContent,
  alertController,
} from '@ionic/vue';
import { useGameState } from '../composables/useGameState';
import { useFirebase } from '../composables/useFirebase';
import { useShop } from '../composables/useShop';
import { getAssetByKey } from '../game/tileAssets';
import { getBackgroundById } from '../game/shopCatalog';
import LeaderboardModal from '../components/LeaderboardModal.vue';
import GameDialog from '../components/GameDialog.vue';
import SettingsModal from '../components/SettingsModal.vue';
import ShopModal from '../components/ShopModal.vue';
import WorldMapModal from '../components/WorldMapModal.vue';
import { playTap } from '../game/sounds';

// ─── Composables ──────────────────────────────────────────────
const firebase = useFirebase();
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
  userCoins,
  activeSkin,
  activeBackground,
  unlockedSkins,
  unlockedBackgrounds,
  addCoins,
} = firebase;

const shop = useShop(firebase);

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

// ─── Shop Modal State ─────────────────────────────────────────
const isShopOpen = ref(false);

const openShop = () => {
  playTap();
  isShopOpen.value = true;
};

// ─── World Map Modal State ────────────────────────────────────
const isMapOpen = ref(false);

const openMap = () => {
  playTap();
  isMapOpen.value = true;
};

const handleSelectLevelFromMap = (lvl: number) => {
  level.value = lvl;
  score.value = 0;
  generateBoard();
};

// ─── Coins earned per level (10 coins per win) ────────────────
const COINS_PER_LEVEL = 10;
const lastCoinsEarned = ref(0);

// ─── Dynamic Background ──────────────────────────────────────
const dynamicBgStyle = computed(() => {
  const bg = getBackgroundById(activeBackground.value);
  if (!bg) return {};
  return {
    background: `
      radial-gradient(ellipse at 50% 15%, rgba(255, 255, 255, 0.22) 0%, transparent 65%),
      repeating-linear-gradient(
        -45deg,
        rgba(255, 255, 255, 0.05) 0px,
        rgba(255, 255, 255, 0.05) 24px,
        transparent 24px,
        transparent 48px
      ),
      ${bg.gradient}`,
    backgroundSize: '100% 100%, 48px 48px, 100% 100%',
  };
});

const dynamicBgColor = computed(() => {
  const bg = getBackgroundById(activeBackground.value);
  return bg?.accentColor || '#0284c7';
});

// ─── Win / Lose Alerts ────────────────────────────────────────
watch(gameStatus, async (status) => {
  if (status === 'won') {
    const nextLvl = level.value + 1;
    lastCoinsEarned.value = COINS_PER_LEVEL;
    await saveProgress(score.value, nextLvl);
    await addCoins(COINS_PER_LEVEL);
    isWinOpen.value = true;
  } else if (status === 'lost') {
    lastCoinsEarned.value = 0;
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
      // Initialize equipped skin rendering
      shop.initializeSkin();
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
            <span class="hud-username">{{ username }}</span>
          </div>

          <!-- Center: Currency & Score Chips -->
          <div class="hud-center-chips">
            <div class="hud-coin-chip" @click="openShop" title="Monedas — Abrir Tienda">
              <span class="coin-icon">🪙</span>
              <span class="coin-val">{{ formatScore(userCoins) }}</span>
            </div>

            <div class="hud-score-chip">
              <span class="score-coin">⭐</span>
              <span class="score-val">{{ formatScore(score) }}</span>
            </div>
          </div>

          <!-- Right: 4 Action Buttons -->
          <div class="hud-actions">
            <button class="hud-btn hud-map-btn" @click="openMap" title="Mapa de Mundos">
              <span class="btn-icon">🗺️</span>
            </button>

            <button class="hud-btn hud-shop-btn" @click="openShop" title="Tienda">
              <span class="btn-icon">🛒</span>
            </button>

            <button class="hud-btn hud-leaderboard-btn" @click="openLeaderboard" title="Tabla de Clasificación">
              <span class="btn-icon">🏆</span>
            </button>

            <button class="hud-btn hud-settings-btn" @click="openSettings" title="Ajustes de Juego">
              <span class="btn-icon">⚙️</span>
            </button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="game-background" :scroll-y="false">
      <div class="game-layout" :style="dynamicBgStyle">
        <!-- ════════ WORLD & LEVEL SUBBAR (Clickable to open World Map) ════════ -->
        <div class="world-subbar" @click="openMap" title="Ver Mapa de Mundos y Niveles">
          <div class="subbar-left">
            <span class="subbar-level-badge">⭐ Nv. {{ level }}</span>
            <span class="subbar-world-name">{{ worldName }}</span>
            <span class="subbar-map-icon">🗺️</span>
          </div>

          <div class="subbar-right">
            <div class="subbar-progress-track">
              <div
                class="subbar-progress-fill"
                :style="{ width: `${levelProgress * 100}%` }"
              ></div>
            </div>
            <span class="subbar-tiles-counter">
              {{ totalLevelTiles - remainingTiles }}/{{ totalLevelTiles }} fichas
            </span>
          </div>
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
      :coins-earned="lastCoinsEarned"
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

    <!-- ════════ SHOP MODAL ════════ -->
    <ShopModal
      :is-open="isShopOpen"
      :coins="userCoins"
      :shop-skins="shop.shopSkins"
      :shop-backgrounds="shop.shopBackgrounds"
      :get-skin-status="shop.getSkinStatus"
      :get-background-status="shop.getBackgroundStatus"
      :can-afford="shop.canAfford"
      @update:is-open="isShopOpen = $event"
      @buy-skin="shop.buySkin($event)"
      @buy-background="shop.buyBackground($event)"
      @equip-skin="shop.equipSkin($event)"
      @equip-background="shop.equipBackground($event)"
    />

    <!-- ════════ WORLD MAP MODAL ════════ -->
    <WorldMapModal
      :is-open="isMapOpen"
      :current-level="level"
      :max-unlocked-level="userCurrentLevel"
      @update:is-open="isMapOpen = $event"
      @select-level="handleSelectLevelFromMap"
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

/* Left Profile */
.hud-profile {
  display: flex;
  align-items: center;
  gap: 5px;
  background: #f0f9ff;
  border: 1.5px solid #bae6fd;
  box-shadow: 0 2px 0 #7dd3fc;
  border-radius: 14px;
  padding: 2px 6px 2px 3px;
  cursor: pointer;
  flex-shrink: 0;
  max-width: 84px;
  transition: transform 0.1s;
}

.hud-profile:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 #7dd3fc;
}

.hud-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
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
  max-width: 52px;
}

/* Center Currency Chips */
.hud-center-chips {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 1;
  min-width: 0;
}

/* Coin Chip */
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

/* Score Chip */
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

/* Right Actions */
.hud-actions {
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
}

.hud-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
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
  font-size: 13px;
  line-height: 1;
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

.hud-settings-btn {
  background: #0ea5e9;
  border: 1.5px solid #0284c7;
  box-shadow: 0 2px 0 #0369a1;
}

/* ─── World & Level Subbar ────────────────────────────────── */
.world-subbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 12px);
  max-width: 440px;
  margin: 4px auto 2px;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.94);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  border-radius: 14px;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  cursor: pointer;
  flex-shrink: 0;
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
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
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

  /* Crisp, high-performance static arcade background */
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
  background-size: 100% 100%, 48px 48px, 100% 100%;
}

/* ─── Floating Background Decorations ─────────────────────── */
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
  padding: 2px 4px;
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
  padding: 8px 6px;
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
  max-width: 98vw;
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
  /* Dynamic Responsive Tile Size: enlarged to maximize visibility and ease of tapping */
  --tile-size: min(
    calc((100vw - 20px) / var(--grid-cols)),
    calc((100dvh - 200px) / var(--grid-rows)),
    calc((100vh - 200px) / var(--grid-rows)),
    64px
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
  transform: translateZ(0);
  will-change: transform;
  transition: transform 0.1s ease, opacity 0.1s ease;
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
  font-size: calc(var(--tile-size) * 0.62);
  line-height: 1;
  pointer-events: none;
}

.tile-img {
  width: 76%;
  height: 76%;
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
  background: rgba(255, 255, 255, 0.98);
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
  max-height: 54px;
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
  font-size: min(5.5vw, 26px);
}

.tray-tile .tile-img {
  width: 72%;
  height: 72%;
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
    padding: 3px 4px;
    gap: 3px;
  }
  .hud-username {
    max-width: 48px;
    font-size: 9px;
  }
  .hud-level-box {
    min-width: 60px;
  }
  .hud-leaderboard-btn,
  .hud-settings-btn {
    width: 26px;
    height: 26px;
  }
  .hud-score-chip {
    padding: 2px 4px;
  }
  .score-val {
    font-size: 10px;
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