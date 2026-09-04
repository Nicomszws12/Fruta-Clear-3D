// src/game/sounds.ts
import { getSoundVolumeMultiplier } from '../composables/useGameSettings';

let audioCtx: AudioContext | null = null;

// Initialize audio context on first interaction
export const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

// Generates a simple tone
const playTone = (frequency: number, type: OscillatorType, duration: number, vol: number = 0.1, startTimeOffset: number = 0) => {
    const masterVol = getSoundVolumeMultiplier();
    if (masterVol <= 0) return;
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const effectiveVol = vol * masterVol;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime + startTimeOffset);

    // Envelope
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime + startTimeOffset);
    gainNode.gain.linearRampToValueAtTime(effectiveVol, audioCtx.currentTime + startTimeOffset + 0.05); // attack
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startTimeOffset + duration); // decay

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start(audioCtx.currentTime + startTimeOffset);
    oscillator.stop(audioCtx.currentTime + startTimeOffset + duration);
};

// Preload / pool Kenney audio objects
const audioPool: Record<string, HTMLAudioElement[]> = {};
const POOL_SIZE = 3;

const getPooledAudio = (path: string): HTMLAudioElement => {
  if (!audioPool[path]) {
    audioPool[path] = Array.from({ length: POOL_SIZE }, () => new Audio(path));
  }
  const pool = audioPool[path];
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].paused || pool[i].ended) {
      return pool[i];
    }
  }
  return pool[0];
};

const playAudioFile = (path: string, volume = 0.5, fallback?: () => void) => {
  const masterVol = getSoundVolumeMultiplier();
  if (masterVol <= 0) return;

  try {
    const sound = getPooledAudio(path);
    sound.volume = Math.min(1, Math.max(0, volume * masterVol));
    sound.currentTime = 0;
    sound.play().catch(() => {
      if (fallback) fallback();
    });
  } catch {
    if (fallback) fallback();
  }
};

export const playClick = () => {
    initAudio();
    playAudioFile('/sounds/click-a.ogg', 0.6, () => {
        playTone(600, 'sine', 0.1, 0.05);
    });
};

export const playTap = () => {
    initAudio();
    playAudioFile('/sounds/tap-a.ogg', 0.6, () => {
        playTone(700, 'sine', 0.08, 0.04);
    });
};

export const playSwitch = () => {
    initAudio();
    playAudioFile('/sounds/switch-a.ogg', 0.6, () => {
        playTone(850, 'sine', 0.1, 0.05);
    });
};

export const playMatch = () => {
    initAudio();
    // Arpegio ascendente
    playTone(440, 'sine', 0.15, 0.05, 0);      // A4
    playTone(554.37, 'sine', 0.15, 0.05, 0.05); // C#5
    playTone(659.25, 'sine', 0.2, 0.05, 0.1);   // E5
};

export const playCombo = (multiplier: number) => {
    initAudio();
    const baseFreq = 500 + (multiplier * 100);
    playTone(baseFreq, 'square', 0.1, 0.03, 0);
    playTone(baseFreq * 1.25, 'square', 0.15, 0.03, 0.05);
    playTone(baseFreq * 1.5, 'square', 0.25, 0.03, 0.1);
};

export const playWin = () => {
    initAudio();
    // C Major Fanfare
    playTone(523.25, 'triangle', 0.15, 0.1, 0);       // C5
    playTone(659.25, 'triangle', 0.15, 0.1, 0.15);    // E5
    playTone(783.99, 'triangle', 0.15, 0.1, 0.3);     // G5
    playTone(1046.50, 'triangle', 0.4, 0.1, 0.45);    // C6
};

export const playLose = () => {
    initAudio();
    // Sad descending trombone-like tones
    playTone(300, 'sawtooth', 0.3, 0.05, 0);
    playTone(280, 'sawtooth', 0.3, 0.05, 0.2);
    playTone(250, 'sawtooth', 0.5, 0.05, 0.4);
};

export const playPowerup = () => {
    initAudio();
    playTone(800, 'sine', 0.1, 0.05, 0);
    playTone(1200, 'sine', 0.1, 0.05, 0.05);
    playTone(1600, 'sine', 0.2, 0.05, 0.1);
    playTone(1000, 'sine', 0.3, 0.05, 0.15);
};

