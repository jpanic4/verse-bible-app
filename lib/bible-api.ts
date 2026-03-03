import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import { THEMES } from "@/data/themes";
import { DAILY_VERSES } from "@/data/dailyVerses";
import { lookupVerse } from "@/lib/local-bible";

const CACHE_PREFIX = "verse_cache_esv_";
const PRECACHE_KEY = "verse_precache_done_v1";

export interface VerseResult {
  reference: string;
  text: string;
  translation: string;
}

export async function fetchVerse(reference: string): Promise<VerseResult> {
  const local = lookupVerse(reference);
  if (local && local.text) {
    return local;
  }

  const cacheKey = `${CACHE_PREFIX}${reference}`;

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch {}

  const baseUrl = getApiUrl();
  const url = new URL("/api/verse", baseUrl);
  url.searchParams.set("q", reference);

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch verse: ${response.status}`);
  }

  const data = await response.json();

  const result: VerseResult = {
    reference: data.reference || reference,
    text: (data.text || "").trim(),
    translation: data.translation || "ESV",
  };

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
  } catch {}

  return result;
}

export async function fetchMultipleVerses(
  references: string[]
): Promise<VerseResult[]> {
  const results = await Promise.allSettled(
    references.map((ref) => fetchVerse(ref))
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<VerseResult> => r.status === "fulfilled"
    )
    .map((r) => r.value);
}

function getAllStaticReferences(): string[] {
  const refs = new Set<string>();
  for (const theme of THEMES) {
    for (const v of theme.verses) {
      refs.add(v);
    }
  }
  for (const v of DAILY_VERSES) {
    refs.add(v);
  }
  return Array.from(refs);
}

async function isVerseCached(reference: string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(`${CACHE_PREFIX}${reference}`);
    return val !== null;
  } catch {
    return false;
  }
}

export async function precacheStaticVerses(): Promise<void> {
  try {
    const done = await AsyncStorage.getItem(PRECACHE_KEY);
    if (done) return;
  } catch {}

  const allRefs = getAllStaticReferences();

  const uncached: string[] = [];
  for (const ref of allRefs) {
    const cached = await isVerseCached(ref);
    if (!cached) {
      uncached.push(ref);
    }
  }

  if (uncached.length === 0) {
    try {
      await AsyncStorage.setItem(PRECACHE_KEY, "true");
    } catch {}
    return;
  }

  let rateLimited = false;
  let allSucceeded = true;
  const BATCH_SIZE = 5;
  for (let i = 0; i < uncached.length; i += BATCH_SIZE) {
    const batch = uncached.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map((ref) => fetchVerse(ref)));
    for (const r of results) {
      if (r.status === "rejected") {
        allSucceeded = false;
        const msg = r.reason?.message || "";
        if (msg.includes("429") || msg.includes("rate") || msg.includes("throttl")) {
          rateLimited = true;
        }
      }
    }
    if (rateLimited) break;
  }

  if (allSucceeded) {
    try {
      await AsyncStorage.setItem(PRECACHE_KEY, "true");
    } catch {}
  }
}
