<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { IonPage, IonContent, alertController } from '@ionic/vue';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';

import { useGameState } from '../composables/useGameState';
import { useFirebase } from '../composables/useFirebase';
import { useShop } from '../composables/useShop';
import { useDailyMissions } from '../composables/useDailyMissions';
import { getBackgroundById } from '../game/shopCatalog';
import { playTap, setBackgroundMusicPaused } from '../game/sounds';
import type { PowerUpPackDefinition } from '../game/types';

import GameHud from '../components/GameHud.vue';
import GameBoard from '../components/GameBoard.vue';
import GameTray from '../components/GameTray.vue';
import GamePowerUps from '../components/GamePowerUps.vue';
import LeaderboardModal from '../components/LeaderboardModal.vue';
import GameDialog from '../components/GameDialog.vue';
import SettingsModal from '../components/SettingsModal.vue';
import ShopModal, { type ShopTab } from '../components/ShopModal.vue';
import WorldMapModal from '../components/WorldMapModal.vue';
import TutorialModal from '../components/TutorialModal.vue';
import DailyMissionsModal from '../components/DailyMissionsModal.vue';

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
  tutorialCompleted,
  authenticateAndLoadProfile,
  registerNewUser,
  markTutorialCompleted,
  saveProgress,
  updateUsername,
  fetchLeaderboard,
  userCoins,
  activeBackground,
  addCoins,
  restoreProfileByNicknameOrId,
  getLocalSave,
} = firebase;

const shop = useShop(firebase);
const dailyMissions = useDailyMissions();

const {
  boardTiles,
  tray,
  score,
  level,
  moveHistory,
  powerUpState,
  gameStatus,
  hintedTileIds,
  wigglingTileId,
  isAnimating,
  MAX_TRAY,
  canUseHint,
  totalLevelTiles,
  remainingTiles,
  levelProgress,
  isTrayCritical,
  comboBanner,
  lastLevelBonus,
  gridCols,
  gridRows,
  worldName,
  generateBoard,
  selectTile,
  undoMove,
  shuffleBoard,
  autoMatch,
  nextLevel,
  retryLevel,
  pauseGame,
  resumeGame,
  grantBonusPowerUps,
  persistMidLevelState,
  restoreMidLevelState,
} = useGameState();

// ─── Dialog & Modal States ────────────────────────────────────
const isWelcomeOpen = ref(false);
const isWinOpen = ref(false);
const isLoseOpen = ref(false);
const isPauseOpen = ref(false);
const isLeaderboardOpen = ref(false);
const isSettingsOpen = ref(false);
const isShopOpen = ref(false);
const shopInitialTab = ref<ShopTab>('skins');
const isMapOpen = ref(false);
const isTutorialOpen = ref(false);
const isMissionsOpen = ref(false);

const isAnyOverlayOpen = computed(
  () =>
    isWelcomeOpen.value ||
    isWinOpen.value ||
    isLoseOpen.value ||
    isPauseOpen.value ||
    isLeaderboardOpen.value ||
    isSettingsOpen.value ||
    isShopOpen.value ||
    isMapOpen.value ||
    isTutorialOpen.value ||
    isMissionsOpen.value,
);

// Auto-pause game combo clock whenever any modal/dialog is open
watch(isAnyOverlayOpen, open => {
  if (open) {
    pauseGame();
  } else {
    resumeGame();
  }
});

// ─── Welcome & Tutorial Handlers ──────────────────────────────
const handleWelcomeSubmit = async (name: string) => {
  isWelcomeOpen.value = false;
  await registerNewUser(name);
  generateBoard();
  if (!tutorialCompleted.value) {
    isTutorialOpen.value = true;
  }
};

const handleTutorialComplete = () => {
  markTutorialCompleted();
  isTutorialOpen.value = false;
};

// ─── Win / Lose / Pause Handlers ──────────────────────────────
const handleNextLevel = () => {
  isWinOpen.value = false;
  nextLevel();
};

const handleRetryLevel = () => {
  isWinOpen.value = false;
  isLoseOpen.value = false;
  isPauseOpen.value = false;
  score.value = 0;
  retryLevel();
};

const openPause = () => {
  playTap();
  isPauseOpen.value = true;
};

const handleResumeFromPause = () => {
  playTap();
  isPauseOpen.value = false;
};

const handleOpenTutorialFromOverlay = () => {
  isPauseOpen.value = false;
  isSettingsOpen.value = false;
  isTutorialOpen.value = true;
};

const handleOpenMapFromPause = () => {
  isPauseOpen.value = false;
  isMapOpen.value = true;
};

// ─── Leaderboard Handlers ─────────────────────────────────────
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

// ─── Settings & Secure Recovery Handlers ──────────────────────
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

// P0-1 Security Fix: Require private UID recovery code + confirmation
const promptRestoreProgressFromSettings = async () => {
  isSettingsOpen.value = false;
  const alert = await alertController.create({
    header: 'Recuperar Partida 🔄',
    subHeader: 'Verificación por Código Privado',
    message:
      'Por seguridad, ingresa tu Código de Recuperación privado (ID de 28 caracteres que copiaste en Ajustes):',
    inputs: [
      {
        name: 'targetInput',
        type: 'text',
        placeholder: 'Código de Recuperación (UID)',
      },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Verificar',
        handler: async (data: Record<string, string>) => {
          const target = (data.targetInput || '').trim();
          if (!target) return;

          const confirmAlert = await alertController.create({
            header: 'Confirmar Restauración ⚠️',
            message:
              '¿Deseas reemplazar el progreso actual de este dispositivo con la cuenta del código ingresado?',
            buttons: [
              { text: 'Cancelar', role: 'cancel' },
              {
                text: 'Sí, Restaurar',
                handler: async () => {
                  const res = await restoreProfileByNicknameOrId(target);
                  const feedbackAlert = await alertController.create({
                    header: res.success ? '¡Éxito! 🎉' : 'Aviso de Seguridad',
                    message: res.message,
                    buttons: ['Aceptar'],
                  });
                  await feedbackAlert.present();
                  if (res.success && typeof res.restoredLevel === 'number') {
                    level.value = res.restoredLevel;
                    score.value = 0;
                    shop.initializeSkin();
                    generateBoard();
                  }
                },
              },
            ],
          });
          await confirmAlert.present();
        },
      },
    ],
  });
  await alert.present();
};

// ─── Shop & Power-Up Packs Handlers ───────────────────────────
const openShop = (tab: ShopTab = 'skins') => {
  playTap();
  shopInitialTab.value = tab;
  isShopOpen.value = true;
};

const handleBuyPowerUpPack = async (pack: PowerUpPackDefinition) => {
  await shop.buyPowerUpPack(pack, rewards => {
    grantBonusPowerUps(rewards);
  });
};

// ─── Daily Missions Handlers ──────────────────────────────────
const openMissions = () => {
  playTap();
  isMissionsOpen.value = true;
};

const handleClaimMission = async (missionId: string) => {
  await dailyMissions.claimMissionReward(missionId, addCoins);
};

// ─── World Map Handlers ───────────────────────────────────────
const openMap = () => {
  playTap();
  isMapOpen.value = true;
};

const handleSelectLevelFromMap = (lvl: number) => {
  level.value = lvl;
  score.value = 0;
  generateBoard();
};

// ─── Economy: Coins only on First Win of a Level (P1-2) ──────
const COINS_PER_LEVEL = 10;
const lastCoinsEarned = ref(0);

watch(gameStatus, async status => {
  if (status === 'won') {
    const isFirstWinOfLevel = level.value >= userCurrentLevel.value;
    const nextLvl = Math.max(userCurrentLevel.value, level.value + 1);
    const coinsToGrant = isFirstWinOfLevel ? COINS_PER_LEVEL : 0;

    lastCoinsEarned.value = coinsToGrant;
    await saveProgress(score.value, nextLvl);
    if (coinsToGrant > 0) {
      await addCoins(coinsToGrant);
    }
    isWinOpen.value = true;
  } else if (status === 'lost') {
    lastCoinsEarned.value = 0;
    await saveProgress(score.value, userCurrentLevel.value);
    isLoseOpen.value = true;
  }
});

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

// ─── Capacitor Native Lifecycle & Back Button (P1-5) ─────────
let backButtonListener: { remove: () => Promise<void> } | null = null;
let appStateListener: { remove: () => Promise<void> } | null = null;

const setupNativePlugins = async () => {
  try {
    await StatusBar.setStyle({ style: StatusBarStyle.Light });
    await StatusBar.setBackgroundColor({ color: '#0284c7' });
  } catch {
    // Web environment fallback
  }

  try {
    await SplashScreen.hide();
  } catch {
    // Web environment fallback
  }

  try {
    backButtonListener = await CapApp.addListener('backButton', () => {
      if (isTutorialOpen.value) {
        isTutorialOpen.value = false;
      } else if (isMissionsOpen.value) {
        isMissionsOpen.value = false;
      } else if (isShopOpen.value) {
        isShopOpen.value = false;
      } else if (isMapOpen.value) {
        isMapOpen.value = false;
      } else if (isLeaderboardOpen.value) {
        isLeaderboardOpen.value = false;
      } else if (isSettingsOpen.value) {
        isSettingsOpen.value = false;
      } else if (isPauseOpen.value) {
        isPauseOpen.value = false;
      } else if (gameStatus.value === 'playing' && !isWelcomeOpen.value) {
        isPauseOpen.value = true;
      }
    });

    appStateListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
      setBackgroundMusicPaused(!isActive);
      if (!isActive) {
        persistMidLevelState();
      }
    });
  } catch {
    // Ignore if Capacitor App plugin not active
  }
};

// ─── Init ─────────────────────────────────────────────────────
onMounted(async () => {
  setupNativePlugins();

  // Pre-load local level immediately (session score starts at 0, separated from highScore)
  const cached = getLocalSave();
  if (cached && typeof cached.currentLevel === 'number' && cached.currentLevel > 1) {
    level.value = cached.currentLevel;
  }
  score.value = 0;

  const result = await authenticateAndLoadProfile();
  if (result) {
    if (result.isNewUser) {
      isWelcomeOpen.value = true;
    } else {
      level.value = result.savedLevel;
      shop.initializeSkin();
      const restored = await restoreMidLevelState(level.value);
      if (!restored) {
        generateBoard();
      }
    }
  } else {
    shop.initializeSkin();
    const restored = await restoreMidLevelState(level.value);
    if (!restored) {
      generateBoard();
    }
  }
});

onUnmounted(() => {
  backButtonListener?.remove();
  appStateListener?.remove();
});
</script>

<template>
  <ion-page>
    <!-- ════════ HEADER GAMER (HUD + SUBBAR) ════════ -->
    <GameHud
      :username="username"
      :user-coins="userCoins"
      :score="score"
      :high-score="userHighScore"
      :level="level"
      :world-name="worldName"
      :level-progress="levelProgress"
      :cleared-tiles="totalLevelTiles - remainingTiles"
      :total-level-tiles="totalLevelTiles"
      :unclaimed-missions-count="dailyMissions.unclaimedCount.value"
      @open-leaderboard="openLeaderboard"
      @open-shop="openShop('skins')"
      @open-map="openMap"
      @open-settings="openSettings"
      @open-missions="openMissions"
      @open-pause="openPause"
    />

    <ion-content class="game-background" :scroll-y="false">
      <div class="game-layout" :style="dynamicBgStyle">
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
          :class="{ 'is-paused': isAnyOverlayOpen }"
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

        <!-- ════════ BOARD MAT / ARENA ════════ -->
        <GameBoard
          :board-tiles="boardTiles"
          :grid-cols="gridCols"
          :grid-rows="gridRows"
          :hinted-tile-ids="hintedTileIds"
          :wiggling-tile-id="wigglingTileId"
          @select-tile="selectTile"
        />

        <!-- ════════ BOTTOM CONTROLS (POWERUPS + TRAY) ════════ -->
        <div class="bottom-controls">
          <GamePowerUps
            :power-up-state="powerUpState"
            :can-undo="moveHistory.length > 0 && powerUpState.undoCount > 0"
            :can-shuffle="boardTiles.length > 0 && powerUpState.shuffleCount > 0"
            :can-use-hint="canUseHint"
            :is-animating="isAnimating"
            @undo="undoMove"
            @shuffle="shuffleBoard"
            @hint="autoMatch"
            @open-powerup-shop="openShop('powerups')"
          />

          <GameTray
            :tray="tray"
            :max-tray="MAX_TRAY"
            :is-tray-critical="isTrayCritical"
          />
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

    <GameDialog
      :is-open="isPauseOpen"
      variant="pause"
      :level="level"
      @resume="handleResumeFromPause"
      @retry="handleRetryLevel"
      @open-tutorial="handleOpenTutorialFromOverlay"
      @open-map="handleOpenMapFromPause"
    />

    <!-- ════════ TUTORIAL MODAL (3 STEPS) ════════ -->
    <TutorialModal
      :is-open="isTutorialOpen"
      @update:is-open="isTutorialOpen = $event"
      @complete="handleTutorialComplete"
    />

    <!-- ════════ DAILY MISSIONS MODAL ════════ -->
    <DailyMissionsModal
      :is-open="isMissionsOpen"
      :missions="dailyMissions.missions.value"
      @update:is-open="isMissionsOpen = $event"
      @claim="handleClaimMission"
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
      :user-uid="userUid"
      :current-level="level"
      @update:is-open="isSettingsOpen = $event"
      @edit-name="promptEditNameFromSettings"
      @restore-progress="promptRestoreProgressFromSettings"
      @open-tutorial="handleOpenTutorialFromOverlay"
    />

    <!-- ════════ SHOP MODAL ════════ -->
    <ShopModal
      :is-open="isShopOpen"
      :coins="userCoins"
      :shop-skins="shop.shopSkins"
      :shop-backgrounds="shop.shopBackgrounds"
      :shop-power-up-packs="shop.shopPowerUpPacks"
      :get-skin-status="shop.getSkinStatus"
      :get-background-status="shop.getBackgroundStatus"
      :can-afford="shop.canAfford"
      :initial-tab="shopInitialTab"
      @update:is-open="isShopOpen = $event"
      @buy-skin="shop.buySkin($event)"
      @buy-background="shop.buyBackground($event)"
      @buy-powerup-pack="handleBuyPowerUpPack"
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
.game-background {
  --background: #0284c7;
  --overflow: hidden;
  overflow: hidden;
  height: 100%;
}

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

/* ─── Bottom Controls Container ───────────────────────────── */
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

@media (max-height: 700px) {
  .bottom-controls {
    gap: 4px;
    padding-bottom: max(4px, env(safe-area-inset-bottom, 4px));
  }
}
</style>
