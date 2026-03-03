const EVOLINK_BASE_URL = "https://api.evolink.ai/v1";

interface GenerateSongRequest {
  verseText: string;
  reference: string;
  genre: string;
}

interface SongTask {
  task_id: string;
  status: string;
}

interface SongStatus {
  status: string;
  audio_url?: string;
  title?: string;
  lyrics?: string;
  error?: string;
}

interface CachedSong {
  audio_url: string;
  title?: string;
  reference: string;
  genre: string;
  created_at: number;
}

const songCache = new Map<string, CachedSong>();

function getCacheKey(reference: string, genre: string): string {
  return `${reference.toLowerCase().trim()}::${genre.toLowerCase().trim()}`;
}

export function getCachedSong(reference: string, genre: string): CachedSong | null {
  const key = getCacheKey(reference, genre);
  return songCache.get(key) || null;
}

export function cacheSong(reference: string, genre: string, audioUrl: string, title?: string): void {
  const key = getCacheKey(reference, genre);
  songCache.set(key, {
    audio_url: audioUrl,
    title,
    reference,
    genre,
    created_at: Date.now(),
  });
}

export async function createSongTask(req: GenerateSongRequest & { forceNew?: boolean }): Promise<SongTask | { cached: true; audio_url: string }> {
  if (!req.forceNew) {
    const cached = getCachedSong(req.reference, req.genre);
    if (cached) {
      return { cached: true, audio_url: cached.audio_url };
    }
  }

  const apiKey = process.env.EVOLINK_API_KEY;
  if (!apiKey) {
    throw new Error("EVOLINK_API_KEY is not configured");
  }

  const lyrics = `[Verse 1]\n${req.verseText}\n\n[Chorus]\n${req.reference}\n${req.verseText}`;

  const payload = {
    prompt: lyrics,
    model: "suno-v5",
    custom_mode: true,
    style: req.genre.toLowerCase(),
    title: `${req.reference} - Scripture Song`,
    instrumental: false,
  };

  const response = await fetch(`${EVOLINK_BASE_URL}/audios/generations`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if (response.status === 402 || errorText.includes("insufficient_quota")) {
      throw new Error("Song generation is temporarily unavailable — the music service credits have been used up. Please try again later.");
    }
    throw new Error(`Evolink API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.status === "completed" && data.result_data?.length > 0) {
    const audioUrl = data.result_data[0].audio_url || data.result_data[0].stream_audio_url;
    const title = data.result_data[0].title;
    if (audioUrl) {
      cacheSong(req.reference, req.genre, audioUrl, title);
      return { cached: true, audio_url: audioUrl };
    }
  }

  return {
    task_id: data.id || data.task_id,
    status: data.status || "processing",
  };
}

export async function getSongStatus(taskId: string): Promise<SongStatus> {
  const apiKey = process.env.EVOLINK_API_KEY;
  if (!apiKey) {
    throw new Error("EVOLINK_API_KEY is not configured");
  }

  const response = await fetch(`${EVOLINK_BASE_URL}/tasks/${taskId}`, {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Evolink API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.status === "completed") {
    let audioUrl: string | undefined;
    let title: string | undefined;

    if (data.result_data?.length > 0) {
      audioUrl = data.result_data[0].audio_url || data.result_data[0].stream_audio_url;
      title = data.result_data[0].title;
    } else if (data.results?.length > 0) {
      audioUrl = data.results[0];
    }

    return {
      status: "completed",
      audio_url: audioUrl,
      title,
    };
  }

  if (data.status === "failed" || data.status === "error") {
    return {
      status: "failed",
      error: data.error || "Song generation failed",
    };
  }

  return {
    status: data.status || "processing",
  };
}
