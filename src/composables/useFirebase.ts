/**
 * Firebase composable — authentication, user profile, persistence,
 * global leaderboard queries, cosmetics inventory management,
 * and robust offline-first dual-storage sync (LocalStorage + Cloud Firestore).
 */
import { ref } from 'vue';
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
  serverTimestamp,
  arrayUnion,
  increment,
  where,
} from 'firebase/firestore';
import type { LeaderboardUser, ShopItemType } from '../game/types';

// ─── Local Storage Cache for Offline-First Durability ─────────
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
    };
    const merged: LocalPlayerData = {
      ...existing,
      ...data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
  } catch (e) {
    console.warn('Error writing local save:', e);
  }
}

export function useFirebase() {
  // Pre-load from local storage so UI renders immediate progress (never defaults to 1)
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

  // Leaderboard state
  const leaderboardList = ref<LeaderboardUser[]>([]);
  const userRank = ref<number | null>(null);
  const isLeaderboardLoading = ref(false);

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
      // 1. Wait for auth persistence to restore existing session
      await ensureAuthReady();

      let currentUser = auth.currentUser;
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        currentUser = cred.user;
      }
      userUid.value = currentUser.uid;

      // Update cached UID in local storage
      setLocalSave({ uid: userUid.value });

      const userRef = doc(db, 'users', userUid.value);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();

        // Harmonize with local storage (always respect the highest level achieved)
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

        // Load cosmetics (with defaults for legacy profiles)
        activeSkin.value = data.activeSkin || activeSkin.value || 'default_fruits';
        activeBackground.value = data.activeBackground || activeBackground.value || 'default_blue';

        // Merge unlocked lists
        const mergedSkins = Array.from(new Set([
          ...(Array.isArray(data.unlockedSkins) ? data.unlockedSkins : ['default_fruits']),
          ...unlockedSkins.value,
        ]));
        const mergedBgs = Array.from(new Set([
          ...(Array.isArray(data.unlockedBackgrounds) ? data.unlockedBackgrounds : ['default_blue']),
          ...unlockedBackgrounds.value,
        ]));

        unlockedSkins.value = mergedSkins;
        unlockedBackgrounds.value = mergedBgs;

        // Persist harmonized state to LocalStorage
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
        });

        // If cloud was behind local progress or missing cosmetics (legacy account), heal cloud:
        const missingCosmetics = !('activeSkin' in data) || !('unlockedSkins' in data);
        const hasHigherLocal = bestLevel > cloudLevel || bestScore > cloudScore || bestCoins > cloudCoins;

        if (missingCosmetics || hasHigherLocal) {
          try {
            await setDoc(userRef, {
              username: username.value,
              highScore: bestScore,
              currentLevel: bestLevel,
              coins: bestCoins,
              activeSkin: activeSkin.value,
              activeBackground: activeBackground.value,
              unlockedSkins: mergedSkins,
              unlockedBackgrounds: mergedBgs,
              updatedAt: serverTimestamp(),
            }, { merge: true });
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

      // Document does NOT exist in Firestore:
      // If local storage already has existing progress (e.g. anonymous UID regenerated after cache clear),
      // migrate local progress into this new document immediately so the user never loses progress!
      if (userCurrentLevel.value > 1 || userCoins.value > 0) {
        await setDoc(userRef, {
          username: username.value || 'Jugador',
          highScore: userHighScore.value,
          currentLevel: userCurrentLevel.value,
          coins: userCoins.value,
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

      // Truly new user
      return {
        isNewUser: true,
        savedScore: 0,
        savedLevel: 1,
      };
    } catch (error) {
      console.error('Error conectando a Firebase:', error);
      // Even if network fails, return cached local state so game starts on current level!
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
    const cleanName = name.trim() || 'Jugador';
    username.value = cleanName;

    setLocalSave({
      username: cleanName,
    });

    if (!userUid.value) return;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(userRef, {
        username: cleanName,
        highScore: userHighScore.value || 0,
        currentLevel: userCurrentLevel.value || 1,
        coins: userCoins.value || 0,
        activeSkin: activeSkin.value || 'default_fruits',
        activeBackground: activeBackground.value || 'default_blue',
        unlockedSkins: unlockedSkins.value || ['default_fruits'],
        unlockedBackgrounds: unlockedBackgrounds.value || ['default_blue'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.error('Error guardando usuario:', err);
    }
  };

  /**
   * Persist high score and current level to Firestore & LocalStorage.
   * Only increases highScore if current score is higher.
   */
  const saveProgress = async (score: number, level: number) => {
    if (score > userHighScore.value) {
      userHighScore.value = score;
    }
    if (level > userCurrentLevel.value) {
      userCurrentLevel.value = level;
    }

    // Immediate local persistence
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
      // Use setDoc with merge: true to avoid Update Bypass or missing fields rejections
      await setDoc(userRef, {
        highScore: userHighScore.value,
        currentLevel: userCurrentLevel.value,
        coins: userCoins.value,
        activeSkin: activeSkin.value || 'default_fruits',
        activeBackground: activeBackground.value || 'default_blue',
        unlockedSkins: unlockedSkins.value || ['default_fruits'],
        unlockedBackgrounds: unlockedBackgrounds.value || ['default_blue'],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('No se pudo actualizar progreso en Firestore:', err);
    }
  };

  /**
   * Add coins to the player's balance (called after winning a level).
   */
  const addCoins = async (amount: number) => {
    if (amount <= 0) return;

    userCoins.value += amount;

    setLocalSave({
      coins: userCoins.value,
    });

    if (!userUid.value) return;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(userRef, {
        coins: increment(amount),
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (err) {
      console.warn('No se pudo agregar monedas:', err);
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

    // Check not already owned
    const owned = type === 'skin' ? unlockedSkins.value : unlockedBackgrounds.value;
    if (owned.includes(itemId)) return false;

    // Optimistic local update
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
      // Rollback on error
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

    // Optimistic local update
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
    const trimmed = newName.trim();
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
   * Fetch top players for the Global Leaderboard.
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

      leaderboardList.value = list;
      userRank.value = myRank;
    } catch (err) {
      console.error('Error cargando clasificación:', err);
    } finally {
      isLeaderboardLoading.value = false;
    }
  };

  /**
   * Restore a player's progress by entering their previous UID or Username (e.g. "Cecilia19" or "F1DTlk7L5YRWxs4635ovC6PKfBL2").
   * Useful when device cache was wiped or anonymous account was regenerated.
   */
  const restoreProfileByNicknameOrId = async (target: string): Promise<{
    success: boolean;
    restoredLevel?: number;
    restoredCoins?: number;
    restoredScore?: number;
    username?: string;
    message: string;
  }> => {
    const clean = target.trim();
    if (!clean) {
      return { success: false, message: 'Por favor ingresa un apodo o ID de jugador válido.' };
    }

    try {
      let foundData: any = null;
      let foundDocId: string | undefined = undefined;

      // 1. Try directly as Document ID
      try {
        const directDoc = await getDoc(doc(db, 'users', clean));
        if (directDoc.exists()) {
          foundData = directDoc.data();
          foundDocId = directDoc.id;
        }
      } catch (e) {
        // Not a direct doc ID or query error, continue to search by username
      }

      // 2. If not found by doc ID, search by username
      if (!foundData) {
        const q = query(
          collection(db, 'users'),
          where('username', '==', clean),
          limit(10)
        );
        const querySnap = await getDocs(q);
        if (!querySnap.empty) {
          // Take the document with the highest currentLevel
          let bestDoc = querySnap.docs[0];
          for (const d of querySnap.docs) {
            const lvl = d.data().currentLevel || 0;
            if (lvl > (bestDoc.data().currentLevel || 0)) {
              bestDoc = d;
            }
          }
          foundData = bestDoc.data();
          foundDocId = bestDoc.id;
        }
      }

      if (!foundData) {
        return {
          success: false,
          message: `No se encontró ninguna partida con el apodo o ID "${clean}".`,
        };
      }

      // Extract restored values
      const restoredLevel = typeof foundData.currentLevel === 'number' ? foundData.currentLevel : 1;
      const restoredScore = typeof foundData.highScore === 'number' ? foundData.highScore : 0;
      const restoredCoins = typeof foundData.coins === 'number' ? foundData.coins : 0;
      const restoredUsername = foundData.username || clean;
      const restoredSkin = foundData.activeSkin || 'default_fruits';
      const restoredBg = foundData.activeBackground || 'default_blue';
      const restoredSkins = Array.isArray(foundData.unlockedSkins) ? foundData.unlockedSkins : ['default_fruits'];
      const restoredBgs = Array.isArray(foundData.unlockedBackgrounds) ? foundData.unlockedBackgrounds : ['default_blue'];

      // Apply to reactive state
      userCurrentLevel.value = restoredLevel;
      userHighScore.value = restoredScore;
      userCoins.value = restoredCoins;
      username.value = restoredUsername;
      activeSkin.value = restoredSkin;
      activeBackground.value = restoredBg;
      unlockedSkins.value = restoredSkins;
      unlockedBackgrounds.value = restoredBgs;

      // Update local storage
      setLocalSave({
        uid: userUid.value || foundDocId || undefined,
        username: restoredUsername,
        highScore: restoredScore,
        currentLevel: restoredLevel,
        coins: restoredCoins,
        activeSkin: restoredSkin,
        activeBackground: restoredBg,
        unlockedSkins: restoredSkins,
        unlockedBackgrounds: restoredBgs,
      });

      // Synchronize to current active user document in Firestore
      if (userUid.value) {
        try {
          const myUserRef = doc(db, 'users', userUid.value);
          await setDoc(myUserRef, {
            username: restoredUsername,
            highScore: restoredScore,
            currentLevel: restoredLevel,
            coins: restoredCoins,
            activeSkin: restoredSkin,
            activeBackground: restoredBg,
            unlockedSkins: restoredSkins,
            unlockedBackgrounds: restoredBgs,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        } catch (e) {
          console.warn('Error sincronizando datos restaurados al UID activo:', e);
        }
      }

      return {
        success: true,
        restoredLevel,
        restoredCoins,
        restoredScore,
        username: restoredUsername,
        message: `¡Partida recuperada con éxito! Se restauró el Nivel ${restoredLevel} y ${restoredCoins} monedas.`,
      };
    } catch (err: any) {
      console.error('Error restaurando partida:', err);
      return {
        success: false,
        message: `Error al conectar con la base de datos: ${err.message || err}`,
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
    saveProgress,
    updateUsername,
    fetchLeaderboard,
    addCoins,
    purchaseItem,
    equipItem,
    restoreProfileByNicknameOrId,
  };
}
