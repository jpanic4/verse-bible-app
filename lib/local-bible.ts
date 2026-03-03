import type { VerseResult } from "./bible-api";

let bibleData: Record<string, Record<string, Record<string, string>>> | null = null;

function loadBibleData(): Record<string, Record<string, Record<string, string>>> {
  if (!bibleData) {
    try {
      bibleData = require("@/data/esv-bible.json");
    } catch {
      bibleData = {};
    }
  }
  return bibleData!;
}

const BOOK_ALIASES: Record<string, string> = {
  "psalm": "Psalms",
  "psalms": "Psalms",
  "proverbs": "Proverbs",
  "proverb": "Proverbs",
  "genesis": "Genesis",
  "gen": "Genesis",
  "exod": "Exodus",
  "exodus": "Exodus",
  "lev": "Leviticus",
  "leviticus": "Leviticus",
  "num": "Numbers",
  "numbers": "Numbers",
  "deut": "Deuteronomy",
  "deuteronomy": "Deuteronomy",
  "josh": "Joshua",
  "joshua": "Joshua",
  "judg": "Judges",
  "judges": "Judges",
  "ruth": "Ruth",
  "1 sam": "1 Samuel",
  "1 samuel": "1 Samuel",
  "2 sam": "2 Samuel",
  "2 samuel": "2 Samuel",
  "1 kgs": "1 Kings",
  "1 kings": "1 Kings",
  "2 kgs": "2 Kings",
  "2 kings": "2 Kings",
  "1 chr": "1 Chronicles",
  "1 chronicles": "1 Chronicles",
  "2 chr": "2 Chronicles",
  "2 chronicles": "2 Chronicles",
  "ezra": "Ezra",
  "neh": "Nehemiah",
  "nehemiah": "Nehemiah",
  "esth": "Esther",
  "esther": "Esther",
  "job": "Job",
  "eccl": "Ecclesiastes",
  "ecclesiastes": "Ecclesiastes",
  "song of solomon": "Song of Solomon",
  "song of songs": "Song of Solomon",
  "isa": "Isaiah",
  "isaiah": "Isaiah",
  "jer": "Jeremiah",
  "jeremiah": "Jeremiah",
  "lam": "Lamentations",
  "lamentations": "Lamentations",
  "ezek": "Ezekiel",
  "ezekiel": "Ezekiel",
  "dan": "Daniel",
  "daniel": "Daniel",
  "hos": "Hosea",
  "hosea": "Hosea",
  "joel": "Joel",
  "amos": "Amos",
  "obad": "Obadiah",
  "obadiah": "Obadiah",
  "jonah": "Jonah",
  "mic": "Micah",
  "micah": "Micah",
  "nah": "Nahum",
  "nahum": "Nahum",
  "hab": "Habakkuk",
  "habakkuk": "Habakkuk",
  "zeph": "Zephaniah",
  "zephaniah": "Zephaniah",
  "hag": "Haggai",
  "haggai": "Haggai",
  "zech": "Zechariah",
  "zechariah": "Zechariah",
  "mal": "Malachi",
  "malachi": "Malachi",
  "matt": "Matthew",
  "matthew": "Matthew",
  "mark": "Mark",
  "luke": "Luke",
  "john": "John",
  "acts": "Acts",
  "rom": "Romans",
  "romans": "Romans",
  "1 cor": "1 Corinthians",
  "1 corinthians": "1 Corinthians",
  "2 cor": "2 Corinthians",
  "2 corinthians": "2 Corinthians",
  "gal": "Galatians",
  "galatians": "Galatians",
  "eph": "Ephesians",
  "ephesians": "Ephesians",
  "phil": "Philippians",
  "philippians": "Philippians",
  "col": "Colossians",
  "colossians": "Colossians",
  "1 thess": "1 Thessalonians",
  "1 thessalonians": "1 Thessalonians",
  "2 thess": "2 Thessalonians",
  "2 thessalonians": "2 Thessalonians",
  "1 tim": "1 Timothy",
  "1 timothy": "1 Timothy",
  "2 tim": "2 Timothy",
  "2 timothy": "2 Timothy",
  "titus": "Titus",
  "phlm": "Philemon",
  "philemon": "Philemon",
  "heb": "Hebrews",
  "hebrews": "Hebrews",
  "jas": "James",
  "james": "James",
  "1 pet": "1 Peter",
  "1 peter": "1 Peter",
  "2 pet": "2 Peter",
  "2 peter": "2 Peter",
  "1 john": "1 John",
  "1 jn": "1 John",
  "2 john": "2 John",
  "2 jn": "2 John",
  "3 john": "3 John",
  "3 jn": "3 John",
  "jude": "Jude",
  "rev": "Revelation",
  "revelation": "Revelation",
};

interface ParsedRef {
  book: string;
  chapter: string;
  startVerse: number;
  endVerse: number | null;
}

function parseReference(reference: string): ParsedRef | null {
  const cleaned = reference.replace(/\u2013|\u2014/g, "-").trim();

  const match = cleaned.match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(\d+))?$/);
  if (!match) {
    const chapterOnly = cleaned.match(/^(.+?)\s+(\d+)$/);
    if (chapterOnly) {
      const bookName = resolveBook(chapterOnly[1]);
      if (!bookName) return null;
      return { book: bookName, chapter: chapterOnly[2], startVerse: 1, endVerse: null };
    }
    return null;
  }

  const bookName = resolveBook(match[1]);
  if (!bookName) return null;

  return {
    book: bookName,
    chapter: match[2],
    startVerse: parseInt(match[3], 10),
    endVerse: match[4] ? parseInt(match[4], 10) : null,
  };
}

function resolveBook(input: string): string | null {
  const lower = input.toLowerCase().trim();
  if (BOOK_ALIASES[lower]) return BOOK_ALIASES[lower];

  const data = loadBibleData();
  for (const bookName of Object.keys(data)) {
    if (bookName.toLowerCase() === lower) return bookName;
  }

  for (const bookName of Object.keys(data)) {
    if (bookName.toLowerCase().startsWith(lower)) return bookName;
  }

  return null;
}

export function lookupVerse(reference: string): VerseResult | null {
  const data = loadBibleData();
  if (!data || Object.keys(data).length === 0) return null;

  const parsed = parseReference(reference);
  if (!parsed) return null;

  const bookData = data[parsed.book];
  if (!bookData) return null;

  const chapterData = bookData[parsed.chapter];
  if (!chapterData) return null;

  if (parsed.endVerse === null && parsed.startVerse === 1) {
    const chapterOnly = reference.replace(/\u2013|\u2014/g, "-").trim();
    const isChapterOnlyRef = /^.+?\s+\d+$/.test(chapterOnly);
    if (isChapterOnlyRef) {
      const maxVerse = Math.max(...Object.keys(chapterData).map(Number));
      const parts: string[] = [];
      for (let v = 1; v <= maxVerse; v++) {
        if (chapterData[String(v)]) parts.push(chapterData[String(v)]);
      }
      if (parts.length === 0) return null;
      return {
        reference: `${parsed.book} ${parsed.chapter}`,
        text: parts.join(" "),
        translation: "ESV",
      };
    }
  }

  if (parsed.endVerse === null) {
    const verseText = chapterData[String(parsed.startVerse)];
    if (!verseText) return null;
    return {
      reference: `${parsed.book} ${parsed.chapter}:${parsed.startVerse}`,
      text: verseText,
      translation: "ESV",
    };
  }

  const parts: string[] = [];
  for (let v = parsed.startVerse; v <= parsed.endVerse; v++) {
    const vText = chapterData[String(v)];
    if (vText) parts.push(vText);
  }

  if (parts.length === 0) return null;

  const rangeRef = `${parsed.book} ${parsed.chapter}:${parsed.startVerse}\u2013${parsed.endVerse}`;
  return {
    reference: rangeRef,
    text: parts.join(" "),
    translation: "ESV",
  };
}

export function getRandomProverb(): VerseResult | null {
  const data = loadBibleData();
  if (!data || !data["Proverbs"]) return null;

  const chapters = Object.keys(data["Proverbs"]);
  if (chapters.length === 0) return null;

  const ch = chapters[Math.floor(Math.random() * chapters.length)];
  const verses = Object.keys(data["Proverbs"][ch]);
  if (verses.length === 0) return null;

  const v = verses[Math.floor(Math.random() * verses.length)];
  const text = data["Proverbs"][ch][v];

  return {
    reference: `Proverbs ${ch}:${v}`,
    text,
    translation: "ESV",
  };
}

export function isBibleDataAvailable(): boolean {
  const data = loadBibleData();
  return data !== null && Object.keys(data).length > 10;
}
