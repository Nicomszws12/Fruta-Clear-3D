/**
 * Power-up helpers — Undo, Shuffle, and Hint logic.
 *
 * These functions are pure: they accept state as input and return
 * new state as output. Side-effects (updating refs) are handled
 * by the useGameState composable.
 */
import type { Tile, MoveRecord, PowerUpState } from './types';
import { computeBlockedStatus } from './boardEngine';

/**
 * Create the initial power-up allowances for a level.
 * Could be made dynamic per-level in the future.
 */
export function createInitialPowerUpState(_level: number): PowerUpState {
  return {
    undoCount: 3,
    shuffleCount: 2,
    hintCount: 1,
  };
}

/**
 * Undo the last move: pop the most recent MoveRecord, remove
 * its tile from the tray, and restore it to the board.
 *
 * Returns the updated state or `null` if undo is impossible
 * (empty history or tile was already matched).
 */
export function performUndo(
  boardTiles: Tile[],
  tray: Tile[],
  moveHistory: MoveRecord[],
): {
  boardTiles: Tile[];
  tray: Tile[];
  moveHistory: MoveRecord[];
} | null {
  if (moveHistory.length === 0) return null;

  const newHistory = [...moveHistory];
  const lastMove = newHistory.pop()!;

  // Verify the tile is still in the tray (hasn't been matched)
  const trayIndex = tray.findIndex(t => t.id === lastMove.tile.id);
  if (trayIndex === -1) return null;

  // Remove from tray
  const newTray = [...tray];
  newTray.splice(trayIndex, 1);

  // Restore to board
  const restoredTile: Tile = {
    ...lastMove.tile,
    gridX: lastMove.originalGridX,
    gridY: lastMove.originalGridY,
    z: lastMove.originalZ,
    row: lastMove.originalRow,
    col: lastMove.originalCol,
    layerIndex: lastMove.originalLayerIndex,
    isBlocked: false,
  };

  const newBoard = computeBlockedStatus([...boardTiles, restoredTile]);

  return {
    boardTiles: newBoard,
    tray: newTray,
    moveHistory: newHistory,
  };
}

