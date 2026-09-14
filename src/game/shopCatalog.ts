/**
 * Shop catalog definitions — skins and background themes.
 *
 * Each skin provides an emoji mapping for all 24 tile asset keys,
 * allowing instant visual re-theming without altering game logic.
 */

import type { SkinDefinition, BackgroundDefinition } from './types';

/** Default equipped skin ID */
export const DEFAULT_SKIN_ID = 'default_fruits';

/** Default equipped background ID */
export const DEFAULT_BACKGROUND_ID = 'default_blue';

/**
 * 6 Unlockable tile skin sets.
 * Every skin maps all 24 tile keys to themed emojis.
 */
export const SHOP_SKINS: SkinDefinition[] = [
  {
    id: 'default_fruits',
    name: 'Frutas Clásicas',
    price: 0,
    preview: ['🍓', '🍋', '🍇', '🍉', '🥑', '🍒'],
    emojiMap: {
      strawberry: '🍓',
      lemon: '🍋',
      grapes: '🍇',
      watermelon: '🍉',
      avocado: '🥑',
      coconut: '🥥',
      cherry: '🍒',
      peach: '🍑',
      mango: '🥭',
      pineapple: '🍍',
      apple: '🍏',
      banana: '🍌',
      donut: '🍩',
      cupcake: '🧁',
      icecream: '🍦',
      cookie: '🍪',
      lollipop: '🍭',
      gem_red: '💎',
      crystal_ball: '🔮',
      star: '🌟',
      crown: '👑',
      lightning: '⚡',
      clover: '🍀',
      mushroom: '🍄',
    },
  },
  {
    id: 'sweets_party',
    name: 'Fiesta Dulce',
    price: 50,
    preview: ['🍩', '🧁', '🍦', '🍪', '🍭', '🎂'],
    emojiMap: {
      strawberry: '🍩',
      lemon: '🧁',
      grapes: '🍦',
      watermelon: '🍪',
      avocado: '🍭',
      coconut: '🎂',
      cherry: '🍬',
      peach: '🍫',
      mango: '🥧',
      pineapple: '🍰',
      apple: '🧇',
      banana: '🥞',
      donut: '🍮',
      cupcake: '🥨',
      icecream: '🥐',
      cookie: '🧈',
      lollipop: '🧃',
      gem_red: '🥤',
      crystal_ball: '🍿',
      star: '🍡',
      crown: '🎪',
      lightning: '🎠',
      clover: '🎡',
      mushroom: '🎈',
    },
  },
  {
    id: 'ocean_life',
    name: 'Vida Marina',
    price: 80,
    preview: ['🐠', '🐙', '🦀', '🐚', '🦈', '🐳'],
    emojiMap: {
      strawberry: '🐠',
      lemon: '🐙',
      grapes: '🦀',
      watermelon: '🐚',
      avocado: '🦈',
      coconut: '🐳',
      cherry: '🐬',
      peach: '🦑',
      mango: '🦐',
      pineapple: '🐡',
      apple: '🪼',
      banana: '🐟',
      donut: '🦞',
      cupcake: '🐋',
      icecream: '🪸',
      cookie: '🐢',
      lollipop: '🦭',
      gem_red: '🌊',
      crystal_ball: '🏝️',
      star: '🏖️',
      crown: '⚓',
      lightning: '🧜‍♀️',
      clover: '🪝',
      mushroom: '🚢',
    },
  },
  {
    id: 'space_adventure',
    name: 'Aventura Espacial',
    price: 100,
    preview: ['🚀', '🛸', '🌙', '⭐', '🪐', '☄️'],
    emojiMap: {
      strawberry: '🚀',
      lemon: '🛸',
      grapes: '🌙',
      watermelon: '⭐',
      avocado: '🪐',
      coconut: '☄️',
      cherry: '🌍',
      peach: '🌕',
      mango: '🌑',
      pineapple: '🔭',
      apple: '👨‍🚀',
      banana: '👩‍🚀',
      donut: '🛰️',
      cupcake: '🌌',
      icecream: '💫',
      cookie: '🌠',
      lollipop: '🌐',
      gem_red: '🌗',
      crystal_ball: '🌒',
      star: '🌓',
      crown: '🪨',
      lightning: '🌋',
      clover: '🌤️',
      mushroom: '🌈',
    },
  },
  {
    id: 'animals_farm',
    name: 'Granja Animal',
    price: 80,
    preview: ['🐶', '🐱', '🐰', '🐻', '🦊', '🐸'],
    emojiMap: {
      strawberry: '🐶',
      lemon: '🐱',
      grapes: '🐰',
      watermelon: '🐻',
      avocado: '🦊',
      coconut: '🐸',
      cherry: '🐼',
      peach: '🐨',
      mango: '🦁',
      pineapple: '🐯',
      apple: '🐵',
      banana: '🦄',
      donut: '🐷',
      cupcake: '🐮',
      icecream: '🐔',
      cookie: '🐴',
      lollipop: '🦋',
      gem_red: '🐝',
      crystal_ball: '🐞',
      star: '🦜',
      crown: '🐿️',
      lightning: '🦔',
      clover: '🐾',
      mushroom: '🦎',
    },
  },
  {
    id: 'sports_mania',
    name: 'Deportes Mania',
    price: 120,
    preview: ['⚽', '🏀', '🎾', '🏈', '⚾', '🎱'],
    emojiMap: {
      strawberry: '⚽',
      lemon: '🏀',
      grapes: '🎾',
      watermelon: '🏈',
      avocado: '⚾',
      coconut: '🎱',
      cherry: '🏐',
      peach: '🏓',
      mango: '🥊',
      pineapple: '🏆',
      apple: '🥇',
      banana: '🏅',
      donut: '🎯',
      cupcake: '🎳',
      icecream: '🥅',
      cookie: '🏸',
      lollipop: '🤺',
      gem_red: '⛳',
      crystal_ball: '🏋️‍♂️',
      star: '🤸‍♂️',
      crown: '🎿',
      lightning: '🛹',
      clover: '🏄‍♂️',
      mushroom: '🚴',
    },
  },
];

/**
 * 5 Unlockable background themes.
 */
export const SHOP_BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: 'default_blue',
    name: 'Océano Clásico',
    price: 0,
    gradient: 'linear-gradient(180deg, #38bdf8 0%, #0ea5e9 45%, #0284c7 100%)',
    accentColor: '#0284c7',
    previewEmoji: '🌊',
  },
  {
    id: 'sunset_orange',
    name: 'Atardecer Cálido',
    price: 30,
    gradient: 'linear-gradient(180deg, #f97316 0%, #ec4899 50%, #8b5cf6 100%)',
    accentColor: '#ea580c',
    previewEmoji: '🌅',
  },
  {
    id: 'forest_green',
    name: 'Bosque Encantado',
    price: 50,
    gradient: 'linear-gradient(180deg, #22c55e 0%, #059669 45%, #0d9488 100%)',
    accentColor: '#059669',
    previewEmoji: '🌿',
  },
  {
    id: 'galaxy_purple',
    name: 'Galaxia Estelar',
    price: 80,
    gradient: 'linear-gradient(180deg, #7c3aed 0%, #4f46e5 45%, #1e1b4b 100%)',
    accentColor: '#7c3aed',
    previewEmoji: '🌌',
  },
  {
    id: 'candy_pink',
    name: 'Mundo Caramelo',
    price: 60,
    gradient: 'linear-gradient(180deg, #f472b6 0%, #ec4899 45%, #be185d 100%)',
    accentColor: '#ec4899',
    previewEmoji: '🍬',
  },
];

// ─── O(1) Lookup Maps ──────────────────────────────────────────

const SKIN_MAP = new Map<string, SkinDefinition>(
  SHOP_SKINS.map((skin) => [skin.id, skin])
);

const BACKGROUND_MAP = new Map<string, BackgroundDefinition>(
  SHOP_BACKGROUNDS.map((bg) => [bg.id, bg])
);

/**
 * Retrieve a skin definition by its unique ID.
 * Returns undefined if the skin ID is not recognized.
 */
export function getSkinById(id: string): SkinDefinition | undefined {
  return SKIN_MAP.get(id);
}

/**
 * Retrieve a background definition by its unique ID.
 * Returns undefined if the background ID is not recognized.
 */
export function getBackgroundById(id: string): BackgroundDefinition | undefined {
  return BACKGROUND_MAP.get(id);
}
