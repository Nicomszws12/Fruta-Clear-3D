<script setup lang="ts">
import { computed } from 'vue';
import type { Tile } from '../game/types';
import { getAssetByKey, type TileAsset } from '../game/tileAssets';

const props = defineProps<{
  tray: Tile[];
  maxTray: number;
  isTrayCritical: boolean;
}>();

interface ResolvedTrayTile {
  tile: Tile;
  asset: TileAsset;
}

// P3-1 Performance: Resolve asset once per tray tile
const resolvedTray = computed<ResolvedTrayTile[]>(() =>
  props.tray.map(tile => ({
    tile,
    asset: getAssetByKey(tile.type),
  })),
);

const emptySlotsCount = computed(() => Math.max(0, props.maxTray - props.tray.length));
</script>

<template>
  <div
    class="tray-container"
    :class="{ 'is-critical': isTrayCritical }"
    role="region"
    :aria-label="`Bandeja de fichas: ${tray.length} de ${maxTray} espacios ocupados`"
  >
    <div class="tray-warning-label" v-if="isTrayCritical" role="status">
      ⚠️ ¡Cuidado! Espacio casi lleno
    </div>
    <div class="tray-slots">
      <div
        v-for="{ tile, asset } in resolvedTray"
        :key="'tray-' + tile.id"
        class="tray-tile"
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
      </div>
      <div
        v-for="n in emptySlotsCount"
        :key="'empty-' + n"
        class="empty-slot"
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
  transition: all 0.3s ease;
  z-index: 2;
  margin: 0;
}

.tray-warning-label {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #ef4444;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  animation: blinkWarning 0.8s ease infinite alternate;
}

@keyframes blinkWarning {
  from { opacity: 0.6; }
  to { opacity: 1; }
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
}

.tray-container.is-critical .tray-slots {
  border-color: #ef4444;
  box-shadow:
    0 0 15px rgba(239, 68, 68, 0.5),
    inset 0 0 10px rgba(239, 68, 68, 0.2);
  animation: trayCriticalPulse 1s ease infinite alternate;
}

@keyframes trayCriticalPulse {
  from { border-color: rgba(239, 68, 68, 0.4); }
  to { border-color: rgba(239, 68, 68, 1); }
}

.tray-tile,
.empty-slot {
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
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow:
    0 3px 0px #b4b8c6,
    0 4px 10px rgba(0, 0, 0, 0.15);
  animation: trayBounceIn 0.28s cubic-bezier(0.175, 0.885, 0.32, 1.275);
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

