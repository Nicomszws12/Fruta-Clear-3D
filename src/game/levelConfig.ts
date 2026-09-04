/**
 * Level configuration — defines board shape, tile count, and progressive
 * difficulty for 100+ levels.
 *
 * Designed with 12 distinct geometric archetypes across 10 Thematic Worlds:
 * 1. Pirámide Concéntrica
 * 2. Diamante / Rombo
 * 3. Corazón
 * 4. Cruz / Trébol
 * 5. Fortaleza / Muralla
 * 6. Reloj de Arena / Mariposa
 * 7. Doble Cumbre (Twin Peaks)
 * 8. Corona / Anillo
 * 9. Espiral / Laberinto
 * 10. Flor de Loto
 * 11. Estrella
 * 12. Panal Hexagonal
 *
 * Every single level guarantees:
 *  - totalTiles % 3 === 0 (solvable triplets)
 *  - Responsive mobile fit (caps grid dimension, increases Z layer depth)
 *  - Progressive difficulty (fewer unblocked tiles, deeper stacks)
 */
import type { LayerConfig, LevelConfig } from './types';

// ─── Thematic Worlds ──────────────────────────────────────────
export interface WorldInfo {
  id: number;
  name: string;
  icon: string;
  minLevel: number;
  maxLevel: number;
}

export const GAME_WORLDS: WorldInfo[] = [
  { id: 1,  name: 'Huerto Soleado',     icon: '🍓', minLevel: 1,   maxLevel: 10 },
  { id: 2,  name: 'Valle Dulce',        icon: '🍩', minLevel: 11,  maxLevel: 20 },
  { id: 3,  name: 'Cueva Esmeralda',    icon: '💎', minLevel: 21,  maxLevel: 30 },
  { id: 4,  name: 'Templo de Cristal',  icon: '🔮', minLevel: 31,  maxLevel: 40 },
  { id: 5,  name: 'Fortaleza Dorada',   icon: '👑', minLevel: 41,  maxLevel: 50 },
  { id: 6,  name: 'Bosque Mágico',      icon: '🍄', minLevel: 51,  maxLevel: 60 },
  { id: 7,  name: 'Isla Volcánica',     icon: '⚡', minLevel: 61,  maxLevel: 70 },
  { id: 8,  name: 'Oasis Estelar',      icon: '🌟', minLevel: 71,  maxLevel: 80 },
  { id: 9,  name: 'Palacio del Dragón', icon: '🏰', minLevel: 81,  maxLevel: 90 },
  { id: 10, name: 'Reino Celestial',    icon: '🪐', minLevel: 91,  maxLevel: 999 },
];

export function getWorldForLevel(level: number): WorldInfo {
  return (
    GAME_WORLDS.find(w => level >= w.minLevel && level <= w.maxLevel) ??
    GAME_WORLDS[GAME_WORLDS.length - 1]
  );
}

// ─── Shape Mask Generators ────────────────────────────────────

/** Full rectangle mask */
function fullMask(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array<boolean>(cols).fill(true));
}

/** Diamond shape */
function diamondMask(rows: number, cols: number): boolean[][] {
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const distR = Math.abs(r - centerR) / (centerR || 1);
      const distC = Math.abs(c - centerC) / (centerC || 1);
      return distR + distC <= 1.05;
    }),
  );
}

/** Cross / plus shape */
function crossMask(rows: number, cols: number): boolean[][] {
  const centerR = Math.floor(rows / 2);
  const centerC = Math.floor(cols / 2);
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const inV = Math.abs(c - centerC) <= 1;
      const inH = Math.abs(r - centerR) <= 1;
      return inV || inH;
    }),
  );
}

/** Heart shape */
function heartMask(rows = 6, cols = 7): boolean[][] {
  const F = false;
  const T = true;
  if (rows === 6 && cols === 7) {
    return [
      [F, T, T, F, T, T, F],
      [T, T, T, T, T, T, T],
      [T, T, T, T, T, T, T],
      [F, T, T, T, T, T, F],
      [F, F, T, T, T, F, F],
      [F, F, F, T, F, F, F],
    ];
  }
  // Generic parametric heart
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const y = 1 - (r / (rows - 1)) * 2;
      const x = (c / (cols - 1)) * 2 - 1;
      const heartEq = Math.pow(x * x + y * y - 0.6, 3) - x * x * y * y * y;
      return heartEq <= 0.05;
    }),
  );
}

/** Fortress / Wall with castle corners */
function fortressMask(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const isBorder = r === 0 || r === rows - 1 || c === 0 || c === cols - 1;
      const isInnerKeep =
        r >= 2 && r <= rows - 3 && c >= 2 && c <= cols - 3;
      return isBorder || isInnerKeep;
    }),
  );
}

/** Hourglass / Butterfly (pinched waist) */
function hourglassMask(rows: number, cols: number): boolean[][] {
  const centerR = (rows - 1) / 2;
  return Array.from({ length: rows }, (_, r) => {
    const span = Math.abs(r - centerR) / (centerR || 1);
    const allowedCols = Math.max(2, Math.round(cols * span));
    const pad = Math.floor((cols - allowedCols) / 2);
    return Array.from(
      { length: cols },
      (_, c) => c >= pad && c < pad + allowedCols,
    );
  });
}

/** Twin Peaks (two adjacent small pyramids) */
function twinPeaksMask(rows: number, cols: number): boolean[][] {
  const midC = cols / 2;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const peak1Dist = Math.abs(c - midC * 0.5) + (rows - 1 - r);
      const peak2Dist = Math.abs(c - midC * 1.5) + (rows - 1 - r);
      return peak1Dist <= rows * 0.9 || peak2Dist <= rows * 0.9;
    }),
  );
}

/** Ring / Crown with hollow center */
function ringMask(rows: number, cols: number): boolean[][] {
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const distR = Math.abs(r - centerR) / (centerR || 1);
      const distC = Math.abs(c - centerC) / (centerC || 1);
      const radius = Math.sqrt(distR * distR + distC * distC);
      return radius >= 0.35 && radius <= 1.05;
    }),
  );
}

/** Spiral / Winding labyrinth */
function spiralMask(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const isOuter = r === 0 || c === cols - 1 || r === rows - 1;
      const isInnerTurn = c === 1 && r >= 2;
      const isCenter = r === 2 && c >= 2 && c <= cols - 3;
      return isOuter || isInnerTurn || isCenter || (r % 2 === 0 && c % 2 === 0);
    }),
  );
}

/** Lotus Flower (floral petals) */
function lotusMask(rows: number, cols: number): boolean[][] {
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const dr = (r - centerR) / (centerR || 1);
      const dc = (c - centerC) / (centerC || 1);
      const angle = Math.atan2(dr, dc);
      const dist = Math.sqrt(dr * dr + dc * dc);
      const petalRadius = 0.5 + 0.5 * Math.abs(Math.cos(angle * 2.5));
      return dist <= petalRadius;
    }),
  );
}

/** 5-Point Star */
function starMask(rows: number, cols: number): boolean[][] {
  const centerR = (rows - 1) / 2;
  const centerC = (cols - 1) / 2;
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => {
      const dr = (r - centerR) / (centerR || 1);
      const dc = (c - centerC) / (centerC || 1);
      const angle = Math.atan2(dr, dc);
      const dist = Math.sqrt(dr * dr + dc * dc);
      const starRadius = 0.45 + 0.55 * Math.abs(Math.sin(angle * 2.5));
      return dist <= starRadius;
    }),
  );
}

/** Honeycomb / Alternating checkerboard */
function honeycombMask(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => (r + c) % 2 === 0),
  );
}

// ─── Archetype Catalog ────────────────────────────────────────
const ARCHETYPES = [
  { name: 'Pirámide Clásica', fn: fullMask },
  { name: 'Diamante Radiante', fn: diamondMask },
  { name: 'Corazón Dulce', fn: heartMask },
  { name: 'Cruz Mística', fn: crossMask },
  { name: 'Fortaleza Antigua', fn: fortressMask },
  { name: 'Reloj de Arena', fn: hourglassMask },
  { name: 'Cumbres Gemelas', fn: twinPeaksMask },
  { name: 'Corona Real', fn: ringMask },
  { name: 'Espiral Secreta', fn: spiralMask },
  { name: 'Flor de Loto', fn: lotusMask },
  { name: 'Estrella Brillante', fn: starMask },
  { name: 'Panal Dorado', fn: honeycombMask },
];

// ─── Count Helpers ────────────────────────────────────────────
function countLayerTiles(layer: LayerConfig): number {
  if (!layer.mask) return layer.rows * layer.cols;
  return layer.mask.reduce(
    (sum, row) => sum + row.filter(Boolean).length,
    0,
  );
}

function computeGridExtent(layers: LayerConfig[]): {
  gridCols: number;
  gridRows: number;
} {
  let gridCols = 0;
  let gridRows = 0;
  for (const layer of layers) {
    const offX = layer.offsetX ?? layer.z * 0.5;
    const offY = layer.offsetY ?? layer.z * 0.5;
    gridCols = Math.max(gridCols, layer.cols + offX);
    gridRows = Math.max(gridRows, layer.rows + offY);
  }
  return {
    gridCols: Math.max(5, Math.ceil(gridCols)),
    gridRows: Math.max(5, Math.ceil(gridRows)),
  };
}

// ─── Procedural Level Generator (1 to 100+) ───────────────────

export function getLevelConfig(level: number): LevelConfig {
  const safeLevel = Math.max(1, Math.floor(level));
  const world = getWorldForLevel(safeLevel);
  const archetypeIdx = (safeLevel - 1) % ARCHETYPES.length;
  const archetype = ARCHETYPES[archetypeIdx];

  // 1. Dificultad Progresiva:
  // - Niveles 1-11: 3 capas, 6-8 tipos, ~30-45 fichas (desafiante desde el inicio)
  // - Niveles 12-39: 4 capas, 9-14 tipos, ~48-75 fichas
  // - Niveles 40-74: 5 capas, 15-18 tipos, ~78-114 fichas
  // - Niveles 75-100+: 5-6 capas, 19-22 tipos, ~117-160 fichas
  let targetLayers = 3;
  if (safeLevel >= 12) targetLayers = 4;
  if (safeLevel >= 40) targetLayers = 5;
  if (safeLevel >= 75) targetLayers = 6;

  // Base dimensions (constrained for mobile screens: 5 to 7 cols/rows max)
  const baseCols = Math.min(7, 5 + Math.floor(Math.min(safeLevel, 60) / 20));
  const baseRows = Math.min(7, 5 + Math.floor(Math.min(safeLevel, 60) / 20));

  // Tile type count (from 6 up to 22) - Minimum 6 ensures the 7-slot tray can fill up and lose!
  const tileTypeCount = Math.min(
    22,
    Math.max(6, 6 + Math.floor(safeLevel / 4)),
  );

  // 2. Build Layers (pyramid stacking)
  const layers: LayerConfig[] = [];
  for (let z = 0; z < targetLayers; z++) {
    // Top layers decrease slightly in dimensions for a true 3D pyramid effect
    const shrink = Math.min(z, 2);
    const layerCols = Math.max(3, baseCols - shrink);
    const layerRows = Math.max(3, baseRows - shrink);

    // Centered offsets so stacked layers align pleasingly
    const offsetX = (baseCols - layerCols) * 0.5 + (z % 2 === 1 ? 0.5 : 0);
    const offsetY = (baseRows - layerRows) * 0.5 + (z % 2 === 1 ? 0.5 : 0);

    let mask: boolean[][] | undefined;
    if (z === 0) {
      // Base layer applies the archetype mask
      mask = archetype.fn(layerRows, layerCols);
    } else if (z === targetLayers - 1 && targetLayers >= 3) {
      // Top crown layer uses concentrated diamond or cross
      mask = diamondMask(layerRows, layerCols);
    } else {
      // Middle layers use full or archetype pattern
      mask = z % 2 === 1 ? fullMask(layerRows, layerCols) : archetype.fn(layerRows, layerCols);
    }

    layers.push({
      z,
      rows: layerRows,
      cols: layerCols,
      offsetX,
      offsetY,
      mask,
    });
  }

  // 3. Guarantee totalTiles is a multiple of 3
  let currentTotal = layers.reduce((acc, l) => acc + countLayerTiles(l), 0);

  // Minimum tiles according to level progression (at least 27)
  const minRequiredTiles = Math.min(
    180,
    Math.max(27, 27 + Math.floor((safeLevel - 1) * 1.5) * 3),
  );

  // If currentTotal is below minRequiredTiles, fill in some false mask cells
  if (currentTotal < minRequiredTiles) {
    for (const l of layers) {
      if (l.mask) {
        for (let r = 0; r < l.rows && currentTotal < minRequiredTiles; r++) {
          for (let c = 0; c < l.cols && currentTotal < minRequiredTiles; c++) {
            if (!l.mask[r][c]) {
              l.mask[r][c] = true;
              currentTotal++;
            }
          }
        }
      }
    }
  }

  // Trim excess so currentTotal % 3 === 0
  const remainder = currentTotal % 3;
  if (remainder !== 0) {
    let toRemove = remainder;
    // Remove from the highest layer
    for (let li = layers.length - 1; li >= 0 && toRemove > 0; li--) {
      const l = layers[li];
      if (!l.mask) l.mask = fullMask(l.rows, l.cols);
      for (let r = l.rows - 1; r >= 0 && toRemove > 0; r--) {
        for (let c = l.cols - 1; c >= 0 && toRemove > 0; c--) {
          if (l.mask[r][c]) {
            l.mask[r][c] = false;
            toRemove--;
          }
        }
      }
    }
    currentTotal -= remainder;
  }

  const { gridCols, gridRows } = computeGridExtent(layers);

  return {
    levelNumber: safeLevel,
    totalTiles: currentTotal,
    layers,
    tileTypeCount,
    gridCols,
    gridRows,
    name: `${archetype.name} (Nivel ${safeLevel})`,
    worldName: `${world.icon} ${world.name}`,
  };
}
