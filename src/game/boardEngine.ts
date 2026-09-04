/**
 * Board engine — pure functions for board generation, blocked-tile
 * detection, shuffle, and hint search.
 *
 * All coordinate values are in "grid units" (not pixels).
 * One grid unit = one tile width/height.
 */
import type { Tile, LevelConfig } from './types';

// ─── Fisher-Yates Shuffle ─────────────────────────────────────

/** Unbiased in-place shuffle (returns a new array). */
export function fisherYatesShuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Deck Generation ──────────────────────────────────────────

/**
 * Generate a shuffled deck where every tile type appears a multiple
 * of 3 times — guaranteeing the level is solvable.
 */
export function generateDeck(
  totalTiles: number,
  tileTypeCount: number,
  availableTypes: string[],
): string[] {
  const tripletCount = totalTiles / 3;
  const deck: string[] = [];
  for (let i = 0; i < tripletCount; i++) {
    const type = availableTypes[i % tileTypeCount];
    deck.push(type, type, type);
  }
  return fisherYatesShuffle(deck);
}

// ─── Board Creation ───────────────────────────────────────────

/**
 * Build the initial board from a LevelConfig.
 *
 * Each tile's gridX/gridY is computed as:
 *   gridX = col + z × 0.5     (staggered pyramid offset)
 *   gridY = row + z × 0.5
 */
export function createBoardFromConfig(
  config: LevelConfig,
  availableTypes: string[],
): Tile[] {
  // Step 1: Discover all physically available slots in the configured layers
  interface Slot {
    gridX: number;
    gridY: number;
    z: number;
    row: number;
    col: number;
    layerIndex: number;
  }

  const slots: Slot[] = [];

  for (let li = 0; li < config.layers.length; li++) {
    const layer = config.layers[li];
    const offX = layer.offsetX !== undefined ? layer.offsetX : layer.z * 0.5;
    const offY = layer.offsetY !== undefined ? layer.offsetY : layer.z * 0.5;
    for (let row = 0; row < layer.rows; row++) {
      for (let col = 0; col < layer.cols; col++) {
        if (layer.mask && !layer.mask[row][col]) continue;
        slots.push({
          gridX: col + offX,
          gridY: row + offY,
          z: layer.z,
          row,
          col,
          layerIndex: li,
        });
      }
    }
  }

  // Step 2: Strictly guarantee slots.length is a multiple of 3 (never leave 1 or 2 leftover tiles)
  const remainder = slots.length % 3;
  if (remainder > 0) {
    slots.splice(slots.length - remainder, remainder);
  }

  // Step 3: Generate the deck matching EXACTLY slots.length with full triplets
  const totalTiles = slots.length;
  const tripletCount = Math.floor(totalTiles / 3);
  const deck: string[] = [];

  const typesCount = Math.min(config.tileTypeCount, availableTypes.length);
  const typesPool = availableTypes.slice(0, Math.max(3, typesCount));

  for (let i = 0; i < tripletCount; i++) {
    const type = typesPool[i % typesPool.length];
    deck.push(type, type, type);
  }

  // Step 4: Shuffle the deck with Fisher-Yates
  const shuffledDeck = fisherYatesShuffle(deck);

  // Step 5: Assign each physical slot a tile from the shuffled triplet deck
  const tiles: Tile[] = slots.map((slot, idx) => ({
    id: `tile-${idx}`,
    type: shuffledDeck[idx],
    gridX: slot.gridX,
    gridY: slot.gridY,
    z: slot.z,
    row: slot.row,
    col: slot.col,
    layerIndex: slot.layerIndex,
    isBlocked: false,
  }));

  return computeBlockedStatus(tiles);
}

// ─── Blocked-Tile Detection ───────────────────────────────────

/**
 * A tile is "blocked" if any tile on a higher z-layer overlaps
 * its grid position (within 0.92 grid-units in both X and Y).
 *
 * Returns a NEW array with updated `isBlocked` flags.
 */
export function computeBlockedStatus(tiles: Tile[]): Tile[] {
  let maxZ = 0;
  for (let i = 0; i < tiles.length; i++) {
    if (tiles[i].z > maxZ) maxZ = tiles[i].z;
  }

  // Only tiles with z > 0 can ever block other tiles
  const potentialBlockers = tiles.filter(t => t.z > 0);

  return tiles.map(tile => {
    // Top-most layer tiles are never blocked
    if (tile.z >= maxZ) {
      return tile.isBlocked ? { ...tile, isBlocked: false } : tile;
    }

    const isBlocked = potentialBlockers.some(other => {
      if (other.z <= tile.z) return false;
      const dx = Math.abs(tile.gridX - other.gridX);
      if (dx >= 0.92) return false;
      const dy = Math.abs(tile.gridY - other.gridY);
      return dy < 0.92;
    });

    // If state did not change, preserve identical object reference for Vue v-dom diffing
    if (tile.isBlocked === isBlocked) return tile;
    return { ...tile, isBlocked };
  });
}

// ─── Shuffle ──────────────────────────────────────────────────

/**
 * Redistribute tile types randomly while keeping all physical
 * positions and the 3D structure unchanged.
 */
export function shuffleTilePositions(tiles: Tile[]): Tile[] {
  const shuffledTypes = fisherYatesShuffle(tiles.map(t => t.type));
  const result = tiles.map((tile, i) => ({
    ...tile,
    type: shuffledTypes[i],
  }));
  return computeBlockedStatus(result);
}

// ─── Hint Search ──────────────────────────────────────────────

/**
 * Find 3 unblocked tiles of the same type (if any exist).
 * Returns the trio or `null`.
 */
export function findHintMatch(tiles: Tile[]): Tile[] | null {
  const unblocked = tiles.filter(t => !t.isBlocked);
  const byType = new Map<string, Tile[]>();

  for (const t of unblocked) {
    const group = byType.get(t.type) ?? [];
    group.push(t);
    byType.set(t.type, group);
    if (group.length >= 3) return group.slice(0, 3);
  }

  return null;
}

