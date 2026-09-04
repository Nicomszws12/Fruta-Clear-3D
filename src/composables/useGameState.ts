/**
 * useGameState — central reactive game state composable.
 *
 * Implements:
 * - Reactive game board & tray
 * - Combos with rapid-match multiplier (within 4s)
 * - Level bonus calculation (base + unused power-ups bonus)
 * - Procedural level progression (1 to 100+)
 * - Power-ups (Undo, Shuffle, Hint)
 * - Floating feedback state
 */
import { ref, computed } from 'vue';
import type { Tile, MoveRecord, PowerUpState, GameStatus } from '../game/types';
import { getLevelConfig } from '../game/levelConfig';
import {
  createBoardFromConfig,
  computeBlockedStatus,
  shuffleTilePositions,
  findHintMatch,
} from '../game/boardEngine';
import { createInitialPowerUpState, performUndo } from '../game/powerUps';
import { getAvailableTypes } from '../game/tileAssets';
import { playClick, playMatch, playCombo, playWin, playLose, playPowerup } from '../game/sounds';

export interface ComboBanner {
  id: number;
  text: string;
  points: number;
  multiplier: number;
}

export interface LevelBonus {
  base: number;
  powerups: number;
  comboTotal: number;
  total: number;
}

export function useGameState() {
  const MAX_TRAY = 7;
  const COMBO_WINDOW_MS = 4000;

  // ─── Reactive State ─────────────────────────────────────────
  const boardTiles = ref<Tile[]>([]);
  const tray = ref<Tile[]>([]);
  const score = ref(0);
  const level = ref(1);
  const moveHistory = ref<MoveRecord[]>([]);
  const powerUpState = ref<PowerUpState>(createInitialPowerUpState(1));
  const gameStatus = ref<GameStatus>('playing');
  const hintedTileIds = ref<Set<string>>(new Set());
  const isAnimating = ref(false);

  // Stats & Progress
  const totalLevelTiles = ref(0);
  const comboCount = ref(0);
  const lastMatchTimestamp = ref(0);
  const comboBanner = ref<ComboBanner | null>(null);
  const lastLevelBonus = ref<LevelBonus>({ base: 0, powerups: 0, comboTotal: 0, total: 0 });

  // ─── Computed ───────────────────────────────────────────────
  const currentConfig = computed(() => getLevelConfig(level.value));
  const gridCols = computed(() => currentConfig.value.gridCols);
  const gridRows = computed(() => currentConfig.value.gridRows);
  const levelName = computed(() => currentConfig.value.name);
  const worldName = computed(() => currentConfig.value.worldName || 'Huerto');
  const remainingTiles = computed(() => boardTiles.value.length);
  const levelProgress = computed(() => {
    if (totalLevelTiles.value <= 0) return 0;
    const cleared = totalLevelTiles.value - boardTiles.value.length;
    return Math.min(1, Math.max(0, cleared / totalLevelTiles.value));
  });

  // Danger state: tray has 5 or 6 items (about to lose at 7)
  const isTrayCritical = computed(() => tray.value.length >= 5);

  // ─── Board Generation ──────────────────────────────────────
  const generateBoard = () => {
    const config = currentConfig.value;
    const types = getAvailableTypes(config.tileTypeCount, level.value);
    boardTiles.value = createBoardFromConfig(config, types);
    totalLevelTiles.value = boardTiles.value.length;
    tray.value = [];
    moveHistory.value = [];
    hintedTileIds.value = new Set();
    powerUpState.value = createInitialPowerUpState(level.value);
    gameStatus.value = 'playing';
    isAnimating.value = false;
    comboCount.value = 0;
    lastMatchTimestamp.value = 0;
    comboBanner.value = null;
  };

  // ─── Tile Selection ────────────────────────────────────────
  const selectTile = (tile: Tile) => {
    if (
      tile.isBlocked ||
      tray.value.length >= MAX_TRAY ||
      gameStatus.value !== 'playing' ||
      isAnimating.value
    )
      return;

    playClick();

    // Record for undo
    moveHistory.value.push({
      tile: { ...tile },
      originalGridX: tile.gridX,
      originalGridY: tile.gridY,
      originalZ: tile.z,
      originalRow: tile.row,
      originalCol: tile.col,
      originalLayerIndex: tile.layerIndex,
    });

    // Remove from board and recalculate blocked status
    boardTiles.value = computeBlockedStatus(
      boardTiles.value.filter(t => t.id !== tile.id),
    );

    // Add to tray (sorted by type for visual grouping)
    tray.value.push(tile);
    tray.value.sort((a, b) => a.type.localeCompare(b.type));

    checkMatches();
  };

  // ─── Match Detection & Combos ──────────────────────────────
  const checkMatches = () => {
    const counts: Record<string, number> = {};
    tray.value.forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });

    let typeToRemove: string | null = null;
    for (const [type, count] of Object.entries(counts)) {
      if (count >= 3) {
        typeToRemove = type;
        break;
      }
    }

    if (typeToRemove) {
      const removingType = typeToRemove;
      setTimeout(() => {
        // Remove exactly 3 of the matched type
        let removed = 0;
        const removedIds: string[] = [];
        tray.value = tray.value.filter(t => {
          if (t.type === removingType && removed < 3) {
            removed++;
            removedIds.push(t.id);
            return false;
          }
          return true;
        });

        // Clean matched tiles from undo history
        const removedSet = new Set(removedIds);
        moveHistory.value = moveHistory.value.filter(
          m => !removedSet.has(m.tile.id),
        );

        // ─── Combo System ─────────────────────────────
        const now = Date.now();
        if (now - lastMatchTimestamp.value <= COMBO_WINDOW_MS) {
          comboCount.value++;
        } else {
          comboCount.value = 1;
        }
        lastMatchTimestamp.value = now;

        if (comboCount.value > 1) {
          playCombo(comboCount.value);
        } else {
          playMatch();
        }

        let pointsEarned = 100;
        let bannerText = '+100';

        if (comboCount.value === 2) {
          pointsEarned = 200;
          bannerText = '🔥 COMBO x2!';
        } else if (comboCount.value === 3) {
          pointsEarned = 350;
          bannerText = '⚡ TRIPLE COMBO!';
        } else if (comboCount.value >= 4) {
          pointsEarned = 500;
          bannerText = `💥 MEGA COMBO x${comboCount.value}!`;
        }

        score.value += pointsEarned;

        // Show floating combo banner
        comboBanner.value = {
          id: now,
          text: bannerText,
          points: pointsEarned,
          multiplier: comboCount.value,
        };

        // Auto-dismiss banner
        setTimeout(() => {
          if (comboBanner.value?.id === now) {
            comboBanner.value = null;
          }
        }, 1800);

        // Check for chain matches (e.g., 6 of same type in tray)
        const nextCounts: Record<string, number> = {};
        tray.value.forEach(t => {
          nextCounts[t.type] = (nextCounts[t.type] || 0) + 1;
        });
        if (Object.values(nextCounts).some(c => c >= 3)) {
          checkMatches();
        } else {
          checkWinCondition();
          checkLoseCondition();
        }
      }, 250);
    } else {
      checkLoseCondition();
    }
  };

  // ─── Win / Lose ────────────────────────────────────────────
  const checkWinCondition = () => {
    if (boardTiles.value.length === 0 && tray.value.length === 0) {
      // Calculate level bonus
      const base = 500 + level.value * 50;
      const unusedPowerups =
        powerUpState.value.undoCount +
        powerUpState.value.shuffleCount +
        powerUpState.value.hintCount;
      const powerups = unusedPowerups * 150;
      const total = base + powerups;

      score.value += total;
      lastLevelBonus.value = {
        base,
        powerups,
        comboTotal: 0,
        total,
      };

      gameStatus.value = 'won';
      playWin();
    }
  };

  const checkLoseCondition = () => {
    // 1. Tray reaches maximum capacity (7 tiles)
    if (tray.value.length >= MAX_TRAY) {
      gameStatus.value = 'lost';
      playLose();
      return;
    }

    // 2. Deadlock protection: board is cleared but tray still holds leftovers that cannot match
    if (boardTiles.value.length === 0 && tray.value.length > 0) {
      const counts: Record<string, number> = {};
      tray.value.forEach(t => {
        counts[t.type] = (counts[t.type] || 0) + 1;
      });
      const hasMatch = Object.values(counts).some(c => c >= 3);
      if (!hasMatch) {
        gameStatus.value = 'lost';
        playLose();
      }
    }
  };

  // ─── Power-ups ─────────────────────────────────────────────

  const undoMove = () => {
    if (
      powerUpState.value.undoCount <= 0 ||
      moveHistory.value.length === 0 ||
      gameStatus.value !== 'playing' ||
      isAnimating.value
    )
      return;

    const result = performUndo(
      boardTiles.value,
      tray.value,
      moveHistory.value,
    );
    if (!result) return;

    playPowerup();

    boardTiles.value = result.boardTiles;
    tray.value = result.tray;
    moveHistory.value = result.moveHistory;
    powerUpState.value = {
      ...powerUpState.value,
      undoCount: powerUpState.value.undoCount - 1,
    };
  };

  const shuffleBoard = () => {
    if (
      powerUpState.value.shuffleCount <= 0 ||
      boardTiles.value.length === 0 ||
      gameStatus.value !== 'playing' ||
      isAnimating.value
    )
      return;

    playPowerup();
    boardTiles.value = shuffleTilePositions(boardTiles.value);
    powerUpState.value = {
      ...powerUpState.value,
      shuffleCount: powerUpState.value.shuffleCount - 1,
    };
  };

  const autoMatch = () => {
    if (
      powerUpState.value.hintCount <= 0 ||
      gameStatus.value !== 'playing' ||
      isAnimating.value ||
      tray.value.length > MAX_TRAY - 3
    )
      return;

    const hintTiles = findHintMatch(boardTiles.value);
    if (!hintTiles) return;

    playPowerup();

    // Visual highlight phase
    hintedTileIds.value = new Set(hintTiles.map(t => t.id));
    isAnimating.value = true;

    setTimeout(() => {
      const ids = hintedTileIds.value;

      // Remove from board
      boardTiles.value = computeBlockedStatus(
        boardTiles.value.filter(t => !ids.has(t.id)),
      );

      // Add to tray
      tray.value.push(...hintTiles);
      tray.value.sort((a, b) => a.type.localeCompare(b.type));

      hintedTileIds.value = new Set();
      isAnimating.value = false;
      powerUpState.value = {
        ...powerUpState.value,
        hintCount: powerUpState.value.hintCount - 1,
      };

      checkMatches();
    }, 500);
  };

  // ─── Level Navigation ──────────────────────────────────────
  const nextLevel = () => {
    level.value++;
    generateBoard();
  };

  const retryLevel = () => {
    generateBoard();
  };

  // ─── Public API ────────────────────────────────────────────
  return {
    // State
    boardTiles,
    tray,
    score,
    level,
    moveHistory,
    powerUpState,
    gameStatus,
    hintedTileIds,
    isAnimating,
    MAX_TRAY,

    // Progress & Stats
    totalLevelTiles,
    remainingTiles,
    levelProgress,
    isTrayCritical,
    comboCount,
    comboBanner,
    lastLevelBonus,

    // Computed
    gridCols,
    gridRows,
    levelName,
    worldName,

    // Actions
    generateBoard,
    selectTile,
    undoMove,
    shuffleBoard,
    autoMatch,
    nextLevel,
    retryLevel,
  };
}
