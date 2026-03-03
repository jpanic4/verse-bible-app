import { useEffect, useState, useCallback, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform, RefreshControl, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { getDailyVerseRef } from "@/data/dailyVerses";
import { fetchVerse, VerseResult } from "@/lib/bible-api";
import { useSavedVerses } from "@/context/SavedVersesContext";
import { VerseLoadingCard } from "@/components/VerseLoadingCard";
import { useAudioPlayer } from "@/lib/useAudioPlayer";
import { getApiUrl } from "@/lib/query-client";
import { getRandomProverb } from "@/lib/local-bible";
import { useSRS } from "@/context/SRSContext";
import { useStreak } from "@/context/StreakContext";

interface ReadingPlanData {
  day: number;
  readings: {
    psalm: string;
    oldTestament: string;
    newTestament: string;
    gospel: string;
  };
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [dailyVerse, setDailyVerse] = useState<VerseResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isSaved, toggleSave } = useSavedVerses();
  const { isPlaying: globalPlaying, isLoading: globalAudioLoading, currentReference: audioRef, toggleAudio } = useAudioPlayer();
  const { getDueCount } = useSRS();
  const { streak: streakData, checkAndUpdateStreak, recordActivity } = useStreak();

  const [readingPlan, setReadingPlan] = useState<ReadingPlanData | null>(null);
  const [readingPlanLoading, setReadingPlanLoading] = useState(true);
  const [proverb, setProverb] = useState<VerseResult | null>(null);
  const [proverbLoading, setProverbLoading] = useState(true);
  const dailyVerseRecorded = useRef(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const loadDailyVerse = useCallback(async () => {
    try {
      const ref = getDailyVerseRef();
      const verse = await fetchVerse(ref);
      setDailyVerse(verse);
    } catch (err) {
      console.error("Failed to load daily verse:", err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadReadingPlan = useCallback(async () => {
    try {
      setReadingPlanLoading(true);
      const baseUrl = getApiUrl();
      const url = new URL("/api/reading-plan", baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch reading plan");
      const data: ReadingPlanData = await res.json();
      setReadingPlan(data);
    } catch (err) {
      console.error("Failed to load reading plan:", err);
    } finally {
      setReadingPlanLoading(false);
    }
  }, []);

  const loadProverb = useCallback(async () => {
    try {
      setProverbLoading(true);
      const local = getRandomProverb();
      if (local) {
        setProverb(local);
        return;
      }
      const baseUrl = getApiUrl();
      const url = new URL("/api/random-proverb", baseUrl);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to fetch proverb");
      const data: VerseResult = await res.json();
      setProverb(data);
    } catch (err) {
      console.error("Failed to load proverb:", err);
    } finally {
      setProverbLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAndUpdateStreak();
    loadDailyVerse();
    loadReadingPlan();
    loadProverb();
  }, [loadDailyVerse, loadReadingPlan, loadProverb, checkAndUpdateStreak]);

  useEffect(() => {
    if (dailyVerse && !dailyVerseRecorded.current) {
      dailyVerseRecorded.current = true;
      recordActivity("daily_verse");
    }
  }, [dailyVerse, recordActivity]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadDailyVerse();
    loadReadingPlan();
    loadProverb();
  }, [loadDailyVerse, loadReadingPlan, loadProverb]);

  const handleSave = () => {
    if (!dailyVerse) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleSave(dailyVerse);
  };

  const handleDailyAudio = () => {
    if (!dailyVerse) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleAudio(dailyVerse.reference);
  };

  const handleReadingPress = (reference: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/(tabs)/search",
      params: { q: reference },
    });
  };

  const saved = dailyVerse ? isSaved(dailyVerse.reference) : false;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const readingLabels: { key: keyof ReadingPlanData["readings"]; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
    { key: "psalm", label: "Psalm", icon: "musical-notes-outline", color: "#7B6BA8" },
    { key: "oldTestament", label: "Old Testament", icon: "book-outline", color: Colors.light.olive },
    { key: "newTestament", label: "New Testament", icon: "document-text-outline", color: Colors.light.accent },
    { key: "gospel", label: "Gospel", icon: "sunny-outline", color: "#C49A3C" },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + webTopInset + 10, paddingBottom: insets.bottom + 100 },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeIn.duration(600)}>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.greeting}>Verse of the Day</Text>
      </Animated.View>

      {streakData.currentStreak > 0 && (
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.streakCard}>
          <View style={styles.streakLeft}>
            <View style={styles.streakFlame}>
              <Ionicons name="flame" size={22} color="#fff" />
            </View>
            <View>
              <Text style={styles.streakNumber}>{streakData.currentStreak} day streak</Text>
              <Text style={styles.streakSub}>Longest: {streakData.longestStreak} days</Text>
            </View>
          </View>
          <View style={styles.xpBadge}>
            <Ionicons name="star" size={12} color={Colors.light.accent} />
            <Text style={styles.xpText}>+{streakData.todayXP} XP today</Text>
          </View>
        </Animated.View>
      )}

      {getDueCount() > 0 && (
        <Animated.View entering={FadeInDown.delay(150).duration(400)}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push("/practice/review");
            }}
            style={styles.reviewCard}
            testID="srs-review-card"
          >
            <View style={styles.reviewLeft}>
              <Ionicons name="school" size={20} color={Colors.light.accent} />
              <Text style={styles.reviewText}>{getDueCount()} verse{getDueCount() !== 1 ? "s" : ""} ready for review</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.light.accent} />
          </Pressable>
        </Animated.View>
      )}

      <View style={styles.dailySection}>
        {isLoading ? (
          <VerseLoadingCard />
        ) : dailyVerse ? (
          <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.dailyCard}>
            <View style={styles.quoteIconRow}>
              <Ionicons name="chatbubble-outline" size={18} color={Colors.light.accentLight} />
            </View>
            <Text style={styles.dailyVerseText}>{dailyVerse.text}</Text>
            <View style={styles.dailyFooter}>
              <View>
                <Text style={styles.dailyReference}>{dailyVerse.reference}</Text>
                <Text style={styles.dailyTranslation}>{dailyVerse.translation}</Text>
              </View>
              <View style={styles.dailyActions}>
                <Pressable
                  onPress={handleDailyAudio}
                  hitSlop={12}
                  style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.6 : 1 }]}
                  testID="audio-daily-verse"
                >
                  {globalAudioLoading && audioRef === dailyVerse?.reference ? (
                    <ActivityIndicator size={18} color={Colors.light.accentLight} />
                  ) : (
                    <Ionicons
                      name={globalPlaying && audioRef === dailyVerse?.reference ? "pause-circle" : "volume-medium-outline"}
                      size={22}
                      color={globalPlaying && audioRef === dailyVerse?.reference ? Colors.light.accent : Colors.light.accentLight}
                    />
                  )}
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (!dailyVerse) return;
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push({
                      pathname: "/practice/[reference]",
                      params: { reference: dailyVerse.reference, text: dailyVerse.text, translation: dailyVerse.translation },
                    });
                  }}
                  hitSlop={12}
                  style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.6 : 1 }]}
                  testID="practice-daily-verse"
                >
                  <Ionicons name="school-outline" size={22} color={Colors.light.accentLight} />
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  hitSlop={12}
                  style={({ pressed }) => [
                    styles.saveBtn,
                    { opacity: pressed ? 0.6 : 1 },
                  ]}
                  testID="save-daily-verse"
                >
                  <Ionicons
                    name={saved ? "bookmark" : "bookmark-outline"}
                    size={22}
                    color={saved ? Colors.light.accent : Colors.light.textSecondary}
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        ) : (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={32} color={Colors.light.textTertiary} />
            <Text style={styles.errorText}>Could not load today's verse</Text>
            <Pressable onPress={loadDailyVerse} style={styles.retryBtn}>
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.proverbSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="sparkles-outline" size={18} color={Colors.light.accent} />
            <Text style={styles.sectionTitle}>Daily Wisdom</Text>
          </View>
          <Pressable
            onPress={loadProverb}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            testID="refresh-proverb"
          >
            <Ionicons name="refresh-outline" size={20} color={Colors.light.accent} />
          </Pressable>
        </View>
        {proverbLoading ? (
          <View style={styles.proverbLoadingContainer}>
            <ActivityIndicator color={Colors.light.accent} size="small" />
          </View>
        ) : proverb ? (
          <View style={styles.proverbCard}>
            <Text style={styles.proverbText}>{proverb.text}</Text>
            <Text style={styles.proverbRef}>{proverb.reference}</Text>
          </View>
        ) : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.readingSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name="calendar-outline" size={18} color={Colors.light.olive} />
            <Text style={styles.sectionTitle}>Today's Reading</Text>
          </View>
          {readingPlan && (
            <Text style={styles.dayBadge}>Day {readingPlan.day}</Text>
          )}
        </View>
        {readingPlanLoading ? (
          <View style={styles.proverbLoadingContainer}>
            <ActivityIndicator color={Colors.light.olive} size="small" />
          </View>
        ) : readingPlan ? (
          <View style={styles.readingGrid}>
            {readingLabels.map(({ key, label, icon, color }) => (
              <Pressable
                key={key}
                onPress={() => handleReadingPress(readingPlan.readings[key])}
                style={({ pressed }) => [
                  styles.readingCard,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
                testID={`reading-${key}`}
              >
                <View style={[styles.readingIconWrap, { backgroundColor: color + "18" }]}>
                  <Ionicons name={icon} size={18} color={color} />
                </View>
                <Text style={styles.readingLabel}>{label}</Text>
                <Text style={styles.readingRef} numberOfLines={1}>{readingPlan.readings[key]}</Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.light.textTertiary} style={styles.readingChevron} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </Animated.View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 0,
  },
  dateText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 4,
    paddingHorizontal: 24,
    textTransform: "uppercase" as const,
  },
  greeting: {
    fontFamily: "Lora_700Bold",
    fontSize: 32,
    color: Colors.light.text,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  streakCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.light.oliveDark,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  streakLeft: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  streakFlame: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#E8653A",
    alignItems: "center" as const, justifyContent: "center" as const,
  },
  streakNumber: {
    fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#FAF6F0",
  },
  streakSub: {
    fontFamily: "Inter_400Regular", fontSize: 11, color: Colors.light.accentLight, marginTop: 1,
  },
  xpBadge: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 4,
    backgroundColor: "rgba(250,246,240,0.12)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  xpText: {
    fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.accentLight,
  },
  reviewCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.light.accentLight,
  },
  reviewLeft: {
    flexDirection: "row" as const, alignItems: "center" as const, gap: 10,
  },
  reviewText: {
    fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.accent,
  },
  dailySection: {
    marginBottom: 28,
  },
  dailyCard: {
    backgroundColor: Colors.light.oliveDark,
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
  },
  quoteIconRow: {
    marginBottom: 12,
  },
  dailyVerseText: {
    fontFamily: "Lora_400Regular",
    fontSize: 20,
    lineHeight: 32,
    color: "#FAF6F0",
    letterSpacing: 0.2,
  },
  dailyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(250, 246, 240, 0.15)",
  },
  dailyReference: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.accentLight,
    letterSpacing: 0.5,
  },
  dailyTranslation: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: "rgba(250, 246, 240, 0.5)",
    marginTop: 2,
  },
  dailyActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  saveBtn: {
    padding: 4,
  },
  errorCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    alignItems: "center" as const,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  proverbSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: Colors.light.text,
  },
  proverbLoadingContainer: {
    paddingVertical: 24,
    alignItems: "center" as const,
  },
  proverbCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  proverbText: {
    fontFamily: "Lora_400Regular",
    fontSize: 16,
    lineHeight: 26,
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  proverbRef: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginTop: 12,
  },
  readingSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  dayBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.light.olive,
    backgroundColor: "#EEF4E8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: "hidden" as const,
    letterSpacing: 0.3,
  },
  readingGrid: {
    gap: 8,
  },
  readingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  readingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 12,
  },
  readingLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    width: 110,
  },
  readingRef: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  readingChevron: {
    marginLeft: 4,
  },
});
