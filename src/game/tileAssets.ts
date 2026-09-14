/**
 * Tile visual assets — maps tile type keys to emojis and (future) images.
 *
 * Supports dynamic skin switching: when a skin is equipped,
 * getAssetByKey() returns the emoji from the active skin's mapping.
 */
import { ref } from 'vue';
import type { SkinEmojiMap } from './types';

export interface TileAsset {
  /** Unique key used as the tile's `type` value */
  key: string;
  /** Emoji fallback for rendering */
  emoji: string;
  /** Optional path to an image in assets/tiles/ */
  imagePath?: string;
  /** Accessible label (used for img alt and future a11y) */
  label: string;
  /** Category to organize theme if needed */
  category?: 'fruit' | 'sweet' | 'magic' | 'nature';
}

/**
 * 24 Diverse tile assets across fruits, sweets, treasures, and nature.
 * Allows levels up to 100+ to have rich visual variety without repetition.
 */
export const TILE_ASSETS: TileAsset[] = [
  // ─── Frutas Clásicas ─────────────────────────────────────────
  { key: 'strawberry',  emoji: '🍓', label: 'Fresa',       category: 'fruit' },
  { key: 'lemon',       emoji: '🍋', label: 'Limón',       category: 'fruit' },
  { key: 'grapes',      emoji: '🍇', label: 'Uvas',        category: 'fruit' },
  { key: 'watermelon',  emoji: '🍉', label: 'Sandía',      category: 'fruit' },
  { key: 'avocado',     emoji: '🥑', label: 'Aguacate',    category: 'fruit' },
  { key: 'coconut',     emoji: '🥥', label: 'Coco',        category: 'fruit' },
  { key: 'cherry',      emoji: '🍒', label: 'Cereza',      category: 'fruit' },
  { key: 'peach',       emoji: '🍑', label: 'Durazno',     category: 'fruit' },
  { key: 'mango',       emoji: '🥭', label: 'Mango',       category: 'fruit' },
  { key: 'pineapple',   emoji: '🍍', label: 'Piña',        category: 'fruit' },
  { key: 'apple',       emoji: '🍏', label: 'Manzana',     category: 'fruit' },
  { key: 'banana',      emoji: '🍌', label: 'Plátano',     category: 'fruit' },

  // ─── Dulces & Postres ────────────────────────────────────────
  { key: 'donut',       emoji: '🍩', label: 'Dona',        category: 'sweet' },
  { key: 'cupcake',     emoji: '🧁', label: 'Cupcake',     category: 'sweet' },
  { key: 'icecream',    emoji: '🍦', label: 'Helado',      category: 'sweet' },
  { key: 'cookie',      emoji: '🍪', label: 'Galleta',     category: 'sweet' },
  { key: 'lollipop',    emoji: '🍭', label: 'Paleta',      category: 'sweet' },

  // ─── Joyas & Magia ───────────────────────────────────────────
  { key: 'gem_red',     emoji: '💎', label: 'Diamante',    category: 'magic' },
  { key: 'crystal_ball',emoji: '🔮', label: 'Orbe',        category: 'magic' },
  { key: 'star',        emoji: '🌟', label: 'Estrella',    category: 'magic' },
  { key: 'crown',       emoji: '👑', label: 'Corona',      category: 'magic' },
  { key: 'lightning',   emoji: '⚡', label: 'Rayo',        category: 'magic' },

  // ─── Naturaleza Mágica ───────────────────────────────────────
  { key: 'clover',      emoji: '🍀', label: 'Trébol',      category: 'nature' },
  { key: 'mushroom',    emoji: '🍄', label: 'Hongo',       category: 'nature' },
];

// Pre-indexed map for instant O(1) tile asset lookup
const ASSET_MAP = new Map<string, TileAsset>(TILE_ASSETS.map(a => [a.key, a]));

// ─── Dynamic Skin System ─────────────────────────────────────

/** The currently active skin's emoji override map (global reactive state) */
const _activeSkinEmojiMap = ref<SkinEmojiMap | null>(null);

/**
 * Set the active skin's emoji mapping. Called by useShop when a skin is equipped.
 * Pass `null` to reset to default emojis.
 */
export function setActiveSkinMap(map: SkinEmojiMap | null): void {
  _activeSkinEmojiMap.value = map;
}

/**
 * Look up a tile asset by its type key.
 * If a skin is active, returns the skin's emoji override.
 * Returns a fallback if the key is not found.
 */
export function getAssetByKey(key: string): TileAsset {
  const base = ASSET_MAP.get(key);
  if (!base) return { key, emoji: '❓', label: key };

  // If an active skin provides an emoji override for this key, use it
  const skinMap = _activeSkinEmojiMap.value;
  if (skinMap && skinMap[key]) {
    return {
      ...base,
      emoji: skinMap[key],
      // Clear imagePath so the emoji is shown, not the default image
      imagePath: undefined,
    };
  }

  return base;
}

/**
 * Return `count` tile-type keys (for deck generation).
 * Uses levelSeed to rotate the catalog across fruits, sweets, gems, and nature
 * so levels don't always start with the same 3 fruits.
 */
export function getAvailableTypes(count: number, levelSeed = 1): string[] {
  const allKeys = TILE_ASSETS.map(a => a.key);
  const offset = ((Math.max(1, levelSeed) - 1) * 3) % allKeys.length;
  const rotated = [...allKeys.slice(offset), ...allKeys.slice(0, offset)];
  return rotated.slice(0, Math.min(count, rotated.length));
}
