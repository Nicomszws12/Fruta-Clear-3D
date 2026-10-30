import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();
const db = admin.firestore();

// Server-authoritative catalog prices to prevent client-side price manipulation
const SERVER_SHOP_PRICES: Record<string, { type: 'skin' | 'background' | 'pack'; price: number }> = {
  default_fruits: { type: 'skin', price: 0 },
  sweet_candies: { type: 'skin', price: 50 },
  magic_gems: { type: 'skin', price: 100 },
  veggie_harvest: { type: 'skin', price: 150 },
  breakfast_delight: { type: 'skin', price: 200 },
  sushi_master: { type: 'skin', price: 300 },
  default_blue: { type: 'background', price: 0 },
  sunset_peach: { type: 'background', price: 40 },
  emerald_mint: { type: 'background', price: 80 },
  lavender_dream: { type: 'background', price: 120 },
  golden_hour: { type: 'background', price: 180 },
  midnight_galaxy: { type: 'background', price: 250 },
  pack_undo_3: { type: 'pack', price: 25 },
  pack_shuffle_2: { type: 'pack', price: 30 },
  pack_wand_2: { type: 'pack', price: 40 },
  pack_combo_super: { type: 'pack', price: 80 },
};

// Server-authoritative daily mission rewards
const SERVER_DAILY_MISSIONS: Record<string, number> = {
  levels_won: 25,
  combos: 20,
  tiles_cleared: 15,
  clear_tiles_45: 25,
  triple_matches_8: 30,
  win_levels_2: 45,
};

const COINS_PER_FIRST_LEVEL_WIN = 10;

/**
 * P0-2: Server-verified level victory.
 * Awards +10 coins ONLY on the first completion of `level >= currentLevel`,
 * updates `currentLevel` and `highScore`, and writes to the server-controlled `/leaderboard/{uid}`.
 */
export const verifyLevelWin = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Debes iniciar sesión para registrar una victoria.');
  }

  const level = Number(request.data?.level || 1);
  const sessionScore = Number(request.data?.score || 0);

  if (!Number.isInteger(level) || level < 1 || level > 100000) {
    throw new HttpsError('invalid-argument', 'Nivel inválido.');
  }
  if (!Number.isFinite(sessionScore) || sessionScore < 0 || sessionScore > 50000) {
    throw new HttpsError('invalid-argument', 'Puntuación de sesión fuera de rango permitido.');
  }

  const userRef = db.collection('users').doc(uid);
  const leaderboardRef = db.collection('leaderboard').doc(uid);

  return db.runTransaction(async tx => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? snap.data() || {} : {};

    const prevLevel = typeof data.currentLevel === 'number' ? data.currentLevel : 1;
    const prevHigh = typeof data.highScore === 'number' ? data.highScore : 0;
    const prevCoins = typeof data.coins === 'number' ? data.coins : 0;
    const username = typeof data.username === 'string' ? data.username : 'Jugador';

    // Anti-cheat: cannot skip more than 1 level ahead of current unlocked level
    if (level > prevLevel + 1) {
      throw new HttpsError('permission-denied', 'No puedes completar un nivel bloqueado.');
    }

    const isFirstWin = level >= prevLevel;
    const coinsGranted = isFirstWin ? COINS_PER_FIRST_LEVEL_WIN : 0;
    const nextLevel = isFirstWin ? prevLevel + 1 : prevLevel;
    const nextHighScore = Math.max(prevHigh, Math.min(sessionScore, prevHigh + 50000));
    const nextCoins = prevCoins + coinsGranted;

    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.set(
      userRef,
      {
        username,
        currentLevel: nextLevel,
        highScore: nextHighScore,
        coins: nextCoins,
        updatedAt: now,
        ...(snap.exists ? {} : { createdAt: now }),
      },
      { merge: true },
    );

    // Server-only write to authoritative leaderboard collection
    tx.set(
      leaderboardRef,
      {
        uid,
        username,
        highScore: nextHighScore,
        currentLevel: nextLevel,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      success: true,
      coinsGranted,
      currentLevel: nextLevel,
      highScore: nextHighScore,
      coins: nextCoins,
    };
  });
});

/**
 * P0-2 / P3-2: Server-verified Daily Mission claim.
 * Ensures each mission can only be claimed once per UTC date and grants exact reward coins.
 */
export const claimDailyMission = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const missionId = String(request.data?.missionId || '');
  const rewardCoins = SERVER_DAILY_MISSIONS[missionId];
  if (!rewardCoins) {
    throw new HttpsError('invalid-argument', 'Misión diaria desconocida.');
  }

  const nowDate = new Date();
  const dateKey = `${nowDate.getUTCFullYear()}-${String(nowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(nowDate.getUTCDate()).padStart(2, '0')}`;

  const userRef = db.collection('users').doc(uid);
  const claimRef = db.collection('users').doc(uid).collection('missionClaims').doc(`${dateKey}_${missionId}`);

  return db.runTransaction(async tx => {
    const [userSnap, claimSnap] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);
    if (claimSnap.exists) {
      throw new HttpsError('already-exists', 'Esta misión diaria ya fue reclamada hoy.');
    }

    const userData = userSnap.exists ? userSnap.data() || {} : {};
    const prevCoins = typeof userData.coins === 'number' ? userData.coins : 0;
    const nextCoins = prevCoins + rewardCoins;
    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.set(claimRef, {
      missionId,
      dateKey,
      rewardCoins,
      claimedAt: now,
    });

    tx.set(
      userRef,
      {
        coins: nextCoins,
        updatedAt: now,
      },
      { merge: true },
    );

    return {
      success: true,
      rewardCoins,
      coins: nextCoins,
    };
  });
});

/**
 * P0-2: Server-verified shop purchase (skins, backgrounds, and power-up packs).
 */
export const purchaseShopItem = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const itemId = String(request.data?.itemId || '');
  const catalogEntry = SERVER_SHOP_PRICES[itemId];
  if (!catalogEntry) {
    throw new HttpsError('invalid-argument', 'Ítem de tienda no válido.');
  }

  const userRef = db.collection('users').doc(uid);

  return db.runTransaction(async tx => {
    const snap = await tx.get(userRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Perfil de usuario no encontrado.');
    }

    const data = snap.data() || {};
    const currentCoins = typeof data.coins === 'number' ? data.coins : 0;
    if (currentCoins < catalogEntry.price) {
      throw new HttpsError('failed-precondition', 'Monedas insuficientes.');
    }

    const nextCoins = currentCoins - catalogEntry.price;
    const updates: Record<string, unknown> = {
      coins: nextCoins,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (catalogEntry.type === 'skin') {
      const unlocked: string[] = Array.isArray(data.unlockedSkins) ? data.unlockedSkins : ['default_fruits'];
      if (unlocked.includes(itemId)) {
        throw new HttpsError('already-exists', 'Ya posees este diseño.');
      }
      updates.unlockedSkins = admin.firestore.FieldValue.arrayUnion(itemId);
    } else if (catalogEntry.type === 'background') {
      const unlocked: string[] = Array.isArray(data.unlockedBackgrounds) ? data.unlockedBackgrounds : ['default_blue'];
      if (unlocked.includes(itemId)) {
        throw new HttpsError('already-exists', 'Ya posees este fondo.');
      }
      updates.unlockedBackgrounds = admin.firestore.FieldValue.arrayUnion(itemId);
    }

    tx.update(userRef, updates);

    return {
      success: true,
      coins: nextCoins,
      itemId,
    };
  });
});

/**
 * P0-1: Generate a single-use recovery code (`FC3D-XXXX-XXXX`) for the authenticated owner.
 */
export const createRecoveryCode = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const userSnap = await db.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    throw new HttpsError('not-found', 'Primero debes tener un perfil guardado.');
  }

  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomBlock = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  const code = `FC3D-${randomBlock()}-${randomBlock()}`;

  const userData = userSnap.data() || {};
  await db.collection('recoveryCodes').doc(code).set({
    code,
    ownerUid: uid,
    used: false,
    snapshot: {
      username: userData.username || 'Jugador',
      currentLevel: userData.currentLevel || 1,
      highScore: userData.highScore || 0,
      coins: userData.coins || 0,
      activeSkin: userData.activeSkin || 'default_fruits',
      activeBackground: userData.activeBackground || 'default_blue',
      unlockedSkins: Array.isArray(userData.unlockedSkins) ? userData.unlockedSkins : ['default_fruits'],
      unlockedBackgrounds: Array.isArray(userData.unlockedBackgrounds)
        ? userData.unlockedBackgrounds
        : ['default_blue'],
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    code,
  };
});

/**
 * P0-1: Redeem a single-use recovery code (`FC3D-XXXX-XXXX`), atomically marking `used: true`
 * and writing the restored profile into the caller's `/users/{uid}` document.
 */
export const redeemRecoveryCode = onCall(async request => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Autenticación requerida.');
  }

  const rawCode = String(request.data?.code || '').trim().toUpperCase();
  if (!/^FC3D-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(rawCode)) {
    throw new HttpsError('invalid-argument', 'Formato de código de un solo uso inválido (Ej: FC3D-ABCD-1234).');
  }

  const codeRef = db.collection('recoveryCodes').doc(rawCode);
  const targetUserRef = db.collection('users').doc(uid);

  return db.runTransaction(async tx => {
    const codeSnap = await tx.get(codeRef);
    if (!codeSnap.exists) {
      throw new HttpsError('not-found', 'El código de recuperación no existe.');
    }

    const codeData = codeSnap.data() || {};
    if (codeData.used === true) {
      throw new HttpsError('failed-precondition', 'Este código de recuperación de un solo uso ya fue utilizado.');
    }

    const snap = codeData.snapshot || {};
    const now = admin.firestore.FieldValue.serverTimestamp();

    tx.update(codeRef, {
      used: true,
      redeemedBy: uid,
      redeemedAt: now,
    });

    const restoredProfile = {
      username: snap.username || 'Jugador',
      currentLevel: typeof snap.currentLevel === 'number' ? snap.currentLevel : 1,
      highScore: typeof snap.highScore === 'number' ? snap.highScore : 0,
      coins: typeof snap.coins === 'number' ? snap.coins : 0,
      activeSkin: snap.activeSkin || 'default_fruits',
      activeBackground: snap.activeBackground || 'default_blue',
      unlockedSkins: Array.isArray(snap.unlockedSkins) ? snap.unlockedSkins : ['default_fruits'],
      unlockedBackgrounds: Array.isArray(snap.unlockedBackgrounds) ? snap.unlockedBackgrounds : ['default_blue'],
      updatedAt: now,
      createdAt: now,
    };

    tx.set(targetUserRef, restoredProfile, { merge: true });

    return {
      success: true,
      profile: restoredProfile,
    };
  });
});
