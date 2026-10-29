<script setup lang="ts">
import { ref } from 'vue';
import { useGameSettings } from '../composables/useGameSettings';
import { playClick, playSwitch } from '../game/sounds';

const props = defineProps<{
  isOpen: boolean;
  username: string;
  userUid?: string;
  currentLevel?: number;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'edit-name'): void;
  (e: 'restore-progress'): void;
  (e: 'open-tutorial'): void;
}>();

const {
  sfxEnabled,
  sfxVolume,
  musicEnabled,
  musicVolume,
  vibrationEnabled,
  toggleSfx,
  setSfxVolume,
  toggleMusic,
  setMusicVolume,
  toggleVibration,
  developerName,
  gameVersion,
  appTitle,
} = useGameSettings();

const copiedUid = ref(false);

const close = () => {
  playClick();
  emit('update:isOpen', false);
};

const handleVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setSfxVolume(Number(target.value));
  playClick();
};

const handleMusicVolumeChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  setMusicVolume(Number(target.value));
};

const handleToggleSfx = () => {
  toggleSfx();
  playSwitch();
};

const handleToggleMusic = () => {
  toggleMusic();
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

const handleRestoreProgress = () => {
  playClick();
  emit('restore-progress');
};

const handleOpenTutorial = () => {
  playClick();
  emit('open-tutorial');
};

const copyRecoveryId = async () => {
  if (!props.userUid) return;
  playClick();
  try {
    await navigator.clipboard.writeText(props.userUid);
    copiedUid.value = true;
    setTimeout(() => {
      copiedUid.value = false;
    }, 2000);
  } catch {
    // ignore
  }
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
        aria-label="Configuración"
        @click.self="close"
      >
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card settings-card">
            <div class="window-tab">
              <span>⚙️ AJUSTES</span>
            </div>

            <button
              type="button"
              class="modal-close-corner"
              @click="close"
              title="Cerrar"
              aria-label="Cerrar ajustes"
            >
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <div class="settings-header">
              <h2 class="settings-title">CONFIGURACIÓN</h2>
              <p class="settings-subtitle">{{ appTitle }}</p>
            </div>

            <div class="settings-body">
              <!-- ─── Audio Section ─── -->
              <div class="setting-group">
                <div class="group-title">🔊 AUDIO Y MÚSICA</div>

                <!-- Toggle SFX -->
                <div class="setting-row">
                  <div class="row-info">
                    <span class="row-label">Efectos Sonoros</span>
                    <span class="row-desc">Sonidos de fichas y combinaciones</span>
                  </div>
                  <button
                    type="button"
                    class="kenney-toggle"
                    :class="{ 'is-active': sfxEnabled }"
                    :aria-pressed="sfxEnabled"
                    aria-label="Activar o desactivar efectos sonoros"
                    @click="handleToggleSfx"
                  >
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-text">{{ sfxEnabled ? 'SÍ' : 'NO' }}</span>
                  </button>
                </div>

                <!-- SFX Volume Slider -->
                <div class="setting-row volume-slider-row" v-if="sfxEnabled">
                  <div class="slider-header">
                    <span class="row-label">Volumen Efectos</span>
                    <span class="slider-val">{{ sfxVolume }}%</span>
                  </div>
                  <div class="slider-container">
                    <span class="slider-icon" aria-hidden="true">🔈</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      :value="sfxVolume"
                      aria-label="Volumen de efectos sonoros"
                      @input="handleVolumeChange"
                      class="kenney-slider"
                    />
                    <span class="slider-icon" aria-hidden="true">🔊</span>
                  </div>
                </div>

                <!-- Toggle Music -->
                <div class="setting-row music-toggle-row">
                  <div class="row-info">
                    <span class="row-label">Música Ambiental</span>
                    <span class="row-desc">Melodía relajante de fondo</span>
                  </div>
                  <button
                    type="button"
                    class="kenney-toggle"
                    :class="{ 'is-active': musicEnabled }"
                    :aria-pressed="musicEnabled"
                    aria-label="Activar o desactivar música ambiental"
                    @click="handleToggleMusic"
                  >
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-text">{{ musicEnabled ? 'SÍ' : 'NO' }}</span>
                  </button>
                </div>

                <!-- Music Volume Slider -->
                <div class="setting-row volume-slider-row" v-if="musicEnabled">
                  <div class="slider-header">
                    <span class="row-label">Volumen Música</span>
                    <span class="slider-val">{{ musicVolume }}%</span>
                  </div>
                  <div class="slider-container">
                    <span class="slider-icon" aria-hidden="true">🎵</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      :value="musicVolume"
                      aria-label="Volumen de música ambiental"
                      @input="handleMusicVolumeChange"
                      class="kenney-slider"
                    />
                    <span class="slider-icon" aria-hidden="true">🎶</span>
                  </div>
                </div>
              </div>

              <!-- ─── Feedback & Help Section ─── -->
              <div class="setting-group">
                <div class="group-title">📳 HÁPTICA Y AYUDA</div>
                <div class="setting-row">
                  <div class="row-info">
                    <span class="row-label">Vibración Nativa</span>
                    <span class="row-desc">Respuesta táctil al tocar fichas</span>
                  </div>
                  <button
                    type="button"
                    class="kenney-toggle"
                    :class="{ 'is-active': vibrationEnabled }"
                    :aria-pressed="vibrationEnabled"
                    aria-label="Activar o desactivar vibración"
                    @click="handleToggleVib"
                  >
                    <span class="toggle-track">
                      <span class="toggle-thumb"></span>
                    </span>
                    <span class="toggle-text">{{ vibrationEnabled ? 'SÍ' : 'NO' }}</span>
                  </button>
                </div>

                <div class="setting-row tutorial-row">
                  <div class="row-info">
                    <span class="row-label">Guía de Juego</span>
                    <span class="row-desc">Repasa las reglas en 3 pasos</span>
                  </div>
                  <button type="button" class="btn-edit-profile" @click="handleOpenTutorial">
                    <span>📖 Tutorial</span>
                  </button>
                </div>
              </div>

              <!-- ─── Player Section ─── -->
              <div class="setting-group">
                <div class="group-title">👤 PERFIL Y SEGURIDAD</div>
                <div class="setting-row player-row">
                  <div class="player-info">
                    <span class="row-label">Tu Apodo</span>
                    <span class="player-current-name">{{ username || 'Jugador' }}</span>
                  </div>
                  <button type="button" class="btn-edit-profile" @click="handleEditName">
                    <span>✏️ Cambiar</span>
                  </button>
                </div>

                <!-- Private Recovery Code Box -->
                <div class="setting-row player-row uid-row" v-if="userUid">
                  <div class="player-info uid-info">
                    <span class="row-label">Código de Recuperación Privado</span>
                    <code class="uid-code">{{ userUid }}</code>
                  </div>
                  <button type="button" class="btn-copy-uid" @click="copyRecoveryId">
                    <span>{{ copiedUid ? '✅ Copiado' : '📋 Copiar' }}</span>
                  </button>
                </div>

                <!-- Recovery Row -->
                <div class="setting-row player-row recovery-row">
                  <div class="player-info">
                    <span class="row-label">
                      Nivel Actual: <strong class="lvl-highlight">{{ currentLevel || 1 }}</strong>
                    </span>
                    <span class="row-desc">Restaurar con Código Privado</span>
                  </div>
                  <button type="button" class="btn-restore-profile" @click="handleRestoreProgress">
                    <span>🔄 Recuperar</span>
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
                <p class="dev-tagline">"Hecho con pasión y dedicación"</p>
              </div>
            </div>

            <button type="button" class="settings-ok-btn" @click="close">
              <span>¡ENTENDIDO!</span>
            </button>
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
  z-index: 5;
}

.close-icon {
  width: 14px;
  height: 14px;
  object-fit: contain;
}

.settings-header {
  text-align: center;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.settings-title {
  font-family: var(--game-font, sans-serif);
  font-size: 1.3rem;
  font-weight: 900;
  color: #0369a1;
  margin: 0;
}

.settings-subtitle {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 11px;
  font-weight: 700;
  color: #64748b;
  margin: 2px 0 0;
}

.settings-body {
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px 8px;
  flex: 1 1 auto;
}

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

.music-toggle-row,
.tutorial-row {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e2e8f0;
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
}

.volume-slider-row {
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  margin-top: 6px;
  padding-top: 6px;
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
  width: 18px;
  height: 18px;
  background: #f8be14;
  border: 2px solid #b8860b;
  border-radius: 50%;
  cursor: pointer;
}

.player-row {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 12px;
  padding: 8px 10px;
}

.player-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.uid-row {
  margin-top: 6px;
  background: #f8fafc;
  border-color: #cbd5e1;
}

.uid-info {
  flex: 1;
}

.uid-code {
  font-size: 9px;
  color: #475569;
  background: #e2e8f0;
  padding: 2px 5px;
  border-radius: 6px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.btn-copy-uid {
  background: #64748b;
  border: 1.5px solid #475569;
  box-shadow: 0 2px 0 #334155;
  border-radius: 10px;
  color: #fff;
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  padding: 5px 8px;
  cursor: pointer;
  flex-shrink: 0;
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

.recovery-row {
  margin-top: 6px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
}

.lvl-highlight {
  color: #059669;
}

.btn-restore-profile {
  background: #10b981;
  border: 1.5px solid #059669;
  box-shadow: 0 3px 0 #047857;
  border-radius: 12px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  padding: 5px 9px;
  cursor: pointer;
}

.developer-card {
  background: linear-gradient(145deg, #fffbeb 0%, #fef3c7 100%);
  border: 2.5px solid #f8be14;
  border-radius: 20px;
  padding: 12px;
  text-align: center;
  box-shadow: 0 4px 0 #d97706;
}

.dev-badge {
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  color: #b45309;
  margin-bottom: 2px;
}

.dev-signature-title {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #78350f;
}

.dev-name {
  font-family: var(--game-font, sans-serif);
  font-size: 1.1rem;
  font-weight: 900;
  color: #92400e;
  margin: 2px 0;
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
  margin: 2px 0 4px;
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

.dev-tagline {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-style: italic;
  font-weight: 600;
  color: #a16207;
  margin: 4px 0 0;
}

.settings-ok-btn {
  margin-top: 8px;
  background: #38c644;
  border: 3px solid #278d30;
  box-shadow: 0 5px 0 #1b6822;
  border-radius: 18px;
  padding: 10px 16px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
</style>
