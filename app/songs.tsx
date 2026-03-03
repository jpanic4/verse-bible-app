import { useState, useEffect, useCallback, useRef } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Platform, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";

interface CachedSong {
  key: string;
  reference: string;
  genre: string;
  audio_url: string;
  created_at: number;
}

const SONG_CACHE_PREFIX = "song_cache_";

const GENRE_ICONS: Record<string, string> = {
  gospel: "heart",
  hymn: "musical-note",
  pop: "star",
  country: "leaf",
  rnb: "mic",
  jazz: "cafe",
  folk: "bonfire",
  "hip-hop": "headset",
};

export default function SongsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [songs, setSongs] = useState<CachedSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);

  const loadSongs = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const songKeys = keys.filter((k) => k.startsWith(SONG_CACHE_PREFIX));
      if (songKeys.length === 0) {
        setSongs([]);
        setLoading(false);
        return;
      }
      const entries = await AsyncStorage.multiGet(songKeys);
      const parsed: CachedSong[] = [];
      for (const [key, value] of entries) {
        if (!value) continue;
        try {
          const data = JSON.parse(value);
          const stripped = key.replace(SONG_CACHE_PREFIX, "");
          const lastUnderscore = stripped.lastIndexOf("_");
          const reference = lastUnderscore > 0 ? stripped.substring(0, lastUnderscore) : stripped;
          const genre = lastUnderscore > 0 ? stripped.substring(lastUnderscore + 1) : "unknown";
          parsed.push({
            key,
            reference,
            genre,
            audio_url: data.audio_url,
            created_at: data.created_at || 0,
          });
        } catch {}
      }
      parsed.sort((a, b) => b.created_at - a.created_at);
      setSongs(parsed);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSongs();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [loadSongs]);

  const togglePlay = async (song: CachedSong) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (playingKey === song.key) {
      if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setPlayingKey(null);
      return;
    }

    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(
        { uri: song.audio_url },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setPlayingKey(song.key);

      sound.setOnPlaybackStatusUpdate((s) => {
        if (s.isLoaded && s.didJustFinish) {
          setPlayingKey(null);
        }
      });
    } catch {
      setPlayingKey(null);
    }
  };

  const deleteSong = (song: CachedSong) => {
    if (Platform.OS === "web") {
      doDelete(song);
      return;
    }
    Alert.alert("Remove Song", `Remove the ${song.genre} version of ${song.reference}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => doDelete(song) },
    ]);
  };

  const doDelete = async (song: CachedSong) => {
    try {
      if (playingKey === song.key && soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
        setPlayingKey(null);
      }
      await AsyncStorage.removeItem(song.key);
      setSongs((prev) => prev.filter((s) => s.key !== song.key));
    } catch {}
  };

  const formatDate = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const renderSong = ({ item, index }: { item: CachedSong; index: number }) => {
    const isPlaying = playingKey === item.key;
    const genreIcon = GENRE_ICONS[item.genre] || "musical-notes";

    return (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <View style={styles.songRow}>
          <Pressable
            onPress={() => togglePlay(item)}
            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
            testID={`play-song-${index}`}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={isPlaying ? "#fff" : Colors.light.accent} />
          </Pressable>
          <View style={styles.songInfo}>
            <Text style={styles.songReference} numberOfLines={1}>{item.reference}</Text>
            <View style={styles.songMeta}>
              <Ionicons name={genreIcon as any} size={12} color={Colors.light.textTertiary} />
              <Text style={styles.songGenre}>{item.genre}</Text>
              {item.created_at > 0 && (
                <Text style={styles.songDate}>{formatDate(item.created_at)}</Text>
              )}
            </View>
          </View>
          <Pressable onPress={() => deleteSong(item)} hitSlop={10} style={styles.deleteBtn} testID={`delete-song-${index}`}>
            <Ionicons name="trash-outline" size={18} color={Colors.light.textTertiary} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="songs-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>My Songs</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.light.accent} />
        </View>
      ) : songs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="musical-notes-outline" size={48} color={Colors.light.textTertiary} />
          <Text style={styles.emptyTitle}>No songs yet</Text>
          <Text style={styles.emptyDesc}>Songs you generate will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={(item) => item.key}
          renderItem={renderSong}
          contentContainerStyle={{ paddingBottom: insets.bottom + webBottomInset + 40, paddingTop: 8 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={songs.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  centered: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, gap: 10 },
  emptyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: Colors.light.text },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  songRow: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  playBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#FFF0E6",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  playBtnActive: { backgroundColor: Colors.light.accent },
  songInfo: { flex: 1 },
  songReference: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, marginBottom: 3 },
  songMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  songGenre: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textTertiary, textTransform: "capitalize" as const },
  songDate: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textTertiary, marginLeft: 6 },
  deleteBtn: { padding: 8 },
});
