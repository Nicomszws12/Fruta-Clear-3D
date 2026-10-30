<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { IonPage, IonContent } from '@ionic/vue';
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
import type { ShopTab } from '../components/ShopModal.vue';

import GameHud from '../components/GameHud.vue';
import GameBackgroundDecor from '../components/GameBackgroundDecor.vue';
import GameBoard from '../components/GameBoard.vue';
import GameTray from '../components/GameTray.vue';
import GamePowerUps from '../components/GamePowerUps.vue';
import GameModalsHost from '../components/GameModalsHost.vue';

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
  isGoogleLinked,
  activeRecoveryCode,
  authenticateAndLoadProfile,
  registerNewUser,
  markTutorialCompleted,
  recordVerifiedLevelWin,
  saveProgress,
  claimVerifiedMissionReward,
  updateUsername,
  fetchLeaderboard,
  userCoins,
  activeBackground,
  linkGoogleAccount,
  generateSingleUseRecoveryCode,
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

watch(isAnyOverlayOpen, open => {
  if (open) pauseGame();
  else resumeGame();
});

// ─── Overlay & Gameplay Handlers ──────────────────────────────
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

const openShop = (tab: ShopTab = 'skins') => {
  playTap();
  shopInitialTab.value = tab;
  isShopOpen.value = true;
};

const openLeaderboard = async () => {
  playTap();
  isLeaderboardOpen.value = true;
  await fetchLeaderboard();
};

const handleUpdateName = async (newName: string) => {
  const ok = await updateUsername(newName);
  if (ok) await fetchLeaderboard();
};

const handleBuyPowerUpPack = async (pack: PowerUpPackDefinition) => {
  await shop.buyPowerUpPack(pack, rewards => grantBonusPowerUps(rewards));
};

const handleClaimMission = async (missionId: string) => {
  await dailyMissions.claimMissionReward(missionId, claimVerifiedMissionReward);
};

const handleSelectLevel = (lvl: number) => {
  level.value = lvl;
  score.value = 0;
  shop.initializeSkin();
  generateBoard();
};

// ─── Economy: Server-Verified First Win via Cloud Function (P0-2 & P1-2) ───
const lastCoinsEarned = ref(0);

watch(gameStatus, async status => {
  if (status === 'won') {
    const res = await recordVerifiedLevelWin(level.value, score.value);
    lastCoinsEarned.value = res.coinsGranted;
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
  } catch { /* Web fallback */ }

  try {
    await SplashScreen.hide();
  } catch { /* Web fallback */ }

  try {
    backButtonListener = await CapApp.addListener('backButton', () => {
      if (isTutorialOpen.value) isTutorialOpen.value = false;
      else if (isMissionsOpen.value) isMissionsOpen.value = false;
      else if (isShopOpen.value) isShopOpen.value = false;
      else if (isMapOpen.value) isMapOpen.value = false;
      else if (isLeaderboardOpen.value) isLeaderboardOpen.value = false;
      else if (isSettingsOpen.value) isSettingsOpen.value = false;
      else if (isPauseOpen.value) isPauseOpen.value = false;
      else if (gameStatus.value === 'playing' && !isWelcomeOpen.value) isPauseOpen.value = true;
    });

    appStateListener = await CapApp.addListener('appStateChange', ({ isActive }) => {
      setBackgroundMusicPaused(!isActive);
      if (!isActive) persistMidLevelState();
    });
  } catch { /* Web fallback */ }
};

onMounted(async () => {
  setupNativePlugins();
  const cached = getLocalSave();
  if (cached && typeof cached.currentLevel === 'number' && cached.currentLevel > 1) {
    level.value = cached.currentLevel;
  }
  score.value = 0;

  const result = await authenticateAndLoadProfile();
  if (result?.isNewUser) {
    isWelcomeOpen.value = true;
    return;
  }
  if (result) {
    level.value = result.savedLevel;
  }
  shop.initializeSkin();
  const restored = await restoreMidLevelState(level.value);
  if (!restored) generateBoard();
});

onUnmounted(() => {
  backButtonListener?.remove();
  appStateListener?.remove();
});
</script>

<template>
  <ion-page>
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
      @open-map="playTap(); isMapOpen = true"
      @open-settings="playTap(); isSettingsOpen = true"
      @open-missions="playTap(); isMissionsOpen = true"
      @open-pause="playTap(); isPauseOpen = true"
    />

    <ion-content class="game-background" :scroll-y="false">
      <div class="game-layout" :style="dynamicBgStyle">
        <GameBackgroundDecor
          :is-paused="isAnyOverlayOpen"
          :combo-banner="comboBanner"
        />

        <GameBoard
          :board-tiles="boardTiles"
          :grid-cols="gridCols"
          :grid-rows="gridRows"
          :hinted-tile-ids="hintedTileIds"
          :wiggling-tile-id="wigglingTileId"
          @select-tile="selectTile"
        />

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

    <GameModalsHost
      :is-welcome-open="isWelcomeOpen"
      :is-win-open="isWinOpen"
      :is-lose-open="isLoseOpen"
      :is-pause-open="isPauseOpen"
      :is-tutorial-open="isTutorialOpen"
      :is-missions-open="isMissionsOpen"
      :is-leaderboard-open="isLeaderboardOpen"
      :is-settings-open="isSettingsOpen"
      :is-shop-open="isShopOpen"
      :is-map-open="isMapOpen"
      :shop-initial-tab="shopInitialTab"
      :level="level"
      :score="score"
      :last-level-bonus="lastLevelBonus"
      :last-coins-earned="lastCoinsEarned"
      :username="username"
      :user-uid="userUid"
      :active-recovery-code="activeRecoveryCode"
      :is-google-linked="isGoogleLinked"
      :user-high-score="userHighScore"
      :user-current-level="userCurrentLevel"
      :user-rank="userRank"
      :is-leaderboard-loading="isLeaderboardLoading"
      :leaderboard-list="leaderboardList"
      :user-coins="userCoins"
      :missions="dailyMissions.missions.value"
      :shop-skins="shop.shopSkins"
      :shop-backgrounds="shop.shopBackgrounds"
      :shop-power-up-packs="shop.shopPowerUpPacks"
      :get-skin-status="shop.getSkinStatus"
      :get-background-status="shop.getBackgroundStatus"
      :can-afford="shop.canAfford"
      :on-update-name="handleUpdateName"
      :on-generate-recovery-code="generateSingleUseRecoveryCode"
      :on-link-google="linkGoogleAccount"
      :on-restore-by-code="restoreProfileByNicknameOrId"
      @update:is-tutorial-open="isTutorialOpen = $event"
      @update:is-missions-open="isMissionsOpen = $event"
      @update:is-leaderboard-open="isLeaderboardOpen = $event"
      @update:is-settings-open="isSettingsOpen = $event"
      @update:is-shop-open="isShopOpen = $event"
      @update:is-map-open="isMapOpen = $event"
      @welcome-submit="handleWelcomeSubmit"
      @tutorial-complete="handleTutorialComplete"
      @next-level="handleNextLevel"
      @retry-level="handleRetryLevel"
      @resume-pause="playTap(); isPauseOpen = false"
      @open-tutorial="isPauseOpen = false; isSettingsOpen = false; isTutorialOpen = true"
      @open-map-from-pause="isPauseOpen = false; isMapOpen = true"
      @claim-mission="handleClaimMission"
      @refresh-leaderboard="fetchLeaderboard"
      @buy-skin="shop.buySkin($event)"
      @buy-background="shop.buyBackground($event)"
      @buy-powerup-pack="handleBuyPowerUpPack"
      @equip-skin="shop.equipSkin($event)"
      @equip-background="shop.equipBackground($event)"
      @select-level="handleSelectLevel"
      @restored-level="handleSelectLevel"
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

.bottom-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 4px;
  flex-shrink: 0;
  z-index: 20;
  padding-bottom: max(4px, env(safe-area-inset-bottom, 0px));
}

@media (max-height: 670px) {
  .game-layout { padding: 2px 4px 0; }
  .bottom-controls { gap: 2px; padding-bottom: 2px; }
}
</style>
