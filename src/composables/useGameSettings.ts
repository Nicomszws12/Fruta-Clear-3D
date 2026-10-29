// src/composables/useGameSettings.ts
import { ref, watch } from 'vue';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const STORAGE_SFX_KEY = 'fruta_clear_sfx_enabled';
const STORAGE_VOL_KEY = 'fruta_clear_sfx_volume';
const STORAGE_MUSIC_KEY = 'fruta_clear_music_enabled';
const STORAGE_MUSIC_VOL_KEY = 'fruta_clear_music_volume';
const STORAGE_VIB_KEY = 'fruta_clear_vibration_enabled';

// Load stored preferences or defaults
const initialSfx = localStorage.getItem(STORAGE_SFX_KEY) !== 'false';
const initialVol = parseInt(localStorage.getItem(STORAGE_VOL_KEY) || '80', 10);
const initialMusic = localStorage.getItem(STORAGE_MUSIC_KEY) !== 'false';
const initialMusicVol = parseInt(localStorage.getItem(STORAGE_MUSIC_VOL_KEY) || '45', 10);
const initialVib = localStorage.getItem(STORAGE_VIB_KEY) !== 'false';

const sfxEnabled = ref(initialSfx);
const sfxVolume = ref(Number.isNaN(initialVol) ? 80 : Math.min(100, Math.max(0, initialVol)));
const musicEnabled = ref(initialMusic);
const musicVolume = ref(Number.isNaN(initialMusicVol) ? 45 : Math.min(100, Math.max(0, initialMusicVol)));
const vibrationEnabled = ref(initialVib);

// Sync to localStorage
watch(sfxEnabled, val => {
  localStorage.setItem(STORAGE_SFX_KEY, String(val));
});

watch(sfxVolume, val => {
  localStorage.setItem(STORAGE_VOL_KEY, String(val));
});

watch(musicEnabled, val => {
  localStorage.setItem(STORAGE_MUSIC_KEY, String(val));
});

watch(musicVolume, val => {
  localStorage.setItem(STORAGE_MUSIC_VOL_KEY, String(val));
});

watch(vibrationEnabled, val => {
  localStorage.setItem(STORAGE_VIB_KEY, String(val));
});

export function triggerHaptic(ms = 25, style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') {
  if (!vibrationEnabled.value) return;

  // Prefer Capacitor native Haptics when available, with navigator.vibrate fallback
  (async () => {
    try {
      if (style === 'success') {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (style === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else {
        const impactStyle =
          style === 'heavy'
            ? ImpactStyle.Heavy
            : style === 'medium'
              ? ImpactStyle.Medium
              : ImpactStyle.Light;
        await Haptics.impact({ style: impactStyle });
      }
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(ms);
        } catch {
          // ignore if not permitted
        }
      }
    }
  })();
}

export function useGameSettings() {
  const toggleSfx = () => {
    sfxEnabled.value = !sfxEnabled.value;
  };

  const setSfxVolume = (val: number) => {
    sfxVolume.value = Math.min(100, Math.max(0, Math.round(val)));
  };

  const toggleMusic = () => {
    musicEnabled.value = !musicEnabled.value;
  };

  const setMusicVolume = (val: number) => {
    musicVolume.value = Math.min(100, Math.max(0, Math.round(val)));
  };

  const toggleVibration = () => {
    vibrationEnabled.value = !vibrationEnabled.value;
    if (vibrationEnabled.value) {
      triggerHaptic(40, 'medium');
    }
  };

  return {
    sfxEnabled,
    sfxVolume,
    musicEnabled,
    musicVolume,
    vibrationEnabled,
    toggleSfx,
    setSfxVolume,
    toggleMusic,
    setMusicVolume,
    toggleVibration,
    triggerHaptic,
    // Developer information
    developerName: 'Nicolas Nieto Daza',
    gameVersion: 'v1.1.0',
    appTitle: 'Fruta Clear 3D',
  };
}

export function getSoundVolumeMultiplier(): number {
  if (!sfxEnabled.value) return 0;
  return sfxVolume.value / 100;
}

export function getMusicVolumeMultiplier(): number {
  if (!musicEnabled.value) return 0;
  return musicVolume.value / 100;
}
