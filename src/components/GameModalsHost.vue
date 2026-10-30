<script setup lang="ts">
import { alertController } from '@ionic/vue';
import type {
  DailyMission,
  LeaderboardUser,
  SkinDefinition,
  BackgroundDefinition,
  PowerUpPackDefinition,
  ItemStatus,
} from '../game/types';
import type { LevelStarsBreakdown } from '../composables/useGameState';
import LeaderboardModal from './LeaderboardModal.vue';
import GameDialog from './GameDialog.vue';
import SettingsModal from './SettingsModal.vue';
import ShopModal, { type ShopTab } from './ShopModal.vue';
import WorldMapModal from './WorldMapModal.vue';
import TutorialModal from './TutorialModal.vue';
import DailyMissionsModal from './DailyMissionsModal.vue';

const props = defineProps<{
  isWelcomeOpen: boolean;
  isWinOpen: boolean;
  isLoseOpen: boolean;
  isPauseOpen: boolean;
  isTutorialOpen: boolean;
  isMissionsOpen: boolean;
  isLeaderboardOpen: boolean;
  isSettingsOpen: boolean;
  isShopOpen: boolean;
  isMapOpen: boolean;
  shopInitialTab: ShopTab;
  level: number;
  score: number;
  lastLevelBonus: { base: number; powerups: number; comboTotal?: number; total: number };
  lastLevelStars: LevelStarsBreakdown;
  levelStarsMap: Record<number, number>;
  lastCoinsEarned: number;
  loseReason?: 'tray_full' | 'deadlock';
  unclaimedMissionsCount: number;
  username: string;
  userUid: string;
  activeRecoveryCode: string;
  isGoogleLinked: boolean;
  userHighScore: number;
  userCurrentLevel: number;
  userRank: number | null;
  isLeaderboardLoading: boolean;
  leaderboardList: LeaderboardUser[];
  userCoins: number;
  missions: DailyMission[];
  shopSkins: SkinDefinition[];
  shopBackgrounds: BackgroundDefinition[];
  shopPowerUpPacks: PowerUpPackDefinition[];
  getSkinStatus: (id: string) => ItemStatus;
  getBackgroundStatus: (id: string) => ItemStatus;
  canAfford: (price: number) => boolean;
  onUpdateName: (name: string) => Promise<void>;
  onGenerateRecoveryCode: () => Promise<{ success: boolean; code?: string; message: string }>;
  onLinkGoogle: () => Promise<{ success: boolean; message: string }>;
  onRestoreByCode: (code: string) => Promise<{
    success: boolean;
    restoredLevel?: number;
    message: string;
  }>;
}>();

const emit = defineEmits<{
  (e: 'update:isTutorialOpen', val: boolean): void;
  (e: 'update:isMissionsOpen', val: boolean): void;
  (e: 'update:isLeaderboardOpen', val: boolean): void;
  (e: 'update:isSettingsOpen', val: boolean): void;
  (e: 'update:isShopOpen', val: boolean): void;
  (e: 'update:isMapOpen', val: boolean): void;
  (e: 'welcome-submit', name: string): void;
  (e: 'tutorial-complete'): void;
  (e: 'next-level'): void;
  (e: 'retry-level'): void;
  (e: 'resume-pause'): void;
  (e: 'open-home'): void;
  (e: 'open-tutorial'): void;
  (e: 'open-map-from-pause'): void;
  (e: 'open-missions-from-pause'): void;
  (e: 'open-shop-from-pause'): void;
  (e: 'open-leaderboard-from-pause'): void;
  (e: 'open-settings-from-pause'): void;
  (e: 'claim-mission', id: string): void;
  (e: 'refresh-leaderboard'): void;
  (e: 'buy-skin', skin: SkinDefinition): void;
  (e: 'buy-background', bg: BackgroundDefinition): void;
  (e: 'buy-powerup-pack', pack: PowerUpPackDefinition): void;
  (e: 'equip-skin', skin: SkinDefinition): void;
  (e: 'equip-background', bg: BackgroundDefinition): void;
  (e: 'select-level', lvl: number): void;
  (e: 'restored-level', lvl: number): void;
}>();

const promptEditNameFromSettings = async () => {
  emit('update:isSettingsOpen', false);
  const alert = await alertController.create({
    header: 'Cambiar Apodo ✏️',
    message: 'Ingresa el nuevo nombre que verán los demás jugadores:',
    inputs: [
      {
        name: 'nameInput',
        type: 'text',
        placeholder: 'Tu Apodo',
        value: props.username,
        attributes: { maxlength: 18 },
      },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Guardar',
        handler: async (data: Record<string, string>) => {
          const clean = (data.nameInput || '').trim();
          if (clean && clean !== props.username) {
            await props.onUpdateName(clean);
          }
        },
      },
    ],
  });
  await alert.present();
};

const handleGenerateRecoveryCode = async () => {
  const res = await props.onGenerateRecoveryCode();
  const alert = await alertController.create({
    header: res.success ? 'Código de 1 Uso 🔐' : 'Aviso',
    message: res.code ? `${res.message}\n\nCódigo: ${res.code}` : res.message,
    buttons: ['Aceptar'],
  });
  await alert.present();
};

const handleLinkGoogle = async () => {
  const res = await props.onLinkGoogle();
  const alert = await alertController.create({
    header: res.success ? 'Google Vinculado ✅' : 'Aviso',
    message: res.message,
    buttons: ['Aceptar'],
  });
  await alert.present();
};

const promptRestoreProgressFromSettings = async () => {
  emit('update:isSettingsOpen', false);
  const alert = await alertController.create({
    header: 'Canjear Código de 1 Uso 🔄',
    subHeader: 'Verificación de Un Solo Uso',
    message:
      'Ingresa el Código de Recuperación de un solo uso (formato FC3D-XXXX-XXXX) que generaste en tu dispositivo anterior:',
    inputs: [
      {
        name: 'targetInput',
        type: 'text',
        placeholder: 'FC3D-XXXX-XXXX',
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
            header: 'Confirmar Canje Único ⚠️',
            message:
              'Este código quedará invalidado tras el canje y sincronizará el progreso en tu sesión actual. ¿Deseas continuar?',
            buttons: [
              { text: 'Cancelar', role: 'cancel' },
              {
                text: 'Sí, Canjear',
                handler: async () => {
                  const res = await props.onRestoreByCode(target);
                  const feedbackAlert = await alertController.create({
                    header: res.success ? '¡Canje Exitoso! 🎉' : 'Aviso de Seguridad',
                    message: res.message,
                    buttons: ['Aceptar'],
                  });
                  await feedbackAlert.present();
                  if (res.success && typeof res.restoredLevel === 'number') {
                    emit('restored-level', res.restoredLevel);
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
</script>

<template>
  <!-- ════════ CUSTOM DIALOGS ════════ -->
  <GameDialog
    :is-open="isWelcomeOpen"
    variant="welcome"
    @submit="emit('welcome-submit', $event)"
  />

  <GameDialog
    :is-open="isWinOpen"
    variant="win"
    :level="level"
    :bonus="lastLevelBonus"
    :stars-breakdown="lastLevelStars"
    :coins-earned="lastCoinsEarned"
    @next="emit('next-level')"
    @retry="emit('retry-level')"
  />

  <GameDialog
    :is-open="isLoseOpen"
    variant="lose"
    :level="level"
    :score="score"
    :lose-reason="loseReason"
    @retry="emit('retry-level')"
  />

  <GameDialog
    :is-open="isPauseOpen"
    variant="pause"
    :level="level"
    :score="score"
    :unclaimed-missions-count="unclaimedMissionsCount"
    @resume="emit('resume-pause')"
    @open-home="emit('open-home')"
    @retry="emit('retry-level')"
    @open-tutorial="emit('open-tutorial')"
    @open-map="emit('open-map-from-pause')"
    @open-missions="emit('open-missions-from-pause')"
    @open-shop="emit('open-shop-from-pause')"
    @open-leaderboard="emit('open-leaderboard-from-pause')"
    @open-settings="emit('open-settings-from-pause')"
  />

  <!-- ════════ TUTORIAL MODAL (3 STEPS) ════════ -->
  <TutorialModal
    :is-open="isTutorialOpen"
    @update:is-open="emit('update:isTutorialOpen', $event)"
    @complete="emit('tutorial-complete')"
  />

  <!-- ════════ DAILY MISSIONS MODAL ════════ -->
  <DailyMissionsModal
    :is-open="isMissionsOpen"
    :missions="missions"
    @update:is-open="emit('update:isMissionsOpen', $event)"
    @claim="emit('claim-mission', $event)"
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
    @update:is-open="emit('update:isLeaderboardOpen', $event)"
    @refresh="emit('refresh-leaderboard')"
    @update-name="props.onUpdateName($event)"
  />

  <!-- ════════ SETTINGS MODAL ════════ -->
  <SettingsModal
    :is-open="isSettingsOpen"
    :username="username"
    :active-recovery-code="activeRecoveryCode"
    :is-google-linked="isGoogleLinked"
    :current-level="level"
    @update:is-open="emit('update:isSettingsOpen', $event)"
    @edit-name="promptEditNameFromSettings"
    @generate-recovery-code="handleGenerateRecoveryCode"
    @link-google="handleLinkGoogle"
    @restore-progress="promptRestoreProgressFromSettings"
    @open-tutorial="emit('open-tutorial')"
  />

  <!-- ════════ SHOP MODAL ════════ -->
  <ShopModal
    :is-open="isShopOpen"
    :coins="userCoins"
    :shop-skins="shopSkins"
    :shop-backgrounds="shopBackgrounds"
    :shop-power-up-packs="shopPowerUpPacks"
    :get-skin-status="getSkinStatus"
    :get-background-status="getBackgroundStatus"
    :can-afford="canAfford"
    :initial-tab="shopInitialTab"
    @update:is-open="emit('update:isShopOpen', $event)"
    @buy-skin="emit('buy-skin', $event)"
    @buy-background="emit('buy-background', $event)"
    @buy-powerup-pack="emit('buy-powerup-pack', $event)"
    @equip-skin="emit('equip-skin', $event)"
    @equip-background="emit('equip-background', $event)"
  />

  <!-- ════════ WORLD MAP MODAL ════════ -->
  <WorldMapModal
    :is-open="isMapOpen"
    :current-level="level"
    :max-unlocked-level="userCurrentLevel"
    :level-stars-map="levelStarsMap"
    @update:is-open="emit('update:isMapOpen', $event)"
    @select-level="emit('select-level', $event)"
  />
</template>
