/**
 * Firebase composable — singleton authentication, user profile, persistence,
 * global leaderboard queries (with real rank beyond top 50), cosmetics inventory,
 * and offline-first dual-storage sync (LocalStorage + Capacitor Preferences + Cloud Firestore).
 */
import { ref } from 'vue';
import { Preferences } from '@capacitor/preferences';
import { db, auth, signInAnonymously } from '../firebase';
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
} from 'firebase/firestore';
import type { LeaderboardUser, ShopItemType } from '../game/types';

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
    };
    const merged: LocalPlayerData = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    const serialized = JSON.stringify(merged);
    localStorage.setItem(LOCAL_STORAGE_KEY, serialized);
    // Async mirror to Capacitor Preferences for native process-kill durability
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
    }
  } catch {
    // Ignore in environments without Capacitor Preferences
  }
}

export function useFirebase() {
  /**
   * Helper to ensure auth persistence is ready before checking currentUser.
   */
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

      setLocalSave({ uid: userUid.value });

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
        });

        // Respect Firestore anti-cheat delta caps when syncing local progress back to cloud
        const missingCosmetics = !('activeSkin' in data) || !('unlockedSkins' in data);
        const safeCloudLevel = Math.min(bestLevel, cloudLevel + 5);
        const safeCloudScore = Math.min(bestScore, cloudScore + 50000);
        const safeCloudCoins = Math.min(bestCoins, cloudCoins + 250);
        const hasHigherLocal =
          safeCloudLevel > cloudLevel || safeCloudScore > cloudScore || safeCloudCoins > cloudCoins;

        if (missingCosmetics || hasHigherLocal) {
          try {
            await setDoc(
              userRef,
              {
                username: username.value,
                highScore: safeCloudScore,
                currentLevel: safeCloudLevel,
                coins: safeCloudCoins,
                activeSkin: activeSkin.value,
                activeBackground: activeBackground.value,
                unlockedSkins: mergedSkins,
                unlockedBackgrounds: mergedBgs,
                updatedAt: serverTimestamp(),
              },
              { merge: true },
            );
          } catch (healErr) {
            console.warn('No se pudo sincronizar reparación a Firestore:', healErr);
          }
        }

        return {
          isNewUser: false,
          savedScore: userHighScore.value,
          savedLevel: userCurrentLevel.value,
        };
      }

      // Document does NOT exist in Firestore: migrate bounded local progress if present
      if (userCurrentLevel.value > 1 || userCoins.value > 0) {
        await setDoc(userRef, {
          username: username.value || 'Jugador',
          highScore: Math.min(userHighScore.value, 500000),
          currentLevel: Math.min(userCurrentLevel.value, 500),
          coins: Math.min(userCoins.value, 2000),
          activeSkin: activeSkin.value,
          activeBackground: activeBackground.value,
          unlockedSkins: unlockedSkins.value,
          unlockedBackgrounds: unlockedBackgrounds.value,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

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
   * Called by UI after collecting nickname
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
          highScore: Math.min(userHighScore.value || 0, 500000),
          currentLevel: Math.min(userCurrentLevel.value || 1, 500),
          coins: Math.min(userCoins.value || 0, 2000),
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
   * Persist high score and current level to Firestore & LocalStorage.
   * Only increases highScore / currentLevel monotonically within economy bounds.
   */
  const saveProgress = async (sessionScore: number, nextUnlockedLevel: number) => {
    const prevHigh = userHighScore.value;
    const prevLevel = userCurrentLevel.value;

    if (sessionScore > userHighScore.value) {
      userHighScore.value = Math.min(sessionScore, prevHigh + 50000);
    }
    if (nextUnlockedLevel > userCurrentLevel.value) {
      userCurrentLevel.value = Math.min(nextUnlockedLevel, prevLevel + 5);
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
   * Add coins to the player's balance (capped per transaction by security rules).
   */
  const addCoins = async (amount: number) => {
    const safeAmount = Math.min(250, Math.floor(amount));
    if (safeAmount <= 0) return;

    userCoins.value += safeAmount;

    setLocalSave({
      coins: userCoins.value,
    });

    if (!userUid.value) return;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(
        userRef,
        {
          coins: increment(safeAmount),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (err) {
      console.warn('No se pudo agregar monedas:', err);
    }
  };

  /**
   * Spend coins on power-up packs or consumables.
   */
  const spendCoins = async (price: number): Promise<boolean> => {
    if (price <= 0 || userCoins.value < price) return false;

    userCoins.value -= price;
    setLocalSave({ coins: userCoins.value });

    if (!userUid.value) return true;

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
   * Purchase a cosmetic item — deducts coins and adds to inventory.
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
   * Fetch top 50 players for the Global Leaderboard, plus calculate exact
   * rank outside the Top 50 using Firestore server-side count aggregation.
   */
  const fetchLeaderboard = async () => {
    isLeaderboardLoading.value = true;
    try {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, orderBy('highScore', 'desc'), limit(50));
      const snap = await getDocs(q);

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

      // P3-2: If user is outside top 50, calculate exact rank via server count query
      if (myRank === null && userHighScore.value > 0) {
        try {
          const higherQuery = query(usersCol, where('highScore', '>', userHighScore.value));
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
   * P0-1 Security Fix: Restore a player's progress ONLY by their private
   * Recovery ID (exact Firebase Auth UID >= 20 chars).
   * Public nickname lookup is strictly disabled to prevent account/coin cloning.
   */
  const restoreProfileByNicknameOrId = async (targetUid: string): Promise<{
    success: boolean;
    restoredLevel?: number;
    restoredCoins?: number;
    restoredScore?: number;
    username?: string;
    message: string;
  }> => {
    const clean = targetUid.trim();
    if (!clean || clean.length < 20 || /\s/.test(clean)) {
      return {
        success: false,
        message:
          'Por seguridad, ya no se permite recuperar por apodo público. Ingresa tu Código de Recuperación privado (ID de 28 caracteres disponible en Ajustes).',
      };
    }

    try {
      const directDoc = await getDoc(doc(db, 'users', clean));
      if (!directDoc.exists()) {
        return {
          success: false,
          message: 'No se encontró ninguna cuenta asociada a ese Código de Recuperación.',
        };
      }

      const foundData = directDoc.data();
      const restoredLevel = typeof foundData.currentLevel === 'number' ? foundData.currentLevel : 1;
      const restoredScore = typeof foundData.highScore === 'number' ? foundData.highScore : 0;
      const restoredCoins = typeof foundData.coins === 'number' ? foundData.coins : 0;
      const restoredUsername = foundData.username || 'Jugador';
      const restoredSkin = foundData.activeSkin || 'default_fruits';
      const restoredBg = foundData.activeBackground || 'default_blue';
      const restoredSkins = Array.isArray(foundData.unlockedSkins) ? foundData.unlockedSkins : ['default_fruits'];
      const restoredBgs = Array.isArray(foundData.unlockedBackgrounds) ? foundData.unlockedBackgrounds : ['default_blue'];

      userCurrentLevel.value = restoredLevel;
      userHighScore.value = restoredScore;
      userCoins.value = restoredCoins;
      username.value = restoredUsername;
      activeSkin.value = restoredSkin;
      activeBackground.value = restoredBg;
      unlockedSkins.value = restoredSkins;
      unlockedBackgrounds.value = restoredBgs;

      setLocalSave({
        uid: userUid.value || directDoc.id,
        username: restoredUsername,
        highScore: restoredScore,
        currentLevel: restoredLevel,
        coins: restoredCoins,
        activeSkin: restoredSkin,
        activeBackground: restoredBg,
        unlockedSkins: restoredSkins,
        unlockedBackgrounds: restoredBgs,
      });

      return {
        success: true,
        restoredLevel,
        restoredCoins,
        restoredScore,
        username: restoredUsername,
        message: `¡Partida de ${restoredUsername} verificada y recuperada! Nivel ${restoredLevel} restaurado.`,
      };
    } catch (err: any) {
      console.error('Error restaurando partida:', err);
      return {
        success: false,
        message: `Error al verificar el código de recuperación: ${err.message || err}`,
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
    saveProgress,
    updateUsername,
    fetchLeaderboard,
    addCoins,
    spendCoins,
    purchaseItem,
    equipItem,
    restoreProfileByNicknameOrId,
  };
}
