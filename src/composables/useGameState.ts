/**
 * useGameState — central reactive game state composable.
 *
 * Implements:
 * - Reactive game board & tray with solvability checks
 * - Match Pop (scale 1.22 + glow on matched triplets before removal)
 * - Critical Tray heartbeat + haptic warning + full-tray fail state
 * - 3-Star rating per level (no critical tray / no power-ups spent / combo x2+)
 * - 1.5s Level & World Intro banner
 * - Mid-level board persistence (LocalStorage + Capacitor Preferences)
 * - Pause/resume state that preserves active combo windows
 */
import { ref, computed } from 'vue';
import { Preferences } from '@capacitor/preferences';
import type {
  Tile,
  MoveRecord,
  PowerUpState,
  GameStatus,
  MidLevelSaveState,
} from '../game/types';
import { getLevelConfig, getWorldForLevel } from '../game/levelConfig';
import {
  createBoardFromConfig,
  computeBlockedStatus,
  shuffleTilePositions,
  findHintMatch,
} from '../game/boardEngine';
import { createInitialPowerUpState, performUndo } from '../game/powerUps';
import { getAvailableTypes } from '../game/tileAssets';
import {
  playClick,
  playTap,
  playMatch,
  playCombo,
  playWin,
  playLose,
  playPowerup,
  playTrayWarning,
  playLevelIntro,
} from '../game/sounds';
import { useDailyMissions } from './useDailyMissions';

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

export interface LevelStarsBreakdown {
  stars: number;
  noCriticalTray: boolean;
  noPowerUpsUsed: boolean;
  reachedCombo2: boolean;
}

export interface LevelIntroInfo {
  id: number;
  level: number;
  worldId: number;
  worldName: string;
  worldIcon: string;
  archetypeName: string;
}

const MID_LEVEL_SAVE_KEY = 'fruta_clear_midlevel_board_v1';
const BONUS_POWERUPS_KEY = 'fruta_clear_bonus_powerups_v1';
const LEVEL_STARS_KEY = 'fruta_clear_level_stars_v1';

function loadBonusPowerUps(): PowerUpState {
  try {
    const raw = localStorage.getItem(BONUS_POWERUPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        undoCount: Math.max(0, Number(parsed.undoCount) || 0),
        shuffleCount: Math.max(0, Number(parsed.shuffleCount) || 0),
        hintCount: Math.max(0, Number(parsed.hintCount) || 0),
      };
    }
  } catch {
    // ignore
  }
  return { undoCount: 0, shuffleCount: 0, hintCount: 0 };
}

function saveBonusPowerUps(state: PowerUpState) {
  try {
    localStorage.setItem(BONUS_POWERUPS_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadLevelStarsMap(): Record<number, number> {
  try {
    const raw = localStorage.getItem(LEVEL_STARS_KEY);
    if (raw) {
      return JSON.parse(raw) || {};
    }
  } catch {
    // ignore
  }
  return {};
}

function saveLevelStarsMap(map: Record<number, number>) {
  try {
    const str = JSON.stringify(map);
    localStorage.setItem(LEVEL_STARS_KEY, str);
    Preferences.set({ key: LEVEL_STARS_KEY, value: str }).catch(() => {});
  } catch {
    // ignore
  }
}

export function useGameState() {
  const MAX_TRAY = 7;
  const COMBO_WINDOW_MS = 4000;
  const dailyMissions = useDailyMissions();

  // ─── Reactive State ─────────────────────────────────────────
  const boardTiles = ref<Tile[]>([]);
  const tray = ref<Tile[]>([]);
  const score = ref(0);
  const level = ref(1);
  const moveHistory = ref<MoveRecord[]>([]);
  const bonusPowerUps = ref<PowerUpState>(loadBonusPowerUps());
  const powerUpState = ref<PowerUpState>(createInitialPowerUpState(1));
  const gameStatus = ref<GameStatus>('playing');
  const isPaused = ref(false);
  const hintedTileIds = ref<Set<string>>(new Set());
  const matchingTileIds = ref<Set<string>>(new Set());
  const wigglingTileId = ref<string | null>(null);
  const isAnimating = ref(false);
  const isTrayFullError = ref(false);

  // ─── 3-Star Tracking & Level Intro (#3 & #4) ────────────────
  const hadCriticalTray = ref(false);
  const powerUpsUsedInLevel = ref(0);
  const maxComboInLevel = ref(1);
  const levelStarsMap = ref<Record<number, number>>(loadLevelStarsMap());
  const lastLevelStars = ref<LevelStarsBreakdown>({
    stars: 3,
    noCriticalTray: true,
    noPowerUpsUsed: true,
    reachedCombo2: true,
  });
  const levelIntroBanner = ref<LevelIntroInfo | null>(null);
  let levelIntroTimer: ReturnType<typeof setTimeout> | null = null;

  // Stats & Progress
  const totalLevelTiles = ref(0);
  const comboCount = ref(0);
  const lastMatchTimestamp = ref(0);
  let pausedAtTimestamp = 0;
  const comboBanner = ref<ComboBanner | null>(null);
  const lastLevelBonus = ref<LevelBonus>({
    base: 0,
    powerups: 0,
    comboTotal: 0,
    total: 0,
  });

  // ─── Computed ───────────────────────────────────────────────
  const currentConfig = computed(() => getLevelConfig(level.value));
  const currentWorldInfo = computed(() => getWorldForLevel(level.value));
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

  const canUseHint = computed(() => {
    if (
      powerUpState.value.hintCount <= 0 ||
      gameStatus.value !== 'playing' ||
      isPaused.value ||
      isAnimating.value
    ) {
      return false;
    }
    return findHintMatch(boardTiles.value, tray.value, MAX_TRAY) !== null;
  });

  // ─── Level Intro 1.5s Overlay (#3) ──────────────────────────
  const triggerLevelIntro = () => {
    if (levelIntroTimer) {
      clearTimeout(levelIntroTimer);
      levelIntroTimer = null;
    }
    const world = currentWorldInfo.value;
    const cleanArch = currentConfig.value.name.replace(/\s*\(Nivel\s+\d+\)$/i, '');
    const introId = Date.now();
    levelIntroBanner.value = {
      id: introId,
      level: level.value,
      worldId: world.id,
      worldName: world.name,
      worldIcon: world.icon,
      archetypeName: cleanArch,
    };
    playLevelIntro();
    levelIntroTimer = setTimeout(() => {
      if (levelIntroBanner.value?.id === introId) {
        levelIntroBanner.value = null;
      }
    }, 1500);
  };

  const dismissLevelIntro = () => {
    if (levelIntroTimer) {
      clearTimeout(levelIntroTimer);
      levelIntroTimer = null;
    }
    levelIntroBanner.value = null;
  };

  // ─── Mid-Level Persistence (LocalStorage + Preferences) ────
  const persistMidLevelState = () => {
    if (gameStatus.value !== 'playing' || boardTiles.value.length === 0) {
      clearMidLevelState();
      return;
    }
    const snapshot: MidLevelSaveState = {
      level: level.value,
      sessionScore: score.value,
      boardTiles: boardTiles.value,
      tray: tray.value,
      moveHistory: moveHistory.value,
      powerUpState: powerUpState.value,
      totalLevelTiles: totalLevelTiles.value,
      savedAt: Date.now(),
    };
    try {
      const serialized = JSON.stringify(snapshot);
      localStorage.setItem(MID_LEVEL_SAVE_KEY, serialized);
      Preferences.set({ key: MID_LEVEL_SAVE_KEY, value: serialized }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const clearMidLevelState = () => {
    try {
      localStorage.removeItem(MID_LEVEL_SAVE_KEY);
      Preferences.remove({ key: MID_LEVEL_SAVE_KEY }).catch(() => {});
    } catch {
      // ignore
    }
  };

  const restoreMidLevelState = async (targetLevel: number): Promise<boolean> => {
    try {
      let raw = localStorage.getItem(MID_LEVEL_SAVE_KEY);
      if (!raw) {
        try {
          const pref = await Preferences.get({ key: MID_LEVEL_SAVE_KEY });
          raw = pref.value;
        } catch {
          raw = null;
        }
      }
      if (!raw) return false;

      const parsed = JSON.parse(raw) as MidLevelSaveState;
      if (
        !parsed ||
        parsed.level !== targetLevel ||
        !Array.isArray(parsed.boardTiles) ||
        parsed.boardTiles.length === 0 ||
        !Array.isArray(parsed.tray) ||
        parsed.tray.length >= MAX_TRAY
      ) {
        return false;
      }

      level.value = parsed.level;
      score.value = parsed.sessionScore || 0;
      boardTiles.value = computeBlockedStatus(parsed.boardTiles);
      tray.value = parsed.tray;
      moveHistory.value = Array.isArray(parsed.moveHistory) ? parsed.moveHistory : [];
      powerUpState.value = parsed.powerUpState || createInitialPowerUpState(targetLevel);
      totalLevelTiles.value =
        parsed.totalLevelTiles || parsed.boardTiles.length + parsed.tray.length;
      gameStatus.value = 'playing';
      isPaused.value = false;
      hintedTileIds.value = new Set();
      matchingTileIds.value = new Set();
      wigglingTileId.value = null;
      isAnimating.value = false;
      isTrayFullError.value = false;
      hadCriticalTray.value = parsed.tray.length >= 5;
      powerUpsUsedInLevel.value = 0;
      maxComboInLevel.value = 1;
      return true;
    } catch {
      return false;
    }
  };

  // ─── Pause / Resume ─────────────────────────────────────────
  const pauseGame = () => {
    if (isPaused.value) return;
    isPaused.value = true;
    pausedAtTimestamp = Date.now();
    persistMidLevelState();
  };

  const resumeGame = () => {
    if (!isPaused.value) return;
    if (pausedAtTimestamp > 0 && lastMatchTimestamp.value > 0) {
      const pausedDuration = Date.now() - pausedAtTimestamp;
      lastMatchTimestamp.value += pausedDuration;
    }
    pausedAtTimestamp = 0;
    isPaused.value = false;
  };

  // ─── Board Generation ──────────────────────────────────────
  const generateBoard = (showIntro = true) => {
    const config = currentConfig.value;
    const types = getAvailableTypes(config.tileTypeCount, level.value);
    boardTiles.value = createBoardFromConfig(config, types);
    totalLevelTiles.value = boardTiles.value.length;
    tray.value = [];
    moveHistory.value = [];
    hintedTileIds.value = new Set();
    matchingTileIds.value = new Set();
    wigglingTileId.value = null;
    isTrayFullError.value = false;

    // Reset 3-star trackers for this level attempt
    hadCriticalTray.value = false;
    powerUpsUsedInLevel.value = 0;
    maxComboInLevel.value = 1;

    const baseAllowances = createInitialPowerUpState(level.value);
    powerUpState.value = {
      undoCount: baseAllowances.undoCount + bonusPowerUps.value.undoCount,
      shuffleCount: baseAllowances.shuffleCount + bonusPowerUps.value.shuffleCount,
      hintCount: baseAllowances.hintCount + bonusPowerUps.value.hintCount,
    };

    gameStatus.value = 'playing';
    isPaused.value = false;
    isAnimating.value = false;
    comboCount.value = 0;
    lastMatchTimestamp.value = 0;
    comboBanner.value = null;
    persistMidLevelState();

    if (showIntro) {
      triggerLevelIntro();
    }
  };

  // ─── Grant Purchased Power-Ups ─────────────────────────────
  const grantBonusPowerUps = (rewards: {
    undo: number;
    shuffle: number;
    hint: number;
  }) => {
    bonusPowerUps.value = {
      undoCount: bonusPowerUps.value.undoCount + rewards.undo,
      shuffleCount: bonusPowerUps.value.shuffleCount + rewards.shuffle,
      hintCount: bonusPowerUps.value.hintCount + rewards.hint,
    };
    saveBonusPowerUps(bonusPowerUps.value);

    powerUpState.value = {
      undoCount: powerUpState.value.undoCount + rewards.undo,
      shuffleCount: powerUpState.value.shuffleCount + rewards.shuffle,
      hintCount: powerUpState.value.hintCount + rewards.hint,
    };
    persistMidLevelState();
  };

  // ─── Tile Selection ────────────────────────────────────────
  const selectTile = (tile: Tile) => {
    if (isPaused.value) return;
    if (levelIntroBanner.value) {
      dismissLevelIntro();
    }

    if (tile.isBlocked) {
      playTap();
      wigglingTileId.value = tile.id;
      setTimeout(() => {
        if (wigglingTileId.value === tile.id) {
          wigglingTileId.value = null;
        }
      }, 240);
      return;
    }

    if (
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

    persistMidLevelState();
    checkMatches();
  };

  // ─── Match Detection, Match Pop (#5) & Combos ──────────────
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

      // #5 Match Pop: Immediately mark the 3 matching tiles in the tray so they scale(1.22) + glow!
      const popIds: string[] = [];
      for (const t of tray.value) {
        if (t.type === removingType && popIds.length < 3) {
          popIds.push(t.id);
        }
      }
      matchingTileIds.value = new Set([...matchingTileIds.value, ...popIds]);

      setTimeout(() => {
        // Remove the 3 matched tiles
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

        const nextMatching = new Set(matchingTileIds.value);
        for (const id of removedIds) {
          nextMatching.delete(id);
        }
        matchingTileIds.value = nextMatching;

        // Clean matched tiles from undo history
        const removedSet = new Set(removedIds);
        moveHistory.value = moveHistory.value.filter(
          m => !removedSet.has(m.tile.id),
        );

        // Record daily mission tiles cleared
        dailyMissions.recordTilesCleared(removed);

        // ─── Combo System ─────────────────────────────
        const now = Date.now();
        if (now - lastMatchTimestamp.value <= COMBO_WINDOW_MS) {
          comboCount.value++;
        } else {
          comboCount.value = 1;
        }
        lastMatchTimestamp.value = now;

        if (comboCount.value > maxComboInLevel.value) {
          maxComboInLevel.value = comboCount.value;
        }

        if (comboCount.value > 1) {
          playCombo(comboCount.value);
          dailyMissions.recordCombo();
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

        comboBanner.value = {
          id: now,
          text: bannerText,
          points: pointsEarned,
          multiplier: comboCount.value,
        };

        setTimeout(() => {
          if (comboBanner.value?.id === now) {
            comboBanner.value = null;
          }
        }, 1800);

        const nextCounts: Record<string, number> = {};
        tray.value.forEach(t => {
          nextCounts[t.type] = (nextCounts[t.type] || 0) + 1;
        });
        if (Object.values(nextCounts).some(c => c >= 3)) {
          checkMatches();
        } else {
          checkWinCondition();
          checkLoseCondition();
          persistMidLevelState();
        }
      }, 260);
    } else {
      // No triplet formed on this move: check critical tray warning (#5)
      if (tray.value.length >= 5 && tray.value.length < MAX_TRAY) {
        hadCriticalTray.value = true;
        playTrayWarning();
      } else if (tray.value.length >= MAX_TRAY) {
        hadCriticalTray.value = true;
        isTrayFullError.value = true;
      }
      checkLoseCondition();
    }
  };

  // ─── Win / Lose & 3-Star Calculation (#4) ──────────────────
  const checkWinCondition = () => {
    if (boardTiles.value.length === 0 && tray.value.length === 0) {
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

      // #4 Calculate 3 Stars:
      // 1. Bandeja nunca crítica (!hadCriticalTray)
      // 2. Power-ups sin gastar (powerUpsUsedInLevel === 0)
      // 3. Combo x2+ alcanzado (maxComboInLevel >= 2)
      const noCriticalTray = !hadCriticalTray.value;
      const noPowerUpsUsed = powerUpsUsedInLevel.value === 0;
      const reachedCombo2 = maxComboInLevel.value >= 2;
      const earnedStars =
        (noCriticalTray ? 1 : 0) +
        (noPowerUpsUsed ? 1 : 0) +
        (reachedCombo2 ? 1 : 0);

      lastLevelStars.value = {
        stars: earnedStars,
        noCriticalTray,
        noPowerUpsUsed,
        reachedCombo2,
      };

      const prevBest = levelStarsMap.value[level.value] || 0;
      if (earnedStars > prevBest) {
        levelStarsMap.value = {
          ...levelStarsMap.value,
          [level.value]: earnedStars,
        };
        saveLevelStarsMap(levelStarsMap.value);
      }

      gameStatus.value = 'won';
      clearMidLevelState();
      dailyMissions.recordLevelWin();
      playWin();
    }
  };

  const checkLoseCondition = () => {
    if (tray.value.length >= MAX_TRAY) {
      isTrayFullError.value = true;
      gameStatus.value = 'lost';
      clearMidLevelState();
      playLose();
      return;
    }

    if (boardTiles.value.length === 0 && tray.value.length > 0) {
      const counts: Record<string, number> = {};
      tray.value.forEach(t => {
        counts[t.type] = (counts[t.type] || 0) + 1;
      });
      const hasMatch = Object.values(counts).some(c => c >= 3);
      if (!hasMatch) {
        isTrayFullError.value = true;
        gameStatus.value = 'lost';
        clearMidLevelState();
        playLose();
      }
    }
  };

  // ─── Power-ups ─────────────────────────────────────────────

  const undoMove = () => {
    if (
      isPaused.value ||
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
    powerUpsUsedInLevel.value++;

    boardTiles.value = result.boardTiles;
    tray.value = result.tray;
    moveHistory.value = result.moveHistory;
    if (bonusPowerUps.value.undoCount > 0) {
      bonusPowerUps.value.undoCount--;
      saveBonusPowerUps(bonusPowerUps.value);
    }
    powerUpState.value = {
      ...powerUpState.value,
      undoCount: powerUpState.value.undoCount - 1,
    };
    persistMidLevelState();
  };

  const shuffleBoard = () => {
    if (
      isPaused.value ||
      powerUpState.value.shuffleCount <= 0 ||
      boardTiles.value.length === 0 ||
      gameStatus.value !== 'playing' ||
      isAnimating.value
    )
      return;

    playPowerup();
    powerUpsUsedInLevel.value++;
    boardTiles.value = shuffleTilePositions(
      boardTiles.value,
      tray.value,
      MAX_TRAY,
    );
    if (bonusPowerUps.value.shuffleCount > 0) {
      bonusPowerUps.value.shuffleCount--;
      saveBonusPowerUps(bonusPowerUps.value);
    }
    powerUpState.value = {
      ...powerUpState.value,
      shuffleCount: powerUpState.value.shuffleCount - 1,
    };
    persistMidLevelState();
  };

  const autoMatch = () => {
    if (
      isPaused.value ||
      powerUpState.value.hintCount <= 0 ||
      gameStatus.value !== 'playing' ||
      isAnimating.value
    )
      return;

    const hintTiles = findHintMatch(boardTiles.value, tray.value, MAX_TRAY);
    if (!hintTiles || hintTiles.length === 0) return;

    playPowerup();
    powerUpsUsedInLevel.value++;

    hintedTileIds.value = new Set(hintTiles.map(t => t.id));
    isAnimating.value = true;

    setTimeout(() => {
      const ids = hintedTileIds.value;

      boardTiles.value = computeBlockedStatus(
        boardTiles.value.filter(t => !ids.has(t.id)),
      );

      tray.value.push(...hintTiles);
      tray.value.sort((a, b) => a.type.localeCompare(b.type));

      hintedTileIds.value = new Set();
      isAnimating.value = false;
      if (bonusPowerUps.value.hintCount > 0) {
        bonusPowerUps.value.hintCount--;
        saveBonusPowerUps(bonusPowerUps.value);
      }
      powerUpState.value = {
        ...powerUpState.value,
        hintCount: powerUpState.value.hintCount - 1,
      };

      persistMidLevelState();
      checkMatches();
    }, 500);
  };

  // ─── Level Navigation ──────────────────────────────────────
  const nextLevel = () => {
    clearMidLevelState();
    level.value++;
    generateBoard(true);
  };

  const retryLevel = () => {
    clearMidLevelState();
    generateBoard(true);
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
    isPaused,
    hintedTileIds,
    matchingTileIds,
    wigglingTileId,
    isAnimating,
    isTrayFullError,
    MAX_TRAY,
    canUseHint,

    // 3-Star & Intro State
    lastLevelStars,
    levelStarsMap,
    levelIntroBanner,
    dismissLevelIntro,

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
    pauseGame,
    resumeGame,
    grantBonusPowerUps,
    persistMidLevelState,
    restoreMidLevelState,
    clearMidLevelState,
  };
}
