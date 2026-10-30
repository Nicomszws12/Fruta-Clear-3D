<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="isOpen"
        class="dialog-backdrop"
        role="dialog"
        aria-modal="true"
        @click.self="variant === 'pause' ? $emit('resume') : undefined"
      >
        <!-- Confetti for win celebration -->
        <div v-if="variant === 'win'" class="confetti-container" aria-hidden="true">
          <div v-for="i in 36" :key="i" class="confetti" :style="getConfettiStyle(i)"></div>
        </div>

        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card" :class="`variant-${variant}`">
            <!-- ════════════════ WIN DIALOG (Kenney Blue Reward Card + 3 Stars #4) ════════════════ -->
            <template v-if="variant === 'win'">
              <div
                class="stars-crown"
                role="img"
                :aria-label="`${earnedStarsCount} de 3 estrellas obtenidas`"
              >
                <div class="star-wrapper star-left" :class="{ 'is-earned': earnedStarsCount >= 1 }">
                  <img
                    :src="earnedStarsCount >= 1 ? '/assets/ui/Yellow/Double/star.png' : '/assets/ui/Grey/Double/star.png'"
                    alt=""
                    class="star-img"
                  />
                </div>
                <div class="star-wrapper star-center" :class="{ 'is-earned': earnedStarsCount >= 2 }">
                  <img
                    :src="earnedStarsCount >= 2 ? '/assets/ui/Yellow/Double/star.png' : '/assets/ui/Grey/Double/star.png'"
                    alt=""
                    class="star-img star-big"
                  />
                </div>
                <div class="star-wrapper star-right" :class="{ 'is-earned': earnedStarsCount >= 3 }">
                  <img
                    :src="earnedStarsCount >= 3 ? '/assets/ui/Yellow/Double/star.png' : '/assets/ui/Grey/Double/star.png'"
                    alt=""
                    class="star-img"
                  />
                </div>
              </div>

              <div class="card-title">
                <h2>NIVEL {{ level || 1 }}</h2>
              </div>

              <div class="inner-box gold-border">
                <span class="box-subtitle">
                  {{ (coinsEarned ?? 10) > 0 ? 'TU RECOMPENSA' : 'NIVEL REJUGADO (SIN MONEDAS EXTRA)' }}
                </span>
                <div class="reward-pts">+{{ formatScore(bonus?.total || 0) }} PTS</div>

                <!-- #4 3-Star Objectives Breakdown -->
                <div class="stars-criteria-row">
                  <div
                    class="criteria-pill"
                    :class="{ 'is-met': starsBreakdown?.noCriticalTray ?? true }"
                  >
                    <span class="criteria-star">
                      {{ (starsBreakdown?.noCriticalTray ?? true) ? '⭐' : '☆' }}
                    </span>
                    <span class="criteria-label">Bandeja segura</span>
                  </div>
                  <div
                    class="criteria-pill"
                    :class="{ 'is-met': starsBreakdown?.noPowerUpsUsed ?? true }"
                  >
                    <span class="criteria-star">
                      {{ (starsBreakdown?.noPowerUpsUsed ?? true) ? '⭐' : '☆' }}
                    </span>
                    <span class="criteria-label">Sin ayudas</span>
                  </div>
                  <div
                    class="criteria-pill"
                    :class="{ 'is-met': starsBreakdown?.reachedCombo2 ?? true }"
                  >
                    <span class="criteria-star">
                      {{ (starsBreakdown?.reachedCombo2 ?? true) ? '⭐' : '☆' }}
                    </span>
                    <span class="criteria-label">Combo x2+</span>
                  </div>
                </div>

                <div class="bonus-details">
                  <div class="bonus-tag">
                    <span class="tag-label">Base</span>
                    <span class="tag-val">+{{ bonus?.base || 0 }}</span>
                  </div>
                  <div class="bonus-tag">
                    <span class="tag-label">Power-ups</span>
                    <span class="tag-val">+{{ bonus?.powerups || 0 }}</span>
                  </div>
                  <div class="bonus-tag bonus-coins">
                    <span class="tag-label">🪙 Monedas</span>
                    <span class="tag-val">+{{ coinsEarned ?? 10 }}</span>
                  </div>
                </div>
              </div>

              <div class="bottom-action-buttons">
                <button
                  type="button"
                  class="round-btn round-yellow"
                  @click="$emit('retry')"
                  title="Repetir Nivel"
                  aria-label="Repetir Nivel"
                >
                  <img src="/assets/ui/Extra/Double/icon_repeat_dark.png" alt="Reintentar" class="round-icon" />
                </button>
                <button
                  type="button"
                  class="round-btn round-yellow play-btn"
                  @click="$emit('next')"
                  title="Siguiente Nivel"
                  aria-label="Siguiente Nivel"
                >
                  <img src="/assets/ui/Extra/Double/icon_play_dark.png" alt="Siguiente" class="round-icon play-icon" />
                </button>
              </div>
            </template>

            <!-- ════════════════ LOSE DIALOG (Kenney Red Warning Card) ════════════════ -->
            <template v-else-if="variant === 'lose'">
              <div class="stars-crown" aria-hidden="true">
                <div class="star-wrapper star-left">
                  <img src="/assets/ui/Grey/Double/star.png" alt="" class="star-img" />
                </div>
                <div class="star-wrapper star-center">
                  <img src="/assets/ui/Grey/Double/star.png" alt="" class="star-img star-big" />
                </div>
                <div class="star-wrapper star-right">
                  <img src="/assets/ui/Grey/Double/star.png" alt="" class="star-img" />
                </div>
              </div>

              <div class="card-title">
                <h2>{{ loseReason === 'deadlock' ? '¡SIN JUGADAS!' : '¡BANDEJA LLENA!' }}</h2>
              </div>

              <div class="inner-box red-border">
                <span class="box-subtitle">FIN DE LA PARTIDA</span>
                <p class="lose-desc">
                  {{
                    loseReason === 'deadlock'
                      ? 'El tablero quedó vacío y en tu bandeja no hay fichas para completar un trío.'
                      : 'Te has quedado sin espacio para más fichas.'
                  }}
                </p>
                <p class="lose-tip">
                  {{
                    loseReason === 'deadlock'
                      ? '💡 Antes de tomar la última ficha de un tipo, revisa que puedas juntar 3.'
                      : '💡 Cuando la bandeja se ponga roja, usa Deshacer o la Varita Mágica.'
                  }}
                </p>
                <div class="lose-score-chip" v-if="score !== undefined">
                  <span class="chip-label">Puntaje de Sesión</span>
                  <span class="chip-val">{{ formatScore(score) }} PTS</span>
                </div>
              </div>

              <div class="bottom-action-buttons">
                <button
                  type="button"
                  class="round-btn round-yellow play-btn"
                  @click="$emit('retry')"
                  title="Reintentar Nivel"
                  aria-label="Reintentar Nivel"
                >
                  <img src="/assets/ui/Extra/Double/icon_repeat_dark.png" alt="Reintentar" class="round-icon play-icon" />
                </button>
              </div>
            </template>

            <!-- ════════════════ PAUSE & MENU HUB DIALOG (#1 Kenney Purple Hub) ════════════════ -->
            <template v-else-if="variant === 'pause'">
              <div class="window-tab pause-tab">
                <span>⏸️ PAUSA Y MENÚ</span>
              </div>

              <div class="card-title">
                <h2>JUEGO EN PAUSA</h2>
              </div>

              <div class="inner-box purple-border">
                <span class="box-subtitle">
                  NIVEL {{ level || 1 }} · {{ formatScore(score || 0) }} PTS
                </span>
                <p class="lose-desc">Tu tablero y bandeja están guardados de forma segura.</p>

                <button type="button" class="pause-menu-btn btn-resume" @click="$emit('resume')">
                  <img src="/assets/ui/Extra/Double/icon_play_light.png" alt="" class="sub-icon-img" />
                  CONTINUAR PARTIDA
                </button>

                <!-- 2x2 Navigation Grid (>= 48px touch targets, Kenney textured) -->
                <div class="pause-hub-grid">
                  <button
                    type="button"
                    class="pause-hub-btn hub-missions kenney-tex"
                    aria-label="Misiones diarias"
                    @click="$emit('open-missions')"
                  >
                    <span class="hub-icon" aria-hidden="true">🎯</span>
                    <span class="hub-label">Misiones</span>
                    <span v-if="(unclaimedMissionsCount || 0) > 0" class="hub-badge">
                      {{ unclaimedMissionsCount }}
                    </span>
                  </button>

                  <button
                    type="button"
                    class="pause-hub-btn hub-map kenney-tex"
                    aria-label="Abrir mapa de mundos"
                    @click="$emit('open-map')"
                  >
                    <span class="hub-icon" aria-hidden="true">🗺️</span>
                    <span class="hub-label">Mapa</span>
                  </button>

                  <button
                    type="button"
                    class="pause-hub-btn hub-shop kenney-tex"
                    aria-label="Abrir tienda"
                    @click="$emit('open-shop')"
                  >
                    <span class="hub-icon" aria-hidden="true">🛒</span>
                    <span class="hub-label">Tienda</span>
                  </button>

                  <button
                    type="button"
                    class="pause-hub-btn hub-leaderboard kenney-tex"
                    aria-label="Tabla de clasificación"
                    @click="$emit('open-leaderboard')"
                  >
                    <span class="hub-icon" aria-hidden="true">🏆</span>
                    <span class="hub-label">Ranking</span>
                  </button>
                </div>

                <!-- Secondary Actions Row (>= 44px touch targets) -->
                <div class="pause-secondary-row">
                  <button
                    type="button"
                    class="pause-sub-btn sub-home"
                    aria-label="Volver a la pantalla de inicio"
                    @click="$emit('open-home')"
                  >
                    🏠 Inicio
                  </button>
                  <button
                    type="button"
                    class="pause-sub-btn sub-restart"
                    aria-label="Reiniciar nivel"
                    @click="$emit('retry')"
                  >
                    <img src="/assets/ui/Extra/Double/icon_repeat_dark.png" alt="" class="sub-icon-img" />
                    Reiniciar
                  </button>
                  <button
                    type="button"
                    class="pause-sub-btn sub-settings"
                    aria-label="Abrir ajustes"
                    @click="$emit('open-settings')"
                  >
                    ⚙️ Ajustes
                  </button>
                  <button
                    type="button"
                    class="pause-sub-btn sub-tutorial"
                    aria-label="Abrir tutorial"
                    @click="$emit('open-tutorial')"
                  >
                    📖 Reglas
                  </button>
                </div>
              </div>
            </template>

            <!-- ════════════════ WELCOME DIALOG (Kenney Grey Tabbed Window) ════════════════ -->
            <template v-else-if="variant === 'welcome'">
              <div class="window-tab">
                <span>PERFIL</span>
              </div>

              <div class="card-title welcome-title">
                <h2>¡BIENVENIDO! 🎮</h2>
              </div>

              <div class="inner-box grey-border">
                <span class="box-subtitle">CREA TU APODO</span>
                <p class="welcome-desc">Aparecerá en la Tabla de Clasificación:</p>
                <div class="input-container">
                  <input
                    type="text"
                    v-model="inputValue"
                    placeholder="Tu Nombre"
                    maxlength="18"
                    aria-label="Ingresa tu apodo"
                    @keyup.enter="handleSubmit"
                    ref="inputRef"
                    class="kenney-input"
                  />
                </div>
              </div>

              <div class="welcome-action">
                <button type="button" class="btn-kenney-accept" @click="handleSubmit">
                  <img src="/assets/ui/Green/Double/icon_checkmark.png" alt="" class="accept-icon" />
                  <span>¡A JUGAR!</span>
                </button>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { playTap } from '../game/sounds';
import type { LevelStarsBreakdown } from '../composables/useGameState';

const props = defineProps<{
  isOpen: boolean;
  variant: 'welcome' | 'win' | 'lose' | 'pause';
  level?: number;
  score?: number;
  bonus?: { base: number; powerups: number; total: number };
  coinsEarned?: number;
  starsBreakdown?: LevelStarsBreakdown;
  unclaimedMissionsCount?: number;
  loseReason?: 'tray_full' | 'deadlock';
}>();

const emit = defineEmits<{
  (e: 'submit', value: string): void;
  (e: 'next'): void;
  (e: 'retry'): void;
  (e: 'resume'): void;
  (e: 'open-home'): void;
  (e: 'open-tutorial'): void;
  (e: 'open-map'): void;
  (e: 'open-missions'): void;
  (e: 'open-shop'): void;
  (e: 'open-leaderboard'): void;
  (e: 'open-settings'): void;
}>();

const inputValue = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

const earnedStarsCount = computed(() => {
  if (!props.starsBreakdown) return 3;
  return props.starsBreakdown.stars;
});

watch(
  () => props.isOpen,
  newVal => {
    if (newVal && props.variant === 'welcome') {
      inputValue.value = '';
      nextTick(() => {
        inputRef.value?.focus();
      });
    }
  },
);

const handleSubmit = () => {
  playTap();
  emit('submit', inputValue.value);
};

const formatScore = (num: number) => {
  return new Intl.NumberFormat('es-ES').format(num);
};

const getConfettiStyle = (index: number) => {
  const colors = ['#f8be14', '#2b99ff', '#38c644', '#ea4335', '#a855f7'];
  const left = Math.random() * 100;
  const animDuration = 1.4 + Math.random() * 2;
  const animDelay = Math.random() * 0.4;
  const color = colors[index % colors.length];

  return {
    left: `${left}%`,
    backgroundColor: color,
    animationDuration: `${animDuration}s`,
    animationDelay: `${animDelay}s`,
  };
};
</script>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
}

.dialog-card {
  width: 92%;
  max-width: 360px;
  overflow: visible;
  border-radius: 28px;
  position: relative;
  text-align: center;
  padding: 24px 18px 22px;
  box-sizing: border-box;
  animation: cardBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.dialog-card.variant-win {
  background: #2b99ff;
  border: 4px solid #1e6bc4;
  box-shadow:
    0 10px 0 #154c8c,
    0 25px 40px rgba(0, 0, 0, 0.35);
  margin-top: 48px;
}

.dialog-card.variant-lose {
  background: #ea4335;
  border: 4px solid #aa2218;
  box-shadow:
    0 10px 0 #7c150e,
    0 25px 40px rgba(0, 0, 0, 0.35);
  margin-top: 48px;
}

.dialog-card.variant-pause {
  background: #8b5cf6;
  border: 4px solid #6d28d9;
  box-shadow:
    0 10px 0 #4c1d95,
    0 25px 40px rgba(0, 0, 0, 0.35);
  margin-top: 20px;
}

.dialog-card.variant-welcome {
  background: #e2e8f0;
  border: 4px solid #cbd5e1;
  box-shadow:
    0 10px 0 #94a3b8,
    0 25px 40px rgba(0, 0, 0, 0.25);
  margin-top: 20px;
}

.stars-crown {
  position: absolute;
  top: -50px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  pointer-events: none;
  gap: 6px;
}

.star-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  animation: starDrop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

.star-wrapper.is-earned .star-img {
  filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.7)) drop-shadow(0 6px 4px rgba(0, 0, 0, 0.3));
}

.star-left {
  transform: rotate(-14deg) translateY(6px);
  animation-delay: 0.1s;
}

.star-center {
  transform: translateY(-8px) scale(1.22);
  z-index: 2;
  animation-delay: 0.2s;
}

.star-right {
  transform: rotate(14deg) translateY(6px);
  animation-delay: 0.3s;
}

.star-img {
  width: 58px;
  height: 58px;
  object-fit: contain;
  filter: drop-shadow(0 6px 4px rgba(0, 0, 0, 0.3));
}

.star-big {
  width: 72px;
  height: 72px;
}

@keyframes starDrop {
  0% { transform: translateY(-30px) scale(0); opacity: 0; }
  100% { opacity: 1; }
}

.window-tab {
  position: absolute;
  top: -32px;
  left: 24px;
  background: #2b99ff;
  border: 3px solid #1e6bc4;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 5px 16px 2px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
}

.window-tab.pause-tab {
  background: #8b5cf6;
  border-color: #6d28d9;
}

.card-title h2 {
  margin: 10px 0 12px;
  font-family: var(--game-font, sans-serif);
  font-size: 1.4rem;
  letter-spacing: 0.5px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.35);
}

.welcome-title h2 {
  color: #1e293b;
  text-shadow: none;
  margin-top: 4px;
}

.inner-box {
  background: #ffffff;
  border-radius: 20px;
  padding: 14px 12px;
  margin-bottom: 14px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.05);
}

.inner-box.gold-border {
  border: 3px solid #f8be14;
  box-shadow: 0 3px 0 #b8860b, inset 0 2px 6px rgba(0, 0, 0, 0.04);
}

.inner-box.red-border {
  border: 3px solid #ea4335;
  box-shadow: 0 3px 0 #aa2218, inset 0 2px 6px rgba(0, 0, 0, 0.04);
}

.inner-box.purple-border {
  border: 3px solid #c4b5fd;
  margin-bottom: 0;
}

.inner-box.grey-border {
  border: 3px solid #cbd5e1;
  box-shadow: 0 3px 0 #94a3b8, inset 0 2px 6px rgba(0, 0, 0, 0.04);
}

.box-subtitle {
  display: block;
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.reward-pts {
  font-family: var(--game-font, sans-serif);
  font-size: 1.5rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.5px;
  margin: 2px 0 8px;
}

/* #4 3-Star Criteria Pills */
.stars-criteria-row {
  display: flex;
  justify-content: center;
  gap: 5px;
  margin-bottom: 8px;
}

.criteria-pill {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 5px 4px;
  border-radius: 10px;
  background: #f1f5f9;
  border: 1.5px solid #cbd5e1;
  color: #94a3b8;
}

.criteria-pill.is-met {
  background: #fffbeb;
  border-color: #f59e0b;
  color: #b45309;
}

.criteria-star {
  font-size: 12px;
  line-height: 1;
}

.criteria-label {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 9px;
  font-weight: 900;
  margin-top: 2px;
  white-space: nowrap;
}

.bonus-details {
  display: flex;
  justify-content: center;
  gap: 12px;
  border-top: 2px dashed #e2e8f0;
  padding-top: 8px;
}

.bonus-tag {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tag-label {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
}

.tag-val {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 13px;
  font-weight: 800;
  color: #10b981;
}

.bonus-coins .tag-val {
  color: #d97706;
}

.bonus-coins .tag-label {
  color: #92400e;
}

.lose-desc {
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
  margin: 4px 0 10px;
}

.lose-score-chip {
  background: #f8fafc;
  border-radius: 12px;
  padding: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.chip-label {
  font-size: 10px;
  color: #94a3b8;
  font-weight: 700;
}

.chip-val {
  font-family: var(--game-font, sans-serif);
  font-size: 14px;
  color: #ea4335;
  font-weight: 900;
}

/* #1 Pause Hub Menu (>= 44px touch targets) */
.pause-menu-btn {
  width: 100%;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 16px;
  font-family: var(--game-font, sans-serif);
  font-size: 13px;
  font-weight: 900;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s ease;
}

.pause-menu-btn:active {
  transform: translateY(2px);
}

.btn-resume {
  background: #38c644;
  border-color: #278d30;
  box-shadow: 0 4px 0 #1b6822;
  color: #fff;
  margin-bottom: 10px;
}

.pause-hub-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}

.pause-hub-btn {
  position: relative;
  min-height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.1s ease;
  padding: 8px 10px;
}

.pause-hub-btn:active {
  transform: translateY(2px);
}

.hub-icon {
  font-size: 16px;
  line-height: 1;
}

.hub-missions {
  background: #ec4899;
  border-color: #db2777;
  box-shadow: 0 3px 0 #9d174d;
}

.hub-map {
  background: #3b82f6;
  border-color: #1d4ed8;
  box-shadow: 0 3px 0 #1e40af;
}

.hub-shop {
  background: #f59e0b;
  border-color: #d97706;
  box-shadow: 0 3px 0 #b45309;
}

.hub-leaderboard {
  background: #10b981;
  border-color: #059669;
  box-shadow: 0 3px 0 #047857;
}

/* Ola 3: Kenney UI Pack textures on hub buttons (falls back to flat colors above) */
.pause-hub-btn.kenney-tex {
  border: none;
  box-shadow: none;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  padding-bottom: 12px;
  min-height: 56px;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.25);
}

.hub-missions.kenney-tex { background-image: url('/assets/ui/Red/Double/button_rectangle_depth_gloss.png'); }
.hub-map.kenney-tex { background-image: url('/assets/ui/Blue/Double/button_rectangle_depth_gloss.png'); }
.hub-shop.kenney-tex { background-image: url('/assets/ui/Yellow/Double/button_rectangle_depth_gloss.png'); }
.hub-leaderboard.kenney-tex { background-image: url('/assets/ui/Green/Double/button_rectangle_depth_gloss.png'); }

.sub-icon-img {
  width: 14px;
  height: 14px;
  vertical-align: -2px;
}

.lose-tip {
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 6px 8px;
  margin: 0 0 10px;
}

.hub-badge {
  position: absolute;
  top: -5px;
  right: -5px;
  background: #ef4444;
  color: #ffffff;
  font-size: 9px;
  font-weight: 900;
  min-width: 18px;
  height: 18px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #ffffff;
}

.pause-secondary-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pause-sub-btn {
  flex: 1 1 calc(50% - 6px);
  min-height: 44px;
  border-radius: 12px;
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 900;
  cursor: pointer;
  border: 1.5px solid #cbd5e1;
  background: #f8fafc;
  color: #334155;
  box-shadow: 0 2px 0 #cbd5e1;
  padding: 6px 4px;
  transition: transform 0.1s ease;
}

.pause-sub-btn:active {
  transform: translateY(1px);
}

.welcome-desc {
  font-size: 13px;
  color: #475569;
  font-weight: 600;
  margin: 4px 0 12px;
}

.input-container {
  padding: 2px 4px;
}

.kenney-input {
  width: 100%;
  padding: 12px 14px;
  border: 3px solid #cbd5e1;
  border-radius: 14px;
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  outline: none;
  color: #0f172a;
  background: #f8fafc;
  box-shadow: inset 0 2px 5px rgba(0, 0, 0, 0.06);
  transition: all 0.2s;
  box-sizing: border-box;
}

.kenney-input:focus {
  border-color: #2b99ff;
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.04),
    0 0 0 3px rgba(43, 153, 255, 0.25);
  background: #ffffff;
}

.bottom-action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin-top: 4px;
}

.round-btn {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  position: relative;
  outline: none;
}

.round-yellow {
  background: linear-gradient(180deg, #fce052 0%, #f8be14 100%);
  border: 3px solid #b8860b;
  box-shadow: 0 6px 0 #8c6503, 0 10px 15px rgba(0, 0, 0, 0.25);
}

.round-btn:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #8c6503, 0 4px 8px rgba(0, 0, 0, 0.2);
}

.play-btn {
  width: 72px;
  height: 72px;
}

.round-icon {
  width: 32px;
  height: 32px;
  object-fit: contain;
  pointer-events: none;
}

.play-icon {
  width: 38px;
  height: 38px;
  margin-left: 3px;
}

.welcome-action {
  display: flex;
  justify-content: center;
}

.btn-kenney-accept {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: #38c644;
  border: 3px solid #278d30;
  box-shadow: 0 6px 0 #1b6822, 0 8px 15px rgba(0, 0, 0, 0.15);
  border-radius: 18px;
  padding: 14px 28px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 14px;
  letter-spacing: 0.5px;
  font-weight: 900;
  cursor: pointer;
  width: 100%;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.btn-kenney-accept:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #1b6822, 0 4px 8px rgba(0, 0, 0, 0.15);
}

.accept-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.confetti-container {
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 10001;
}

.confetti {
  position: absolute;
  width: 10px;
  height: 18px;
  top: -20px;
  animation: confettiFall linear forwards;
}

@keyframes confettiFall {
  to {
    transform: translateY(105vh) rotate(720deg);
  }
}

.dialog-fade-enter-active, .dialog-fade-leave-active {
  transition: opacity 0.25s ease;
}
.dialog-fade-enter-from, .dialog-fade-leave-to {
  opacity: 0;
}

.dialog-pop-enter-active {
  animation: cardBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dialog-pop-leave-active {
  animation: cardBounce 0.25s reverse ease-in;
}

@keyframes cardBounce {
  0% { transform: scale(0.6) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}

@media (max-height: 650px) {
  .dialog-card.variant-win,
  .dialog-card.variant-lose {
    margin-top: 20px;
    padding: 16px 14px 18px;
  }
  .stars-crown {
    top: -36px;
  }
  .star-img {
    width: 44px;
    height: 44px;
  }
  .star-big {
    width: 54px;
    height: 54px;
  }
  .inner-box {
    padding: 10px 8px;
    margin-bottom: 12px;
  }
  .card-title h2 {
    font-size: 1.15rem;
    margin: 6px 0 10px;
  }
}
</style>
