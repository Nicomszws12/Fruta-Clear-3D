/**
 * Firebase composable — singleton authentication, user profile, persistence,
 * Cloud Functions verified economy (verifyLevelWin, claimDailyMission, purchaseShopItem),
 * single-use recovery codes (FC3D-XXXX-XXXX) + Google Auth linking,
 * global leaderboard queries (with real rank beyond top 50), cosmetics inventory,
 * and offline-first dual-storage sync (LocalStorage + Capacitor Preferences + Cloud Firestore).
 */
import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import {
  db,
  auth,
  functions,
  httpsCallable,
  signInAnonymously,
  googleProvider,
  linkWithPopup,
  signInWithPopup,
} from '../firebase';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
  serverTimestamp,
  arrayUnion,
  increment,
  where,
  runTransaction,
} from 'firebase/firestore';
import type { LeaderboardUser, ShopItemType } from '../game/types';

// ─── Single-Use Recovery Code Helpers (P0-1) ───────────────────
const RECOVERY_CODE_REGEX = /^FC3D-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const RECOVERY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function isValidSingleUseRecoveryCode(input: string): boolean {
  if (!input) return false;
  return RECOVERY_CODE_REGEX.test(input.trim().toUpperCase());
}

export function generateRecoveryCodeFormat(): string {
  const block = () =>
    Array.from(
      { length: 4 },
      () => RECOVERY_ALPHABET[Math.floor(Math.random() * RECOVERY_ALPHABET.length)],
    ).join('');
  return `FC3D-${block()}-${block()}`;
}

// ─── Local Storage + Capacitor Preferences Cache ───────────────
const LOCAL_STORAGE_KEY = 'tileclear_player_save_v1';

export interface LocalPlayerData {
  uid?: string;
  username: string;
  highScore: number;
  currentLevel: number;
  coins: number;
  activeSkin: string;
  activeBackground: string;
  unlockedSkins: string[];
  unlockedBackgrounds: string[];
  tutorialCompleted?: boolean;
  isGoogleLinked?: boolean;
  lastRecoveryCode?: string;
  updatedAt?: number;
}

export function getLocalSave(): LocalPlayerData | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading local save:', e);
    return null;
  }
}

export function setLocalSave(data: Partial<LocalPlayerData>) {
  try {
    const existing = getLocalSave() || {
      username: 'Jugador',
      highScore: 0,
      currentLevel: 1,
      coins: 0,
      activeSkin: 'default_fruits',
      activeBackground: 'default_blue',
      unlockedSkins: ['default_fruits'],
      unlockedBackgrounds: ['default_blue'],
      tutorialCompleted: false,
      isGoogleLinked: false,
    };
    const merged: LocalPlayerData = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(merged);
    localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    Preferences.set({ key: LOCAL_STORAGE_KEY, value: serialized }).catch(() => {});
  } catch (e) {
    console.warn('Error writing local save:', e);
  }
}

// ─── Module-Scope Singleton State ──────────────────────────────
const initialLocal = getLocalSave();

const username = ref(initialLocal?.username || 'Jugador');
const userUid = ref(initialLocal?.uid || '');
const userHighScore = ref(initialLocal?.highScore || 0);
const userCurrentLevel = ref(initialLocal?.currentLevel || 1);

// Coins & Cosmetics
const userCoins = ref(initialLocal?.coins || 0);
const activeSkin = ref(initialLocal?.activeSkin || 'default_fruits');
const activeBackground = ref(initialLocal?.activeBackground || 'default_blue');
const unlockedSkins = ref<string[]>(initialLocal?.unlockedSkins || ['default_fruits']);
const unlockedBackgrounds = ref<string[]>(initialLocal?.unlockedBackgrounds || ['default_blue']);
const tutorialCompleted = ref<boolean>(Boolean(initialLocal?.tutorialCompleted));
const isGoogleLinked = ref<boolean>(Boolean(initialLocal?.isGoogleLinked));
const activeRecoveryCode = ref<string>(initialLocal?.lastRecoveryCode || '');

// Leaderboard state
const leaderboardList = ref<LeaderboardUser[]>([]);
const userRank = ref<number | null>(null);
const isLeaderboardLoading = ref(false);

/**
 * Hydrate from Capacitor Native Preferences if localStorage was cleared by OS WebView
 */
async function hydrateFromNativePreferences(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: LOCAL_STORAGE_KEY });
    if (!value) return;
    const nativeData = JSON.parse(value) as LocalPlayerData;
    const localData = getLocalSave();
    if (!localData || (nativeData.currentLevel || 1) > (localData.currentLevel || 1)) {
      localStorage.setItem(LOCAL_STORAGE_KEY, value);
      username.value = nativeData.username || username.value;
      userUid.value = nativeData.uid || userUid.value;
      userHighScore.value = Math.max(userHighScore.value, nativeData.highScore || 0);
      userCurrentLevel.value = Math.max(userCurrentLevel.value, nativeData.currentLevel || 1);
      userCoins.value = Math.max(userCoins.value, nativeData.coins || 0);
      activeSkin.value = nativeData.activeSkin || activeSkin.value;
      activeBackground.value = nativeData.activeBackground || activeBackground.value;
      if (Array.isArray(nativeData.unlockedSkins)) {
        unlockedSkins.value = Array.from(new Set([...unlockedSkins.value, ...nativeData.unlockedSkins]));
      }
      if (Array.isArray(nativeData.unlockedBackgrounds)) {
        unlockedBackgrounds.value = Array.from(new Set([...unlockedBackgrounds.value, ...nativeData.unlockedBackgrounds]));
      }
      if (nativeData.tutorialCompleted) {
        tutorialCompleted.value = true;
      }
      if (nativeData.isGoogleLinked) {
        isGoogleLinked.value = true;
      }
      if (nativeData.lastRecoveryCode) {
        activeRecoveryCode.value = nativeData.lastRecoveryCode;
      }
    }
  } catch {
    // Ignore in environments without Capacitor Preferences
  }
}

export function useFirebase() {
  const ensureAuthReady = async () => {
    if (typeof (auth as any).authStateReady === 'function') {
      try {
        await (auth as any).authStateReady();
      } catch (err) {
        console.warn('authStateReady error:', err);
      }
    }
  };

  /**
   * Sign in anonymously or re-use existing session, then load or create profile.
   */
  const authenticateAndLoadProfile = async (): Promise<{
    isNewUser: boolean;
    savedScore: number;
    savedLevel: number;
  } | null> => {
    try {
      await hydrateFromNativePreferences();
      await ensureAuthReady();

      let currentUser = auth.currentUser;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }
      userUid.value = currentUser.uid;
      isGoogleLinked.value = currentUser.providerData.some(p => p.providerId === 'google.com');

      setLocalSave({ uid: userUid.value, isGoogleLinked: isGoogleLinked.value });

      const userRef = doc(db, 'users', userUid.value);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        const cloudScore = typeof data.highScore === 'number' ? data.highScore : 0;
        const cloudLevel = typeof data.currentLevel === 'number' ? data.currentLevel : 1;
        const cloudCoins = typeof data.coins === 'number' ? data.coins : 0;

        const bestScore = Math.max(userHighScore.value, cloudScore);
        const bestLevel = Math.max(userCurrentLevel.value, cloudLevel);
        const bestCoins = Math.max(userCoins.value, cloudCoins);

        userHighScore.value = bestScore;
        userCurrentLevel.value = bestLevel;
        userCoins.value = bestCoins;
        username.value = data.username || username.value || 'Jugador';

        activeSkin.value = data.activeSkin || activeSkin.value || 'default_fruits';
        activeBackground.value = data.activeBackground || activeBackground.value || 'default_blue';

        const mergedSkins = Array.from(
          new Set([
            ...(Array.isArray(data.unlockedSkins) ? data.unlockedSkins : ['default_fruits']),
            ...unlockedSkins.value,
          ]),
        );
        const mergedBgs = Array.from(
          new Set([
            ...(Array.isArray(data.unlockedBackgrounds) ? data.unlockedBackgrounds : ['default_blue']),
            ...unlockedBackgrounds.value,
          ]),
        );

        unlockedSkins.value = mergedSkins;
        unlockedBackgrounds.value = mergedBgs;
        tutorialCompleted.value = true;

        setLocalSave({
          uid: userUid.value,
          username: username.value,
          highScore: bestScore,
          currentLevel: bestLevel,
          coins: bestCoins,
          activeSkin: activeSkin.value,
          activeBackground: activeBackground.value,
          unlockedSkins: mergedSkins,
          unlockedBackgrounds: mergedBgs,
          tutorialCompleted: true,
          isGoogleLinked: isGoogleLinked.value,
        });

        return {
          isNewUser: false,
          savedScore: userHighScore.value,
          savedLevel: userCurrentLevel.value,
        };
      }

      if (userCurrentLevel.value > 1 || userCoins.value > 0) {
        return {
          isNewUser: false,
          savedScore: userHighScore.value,
          savedLevel: userCurrentLevel.value,
        };
      }

      return {
        isNewUser: true,
        savedScore: 0,
        savedLevel: 1,
      };
    } catch (error) {
      console.error('Error conectando a Firebase:', error);
      const fallbackLocal = getLocalSave();
      if (fallbackLocal && fallbackLocal.currentLevel > 1) {
        return {
          isNewUser: false,
          savedScore: fallbackLocal.highScore || 0,
          savedLevel: fallbackLocal.currentLevel || 1,
        };
      }
      return null;
    }
  };

  /**
   * Called by UI after collecting nickname for a brand-new player.
   * Starts with strict initial economy (level 1, 0 coins, 0 highScore) enforced by Firestore rules.
   */
  const registerNewUser = async (name: string) => {
    const cleanName = name.trim().slice(0, 30) || 'Jugador';
    username.value = cleanName;

    setLocalSave({
      username: cleanName,
    });

    if (!userUid.value) return;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(
        userRef,
        {
          username: cleanName,
          highScore: 0,
          currentLevel: 1,
          coins: 0,
          activeSkin: activeSkin.value || 'default_fruits',
          activeBackground: activeBackground.value || 'default_blue',
          unlockedSkins: unlockedSkins.value || ['default_fruits'],
          unlockedBackgrounds: unlockedBackgrounds.value || ['default_blue'],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.error('Error guardando usuario:', err);
    }
  };

  const markTutorialCompleted = () => {
    tutorialCompleted.value = true;
    setLocalSave({ tutorialCompleted: true });
  };

  /**
   * P0-2: Server-verified level victory via Cloud Function `verifyLevelWin`.
   * Awards +10 coins ONLY on the first completion of `wonLevel >= userCurrentLevel`,
   * updates `userCurrentLevel` and `userHighScore`, and writes to `/leaderboard/{uid}`.
   * Falls back to a single strict +1 level / +10 coins Firestore transaction if offline.
   */
  const recordVerifiedLevelWin = async (
    wonLevel: number,
    sessionScore: number,
  ): Promise<{ coinsGranted: number; nextLevel: number }> => {
    const isFirstWin = wonLevel >= userCurrentLevel.value;
    const coinsToGrant = isFirstWin ? 10 : 0;
    const nextUnlockedLevel = isFirstWin ? userCurrentLevel.value + 1 : userCurrentLevel.value;
    const boundedHighScore = Math.max(
      userHighScore.value,
      Math.min(sessionScore, userHighScore.value + 15000),
    );

    userCurrentLevel.value = nextUnlockedLevel;
    userHighScore.value = boundedHighScore;
    userCoins.value += coinsToGrant;

    setLocalSave({
      highScore: userHighScore.value,
      currentLevel: userCurrentLevel.value,
      coins: userCoins.value,
      username: username.value,
      activeSkin: activeSkin.value,
      activeBackground: activeBackground.value,
      unlockedSkins: unlockedSkins.value,
      unlockedBackgrounds: unlockedBackgrounds.value,
    });

    if (!userUid.value) {
      return { coinsGranted: coinsToGrant, nextLevel: nextUnlockedLevel };
    }

    // 1. Primary path: Authoritative Cloud Function
    try {
      const verifyFn = httpsCallable<
        { level: number; score: number },
        { success: boolean; coinsGranted: number; currentLevel: number; highScore: number; coins: number }
      >(functions, 'verifyLevelWin');
      const response = await verifyFn({ level: wonLevel, score: sessionScore });
      if (response.data?.success) {
        userCurrentLevel.value = response.data.currentLevel;
        userHighScore.value = response.data.highScore;
        userCoins.value = response.data.coins;
        setLocalSave({
          highScore: userHighScore.value,
          currentLevel: userCurrentLevel.value,
          coins: userCoins.value,
        });
        return {
          coinsGranted: response.data.coinsGranted,
          nextLevel: response.data.currentLevel,
        };
      }
    } catch {
      // Fallback to strict Firestore rule-validated update when Cloud Functions emulator/deployment is offline
    }

    // 2. Fallback path: Single atomic update respecting strict Firestore rules (+1 level, max +10 coins)
    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(
        userRef,
        {
          username: username.value,
          highScore: userHighScore.value,
          currentLevel: userCurrentLevel.value,
          coins: userCoins.value,
          activeSkin: activeSkin.value || 'default_fruits',
          activeBackground: activeBackground.value || 'default_blue',
          unlockedSkins: unlockedSkins.value || ['default_fruits'],
          unlockedBackgrounds: unlockedBackgrounds.value || ['default_blue'],
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('No se pudo sincronizar victoria en Firestore:', err);
    }

    return { coinsGranted: coinsToGrant, nextLevel: nextUnlockedLevel };
  };

  /**
   * Persist high score on game over without minting coins or advancing level.
   */
  const saveProgress = async (sessionScore: number, nextUnlockedLevel: number) => {
    if (sessionScore > userHighScore.value) {
      userHighScore.value = Math.min(sessionScore, userHighScore.value + 15000);
    }
    if (nextUnlockedLevel > userCurrentLevel.value) {
      userCurrentLevel.value = Math.min(nextUnlockedLevel, userCurrentLevel.value + 1);
    }

    setLocalSave({
      highScore: userHighScore.value,
      currentLevel: userCurrentLevel.value,
      coins: userCoins.value,
      username: username.value,
      activeSkin: activeSkin.value,
      activeBackground: activeBackground.value,
      unlockedSkins: unlockedSkins.value,
      unlockedBackgrounds: unlockedBackgrounds.value,
    });

    if (!userUid.value) return;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(
        userRef,
        {
          username: username.value,
          highScore: userHighScore.value,
          currentLevel: userCurrentLevel.value,
          coins: userCoins.value,
          activeSkin: activeSkin.value || 'default_fruits',
          activeBackground: activeBackground.value || 'default_blue',
          unlockedSkins: unlockedSkins.value || ['default_fruits'],
          unlockedBackgrounds: unlockedBackgrounds.value || ['default_blue'],
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('No se pudo actualizar progreso en Firestore:', err);
    }
  };

  /**
   * P0-2 / P3-2: Server-verified Daily Mission reward claim via Cloud Function `claimDailyMission`.
   */
  const claimVerifiedMissionReward = async (missionId: string, rewardCoins: number) => {
    const safeReward = Math.min(45, Math.max(0, Math.floor(rewardCoins)));
    if (safeReward <= 0) return;

    userCoins.value += safeReward;
    setLocalSave({ coins: userCoins.value });

    if (!userUid.value) return;

    // 1. Primary path: Cloud Function `claimDailyMission`
    try {
      const claimFn = httpsCallable<
        { missionId: string },
        { success: boolean; rewardCoins: number; coins: number }
      >(functions, 'claimDailyMission');
      const res = await claimFn({ missionId });
      if (res.data?.success) {
        userCoins.value = res.data.coins;
        setLocalSave({ coins: userCoins.value });
        return;
      }
    } catch {
      // Fallback to rule-checked mission claim
    }

    // 2. Fallback path: Rule-validated mission claim with `lastMissionClaimKey`
    try {
      const now = new Date();
      const dateKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
      const claimKey = `${dateKey}_${missionId}`;
      const userRef = doc(db, 'users', userUid.value);
      await updateDoc(userRef, {
        coins: increment(safeReward),
        lastMissionClaimKey: claimKey,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('No se pudo registrar recompensa de misión en Firestore:', err);
    }
  };

  /**
   * Spend coins on power-up packs or consumables (validated via Cloud Function `purchaseShopItem`).
   */
  const spendCoins = async (price: number, packId?: string): Promise<boolean> => {
    if (price <= 0 || userCoins.value < price) return false;

    userCoins.value -= price;
    setLocalSave({ coins: userCoins.value });

    if (!userUid.value) return true;

    if (packId) {
      try {
        const purchaseFn = httpsCallable<
          { itemId: string },
          { success: boolean; coins: number }
        >(functions, 'purchaseShopItem');
        const res = await purchaseFn({ itemId: packId });
        if (res.data?.success) {
          userCoins.value = res.data.coins;
          setLocalSave({ coins: userCoins.value });
          return true;
        }
      } catch {
        // Fallback to direct coin deduction
      }
    }

    try {
      const userRef = doc(db, 'users', userUid.value);
      await updateDoc(userRef, {
        coins: increment(-price),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.warn('No se pudo sincronizar gasto de monedas en Firestore:', err);
      return true;
    }
  };

  /**
   * Purchase a cosmetic item — validated via Cloud Function `purchaseShopItem` with Firestore fallback.
   */
  const purchaseItem = async (
    itemId: string,
    price: number,
    type: ShopItemType,
  ): Promise<boolean> => {
    if (userCoins.value < price) return false;

    const owned = type === 'skin' ? unlockedSkins.value : unlockedBackgrounds.value;
    if (owned.includes(itemId)) return false;

    userCoins.value -= price;
    if (type === 'skin') {
      unlockedSkins.value = [...unlockedSkins.value, itemId];
    } else {
      unlockedBackgrounds.value = [...unlockedBackgrounds.value, itemId];
    }

    setLocalSave({
      coins: userCoins.value,
      unlockedSkins: unlockedSkins.value,
      unlockedBackgrounds: unlockedBackgrounds.value,
    });

    if (!userUid.value) return true;

    try {
      const purchaseFn = httpsCallable<
        { itemId: string },
        { success: boolean; coins: number }
      >(functions, 'purchaseShopItem');
      const res = await purchaseFn({ itemId });
      if (res.data?.success) {
        userCoins.value = res.data.coins;
        setLocalSave({ coins: userCoins.value });
        return true;
      }
    } catch {
      // Fallback to rule-checked Firestore update
    }

    try {
      const userRef = doc(db, 'users', userUid.value);
      const fieldName = type === 'skin' ? 'unlockedSkins' : 'unlockedBackgrounds';
      await updateDoc(userRef, {
        coins: increment(-price),
        [fieldName]: arrayUnion(itemId),
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      userCoins.value += price;
      if (type === 'skin') {
        unlockedSkins.value = unlockedSkins.value.filter(id => id !== itemId);
      } else {
        unlockedBackgrounds.value = unlockedBackgrounds.value.filter(id => id !== itemId);
      }
      setLocalSave({
        coins: userCoins.value,
        unlockedSkins: unlockedSkins.value,
        unlockedBackgrounds: unlockedBackgrounds.value,
      });
      console.error('Error comprando ítem:', err);
      return false;
    }
  };

  /**
   * Equip a cosmetic item (must already be owned).
   */
  const equipItem = async (
    itemId: string,
    type: ShopItemType,
  ): Promise<boolean> => {
    const owned = type === 'skin' ? unlockedSkins.value : unlockedBackgrounds.value;
    if (!owned.includes(itemId)) return false;

    if (type === 'skin') {
      activeSkin.value = itemId;
    } else {
      activeBackground.value = itemId;
    }

    setLocalSave({
      activeSkin: activeSkin.value,
      activeBackground: activeBackground.value,
    });

    if (!userUid.value) return true;

    try {
      const userRef = doc(db, 'users', userUid.value);
      const fieldName = type === 'skin' ? 'activeSkin' : 'activeBackground';
      await updateDoc(userRef, {
        [fieldName]: itemId,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('Error equipando ítem:', err);
      return false;
    }
  };

  /**
   * Update player's nickname.
   */
  const updateUsername = async (newName: string) => {
    const trimmed = newName.trim().slice(0, 30);
    if (!trimmed) return false;

    username.value = trimmed;
    setLocalSave({ username: trimmed });

    if (!userUid.value) return true;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await updateDoc(userRef, {
        username: trimmed,
        updatedAt: serverTimestamp(),
      });
      return true;
    } catch (err) {
      console.error('Error actualizando apodo:', err);
      return false;
    }
  };

  /**
   * Fetch top 50 players for the Global Leaderboard (reading from `/leaderboard` first,
   * falling back to `/users`), plus calculate exact rank outside Top 50 via server count().
   */
  const fetchLeaderboard = async () => {
    isLeaderboardLoading.value = true;
    try {
      let sourceCol = collection(db, 'leaderboard');
      let q = query(sourceCol, orderBy('highScore', 'desc'), limit(50));
      let snap = await getDocs(q);

      if (snap.empty) {
        sourceCol = collection(db, 'users');
        q = query(sourceCol, orderBy('highScore', 'desc'), limit(50));
        snap = await getDocs(q);
      }

      let rank = 1;
      let myRank: number | null = null;
      const list: LeaderboardUser[] = [];

      snap.forEach(docSnap => {
        const d = docSnap.data();
        const uid = docSnap.id;
        const entry: LeaderboardUser = {
          uid,
          username: d.username || 'Anónimo',
          highScore: d.highScore || 0,
          currentLevel: d.currentLevel || 1,
          rank,
        };
        list.push(entry);

        if (uid === userUid.value) {
          myRank = rank;
        }
        rank++;
      });

      if (myRank === null && userHighScore.value > 0) {
        try {
          const higherQuery = query(sourceCol, where('highScore', '>', userHighScore.value));
          const countSnap = await getCountFromServer(higherQuery);
          myRank = countSnap.data().count + 1;
        } catch {
          // Fallback if index/network unavailable
        }
      }

      leaderboardList.value = list;
      userRank.value = myRank;
    } catch (err) {
      console.error('Error cargando clasificación:', err);
    } finally {
      isLeaderboardLoading.value = false;
    }
  };

  /**
   * P0-1: Link anonymous account with Google Auth so progress is permanently bound
   * to the player's Google identity without needing a recovery code.
   */
  const linkGoogleAccount = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const current = auth.currentUser;
      const cred = current
        ? await linkWithPopup(current, googleProvider)
        : await signInWithPopup(auth, googleProvider);

      userUid.value = cred.user.uid;
      isGoogleLinked.value = true;
      if (cred.user.displayName && username.value === 'Jugador') {
        username.value = cred.user.displayName.slice(0, 30);
      }
      setLocalSave({
        uid: userUid.value,
        username: username.value,
        isGoogleLinked: true,
      });

      return {
        success: true,
        message: `¡Cuenta vinculada con Google (${cred.user.email || username.value})!`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: `No se pudo vincular con Google: ${err?.message || 'Operación cancelada'}`,
      };
    }
  };

  /**
   * P0-1: Generate a Single-Use Recovery Code (`FC3D-XXXX-XXXX`).
   * Unlike a raw UID, this token can only be redeemed ONCE (`used: false -> true`).
   */
  const generateSingleUseRecoveryCode = async (): Promise<{
    success: boolean;
    code?: string;
    message: string;
  }> => {
    if (!userUid.value) {
      return {
        success: false,
        message: 'Debes estar conectado para generar un código de recuperación de un solo uso.',
      };
    }

    // 1. Primary path: Cloud Function `createRecoveryCode`
    try {
      const createFn = httpsCallable<void, { success: boolean; code: string }>(
        functions,
        'createRecoveryCode',
      );
      const res = await createFn();
      if (res.data?.success && res.data.code) {
        activeRecoveryCode.value = res.data.code;
        setLocalSave({ lastRecoveryCode: res.data.code });
        return {
          success: true,
          code: res.data.code,
          message: 'Código de recuperación de un solo uso generado.',
        };
      }
    } catch {
      // Fallback to rule-checked `/recoveryCodes/{code}` creation
    }

    // 2. Fallback path: Create single-use document in `/recoveryCodes/{code}`
    const code = generateRecoveryCodeFormat();
    try {
      await setDoc(doc(db, 'recoveryCodes', code), {
        code,
        ownerUid: userUid.value,
        used: false,
        snapshot: {
          username: username.value || 'Jugador',
          currentLevel: userCurrentLevel.value || 1,
          highScore: userHighScore.value || 0,
          coins: userCoins.value || 0,
          activeSkin: activeSkin.value || 'default_fruits',
          activeBackground: activeBackground.value || 'default_blue',
          unlockedSkins: unlockedSkins.value || ['default_fruits'],
          unlockedBackgrounds: unlockedBackgrounds.value || ['default_blue'],
        },
        createdAt: serverTimestamp(),
      });

      activeRecoveryCode.value = code;
      setLocalSave({ lastRecoveryCode: code });
      return {
        success: true,
        code,
        message: 'Código de recuperación de 1 uso generado y activado.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `No se pudo generar el código: ${err?.message || err}`,
      };
    }
  };

  /**
   * P0-1 Security Fix: Restore a player's progress ONLY via a Single-Use Recovery Code
   * (`FC3D-XXXX-XXXX`). Rejects both public nicknames AND raw Firebase UIDs.
   * Atomically marks `used: true` on the recovery code and writes the restored profile
   * to both local storage and the current user's Firestore document (`/users/{userUid}`).
   */
  const restoreProfileByNicknameOrId = async (rawCode: string): Promise<{
    success: boolean;
    restoredLevel?: number;
    restoredCoins?: number;
    restoredScore?: number;
    username?: string;
    message: string;
  }> => {
    const cleanCode = rawCode.trim().toUpperCase();
    if (!isValidSingleUseRecoveryCode(cleanCode)) {
      return {
        success: false,
        message:
          'Código inválido. Por seguridad solo se aceptan Códigos de Recuperación de 1 solo uso con formato FC3D-XXXX-XXXX (generados en Ajustes).',
      };
    }

    // 1. Primary path: Cloud Function `redeemRecoveryCode`
    try {
      const redeemFn = httpsCallable<
        { code: string },
        {
          success: boolean;
          profile: {
            username: string;
            currentLevel: number;
            highScore: number;
            coins: number;
            activeSkin: string;
            activeBackground: string;
            unlockedSkins: string[];
            unlockedBackgrounds: string[];
          };
        }
      >(functions, 'redeemRecoveryCode');
      const res = await redeemFn({ code: cleanCode });
      if (res.data?.success && res.data.profile) {
        const p = res.data.profile;
        userCurrentLevel.value = p.currentLevel;
        userHighScore.value = p.highScore;
        userCoins.value = p.coins;
        username.value = p.username;
        activeSkin.value = p.activeSkin;
        activeBackground.value = p.activeBackground;
        unlockedSkins.value = p.unlockedSkins;
        unlockedBackgrounds.value = p.unlockedBackgrounds;

        setLocalSave({
          uid: userUid.value,
          username: p.username,
          highScore: p.highScore,
          currentLevel: p.currentLevel,
          coins: p.coins,
          activeSkin: p.activeSkin,
          activeBackground: p.activeBackground,
          unlockedSkins: p.unlockedSkins,
          unlockedBackgrounds: p.unlockedBackgrounds,
          lastRecoveryCode: '',
        });
        activeRecoveryCode.value = '';

        return {
          success: true,
          restoredLevel: p.currentLevel,
          restoredCoins: p.coins,
          restoredScore: p.highScore,
          username: p.username,
          message: `¡Código de 1 uso canjeado! Partida de ${p.username} (Nivel ${p.currentLevel}) restaurada y sincronizada en la nube.`,
        };
      }
    } catch {
      // Fallback to client Firestore transaction if Cloud Function is not reachable
    }

    // 2. Fallback path: Atomic Firestore transaction marking `used: true` and writing to `/users/{userUid}`
    try {
      const codeRef = doc(db, 'recoveryCodes', cleanCode);

      const snapshotData = await runTransaction(db, async tx => {
        const codeSnap = await tx.get(codeRef);
        if (!codeSnap.exists()) {
          throw new Error('No existe ningún código de recuperación activo con ese identificador.');
        }

        const data = codeSnap.data();
        if (data.used === true) {
          throw new Error('Este código de recuperación de un solo uso ya fue utilizado anteriormente.');
        }

        const snap = data.snapshot || {};
        const restoredProfile = {
          username: snap.username || 'Jugador',
          currentLevel: typeof snap.currentLevel === 'number' ? snap.currentLevel : 1,
          highScore: typeof snap.highScore === 'number' ? snap.highScore : 0,
          coins: typeof snap.coins === 'number' ? snap.coins : 0,
          activeSkin: snap.activeSkin || 'default_fruits',
          activeBackground: snap.activeBackground || 'default_blue',
          unlockedSkins: Array.isArray(snap.unlockedSkins) ? snap.unlockedSkins : ['default_fruits'],
          unlockedBackgrounds: Array.isArray(snap.unlockedBackgrounds)
            ? snap.unlockedBackgrounds
            : ['default_blue'],
        };

        tx.update(codeRef, {
          used: true,
          redeemedBy: userUid.value,
          redeemedAt: serverTimestamp(),
        });

        if (userUid.value) {
          const targetUserRef = doc(db, 'users', userUid.value);
          tx.set(
            targetUserRef,
            {
              ...restoredProfile,
              restoredFromCode: cleanCode,
              updatedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true },
          );
        }

        return restoredProfile;
      });

      userCurrentLevel.value = snapshotData.currentLevel;
      userHighScore.value = snapshotData.highScore;
      userCoins.value = snapshotData.coins;
      username.value = snapshotData.username;
      activeSkin.value = snapshotData.activeSkin;
      activeBackground.value = snapshotData.activeBackground;
      unlockedSkins.value = snapshotData.unlockedSkins;
      unlockedBackgrounds.value = snapshotData.unlockedBackgrounds;
      activeRecoveryCode.value = '';

      setLocalSave({
        uid: userUid.value,
        username: snapshotData.username,
        highScore: snapshotData.highScore,
        currentLevel: snapshotData.currentLevel,
        coins: snapshotData.coins,
        activeSkin: snapshotData.activeSkin,
        activeBackground: snapshotData.activeBackground,
        unlockedSkins: snapshotData.unlockedSkins,
        unlockedBackgrounds: snapshotData.unlockedBackgrounds,
        lastRecoveryCode: '',
      });

      return {
        success: true,
        restoredLevel: snapshotData.currentLevel,
        restoredCoins: snapshotData.coins,
        restoredScore: snapshotData.highScore,
        username: snapshotData.username,
        message: `¡Código de 1 uso canjeado! Partida de ${snapshotData.username} (Nivel ${snapshotData.currentLevel}) restaurada y sincronizada en Firestore.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Error al canjear el código de recuperación de un solo uso.',
      };
    }
  };

  return {
    username,
    userUid,
    userHighScore,
    userCurrentLevel,
    leaderboardList,
    userRank,
    isLeaderboardLoading,
    tutorialCompleted,
    isGoogleLinked,
    activeRecoveryCode,

    // Coins & Cosmetics
    userCoins,
    activeSkin,
    activeBackground,
    unlockedSkins,
    unlockedBackgrounds,

    // Local Storage Helpers
    getLocalSave,
    setLocalSave,

    // Actions
    authenticateAndLoadProfile,
    registerNewUser,
    markTutorialCompleted,
    recordVerifiedLevelWin,
    saveProgress,
    claimVerifiedMissionReward,
    updateUsername,
    fetchLeaderboard,
    spendCoins,
    purchaseItem,
    equipItem,
    linkGoogleAccount,
    generateSingleUseRecoveryCode,
    restoreProfileByNicknameOrId,
  };
}
