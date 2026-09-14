<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SkinDefinition, BackgroundDefinition, ItemStatus } from '../game/types';
import { playClick, playTap } from '../game/sounds';

const props = defineProps<{
  isOpen: boolean;
  coins: number;
  shopSkins: SkinDefinition[];
  shopBackgrounds: BackgroundDefinition[];
  getSkinStatus: (id: string) => ItemStatus;
  getBackgroundStatus: (id: string) => ItemStatus;
  canAfford: (price: number) => boolean;
}>();

const emit = defineEmits<{
  (e: 'update:isOpen', value: boolean): void;
  (e: 'buy-skin', skin: SkinDefinition): void;
  (e: 'buy-background', bg: BackgroundDefinition): void;
  (e: 'equip-skin', skin: SkinDefinition): void;
  (e: 'equip-background', bg: BackgroundDefinition): void;
}>();

// ─── Tab State ────────────────────────────────────────────────
type ShopTab = 'skins' | 'backgrounds';
const activeTab = ref<ShopTab>('skins');

const setTab = (tab: ShopTab) => {
  playTap();
  activeTab.value = tab;
};

const close = () => {
  playClick();
  emit('update:isOpen', false);
};

// ─── Actions ──────────────────────────────────────────────────
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

const getButtonLabel = (status: ItemStatus, price: number, canBuy: boolean): string => {
  if (status === 'equipped') return '⭐ EQUIPADO';
  if (status === 'owned') return '✅ EQUIPAR';
  if (canBuy) return `💰 COMPRAR (${price} 🪙)`;
  return '🔒 SIN FONDOS';
};

const getButtonClass = (status: ItemStatus, price: number, canBuy: boolean): string => {
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
      <div v-if="isOpen" class="dialog-backdrop" @click.self="close">
        <Transition name="dialog-pop">
          <div v-if="isOpen" class="dialog-card shop-card">

            <!-- Window Tab -->
            <div class="window-tab">
              <span>🛒 TIENDA</span>
            </div>

            <!-- Close Button -->
            <button class="modal-close-corner" @click="close" title="Cerrar">
              <img src="/assets/ui/Red/Default/icon_cross.png" alt="Cerrar" class="close-icon" />
            </button>

            <!-- Header with Coin Balance -->
            <div class="shop-header">
              <h2 class="shop-title">TIENDA DE COSMÉTICOS</h2>
              <div class="coin-balance">
                <span class="coin-icon-big">🪙</span>
                <span class="coin-amount">{{ formatCoins(coins) }}</span>
              </div>
            </div>

            <!-- Tab Selector -->
            <div class="tab-bar">
              <button
                class="tab-btn"
                :class="{ 'is-active': activeTab === 'skins' }"
                @click="setTab('skins')"
              >
                <span class="tab-icon">🎨</span>
                <span class="tab-label">Fichas</span>
              </button>
              <button
                class="tab-btn"
                :class="{ 'is-active': activeTab === 'backgrounds' }"
                @click="setTab('backgrounds')"
              >
                <span class="tab-icon">🖼️</span>
                <span class="tab-label">Fondos</span>
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
                  <!-- Preview Emojis -->
                  <div class="skin-preview">
                    <span
                      v-for="(emoji, idx) in skin.preview"
                      :key="idx"
                      class="preview-emoji"
                    >{{ emoji }}</span>
                  </div>

                  <!-- Info -->
                  <div class="item-info">
                    <span class="item-name">{{ skin.name }}</span>
                    <span v-if="skin.price === 0" class="item-price free">GRATIS</span>
                    <span v-else class="item-price">{{ skin.price }} 🪙</span>
                  </div>

                  <!-- Action Button -->
                  <button
                    class="item-action-btn"
                    :class="getButtonClass(getSkinStatus(skin.id), skin.price, canAfford(skin.price))"
                    :disabled="getSkinStatus(skin.id) === 'equipped' || (getSkinStatus(skin.id) === 'locked' && !canAfford(skin.price))"
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
                  <!-- Gradient Preview -->
                  <div class="bg-preview" :style="{ background: bg.gradient }">
                    <span class="bg-preview-emoji">{{ bg.previewEmoji }}</span>
                  </div>

                  <!-- Info -->
                  <div class="item-info">
                    <span class="item-name">{{ bg.name }}</span>
                    <span v-if="bg.price === 0" class="item-price free">GRATIS</span>
                    <span v-else class="item-price">{{ bg.price }} 🪙</span>
                  </div>

                  <!-- Action Button -->
                  <button
                    class="item-action-btn"
                    :class="getButtonClass(getBackgroundStatus(bg.id), bg.price, canAfford(bg.price))"
                    :disabled="getBackgroundStatus(bg.id) === 'equipped' || (getBackgroundStatus(bg.id) === 'locked' && !canAfford(bg.price))"
                    @click="handleBgAction(bg)"
                  >
                    {{ getButtonLabel(getBackgroundStatus(bg.id), bg.price, canAfford(bg.price)) }}
                  </button>
                </div>
              </div>

            </div>

            <!-- Bottom Close -->
            <button class="shop-close-btn" @click="close">
              <span>CERRAR TIENDA</span>
            </button>

          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ─── Backdrop ────────────────────────────────────────────── */
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

/* ─── Card Base ───────────────────────────────────────────── */
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

/* Protruding Window Tab */
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
  box-shadow: 0 -2px 0 rgba(0,0,0,0.1);
}

/* Close Corner */
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
  transition: transform 0.1s ease;
}

.modal-close-corner:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #991b1b;
}

.close-icon {
  width: 14px; height: 14px;
  object-fit: contain;
}

/* ─── Header ──────────────────────────────────────────────── */
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
  letter-spacing: 0.5px;
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

/* ─── Tab Bar ─────────────────────────────────────────────── */
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
  padding: 6px 8px;
  cursor: pointer;
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
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

.tab-btn:active {
  transform: translateY(2px);
  box-shadow: 0 1px 0 #cbd5e1;
}

.tab-btn.is-active:active {
  box-shadow: 0 1px 0 #b45309;
}

.tab-icon {
  font-size: 14px;
}

.tab-label {
  font-size: 11px;
}

/* ─── Body Scrollable Area ────────────────────────────────── */
.shop-body {
  overflow-y: auto;
  flex: 1 1 auto;
  padding: 2px 0 4px;
}

/* ─── Items Grid ──────────────────────────────────────────── */
.items-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* ─── Item Card ───────────────────────────────────────────── */
.item-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
  border-radius: 18px;
  padding: 10px;
  box-shadow: 0 2px 0 #cbd5e1;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: border-color 0.2s ease;
}

.item-card.is-equipped {
  border-color: #f59e0b;
  background: #fffbeb;
  box-shadow: 0 2px 0 #d97706, 0 0 8px rgba(245, 158, 11, 0.15);
}

/* ─── Skin Preview ────────────────────────────────────────── */
.skin-preview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
  width: 54px;
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

/* ─── Background Preview ─────────────────────────────────── */
.bg-preview {
  width: 54px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1.5px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
}

.bg-preview-emoji {
  font-size: 18px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

/* ─── Item Info ───────────────────────────────────────────── */
.item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.item-name {
  font-family: var(--game-font, sans-serif);
  font-size: 11px;
  font-weight: 800;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-price {
  font-family: var(--game-font-narrow, sans-serif);
  font-size: 10px;
  font-weight: 700;
  color: #d97706;
}

.item-price.free {
  color: #22c55e;
  font-weight: 900;
}

/* ─── Action Buttons ──────────────────────────────────────── */
.item-action-btn {
  flex-shrink: 0;
  font-family: var(--game-font, sans-serif);
  font-size: 8px;
  font-weight: 900;
  padding: 5px 8px;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  letter-spacing: 0.3px;
}

.item-action-btn:active:not(:disabled) {
  transform: translateY(2px);
}

.btn-buy {
  background: #f59e0b;
  border: 1.5px solid #d97706;
  box-shadow: 0 3px 0 #b45309;
  color: #ffffff;
}

.btn-buy:active {
  box-shadow: 0 1px 0 #b45309;
}

.btn-equip {
  background: #38c644;
  border: 1.5px solid #278d30;
  box-shadow: 0 3px 0 #1b6822;
  color: #ffffff;
}

.btn-equip:active {
  box-shadow: 0 1px 0 #1b6822;
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

/* ─── Bottom Button ───────────────────────────────────────── */
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
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  flex-shrink: 0;
}

.shop-close-btn:active {
  transform: translateY(3px);
  box-shadow: 0 2px 0 #0369a1;
}

/* ─── Dialog Transitions ──────────────────────────────────── */
.dialog-fade-enter-active, .dialog-fade-leave-active {
  transition: opacity 0.22s ease;
}
.dialog-fade-enter-from, .dialog-fade-leave-to {
  opacity: 0;
}

.dialog-pop-enter-active {
  animation: cardBounce 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.dialog-pop-leave-active {
  animation: cardBounce 0.2s reverse ease-in;
}

@keyframes cardBounce {
  0% { transform: scale(0.7) translateY(20px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
</style>
