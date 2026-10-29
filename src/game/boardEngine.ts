/**
 * Board engine — pure functions for board generation, blocked-tile
 * detection, solvability simulation, shuffle, and hint search.
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
 * of 3 times — guaranteeing triplet parity.
 */
export function generateDeck(
  totalTiles: number,
  tileTypeCount: number,
  availableTypes: string[],
): string[] {
  const tripletCount = Math.floor(totalTiles / 3);
  const typesCount = Math.max(1, Math.min(tileTypeCount, availableTypes.length));
  const deck: string[] = [];
  for (let i = 0; i < tripletCount; i++) {
    const type = availableTypes[i % typesCount];
    deck.push(type, type, type);
  }
  return fisherYatesShuffle(deck);
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

// ─── Solvability Simulator ────────────────────────────────────

/**
 * Simulate whether a board configuration can be completely cleared
 * using a tray of capacity `maxTray` (default 7), starting with `currentTray`.
 *
 * Uses a fast bounded backtracking + greedy triplet completion solver.
 */
export function isBoardSolvable(
  tiles: Tile[],
  currentTray: Tile[] = [],
  maxTray = 7,
): boolean {
  const initialBoard = computeBlockedStatus(tiles);
  const initialTrayTypes = currentTray.map(t => t.type);

  // Quick parity check: total tiles (board + tray) must be divisible by 3
  const totalCount = initialBoard.length + initialTrayTypes.length;
  if (totalCount % 3 !== 0) return false;

  // Verify every type's total count is a multiple of 3
  const totalByType = new Map<string, number>();
  for (const t of initialBoard) {
    totalByType.set(t.type, (totalByType.get(t.type) || 0) + 1);
  }
  for (const type of initialTrayTypes) {
    totalByType.set(type, (totalByType.get(type) || 0) + 1);
  }
  for (const count of totalByType.values()) {
    if (count % 3 !== 0) return false;
  }

  let expansions = 0;
  const MAX_EXPANSIONS = 350;
  const visited = new Set<string>();

  function cleanTrayMatches(trayTypes: string[]): string[] {
    const counts = new Map<string, number>();
    for (const t of trayTypes) {
      counts.set(t, (counts.get(t) || 0) + 1);
    }
    const next: string[] = [];
    const removedPerType = new Map<string, number>();
    for (const t of trayTypes) {
      const c = counts.get(t) || 0;
      const rem = removedPerType.get(t) || 0;
      if (c >= 3 && rem < 3) {
        removedPerType.set(t, rem + 1);
      } else {
        next.push(t);
      }
    }
    return next;
  }

  function solve(board: Tile[], trayTypes: string[]): boolean {
    const cleanedTray = cleanTrayMatches(trayTypes);
    if (cleanedTray.length >= maxTray) return false;
    if (board.length === 0) return cleanedTray.length === 0;

    if (++expansions > MAX_EXPANSIONS) return false;

    const stateKey =
      board.map(t => t.id).join(',') + '|' + cleanedTray.slice().sort().join(',');
    if (visited.has(stateKey)) return false;
    visited.add(stateKey);

    const unblocked = board.filter(t => !t.isBlocked);
    if (unblocked.length === 0) return false;

    // Count types in tray and unblocked on board
    const trayCounts = new Map<string, number>();
    for (const type of cleanedTray) {
      trayCounts.set(type, (trayCounts.get(type) || 0) + 1);
    }

    const unblockedByType = new Map<string, Tile[]>();
    for (const tile of unblocked) {
      const group = unblockedByType.get(tile.type) ?? [];
      group.push(tile);
      unblockedByType.set(tile.type, group);
    }

    // Sort each group by descending z so higher tiles (which unblock more) are picked first
    for (const group of unblockedByType.values()) {
      group.sort((a, b) => b.z - a.z);
    }

    // 1. Greedy safe move: if any type can immediately form a triplet within tray capacity,
    // picking the required tiles of that type strictly reduces or maintains tray size.
    for (const [type, group] of unblockedByType.entries()) {
      const inTray = trayCounts.get(type) || 0;
      const needed = 3 - inTray;
      if (needed > 0 && group.length >= needed && cleanedTray.length + needed <= maxTray) {
        const chosen = group.slice(0, needed);
        const chosenIds = new Set(chosen.map(c => c.id));
        const nextBoard = computeBlockedStatus(board.filter(t => !chosenIds.has(t.id)));
        const nextTray = [...cleanedTray, ...chosen.map(c => c.type)];
        if (solve(nextBoard, nextTray)) return true;
      }
    }

    // 2. Otherwise, we must pick 1 unblocked tile to expose lower tiles.
    // Cannot pick if tray has only 1 slot left and this move won't match.
    if (cleanedTray.length + 1 >= maxTray) return false;

    // Score candidate single moves: prefer higher z and types already present in tray/unblocked
    const candidates = [...unblocked].sort((a, b) => {
      const scoreA = a.z * 3 + (trayCounts.get(a.type) || 0) * 2 + (unblockedByType.get(a.type)?.length || 0);
      const scoreB = b.z * 3 + (trayCounts.get(b.type) || 0) * 2 + (unblockedByType.get(b.type)?.length || 0);
      return scoreB - scoreA;
    });

    // Try up to 4 best distinct candidate moves
    const triedTypesAtZ = new Set<string>();
    let branches = 0;
    for (const cand of candidates) {
      const sig = `${cand.type}@${cand.z}`;
      if (triedTypesAtZ.has(sig)) continue;
      triedTypesAtZ.add(sig);

      const nextBoard = computeBlockedStatus(board.filter(t => t.id !== cand.id));
      const nextTray = [...cleanedTray, cand.type];
      if (solve(nextBoard, nextTray)) return true;

      if (++branches >= 4) break;
    }

    return false;
  }

  return solve(initialBoard, initialTrayTypes);
}

// ─── Constructive Solvable Assignment ─────────────────────────

interface SlotPosition {
  id: string;
  gridX: number;
  gridY: number;
  z: number;
  row: number;
  col: number;
  layerIndex: number;
}

/**
 * Constructively assigns tile types from top to bottom so that at every step
 * a valid match can be formed from currently unblocked positions without
 * overflowing the 7-slot tray.
 */
function assignConstructiveSolvableTypes(
  slots: SlotPosition[],
  typesToAssign: string[],
  currentTray: Tile[] = [],
): Tile[] {
  // Group available types into triplets (and tray-completion groups first)
  const typeCounts = new Map<string, number>();
  for (const t of typesToAssign) {
    typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
  }

  const trayCounts = new Map<string, number>();
  for (const t of currentTray) {
    trayCounts.set(t.type, (trayCounts.get(t.type) || 0) + 1);
  }

  // Build ordered groups of types to place from top (picked first) to bottom (picked last)
  const groupsToPlace: string[][] = [];

  // First, schedule completions for any tiles already in the tray!
  for (const [type, inTray] of trayCounts.entries()) {
    const remInTray = inTray % 3;
    if (remInTray > 0) {
      const needed = 3 - remInTray;
      const avail = typeCounts.get(type) || 0;
      if (avail >= needed) {
        groupsToPlace.push(Array(needed).fill(type));
        typeCounts.set(type, avail - needed);
      }
    }
  }

  // Remaining types form triplets; shuffle the triplets for variety
  const tripletGroups: string[][] = [];
  for (const [type, count] of typeCounts.entries()) {
    const fullTriplets = Math.floor(count / 3);
    for (let i = 0; i < fullTriplets; i++) {
      tripletGroups.push([type, type, type]);
    }
    const leftover = count % 3;
    if (leftover > 0) {
      tripletGroups.push(Array(leftover).fill(type));
    }
  }

  groupsToPlace.push(...fisherYatesShuffle(tripletGroups));

  // Peel unblocked slots from top to bottom and assign groups
  let remaining: Tile[] = slots.map(s => ({
    ...s,
    type: '',
    isBlocked: false,
  }));
  const assignedById = new Map<string, string>();

  for (const group of groupsToPlace) {
    remaining = computeBlockedStatus(remaining);
    const unblocked = remaining.filter(t => !t.isBlocked);
    const pool = unblocked.length >= group.length ? unblocked : remaining;
    const shuffledPool = fisherYatesShuffle(pool).sort((a, b) => b.z - a.z);
    const chosen = shuffledPool.slice(0, group.length);
    const chosenIds = new Set<string>();

    for (let i = 0; i < chosen.length; i++) {
      assignedById.set(chosen[i].id, group[i]);
      chosenIds.add(chosen[i].id);
    }

    remaining = remaining.filter(t => !chosenIds.has(t.id));
  }

  const finalTiles: Tile[] = slots.map((slot, idx) => ({
    ...slot,
    type: assignedById.get(slot.id) || typesToAssign[idx] || 'strawberry',
    isBlocked: false,
  }));

  return computeBlockedStatus(finalTiles);
}

// ─── Board Creation ───────────────────────────────────────────

/**
 * Build the initial board from a LevelConfig.
 * Guarantees both triplet parity and 7-slot tray solvability via simulation.
 */
export function createBoardFromConfig(
  config: LevelConfig,
  availableTypes: string[],
): Tile[] {
  const rawSlots: Omit<SlotPosition, 'id'>[] = [];

  for (let li = 0; li < config.layers.length; li++) {
    const layer = config.layers[li];
    const offX = layer.offsetX !== undefined ? layer.offsetX : layer.z * 0.5;
    const offY = layer.offsetY !== undefined ? layer.z * 0.5 : layer.z * 0.5;
    const resolvedOffY = layer.offsetY !== undefined ? layer.offsetY : offY;
    for (let row = 0; row < layer.rows; row++) {
      for (let col = 0; col < layer.cols; col++) {
        if (layer.mask && !layer.mask[row][col]) continue;
        rawSlots.push({
          gridX: col + offX,
          gridY: row + resolvedOffY,
          z: layer.z,
          row,
          col,
          layerIndex: li,
        });
      }
    }
  }

  // Step 2: Strictly guarantee slots.length is a multiple of 3
  const remainder = rawSlots.length % 3;
  if (remainder > 0) {
    rawSlots.splice(rawSlots.length - remainder, remainder);
  }

  const slots: SlotPosition[] = rawSlots.map((slot, idx) => ({
    id: `tile-${idx}`,
    ...slot,
  }));

  // Step 3: Build base triplet deck
  const totalTiles = slots.length;
  const tripletCount = Math.floor(totalTiles / 3);
  const deck: string[] = [];

  const typesCount = Math.min(config.tileTypeCount, availableTypes.length);
  const typesPool = availableTypes.slice(0, Math.max(3, typesCount));

  for (let i = 0; i < tripletCount; i++) {
    const type = typesPool[i % typesPool.length];
    deck.push(type, type, type);
  }

  // Step 4: Try random shuffles verified by solvability simulation
  const MAX_SHUFFLE_ATTEMPTS = 12;
  for (let attempt = 0; attempt < MAX_SHUFFLE_ATTEMPTS; attempt++) {
    const shuffledDeck = fisherYatesShuffle(deck);
    const candidate: Tile[] = computeBlockedStatus(
      slots.map((slot, idx) => ({
        ...slot,
        type: shuffledDeck[idx],
        isBlocked: false,
      })),
    );
    if (isBoardSolvable(candidate, [], 7)) {
      return candidate;
    }
  }

  // Step 5: Fallback to constructive top-down solvable placement (100% guaranteed solvable)
  return assignConstructiveSolvableTypes(slots, deck, []);
}

// ─── Shuffle ──────────────────────────────────────────────────

/**
 * Redistribute tile types randomly while keeping all physical
 * positions and the 3D structure unchanged, verifying that the
 * resulting board is solvable given the current tray.
 */
export function shuffleTilePositions(
  tiles: Tile[],
  currentTray: Tile[] = [],
  maxTray = 7,
): Tile[] {
  if (tiles.length === 0) return [];

  const types = tiles.map(t => t.type);
  const MAX_ATTEMPTS = 12;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const shuffledTypes = fisherYatesShuffle(types);
    const candidate = computeBlockedStatus(
      tiles.map((tile, i) => ({
        ...tile,
        type: shuffledTypes[i],
      })),
    );
    if (isBoardSolvable(candidate, currentTray, maxTray)) {
      return candidate;
    }
  }

  // Constructive fallback guarantees solvability with current tray
  const slots: SlotPosition[] = tiles.map(t => ({
    id: t.id,
    gridX: t.gridX,
    gridY: t.gridY,
    z: t.z,
    row: t.row,
    col: t.col,
    layerIndex: t.layerIndex,
  }));

  return assignConstructiveSolvableTypes(slots, types, currentTray);
}

// ─── Hint Search (Magic Wand) ─────────────────────────────────

/**
 * Find the best unblocked tiles to complete a triplet:
 * 1. Considers tiles already in `trayTiles` (needs only 1 or 2 unblocked board tiles!).
 * 2. Otherwise finds 3 unblocked board tiles of the same type if tray has room.
 * Returns the board tiles to move to the tray, or `null`.
 */
export function findHintMatch(
  tiles: Tile[],
  trayTiles: Tile[] = [],
  maxTray = 7,
): Tile[] | null {
  const unblocked = tiles.filter(t => !t.isBlocked);
  const byType = new Map<string, Tile[]>();

  for (const t of unblocked) {
    const group = byType.get(t.type) ?? [];
    group.push(t);
    byType.set(t.type, group);
  }

  // Count types already in tray
  if (trayTiles.length > 0) {
    const trayCounts = new Map<string, number>();
    for (const t of trayTiles) {
      trayCounts.set(t.type, (trayCounts.get(t.type) || 0) + 1);
    }

    // Priority 1: 2 in tray + 1 unblocked on board
    for (const [type, count] of trayCounts.entries()) {
      if (count >= 2 && trayTiles.length + 1 <= maxTray) {
        const boardGroup = byType.get(type);
        if (boardGroup && boardGroup.length >= 1) {
          return boardGroup.slice(0, 1);
        }
      }
    }

    // Priority 2: 1 in tray + 2 unblocked on board
    for (const [type, count] of trayCounts.entries()) {
      if (count === 1 && trayTiles.length + 2 <= maxTray) {
        const boardGroup = byType.get(type);
        if (boardGroup && boardGroup.length >= 2) {
          return boardGroup.slice(0, 2);
        }
      }
    }
  }

  // Priority 3: 3 unblocked on board (requires 3 free slots in tray)
  if (trayTiles.length <= maxTray - 3) {
    for (const group of byType.values()) {
      if (group.length >= 3) {
        return group.slice(0, 3);
      }
    }
  }

  return null;
}
