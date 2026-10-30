import { describe, expect, test, beforeEach } from 'vitest';
import {
  generateDeck,
  createBoardFromConfig,
  computeBlockedStatus,
  isBoardSolvable,
  assignConstructiveSolvableTypes,
  shuffleTilePositions,
  findHintMatch,
} from '@/game/boardEngine';
import { createInitialPowerUpState, performUndo } from '@/game/powerUps';
import { getLevelConfig } from '@/game/levelConfig';
import { getAvailableTypes } from '@/game/tileAssets';
import { useGameState } from '@/composables/useGameState';
import {
  isValidSingleUseRecoveryCode,
  generateRecoveryCodeFormat,
  useFirebase,
} from '@/composables/useFirebase';
import type { Tile, MoveRecord } from '@/game/types';

describe('Motor de Tablero 3D (boardEngine)', () => {
  test('generateDeck genera múltiplos exactos de 3 por cada tipo de ficha', () => {
    const types = ['strawberry', 'lemon', 'grapes', 'watermelon'];
    const deck = generateDeck(24, 4, types);

    expect(deck.length).toBe(24);
    const counts: Record<string, number> = {};
    for (const t of deck) {
      counts[t] = (counts[t] || 0) + 1;
    }
    for (const c of Object.values(counts)) {
      expect(c % 3).toBe(0);
    }
  });

  test('createBoardFromConfig garantiza tripletes y solvabilidad con bandeja de 7', () => {
    for (const lvl of [1, 5, 18, 36, 72]) {
      const config = getLevelConfig(lvl);
      const types = getAvailableTypes(config.tileTypeCount, lvl);
      const board = createBoardFromConfig(config, types);

      expect(board.length).toBeGreaterThan(0);
      expect(board.length % 3).toBe(0);
      expect(isBoardSolvable(board, [], 7)).toBe(true);
    }
  });

  test('assignConstructiveSolvableTypes revalida explícitamente con isBoardSolvable (P1-1)', () => {
    const config = getLevelConfig(28);
    const types = getAvailableTypes(config.tileTypeCount, 28);
    const baseBoard = createBoardFromConfig(config, types);
    const constructive = assignConstructiveSolvableTypes(
      baseBoard,
      baseBoard.map(t => t.type),
      [],
      7,
    );

    expect(constructive.length).toBe(baseBoard.length);
    expect(isBoardSolvable(constructive, [], 7)).toBe(true);
  });

  test('computeBlockedStatus detecta bloqueo 3D por superposición de capas y libera al quitar la superior', () => {
    const bottomTile: Tile = {
      id: 't-bottom',
      type: 'strawberry',
      gridX: 2,
      gridY: 2,
      z: 0,
      row: 2,
      col: 2,
      layerIndex: 0,
      isBlocked: false,
    };
    const topTile: Tile = {
      id: 't-top',
      type: 'lemon',
      gridX: 2.35,
      gridY: 2.35,
      z: 1,
      row: 2,
      col: 2,
      layerIndex: 1,
      isBlocked: false,
    };
    const farTile: Tile = {
      id: 't-far',
      type: 'grapes',
      gridX: 4,
      gridY: 4,
      z: 0,
      row: 4,
      col: 4,
      layerIndex: 0,
      isBlocked: false,
    };

    const evaluated = computeBlockedStatus([bottomTile, topTile, farTile]);
    const evalBottom = evaluated.find(t => t.id === 't-bottom')!;
    const evalTop = evaluated.find(t => t.id === 't-top')!;
    const evalFar = evaluated.find(t => t.id === 't-far')!;

    expect(evalBottom.isBlocked).toBe(true);
    expect(evalTop.isBlocked).toBe(false);
    expect(evalFar.isBlocked).toBe(false);

    const afterRemove = computeBlockedStatus(evaluated.filter(t => t.id !== 't-top'));
    expect(afterRemove.find(t => t.id === 't-bottom')!.isBlocked).toBe(false);
  });

  test('shuffleTilePositions conserva coordenadas 3D y mantiene el tablero resoluble', () => {
    const config = getLevelConfig(3);
    const types = getAvailableTypes(config.tileTypeCount, 3);
    const board = createBoardFromConfig(config, types);

    const shuffled = shuffleTilePositions(board, [], 7);
    expect(shuffled.length).toBe(board.length);
    expect(shuffled.map(t => ({ x: t.gridX, y: t.gridY, z: t.z }))).toEqual(
      board.map(t => ({ x: t.gridX, y: t.gridY, z: t.z })),
    );
    expect(isBoardSolvable(shuffled, [], 7)).toBe(true);
  });

  test('findHintMatch considera fichas que ya están en la bandeja antes de buscar 3 en el tablero', () => {
    const board: Tile[] = [
      { id: 'b1', type: 'lemon', gridX: 0, gridY: 0, z: 0, row: 0, col: 0, layerIndex: 0, isBlocked: false },
      { id: 'b2', type: 'strawberry', gridX: 1, gridY: 0, z: 0, row: 0, col: 1, layerIndex: 0, isBlocked: false },
      { id: 'b3', type: 'strawberry', gridX: 2, gridY: 0, z: 0, row: 0, col: 2, layerIndex: 0, isBlocked: false },
      { id: 'b4', type: 'strawberry', gridX: 3, gridY: 0, z: 0, row: 0, col: 3, layerIndex: 0, isBlocked: false },
    ];
    const tray: Tile[] = [
      { id: 'tr1', type: 'lemon', gridX: 0, gridY: 1, z: 0, row: 1, col: 0, layerIndex: 0, isBlocked: false },
      { id: 'tr2', type: 'lemon', gridX: 1, gridY: 1, z: 0, row: 1, col: 1, layerIndex: 0, isBlocked: false },
    ];

    const hintWithTray = findHintMatch(board, tray, 7);
    expect(hintWithTray).not.toBeNull();
    expect(hintWithTray!.length).toBe(1);
    expect(hintWithTray![0].id).toBe('b1');

    const hintEmptyTray = findHintMatch(board, [], 7);
    expect(hintEmptyTray).not.toBeNull();
    expect(hintEmptyTray!.length).toBe(3);
    expect(hintEmptyTray!.every(t => t.type === 'strawberry')).toBe(true);
  });
});

describe('Power-Ups (powerUps)', () => {
  test('performUndo restaura la última ficha de la bandeja al tablero y recalcula bloqueo', () => {
    const movedTile: Tile = {
      id: 't-top',
      type: 'cherry',
      gridX: 1,
      gridY: 1,
      z: 1,
      row: 1,
      col: 1,
      layerIndex: 1,
      isBlocked: false,
    };
    const lowerTile: Tile = {
      id: 't-lower',
      type: 'apple',
      gridX: 1,
      gridY: 1,
      z: 0,
      row: 1,
      col: 1,
      layerIndex: 0,
      isBlocked: false,
    };

    const history: MoveRecord[] = [
      {
        tile: movedTile,
        originalGridX: 1,
        originalGridY: 1,
        originalZ: 1,
        originalRow: 1,
        originalCol: 1,
        originalLayerIndex: 1,
      },
    ];

    const res = performUndo([lowerTile], [movedTile], history);
    expect(res).not.toBeNull();
    expect(res!.tray.length).toBe(0);
    expect(res!.moveHistory.length).toBe(0);
    expect(res!.boardTiles.length).toBe(2);
    expect(res!.boardTiles.find(t => t.id === 't-lower')!.isBlocked).toBe(true);
  });

  test('createInitialPowerUpState otorga más ayudas en niveles avanzados (>= 30)', () => {
    const early = createInitialPowerUpState(1);
    const high = createInitialPowerUpState(35);
    expect(high.undoCount).toBeGreaterThan(early.undoCount);
    expect(high.shuffleCount).toBeGreaterThan(early.shuffleCount);
  });
});

describe('Seguridad: Códigos de 1 Uso y Economía Verificada (P0-1, P0-2, P1-2)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('isValidSingleUseRecoveryCode rechaza apodos y UIDs crudos, aceptando solo formato FC3D-XXXX-XXXX (P0-1)', () => {
    const generated = generateRecoveryCodeFormat();
    expect(isValidSingleUseRecoveryCode(generated)).toBe(true);
    expect(isValidSingleUseRecoveryCode('JugadorPro123')).toBe(false);
    expect(isValidSingleUseRecoveryCode('9xK7aP2mQ8vL4nR6tY1wZ3bC5dF8')).toBe(false);
  });

  test('restoreProfileByNicknameOrId bloquea restauración por apodo o UID de otra persona (P0-1)', async () => {
    const fb = useFirebase();
    const resNick = await fb.restoreProfileByNicknameOrId('Cecilia');
    expect(resNick.success).toBe(false);

    const resRawUid = await fb.restoreProfileByNicknameOrId('9xK7aP2mQ8vL4nR6tY1wZ3bC5dF8');
    expect(resRawUid.success).toBe(false);
  });

  test('recordVerifiedLevelWin otorga +10 monedas en la primera victoria y 0 al rejugar niveles pasados (P0-2 / P1-2)', async () => {
    const fb = useFirebase();
    fb.userUid.value = '';
    fb.userCurrentLevel.value = 1;
    fb.userCoins.value = 0;

    // Primera victoria del nivel 1 -> +10 monedas y avanza a nivel 2
    const firstWin = await fb.recordVerifiedLevelWin(1, 450);
    expect(firstWin.coinsGranted).toBe(10);
    expect(fb.userCoins.value).toBe(10);
    expect(fb.userCurrentLevel.value).toBe(2);

    // Rejugar el nivel 1 desde el mapa -> 0 monedas (sin granja de monedas)
    const replayWin = await fb.recordVerifiedLevelWin(1, 500);
    expect(replayWin.coinsGranted).toBe(0);
    expect(fb.userCoins.value).toBe(10);
    expect(fb.userCurrentLevel.value).toBe(2);
  });
});

describe('Deadlock de Bandeja y Estado de Juego (useGameState)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('detecta derrota (deadlock) cuando la bandeja llega a 7 fichas sin formar trío', () => {
    const game = useGameState();
    const types = ['strawberry', 'lemon', 'grapes', 'watermelon', 'cherry', 'peach', 'mango'];

    game.boardTiles.value = types.map((type, idx) => ({
      id: `test-${idx}`,
      type,
      gridX: idx,
      gridY: 0,
      z: 0,
      row: 0,
      col: idx,
      layerIndex: 0,
      isBlocked: false,
    }));
    game.tray.value = [];
    game.gameStatus.value = 'playing';

    for (const tile of [...game.boardTiles.value]) {
      game.selectTile(tile);
    }

    expect(game.tray.value.length).toBe(7);
    expect(game.gameStatus.value).toBe('lost');
  });

  test('persiste y restaura el tablero a medio nivel (P2-3)', async () => {
    const game = useGameState();
    game.level.value = 4;
    game.score.value = 300;
    game.generateBoard();

    const firstUnblocked = game.boardTiles.value.find(t => !t.isBlocked)!;
    game.selectTile(firstUnblocked);
    expect(game.tray.value.length).toBe(1);

    const newSession = useGameState();
    const restored = await newSession.restoreMidLevelState(4);
    expect(restored).toBe(true);
    expect(newSession.level.value).toBe(4);
    expect(newSession.score.value).toBe(300);
    expect(newSession.tray.value.length).toBe(1);
  });

  test('muestra intro de nivel 1.5s con mundo e icono y permite cerrarla (#3)', () => {
    const game = useGameState();
    game.level.value = 12;
    game.generateBoard(true);

    expect(game.levelIntroBanner.value).not.toBeNull();
    expect(game.levelIntroBanner.value?.level).toBe(12);
    expect(game.levelIntroBanner.value?.worldName).toContain('Valle Dulce');

    game.dismissLevelIntro();
    expect(game.levelIntroBanner.value).toBeNull();
  });

  test('marca las 3 fichas en matchingTileIds para el Match Pop antes de filtrarlas (#5)', () => {
    const game = useGameState();
    game.boardTiles.value = [
      { id: 'm1', type: 'strawberry', gridX: 0, gridY: 0, z: 0, row: 0, col: 0, layerIndex: 0, isBlocked: false },
      { id: 'm2', type: 'strawberry', gridX: 1, gridY: 0, z: 0, row: 0, col: 1, layerIndex: 0, isBlocked: false },
      { id: 'm3', type: 'strawberry', gridX: 2, gridY: 0, z: 0, row: 0, col: 2, layerIndex: 0, isBlocked: false },
      { id: 'm4', type: 'lemon', gridX: 3, gridY: 0, z: 0, row: 0, col: 3, layerIndex: 0, isBlocked: false },
    ];
    game.tray.value = [];
    game.gameStatus.value = 'playing';

    game.selectTile(game.boardTiles.value[0]);
    game.selectTile(game.boardTiles.value[0]);
    game.selectTile(game.boardTiles.value[0]);

    // Durante los 260ms del Match Pop, las 3 fichas están en la bandeja y marcadas en matchingTileIds
    expect(game.tray.value.length).toBe(3);
    expect(game.matchingTileIds.value.has('m1')).toBe(true);
    expect(game.matchingTileIds.value.has('m2')).toBe(true);
    expect(game.matchingTileIds.value.has('m3')).toBe(true);
  });
});
