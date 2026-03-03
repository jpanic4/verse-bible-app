import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSavedVerses } from "@/context/SavedVersesContext";

const STORAGE_KEY = "srs_data";

export interface SRSVerseData {
  reference: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReviewDate: string;
  lastReviewDate: string;
}

interface SRSContextValue {
  srsData: Record<string, SRSVerseData>;
  getDueVerses: () => SRSVerseData[];
  getDueCount: () => number;
  recordReview: (reference: string, quality: number) => void;
  getVerseProgress: (reference: string) => SRSVerseData | null;
  isLoading: boolean;
}

const SRSContext = createContext<SRSContextValue | null>(null);

function createInitialSRSData(reference: string): SRSVerseData {
  const now = new Date();
  return {
    reference,
    interval: 1,
    easeFactor: 2.5,
    repetitions: 0,
    nextReviewDate: now.toISOString(),
    lastReviewDate: now.toISOString(),
  };
}

function calculateSM2(data: SRSVerseData, quality: number): SRSVerseData {
  const q = Math.max(0, Math.min(5, quality));
  let { interval, easeFactor, repetitions } = data;

  if (q >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));

  const now = new Date();
  const nextReview = new Date(now);
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    ...data,
    interval,
    easeFactor,
    repetitions,
    nextReviewDate: nextReview.toISOString(),
    lastReviewDate: now.toISOString(),
  };
}

export function SRSProvider({ children }: { children: ReactNode }) {
  const [srsData, setSrsData] = useState<Record<string, SRSVerseData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { savedVerses } = useSavedVerses();

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSrsData(JSON.parse(stored));
        }
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (data: Record<string, SRSVerseData>) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {}
  }, []);

  useEffect(() => {
    if (isLoading) return;
    setSrsData((prev) => {
      const savedRefs = new Set(savedVerses.map((v) => v.reference));
      const next = { ...prev };
      let changed = false;

      for (const verse of savedVerses) {
        if (!next[verse.reference]) {
          next[verse.reference] = createInitialSRSData(verse.reference);
          changed = true;
        }
      }

      for (const ref of Object.keys(next)) {
        if (!savedRefs.has(ref)) {
          delete next[ref];
          changed = true;
        }
      }

      if (changed) {
        persist(next);
        return next;
      }
      return prev;
    });
  }, [savedVerses, isLoading, persist]);

  const getDueVerses = useCallback((): SRSVerseData[] => {
    const now = new Date();
    return Object.values(srsData).filter((d) => new Date(d.nextReviewDate) <= now);
  }, [srsData]);

  const getDueCount = useCallback((): number => {
    const now = new Date();
    return Object.values(srsData).filter((d) => new Date(d.nextReviewDate) <= now).length;
  }, [srsData]);

  const recordReview = useCallback((reference: string, quality: number) => {
    setSrsData((prev) => {
      const existing = prev[reference];
      if (!existing) return prev;
      const updated = calculateSM2(existing, quality);
      const next = { ...prev, [reference]: updated };
      persist(next);
      return next;
    });
  }, [persist]);

  const getVerseProgress = useCallback((reference: string): SRSVerseData | null => {
    return srsData[reference] || null;
  }, [srsData]);

  const value = useMemo(
    () => ({ srsData, getDueVerses, getDueCount, recordReview, getVerseProgress, isLoading }),
    [srsData, getDueVerses, getDueCount, recordReview, getVerseProgress, isLoading]
  );

  return (
    <SRSContext.Provider value={value}>
      {children}
    </SRSContext.Provider>
  );
}

export function useSRS() {
  const context = useContext(SRSContext);
  if (!context) {
    throw new Error("useSRS must be used within SRSProvider");
  }
  return context;
}
