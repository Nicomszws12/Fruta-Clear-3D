<script setup lang="ts">
/**
 * TutorialMiniBoard — Ola 3: a tiny fake board the player can actually tap.
 *
 * mode="match":  6 tiles (2 types × 3). Tap → tile flies down to a mini tray,
 *                3 equal tiles pop. Clear them all to "solve" the step.
 * mode="layers": 2 tiles on top lock 3 tiles underneath (🔒). Tapping a locked
 *                tile wiggles it; removing the top ones unlocks the bottom.
 */
import { ref, computed, watch } from 'vue';
import { getAssetByKey } from '../game/tileAssets';
import { playClick, playTap, playMatch } from '../game/sounds';

const props = defineProps<{
  mode: 'match' | 'layers';
}>();

const emit = defineEmits<{
  (e: 'solved'): void;
}>();

interface MiniTile {
  id: string;
  type: string;
  x: number; // column (can be fractional for offset layers)
  y: number; // row
  z: number;
}

const TRAY_SLOTS = 5;

const buildTiles = (): MiniTile[] => {
  if (props.mode === 'match') {
    const types = ['strawberry', 'strawberry', 'strawberry', 'lemon', 'lemon', 'lemon'];
    // Deterministic but mixed layout so it never looks pre-sorted
    const order = [0, 3, 1, 4, 5, 2];
    return order.map((typeIdx, i) => ({
      id: `m${i}`,
      type: types[typeIdx],
      x: i % 3,
      y: Math.floor(i / 3),
      z: 0,
    }));
  }
  return [
    { id: 'g0', type: 'grapes', x: 0, y: 0.5, z: 0 },
    { id: 'g1', type: 'grapes', x: 1, y: 0.5, z: 0 },
    { id: 'g2', type: 'grapes', x: 2, y: 0.5, z: 0 },
    { id: 'a0', type: 'apple', x: 0.5, y: 0.25, z: 1 },
    { id: 'a1', type: 'apple', x: 1.5, y: 0.25, z: 1 },
  ];
};

const tiles = ref<MiniTile[]>(buildTiles());
const tray = ref<MiniTile[]>([]);
const poppingIds = ref<Set<string>>(new Set());
const wiggleId = ref<string | null>(null);
const isSolved = ref(false);
const lockedHint = ref(false);

const reset = () => {
  tiles.value = buildTiles();
  tray.value = [];
  poppingIds.value = new Set();
  wiggleId.value = null;
  isSolved.value = false;
  lockedHint.value = false;
};

watch(() => props.mode, reset);

const isBlocked = (t: MiniTile) =>
  tiles.value.some(
    o => o.z > t.z && Math.abs(o.x - t.x) < 1 && Math.abs(o.y - t.y) < 1,
  );

const resolved = computed(() =>
  tiles.value.map(t => ({ tile: t, asset: getAssetByKey(t.type), blocked: isBlocked(t) })),
);

const resolvedTray = computed(() =>
  tray.value.map(t => ({ tile: t, asset: getAssetByKey(t.type) })),
);

const boardCols = 3;
const boardRows = computed(() => (props.mode === 'match' ? 2 : 1.5));

const tapTile = (t: MiniTile) => {
  if (isSolved.value || tray.value.length >= TRAY_SLOTS) return;
  if (isBlocked(t)) {
    playTap();
    wiggleId.value = t.id;
    lockedHint.value = true;
    setTimeout(() => {
      if (wiggleId.value === t.id) wiggleId.value = null;
    }, 260);
    return;
  }
  playClick();
  tiles.value = tiles.value.filter(o => o.id !== t.id);
  tray.value = [...tray.value, t].sort((a, b) => a.type.localeCompare(b.type));
  checkTrio();
};

const checkTrio = () => {
  const counts: Record<string, number> = {};
  tray.value.forEach(t => (counts[t.type] = (counts[t.type] || 0) + 1));
  const type = Object.keys(counts).find(k => counts[k] >= 3);
  if (!type) return;
  const ids = tray.value.filter(t => t.type === type).slice(0, 3).map(t => t.id);
  poppingIds.value = new Set(ids);
  setTimeout(() => {
    playMatch();
    tray.value = tray.value.filter(t => !ids.includes(t.id));
    poppingIds.value = new Set();
    // Board cleared = lesson learned (in "layers" the 2 top tiles may stay in the tray)
    if (tiles.value.length === 0) {
      isSolved.value = true;
      emit('solved');
    }
  }, 280);
};

const statusText = computed(() => {
  if (isSolved.value) return '¡Perfecto! 🎉';
  if (props.mode === 'match') return '👆 Toca las fichas y junta 3 iguales';
  return lockedHint.value
    ? '🔒 ¡Está tapada! Quita primero las de arriba'
    : '👆 Toca las uvas de abajo… ¿puedes?';
});
</script>

<template>
  <div class="mini-board-wrap" :class="`mode-${mode}`">
    <div
      class="mini-board"
      :style="{ '--cols': boardCols, '--rows': boardRows }"
      role="group"
      aria-label="Tablero de práctica"
    >
      <button
        v-for="{ tile, asset, blocked } in resolved"
        :key="tile.id"
        type="button"
        class="mini-tile"
        :class="{ 'is-blocked': blocked, 'is-wiggling': wiggleId === tile.id }"
        :style="{
          left: `calc(${tile.x} * var(--mt))`,
          top: `calc(${tile.y} * var(--mt))`,
          zIndex: tile.z * 10 + 1,
          transform: `translate(${tile.z * -3}px, ${tile.z * -3}px)`,
        }"
        :aria-label="`${asset.label}${blocked ? ' bloqueada' : ''}`"
        @click="tapTile(tile)"
      >
        <img v-if="asset.imagePath" :src="asset.imagePath" :alt="asset.label" />
        <span v-else aria-hidden="true">{{ asset.emoji }}</span>
        <span v-if="blocked" class="mini-lock" aria-hidden="true">🔒</span>
      </button>
      <div v-if="isSolved" class="mini-solved" aria-hidden="true">✨</div>
    </div>

    <div class="mini-tray" aria-label="Bandeja de práctica">
      <div
        v-for="{ tile, asset } in resolvedTray"
        :key="'t' + tile.id"
        class="mini-slot is-filled"
        :class="{ 'is-popping': poppingIds.has(tile.id) }"
      >
        <img v-if="asset.imagePath" :src="asset.imagePath" :alt="asset.label" />
        <span v-else aria-hidden="true">{{ asset.emoji }}</span>
      </div>
      <div
        v-for="n in Math.max(0, TRAY_SLOTS - tray.length)"
        :key="'e' + n"
        class="mini-slot is-empty"
        aria-hidden="true"
      ></div>
    </div>

    <div class="mini-status" :class="{ 'is-solved': isSolved }" role="status">
      {{ statusText }}
    </div>
    <button v-if="isSolved" type="button" class="mini-replay" @click="reset">↺ Otra vez</button>
  </div>
</template>

<style scoped>
.mini-board-wrap {
  --mt: 46px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mini-board {
  position: relative;
  width: calc(var(--cols) * var(--mt));
  height: calc(var(--rows) * var(--mt));
  padding: 8px;
  box-sizing: content-box;
  background: rgba(255, 255, 255, 0.9);
  border: 2px dashed rgba(16, 185, 129, 0.45);
  border-radius: 16px;
}

.mini-tile {
  position: absolute;
  margin: 8px;
  width: calc(var(--mt) - 4px);
  height: calc(var(--mt) - 4px);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  background: linear-gradient(155deg, #ffffff 0%, #f4f4f7 50%, #e2e4ea 100%);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.9),
    1px 2px 0 #c2c5d1,
    2px 4px 0 #a4a8b8,
    0 4px 8px rgba(0, 0, 0, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  padding: 0;
  cursor: pointer;
  transition: transform 0.12s ease;
  -webkit-tap-highlight-color: transparent;
}

.mini-tile img {
  width: 76%;
  height: 76%;
  object-fit: contain;
  pointer-events: none;
}

.mini-tile:not(.is-blocked) {
  animation: miniInvite 1.2s ease-in-out infinite alternate;
}

@keyframes miniInvite {
  from { filter: drop-shadow(0 0 0 rgba(16, 185, 129, 0)); }
  to { filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.75)); }
}

.mini-tile.is-blocked {
  filter: brightness(0.8) saturate(0.9);
  cursor: not-allowed;
}

.mini-tile.is-wiggling {
  animation: miniWiggle 0.24s ease;
}

@keyframes miniWiggle {
  25% { margin-left: 4px; }
  75% { margin-left: 12px; }
}

.mini-lock {
  position: absolute;
  bottom: 1px;
  right: 2px;
  font-size: 10px;
  opacity: 0.6;
}

.mini-solved {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  animation: solvedPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes solvedPop {
  from { transform: scale(0.3); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.mini-tray {
  display: flex;
  gap: 4px;
  padding: 5px;
  background: #ffffff;
  border: 2px solid #a7f3d0;
  border-radius: 14px;
  box-shadow: 0 4px 0 rgba(5, 150, 105, 0.35);
}

.mini-slot {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.mini-slot img {
  width: 74%;
  height: 74%;
  object-fit: contain;
}

.mini-slot.is-empty {
  background: #f0fdf4;
  border: 1.5px dashed #6ee7b7;
}

.mini-slot.is-filled {
  background: linear-gradient(155deg, #ffffff 0%, #eef0f4 100%);
  box-shadow: 0 2px 0 #b4b8c6;
  animation: miniLand 0.22s ease;
}

.mini-slot.is-popping {
  background: linear-gradient(145deg, #fef9c3 0%, #fde047 100%);
  box-shadow: 0 0 12px rgba(250, 204, 21, 0.95);
  animation: miniPop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes miniLand {
  from { transform: translateY(-14px) scale(1.15); }
  to { transform: translateY(0) scale(1); }
}

@keyframes miniPop {
  to { transform: scale(1.22) translateY(-4px); }
}

.mini-status {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #047857;
  min-height: 16px;
}

.mini-status.is-solved {
  color: #b45309;
  font-size: 13px;
}

.mini-replay {
  background: transparent;
  border: none;
  color: #059669;
  font-size: 11px;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
  padding: 2px 6px;
}
</style>
