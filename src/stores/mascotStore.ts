import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { getRecentWorkoutRecords } from '../database/workoutRecordRepository';
import { calculateWorkoutStatistics } from '../services/statisticsService';
import { startOfLocalDay, toLocalDateKey } from '../utils/date';

const LAST_VISIT_KEY = 'plank-guide:mascot-last-visit';
const DEFAULT_MESSAGE_DURATION_MS = 6500;

interface MascotStore {
  message: string | null;
  greeted: boolean;
  say: (message: string, durationMs?: number) => void;
  clearMessage: () => void;
  greetOnLaunch: () => Promise<void>;
}

let messageTimer: ReturnType<typeof setTimeout> | null = null;

function parseDateKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

interface GreetingContext {
  isFirstVisit: boolean;
  daysSinceLastVisit: number | null;
  streakDays: number;
  hasWorkedOutToday: boolean;
}

function buildGreeting(context: GreetingContext): string {
  if (context.isFirstVisit) {
    return '처음 오셨네요! 저랑 같이 플랭크 시작해봐요.';
  }
  if (context.daysSinceLastVisit != null && context.daysSinceLastVisit >= 2) {
    return `${context.daysSinceLastVisit}일 만이에요! 다시 와주셔서 반가워요.`;
  }
  if (context.hasWorkedOutToday) {
    return context.streakDays >= 2
      ? `오늘까지 ${context.streakDays}일 연속 운동 중! 정말 대단해요.`
      : '오늘 운동을 벌써 끝내셨네요. 멋져요!';
  }
  if (context.streakDays >= 2) {
    return `${context.streakDays}일 연속 운동 중이에요! 오늘도 이어가볼까요?`;
  }
  return '어서 오세요! 오늘도 가볍게 시작해봐요.';
}

export const useMascotStore = create<MascotStore>((set, get) => ({
  message: null,
  greeted: false,
  say: (message, durationMs = DEFAULT_MESSAGE_DURATION_MS) => {
    if (messageTimer) clearTimeout(messageTimer);
    set({ message });
    messageTimer = setTimeout(() => {
      set({ message: null });
      messageTimer = null;
    }, durationMs);
  },
  clearMessage: () => {
    if (messageTimer) clearTimeout(messageTimer);
    messageTimer = null;
    set({ message: null });
  },
  greetOnLaunch: async () => {
    if (get().greeted) return;
    set({ greeted: true });

    const now = new Date();
    let isFirstVisit = false;
    let daysSinceLastVisit: number | null = null;
    try {
      const storedKey = await AsyncStorage.getItem(LAST_VISIT_KEY);
      if (!storedKey) {
        isFirstVisit = true;
      } else {
        const lastVisitDay = parseDateKey(storedKey);
        if (lastVisitDay) {
          const diffMs = startOfLocalDay(now).getTime() - lastVisitDay.getTime();
          daysSinceLastVisit = Math.max(0, Math.round(diffMs / 86_400_000));
        }
      }
      await AsyncStorage.setItem(LAST_VISIT_KEY, toLocalDateKey(now));
    } catch (error) {
      if (__DEV__) console.warn('Mascot last-visit lookup failed', error);
    }

    let streakDays = 0;
    let hasWorkedOutToday = false;
    try {
      const records = await getRecentWorkoutRecords(365);
      const statistics = calculateWorkoutStatistics(records, now);
      streakDays = statistics.streakDays;
      hasWorkedOutToday = statistics.hasWorkedOutToday;
    } catch (error) {
      if (__DEV__) console.warn('Mascot statistics lookup failed', error);
    }

    get().say(buildGreeting({ isFirstVisit, daysSinceLastVisit, streakDays, hasWorkedOutToday }));
  },
}));
