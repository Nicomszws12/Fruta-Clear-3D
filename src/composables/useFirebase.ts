/**
 * Firebase composable — authentication, user profile, persistence,
 * global leaderboard queries, and cosmetics inventory management.
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
} from 'firebase/firestore';
import { alertController } from '@ionic/vue';
import type { LeaderboardUser, ShopItemType } from '../game/types';

export function useFirebase() {
  const username = ref('Jugador');
  const userUid = ref('');
  const userHighScore = ref(0);
  const userCurrentLevel = ref(1);

  // ─── Coins & Cosmetics ───────────────────────────────────────
  const userCoins = ref(0);
  const activeSkin = ref('default_fruits');
  const activeBackground = ref('default_blue');
  const unlockedSkins = ref<string[]>(['default_fruits']);
  const unlockedBackgrounds = ref<string[]>(['default_blue']);

  // Leaderboard state
  const leaderboardList = ref<LeaderboardUser[]>([]);
  const userRank = ref<number | null>(null);
  const isLeaderboardLoading = ref(false);

  /**
   * Sign in anonymously, then load or create the user profile.
   */
  const authenticateAndLoadProfile = async (): Promise<{
    isNewUser: boolean;
    savedScore: number;
    savedLevel: number;
  } | null> => {
    try {
      const cred = await signInAnonymously(auth);
      userUid.value = cred.user.uid;

      const userRef = doc(db, 'users', userUid.value);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        username.value = data.username || 'Jugador';
        userHighScore.value = data.highScore || 0;
        userCurrentLevel.value = data.currentLevel || 1;

        // Load cosmetics data
        userCoins.value = data.coins || 0;
        activeSkin.value = data.activeSkin || 'default_fruits';
        activeBackground.value = data.activeBackground || 'default_blue';
        unlockedSkins.value = data.unlockedSkins || ['default_fruits'];
        unlockedBackgrounds.value = data.unlockedBackgrounds || ['default_blue'];

        return {
          isNewUser: false,
          savedScore: userHighScore.value,
          savedLevel: userCurrentLevel.value,
        };
      }

      // New user — signal to UI to show welcome modal
      return {
        isNewUser: true,
        savedScore: 0,
        savedLevel: 1,
      };
    } catch (error) {
      console.error('Error conectando a Firebase:', error);
      return null;
    }
  };

  /**
   * Called by UI after collecting nickname
   */
  const registerNewUser = async (name: string) => {
    if (!userUid.value) return;
    const cleanName = name.trim() || 'Jugador';
    username.value = cleanName;
    try {
      const userRef = doc(db, 'users', userUid.value);
      await setDoc(userRef, {
        username: cleanName,
        highScore: 0,
        currentLevel: 1,
        coins: 0,
        activeSkin: 'default_fruits',
        activeBackground: 'default_blue',
        unlockedSkins: ['default_fruits'],
        unlockedBackgrounds: ['default_blue'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error guardando usuario:', err);
    }
  };

  /**
   * Persist high score and current level to Firestore.
   * Only increases highScore if current score is higher.
   */
  const saveProgress = async (score: number, level: number) => {
    if (!userUid.value) return;

    if (score > userHighScore.value) {
      userHighScore.value = score;
    }
    if (level > userCurrentLevel.value) {
      userCurrentLevel.value = level;
    }

    try {
      const userRef = doc(db, 'users', userUid.value);
      await updateDoc(userRef, {
        highScore: userHighScore.value,
        currentLevel: userCurrentLevel.value,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('No se pudo actualizar progreso en Firestore:', err);
    }
  };

  /**
   * Add coins to the player's balance (called after winning a level).
   */
  const addCoins = async (amount: number) => {
    if (!userUid.value || amount <= 0) return;

    userCoins.value += amount;

    try {
      const userRef = doc(db, 'users', userUid.value);
      await updateDoc(userRef, {
        coins: increment(amount),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('No se pudo agregar monedas:', err);
    }
  };

  /**
   * Purchase a cosmetic item — deducts coins and adds to inventory.
   * Returns true on success, false on failure.
   */
  const purchaseItem = async (
    itemId: string,
    price: number,
    type: ShopItemType,
  ): Promise<boolean> => {
    if (!userUid.value) return false;
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
    if (!userUid.value) return false;

    const owned = type === 'skin' ? unlockedSkins.value : unlockedBackgrounds.value;
    if (!owned.includes(itemId)) return false;

    // Optimistic local update
    if (type === 'skin') {
      activeSkin.value = itemId;
    } else {
      activeBackground.value = itemId;
    }

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
    if (!trimmed || !userUid.value) return false;

    try {
      username.value = trimmed;
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

    // Actions
    authenticateAndLoadProfile,
    registerNewUser,
    saveProgress,
    updateUsername,
    fetchLeaderboard,
    addCoins,
    purchaseItem,
    equipItem,
  };
}
