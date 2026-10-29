<script setup lang="ts">
import { ref, watch } from 'vue';
import { playClick, playTap } from '../game/sounds';

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'complete'): void;
}>();

const currentStep = ref(0);

const STEPS = [
  {
    badge: 'PASO 1 DE 3',
    title: '¡JUNTA 3 IGUALES!',
    icon: '🍓 🍓 🍓',
    description:
      'Toca las fichas libres del tablero para bajarlas a tu bandeja. Cuando juntes 3 fichas idénticas, desaparecerán automáticamente y ganarás puntos. ¡Hazlo rápido para activar COMBOS!',
    tip: '💡 Consejo: La bandeja agrupa las fichas iguales automáticamente.',
  },
  {
    badge: 'PASO 2 DE 3',
    title: 'CAPAS 3D Y CANDADOS',
    icon: '🔓 ⬆️ 🔒',
    description:
      'Las fichas oscuras con candado 🔒 están cubiertas por otras fichas en capas superiores. Quita primero las fichas de arriba para desbloquear las que están debajo.',
    tip: '💡 Consejo: Fíjate qué frutas se asoman debajo antes de elegir.',
  },
  {
    badge: 'PASO 3 DE 3',
    title: 'BANDEJA DE 7 Y AYUDAS',
    icon: '↩️ 🔀 ✨',
    description:
      'Tu bandeja tiene máximo 7 espacios. Si se llena sin formar un trío, termina la partida. Usa Deshacer (↩️), Mezclar (🔀) o la Varita Mágica (✨) para salir de apuros.',
    tip: '💡 Consejo: La Varita Mágica prioriza completar fichas que ya tengas en tu bandeja.',
  },
];

watch(
  () => props.isOpen,
  open => {
    if (open) currentStep.value = 0;
  },
);

const nextStep = () => {
  playTap();
  if (currentStep.value < STEPS.length - 1) {
    currentStep.value++;
  } else {
    finish();
  }
};

const prevStep = () => {
  playTap();
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

const finish = () => {
  playClick();
  emit('complete');
  emit('update:isOpen', false);
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="isOpen"
        class="dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial de Cómo Jugar"
        @click.self="finish"
      >
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card tutorial-card">
            <div class="window-tab">
              <span>📖 CÓMO JUGAR</span>
            </div>

            <button
              type="button"
              class="modal-close-corner"
              @click="finish"
              title="Saltar tutorial"
              aria-label="Cerrar tutorial"
            >
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <div class="step-badge">{{ STEPS[currentStep].badge }}</div>
            <h2 class="step-title">{{ STEPS[currentStep].title }}</h2>

            <div class="step-illustration" aria-hidden="true">
              <span>{{ STEPS[currentStep].icon }}</span>
            </div>

            <div class="step-box">
              <p class="step-desc">{{ STEPS[currentStep].description }}</p>
              <div class="step-tip">{{ STEPS[currentStep].tip }}</div>
            </div>

            <!-- Step Dots -->
            <div class="step-dots" aria-hidden="true">
              <span
                v-for="(_, idx) in STEPS"
                :key="idx"
                class="dot"
                :class="{ 'is-active': idx === currentStep }"
              ></span>
            </div>

            <!-- Navigation Buttons -->
            <div class="tutorial-actions">
              <button
                v-if="currentStep > 0"
                type="button"
                class="btn-prev"
                @click="prevStep"
              >
                ◀ ANTERIOR
              </button>
              <button
                type="button"
                class="btn-next"
                @click="nextStep"
              >
                {{ currentStep < STEPS.length - 1 ? 'SIGUIENTE ▶' : '¡EMPEZAR A JUGAR!' }}
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(15, 23, 42, 0.58);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10005;
  padding: 16px;
  box-sizing: border-box;
}

.tutorial-card {
  width: 94%;
  max-width: 370px;
  background: #f8fafc;
  border: 4px solid #10b981;
  border-radius: 28px;
  box-shadow:
    0 10px 0 #059669,
    0 25px 40px rgba(0, 0, 0, 0.35);
  position: relative;
  text-align: center;
  padding: 24px 18px 20px;
  box-sizing: border-box;
  margin-top: 16px;
}

.window-tab {
  position: absolute;
  top: -30px;
  left: 20px;
  background: #10b981;
  border: 3px solid #059669;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 4px 14px 2px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
}

.modal-close-corner {
  position: absolute;
  top: 12px;
  right: 12px;
  background: #ef4444;
  border: 2px solid #b91c1c;
  box-shadow: 0 3px 0 #991b1b;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.close-icon {
  width: 14px;
  height: 14px;
}

.step-badge {
  display: inline-block;
  background: #dcfce7;
  color: #047857;
  border: 1.5px solid #86efac;
  border-radius: 10px;
  padding: 2px 10px;
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 900;
  margin-bottom: 6px;
}

.step-title {
  font-family: var(--game-font, sans-serif);
  font-size: 1.2rem;
  font-weight: 900;
  color: #065f46;
  margin: 0 0 12px;
}

.step-illustration {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  border: 2px solid #6ee7b7;
  border-radius: 20px;
  padding: 14px;
  font-size: 2rem;
  margin-bottom: 12px;
  box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.04);
}

.step-box {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 12px 14px;
  margin-bottom: 14px;
}

.step-desc {
  font-size: 13px;
  line-height: 1.45;
  color: #334155;
  font-weight: 600;
  margin: 0 0 10px;
}

.step-tip {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 6px 8px;
  font-size: 11px;
  font-weight: 700;
  color: #92400e;
}

.step-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 14px;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #cbd5e1;
  transition: all 0.2s;
}

.dot.is-active {
  width: 22px;
  border-radius: 6px;
  background: #10b981;
}

.tutorial-actions {
  display: flex;
  gap: 8px;
}

.btn-prev {
  flex: 0 0 auto;
  background: #e2e8f0;
  border: 2px solid #94a3b8;
  box-shadow: 0 4px 0 #64748b;
  border-radius: 16px;
  padding: 11px 14px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #334155;
  cursor: pointer;
}

.btn-next {
  flex: 1;
  background: #10b981;
  border: 2.5px solid #059669;
  box-shadow: 0 4px 0 #047857;
  border-radius: 16px;
  padding: 11px 16px;
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #ffffff;
  cursor: pointer;
}

.btn-prev:active,
.btn-next:active {
  transform: translateY(2px);
}
</style>

