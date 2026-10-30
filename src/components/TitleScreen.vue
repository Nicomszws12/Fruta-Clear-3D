<script setup lang="ts">
/**
 * TitleScreen — Ola 2: full-screen home hub shown before the board.
 *
 * - Big logo + current world / level
 * - Primary CTA: "¡Jugar!" (first time) · "Continuar partida" (mid-level save) · "Continuar"
 * - Row: Mapa · Tienda · Ranking   ·   Corner: Ajustes · Misiones (red dot)
 * - The first tap here unlocks Web Audio (required by iOS / Android).
 */
import { computed } from 'vue';

export type TitleMode = 'loading' | 'new' | 'resume' | 'continue';

const props = defineProps<{
  isOpen: boolean;
  mode: TitleMode;
  username: string;
  level: number;
  worldName: string;
  worldIcon: string;
  userCoins: number;
  unclaimedMissionsCount: number;
  totalStars: number;
  bgStyle?: Record<string, string | undefined>;
}>();

const emit = defineEmits<{
  (e: 'play'): void;
  (e: 'open-map'): void;
  (e: 'open-shop'): void;
  (e: 'open-leaderboard'): void;
  (e: 'open-settings'): void;
  (e: 'open-missions'): void;
}>();

const ctaLabel = computed(() => {
  switch (props.mode) {
    case 'loading':
      return 'Cargando…';
    case 'new':
      return '¡Jugar!';
    case 'resume':
      return 'Continuar partida';
    default:
      return 'Continuar';
  }
});

const isReturningPlayer = computed(() => props.mode === 'resume' || props.mode === 'continue');

const formatNum = (n: number) => new Intl.NumberFormat('es-ES').format(n);

// Decorative floating fruits (static positions, CSS-only animation)
const FLOATERS = [
  { e: '🍓', l: 8, t: 14, d: 0, s: 34 },
  { e: '🍋', l: 82, t: 10, d: 1.2, s: 30 },
  { e: '🍇', l: 14, t: 70, d: 0.6, s: 36 },
  { e: '🍉', l: 78, t: 66, d: 1.8, s: 38 },
  { e: '🍒', l: 46, t: 6, d: 2.4, s: 26 },
  { e: '🥑', l: 88, t: 40, d: 0.9, s: 28 },
  { e: '🍑', l: 4, t: 44, d: 1.5, s: 28 },
];
</script>

<template>
  <Transition name="title-fade">
    <div
      v-if="isOpen"
      class="title-screen"
      :style="bgStyle"
      role="dialog"
      aria-modal="true"
      aria-label="Pantalla de inicio de Fruta Clear 3D"
    >
      <div class="title-floaters" aria-hidden="true">
        <span
          v-for="(f, i) in FLOATERS"
          :key="i"
          class="floater"
          :style="{ left: `${f.l}%`, top: `${f.t}%`, animationDelay: `${f.d}s`, fontSize: `${f.s}px` }"
        >{{ f.e }}</span>
      </div>

      <!-- Top bar: coins + corner buttons -->
      <div class="title-topbar">
        <div v-if="isReturningPlayer" class="title-coin-chip" :aria-label="`${userCoins} monedas`">
          <span aria-hidden="true">🪙</span>
          <span>{{ formatNum(userCoins) }}</span>
        </div>
        <div v-else></div>

        <div class="title-corner">
          <button
            type="button"
            class="corner-btn kenney-round kenney-red"
            aria-label="Misiones diarias"
            :disabled="mode === 'loading' || mode === 'new'"
            @click="emit('open-missions')"
          >
            <span aria-hidden="true">🎯</span>
            <span v-if="unclaimedMissionsCount > 0" class="corner-dot">{{ unclaimedMissionsCount }}</span>
          </button>
          <button
            type="button"
            class="corner-btn kenney-round kenney-grey"
            aria-label="Abrir ajustes"
            :disabled="mode === 'loading'"
            @click="emit('open-settings')"
          >
            <span aria-hidden="true">⚙️</span>
          </button>
        </div>
      </div>

      <!-- Logo -->
      <div class="title-center">
        <div class="logo-block">
          <div class="logo-fruits" aria-hidden="true">🍓🍋🍇</div>
          <h1 class="logo-title">
            <span class="logo-line logo-fruta">FRUTA</span>
            <span class="logo-line logo-clear">CLEAR</span>
          </h1>
          <div class="logo-3d">3D</div>
        </div>

        <div v-if="isReturningPlayer" class="title-subtitle">
          <span class="sub-icon" aria-hidden="true">{{ worldIcon }}</span>
          <span class="sub-world">{{ worldName }}</span>
          <span class="sub-sep" aria-hidden="true">·</span>
          <span class="sub-level">Nv. {{ level }}</span>
        </div>
        <div v-else-if="mode === 'new'" class="title-subtitle">
          <span>¡Junta 3 frutas iguales!</span>
        </div>

        <div v-if="isReturningPlayer && username" class="title-greeting">
          Hola, <strong>{{ username }}</strong>
          <span v-if="totalStars > 0" class="greeting-stars">
            · <img src="/assets/ui/Yellow/Double/star.png" alt="" class="greet-star" /> {{ totalStars }}
          </span>
        </div>

        <!-- Primary CTA -->
        <button
          type="button"
          class="title-cta"
          :class="{ 'is-loading': mode === 'loading' }"
          :disabled="mode === 'loading'"
          @click="emit('play')"
        >
          <img
            v-if="mode !== 'loading'"
            src="/assets/ui/Extra/Double/icon_play_light.png"
            alt=""
            class="cta-icon"
          />
          <span>{{ ctaLabel }}</span>
        </button>

        <!-- Secondary row -->
        <div v-if="isReturningPlayer" class="title-nav-row">
          <button type="button" class="nav-tile kenney-square kenney-blue" aria-label="Abrir mapa de mundos" @click="emit('open-map')">
            <span class="nav-icon" aria-hidden="true">🗺️</span>
            <span class="nav-label">Mapa</span>
          </button>
          <button type="button" class="nav-tile kenney-square kenney-yellow" aria-label="Abrir tienda" @click="emit('open-shop')">
            <span class="nav-icon" aria-hidden="true">🛒</span>
            <span class="nav-label">Tienda</span>
          </button>
          <button type="button" class="nav-tile kenney-square kenney-green" aria-label="Tabla de clasificación" @click="emit('open-leaderboard')">
            <span class="nav-icon" aria-hidden="true">🏆</span>
            <span class="nav-label">Ranking</span>
          </button>
        </div>
      </div>

      <div class="title-footer" aria-hidden="true">Fruta Clear 3D · v1.1</div>
    </div>
  </Transition>
</template>

<style scoped>
.title-screen {
  position: fixed;
  inset: 0;
  z-index: 980;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top, 0px)) 16px max(14px, env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  overflow: hidden;
  background:
    radial-gradient(ellipse at 50% 30%, rgba(255, 255, 255, 0.28) 0%, transparent 60%),
    linear-gradient(180deg, #38bdf8 0%, #0ea5e9 45%, #0284c7 100%);
  font-family: var(--game-font, sans-serif);
}

.title-floaters {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floater {
  position: absolute;
  opacity: 0.55;
  animation: floatBob 4.5s ease-in-out infinite alternate;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2));
}

@keyframes floatBob {
  from { transform: translateY(0) rotate(-8deg); }
  to { transform: translateY(-14px) rotate(8deg); }
}

.title-topbar {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 460px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.title-coin-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 4px 14px;
  border-radius: 999px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 2px solid #f59e0b;
  box-shadow: 0 3px 0 #d97706;
  font-size: 14px;
  font-weight: 900;
  color: #92400e;
}

.title-corner {
  display: flex;
  gap: 10px;
}

/* Kenney textured buttons (UI Pack "Double" assets already in /assets/ui) */
.kenney-round,
.kenney-square {
  background-color: transparent;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  border: none;
  cursor: pointer;
  transition: transform 0.1s ease, filter 0.1s ease;
}

.kenney-round:active:not(:disabled),
.kenney-square:active:not(:disabled) {
  transform: translateY(3px);
  filter: brightness(0.95);
}

.kenney-round:disabled,
.kenney-square:disabled {
  opacity: 0.45;
  cursor: default;
}

.kenney-round.kenney-red { background-image: url('/assets/ui/Red/Double/button_round_depth_gloss.png'); }
.kenney-round.kenney-grey { background-image: url('/assets/ui/Grey/Double/button_round_depth_gloss.png'); }
.kenney-square.kenney-blue { background-image: url('/assets/ui/Blue/Double/button_square_depth_gloss.png'); }
.kenney-square.kenney-yellow { background-image: url('/assets/ui/Yellow/Double/button_square_depth_gloss.png'); }
.kenney-square.kenney-green { background-image: url('/assets/ui/Green/Double/button_square_depth_gloss.png'); }

.corner-btn {
  position: relative;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  padding: 0 0 4px;
}

.corner-dot {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: #ef4444;
  border: 2px solid #ffffff;
  color: #ffffff;
  font-size: 10px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.title-center {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 380px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.logo-block {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: logoDrop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes logoDrop {
  from { transform: translateY(-40px) scale(0.85); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

.logo-fruits {
  font-size: 40px;
  letter-spacing: 4px;
  filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.25));
  animation: floatBob 3s ease-in-out infinite alternate;
}

.logo-title {
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 0.92;
}

.logo-line {
  font-size: clamp(48px, 15vw, 72px);
  font-weight: 900;
  color: #ffffff;
  letter-spacing: 2px;
  -webkit-text-stroke: 3px #075985;
  paint-order: stroke fill;
  text-shadow:
    0 5px 0 #075985,
    0 10px 18px rgba(0, 0, 0, 0.3);
}

.logo-clear {
  color: #fde047;
}

.logo-3d {
  position: absolute;
  right: -18px;
  bottom: -6px;
  background: #ef4444;
  color: #ffffff;
  border: 3px solid #ffffff;
  border-radius: 14px;
  padding: 2px 10px;
  font-size: 20px;
  font-weight: 900;
  transform: rotate(-10deg);
  box-shadow: 0 4px 0 #991b1b;
}

.title-subtitle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #ffffff;
  box-shadow: 0 4px 0 rgba(7, 89, 133, 0.45);
  border-radius: 999px;
  padding: 6px 16px;
  font-size: 14px;
  font-weight: 900;
  color: #0369a1;
  margin-top: 6px;
}

.sub-icon {
  font-size: 18px;
}

.sub-sep {
  opacity: 0.5;
}

.title-greeting {
  font-size: 13px;
  font-weight: 700;
  color: #e0f2fe;
  display: flex;
  align-items: center;
  gap: 4px;
}

.greeting-stars {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.greet-star {
  width: 16px;
  height: 16px;
}

.title-cta {
  width: 100%;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-radius: 22px;
  border: 3px solid #ffffff;
  background: linear-gradient(180deg, #4ade80 0%, #22c55e 55%, #16a34a 100%);
  box-shadow:
    0 7px 0 #15803d,
    0 14px 24px rgba(0, 0, 0, 0.25);
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 24px;
  font-weight: 900;
  letter-spacing: 0.5px;
  text-shadow: 0 2px 0 #166534;
  cursor: pointer;
  animation: ctaPulse 1.4s ease-in-out infinite;
  transition: transform 0.1s ease;
}

.title-cta:active:not(:disabled) {
  transform: translateY(5px);
  box-shadow: 0 2px 0 #15803d;
}

.title-cta.is-loading {
  animation: none;
  filter: grayscale(0.4);
  opacity: 0.8;
}

@keyframes ctaPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}

.cta-icon {
  width: 26px;
  height: 26px;
  filter: drop-shadow(0 2px 0 #166534);
}

.title-nav-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 4px;
}

.nav-tile {
  min-height: 78px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px 12px;
}

.nav-icon {
  font-size: 28px;
  line-height: 1;
  filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.18));
}

.nav-label {
  font-family: var(--game-font, sans-serif);
  font-size: 13px;
  font-weight: 900;
  color: #ffffff;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
}

.title-footer {
  position: relative;
  z-index: 2;
  font-size: 11px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.7);
}

.title-fade-enter-active,
.title-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.title-fade-enter-from,
.title-fade-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

@media (max-height: 640px) {
  .logo-fruits { font-size: 30px; }
  .logo-line { font-size: 46px; }
  .title-cta { min-height: 54px; font-size: 20px; }
  .nav-tile { min-height: 64px; }
  .title-center { gap: 10px; }
}
</style>
