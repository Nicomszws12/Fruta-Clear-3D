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
  // ── Era 1: Naturaleza (Mundos 1-10) ──
  { id: 1,  name: 'Huerto Soleado',       icon: '🍓', minLevel: 1,    maxLevel: 10 },
  { id: 2,  name: 'Valle Dulce',          icon: '🍩', minLevel: 11,   maxLevel: 20 },
  { id: 3,  name: 'Cueva Esmeralda',      icon: '💎', minLevel: 21,   maxLevel: 30 },
  { id: 4,  name: 'Templo de Cristal',    icon: '🔮', minLevel: 31,   maxLevel: 40 },
  { id: 5,  name: 'Fortaleza Dorada',     icon: '👑', minLevel: 41,   maxLevel: 50 },
  { id: 6,  name: 'Bosque Mágico',        icon: '🍄', minLevel: 51,   maxLevel: 60 },
  { id: 7,  name: 'Isla Volcánica',       icon: '⚡', minLevel: 61,   maxLevel: 70 },
  { id: 8,  name: 'Oasis Estelar',        icon: '🌟', minLevel: 71,   maxLevel: 80 },
  { id: 9,  name: 'Palacio del Dragón',   icon: '🏰', minLevel: 81,   maxLevel: 90 },
  { id: 10, name: 'Reino Celestial',      icon: '🪐', minLevel: 91,   maxLevel: 100 },
  // ── Era 2: Océano y Aventura (Mundos 11-20) ──
  { id: 11, name: 'Bahía Tropical',       icon: '🏝️', minLevel: 101,  maxLevel: 110 },
  { id: 12, name: 'Arrecife Coral',       icon: '🐠', minLevel: 111,  maxLevel: 120 },
  { id: 13, name: 'Fosa Abisal',          icon: '🐙', minLevel: 121,  maxLevel: 130 },
  { id: 14, name: 'Ciudad Submarina',     icon: '🫧', minLevel: 131,  maxLevel: 140 },
  { id: 15, name: 'Barco Fantasma',       icon: '🚢', minLevel: 141,  maxLevel: 150 },
  { id: 16, name: 'Isla Pirata',          icon: '🏴‍☠️', minLevel: 151,  maxLevel: 160 },
  { id: 17, name: 'Cascada Infinita',     icon: '🌊', minLevel: 161,  maxLevel: 170 },
  { id: 18, name: 'Laguna Secreta',       icon: '🐚', minLevel: 171,  maxLevel: 180 },
  { id: 19, name: 'Cueva de Hielo',       icon: '🧊', minLevel: 181,  maxLevel: 190 },
  { id: 20, name: 'Volcán Submarino',     icon: '🌋', minLevel: 191,  maxLevel: 200 },
  // ── Era 3: Cielos y Espacio (Mundos 21-30) ──
  { id: 21, name: 'Nubes de Algodón',     icon: '☁️', minLevel: 201,  maxLevel: 210 },
  { id: 22, name: 'Torre del Viento',     icon: '🌪️', minLevel: 211,  maxLevel: 220 },
  { id: 23, name: 'Jardín Flotante',      icon: '🎋', minLevel: 221,  maxLevel: 230 },
  { id: 24, name: 'Cielo Aurora',         icon: '🌈', minLevel: 231,  maxLevel: 240 },
  { id: 25, name: 'Estación Espacial',    icon: '🛸', minLevel: 241,  maxLevel: 250 },
  { id: 26, name: 'Cinturón de Asteroides', icon: '☄️', minLevel: 251, maxLevel: 260 },
  { id: 27, name: 'Luna de Plata',        icon: '🌙', minLevel: 261,  maxLevel: 270 },
  { id: 28, name: 'Nebulosa Rosada',      icon: '🌌', minLevel: 271,  maxLevel: 280 },
  { id: 29, name: 'Planeta Rubí',         icon: '🔴', minLevel: 281,  maxLevel: 290 },
  { id: 30, name: 'Galaxia Espiral',      icon: '🌀', minLevel: 291,  maxLevel: 300 },
  // ── Era 4: Mundo Dulce (Mundos 31-40) ──
  { id: 31, name: 'Montaña de Chocolate', icon: '🍫', minLevel: 301,  maxLevel: 310 },
  { id: 32, name: 'Río de Caramelo',      icon: '🍬', minLevel: 311,  maxLevel: 320 },
  { id: 33, name: 'Bosque de Galletas',   icon: '🍪', minLevel: 321,  maxLevel: 330 },
  { id: 34, name: 'Lago de Miel',         icon: '🍯', minLevel: 331,  maxLevel: 340 },
  { id: 35, name: 'Castillo de Helado',   icon: '🍦', minLevel: 341,  maxLevel: 350 },
  { id: 36, name: 'Valle de Donas',       icon: '🍩', minLevel: 351,  maxLevel: 360 },
  { id: 37, name: 'Pradera de Fresas',    icon: '🍓', minLevel: 361,  maxLevel: 370 },
  { id: 38, name: 'Cueva de Cerezas',     icon: '🍒', minLevel: 371,  maxLevel: 380 },
  { id: 39, name: 'Torre de Pastel',      icon: '🎂', minLevel: 381,  maxLevel: 390 },
  { id: 40, name: 'Fábrica de Dulces',    icon: '🏭', minLevel: 391,  maxLevel: 400 },
  // ── Era 5: Animales y Safari (Mundos 41-50) ──
  { id: 41, name: 'Sabana Dorada',        icon: '🦁', minLevel: 401,  maxLevel: 410 },
  { id: 42, name: 'Jungla Esmeralda',     icon: '🐒', minLevel: 411,  maxLevel: 420 },
  { id: 43, name: 'Pantano Misterioso',   icon: '🐊', minLevel: 421,  maxLevel: 430 },
  { id: 44, name: 'Desierto de Arena',    icon: '🐪', minLevel: 431,  maxLevel: 440 },
  { id: 45, name: 'Tundra Helada',        icon: '🐧', minLevel: 441,  maxLevel: 450 },
  { id: 46, name: 'Montaña del Águila',   icon: '🦅', minLevel: 451,  maxLevel: 460 },
  { id: 47, name: 'Pradera de Mariposas', icon: '🦋', minLevel: 461,  maxLevel: 470 },
  { id: 48, name: 'Río de Flamingos',     icon: '🦩', minLevel: 471,  maxLevel: 480 },
  { id: 49, name: 'Bosque de Búhos',      icon: '🦉', minLevel: 481,  maxLevel: 490 },
  { id: 50, name: 'Cumbre del Lobo',      icon: '🐺', minLevel: 491,  maxLevel: 500 },
  // ── Era 6: Fantasía y Magia (Mundos 51-60) ──
  { id: 51, name: 'Pueblo de Hadas',      icon: '🧚', minLevel: 501,  maxLevel: 510 },
  { id: 52, name: 'Torre del Mago',       icon: '🧙', minLevel: 511,  maxLevel: 520 },
  { id: 53, name: 'Bosque Encantado',     icon: '🌲', minLevel: 521,  maxLevel: 530 },
  { id: 54, name: 'Lago del Unicornio',   icon: '🦄', minLevel: 531,  maxLevel: 540 },
  { id: 55, name: 'Castillo de Dragones', icon: '🐉', minLevel: 541,  maxLevel: 550 },
  { id: 56, name: 'Cueva de Gnomos',      icon: '🍄', minLevel: 551,  maxLevel: 560 },
  { id: 57, name: 'Valle de Elfos',       icon: '🧝', minLevel: 561,  maxLevel: 570 },
  { id: 58, name: 'Ruinas Antiguas',      icon: '🏛️', minLevel: 571,  maxLevel: 580 },
  { id: 59, name: 'Portal Dimensional',   icon: '🌀', minLevel: 581,  maxLevel: 590 },
  { id: 60, name: 'Trono del Fénix',      icon: '🔥', minLevel: 591,  maxLevel: 600 },
  // ── Era 7: Deportes y Competencia (Mundos 61-70) ──
  { id: 61, name: 'Estadio Olímpico',     icon: '🏟️', minLevel: 601,  maxLevel: 610 },
  { id: 62, name: 'Cancha de Campeones',  icon: '⚽', minLevel: 611,  maxLevel: 620 },
  { id: 63, name: 'Pista de Carreras',    icon: '🏎️', minLevel: 621,  maxLevel: 630 },
  { id: 64, name: 'Arena de Boxeo',       icon: '🥊', minLevel: 631,  maxLevel: 640 },
  { id: 65, name: 'Piscina Cristalina',   icon: '🏊', minLevel: 641,  maxLevel: 650 },
  { id: 66, name: 'Montaña de Esquí',     icon: '⛷️', minLevel: 651,  maxLevel: 660 },
  { id: 67, name: 'Campo de Golf',        icon: '⛳', minLevel: 661,  maxLevel: 670 },
  { id: 68, name: 'Pista de Patinaje',    icon: '⛸️', minLevel: 671,  maxLevel: 680 },
  { id: 69, name: 'Dojo de Artes',        icon: '🥋', minLevel: 681,  maxLevel: 690 },
  { id: 70, name: 'Copa del Mundo',       icon: '🏆', minLevel: 691,  maxLevel: 700 },
  // ── Era 8: Tecnología y Futuro (Mundos 71-80) ──
  { id: 71, name: 'Ciudad Neón',          icon: '🌃', minLevel: 701,  maxLevel: 710 },
  { id: 72, name: 'Laboratorio Secreto',  icon: '🔬', minLevel: 711,  maxLevel: 720 },
  { id: 73, name: 'Fábrica de Robots',    icon: '🤖', minLevel: 721,  maxLevel: 730 },
  { id: 74, name: 'Red Digital',          icon: '💻', minLevel: 731,  maxLevel: 740 },
  { id: 75, name: 'Matrix Virtual',       icon: '🕹️', minLevel: 741,  maxLevel: 750 },
  { id: 76, name: 'Nave Estelar',         icon: '🚀', minLevel: 751,  maxLevel: 760 },
  { id: 77, name: 'Base Lunar',           icon: '🌕', minLevel: 761,  maxLevel: 770 },
  { id: 78, name: 'Colonia Marciana',     icon: '🔴', minLevel: 771,  maxLevel: 780 },
  { id: 79, name: 'Agujero Negro',        icon: '🕳️', minLevel: 781,  maxLevel: 790 },
  { id: 80, name: 'Dimensión Paralela',   icon: '🌐', minLevel: 791,  maxLevel: 800 },
  // ── Era 9: Mitología y Leyendas (Mundos 81-90) ──
  { id: 81, name: 'Monte Olimpo',         icon: '⚡', minLevel: 801,  maxLevel: 810 },
  { id: 82, name: 'Laberinto del Minotauro', icon: '🐂', minLevel: 811, maxLevel: 820 },
  { id: 83, name: 'Jardín de Edén',       icon: '🌳', minLevel: 821,  maxLevel: 830 },
  { id: 84, name: 'Valhalla Nórdico',     icon: '⚔️', minLevel: 831,  maxLevel: 840 },
  { id: 85, name: 'Templo Azteca',        icon: '🏯', minLevel: 841,  maxLevel: 850 },
  { id: 86, name: 'Pirámide Egipcia',     icon: '🔺', minLevel: 851,  maxLevel: 860 },
  { id: 87, name: 'Palacio Chino',        icon: '🏮', minLevel: 861,  maxLevel: 870 },
  { id: 88, name: 'Isla de Avalon',       icon: '🗡️', minLevel: 871,  maxLevel: 880 },
  { id: 89, name: 'Atlantis Perdida',     icon: '🔱', minLevel: 881,  maxLevel: 890 },
  { id: 90, name: 'Shangri-La Eterna',    icon: '🏔️', minLevel: 891,  maxLevel: 900 },
  // ── Era 10: Maestría Suprema (Mundos 91-100) ──
  { id: 91,  name: 'Cámara del Tiempo',   icon: '⏳', minLevel: 901,  maxLevel: 910 },
  { id: 92,  name: 'Tormenta Cósmica',    icon: '🌩️', minLevel: 911,  maxLevel: 920 },
  { id: 93,  name: 'Cristal de Sombra',   icon: '🖤', minLevel: 921,  maxLevel: 930 },
  { id: 94,  name: 'Forja de Estrellas',  icon: '⭐', minLevel: 931,  maxLevel: 940 },
  { id: 95,  name: 'Vacío Infinito',      icon: '♾️', minLevel: 941,  maxLevel: 950 },
  { id: 96,  name: 'Trono de Diamantes',  icon: '💠', minLevel: 951,  maxLevel: 960 },
  { id: 97,  name: 'Abismo Final',        icon: '🕳️', minLevel: 961,  maxLevel: 970 },
  { id: 98,  name: 'Corona Suprema',      icon: '👑', minLevel: 971,  maxLevel: 980 },
  { id: 99,  name: 'Nebulosa Eterna',     icon: '✨', minLevel: 981,  maxLevel: 990 },
  { id: 100, name: 'Leyenda Infinita',    icon: '🏅', minLevel: 991,  maxLevel: 1000 },
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

/**
 * Compute staggered offsets per layer z so NO two layers ever align directly on top of each other.
 * Each layer is physically shifted by 0.30 - 0.35 grid units, exposing at least ~35% of any lower tile
 * so the player can always identify what is underneath!
 */
function getLayerOffset(
  z: number,
  baseCols: number,
  baseRows: number,
  layerCols: number,
  layerRows: number,
): { offsetX: number; offsetY: number } {
  const centerX = (baseCols - layerCols) * 0.5;
  const centerY = (baseRows - layerRows) * 0.5;

  const staggers = [
    { x: 0,    y: 0 },
    { x: 0.35, y: 0.35 },
    { x: 0.70, y: 0.35 },
    { x: 0.35, y: 0.70 },
    { x: 0.55, y: 0.20 },
    { x: 0.20, y: 0.50 },
    { x: 0.60, y: 0.60 },
  ];
  const s = staggers[z % staggers.length];

  return {
    offsetX: Number((centerX + s.x).toFixed(2)),
    offsetY: Number((centerY + s.y).toFixed(2)),
  };
}

// ─── Procedural Level Generator (1 to 100+) ───────────────────

export function getLevelConfig(level: number): LevelConfig {
  const safeLevel = Math.max(1, Math.floor(level));
  const world = getWorldForLevel(safeLevel);
  const archetypeIdx = (safeLevel - 1) % ARCHETYPES.length;
  const archetype = ARCHETYPES[archetypeIdx];

  // 1. Dificultad Progresiva y Equilibrada (1-1000):
  // Diseñada para ser entretenida y accesible para todo público.
  // Con una bandeja de 7 casillas, el número de tipos de fichas nunca debe superar 12
  // para evitar bloqueos matemáticos inevitables.
  //
  // - Niveles 1-15:    3 capas, 5-6 tipos,  ~24-33 fichas
  // - Niveles 16-35:   3 capas, 6-7 tipos,  ~33-45 fichas
  // - Niveles 36-60:   4 capas, 7-8 tipos,  ~45-54 fichas
  // - Niveles 61-90:   4 capas, 9-10 tipos, ~54-63 fichas (Nivel 72 tiene 4 capas y 10 tipos!)
  // - Niveles 91-150:  4 capas, 10-11 tipos,~63-75 fichas
  // - Niveles 151-300: 4-5 capas, 11-12 tipos,~75-90 fichas
  // - Niveles 300+:    5 capas, 12 tipos (tope estricto), ~90-108 fichas
  let targetLayers = 3;
  if (safeLevel >= 36) targetLayers = 4;
  if (safeLevel >= 150 && safeLevel % 10 === 0) targetLayers = 5;
  if (safeLevel >= 300) targetLayers = 5;

  // Dimensiones base adaptadas a pantallas móviles (5 a 7 columnas/filas)
  const progressDim = Math.min(safeLevel, 300);
  const baseCols = Math.min(7, 5 + Math.floor(progressDim / 150));
  const baseRows = Math.min(7, 5 + Math.floor(progressDim / 150));

  // Cantidad equilibrada de tipos de fichas (de 5 a 12 máximo)
  const tileTypeCount = Math.min(
    12,
    Math.max(5, 5 + Math.floor((safeLevel - 1) / 14)),
  );

  // 2. Build Layers (staggered pyramid stacking)
  const layers: LayerConfig[] = [];
  for (let z = 0; z < targetLayers; z++) {
    // Top layers decrease slightly in dimensions for a true 3D pyramid effect
    const shrink = Math.min(z, 2);
    const layerCols = Math.max(3, baseCols - shrink);
    const layerRows = Math.max(3, baseRows - shrink);

    // Staggered offsets: guarantees that lower tiles are never 100% hidden
    const { offsetX, offsetY } = getLayerOffset(
      z,
      baseCols,
      baseRows,
      layerCols,
      layerRows,
    );

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

  // Cantidad de fichas equilibrada (de 24 a 108 fichas máximo)
  const minRequiredTiles = Math.min(
    108,
    Math.max(24, 24 + Math.floor((safeLevel - 1) * 0.16) * 3),
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
