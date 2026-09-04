/**
 * Core type definitions for the Tile Clear game.
 */

/** A tile on the game board */
export interface Tile {
  /** Unique identifier */
  id: string;
  /** Tile type key (e.g., 'strawberry', 'lemon') */
  type: string;
  /** X position in grid units (used by CSS calc) */
  gridX: number;
  /** Y position in grid units (used by CSS calc) */
  gridY: number;
  /** Layer depth — higher z means visually on top */
  z: number;
  /** Row within the tile's own layer */
  row: number;
  /** Column within the tile's own layer */
  col: number;
  /** Index of the layer this tile belongs to */
  layerIndex: number;
  /** Whether the tile is covered by a tile on a higher layer */
  isBlocked: boolean;
}

/** Configuration for a single layer in a level */
export interface LayerConfig {
  /** Depth index (0 = bottom, higher = on top) */
  z: number;
  /** Number of rows in this layer's grid */
  rows: number;
  /** Number of columns in this layer's grid */
  cols: number;
  /** Optional X offset in grid units */
  offsetX?: number;
  /** Optional Y offset in grid units */
  offsetY?: number;
  /**
   * Optional shape mask — a 2D boolean array [rows][cols].
   * `true` = tile present, `false` = empty space.
   * If omitted, the entire grid is filled.
   */
  mask?: boolean[][];
}

/** Full configuration for a game level */
export interface LevelConfig {
  /** Level number (1-indexed) */
  levelNumber?: number;
  /** Total number of tiles (always a multiple of 3) */
  totalTiles: number;
  /** Layer definitions from bottom to top */
  layers: LayerConfig[];
  /** How many distinct tile types to use */
  tileTypeCount: number;
  /** Grid extent in columns (for responsive CSS sizing) */
  gridCols: number;
  /** Grid extent in rows (for responsive CSS sizing) */
  gridRows: number;
  /** Display name for the level */
  name: string;
  /** Thematic world name (e.g., 'Huerto Soleado', 'Templo de Cristal') */
  worldName?: string;
}

/** Record of a single move (tile → tray) for undo support */
export interface MoveRecord {
  /** Snapshot of the tile at the time of the move */
  tile: Tile;
  originalGridX: number;
  originalGridY: number;
  originalZ: number;
  originalRow: number;
  originalCol: number;
  originalLayerIndex: number;
}

/** Remaining uses of each power-up */
export interface PowerUpState {
  undoCount: number;
  shuffleCount: number;
  hintCount: number;
}

/** Current game status */
export type GameStatus = 'playing' | 'won' | 'lost';

/** Leaderboard user profile from Firestore */
export interface LeaderboardUser {
  uid: string;
  username: string;
  highScore: number;
  currentLevel: number;
  updatedAt?: number | string;
  rank?: number;
}
