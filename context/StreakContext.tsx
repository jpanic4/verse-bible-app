import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "streak_data";

export type ActivityType = "daily_verse" | "practice" | "srs_review" | "srs_perfect" | "challenge";

const XP_AWARDS: Record<ActivityType, number> = {
  daily_verse: 10,
  practice: 25,
  srs_review: 15,
  srs_perfect: 30,
  challenge: 50,
};

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  totalXP: number;
  todayXP: number;
  todayDate: string;
  totalVersesReviewed: number;
  totalPracticeSessions: number;
}

interface StreakContextValue {
  streak: StreakData;
  recordActivity: (type: ActivityType) => void;
  checkAndUpdateStreak: () => void;
  isLoading: boolean;
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

const DEFAULT_STREAK: StreakData = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: "",
  totalXP: 0,
  todayXP: 0,
  todayDate: getTodayStr(),
  totalVersesReviewed: 0,
  totalPracticeSessions: 0,
};

const StreakContext = createContext<StreakContextValue | null>(null);

export function StreakProvider({ children }: { children: ReactNode }) {
  const [streak, setStreak] = useState<StreakData>(DEFAULT_STREAK);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed: StreakData = JSON.parse(stored);
          const today = getTodayStr();
          if (parsed.todayDate !== today) {
            parsed.todayXP = 0;
            parsed.todayDate = today;
          }
          setStreak(parsed);
        }
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (data: StreakData) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  const checkAndUpdateStreak = useCallback(() => {
    setStreak((prev) => {
      const today = getTodayStr();
      const yesterday = getYesterdayStr();

      if (prev.todayDate !== today) {
        const next = { ...prev, todayXP: 0, todayDate: today };
        if (prev.lastActivityDate !== today && prev.lastActivityDate !== yesterday) {
          next.currentStreak = 0;
        }
        persist(next);
        return next;
      }
      return prev;
    });
  }, [persist]);

  const recordActivity = useCallback((type: ActivityType) => {
    setStreak((prev) => {
      const today = getTodayStr();
      const yesterday = getYesterdayStr();
      const xp = XP_AWARDS[type];

      const next = { ...prev };

      if (next.todayDate !== today) {
        next.todayXP = 0;
        next.todayDate = today;
      }

      if (next.lastActivityDate !== today) {
        if (next.lastActivityDate === yesterday) {
          next.currentStreak += 1;
        } else if (next.lastActivityDate === "") {
          next.currentStreak = 1;
        } else {
          next.currentStreak = 1;
        }
        next.lastActivityDate = today;
      }

      if (next.currentStreak > next.longestStreak) {
        next.longestStreak = next.currentStreak;
      }

      next.totalXP += xp;
      next.todayXP += xp;

      if (type === "srs_review" || type === "srs_perfect") {
        next.totalVersesReviewed += 1;
      }
      if (type === "practice" || type === "challenge") {
        next.totalPracticeSessions += 1;
      }

      persist(next);
      return next;
    });
  }, [persist]);

  const value = useMemo(
    () => ({ streak, recordActivity, checkAndUpdateStreak, isLoading }),
    [streak, recordActivity, checkAndUpdateStreak, isLoading]
  );

  return (
    <StreakContext.Provider value={value}>
      {children}
    </StreakContext.Provider>
  );
}

export function useStreak() {
  const context = useContext(StreakContext);
  if (!context) {
    throw new Error("useStreak must be used within StreakProvider");
  }
  return context;
}
