import { ScrollView, View, Text, StyleSheet, Pressable, Platform, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const isNarrow = SCREEN_WIDTH < 400;

const COLORS = {
  bg: "#FAF6F0",
  surface: "#FFFFFF",
  text: "#2C2418",
  textSecondary: "#7A7062",
  accent: "#C4794A",
  accentLight: "#E8C4A8",
  olive: "#5B6B4A",
  oliveDark: "#2C3325",
  border: "#E8E0D6",
};

const CORE_FEATURES = [
  { icon: "sunny-outline" as const, title: "Daily Verse", desc: "Start each day with a fresh verse from Scripture, plus a daily wisdom proverb and a structured reading plan.", color: "rgba(196,121,74,0.12)" },
  { icon: "volume-high-outline" as const, title: "Audio Bible", desc: "Listen to any verse read aloud from the ESV. Tap the speaker icon on any verse card to hear the passage.", color: "rgba(91,107,74,0.12)" },
  { icon: "search-outline" as const, title: "Smart Search", desc: "Look up any Bible reference instantly, or search by keyword across the entire English Standard Version.", color: "rgba(106,158,196,0.12)" },
  { icon: "bookmark-outline" as const, title: "Save & Collect", desc: "Save your favorite verses for later. Build a personal library of the passages that speak to you most.", color: "rgba(232,166,64,0.12)" },
  { icon: "trophy-outline" as const, title: "Bible Challenge", desc: "Test your knowledge with Jeopardy-style trivia. Choose from 23 categories and earn points with streak bonuses.", color: "rgba(139,123,181,0.12)" },
  { icon: "flame-outline" as const, title: "Streaks & XP", desc: "Build a daily habit with streak tracking and XP points. Every verse you read, practice, or review earns progress.", color: "rgba(212,115,106,0.12)" },
];

const PRACTICE_MODES: { icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; color: string }[] = [
  { icon: "copy-outline", title: "Flashcard", desc: "Classic flip cards — see the reference, recall the verse, flip to check.", color: "rgba(232,168,56,0.2)" },
  { icon: "hand-left-outline", title: "Fill in the Blank", desc: "40% of words are hidden — tap to reveal them as you recall each one.", color: "rgba(123,174,110,0.2)" },
  { icon: "shuffle-outline", title: "Scramble", desc: "Words are shuffled — drag them back into the correct order.", color: "rgba(106,158,196,0.2)" },
  { icon: "help-circle-outline", title: "AI Quiz", desc: "AI-generated questions test comprehension, context, and recall.", color: "rgba(139,123,181,0.2)" },
  { icon: "pencil-outline", title: "Type It", desc: "Type the verse from memory with real-time accuracy feedback.", color: "rgba(212,115,106,0.2)" },
  { icon: "musical-notes-outline", title: "Sing It", desc: "AI turns any verse into a song — choose Gospel, Hymn, Pop, R&B, and more.", color: "rgba(196,121,74,0.2)" },
];

const THEME_ICONS: { name: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { name: "Love", icon: "heart-outline" },
  { name: "Hope", icon: "sunny-outline" },
  { name: "Strength", icon: "fitness-outline" },
  { name: "Peace", icon: "leaf-outline" },
  { name: "Faith", icon: "flower-outline" },
  { name: "Forgiveness", icon: "hand-right-outline" },
  { name: "Wisdom", icon: "bulb-outline" },
  { name: "Joy", icon: "happy-outline" },
  { name: "Gratitude", icon: "thumbs-up-outline" },
  { name: "Provision", icon: "gift-outline" },
  { name: "Spiritual Warfare", icon: "shield-outline" },
  { name: "Family", icon: "home-outline" },
  { name: "Identity in Christ", icon: "person-outline" },
  { name: "Patience", icon: "time-outline" },
  { name: "Purpose", icon: "star-outline" },
  { name: "Healing", icon: "medkit-outline" },
  { name: "Unity", icon: "people-outline" },
  { name: "Creation", icon: "globe-outline" },
];

const SRS_STEPS = [
  { day: "Day 1", label: "First review" },
  { day: "Day 3", label: "Getting easier" },
  { day: "Day 7", label: "Building strength" },
  { day: "Day 21", label: "Long-term memory" },
  { day: "Day 60+", label: "Memorized" },
];

export default function FeaturesPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(600)} style={[styles.hero, { paddingTop: topPadding + 20 }]}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { top: topPadding + 16 }]} hitSlop={12}>
            <Ionicons name="arrow-back" size={22} color="#FAF6F0" />
          </Pressable>
          <View style={styles.heroIcon}>
            <Ionicons name="book-outline" size={30} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>Verse</Text>
          <Text style={styles.heroSubtitle}>A beautiful Bible companion that helps you discover, memorize, and live God's Word every day — powered by science and song.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={styles.statsBar}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>18</Text>
            <Text style={styles.statLabel}>Themed Collections</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>6</Text>
            <Text style={styles.statLabel}>Practice Modes</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>365</Text>
            <Text style={styles.statLabel}>Day Reading Plan</Text>
          </View>
        </Animated.View>

        <View style={styles.section}>
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionBadge}>CORE FEATURES</Text>
              <Text style={styles.sectionTitle}>Everything you need in one app</Text>
              <Text style={styles.sectionDesc}>Daily verses, audio Bible, smart search, and a full memorization toolkit — all in a warm, distraction-free design.</Text>
            </View>
          </Animated.View>
          <View style={styles.featureGrid}>
            {CORE_FEATURES.map((f, i) => (
              <Animated.View key={f.title} entering={FadeInDown.duration(400).delay(250 + i * 60)} style={styles.featureCard}>
                <View style={[styles.featureIconWrap, { backgroundColor: f.color }]}>
                  <Ionicons name={f.icon} size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.featureCardTitle}>{f.title}</Text>
                <Text style={styles.featureCardDesc}>{f.desc}</Text>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.practiceSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionBadge, { color: COLORS.accentLight, backgroundColor: "rgba(232,196,168,0.15)" }]}>MEMORIZATION TOOLKIT</Text>
            <Text style={[styles.sectionTitle, { color: "#FAF6F0" }]}>6 ways to make Scripture stick</Text>
            <Text style={[styles.sectionDesc, { color: "rgba(250,246,240,0.7)" }]}>From flashcards to AI-generated songs, every mode is designed to move verses from short-term to long-term memory.</Text>
          </View>
          <View style={styles.practiceGrid}>
            {PRACTICE_MODES.map((m, i) => (
              <Animated.View key={m.title} entering={FadeInDown.duration(400).delay(200 + i * 50)} style={styles.practiceCard}>
                <View style={[styles.practiceEmoji, { backgroundColor: m.color }]}>
                  <Ionicons name={m.icon} size={20} color="#FAF6F0" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.practiceCardTitle}>{m.title}</Text>
                  <Text style={styles.practiceCardDesc}>{m.desc}</Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        <View style={styles.srsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>SCIENCE-BACKED</Text>
            <Text style={styles.sectionTitle}>Spaced Repetition System</Text>
            <Text style={styles.sectionDesc}>Built on the SM-2 algorithm (the same science behind Anki and Duolingo), Verse schedules reviews at the optimal moment — right before you'd forget.</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.srsTimeline}>
            {SRS_STEPS.map((s, i) => (
              <View key={s.day} style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.srsStep}>
                  <Text style={styles.srsDay}>{s.day}</Text>
                  <Text style={styles.srsLabel}>{s.label}</Text>
                </View>
                {i < SRS_STEPS.length - 1 && (
                  <Ionicons name="arrow-forward" size={18} color={COLORS.accentLight} style={{ marginHorizontal: 6 }} />
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={styles.verseQuote}>
          <Text style={styles.quoteText}>"Your word is a lamp to my feet and a light to my path."</Text>
          <Text style={styles.quoteCite}>Psalm 119:105 (ESV)</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionBadge}>CURATED FOR LIFE</Text>
            <Text style={styles.sectionTitle}>18 Themed Collections</Text>
            <Text style={styles.sectionDesc}>Whatever season of life you're in, there's a collection of verses to encourage, strengthen, and guide you.</Text>
          </View>
          <View style={styles.themesWrap}>
            {THEME_ICONS.map((t) => (
              <View key={t.name} style={styles.themeChip}>
                <Ionicons name={t.icon} size={14} color={COLORS.accent} />
                <Text style={styles.themeChipText}>{t.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Start memorizing Scripture today</Text>
          <Text style={styles.ctaDesc}>Free to use. No account required. Just open the app and begin your journey with God's Word.</Text>
          <Pressable
            onPress={() => router.replace("/(tabs)")}
            style={({ pressed }) => [styles.ctaButton, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
          >
            <Ionicons name="arrow-forward" size={18} color="#fff" />
            <Text style={styles.ctaButtonText}>Open the App</Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Verse — Built with love for the Word of God</Text>
          <Text style={[styles.footerText, { marginTop: 4 }]}>Scripture quotations are from the ESV® Bible, copyright © 2001 by Crossway.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: {
    backgroundColor: COLORS.oliveDark,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: "center",
  },
  backButton: {
    position: "absolute" as const,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(250,246,240,0.15)",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: isNarrow ? 32 : 40,
    color: "#FAF6F0",
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: "rgba(250,246,240,0.85)",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 480,
  },
  statsBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: isNarrow ? 24 : 48,
    paddingVertical: 24,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  stat: { alignItems: "center" },
  statNumber: {
    fontFamily: "Lora_700Bold",
    fontSize: isNarrow ? 24 : 30,
    color: COLORS.accent,
  },
  statLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  section: { paddingHorizontal: 20, paddingVertical: 48 },
  sectionHeader: { alignItems: "center", marginBottom: 32 },
  sectionBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    color: COLORS.accent,
    backgroundColor: "rgba(196,121,74,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: isNarrow ? 24 : 28,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  sectionDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 480,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "center",
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 22,
    width: isNarrow ? "100%" as any : 170,
    minWidth: isNarrow ? undefined : 170,
    flexGrow: isNarrow ? 1 : 0,
  },
  featureIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  featureCardTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 6,
  },
  featureCardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 19,
  },
  practiceSection: {
    backgroundColor: COLORS.oliveDark,
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  practiceGrid: { gap: 12 },
  practiceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    backgroundColor: "rgba(250,246,240,0.08)",
    borderWidth: 1,
    borderColor: "rgba(250,246,240,0.12)",
    borderRadius: 14,
    padding: 18,
  },
  practiceEmoji: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "rgba(250,246,240,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  practiceCardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FAF6F0",
    marginBottom: 3,
  },
  practiceCardDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(250,246,240,0.6)",
    lineHeight: 18,
  },
  srsSection: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  srsTimeline: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  srsStep: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 90,
  },
  srsDay: {
    fontFamily: "Lora_700Bold",
    fontSize: 18,
    color: COLORS.accent,
  },
  srsLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  verseQuote: {
    paddingVertical: 40,
    paddingHorizontal: 28,
    alignItems: "center",
  },
  quoteText: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    fontStyle: "italic",
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 28,
    maxWidth: 480,
  },
  quoteCite: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: COLORS.accent,
    marginTop: 12,
  },
  themesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  themeChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  themeChipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: COLORS.text,
  },
  ctaSection: {
    backgroundColor: COLORS.oliveDark,
    paddingHorizontal: 24,
    paddingVertical: 56,
    alignItems: "center",
  },
  ctaTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: isNarrow ? 26 : 32,
    color: "#FAF6F0",
    textAlign: "center",
    marginBottom: 12,
  },
  ctaDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: "rgba(250,246,240,0.8)",
    textAlign: "center",
    maxWidth: 420,
    marginBottom: 28,
    lineHeight: 23,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  ctaButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  footer: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    alignItems: "center",
  },
  footerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
});
