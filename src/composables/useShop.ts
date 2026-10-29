/**
 * useShop — composable for the cosmetics and power-up shop.
 *
 * Provides reactive access to the shop catalog, purchase/equip actions,
 * power-up pack refills, and item status checks. Bridges shopCatalog ↔ useFirebase.
 */
import { computed } from 'vue';
import type {
  SkinDefinition,
  BackgroundDefinition,
  PowerUpPackDefinition,
  ItemStatus,
  ShopItemType,
} from '../game/types';
import {
  SHOP_SKINS,
  SHOP_BACKGROUNDS,
  SHOP_POWERUP_PACKS,
  getSkinById,
  getBackgroundById,
} from '../game/shopCatalog';
import { setActiveSkinMap } from '../game/tileAssets';
import { playClick, playPowerup, playMatch } from '../game/sounds';

interface UseFirebaseReturn {
  userCoins: { value: number };
  activeSkin: { value: string };
  activeBackground: { value: string };
  unlockedSkins: { value: string[] };
  unlockedBackgrounds: { value: string[] };
  purchaseItem: (itemId: string, price: number, type: ShopItemType) => Promise<boolean>;
  equipItem: (itemId: string, type: ShopItemType) => Promise<boolean>;
  spendCoins?: (price: number) => Promise<boolean>;
}

export function useShop(firebase: UseFirebaseReturn) {
  const {
    userCoins,
    activeSkin,
    activeBackground,
    unlockedSkins,
    unlockedBackgrounds,
    purchaseItem: fbPurchase,
    equipItem: fbEquip,
    spendCoins: fbSpendCoins,
  } = firebase;

  // ─── Catalog ────────────────────────────────────────────────
  const shopSkins = SHOP_SKINS;
  const shopBackgrounds = SHOP_BACKGROUNDS;
  const shopPowerUpPacks = SHOP_POWERUP_PACKS;

  // ─── Status Checks ─────────────────────────────────────────

  const getSkinStatus = (skinId: string): ItemStatus => {
    if (activeSkin.value === skinId) return 'equipped';
    if (unlockedSkins.value.includes(skinId)) return 'owned';
    return 'locked';
  };

  const getBackgroundStatus = (bgId: string): ItemStatus => {
    if (activeBackground.value === bgId) return 'equipped';
    if (unlockedBackgrounds.value.includes(bgId)) return 'owned';
    return 'locked';
  };

  const canAfford = (price: number): boolean => {
    return userCoins.value >= price;
  };

  // ─── Purchase Actions ──────────────────────────────────────

  const buySkin = async (skin: SkinDefinition): Promise<boolean> => {
    if (unlockedSkins.value.includes(skin.id)) return false;
    if (!canAfford(skin.price)) return false;

    playClick();
    const ok = await fbPurchase(skin.id, skin.price, 'skin');
    if (ok) {
      playPowerup();
    }
    return ok;
  };

  const buyBackground = async (bg: BackgroundDefinition): Promise<boolean> => {
    if (unlockedBackgrounds.value.includes(bg.id)) return false;
    if (!canAfford(bg.price)) return false;

    playClick();
    const ok = await fbPurchase(bg.id, bg.price, 'background');
    if (ok) {
      playPowerup();
    }
    return ok;
  };

  const buyPowerUpPack = async (
    pack: PowerUpPackDefinition,
    onGrant: (rewards: { undo: number; shuffle: number; hint: number }) => void,
  ): Promise<boolean> => {
    if (!canAfford(pack.price) || !fbSpendCoins) return false;

    playClick();
    const ok = await fbSpendCoins(pack.price);
    if (ok) {
      onGrant(pack.rewards);
      playPowerup();
    }
    return ok;
  };

  // ─── Equip Actions ─────────────────────────────────────────

  const equipSkin = async (skin: SkinDefinition): Promise<boolean> => {
    if (!unlockedSkins.value.includes(skin.id)) return false;
    if (activeSkin.value === skin.id) return false;

    playMatch();
    const ok = await fbEquip(skin.id, 'skin');
    if (ok) {
      applySkinToRenderer(skin.id);
    }
    return ok;
  };

  const equipBackground = async (bg: BackgroundDefinition): Promise<boolean> => {
    if (!unlockedBackgrounds.value.includes(bg.id)) return false;
    if (activeBackground.value === bg.id) return false;

    playMatch();
    return await fbEquip(bg.id, 'background');
  };

  // ─── Skin Renderer Integration ─────────────────────────────

  const applySkinToRenderer = (skinId: string) => {
    if (skinId === 'default_fruits') {
      setActiveSkinMap(null);
      return;
    }
    const skin = getSkinById(skinId);
    if (skin) {
      setActiveSkinMap(skin.emojiMap);
    }
  };

  const initializeSkin = () => {
    applySkinToRenderer(activeSkin.value);
  };

  // ─── Computed Properties ───────────────────────────────────

  const currentSkinName = computed(() => {
    const skin = getSkinById(activeSkin.value);
    return skin?.name || 'Frutas Clásicas';
  });

  const currentBackgroundName = computed(() => {
    const bg = getBackgroundById(activeBackground.value);
    return bg?.name || 'Océano Clásico';
  });

  return {
    // Catalog
    shopSkins,
    shopBackgrounds,
    shopPowerUpPacks,

    // Status
    getSkinStatus,
    getBackgroundStatus,
    canAfford,

    // Actions
    buySkin,
    buyBackground,
    buyPowerUpPack,
    equipSkin,
    equipBackground,
    initializeSkin,
    applySkinToRenderer,

    // Computed
    currentSkinName,
    currentBackgroundName,
  };
}
