import { createContext, useContext, useState, useRef, useCallback, useEffect, type ReactNode } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";

interface AudioPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentReference: string | null;
  toggleAudio: (reference: string) => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerState>({
  isPlaying: false,
  isLoading: false,
  currentReference: null,
  toggleAudio: async () => {},
});

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentReference, setCurrentReference] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  const cleanup = useCallback(async () => {
    if (Platform.OS === "web") {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.src = "";
        webAudioRef.current = null;
      }
    } else {
      if (soundRef.current) {
        try {
          await soundRef.current.unloadAsync();
        } catch {}
        soundRef.current = null;
      }
    }
    setCurrentReference(null);
    setIsPlaying(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.src = "";
      }
    };
  }, []);

  const toggleAudio = useCallback(async (reference: string) => {
    if (Platform.OS === "web") {
      if (currentReference === reference && webAudioRef.current) {
        if (isPlaying) {
          webAudioRef.current.pause();
          setIsPlaying(false);
        } else {
          webAudioRef.current.play().catch((e) => console.error("Web audio play error:", e));
          setIsPlaying(true);
        }
        return;
      }

      await cleanup();
      setIsLoading(true);
      setCurrentReference(reference);

      try {
        const baseUrl = getApiUrl();
        const url = new URL("/api/verse-audio", baseUrl);
        url.searchParams.set("q", reference);

        const res = await globalThis.fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch audio URL");
        const data = await res.json();

        const audio = new globalThis.Audio(data.audioUrl);
        audio.addEventListener("ended", () => {
          setIsPlaying(false);
          setCurrentReference(null);
          webAudioRef.current = null;
        });
        audio.addEventListener("error", (e) => {
          console.error("Web audio error:", e);
          setIsPlaying(false);
          setCurrentReference(null);
          webAudioRef.current = null;
        });

        webAudioRef.current = audio;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio playback error:", err);
        setCurrentReference(null);
      } finally {
        setIsLoading(false);
      }
    } else {
      if (currentReference === reference && soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      await cleanup();
      setIsLoading(true);
      setCurrentReference(reference);

      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const baseUrl = getApiUrl();
        const url = new URL("/api/verse-audio", baseUrl);
        url.searchParams.set("q", reference);

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed to fetch audio URL");
        const data = await res.json();

        const { sound } = await Audio.Sound.createAsync(
          { uri: data.audioUrl },
          { shouldPlay: true }
        );

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setCurrentReference(null);
            sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });

        soundRef.current = sound;
        setIsPlaying(true);
      } catch (err) {
        console.error("Audio playback error:", err);
        setCurrentReference(null);
      } finally {
        setIsLoading(false);
      }
    }
  }, [isPlaying, currentReference, cleanup]);

  return (
    <AudioPlayerContext.Provider value={{ isPlaying, isLoading, currentReference, toggleAudio }}>
      {children}
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer() {
  return useContext(AudioPlayerContext);
}
