import { useState, useCallback, useMemo } from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp, SlideOutLeft } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useSRS } from "@/context/SRSContext";
import { useStreak } from "@/context/StreakContext";
import { useSavedVerses } from "@/context/SavedVersesContext";

interface RatingOption {
  label: string;
  quality: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const RATINGS: RatingOption[] = [
  { label: "Again", quality: 1, color: "#D9534F", icon: "refresh" },
  { label: "Hard", quality: 3, color: "#E8A640", icon: "trending-up" },
  { label: "Good", quality: 4, color: Colors.light.olive, icon: "checkmark-circle" },
  { label: "Easy", quality: 5, color: Colors.light.accent, icon: "flash" },
];

export default function ReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const { getDueVerses, recordReview } = useSRS();
  const { recordActivity } = useStreak();
  const { savedVerses } = useSavedVerses();

  const dueVerses = useMemo(() => getDueVerses(), [getDueVerses]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionXP, setSessionXP] = useState(0);
  const [reviewedCount, setReviewedCount] = useState(0);
  const [cardKey, setCardKey] = useState(0);

  const currentVerse = dueVerses[currentIndex];
  const verseText = useMemo(() => {
    if (!currentVerse) return "";
    const saved = savedVerses.find((v) => v.reference === currentVerse.reference);
    return saved?.text || "";
  }, [currentVerse, savedVerses]);

  const isComplete = currentIndex >= dueVerses.length || dueVerses.length === 0;

  const handleReveal = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealed(true);
  }, []);

  const handleRate = useCallback((quality: number) => {
    if (!currentVerse) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    recordReview(currentVerse.reference, quality);

    const isPerfect = quality === 5;
    if (isPerfect) {
      recordActivity("srs_perfect");
      setSessionXP((p) => p + 30);
    } else {
      recordActivity("srs_review");
      setSessionXP((p) => p + 15);
    }

    setReviewedCount((p) => p + 1);
    setRevealed(false);
    setCardKey((k) => k + 1);
    setCurrentIndex((p) => p + 1);
  }, [currentVerse, recordReview, recordActivity]);

  const getNextReviewLabel = useCallback(() => {
    if (!currentVerse) return "";
    const d = currentVerse.interval;
    if (d === 1) return "tomorrow";
    if (d < 7) return `in ${d} days`;
    if (d < 30) return `in ${Math.round(d / 7)} weeks`;
    return `in ${Math.round(d / 30)} months`;
  }, [currentVerse]);

  if (isComplete && dueVerses.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Review</Text>
          <View style={{ width: 24 }} />
        </View>
        <Animated.View entering={FadeIn.duration(400)} style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color={Colors.light.olive} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtext}>No verses are due for review right now. Save more verses or check back tomorrow.</Text>
          <Pressable onPress={() => router.back()} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Go Back</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </Pressable>
          <Text style={styles.title}>Review Complete</Text>
          <View style={{ width: 24 }} />
        </View>
        <Animated.View entering={FadeInDown.duration(500).springify()} style={styles.completeCard}>
          <View style={styles.completeIconCircle}>
            <Ionicons name="trophy" size={40} color="#fff" />
          </View>
          <Text style={styles.completeTitle}>Session Complete!</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{reviewedCount}</Text>
              <Text style={styles.statLabel}>Reviewed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>+{sessionXP}</Text>
              <Text style={styles.statLabel}>XP Earned</Text>
            </View>
          </View>
          <Pressable onPress={() => router.back()} style={styles.doneBtn} testID="review-done">
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Review</Text>
        <Text style={styles.counter}>{currentIndex + 1} / {dueVerses.length}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${((currentIndex) / dueVerses.length) * 100}%` }]} />
      </View>

      <Animated.View key={cardKey} entering={FadeInUp.duration(400).springify()} style={styles.cardContainer}>
        <View style={styles.referenceCard}>
          <Text style={styles.referenceLabel}>Can you recall this verse?</Text>
          <Text style={styles.referenceText}>{currentVerse.reference}</Text>
          {currentVerse.repetitions > 0 && (
            <Text style={styles.intervalInfo}>Last reviewed {getNextReviewLabel()}</Text>
          )}
        </View>

        {!revealed ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable onPress={handleReveal} style={styles.revealBtn} testID="reveal-verse">
              <Ionicons name="eye-outline" size={20} color="#fff" />
              <Text style={styles.revealBtnText}>Reveal Verse</Text>
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(400).springify()}>
            <View style={styles.verseCard}>
              <Text style={styles.verseText}>{verseText}</Text>
            </View>
            <Text style={styles.ratePrompt}>How well did you remember?</Text>
            <View style={styles.ratingsRow}>
              {RATINGS.map((r) => (
                <Pressable
                  key={r.quality}
                  onPress={() => handleRate(r.quality)}
                  style={[styles.ratingBtn, { backgroundColor: r.color }]}
                  testID={`rate-${r.label.toLowerCase()}`}
                >
                  <Ionicons name={r.icon} size={18} color="#fff" />
                  <Text style={styles.ratingLabel}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
          </Animated.View>
        )}
      </Animated.View>

      <View style={styles.sessionInfo}>
        <View style={styles.sessionStat}>
          <Ionicons name="star" size={14} color={Colors.light.accent} />
          <Text style={styles.sessionStatText}>+{sessionXP} XP</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  counter: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  progressBarContainer: {
    height: 4, backgroundColor: Colors.light.border, borderRadius: 2, marginBottom: 28, overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: Colors.light.accent, borderRadius: 2 },
  cardContainer: { flex: 1, justifyContent: "center" },
  referenceCard: {
    backgroundColor: Colors.light.oliveDark, borderRadius: 20, padding: 28, alignItems: "center", marginBottom: 20,
  },
  referenceLabel: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.accentLight, marginBottom: 12 },
  referenceText: { fontFamily: "Lora_700Bold", fontSize: 24, color: "#FAF6F0", textAlign: "center" },
  intervalInfo: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.accentLight, marginTop: 10, opacity: 0.7 },
  revealBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: Colors.light.accent, paddingVertical: 16, borderRadius: 16,
  },
  revealBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
  verseCard: {
    backgroundColor: Colors.light.surface, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: Colors.light.border, marginBottom: 20,
  },
  verseText: { fontFamily: "Lora_400Regular", fontSize: 17, lineHeight: 28, color: Colors.light.text, textAlign: "center" },
  ratePrompt: {
    fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, textAlign: "center", marginBottom: 12,
  },
  ratingsRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  ratingBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", gap: 4,
  },
  ratingLabel: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
  sessionInfo: { paddingVertical: 16, alignItems: "center" },
  sessionStat: { flexDirection: "row", alignItems: "center", gap: 6 },
  sessionStatText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.accent },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "Lora_700Bold", fontSize: 24, color: Colors.light.text, marginTop: 16 },
  emptySubtext: {
    fontFamily: "Inter_400Regular", fontSize: 15, color: Colors.light.textSecondary,
    textAlign: "center", lineHeight: 22, marginTop: 8,
  },
  completeCard: {
    flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 20,
  },
  completeIconCircle: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.light.accent,
    alignItems: "center", justifyContent: "center", marginBottom: 20,
  },
  completeTitle: { fontFamily: "Lora_700Bold", fontSize: 26, color: Colors.light.text, marginBottom: 24 },
  statsRow: { flexDirection: "row", alignItems: "center", gap: 24, marginBottom: 32 },
  statItem: { alignItems: "center" },
  statNumber: { fontFamily: "Inter_600SemiBold", fontSize: 28, color: Colors.light.accent },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  statDivider: { width: 1, height: 40, backgroundColor: Colors.light.border },
  doneBtn: {
    backgroundColor: Colors.light.accent, paddingVertical: 16, paddingHorizontal: 48,
    borderRadius: 16, marginTop: 8,
  },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 16, color: "#fff" },
});
