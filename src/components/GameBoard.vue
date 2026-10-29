<script setup lang="ts">
import { computed } from 'vue';
import type { Tile } from '../game/types';
import { getAssetByKey, type TileAsset } from '../game/tileAssets';

const props = defineProps<{
  boardTiles: Tile[];
  gridCols: number;
  gridRows: number;
  hintedTileIds: Set<string>;
  wigglingTileId: string | null;
}>();

const emit = defineEmits<{
  (e: 'select-tile', tile: Tile): void;
}>();

interface ResolvedTile {
  tile: Tile;
  asset: TileAsset;
}

// P3-1 Performance: Resolve asset once per tile instead of 4x per DOM node
const resolvedTiles = computed<ResolvedTile[]>(() =>
  props.boardTiles.map(tile => ({
    tile,
    asset: getAssetByKey(tile.type),
  })),
);
</script>

<template>
  <div class="board-arena" role="region" aria-label="Tablero de juego 3D">
    <div class="board-mat">
      <!-- Decorative Corner Rivets / Stitches -->
      <div class="mat-corner corner-tl" aria-hidden="true">✦</div>
      <div class="mat-corner corner-tr" aria-hidden="true">✦</div>
      <div class="mat-corner corner-bl" aria-hidden="true">✦</div>
      <div class="mat-corner corner-br" aria-hidden="true">✦</div>

      <div
        class="board-container"
        :style="`--grid-cols: ${gridCols}; --grid-rows: ${gridRows};`"
      >
        <div
          v-for="{ tile, asset } in resolvedTiles"
          :key="tile.id"
          role="button"
          :tabindex="tile.isBlocked ? -1 : 0"
          :aria-disabled="tile.isBlocked"
          :aria-label="`${asset.label}${tile.isBlocked ? ' bloqueada' : ''}`"
          class="tile"
          :class="{
            'is-blocked': tile.isBlocked,
            'is-hinted': hintedTileIds.has(tile.id),
            'is-wiggling': wigglingTileId === tile.id,
          }"
          :style="{
            left: `calc(${tile.gridX} * var(--tile-size))`,
            top: `calc(${tile.gridY} * var(--tile-size))`,
            zIndex: tile.z * 10 + 2,
            '--tile-z': tile.z,
          }"
          @click="emit('select-tile', tile)"
          @keydown.enter.prevent="emit('select-tile', tile)"
          @keydown.space.prevent="emit('select-tile', tile)"
        >
          <!-- Tile Face -->
          <div class="tile-face">
            <img
              v-if="asset.imagePath"
              :src="asset.imagePath"
              :alt="asset.label"
              class="tile-img"
            />
            <span v-else class="tile-emoji" aria-hidden="true">
              {{ asset.emoji }}
            </span>

            <!-- Blocked Shade Overlay -->
            <div v-if="tile.isBlocked" class="blocked-lock-overlay" aria-hidden="true">
              <span class="lock-glyph">🔒</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-arena {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 auto;
  width: 100%;
  padding: 2px 4px;
  box-sizing: border-box;
  z-index: 2;
  min-height: 0;
  overflow: visible;
}

.board-mat {
  position: relative;
  background: rgba(255, 255, 255, 0.88);
  border: 3px solid #ffffff;
  border-radius: 24px;
  padding: 8px 6px;
  box-shadow:
    0 8px 0 rgba(2, 132, 199, 0.5),
    0 18px 28px rgba(0, 0, 0, 0.22);

  background-image:
    linear-gradient(to right, rgba(2, 132, 199, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(2, 132, 199, 0.07) 1px, transparent 1px);
  background-size: 26px 26px;

  outline: 2px dashed rgba(2, 132, 199, 0.35);
  outline-offset: -6px;
  transition: all 0.3s ease;
  margin: auto;
  max-width: 98vw;
  box-sizing: border-box;
}

.mat-corner {
  position: absolute;
  font-size: 13px;
  color: #0284c7;
  opacity: 0.55;
  user-select: none;
  pointer-events: none;
}

.corner-tl { top: 4px; left: 6px; }
.corner-tr { top: 4px; right: 6px; }
.corner-bl { bottom: 4px; left: 6px; }
.corner-br { bottom: 4px; right: 6px; }

.board-container {
  --tile-size: min(
    calc((100vw - 20px) / var(--grid-cols)),
    calc((100dvh - 200px) / var(--grid-rows)),
    calc((100vh - 200px) / var(--grid-rows)),
    64px
  );

  position: relative;
  width: calc(var(--grid-cols) * var(--tile-size));
  height: calc(var(--grid-rows) * var(--tile-size));
  margin: auto;
}

.tile {
  position: absolute;
  width: var(--tile-size);
  height: var(--tile-size);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transform: translate(calc(var(--tile-z, 0) * -1.5px), calc(var(--tile-z, 0) * -1.5px));
  transition: transform 0.12s ease, opacity 0.12s ease;
}

@keyframes tileWiggle {
  0%, 100% { transform: translate(calc(var(--tile-z, 0) * -1.5px), calc(var(--tile-z, 0) * -1.5px)) rotate(0deg); }
  25% { transform: translate(calc(var(--tile-z, 0) * -1.5px - 3px), calc(var(--tile-z, 0) * -1.5px)) rotate(-4deg); }
  75% { transform: translate(calc(var(--tile-z, 0) * -1.5px + 3px), calc(var(--tile-z, 0) * -1.5px)) rotate(4deg); }
}

.tile.is-wiggling {
  will-change: transform;
  animation: tileWiggle 0.22s ease;
}

.tile-face {
  width: 100%;
  height: 100%;
  border-radius: calc(var(--tile-size) * 0.18);
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;

  background: linear-gradient(155deg, #ffffff 0%, #f4f4f7 50%, #e2e4ea 100%);
  border: 1px solid rgba(255, 255, 255, 0.9);

  box-shadow:
    inset 0 1.5px 1px rgba(255, 255, 255, 0.9),
    inset 0 -1.5px 2px rgba(0, 0, 0, 0.08),
    1px 2px 0px #c2c5d1,
    2px 4px 0px #a4a8b8,
    0 calc(3px + var(--tile-z, 0) * 2px) calc(6px + var(--tile-z, 0) * 3px) rgba(0, 0, 0, 0.35);
}

.tile:active:not(.is-blocked) .tile-face {
  transform: scale(0.9) translateY(3px);
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.6),
    0 1px 0px #a4a8b8,
    0 2px 5px rgba(0, 0, 0, 0.2);
}

.tile.is-blocked .tile-face {
  filter: brightness(0.82) saturate(0.92);
  cursor: not-allowed;
  box-shadow:
    inset 0 1px 1px rgba(255, 255, 255, 0.6),
    1px 2px 0px #b4b8c6,
    0 2px 4px rgba(0, 0, 0, 0.22);
}

.blocked-lock-overlay {
  position: absolute;
  bottom: 2px;
  right: 2px;
  font-size: calc(var(--tile-size) * 0.16);
  opacity: 0.40;
  pointer-events: none;
}

.tile.is-hinted {
  will-change: transform, filter;
  animation: hintPulse 0.5s ease infinite alternate;
  z-index: 999 !important;
}

@keyframes hintPulse {
  from {
    filter: drop-shadow(0 0 6px #ffd700);
    transform: scale(1);
  }
  to {
    filter: drop-shadow(0 0 16px #ffea00);
    transform: scale(1.08);
  }
}

.tile-emoji {
  font-size: calc(var(--tile-size) * 0.62);
  line-height: 1;
  pointer-events: none;
}

.tile-img {
  width: 76%;
  height: 76%;
  object-fit: contain;
  pointer-events: none;
}

@media (max-height: 700px) {
  .board-mat {
    padding: 6px 4px;
    border-radius: 16px;
  }
}
</style>

