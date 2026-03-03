const ESV_API_BASE = "https://api.esv.org/v3/passage/text/";

const BOOKS: Record<string, number> = {
  "Genesis": 50, "Exodus": 40, "Leviticus": 27, "Numbers": 36, "Deuteronomy": 34,
  "Joshua": 24, "Judges": 21, "Ruth": 4, "1 Samuel": 31, "2 Samuel": 24,
  "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
  "Ezra": 10, "Nehemiah": 13, "Esther": 10, "Job": 42, "Psalms": 150,
  "Proverbs": 31, "Ecclesiastes": 12, "Song of Solomon": 8,
  "Isaiah": 66, "Jeremiah": 52, "Lamentations": 5, "Ezekiel": 48, "Daniel": 12,
  "Hosea": 14, "Joel": 3, "Amos": 9, "Obadiah": 1, "Jonah": 4,
  "Micah": 7, "Nahum": 3, "Habakkuk": 3, "Zephaniah": 3, "Haggai": 2,
  "Zechariah": 14, "Malachi": 4,
  "Matthew": 28, "Mark": 16, "Luke": 24, "John": 21, "Acts": 28,
  "Romans": 16, "1 Corinthians": 16, "2 Corinthians": 13, "Galatians": 6,
  "Ephesians": 6, "Philippians": 4, "Colossians": 4,
  "1 Thessalonians": 5, "2 Thessalonians": 3, "1 Timothy": 6, "2 Timothy": 4,
  "Titus": 3, "Philemon": 1, "Hebrews": 13, "James": 5,
  "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1, "3 John": 1,
  "Jude": 1, "Revelation": 22,
};

const DELAY_MS = 150;
const BATCH_SIZE = 10;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchChapter(book: string, chapter: number, apiKey: string): Promise<Record<string, string>> {
  const query = `${book} ${chapter}`;
  const params = new URLSearchParams({
    q: query,
    "include-headings": "false",
    "include-footnotes": "false",
    "include-verse-numbers": "true",
    "include-short-copyright": "false",
    "include-passage-references": "false",
    "include-footnote-body": "false",
  });

  const response = await fetch(`${ESV_API_BASE}?${params.toString()}`, {
    headers: { Authorization: `Token ${apiKey}` },
  });

  if (response.status === 429) {
    console.log(`  Rate limited on ${query}, waiting 30s...`);
    await sleep(30000);
    return fetchChapter(book, chapter, apiKey);
  }

  if (!response.ok) {
    throw new Error(`ESV API error ${response.status} for ${query}`);
  }

  const data = await response.json();
  const text = (data.passages || []).join(" ");

  const verses: Record<string, string> = {};
  const parts = text.split(/\[(\d+)\]\s*/);

  for (let i = 1; i < parts.length; i += 2) {
    const verseNum = parts[i];
    const verseText = (parts[i + 1] || "").replace(/\s+/g, " ").trim();
    if (verseText) {
      verses[verseNum] = verseText;
    }
  }

  return verses;
}

async function main() {
  const apiKey = process.env.ESV_API_KEY;
  if (!apiKey) {
    console.error("ESV_API_KEY environment variable is required");
    process.exit(1);
  }

  const fs = await import("fs");
  const path = await import("path");

  const outputPath = path.join(__dirname, "..", "data", "esv-bible.json");

  let bible: Record<string, Record<string, Record<string, string>>> = {};
  if (fs.existsSync(outputPath)) {
    try {
      bible = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      console.log("Resuming from existing file...");
    } catch {
      bible = {};
    }
  }

  const totalChapters = Object.values(BOOKS).reduce((a, b) => a + b, 0);
  let completed = 0;
  let skipped = 0;

  for (const [book, chapters] of Object.entries(BOOKS)) {
    if (!bible[book]) bible[book] = {};

    for (let ch = 1; ch <= chapters; ch++) {
      const chStr = String(ch);
      if (bible[book][chStr] && Object.keys(bible[book][chStr]).length > 0) {
        completed++;
        skipped++;
        continue;
      }

      try {
        const verses = await fetchChapter(book, ch, apiKey);
        bible[book][chStr] = verses;
        completed++;
        console.log(`[${completed}/${totalChapters}] ${book} ${ch} - ${Object.keys(verses).length} verses`);
      } catch (err: any) {
        console.error(`Error fetching ${book} ${ch}: ${err.message}`);
        completed++;
      }

      await sleep(DELAY_MS);

      if (completed % 25 === 0) {
        fs.writeFileSync(outputPath, JSON.stringify(bible));
        console.log(`  Saved checkpoint at ${completed} chapters`);
      }
    }
  }

  fs.writeFileSync(outputPath, JSON.stringify(bible));
  console.log(`\nDone! ${completed} chapters fetched (${skipped} skipped/resumed).`);
  console.log(`Output: ${outputPath}`);

  let totalVerses = 0;
  for (const book of Object.values(bible)) {
    for (const chapter of Object.values(book)) {
      totalVerses += Object.keys(chapter).length;
    }
  }
  console.log(`Total verses: ${totalVerses}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
