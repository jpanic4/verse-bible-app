import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { VerseResult } from "@/lib/bible-api";

const STORAGE_KEY = "saved_verses";

interface SavedVersesContextValue {
  savedVerses: VerseResult[];
  isSaved: (reference: string) => boolean;
  toggleSave: (verse: VerseResult) => void;
  removeSaved: (reference: string) => void;
  isLoading: boolean;
}

const SavedVersesContext = createContext<SavedVersesContextValue | null>(null);

export function SavedVersesProvider({ children }: { children: ReactNode }) {
  const [savedVerses, setSavedVerses] = useState<VerseResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setSavedVerses(JSON.parse(stored));
        }
      } catch {} finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (verses: VerseResult[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(verses));
    } catch {}
  }, []);

  const isSaved = useCallback(
    (reference: string) => savedVerses.some((v) => v.reference === reference),
    [savedVerses]
  );

  const toggleSave = useCallback(
    (verse: VerseResult) => {
      setSavedVerses((prev) => {
        const exists = prev.some((v) => v.reference === verse.reference);
        const next = exists
          ? prev.filter((v) => v.reference !== verse.reference)
          : [verse, ...prev];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeSaved = useCallback(
    (reference: string) => {
      setSavedVerses((prev) => {
        const next = prev.filter((v) => v.reference !== reference);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const value = useMemo(
    () => ({ savedVerses, isSaved, toggleSave, removeSaved, isLoading }),
    [savedVerses, isSaved, toggleSave, removeSaved, isLoading]
  );

  return (
    <SavedVersesContext.Provider value={value}>
      {children}
    </SavedVersesContext.Provider>
  );
}

export function useSavedVerses() {
  const context = useContext(SavedVersesContext);
  if (!context) {
    throw new Error("useSavedVerses must be used within SavedVersesProvider");
  }
  return context;
}
