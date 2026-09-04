// src/composables/useGameSettings.ts
import { ref, watch } from 'vue';

const STORAGE_SFX_KEY = 'fruta_clear_sfx_enabled';
const STORAGE_VOL_KEY = 'fruta_clear_sfx_volume';
const STORAGE_VIB_KEY = 'fruta_clear_vibration_enabled';

// Load stored preferences or defaults
const initialSfx = localStorage.getItem(STORAGE_SFX_KEY) !== 'false';
const initialVol = parseInt(localStorage.getItem(STORAGE_VOL_KEY) || '80', 10);
const initialVib = localStorage.getItem(STORAGE_VIB_KEY) !== 'false';

const sfxEnabled = ref(initialSfx);
const sfxVolume = ref(Number.isNaN(initialVol) ? 80 : Math.min(100, Math.max(0, initialVol)));
const vibrationEnabled = ref(initialVib);

// Sync to localStorage
watch(sfxEnabled, val => {
  localStorage.setItem(STORAGE_SFX_KEY, String(val));
});

watch(sfxVolume, val => {
  localStorage.setItem(STORAGE_VOL_KEY, String(val));
});

watch(vibrationEnabled, val => {
  localStorage.setItem(STORAGE_VIB_KEY, String(val));
});

export function useGameSettings() {
  const toggleSfx = () => {
    sfxEnabled.value = !sfxEnabled.value;
  };

  const setSfxVolume = (val: number) => {
    sfxVolume.value = Math.min(100, Math.max(0, Math.round(val)));
  };

  const toggleVibration = () => {
    vibrationEnabled.value = !vibrationEnabled.value;
    if (vibrationEnabled.value && navigator.vibrate) {
      navigator.vibrate(40);
    }
  };

  const triggerHaptic = (ms = 25) => {
    if (vibrationEnabled.value && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        // ignore if not permitted
      }
    }
  };

  return {
    sfxEnabled,
    sfxVolume,
    vibrationEnabled,
    toggleSfx,
    setSfxVolume,
    toggleVibration,
    triggerHaptic,
    // Developer information
    developerName: 'Nicolas Nieto Daza',
    gameVersion: 'v1.0.0',
    appTitle: 'Fruta Clear 3D',
  };
}

export function getSoundVolumeMultiplier(): number {
  if (!sfxEnabled.value) return 0;
  return sfxVolume.value / 100;
}

