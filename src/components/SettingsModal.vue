<script setup lang="ts">
import { useGameSettings } from '../composables/useGameSettings';
import { playClick, playSwitch } from '../game/sounds';

defineProps<{
  isOpen: boolean;
  username: string;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'edit-name'): void;
}>();

const {
  sfxEnabled,
  sfxVolume,
  vibrationEnabled,
  toggleSfx,
  setSfxVolume,
  toggleVibration,
  developerName,
  gameVersion,
  appTitle,
} = useGameSettings();

const close = () => {
  playClick();
  emit('update:isOpen', false);
};

const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const val = Number(target.value);
  setSfxVolume(val);
  playClick();
};

const handleToggleSfx = () => {
  toggleSfx();
  playSwitch();
};

const handleToggleVib = () => {
  toggleVibration();
  playSwitch();
};

const handleEditName = () => {
  playClick();
  emit('edit-name');
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="isOpen" class="dialog-backdrop" @click.self="close">
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card settings-card">
            <!-- Window Tab on Top -->
            <div class="window-tab">
              <span>⚙️ AJUSTES</span>
            </div>

            <!-- Close Button Corner -->
            <button class="modal-close-corner" @click="close" title="Cerrar">
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <!-- Modal Title -->
            <div class="settings-header">
              <h2 class="settings-title">CONFIGURACIÓN</h2>
              <p class="settings-subtitle">{{ appTitle }}</p>
            </div>

            <!-- Settings Content -->
            <div class="settings-body">
              
              <!-- ─── Audio Section ─── -->
              <div class="setting-group">
                <div class="group-title">🔊 AUDIO Y SONIDO</div>
                
                <!-- Toggle SFX -->
                <div class="setting-row">
                  <div class="row-info">
                    <span class="row-label">Efectos Sonoros</span>
                    <span class="row-desc">Sonidos de fichas y combinaciones</span>
                  </div>
                  <button
                    class="kenney-toggle"
                    :class="{ 'is-active': sfxEnabled }"
                    @click="handleToggleSfx"
                  >
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-text">{{ sfxEnabled ? 'SÍ' : 'NO' }}</span>
                  </button>
                </div>

                <!-- Volume Slider -->
                <div class="setting-row volume-slider-row" v-if="sfxEnabled">
                  <div class="slider-header">
                    <span class="row-label">Volumen General</span>
                    <span class="slider-val">{{ sfxVolume }}%</span>
                  </div>
                  <div class="slider-container">
                    <span class="slider-icon">🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      :value="sfxVolume"
                      @input="handleVolumeChange"
                      class="kenney-slider"
                    />
                    <span class="slider-icon">🔊</span>
                  </div>
                </div>
              </div>

              <!-- ─── Feedback Section ─── -->
              <div class="setting-group">
                <div class="group-title">📳 RESPUESTA HÁPTICA</div>
                <div class="setting-row">
                  <div class="row-info">
                    <span class="row-label">Vibración</span>
                    <span class="row-desc">Vibrar suavemente al tocar fichas</span>
                  </div>
                  <button
                    class="kenney-toggle"
                    :class="{ 'is-active': vibrationEnabled }"
                    @click="handleToggleVib"
                  >
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-text">{{ vibrationEnabled ? 'SÍ' : 'NO' }}</span>
                  </button>
                </div>
              </div>

              <!-- ─── Player Section ─── -->
              <div class="setting-group">
                <div class="group-title">👤 PERFIL DE JUGADOR</div>
                <div class="setting-row player-row">
                  <div class="player-info">
                    <span class="row-label">Tu Apodo</span>
                    <span class="player-current-name">{{ username || 'Jugador' }}</span>
                  </div>
                  <button class="btn-edit-profile" @click="handleEditName">
                    <span>✏️ Cambiar</span>
                  </button>
                </div>
              </div>

              <!-- ─── Developer Author Signature Card ─── -->
              <div class="developer-card">
                <div class="dev-badge">⭐ CRÉDITOS Y AUTORÍA ⭐</div>
                <div class="dev-signature-title">DESARROLLADO POR</div>
                <h3 class="dev-name">{{ developerName }}</h3>
                <div class="dev-role-chip">Arquitectura, Lógica y Diseño</div>
                <div class="dev-meta">
                  <span class="meta-item">{{ appTitle }}</span>
                  <span class="meta-dot">•</span>
                  <span class="meta-item">{{ gameVersion }}</span>
                </div>
                <p class="dev-tagline">"Primera versión oficial • Hecho con pasión y dedicación"</p>
              </div>

            </div>

            <!-- Bottom Close Action -->
            <button class="settings-ok-btn" @click="close">
              <span>¡ENTENDIDO!</span>
            </button>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Backdrop ────────────────────────────────────────────── */
.dialog-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 14px;
  box-sizing: border-box;
}

/* ─── Card Base ───────────────────────────────────────────── */
.settings-card {
  width: 94%;
  max-width: 380px;
  max-height: calc(100dvh - 36px);
  max-height: calc(100vh - 36px);
  background: #f8fafc;
  border: 4px solid #38bdf8;
  border-radius: 28px;
  box-shadow: 
    0 10px 0 #0284c7,
    0 25px 40px rgba(0, 0, 0, 0.35);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 18px 18px;
  box-sizing: border-box;
  overflow: hidden;
  margin-top: 15px;
}

/* Protruding Window Tab */
.window-tab {
  position: absolute;
  top: -30px;
  left: 20px;
  background: #38bdf8;
  border: 3px solid #0284c7;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 4px 14px 2px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
  box-shadow: 0 -2px 0 rgba(0,0,0,0.1);
}

/* Close Corner */
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
  z-index: 5;
  transition: transform 0.1s ease;
}

.modal-close-corner:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #991b1b;
}

.close-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

/* Header */
.settings-header {
  text-align: center;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.settings-title {
  font-family: var(--game-font, sans-serif);
  font-size: 1.35rem;
  font-weight: 900;
  color: #0369a1;
  margin: 0;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.settings-subtitle {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  margin: 2px 0 0;
}

/* Body Scrollable Area */
.settings-body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 2px 8px;
  flex: 1 1 auto;
}

/* Setting Groups */
.setting-group {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 10px 12px;
  box-shadow: 0 2px 0 #cbd5e1;
}

.group-title {
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 900;
  color: #0284c7;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.row-info {
  display: flex;
  flex-direction: column;
}

.row-label {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #1e293b;
}

.row-desc {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
}

/* Kenney Toggle Switch */
.kenney-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
}

.toggle-track {
  width: 44px;
  height: 24px;
  background: #cbd5e1;
  border: 2px solid #94a3b8;
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 0.15);
  border-radius: 14px;
  display: flex;
  align-items: center;
  padding: 2px;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

.toggle-thumb {
  width: 16px;
  height: 16px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.kenney-toggle.is-active .toggle-track {
  background: #38c644;
  border-color: #278d30;
}

.kenney-toggle.is-active .toggle-thumb {
  transform: translateX(20px);
}

.toggle-text {
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 900;
  color: #334155;
  min-width: 20px;
  text-align: left;
}

/* Volume Slider */
.volume-slider-row {
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.slider-val {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #0284c7;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.slider-icon {
  font-size: 13px;
}

.kenney-slider {
  flex: 1;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  background: #e2e8f0;
  border-radius: 6px;
  outline: none;
}

.kenney-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #f8be14;
  border: 2px solid #b8860b;
  box-shadow: 0 2px 0 #8c6503;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.kenney-slider::-webkit-slider-thumb:active {
  transform: scale(1.15);
}

/* Player Row */
.player-row {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 8px 10px;
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-current-name {
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #0284c7;
}

.btn-edit-profile {
  background: #38bdf8;
  border: 1.5px solid #0284c7;
  box-shadow: 0 3px 0 #0369a1;
  border-radius: 12px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  padding: 5px 9px;
  cursor: pointer;
}

.btn-edit-profile:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #0369a1;
}

/* ─── Developer Signature Card ─── */
.developer-card {
  background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
  border: 2.5px solid #f8be14;
  border-radius: 20px;
  padding: 14px 12px;
  text-align: center;
  box-shadow: 
    0 4px 0 #d97706,
    0 8px 16px rgba(245, 158, 11, 0.15);
  position: relative;
  outline: 2px dashed rgba(217, 119, 6, 0.35);
  outline-offset: -5px;
}

.dev-badge {
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  color: #b45309;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.dev-signature-title {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #78350f;
  letter-spacing: 1px;
}

.dev-name {
  font-family: var(--game-font, sans-serif);
  font-size: 1.15rem;
  font-weight: 900;
  color: #92400e;
  margin: 4px 0 2px;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);
}

.dev-role-chip {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 700;
  color: #b45309;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid #fde68a;
  border-radius: 10px;
  display: inline-block;
  padding: 2px 8px;
  margin: 4px 0 6px;
}

.dev-meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 800;
  color: #78350f;
}

.meta-dot {
  opacity: 0.5;
}

.dev-tagline {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-style: italic;
  font-weight: 600;
  color: #a16207;
  margin: 6px 0 0;
}

/* Bottom OK Button */
.settings-ok-btn {
  margin-top: 10px;
  background: #38c644;
  border: 3px solid #278d30;
  box-shadow: 0 5px 0 #1b6822;
  border-radius: 18px;
  padding: 10px 16px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  flex-shrink: 0;
}

.settings-ok-btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #1b6822;
}

/* Dialog Transitions */
.dialog-fade-enter-active, .dialog-fade-leave-active {
  transition: opacity 0.22s ease;
}
.dialog-fade-enter-from, .dialog-fade-leave-to {
  opacity: 0;
}

.dialog-pop-enter-active {
  animation: cardBounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dialog-pop-leave-active {
  animation: cardBounce 0.2s reverse ease-in;
}

@keyframes cardBounce {
  0% { transform: scale(0.7) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
</style>

