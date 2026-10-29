<script setup lang="ts">
import { ref, watch } from 'vue';
import type {
  SkinDefinition,
  BackgroundDefinition,
  PowerUpPackDefinition,
  ItemStatus,
} from '../game/types';
import { playClick, playTap } from '../game/sounds';

export type ShopTab = 'skins' | 'backgrounds' | 'powerups';

const props = defineProps<{
  isOpen: boolean;
  coins: number;
  shopSkins: SkinDefinition[];
  shopBackgrounds: BackgroundDefinition[];
  shopPowerUpPacks: PowerUpPackDefinition[];
  getSkinStatus: (id: string) => ItemStatus;
  getBackgroundStatus: (id: string) => ItemStatus;
  canAfford: (price: number) => boolean;
  initialTab?: ShopTab;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'buy-skin', skin: SkinDefinition): void;
  (e: 'buy-background', bg: BackgroundDefinition): void;
  (e: 'buy-powerup-pack', pack: PowerUpPackDefinition): void;
  (e: 'equip-skin', skin: SkinDefinition): void;
  (e: 'equip-background', bg: BackgroundDefinition): void;
}>();

const activeTab = ref<ShopTab>(props.initialTab || 'skins');

watch(
  () => props.isOpen,
  open => {
    if (open && props.initialTab) {
      activeTab.value = props.initialTab;
    }
  },
);

const setTab = (tab: ShopTab) => {
  playTap();
  activeTab.value = tab;
};

const close = () => {
  playClick();
  emit('update:isOpen', false);
};

const handleSkinAction = (skin: SkinDefinition) => {
  const status = props.getSkinStatus(skin.id);
  if (status === 'equipped') return;
  if (status === 'owned') {
    emit('equip-skin', skin);
  } else if (props.canAfford(skin.price)) {
    emit('buy-skin', skin);
  }
};

const handleBgAction = (bg: BackgroundDefinition) => {
  const status = props.getBackgroundStatus(bg.id);
  if (status === 'equipped') return;
  if (status === 'owned') {
    emit('equip-background', bg);
  } else if (props.canAfford(bg.price)) {
    emit('buy-background', bg);
  }
};

const handlePackAction = (pack: PowerUpPackDefinition) => {
  if (props.canAfford(pack.price)) {
    emit('buy-powerup-pack', pack);
  }
};

const getButtonLabel = (status: ItemStatus, price: number, canBuy: boolean): string => {
  if (status === 'equipped') return '⭐ EQUIPADO';
  if (status === 'owned') return '✅ EQUIPAR';
  if (canBuy) return `💰 COMPRAR (${price} 🪙)`;
  return '🔒 SIN FONDOS';
};

const getButtonClass = (status: ItemStatus, canBuy: boolean): string => {
  if (status === 'equipped') return 'btn-equipped';
  if (status === 'owned') return 'btn-equip';
  if (canBuy) return 'btn-buy';
  return 'btn-locked';
};

const formatCoins = (n: number) => new Intl.NumberFormat('es-ES').format(n);
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div
        v-if="isOpen"
        class="dialog-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Tienda"
        @click.self="close"
      >
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card shop-card">
            <div class="window-tab">
              <span>🛒 TIENDA</span>
            </div>

            <button
              type="button"
              class="modal-close-corner"
              @click="close"
              title="Cerrar"
              aria-label="Cerrar tienda"
            >
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <div class="shop-header">
              <h2 class="shop-title">TIENDA DEL JUEGO</h2>
              <div class="coin-balance">
                <span class="coin-icon-big" aria-hidden="true">🪙</span>
                <span class="coin-amount">{{ formatCoins(coins) }}</span>
              </div>
            </div>

            <!-- 3-Tab Selector -->
            <div class="tab-bar" role="tablist">
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'skins'"
                class="tab-btn"
                :class="{ 'is-active': activeTab === 'skins' }"
                @click="setTab('skins')"
              >
                <span class="tab-icon" aria-hidden="true">🎨</span>
                <span class="tab-label">Fichas</span>
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'backgrounds'"
                class="tab-btn"
                :class="{ 'is-active': activeTab === 'backgrounds' }"
                @click="setTab('backgrounds')"
              >
                <span class="tab-icon" aria-hidden="true">🖼️</span>
                <span class="tab-label">Fondos</span>
              </button>
              <button
                type="button"
                role="tab"
                :aria-selected="activeTab === 'powerups'"
                class="tab-btn"
                :class="{ 'is-active': activeTab === 'powerups' }"
                @click="setTab('powerups')"
              >
                <span class="tab-icon" aria-hidden="true">⚡</span>
                <span class="tab-label">Ayudas</span>
              </button>
            </div>

            <!-- Content Area -->
            <div class="shop-body">
              <!-- ─── SKINS TAB ─── -->
              <div v-if="activeTab === 'skins'" class="items-grid">
                <div
                  v-for="skin in shopSkins"
                  :key="skin.id"
                  class="item-card"
                  :class="{ 'is-equipped': getSkinStatus(skin.id) === 'equipped' }"
                >
                  <div class="skin-preview" aria-hidden="true">
                    <span
                      v-for="(emoji, idx) in skin.preview"
                      :key="idx"
                      class="preview-emoji"
                    >{{ emoji }}</span>
                  </div>

                  <div class="item-info">
                    <span class="item-name">{{ skin.name }}</span>
                    <span v-if="skin.price === 0" class="item-price free">GRATIS</span>
                    <span v-else class="item-price">{{ skin.price }} 🪙</span>
                  </div>

                  <button
                    type="button"
                    class="item-action-btn"
                    :class="getButtonClass(getSkinStatus(skin.id), canAfford(skin.price))"
                    :disabled="
                      getSkinStatus(skin.id) === 'equipped' ||
                      (getSkinStatus(skin.id) === 'locked' && !canAfford(skin.price))
                    "
                    @click="handleSkinAction(skin)"
                  >
                    {{ getButtonLabel(getSkinStatus(skin.id), skin.price, canAfford(skin.price)) }}
                  </button>
                </div>
              </div>

              <!-- ─── BACKGROUNDS TAB ─── -->
              <div v-if="activeTab === 'backgrounds'" class="items-grid">
                <div
                  v-for="bg in shopBackgrounds"
                  :key="bg.id"
                  class="item-card"
                  :class="{ 'is-equipped': getBackgroundStatus(bg.id) === 'equipped' }"
                >
                  <div class="bg-preview" :style="{ background: bg.gradient }" aria-hidden="true">
                    <span class="bg-preview-emoji">{{ bg.previewEmoji }}</span>
                  </div>

                  <div class="item-info">
                    <span class="item-name">{{ bg.name }}</span>
                    <span v-if="bg.price === 0" class="item-price free">GRATIS</span>
                    <span v-else class="item-price">{{ bg.price }} 🪙</span>
                  </div>

                  <button
                    type="button"
                    class="item-action-btn"
                    :class="getButtonClass(getBackgroundStatus(bg.id), canAfford(bg.price))"
                    :disabled="
                      getBackgroundStatus(bg.id) === 'equipped' ||
                      (getBackgroundStatus(bg.id) === 'locked' && !canAfford(bg.price))
                    "
                    @click="handleBgAction(bg)"
                  >
                    {{ getButtonLabel(getBackgroundStatus(bg.id), bg.price, canAfford(bg.price)) }}
                  </button>
                </div>
              </div>

              <!-- ─── POWER-UPS TAB ─── -->
              <div v-if="activeTab === 'powerups'" class="items-grid">
                <div
                  v-for="pack in shopPowerUpPacks"
                  :key="pack.id"
                  class="item-card"
                >
                  <div class="pack-preview" aria-hidden="true">
                    <span>{{ pack.icon }}</span>
                  </div>

                  <div class="item-info">
                    <span class="item-name">{{ pack.name }}</span>
                    <span class="pack-desc">{{ pack.description }}</span>
                    <span class="item-price">{{ pack.price }} 🪙</span>
                  </div>

                  <button
                    type="button"
                    class="item-action-btn"
                    :class="canAfford(pack.price) ? 'btn-buy' : 'btn-locked'"
                    :disabled="!canAfford(pack.price)"
                    @click="handlePackAction(pack)"
                  >
                    {{ canAfford(pack.price) ? `💰 ${pack.price} 🪙` : '🔒 SIN FONDOS' }}
                  </button>
                </div>
              </div>
            </div>

            <button type="button" class="shop-close-btn" @click="close">
              <span>CERRAR TIENDA</span>
            </button>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.dialog-backdrop {
  position: fixed;
  top: 0; left: 0;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10000;
  padding: 14px;
  box-sizing: border-box;
}

.shop-card {
  width: 94%;
  max-width: 400px;
  max-height: calc(100dvh - 36px);
  max-height: calc(100vh - 36px);
  background: #f8fafc;
  border: 4px solid #f59e0b;
  border-radius: 28px;
  box-shadow:
    0 10px 0 #d97706,
    0 25px 40px rgba(0, 0, 0, 0.35);
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 24px 14px 14px;
  box-sizing: border-box;
  overflow: hidden;
  margin-top: 15px;
}

.window-tab {
  position: absolute;
  top: -30px;
  left: 20px;
  background: #f59e0b;
  border: 3px solid #d97706;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 4px 14px 2px;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 900;
  color: #ffffff;
}

.modal-close-corner {
  position: absolute;
  top: 12px; right: 12px;
  background: #ef4444;
  border: 2px solid #b91c1c;
  box-shadow: 0 3px 0 #991b1b;
  border-radius: 50%;
  width: 30px; height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 5;
}

.close-icon {
  width: 14px; height: 14px;
  object-fit: contain;
}

.shop-header {
  text-align: center;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.shop-title {
  font-family: var(--game-font, sans-serif);
  font-size: 1.1rem;
  font-weight: 900;
  color: #92400e;
  margin: 0;
}

.coin-balance {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 2px solid #f59e0b;
  border-radius: 16px;
  padding: 4px 12px;
  margin-top: 6px;
  box-shadow: 0 3px 0 #d97706;
}

.coin-icon-big {
  font-size: 18px;
}

.coin-amount {
  font-family: var(--game-font, sans-serif);
  font-size: 16px;
  font-weight: 900;
  color: #92400e;
}

.tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  padding: 6px 6px;
  cursor: pointer;
  font-family: var(--game-font, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #64748b;
  box-shadow: 0 3px 0 #cbd5e1;
  transition: all 0.15s ease;
}

.tab-btn.is-active {
  background: #f59e0b;
  border-color: #d97706;
  color: #ffffff;
  box-shadow: 0 3px 0 #b45309;
}

.tab-icon {
  font-size: 13px;
}

.tab-label {
  font-size: 10px;
}

.shop-body {
  overflow-y: auto;
  flex: 1 1 auto;
  padding: 2px 0 4px;
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 8px 10px;
  box-shadow: 0 2px 0 #cbd5e1;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-height: 52px;
  box-sizing: border-box;
}

.item-card.is-equipped {
  border-color: #f59e0b;
  background: #fffbeb;
  box-shadow: 0 2px 0 #d97706, 0 0 8px rgba(245, 158, 11, 0.15);
}

.skin-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  width: 52px;
  height: 38px;
  flex-shrink: 0;
  background: #f0f9ff;
  border: 1.5px solid #bae6fd;
  border-radius: 10px;
  padding: 3px;
  box-sizing: border-box;
}

.preview-emoji {
  font-size: 11px;
  line-height: 1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bg-preview,
.pack-preview {
  width: 52px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pack-preview {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-color: #f59e0b;
  font-size: 20px;
}

.bg-preview-emoji {
  font-size: 18px;
}

.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 12px;
  font-weight: 900;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pack-desc {
  font-size: 10px;
  color: #64748b;
  font-weight: 600;
  line-height: 1.2;
}

.item-price {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 800;
  color: #d97706;
}

.item-price.free {
  color: #16a34a;
  font-weight: 900;
}

.item-action-btn {
  flex-shrink: 0;
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 900;
  padding: 6px 10px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.btn-buy {
  background: #f59e0b;
  border: 1.5px solid #d97706;
  box-shadow: 0 3px 0 #b45309;
  color: #ffffff;
}

.btn-equip {
  background: #38c644;
  border: 1.5px solid #278d30;
  box-shadow: 0 3px 0 #1b6822;
  color: #ffffff;
}

.btn-equipped {
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 100%);
  border: 1.5px solid #d97706;
  box-shadow: 0 2px 0 #b45309;
  color: #92400e;
  cursor: default;
}

.btn-locked {
  background: #e2e8f0;
  border: 1.5px solid #cbd5e1;
  box-shadow: 0 2px 0 #94a3b8;
  color: #94a3b8;
  cursor: not-allowed;
  opacity: 0.7;
}

.shop-close-btn {
  margin-top: 8px;
  background: #38bdf8;
  border: 3px solid #0284c7;
  box-shadow: 0 5px 0 #0369a1;
  border-radius: 18px;
  padding: 10px 16px;
  color: #ffffff;
  font-family: var(--game-font, sans-serif);
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}
</style>
