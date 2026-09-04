<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="isOpen" class="dialog-backdrop">
        <!-- Confetti for win celebration -->
        <div v-if="variant === 'win'" class="confetti-container">
          <div v-for="i in 36" :key="i" class="confetti" :style="getConfettiStyle(i)"></div>
        </div>

        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card" :class="`variant-${variant}`">
            
            <!-- ════════════════ WIN DIALOG (Kenney Blue Reward Card) ════════════════ -->
            <template v-if="variant === 'win'">
              <!-- 3 Protruding Stars at the top -->
              <div class="stars-crown">
                <div class="star-wrapper star-left">
                  <img src="/assets/ui/Yellow/Double/star.png" alt="Star" class="star-img" />
                </div>
                <div class="star-wrapper star-center">
                  <img src="/assets/ui/Yellow/Double/star.png" alt="Star" class="star-img star-big" />
                </div>
                <div class="star-wrapper star-right">
                  <img src="/assets/ui/Yellow/Double/star.png" alt="Star" class="star-img" />
                </div>
              </div>

              <!-- Card Header -->
              <div class="card-title">
                <h2>NIVEL {{ level || 1 }}</h2>
              </div>

              <!-- Inner Reward Box (Gold border) -->
              <div class="inner-box gold-border">
                <span class="box-subtitle">TU RECOMPENSA</span>
                <div class="reward-pts">+{{ formatScore(bonus?.total || 0) }} PTS</div>
                
                <div class="bonus-details">
                  <div class="bonus-tag">
                    <span class="tag-label">Base</span>
                    <span class="tag-val">+{{ bonus?.base || 0 }}</span>
                  </div>
                  <div class="bonus-tag">
                    <span class="tag-label">Power-ups</span>
                    <span class="tag-val">+{{ bonus?.powerups || 0 }}</span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons (Round Kenney Yellow Buttons) -->
              <div class="bottom-action-buttons">
                <!-- Retry level -->
                <button class="round-btn round-yellow" @click="$emit('retry')" title="Repetir Nivel">
                  <img src="/assets/ui/Extra/Double/icon_repeat_dark.png" alt="Reintentar" class="round-icon" />
                </button>
                <!-- Next level -->
                <button class="round-btn round-yellow play-btn" @click="$emit('next')" title="Siguiente Nivel">
                  <img src="/assets/ui/Extra/Double/icon_play_dark.png" alt="Siguiente" class="round-icon play-icon" />
                </button>
              </div>
            </template>

            <!-- ════════════════ LOSE DIALOG (Kenney Red Warning Card) ════════════════ -->
            <template v-else-if="variant === 'lose'">
              <!-- Grey Stars at the top -->
              <div class="stars-crown">
                <div class="star-wrapper star-left">
                  <img src="/assets/ui/Grey/Double/star.png" alt="Star" class="star-img" />
                </div>
                <div class="star-wrapper star-center">
                  <img src="/assets/ui/Grey/Double/star.png" alt="Star" class="star-img star-big" />
                </div>
                <div class="star-wrapper star-right">
                  <img src="/assets/ui/Grey/Double/star.png" alt="Star" class="star-img" />
                </div>
              </div>

              <!-- Card Header -->
              <div class="card-title">
                <h2>¡BANDEJA LLENA!</h2>
              </div>

              <!-- Inner Box (Red border) -->
              <div class="inner-box red-border">
                <span class="box-subtitle">FIN DE LA PARTIDA</span>
                <p class="lose-desc">Te has quedado sin espacio para más fichas.</p>
                <div class="lose-score-chip" v-if="score !== undefined">
                  <span class="chip-label">Puntaje Obtenido</span>
                  <span class="chip-val">{{ formatScore(score) }} PTS</span>
                </div>
              </div>

              <!-- Action Button (Round Kenney Yellow Retry) -->
              <div class="bottom-action-buttons">
                <button class="round-btn round-yellow play-btn" @click="$emit('retry')" title="Reintentar Nivel">
                  <img src="/assets/ui/Extra/Double/icon_repeat_dark.png" alt="Reintentar" class="round-icon play-icon" />
                </button>
              </div>
            </template>

            <!-- ════════════════ WELCOME DIALOG (Kenney Grey Tabbed Window) ════════════════ -->
            <template v-else-if="variant === 'welcome'">
              <!-- Top Tab like the Kenney sample -->
              <div class="window-tab">
                <span>PERFIL</span>
              </div>

              <!-- Card Header -->
              <div class="card-title welcome-title">
                <h2>¡BIENVENIDO! 🎮</h2>
              </div>

              <!-- Inner Box -->
              <div class="inner-box grey-border">
                <span class="box-subtitle">CREA TU APODO</span>
                <p class="welcome-desc">Aparecerá en la Tabla de Clasificación:</p>
                <div class="input-container">
                  <input
                    type="text"
                    v-model="inputValue"
                    placeholder="Tu Nombre"
                    maxlength="18"
                    @keyup.enter="handleSubmit"
                    ref="inputRef"
                    class="kenney-input"
                  />
                </div>
              </div>

              <!-- Green Accept Button with Checkmark -->
              <div class="welcome-action">
                <button class="btn-kenney-accept" @click="handleSubmit">
                  <img src="/assets/ui/Green/Double/icon_checkmark.png" alt="Check" class="accept-icon" />
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
import { ref, watch, nextTick } from 'vue';
import { playTap } from '../game/sounds';

const props = defineProps<{
  isOpen: boolean;
  variant: 'welcome' | 'win' | 'lose';
  level?: number;
  score?: number;
  bonus?: { base: number; powerups: number; total: number };
}>();

const emit = defineEmits<{
  (e: 'submit', value: string): void;
  (e: 'next'): void;
  (e: 'retry'): void;
}>();

const inputValue = ref('');
const inputRef = ref<HTMLInputElement | null>(null);

watch(() => props.isOpen, (newVal) => {
  if (newVal && props.variant === 'welcome') {
    inputValue.value = '';
    nextTick(() => {
      inputRef.value?.focus();
    });
  }
});

const handleSubmit = () => {
  playTap();
  emit('submit', inputValue.value);
};

const formatScore = (num: number) => {
  return new Intl.NumberFormat('es-ES').format(num);
};

// Confetti generator for celebratory victory
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
/* ─── Backdrop ────────────────────────────────────────────── */
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

/* ─── Card Base ───────────────────────────────────────────── */
.dialog-card {
  width: 92%;
  max-width: 360px;
  overflow: visible;
  border-radius: 28px;
  position: relative;
  text-align: center;
  padding: 24px 20px 24px;
  box-sizing: border-box;
  animation: cardBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* ─── WIN Card (Kenney Blue Theme) ────────────────────────── */
.dialog-card.variant-win {
  background: #2b99ff;
  border: 4px solid #1e6bc4;
  box-shadow: 
    0 10px 0 #154c8c,
    0 25px 40px rgba(0, 0, 0, 0.35);
  margin-top: 48px; /* space for protruding stars */
}

/* ─── LOSE Card (Kenney Red Theme) ────────────────────────── */
.dialog-card.variant-lose {
  background: #ea4335;
  border: 4px solid #aa2218;
  box-shadow: 
    0 10px 0 #7c150e,
    0 25px 40px rgba(0, 0, 0, 0.35);
  margin-top: 48px;
}

/* ─── WELCOME Card (Kenney Grey Theme with Tab) ───────────── */
.dialog-card.variant-welcome {
  background: #e2e8f0;
  border: 4px solid #cbd5e1;
  box-shadow: 
    0 10px 0 #94a3b8,
    0 25px 40px rgba(0, 0, 0, 0.25);
  margin-top: 20px;
}

/* ─── Protruding Stars (Kenney Style) ─────────────────────── */
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
  filter: drop-shadow(0 6px 4px rgba(0,0,0,0.3));
}

.star-big {
  width: 72px;
  height: 72px;
}

@keyframes starDrop {
  0% { transform: translateY(-30px) scale(0); opacity: 0; }
  100% { opacity: 1; }
}

/* ─── Welcome Tab on Top ──────────────────────────────────── */
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
  box-shadow: 0 -2px 0 rgba(0,0,0,0.1);
}

/* ─── Card Titles ─────────────────────────────────────────── */
.card-title h2 {
  margin: 10px 0 14px;
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

/* ─── Inner Boxes ─────────────────────────────────────────── */
.inner-box {
  background: #ffffff;
  border-radius: 20px;
  padding: 16px 14px;
  margin-bottom: 20px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.05);
}

.inner-box.gold-border {
  border: 3px solid #f8be14;
  box-shadow: 
    0 3px 0 #b8860b,
    inset 0 2px 6px rgba(0,0,0,0.04);
}

.inner-box.red-border {
  border: 3px solid #ea4335;
  box-shadow: 
    0 3px 0 #aa2218,
    inset 0 2px 6px rgba(0,0,0,0.04);
}

.inner-box.grey-border {
  border: 3px solid #cbd5e1;
  box-shadow: 
    0 3px 0 #94a3b8,
    inset 0 2px 6px rgba(0,0,0,0.04);
}

.box-subtitle {
  display: block;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
}

.reward-pts {
  font-family: var(--game-font, sans-serif);
  font-size: 1.6rem;
  font-weight: 900;
  color: #0f172a;
  letter-spacing: 0.5px;
  margin: 4px 0 10px;
}

.bonus-details {
  display: flex;
  justify-content: center;
  gap: 12px;
  border-top: 2px dashed #e2e8f0;
  padding-top: 10px;
  margin-top: 6px;
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

.lose-desc {
  font-size: 13px;
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
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.06);
  transition: all 0.2s;
  box-sizing: border-box;
}

.kenney-input:focus {
  border-color: #2b99ff;
  box-shadow: 
    inset 0 2px 4px rgba(0,0,0,0.04),
    0 0 0 3px rgba(43, 153, 255, 0.25);
  background: #ffffff;
}

/* ─── Bottom Circular Buttons (Kenney Style) ──────────────── */
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
  box-shadow: 0 6px 0 #8c6503, 0 10px 15px rgba(0,0,0,0.25);
}

.round-btn:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #8c6503, 0 4px 8px rgba(0,0,0,0.2);
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
  margin-left: 3px; /* visual center for play triangle */
}

/* ─── Welcome Accept Button (Kenney Green) ─────────────────── */
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
  box-shadow: 0 6px 0 #1b6822, 0 8px 15px rgba(0,0,0,0.15);
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
  text-shadow: 0 1px 2px rgba(0,0,0,0.3);
}

.btn-kenney-accept:active {
  transform: translateY(4px);
  box-shadow: 0 2px 0 #1b6822, 0 4px 8px rgba(0,0,0,0.15);
}

.accept-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

/* ─── Confetti ────────────────────────────────────────────── */
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

/* ─── Dialog Transitions ──────────────────────────────────── */
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
