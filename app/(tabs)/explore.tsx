import { useState, useEffect, useCallback } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { THEMES } from "@/data/themes";
import { ThemeCard } from "@/components/ThemeCard";
import { useSavedVerses } from "@/context/SavedVersesContext";
import { useSRS } from "@/context/SRSContext";

const PRACTICE_MODES = [
  { key: "flashcard", label: "Flashcard", icon: "layers-outline" as const, color: "#E8A838" },
  { key: "fill-blank", label: "Fill Blank", icon: "remove-outline" as const, color: "#7BAE6E" },
  { key: "scramble", label: "Scramble", icon: "shuffle-outline" as const, color: "#6A9EC4" },
  { key: "quiz", label: "Quiz", icon: "help-circle-outline" as const, color: "#8B7BB5" },
  { key: "type-it", label: "Type It", icon: "create-outline" as const, color: "#D4736A" },
  { key: "sing-it", label: "Sing It", icon: "musical-notes-outline" as const, color: "#C4794A" },
];

interface CachedSong {
  reference: string;
  genre: string;
  audio_url: string;
  created_at: number;
}

const SONG_CACHE_PREFIX = "song_cache_";

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { savedVerses } = useSavedVerses();
  const { getDueCount } = useSRS();
  const dueCount = getDueCount();
  const [songs, setSongs] = useState<CachedSong[]>([]);
  const [showAllThemes, setShowAllThemes] = useState(false);

  const loadSongs = useCallback(async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const songKeys = keys.filter((k) => k.startsWith(SONG_CACHE_PREFIX));
      if (songKeys.length === 0) {
        setSongs([]);
        return;
      }
      const entries = await AsyncStorage.multiGet(songKeys);
      const parsed: CachedSong[] = [];
      for (const [key, value] of entries) {
        if (!value) continue;
        try {
          const data = JSON.parse(value);
          const keyParts = key.replace(SONG_CACHE_PREFIX, "").split("_");
          const genre = keyParts.pop() || "";
          const reference = keyParts.join("_");
          parsed.push({
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
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  const handleThemePress = (themeName: string) => {
    router.push({ pathname: "/theme/[name]", params: { name: themeName } });
  };

  const handlePracticeModePress = (modeKey: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (savedVerses.length > 0) {
      const verse = savedVerses[Math.floor(Math.random() * savedVerses.length)];
      router.push({
        pathname: `/practice/${modeKey}` as any,
        params: { reference: verse.reference, text: verse.text, translation: verse.translation },
      });
    } else {
      router.push({ pathname: "/(tabs)/search" });
    }
  };

  const handleSongPress = (song: CachedSong) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/songs" as any });
  };

  const displayedThemes = showAllThemes ? THEMES : THEMES.slice(0, 6);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + webTopInset + 20, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Explore</Text>
        <Text style={styles.subtitle}>Tools, songs, and themed collections</Text>
      </View>

      <Text style={styles.sectionTitle}>Practice Tools</Text>
      <Text style={styles.sectionDesc}>
        {savedVerses.length > 0
          ? `Tap a tool to practice with a random saved verse`
          : `Save some verses first, then practice here`}
      </Text>
      <View style={styles.practiceGrid}>
        {PRACTICE_MODES.map((mode, i) => (
          <Animated.View key={mode.key} entering={FadeInDown.delay(i * 50).duration(300).springify()} style={styles.practiceItem}>
            <Pressable
              onPress={() => handlePracticeModePress(mode.key)}
              style={({ pressed }) => [styles.practiceCard, { opacity: pressed ? 0.85 : 1 }]}
              testID={`explore-practice-${mode.key}`}
            >
              <View style={[styles.practiceIconCircle, { backgroundColor: mode.color + "18" }]}>
                <Ionicons name={mode.icon} size={22} color={mode.color} />
              </View>
              <Text style={styles.practiceLabel}>{mode.label}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      {dueCount > 0 && (
        <Animated.View entering={FadeInDown.delay(280).duration(400)} style={{ marginBottom: 14, paddingHorizontal: 20 }}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/practice/review" as any);
            }}
            style={({ pressed }) => [styles.reviewBanner, { opacity: pressed ? 0.9 : 1 }]}
            testID="explore-srs-review"
          >
            <View style={styles.reviewBannerLeft}>
              <View style={[styles.practiceIconCircle, { backgroundColor: Colors.light.accent + "18" }]}>
                <Ionicons name="school" size={22} color={Colors.light.accent} />
              </View>
              <View>
                <Text style={styles.reviewBannerTitle}>Review Due</Text>
                <Text style={styles.reviewBannerSub}>{dueCount} verse{dueCount !== 1 ? "s" : ""} ready</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.accent} />
          </Pressable>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.challengeBanner}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/challenge" as any);
          }}
          style={({ pressed }) => [
            styles.challengeCard,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          testID="explore-bible-challenge"
        >
          <View style={styles.challengeIconCircle}>
            <Ionicons name="trophy" size={28} color="#E8A838" />
          </View>
          <View style={styles.challengeTextCol}>
            <Text style={styles.challengeTitle}>Bible Challenge</Text>
            <Text style={styles.challengeTagline}>Test your Bible knowledge!</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.light.textTertiary} />
        </Pressable>
      </Animated.View>

      {songs.length > 0 && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Songs</Text>
            <Pressable onPress={() => router.push("/songs" as any)} hitSlop={8} testID="see-all-songs">
              <Text style={styles.seeAll}>See All</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.songsScroll} contentContainerStyle={styles.songsContent}>
            {songs.slice(0, 6).map((song, i) => (
              <Animated.View key={`${song.reference}-${song.genre}`} entering={FadeInDown.delay(i * 60).duration(300)}>
                <Pressable
                  onPress={() => handleSongPress(song)}
                  style={({ pressed }) => [styles.songCard, { opacity: pressed ? 0.85 : 1 }]}
                  testID={`song-card-${i}`}
                >
                  <View style={styles.songIconCircle}>
                    <Ionicons name="musical-notes" size={20} color={Colors.light.accent} />
                  </View>
                  <Text style={styles.songRef} numberOfLines={1}>{song.reference}</Text>
                  <Text style={styles.songGenre}>{song.genre}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </ScrollView>
        </>
      )}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Themes</Text>
        {!showAllThemes && (
          <Pressable onPress={() => setShowAllThemes(true)} hitSlop={8} testID="see-all-themes">
            <Text style={styles.seeAll}>See All</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.themesGrid}>
        {displayedThemes.map((theme, index) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            index={index}
            onPress={() => handleThemePress(theme.name)}
          />
        ))}
      </View>
      {showAllThemes && THEMES.length > 6 && (
        <Pressable onPress={() => setShowAllThemes(false)} style={styles.collapseBtn} testID="collapse-themes">
          <Text style={styles.collapseText}>Show Less</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 14 },
  header: { paddingHorizontal: 10, marginBottom: 24 },
  title: { fontFamily: "Lora_700Bold", fontSize: 28, color: Colors.light.text, marginBottom: 6 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, lineHeight: 20 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 10, marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" as const, paddingHorizontal: 10, marginBottom: 12 },
  sectionDesc: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textTertiary, paddingHorizontal: 10, marginBottom: 14, marginTop: -6 },
  seeAll: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent },
  practiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingHorizontal: 6, marginBottom: 20 },
  practiceItem: { width: "30%" as any, flexGrow: 1 },
  practiceCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 90,
    justifyContent: "center" as const,
  },
  practiceIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center" as const, justifyContent: "center" as const,
    marginBottom: 8,
  },
  practiceLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.light.text, textAlign: "center" as const },
  songsScroll: { marginBottom: 28, marginLeft: 6 },
  songsContent: { gap: 10, paddingRight: 20 },
  songCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    width: 120,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center" as const,
  },
  songIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#FFF0E6",
    alignItems: "center" as const, justifyContent: "center" as const,
    marginBottom: 8,
  },
  songRef: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: Colors.light.text, textAlign: "center" as const, marginBottom: 2 },
  songGenre: { fontFamily: "Inter_400Regular", fontSize: 10, color: Colors.light.textTertiary, textTransform: "capitalize" as const },
  themesGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, paddingHorizontal: 0 },
  collapseBtn: { alignItems: "center" as const, paddingVertical: 12, marginTop: 4 },
  collapseText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent },
  reviewBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.accentLight,
  },
  reviewBannerLeft: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 12,
  },
  reviewBannerTitle: {
    fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text,
  },
  reviewBannerSub: {
    fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.accent, marginTop: 1,
  },
  challengeBanner: {
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  challengeCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E8A83840",
    gap: 14,
  },
  challengeIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E8A83815",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  challengeTextCol: {
    flex: 1,
  },
  challengeTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 17,
    color: Colors.light.text,
    marginBottom: 3,
  },
  challengeTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
});
