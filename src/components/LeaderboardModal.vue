<script setup lang="ts">
import { ref } from 'vue';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonSpinner,
  alertController,
} from '@ionic/vue';
import type { LeaderboardUser } from '../game/types';

const props = defineProps<{
  isOpen: boolean;
  leaderboard: LeaderboardUser[];
  currentUserId: string;
  currentUsername: string;
  userHighScore: number;
  userCurrentLevel: number;
  userRank: number | null;
  isLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'refresh'): void;
  (e: 'update-name', newName: string): void;
}>();

const close = () => {
  emit('update:isOpen', false);
};

const handleRefresh = () => {
  emit('refresh');
};

const promptEditName = async () => {
  const alert = await alertController.create({
    header: 'Cambiar Apodo ✏️',
    message: 'Ingresa el nuevo nombre que verán los demás jugadores:',
    inputs: [
      {
        name: 'nameInput',
        type: 'text',
        placeholder: 'Tu Apodo',
        value: props.currentUsername,
        attributes: { maxlength: 18 },
      },
    ],
    buttons: [
      { text: 'Cancelar', role: 'cancel' },
      {
        text: 'Guardar',
        handler: (data: Record<string, string>) => {
          const clean = (data.nameInput || '').trim();
          if (clean && clean !== props.currentUsername) {
            emit('update-name', clean);
          }
        },
      },
    ],
  });
  await alert.present();
};

const formatScore = (num: number) => {
  return new Intl.NumberFormat('es-ES').format(num);
};
</script>

<template>
  <ion-modal
    :is-open="isOpen"
    :backdrop-dismiss="true"
    @didDismiss="close"
    class="leaderboard-modal"
  >
    <ion-header class="ion-no-border">
      <ion-toolbar class="modal-toolbar">
        <ion-title class="modal-title">
          <span class="title-icon">🏆</span>
          <span>Clasificación Global</span>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button
            fill="clear"
            @click="handleRefresh"
            :disabled="isLoading"
            class="refresh-btn"
          >
            <img v-if="!isLoading" src="/assets/ui/Extra/Default/icon_repeat_dark.png" class="ui-icon" alt="Refrescar" />
            <ion-spinner v-else name="crescent" class="btn-spinner"></ion-spinner>
          </ion-button>
          <ion-button fill="clear" @click="close" class="close-btn">
            <img src="/assets/ui/Red/Default/icon_cross.png" class="ui-icon" alt="Cerrar" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="modal-content" :scroll-y="true">
      <!-- Loading State -->
      <div v-if="isLoading && leaderboard.length === 0" class="loading-state">
        <ion-spinner name="bubbles" color="warning"></ion-spinner>
        <p>Cargando campeones...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="leaderboard.length === 0" class="empty-state">
        <span class="empty-icon">🎮</span>
        <p>Aún no hay puntuaciones registradas.</p>
        <p class="empty-sub">¡Sé el primero en completar un nivel y liderar el podio!</p>
      </div>

      <div v-else class="leaderboard-container">
        <!-- ════════ PODIUM (TOP 3) ════════ -->
        <div v-if="leaderboard.length >= 3" class="podium-section">
          <!-- 2nd Place (Silver) -->
          <div class="podium-col rank-2">
            <div class="podium-crown">🥈</div>
            <div class="podium-avatar">
              <span>{{ leaderboard[1].username.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="podium-name" :title="leaderboard[1].username">
              {{ leaderboard[1].username }}
            </div>
            <div class="podium-level">Nv. {{ leaderboard[1].currentLevel }}</div>
            <div class="podium-pillar pillar-2">
              <span class="pillar-rank">#2</span>
              <span class="pillar-score">{{ formatScore(leaderboard[1].highScore) }}</span>
            </div>
          </div>

          <!-- 1st Place (Gold) -->
          <div class="podium-col rank-1">
            <div class="podium-crown gold-crown">👑 🥇</div>
            <div class="podium-avatar gold-avatar">
              <span>{{ leaderboard[0].username.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="podium-name gold-name" :title="leaderboard[0].username">
              {{ leaderboard[0].username }}
            </div>
            <div class="podium-level">Nv. {{ leaderboard[0].currentLevel }}</div>
            <div class="podium-pillar pillar-1">
              <span class="pillar-rank">#1</span>
              <span class="pillar-score">{{ formatScore(leaderboard[0].highScore) }}</span>
            </div>
          </div>

          <!-- 3rd Place (Bronze) -->
          <div class="podium-col rank-3">
            <div class="podium-crown">🥉</div>
            <div class="podium-avatar">
              <span>{{ leaderboard[2].username.charAt(0).toUpperCase() }}</span>
            </div>
            <div class="podium-name" :title="leaderboard[2].username">
              {{ leaderboard[2].username }}
            </div>
            <div class="podium-level">Nv. {{ leaderboard[2].currentLevel }}</div>
            <div class="podium-pillar pillar-3">
              <span class="pillar-rank">#3</span>
              <span class="pillar-score">{{ formatScore(leaderboard[2].highScore) }}</span>
            </div>
          </div>
        </div>

        <!-- ════════ RANKING LIST (Pos 4+) ════════ -->
        <div class="ranking-list">
          <div
            v-for="(player, idx) in (leaderboard.length >= 3 ? leaderboard.slice(3) : leaderboard)"
            :key="player.uid"
            class="ranking-row"
            :class="{ 'is-current-user': player.uid === currentUserId }"
          >
            <div class="row-rank">
              <span class="rank-badge">
                #{{ leaderboard.length >= 3 ? idx + 4 : idx + 1 }}
              </span>
            </div>

            <div class="row-avatar">
              {{ player.username.charAt(0).toUpperCase() }}
            </div>

            <div class="row-info">
              <div class="row-name">
                <span>{{ player.username }}</span>
                <span v-if="player.uid === currentUserId" class="you-tag">TÚ</span>
              </div>
              <div class="row-meta">
                <span class="meta-level">Nivel {{ player.currentLevel }}</span>
              </div>
            </div>

            <div class="row-score">
              <span class="score-number">{{ formatScore(player.highScore) }}</span>
              <span class="score-label">pts</span>
            </div>
          </div>
        </div>
      </div>
    </ion-content>

    <!-- ════════ FIXED BOTTOM USER BAR ════════ -->
    <div class="user-footer-bar">
      <div class="user-footer-content">
        <div class="user-rank-box">
          <span class="user-rank-label">TU PUESTO</span>
          <span class="user-rank-value">
            {{ userRank ? `#${userRank}` : '—' }}
          </span>
        </div>

        <div class="user-profile-box">
          <div class="user-name-line">
            <span class="user-display-name">{{ currentUsername }}</span>
            <button class="edit-btn" @click="promptEditName" title="Editar Apodo">
              ✏️
            </button>
          </div>
          <span class="user-subtext">Récord: {{ formatScore(userHighScore) }} pts · Nv. {{ userCurrentLevel }}</span>
        </div>
      </div>
    </div>
  </ion-modal>
</template>

<style scoped>
/* ─── Modal Shell ─────────────────────────────────────────── */
.leaderboard-modal {
  --background: #f8fafc;
  --border-radius: 20px 20px 0 0;
}

.modal-toolbar {
  --background: #ffffff;
  --color: #1e293b;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--game-font, sans-serif);
  font-size: 15px;
  letter-spacing: 0.5px;
  font-weight: 900;
  color: #0f172a;
}

.title-icon {
  font-size: 20px;
}

.refresh-btn,
.close-btn {
  font-size: 18px;
  color: #64748b;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ui-icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  transition: transform 0.15s ease;
}

.refresh-btn:active .ui-icon,
.close-btn:active .ui-icon {
  transform: scale(0.85);
}

.btn-spinner {
  width: 18px;
  height: 18px;
}

/* ─── Content ─────────────────────────────────────────────── */
.modal-content {
  --background: #f1f5f9;
  --color: #334155;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
  text-align: center;
  color: #64748b;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.empty-sub {
  font-size: 13px;
  opacity: 0.7;
  margin-top: 4px;
}

.leaderboard-container {
  padding: 12px 14px 100px; /* bottom padding for fixed footer */
}

/* ─── Podium Section ──────────────────────────────────────── */
.podium-section {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  margin: 15px 0 24px;
  padding: 0 4px;
}

.podium-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  max-width: 105px;
}

.podium-crown {
  font-size: 22px;
  margin-bottom: 2px;
}

.gold-crown {
  font-size: 28px;
  animation: floatBounce 2s ease-in-out infinite;
}

@keyframes floatBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.podium-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 18px;
  border: 2px solid #fff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 6px;
  color: #334155;
}

.gold-avatar {
  width: 52px;
  height: 52px;
  font-size: 22px;
  background: linear-gradient(135deg, #fde047, #f59e0b);
  border: 3px solid #fff;
  box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
  color: #78350f;
}

.podium-name {
  font-size: 11px;
  font-weight: 700;
  color: #1e293b;
  max-width: 90px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.gold-name {
  font-size: 13px;
  color: #d97706;
  font-weight: 800;
}

.podium-level {
  font-size: 10px;
  color: #64748b;
  margin-bottom: 6px;
}

.podium-pillar {
  width: 100%;
  border-radius: 12px 12px 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.pillar-1 {
  height: 85px;
  background: linear-gradient(180deg, #fcd34d 0%, #f59e0b 100%);
  border: 1px solid #fde68a;
}

.pillar-2 {
  height: 65px;
  background: linear-gradient(180deg, #cbd5e1 0%, #94a3b8 100%);
  border: 1px solid #e2e8f0;
}

.pillar-3 {
  height: 50px;
  background: linear-gradient(180deg, #fb923c 0%, #c2410c 100%);
  border: 1px solid #fdba74;
}

.pillar-rank {
  font-family: var(--game-font, sans-serif);
  font-size: 16px;
  font-weight: 900;
  color: #ffffff;
}

.pillar-score {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 12px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.95);
  margin-top: 2px;
}

/* ─── Ranking List ────────────────────────────────────────── */
.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ranking-row {
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  border-radius: 14px;
  padding: 10px 12px;
  gap: 10px;
  transition: transform 0.15s, background 0.15s;
}

.ranking-row.is-current-user {
  background: #fffbeb;
  border: 1.5px solid #fcd34d;
}

.row-rank {
  min-width: 32px;
}

.rank-badge {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 13px;
  font-weight: 800;
  color: #64748b;
}

.row-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: #334155;
}

.row-info {
  flex: 1;
  min-width: 0;
}

.row-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.you-tag {
  background: #f59e0b;
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  padding: 1px 5px;
  border-radius: 6px;
}

.row-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}

.row-score {
  text-align: right;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.score-number {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 15px;
  font-weight: 800;
  color: #d97706;
}

.score-label {
  font-size: 9px;
  color: #94a3b8;
  text-transform: uppercase;
}

/* ─── Fixed User Footer ───────────────────────────────────── */
.user-footer-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 12px 16px;
  box-shadow: 0 -4px 15px rgba(0, 0, 0, 0.05);
}

.user-footer-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-rank-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 10px;
  padding: 6px 12px;
  min-width: 60px;
}

.user-rank-label {
  font-size: 8px;
  font-weight: 800;
  color: #d97706;
  letter-spacing: 0.5px;
}

.user-rank-value {
  font-family: var(--game-font, sans-serif);
  font-size: 16px;
  font-weight: 900;
  color: #b45309;
}

.user-profile-box {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.user-display-name {
  font-family: var(--game-font, sans-serif);
  font-size: 14px;
  font-weight: 800;
  color: #1e293b;
}

.edit-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  font-size: 13px;
  opacity: 0.8;
}

.edit-btn:active {
  transform: scale(0.9);
}

.user-subtext {
  font-size: 11px;
  color: #64748b;
  margin-top: 1px;
}
</style>

