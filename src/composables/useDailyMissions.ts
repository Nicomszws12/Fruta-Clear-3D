/**
 * useDailyMissions — daily retention missions composable.
 *
 * Automatically resets each calendar day (YYYY-MM-DD) and persists
 * progress to LocalStorage + Capacitor Preferences.
 */
import { ref, computed } from 'vue';
import { Preferences } from '@capacitor/preferences';
import type { DailyMission, DailyMissionType } from '../game/types';
import { playPowerup } from '../game/sounds';

const DAILY_MISSIONS_KEY = 'fruta_clear_daily_missions_v1';

interface StoredDailyMissions {
  dateKey: string;
  missions: DailyMission[];
}

function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createDefaultMissions(dateKey: string): DailyMission[] {
  return [
    {
      id: `levels_${dateKey}`,
      type: 'levels_won',
      title: 'Explorador del Día',
      description: 'Supera 3 niveles en el día de hoy',
      icon: '🏆',
      target: 3,
      progress: 0,
      rewardCoins: 25,
      claimed: false,
    },
    {
      id: `combos_${dateKey}`,
      type: 'combos',
      title: 'Maestro del Combo',
      description: 'Consigue 5 combos rápidos (x2 o más)',
      icon: '🔥',
      target: 5,
      progress: 0,
      rewardCoins: 20,
      claimed: false,
    },
    {
      id: `tiles_${dateKey}`,
      type: 'tiles_cleared',
      title: 'Cosecha Frutal',
      description: 'Despeja 90 fichas en total hoy',
      icon: '🍓',
      target: 90,
      progress: 0,
      rewardCoins: 15,
      claimed: false,
    },
  ];
}

function loadMissions(): DailyMission[] {
  const today = getTodayKey();
  try {
    const raw = localStorage.getItem(DAILY_MISSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredDailyMissions;
      if (parsed.dateKey === today && Array.isArray(parsed.missions)) {
        return parsed.missions;
      }
    }
  } catch {
    // ignore
  }
  return createDefaultMissions(today);
}

const missions = ref<DailyMission[]>(loadMissions());

function saveMissions() {
  const payload: StoredDailyMissions = {
    dateKey: getTodayKey(),
    missions: missions.value,
  };
  try {
    const str = JSON.stringify(payload);
    localStorage.setItem(DAILY_MISSIONS_KEY, str);
    Preferences.set({ key: DAILY_MISSIONS_KEY, value: str }).catch(() => {});
  } catch {
    // ignore
  }
}

export function useDailyMissions() {
  const ensureToday = () => {
    const today = getTodayKey();
    if (!missions.value[0]?.id.endsWith(today)) {
      missions.value = createDefaultMissions(today);
      saveMissions();
    }
  };

  const incrementMission = (type: DailyMissionType, amount = 1) => {
    ensureToday();
    let changed = false;
    missions.value = missions.value.map(m => {
      if (m.type !== type || m.claimed) return m;
      const nextProg = Math.min(m.target, m.progress + amount);
      if (nextProg !== m.progress) {
        changed = true;
        return { ...m, progress: nextProg };
      }
      return m;
    });
    if (changed) saveMissions();
  };

  const recordLevelWin = () => incrementMission('levels_won', 1);
  const recordCombo = () => incrementMission('combos', 1);
  const recordTilesCleared = (count = 3) => incrementMission('tiles_cleared', count);

  const claimMissionReward = async (
    missionId: string,
    addCoinsFn: (amount: number) => Promise<void>,
  ): Promise<number> => {
    ensureToday();
    const target = missions.value.find(m => m.id === missionId);
    if (!target || target.claimed || target.progress < target.target) return 0;

    target.claimed = true;
    saveMissions();
    playPowerup();
    await addCoinsFn(target.rewardCoins);
    return target.rewardCoins;
  };

  const unclaimedCount = computed(() =>
    missions.value.filter(m => !m.claimed && m.progress >= m.target).length,
  );

  return {
    missions,
    unclaimedCount,
    recordLevelWin,
    recordCombo,
    recordTilesCleared,
    claimMissionReward,
  };
}

