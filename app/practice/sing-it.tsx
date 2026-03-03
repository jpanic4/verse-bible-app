import { useState, useRef, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, ActivityIndicator, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio, AVPlaybackStatus } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

const GENRES = [
  { key: "gospel", label: "Gospel", icon: "heart" as const },
  { key: "hymn", label: "Hymn", icon: "musical-note" as const },
  { key: "pop", label: "Pop", icon: "star" as const },
  { key: "country", label: "Country", icon: "leaf" as const },
  { key: "rnb", label: "R&B", icon: "mic" as const },
  { key: "jazz", label: "Jazz", icon: "cafe" as const },
  { key: "folk", label: "Folk", icon: "bonfire" as const },
  { key: "hip-hop", label: "Hip-Hop", icon: "headset" as const },
];

const SONG_CACHE_PREFIX = "song_cache_";

function getSongCacheKey(reference: string, genre: string): string {
  return `${SONG_CACHE_PREFIX}${reference.toLowerCase().trim()}_${genre.toLowerCase().trim()}`;
}

type Status = "idle" | "checking" | "generating" | "polling" | "ready" | "error";

export default function SingItScreen() {
  const { reference, text } = useLocalSearchParams<{ reference: string; text: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const [verseExpanded, setVerseExpanded] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressBarWidth = useRef(0);
  const isRepeatRef = useRef(false);

  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current.src = "";
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  const saveSongToLocalCache = async (ref: string, genre: string, url: string) => {
    try {
      const key = getSongCacheKey(ref, genre);
      await AsyncStorage.setItem(key, JSON.stringify({ audio_url: url, created_at: Date.now() }));
    } catch {}
  };

  const checkLocalCache = async (ref: string, genre: string): Promise<string | null> => {
    try {
      const key = getSongCacheKey(ref, genre);
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const data = JSON.parse(cached);
        return data.audio_url || null;
      }
    } catch {}
    return null;
  };

  const checkServerCache = async (ref: string, genre: string): Promise<string | null> => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/song-cache", baseUrl);
      url.searchParams.set("reference", ref);
      url.searchParams.set("genre", genre);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        if (data.cached && data.audio_url) {
          return data.audio_url;
        }
      }
    } catch {}
    return null;
  };

  const generateSong = async (forceNew = false) => {
    if (!selectedGenre) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setErrorMsg("");
    setAudioUrl(null);
    setIsCached(false);

    if (!forceNew) {
      setStatus("checking");

      const localUrl = await checkLocalCache(reference, selectedGenre);
      if (localUrl) {
        setAudioUrl(localUrl);
        setIsCached(true);
        setStatus("ready");
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      const serverUrl = await checkServerCache(reference, selectedGenre);
      if (serverUrl) {
        setAudioUrl(serverUrl);
        setIsCached(true);
        setStatus("ready");
        await saveSongToLocalCache(reference, selectedGenre, serverUrl);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
    }

    setStatus("generating");

    try {
      const res = await apiRequest("POST", "/api/generate-song", {
        verseText: text,
        reference,
        genre: selectedGenre,
        forceNew,
      });
      const data = await res.json();

      if (data.cached && data.audio_url) {
        setAudioUrl(data.audio_url);
        setIsCached(true);
        setStatus("ready");
        await saveSongToLocalCache(reference, selectedGenre, data.audio_url);
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (data.error) {
        setStatus("error");
        setErrorMsg(data.error);
        return;
      }

      const taskId = data.task_id;
      if (!taskId) {
        setStatus("error");
        setErrorMsg("No task ID returned. The Evolink API key may not be configured.");
        return;
      }

      setStatus("polling");
      let attempts = 0;
      const currentGenre = selectedGenre;
      pollRef.current = setInterval(async () => {
        attempts++;
        try {
          const statusRes = await apiRequest("GET", `/api/song-status/${taskId}?reference=${encodeURIComponent(reference)}&genre=${encodeURIComponent(currentGenre)}`);
          const statusData = await statusRes.json();

          if (statusData.status === "completed" && statusData.audio_url) {
            if (pollRef.current) clearInterval(pollRef.current);
            setAudioUrl(statusData.audio_url);
            setIsCached(false);
            setStatus("ready");
            await saveSongToLocalCache(reference, currentGenre, statusData.audio_url);
            if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } else if (statusData.status === "failed" || statusData.error) {
            if (pollRef.current) clearInterval(pollRef.current);
            setStatus("error");
            setErrorMsg(statusData.error || "Song generation failed");
          } else if (attempts > 60) {
            if (pollRef.current) clearInterval(pollRef.current);
            setStatus("error");
            setErrorMsg("Song generation timed out. Please try again.");
          }
        } catch {
          if (attempts > 5) {
            if (pollRef.current) clearInterval(pollRef.current);
            setStatus("error");
            setErrorMsg("Lost connection while waiting for song");
          }
        }
      }, 3000);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to start song generation");
    }
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const seekTo = useCallback(async (ms: number) => {
    const clampedMs = Math.max(0, Math.min(ms, durationMs));
    if (Platform.OS === "web") {
      if (webAudioRef.current && webAudioRef.current.duration) {
        webAudioRef.current.currentTime = clampedMs / 1000;
        setPositionMs(clampedMs);
      }
    } else {
      if (soundRef.current) {
        await soundRef.current.setPositionAsync(clampedMs);
        setPositionMs(clampedMs);
      }
    }
  }, [durationMs]);

  const handleProgressBarPress = useCallback((e: GestureResponderEvent) => {
    if (!progressBarWidth.current || !durationMs) return;
    const x = e.nativeEvent.locationX;
    const ratio = Math.max(0, Math.min(1, x / progressBarWidth.current));
    const targetMs = ratio * durationMs;
    seekTo(targetMs);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }, [durationMs, seekTo]);

  const handleProgressBarLayout = useCallback((e: LayoutChangeEvent) => {
    progressBarWidth.current = e.nativeEvent.layout.width;
  }, []);

  const toggleRepeat = useCallback(async () => {
    const next = !isRepeat;
    setIsRepeat(next);
    if (Platform.OS !== "web") Haptics.selectionAsync();
    if (Platform.OS === "web") {
      if (webAudioRef.current) {
        webAudioRef.current.loop = next;
      }
    } else {
      if (soundRef.current) {
        await soundRef.current.setIsLoopingAsync(next);
      }
    }
  }, [isRepeat]);

  const togglePlayback = async () => {
    if (!audioUrl) return;

    try {
      if (Platform.OS === "web") {
        if (webAudioRef.current) {
          if (isPlaying) {
            webAudioRef.current.pause();
            setIsPlaying(false);
          } else {
            webAudioRef.current.play().catch((e) => console.error("Web audio play error:", e));
            setIsPlaying(true);
          }
          return;
        }

        const audio = new globalThis.Audio(audioUrl);
        audio.loop = isRepeatRef.current;
        audio.addEventListener("loadedmetadata", () => {
          setDurationMs(audio.duration * 1000);
        });
        audio.addEventListener("timeupdate", () => {
          setPositionMs(audio.currentTime * 1000);
        });
        audio.addEventListener("ended", () => {
          if (!audio.loop) {
            setIsPlaying(false);
            setPositionMs(0);
          }
        });
        audio.addEventListener("error", (e) => {
          console.error("Web audio error:", e);
          setIsPlaying(false);
          setErrorMsg("Failed to play audio");
        });

        webAudioRef.current = audio;
        await audio.play();
        setIsPlaying(true);
      } else {
        if (soundRef.current) {
          if (isPlaying) {
            await soundRef.current.pauseAsync();
            setIsPlaying(false);
          } else {
            await soundRef.current.playAsync();
            setIsPlaying(true);
          }
          return;
        }

        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: true });
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true, isLooping: isRepeatRef.current }
        );
        soundRef.current = sound;
        setIsPlaying(true);

        sound.setOnPlaybackStatusUpdate((s: AVPlaybackStatus) => {
          if (!s.isLoaded) return;
          setPositionMs(s.positionMillis);
          if (s.durationMillis) {
            setDurationMs(s.durationMillis);
          }
          if (s.didJustFinish && !s.isLooping) {
            setIsPlaying(false);
            setPositionMs(0);
          }
        });
      }
    } catch {
      setErrorMsg("Failed to play audio");
    }
  };

  const isGenerating = status === "generating" || status === "polling" || status === "checking";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="singit-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Sing It</Text>
        <View style={{ width: 24 }} />
      </View>

      <Pressable
        onPress={() => {
          setVerseExpanded(!verseExpanded);
          if (Platform.OS !== "web") Haptics.selectionAsync();
        }}
        style={styles.versePreview}
        testID="verse-preview"
      >
        <Text style={styles.previewText} numberOfLines={verseExpanded ? undefined : 3}>{text}</Text>
        <View style={styles.previewFooter}>
          <Text style={styles.previewRef}>{reference}</Text>
          <View style={styles.expandHint}>
            <Ionicons name={verseExpanded ? "chevron-up" : "chevron-down"} size={14} color={Colors.light.accentLight} />
            <Text style={styles.expandHintText}>{verseExpanded ? "Less" : "More"}</Text>
          </View>
        </View>
      </Pressable>

      <Text style={styles.sectionTitle}>Choose a genre</Text>
      <View style={styles.genreGrid}>
        {GENRES.map((g, i) => (
          <Animated.View key={g.key} entering={FadeInDown.delay(i * 40).duration(250)} style={styles.genreItem}>
            <Pressable
              onPress={() => { if (!isGenerating) setSelectedGenre(g.key); }}
              style={[
                styles.genreChip,
                selectedGenre === g.key && styles.genreChipActive,
              ]}
              testID={`genre-${g.key}`}
            >
              <Ionicons
                name={g.icon}
                size={18}
                color={selectedGenre === g.key ? "#fff" : Colors.light.accent}
              />
              <Text style={[styles.genreLabel, selectedGenre === g.key && styles.genreLabelActive]}>
                {g.label}
              </Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {status === "idle" && selectedGenre && (
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable onPress={() => generateSong(false)} style={styles.generateBtn} testID="generate-song">
            <Ionicons name="musical-notes" size={20} color="#fff" />
            <Text style={styles.generateBtnText}>Generate Song</Text>
          </Pressable>
        </Animated.View>
      )}

      {status === "checking" && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.loadingCard}>
          <ActivityIndicator size="small" color={Colors.light.accent} />
          <Text style={styles.loadingTitle}>Checking for saved song...</Text>
        </Animated.View>
      )}

      {(status === "generating" || status === "polling") && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.loadingCard}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
          <Text style={styles.loadingTitle}>
            {status === "generating" ? "Starting generation..." : "Creating your song..."}
          </Text>
          <Text style={styles.loadingSubtitle}>This may take up to 30 seconds</Text>
        </Animated.View>
      )}

      {status === "ready" && audioUrl && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.playerCard}>
          <Ionicons name="musical-notes" size={36} color={Colors.light.accent} />
          <Text style={styles.playerTitle}>Your song is ready!</Text>
          {isCached && (
            <Text style={styles.cachedBadge}>Previously generated</Text>
          )}

          <View style={styles.controlsRow}>
            <Pressable onPress={toggleRepeat} style={styles.repeatBtn} testID="repeat-toggle">
              <Ionicons
                name="repeat"
                size={22}
                color={isRepeat ? Colors.light.accent : Colors.light.textSecondary}
              />
              {isRepeat && <View style={styles.repeatDot} />}
            </Pressable>

            <Pressable onPress={togglePlayback} style={styles.playBtn} testID="play-song">
              <Ionicons name={isPlaying ? "pause" : "play"} size={28} color="#fff" />
            </Pressable>

            <View style={{ width: 40 }} />
          </View>

          <View style={styles.progressContainer}>
            <Text style={styles.timeLabel}>{formatTime(positionMs)}</Text>
            <Pressable
              onPress={handleProgressBarPress}
              onLayout={handleProgressBarLayout}
              style={styles.progressBarOuter}
              testID="progress-bar"
            >
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: durationMs > 0 ? `${Math.min(100, (positionMs / durationMs) * 100)}%` : "0%" },
                  ]}
                />
                {durationMs > 0 && (
                  <View
                    style={[
                      styles.progressBarThumb,
                      { left: `${Math.min(100, (positionMs / durationMs) * 100)}%` },
                    ]}
                  />
                )}
              </View>
            </Pressable>
            <Text style={styles.timeLabel}>{formatTime(Math.max(0, durationMs - positionMs))}</Text>
          </View>

          <View style={styles.playerActions}>
            <Pressable
              onPress={() => {
                setStatus("idle"); setAudioUrl(null); setIsCached(false);
                setPositionMs(0); setDurationMs(0); setIsPlaying(false);
                soundRef.current?.unloadAsync(); soundRef.current = null;
                if (webAudioRef.current) { webAudioRef.current.pause(); webAudioRef.current.src = ""; webAudioRef.current = null; }
              }}
              style={styles.newSongBtn}
              testID="new-song"
            >
              <Text style={styles.newSongText}>Change Genre</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                soundRef.current?.unloadAsync(); soundRef.current = null;
                if (webAudioRef.current) { webAudioRef.current.pause(); webAudioRef.current.src = ""; webAudioRef.current = null; }
                setIsPlaying(false); setPositionMs(0); setDurationMs(0);
                setAudioUrl(null); setIsCached(false); generateSong(true);
              }}
              style={styles.regenBtn}
              testID="regenerate-song"
            >
              <Ionicons name="refresh-outline" size={14} color={Colors.light.accent} />
              <Text style={styles.regenText}>Generate New</Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {status === "ready" && audioUrl && text && (
        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.lyricsSection}>
          <View style={styles.lyricsHeader}>
            <Ionicons name="musical-notes-outline" size={16} color={Colors.light.accent} />
            <Text style={styles.lyricsHeaderText}>Lyrics</Text>
          </View>
          <Text style={styles.lyricsText}>{text}</Text>
          <Text style={styles.lyricsRef}>{reference}</Text>
        </Animated.View>
      )}

      {status === "error" && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.errorCard}>
          <Ionicons name="alert-circle-outline" size={28} color="#D9534F" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable onPress={() => setStatus("idle")} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  versePreview: {
    backgroundColor: Colors.light.oliveDark,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  previewText: { fontFamily: "Lora_400Regular", fontSize: 15, lineHeight: 24, color: "#FAF6F0" },
  previewFooter: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginTop: 10,
  },
  previewRef: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.accentLight, letterSpacing: 0.5 },
  expandHint: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
  },
  expandHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.accentLight,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.textSecondary,
    marginBottom: 12, letterSpacing: 0.5, textTransform: "uppercase" as const,
  },
  genreGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  genreItem: {},
  genreChip: {
    flexDirection: "row", alignItems: "center" as const, gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border,
  },
  genreChipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  genreLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.text },
  genreLabelActive: { color: "#fff" },
  generateBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 16, borderRadius: 16, backgroundColor: Colors.light.accent,
  },
  generateBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  loadingCard: {
    backgroundColor: Colors.light.surface, borderRadius: 20, padding: 32,
    alignItems: "center" as const, gap: 12, borderWidth: 1, borderColor: Colors.light.border,
  },
  loadingTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.text },
  loadingSubtitle: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  playerCard: {
    backgroundColor: Colors.light.surface, borderRadius: 20, padding: 32,
    alignItems: "center" as const, gap: 14, borderWidth: 1, borderColor: Colors.light.border,
  },
  playerTitle: { fontFamily: "Lora_700Bold", fontSize: 20, color: Colors.light.text },
  cachedBadge: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.olive,
    backgroundColor: "#EEF4E8", paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, overflow: "hidden" as const,
  },
  controlsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 24,
    width: "100%" as const,
  },
  playBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.light.accent,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  repeatBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  repeatDot: {
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: Colors.light.accent,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    width: "100%" as const,
    paddingHorizontal: 4,
  },
  timeLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    width: 36,
    textAlign: "center" as const,
  },
  progressBarOuter: {
    flex: 1,
    height: 32,
    justifyContent: "center" as const,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: "visible" as const,
    position: "relative" as const,
  },
  progressBarFill: {
    height: "100%" as const,
    backgroundColor: Colors.light.accent,
    borderRadius: 2,
  },
  progressBarThumb: {
    position: "absolute" as const,
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.light.accent,
    marginLeft: -7,
  },
  playerActions: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 10, marginTop: 4,
  },
  newSongBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.light.surfaceSecondary,
  },
  newSongText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  regenBtn: {
    flexDirection: "row", alignItems: "center" as const, gap: 5,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border,
  },
  regenText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent },
  errorCard: {
    backgroundColor: "#FFF0EF", borderRadius: 16, padding: 20,
    alignItems: "center" as const, gap: 10, borderWidth: 1, borderColor: "#F5DEDD",
  },
  errorText: { fontFamily: "Inter_400Regular", fontSize: 14, color: "#D9534F", textAlign: "center" as const },
  retryBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
    backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border,
  },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent },
  lyricsSection: {
    marginTop: 20,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: Colors.light.accent,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  lyricsHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginBottom: 14,
  },
  lyricsHeaderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  lyricsText: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 28,
    color: Colors.light.text,
  },
  lyricsRef: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 14,
    letterSpacing: 0.5,
  },
});
