<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { GAME_WORLDS, type WorldInfo } from '../game/levelConfig';
import { playClick, playTap } from '../game/sounds';

const props = defineProps<{
  isOpen: boolean;
  currentLevel: number;
  maxUnlockedLevel: number;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'select-level', level: number): void;
}>();

// Selected era tab for fast navigation through the 100 worlds
// Eras of 20 worlds each: 1-20, 21-40, 41-60, 61-80, 81-100
type EraId = 1 | 2 | 3 | 4 | 5;
const activeEra = ref<EraId>(1);

const ERAS = [
  { id: 1 as EraId, label: 'Mundos 1-20', icon: '🍓', minWorld: 1, maxWorld: 20 },
  { id: 2 as EraId, label: 'Mundos 21-40', icon: '☁️', minWorld: 21, maxWorld: 40 },
  { id: 3 as EraId, label: 'Mundos 41-60', icon: '🦁', minWorld: 41, maxWorld: 60 },
  { id: 4 as EraId, label: 'Mundos 61-80', icon: '🏟️', minWorld: 61, maxWorld: 80 },
  { id: 5 as EraId, label: 'Mundos 81-100', icon: '👑', minWorld: 81, maxWorld: 100 },
];

// Expanded world ID to view individual levels inside
const expandedWorldId = ref<number | null>(null);

// Find which world the current level belongs to
const currentWorld = computed(() => {
  return GAME_WORLDS.find(w => props.currentLevel >= w.minLevel && props.currentLevel <= w.maxLevel) || GAME_WORLDS[0];
});

// Auto-switch to current world's era when modal opens
watch(() => props.isOpen, (open) => {
  if (open) {
    const cWorld = currentWorld.value;
    const era = ERAS.find(e => cWorld.id >= e.minWorld && cWorld.id <= e.maxWorld);
    if (era) {
      activeEra.value = era.id;
    }
    expandedWorldId.value = cWorld.id;
  }
});

// Filtered worlds for the active era
const visibleWorlds = computed(() => {
  const era = ERAS.find(e => e.id === activeEra.value);
  if (!era) return GAME_WORLDS.slice(0, 20);
  return GAME_WORLDS.filter(w => w.id >= era.minWorld && w.id <= era.maxWorld);
});

const close = () => {
  playClick();
  emit('update:isOpen', false);
};

const setEra = (eraId: EraId) => {
  playTap();
  activeEra.value = eraId;
};

const toggleExpandWorld = (worldId: number) => {
  playTap();
  expandedWorldId.value = expandedWorldId.value === worldId ? null : worldId;
};

const handleSelectLevel = (lvl: number) => {
  if (lvl > props.maxUnlockedLevel) return;
  playClick();
  emit('select-level', lvl);
  emit('update:isOpen', false);
};

const getWorldStatus = (world: WorldInfo): 'completed' | 'current' | 'unlocked' | 'locked' => {
  if (props.maxUnlockedLevel > world.maxLevel) return 'completed';
  if (props.currentLevel >= world.minLevel && props.currentLevel <= world.maxLevel) return 'current';
  if (props.maxUnlockedLevel >= world.minLevel) return 'unlocked';
  return 'locked';
};

const jumpToCurrentWorld = () => {
  playTap();
  const cWorld = currentWorld.value;
  const era = ERAS.find(e => cWorld.id >= e.minWorld && cWorld.id <= e.maxWorld);
  if (era) activeEra.value = era.id;
  expandedWorldId.value = cWorld.id;
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="isOpen" class="dialog-backdrop" @click.self="close">
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card map-card">

            <!-- Window Tab -->
            <div class="window-tab">
              <span>🗺️ MAPA DE MUNDOS</span>
            </div>

            <!-- Close Button -->
            <button class="modal-close-corner" @click="close" title="Cerrar">
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <!-- Header with Current Progress -->
            <div class="map-header">
              <h2 class="map-title">MUNDOS Y NIVELES</h2>
              <div class="current-progress-banner" @click="jumpToCurrentWorld" title="Toca para ir a tu nivel actual">
                <span class="banner-icon">{{ currentWorld.icon }}</span>
                <div class="banner-info">
                  <span class="banner-label">NIVEL ACTUAL: <strong>{{ currentLevel }}</strong></span>
                  <span class="banner-sub">Mundo {{ currentWorld.id }}: {{ currentWorld.name }}</span>
                </div>
                <span class="banner-jump-btn">📍 IR</span>
              </div>
            </div>

            <!-- Era Tabs for 100 Worlds -->
            <div class="era-tab-bar">
              <button
                v-for="era in ERAS"
                :key="era.id"
                class="era-btn"
                :class="{ 'is-active': activeEra === era.id }"
                @click="setEra(era.id)"
              >
                <span class="era-icon">{{ era.icon }}</span>
                <span class="era-label">{{ era.label }}</span>
              </button>
            </div>

            <!-- Worlds List (Scrollable) -->
            <div class="worlds-scroll-area">
              <div
                v-for="world in visibleWorlds"
                :key="world.id"
                class="world-item-card"
                :class="`status-${getWorldStatus(world)}`"
              >
                <!-- World Header Row -->
                <div class="world-card-header" @click="toggleExpandWorld(world.id)">
                  <div class="world-badge-icon">
                    <span>{{ world.icon }}</span>
                  </div>

                  <div class="world-title-area">
                    <div class="world-num-name">
                      <span class="world-num">Mundo {{ world.id }}</span>
                      <h3 class="world-name">{{ world.name }}</h3>
                    </div>
                    <span class="world-range">Niveles {{ world.minLevel }} - {{ world.maxLevel }}</span>
                  </div>

                  <!-- Status Pill -->
                  <div class="world-status-pill">
                    <span v-if="getWorldStatus(world) === 'completed'" class="pill pill-completed">⭐ Listo</span>
                    <span v-else-if="getWorldStatus(world) === 'current'" class="pill pill-current">🔥 Actual</span>
                    <span v-else-if="getWorldStatus(world) === 'unlocked'" class="pill pill-unlocked">🔓 Abierto</span>
                    <span v-else class="pill pill-locked">🔒 Bloqueado</span>
                  </div>

                  <!-- Expand Arrow -->
                  <span class="expand-arrow" :class="{ 'is-expanded': expandedWorldId === world.id }">
                    ▼
                  </span>
                </div>

                <!-- Expanded Levels Grid -->
                <div v-if="expandedWorldId === world.id" class="levels-grid-container">
                  <div class="levels-grid">
                    <button
                      v-for="lvl in (world.maxLevel - world.minLevel + 1)"
                      :key="lvl"
                      class="level-circle-btn"
                      :class="{
                        'is-completed': (world.minLevel + lvl - 1) < maxUnlockedLevel,
                        'is-current': (world.minLevel + lvl - 1) === currentLevel,
                        'is-unlocked': (world.minLevel + lvl - 1) <= maxUnlockedLevel && (world.minLevel + lvl - 1) !== currentLevel,
                        'is-locked': (world.minLevel + lvl - 1) > maxUnlockedLevel
                      }"
                      :disabled="(world.minLevel + lvl - 1) > maxUnlockedLevel"
                      @click="handleSelectLevel(world.minLevel + lvl - 1)"
                      :title="`Nivel ${world.minLevel + lvl - 1}`"
                    >
                      <span class="lvl-num">{{ world.minLevel + lvl - 1 }}</span>
                      <span v-if="(world.minLevel + lvl - 1) === currentLevel" class="lvl-indicator">▶</span>
                      <span v-else-if="(world.minLevel + lvl - 1) < maxUnlockedLevel" class="lvl-indicator">★</span>
                      <span v-else-if="(world.minLevel + lvl - 1) > maxUnlockedLevel" class="lvl-indicator">🔒</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>

            <!-- Bottom Close Button -->
            <button class="map-close-btn" @click="close">
              <span>VOLVER AL JUEGO</span>
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
  top: 0; left: 0;
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
.map-card {
  width: 94%;
  max-width: 420px;
  max-height: calc(100dvh - 36px);
  max-height: calc(100vh - 36px);
  background: #f8fafc;
  border: 4px solid #3b82f6;
  border-radius: 28px;
  box-shadow:
    0 10px 0 #1d4ed8,
    0 25px 40px rgba(0, 0, 0, 0.35);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 14px 14px;
  box-sizing: border-box;
  overflow: hidden;
  margin-top: 15px;
}

/* Protruding Window Tab */
.window-tab {
  position: absolute;
  top: -30px;
  left: 20px;
  background: #3b82f6;
  border: 3px solid #1d4ed8;
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
  top: 12px; right: 12px;
  background: #ef4444;
  border: 2px solid #b91c1c;
  box-shadow: 0 3px 0 #991b1b;
  border-radius: 50%;
  width: 30px; height: 30px;
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
  width: 14px; height: 14px;
  object-fit: contain;
}

/* ─── Header ──────────────────────────────────────────────── */
.map-header {
  text-align: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.map-title {
  font-family: var(--game-font, sans-serif);
  font-size: 1.1rem;
  font-weight: 900;
  color: #1e3a8a;
  margin: 0 0 6px 0;
  letter-spacing: 0.5px;
}

.current-progress-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 2px solid #3b82f6;
  border-radius: 16px;
  padding: 6px 10px;
  box-shadow: 0 3px 0 #2563eb;
  cursor: pointer;
  transition: transform 0.1s ease;
}

.current-progress-banner:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #2563eb;
}

.banner-icon {
  font-size: 20px;
}

.banner-info {
  flex: 1;
  text-align: left;
  display: flex;
  flex-direction: column;
}

.banner-label {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #1e40af;
}

.banner-sub {
  font-size: 10px;
  color: #3b82f6;
  font-weight: 700;
}

.banner-jump-btn {
  background: #3b82f6;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 900;
  padding: 4px 8px;
  border-radius: 8px;
}

/* ─── Era Tab Bar ─────────────────────────────────────────── */
.era-tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}

.era-btn {
  flex: 1;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 4px 2px;
  cursor: pointer;
  box-shadow: 0 2px 0 #cbd5e1;
  transition: all 0.15s ease;
}

.era-btn.is-active {
  background: #3b82f6;
  border-color: #1d4ed8;
  color: #ffffff;
  box-shadow: 0 3px 0 #1e40af;
}

.era-btn:active {
  transform: translateY(1px);
}

.era-icon {
  font-size: 12px;
}

.era-label {
  font-family: var(--game-font, sans-serif);
  font-size: 8px;
  font-weight: 800;
  white-space: nowrap;
  color: #64748b;
}

.era-btn.is-active .era-label {
  color: #ffffff;
}

/* ─── Scroll Area ─────────────────────────────────────────── */
.worlds-scroll-area {
  overflow-y: auto;
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 2px;
}

/* ─── World Card ──────────────────────────────────────────── */
.world-item-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 2px 0 #cbd5e1;
  overflow: hidden;
  transition: all 0.2s ease;
}

.world-item-card.status-current {
  border-color: #f59e0b;
  background: #fffbeb;
  box-shadow: 0 3px 0 #d97706, 0 0 10px rgba(245, 158, 11, 0.15);
}

.world-item-card.status-completed {
  border-color: #10b981;
}

.world-item-card.status-locked {
  opacity: 0.65;
  background: #f1f5f9;
}

.world-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  cursor: pointer;
}

.world-badge-icon {
  width: 36px;
  height: 36px;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.status-current .world-badge-icon {
  background: #fef3c7;
  border-color: #fde68a;
}

.world-title-area {
  flex: 1;
  min-width: 0;
}

.world-num-name {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

.world-num {
  font-size: 9px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
}

.world-name {
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.world-range {
  font-size: 9px;
  color: #94a3b8;
  font-weight: 700;
}

/* Status Pill */
.world-status-pill {
  flex-shrink: 0;
}

.pill {
  font-family: var(--game-font, sans-serif);
  font-size: 9px;
  font-weight: 900;
  padding: 3px 6px;
  border-radius: 8px;
}

.pill-completed {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.pill-current {
  background: #fef3c7;
  color: #b45309;
  border: 1px solid #fcd34d;
}

.pill-unlocked {
  background: #e0f2fe;
  color: #0369a1;
  border: 1px solid #7dd3fc;
}

.pill-locked {
  background: #f1f5f9;
  color: #94a3b8;
  border: 1px solid #cbd5e1;
}

.expand-arrow {
  font-size: 9px;
  color: #94a3b8;
  transition: transform 0.2s ease;
}

.expand-arrow.is-expanded {
  transform: rotate(180deg);
}

/* ─── Levels Grid Inside World ────────────────────────────── */
.levels-grid-container {
  padding: 8px 10px 10px;
  border-top: 1px dashed #e2e8f0;
  background: rgba(255, 255, 255, 0.6);
}

.levels-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.level-circle-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 38px;
  border-radius: 12px;
  border: 2px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
  box-shadow: 0 2px 0 #cbd5e1;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  padding: 2px;
}

.level-circle-btn:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 0 0 #cbd5e1;
}

.level-circle-btn.is-completed {
  background: #dcfce7;
  border-color: #22c55e;
  box-shadow: 0 2px 0 #16a34a;
}

.level-circle-btn.is-completed .lvl-num {
  color: #15803d;
}

.level-circle-btn.is-completed .lvl-indicator {
  color: #f59e0b;
}

.level-circle-btn.is-current {
  background: #fef3c7;
  border-color: #f59e0b;
  box-shadow: 0 3px 0 #d97706;
  animation: pulseCurrent 1.5s infinite;
}

.level-circle-btn.is-current .lvl-num {
  color: #b45309;
  font-weight: 900;
}

.level-circle-btn.is-current .lvl-indicator {
  color: #ea580c;
  font-weight: 900;
}

.level-circle-btn.is-locked {
  background: #f1f5f9;
  border-color: #e2e8f0;
  opacity: 0.6;
  cursor: not-allowed;
}

.level-circle-btn.is-locked .lvl-num {
  color: #94a3b8;
}

.lvl-num {
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #1e293b;
  line-height: 1;
}

.lvl-indicator {
  font-size: 8px;
  margin-top: 1px;
}

@keyframes pulseCurrent {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

/* ─── Bottom Button ───────────────────────────────────────── */
.map-close-btn {
  margin-top: 8px;
  background: #3b82f6;
  border: 3px solid #1d4ed8;
  box-shadow: 0 5px 0 #1e40af;
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

.map-close-btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #1e40af;
}

/* ─── Dialog Transitions ──────────────────────────────────── */
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

