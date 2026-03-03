import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { createSongTask, getSongStatus, getCachedSong, cacheSong } from "./evolink";
import { generateQuiz, generateChallenge } from "./openai";
import { getCategoryById } from "../data/bible-challenge";

const ESV_API_BASE = "https://api.esv.org/v3/passage/text/";
const ESV_AUDIO_BASE = "https://api.esv.org/v3/passage/audio/";
const ESV_SEARCH_BASE = "https://api.esv.org/v3/passage/search/";

const PROVERBS_CHAPTER_LENGTHS = [
  33, 22, 35, 27, 23, 35, 27, 36, 18, 32,
  31, 28, 25, 35, 33, 33, 28, 24, 29, 30,
  31, 29, 35, 34, 28, 28, 27, 28, 27, 33,
  31,
];

let readingPlanCache: any[] | null = null;

async function fetchReadingPlan(): Promise<any[]> {
  if (readingPlanCache) return readingPlanCache;
  const response = await fetch("https://static.esvmedia.org/api/plans/book-of-common-prayer.json");
  if (!response.ok) throw new Error("Failed to fetch reading plan");
  readingPlanCache = await response.json() as any[];
  return readingPlanCache;
}

async function fetchESVVerse(reference: string): Promise<{ reference: string; text: string; translation: string }> {
  const apiKey = process.env.ESV_API_KEY;
  if (!apiKey) {
    throw new Error("ESV_API_KEY is not configured");
  }

  const params = new URLSearchParams({
    q: reference,
    "include-headings": "false",
    "include-footnotes": "false",
    "include-verse-numbers": "false",
    "include-short-copyright": "false",
    "include-passage-references": "false",
  });

  const response = await fetch(`${ESV_API_BASE}?${params.toString()}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`ESV API error: ${response.status}`);
  }

  const data = await response.json();
  const passages = data.passages || [];
  const text = passages.join(" ").replace(/\s+/g, " ").trim();
  const canonical = data.canonical || reference;

  return { reference: canonical, text, translation: "ESV" };
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/verse", async (req, res) => {
    try {
      const reference = req.query.q as string;
      if (!reference) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const result = await fetchESVVerse(reference);
      res.json(result);
    } catch (error: any) {
      console.error("ESV verse fetch error:", error.message);
      res.status(500).json({ error: error.message || "Failed to fetch verse" });
    }
  });
  app.post("/api/generate-song", async (req, res) => {
    try {
      const { verseText, reference, genre, forceNew } = req.body;
      if (!verseText || !reference || !genre) {
        return res.status(400).json({ error: "verseText, reference, and genre are required" });
      }
      const result = await createSongTask({ verseText, reference, genre, forceNew: !!forceNew });
      res.json(result);
    } catch (error: any) {
      console.error("Song generation error:", error.message);
      res.status(500).json({ error: error.message || "Failed to generate song" });
    }
  });

  app.get("/api/song-cache", async (req, res) => {
    try {
      const reference = req.query.reference as string;
      const genre = req.query.genre as string;
      if (!reference || !genre) {
        return res.status(400).json({ error: "reference and genre are required" });
      }
      const cached = getCachedSong(reference, genre);
      if (cached) {
        res.json({ cached: true, audio_url: cached.audio_url, reference: cached.reference, genre: cached.genre });
      } else {
        res.json({ cached: false });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/song-status/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const reference = req.query.reference as string;
      const genre = req.query.genre as string;
      const result = await getSongStatus(taskId);
      if (result.status === "completed" && result.audio_url && reference && genre) {
        cacheSong(reference, genre, result.audio_url, result.title);
      }
      res.json(result);
    } catch (error: any) {
      console.error("Song status error:", error.message);
      res.status(500).json({ error: error.message || "Failed to get song status" });
    }
  });

  app.post("/api/generate-quiz", async (req, res) => {
    try {
      const { verseText, reference } = req.body;
      if (!verseText || !reference) {
        return res.status(400).json({ error: "verseText and reference are required" });
      }
      const questions = await generateQuiz(verseText, reference);
      res.json({ questions });
    } catch (error: any) {
      console.error("Quiz generation error:", error.message);
      res.status(500).json({ error: error.message || "Failed to generate quiz" });
    }
  });

  app.post("/api/generate-challenge", async (req, res) => {
    try {
      const { category, difficulty, round } = req.body;
      if (!category || !difficulty) {
        return res.status(400).json({ error: "category and difficulty are required" });
      }
      const validDifficulties = ["beginner", "intermediate", "advanced"];
      if (!validDifficulties.includes(difficulty)) {
        return res.status(400).json({ error: "difficulty must be beginner, intermediate, or advanced" });
      }
      const categoryData = getCategoryById(category);
      if (!categoryData) {
        return res.status(400).json({ error: `Unknown category: ${category}` });
      }
      const questions = await generateChallenge(
        categoryData.name,
        difficulty,
        round || 1,
        categoryData.seedTopics
      );
      res.json({ questions });
    } catch (error: any) {
      console.error("Challenge generation error:", error.message);
      res.status(500).json({ error: error.message || "Failed to generate challenge" });
    }
  });

  app.get("/api/verse-audio", async (req, res) => {
    try {
      const reference = req.query.q as string;
      if (!reference) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const apiKey = process.env.ESV_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "ESV_API_KEY is not configured" });
      }
      const params = new URLSearchParams({ q: reference });
      const response = await fetch(`${ESV_AUDIO_BASE}?${params.toString()}`, {
        headers: { Authorization: `Token ${apiKey}` },
        redirect: "follow",
      });
      if (!response.ok) {
        return res.status(response.status).json({ error: "Failed to fetch audio" });
      }
      const audioUrl = response.url;
      res.json({ audioUrl, reference });
    } catch (error: any) {
      console.error("ESV audio fetch error:", error.message);
      res.status(500).json({ error: error.message || "Failed to fetch audio" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const page = req.query.page as string || "1";
      if (!query) {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }
      const apiKey = process.env.ESV_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "ESV_API_KEY is not configured" });
      }
      const params = new URLSearchParams({
        q: query,
        "page-size": "20",
        page,
      });
      const response = await fetch(`${ESV_SEARCH_BASE}?${params.toString()}`, {
        headers: { Authorization: `Token ${apiKey}` },
      });
      if (!response.ok) {
        throw new Error(`ESV Search API error: ${response.status}`);
      }
      const data = await response.json();
      res.json({
        results: data.results || [],
        totalResults: data.total_results || 0,
        page: data.page || 1,
        totalPages: data.total_pages || 1,
      });
    } catch (error: any) {
      console.error("ESV search error:", error.message);
      res.status(500).json({ error: error.message || "Failed to search" });
    }
  });

  app.get("/api/reading-plan", async (req, res) => {
    try {
      const dayParam = req.query.day as string;
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 0);
      const diff = now.getTime() - startOfYear.getTime();
      const defaultDay = Math.floor(diff / (1000 * 60 * 60 * 24));
      const day = dayParam ? parseInt(dayParam, 10) : defaultDay;

      const plan = await fetchReadingPlan();
      const dayIndex = ((day - 1) % plan.length + plan.length) % plan.length;
      const readings = plan[dayIndex];

      res.json({
        day,
        readings: {
          psalm: readings["First Psalm"] || readings["Second Psalm"],
          oldTestament: readings["Old Testament"],
          newTestament: readings["New Testament"],
          gospel: readings["Gospel"],
        },
      });
    } catch (error: any) {
      console.error("Reading plan error:", error.message);
      res.status(500).json({ error: error.message || "Failed to fetch reading plan" });
    }
  });

  app.get("/api/random-proverb", async (req, res) => {
    try {
      const chapter = Math.floor(Math.random() * PROVERBS_CHAPTER_LENGTHS.length) + 1;
      const verse = Math.floor(Math.random() * PROVERBS_CHAPTER_LENGTHS[chapter - 1]) + 1;
      const reference = `Proverbs ${chapter}:${verse}`;
      const result = await fetchESVVerse(reference);
      res.json(result);
    } catch (error: any) {
      console.error("Random proverb error:", error.message);
      res.status(500).json({ error: error.message || "Failed to fetch proverb" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
