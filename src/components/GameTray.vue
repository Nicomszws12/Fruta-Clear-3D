<script setup lang="ts">
import { computed } from 'vue';
import type { Tile } from '../game/types';
import { getAssetByKey, type TileAsset } from '../game/tileAssets';

const props = defineProps<{
  tray: Tile[];
  maxTray: number;
  isTrayCritical: boolean;
  matchingTileIds?: Set<string>;
  isTrayFullError?: boolean;
}>();

interface ResolvedTrayTile {
  tile: Tile;
  asset: TileAsset;
  isMatching: boolean;
  isPairReady: boolean;
}

// P3-1 Performance + #5 Match Pop & Pair Highlight
const resolvedTray = computed<ResolvedTrayTile[]>(() => {
  const counts: Record<string, number> = {};
  for (const t of props.tray) {
    counts[t.type] = (counts[t.type] || 0) + 1;
  }

  return props.tray.map(tile => {
    const isMatching = Boolean(props.matchingTileIds?.has(tile.id));
    const isPairReady = !isMatching && counts[tile.type] === 2;
    return {
      tile,
      asset: getAssetByKey(tile.type),
      isMatching,
      isPairReady,
    };
  });
});

const emptySlotsCount = computed(() => Math.max(0, props.maxTray - props.tray.length));
const isLastSlotLeft = computed(() => props.tray.length === props.maxTray - 1);
</script>

<template>
  <div
    class="tray-container"
    :class="{
      'is-critical': isTrayCritical,
      'is-last-slot': isLastSlotLeft,
      'is-full-fail': isTrayFullError,
    }"
    role="region"
    :aria-label="`Bandeja de fichas: ${tray.length} de ${maxTray} espacios ocupados`"
  >
    <div class="tray-warning-label" v-if="isTrayFullError" role="status">
      💥 ¡Bandeja llena! ({{ maxTray }}/{{ maxTray }})
    </div>
    <div class="tray-warning-label" v-else-if="isLastSlotLeft" role="status">
      🚨 ¡Último espacio libre! ({{ tray.length }}/{{ maxTray }})
    </div>
    <div class="tray-warning-label" v-else-if="isTrayCritical" role="status">
      ⚠️ ¡Cuidado! Bandeja casi llena ({{ tray.length }}/{{ maxTray }})
    </div>

    <div class="tray-slots">
      <div
        v-for="{ tile, asset, isMatching, isPairReady } in resolvedTray"
        :key="'tray-' + tile.id"
        class="tray-slot tray-tile is-filled"
        :class="{
          'is-matching': isMatching,
          'is-pair-ready': isPairReady,
        }"
        :aria-label="asset.label"
      >
        <img
          v-if="asset.imagePath"
          :src="asset.imagePath"
          :alt="asset.label"
          class="tile-img"
        />
        <span v-else class="tile-emoji" aria-hidden="true">
          {{ asset.emoji }}
        </span>
        <span v-if="isMatching" class="match-sparkle" aria-hidden="true">✨</span>
      </div>

      <div
        v-for="n in emptySlotsCount"
        :key="'empty-' + n"
        class="tray-slot empty-slot"
        aria-hidden="true"
      >
        <span class="empty-slot-num">{{ tray.length + n }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tray-container {
  width: 94vw;
  max-width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: transform 0.2s ease;
  z-index: 2;
  margin: 0;
}

.tray-warning-label {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
  background: rgba(239, 68, 68, 0.92);
  border: 1.5px solid #fecaca;
  padding: 2px 10px;
  border-radius: 999px;
  box-shadow: 0 2px 6px rgba(239, 68, 68, 0.45);
  animation: blinkWarning 0.65s ease infinite alternate;
}

@keyframes blinkWarning {
  from { transform: scale(0.97); opacity: 0.85; }
  to { transform: scale(1.03); opacity: 1; }
}

.tray-slots {
  display: flex;
  width: 100%;
  background: rgba(255, 255, 255, 0.98);
  padding: 8px;
  border-radius: 22px;
  gap: 6px;
  border: 3px solid #ffffff;
  box-shadow:
    inset 0 2px 6px rgba(0, 0, 0, 0.05),
    0 8px 0 rgba(2, 132, 199, 0.5),
    0 18px 28px rgba(0, 0, 0, 0.2);
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* #5 Bandeja Late (Critical Heartbeat + Shake) */
.tray-container.is-critical .tray-slots {
  border-color: #ef4444;
  box-shadow:
    0 0 18px rgba(239, 68, 68, 0.65),
    0 7px 0 #b91c1c,
    inset 0 0 12px rgba(239, 68, 68, 0.22);
  animation: trayHeartbeat 0.75s ease-in-out infinite alternate;
}

.tray-container.is-last-slot .tray-slots {
  border-color: #dc2626;
  animation: trayHeartbeatFast 0.42s ease-in-out infinite alternate;
}

.tray-container.is-full-fail .tray-slots {
  border-color: #b91c1c;
  background: #fef2f2;
  animation: trayFailShake 0.36s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes trayHeartbeat {
  0% {
    transform: scale(1);
    border-color: rgba(239, 68, 68, 0.6);
  }
  100% {
    transform: scale(1.022);
    border-color: rgba(239, 68, 68, 1);
  }
}

@keyframes trayHeartbeatFast {
  0% {
    transform: scale(1) translateX(-1px);
  }
  50% {
    transform: scale(1.03) translateX(1px);
  }
  100% {
    transform: scale(1.015) translateX(0);
  }
}

@keyframes trayFailShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-7px) rotate(-1deg); }
  40% { transform: translateX(7px) rotate(1deg); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

.tray-tile,
.empty-slot {
  position: relative;
  flex: 1;
  aspect-ratio: 1;
  border-radius: 12px;
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 54px;
}

.tray-tile {
  background: linear-gradient(155deg, #ffffff 0%, #f4f4f7 50%, #e2e4ea 100%);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 3px 0px #b4b8c6,
    0 4px 10px rgba(0, 0, 0, 0.15);
  animation: trayBounceIn 0.24s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Pair ready highlight (2 of same type in tray) */
.tray-tile.is-pair-ready {
  border-color: #fbbf24;
  box-shadow:
    0 3px 0 #d97706,
    0 0 8px rgba(251, 191, 36, 0.45);
}

/* #5 Match Pop: Scale 1.22 + Golden Glow on the 3 matched tiles! */
.tray-tile.is-matching {
  z-index: 10;
  background: linear-gradient(145deg, #fef9c3 0%, #fde047 60%, #facc15 100%);
  border: 2px solid #ffffff;
  box-shadow:
    0 0 18px rgba(250, 204, 21, 0.95),
    0 0 30px rgba(245, 158, 11, 0.75);
  animation: matchPopScale 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes matchPopScale {
  0% {
    transform: scale(1);
    filter: brightness(1);
  }
  65% {
    transform: scale(1.24) translateY(-6px);
    filter: brightness(1.22);
  }
  100% {
    transform: scale(1.2) translateY(-4px);
    filter: brightness(1.15);
  }
}

.match-sparkle {
  position: absolute;
  top: -8px;
  right: -6px;
  font-size: 13px;
  pointer-events: none;
  animation: sparklePop 0.25s ease-out forwards;
}

@keyframes sparklePop {
  from { transform: scale(0.4) rotate(-20deg); opacity: 0; }
  to { transform: scale(1.15) rotate(12deg); opacity: 1; }
}

.tray-tile .tile-emoji {
  font-size: min(5.5vw, 26px);
}

.tray-tile .tile-img {
  width: 72%;
  height: 72%;
  object-fit: contain;
}

.empty-slot {
  background: #f0f9ff;
  border: 2px dashed #7dd3fc;
}

.empty-slot-num {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #0284c7;
  opacity: 0.6;
}

@keyframes trayBounceIn {
  0% {
    transform: scale(0.2) rotate(-10deg);
    opacity: 0;
  }
  70% {
    transform: scale(1.18) rotate(3deg);
  }
  100% {
    transform: scale(1) rotate(0);
    opacity: 1;
  }
}

@media (max-height: 700px) {
  .tray-slots {
    padding: 5px;
    gap: 4px;
    border-radius: 16px;
  }
  .tray-tile,
  .empty-slot {
    max-height: 40px;
    border-radius: 10px;
  }
}

@media (max-width: 360px) {
  .tray-container {
    width: 98vw;
  }
  .tray-slots {
    gap: 3px;
    padding: 4px;
  }
}
</style>
