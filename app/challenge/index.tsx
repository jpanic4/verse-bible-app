import { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Platform,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { BOOK_GROUP_CATEGORIES, THEME_CATEGORIES, MIXED_CATEGORY } from "@/data/bible-challenge";

type Difficulty = "beginner" | "intermediate" | "advanced";

const DIFFICULTIES: { key: Difficulty; label: string; color: string }[] = [
  { key: "beginner", label: "Beginner", color: "#7BAE6E" },
  { key: "intermediate", label: "Intermediate", color: "#E8A838" },
  { key: "advanced", label: "Advanced", color: "#D4736A" },
];

export default function ChallengeIndexScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { width } = useWindowDimensions();
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");

  const cardWidth = (width - 28 - 24) / 3;

  const handleCategoryPress = (categoryId: string, categoryName: string) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/challenge/play" as any,
      params: { category: categoryId, categoryName, difficulty },
    });
  };

  const handleBack = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + webTopInset + 12, paddingBottom: insets.bottom + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={handleBack} hitSlop={12} testID="challenge-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
      </View>

      <Animated.View entering={FadeIn.duration(400)} style={styles.heroSection}>
        <View style={styles.heroIconCircle}>
          <Ionicons name="trophy" size={32} color="#E8A838" />
        </View>
        <Text style={styles.heroTitle}>Bible Challenge</Text>
        <Text style={styles.heroSubtitle}>Test your knowledge across books and themes</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.difficultySection}>
        <Text style={styles.difficultyLabel}>Difficulty</Text>
        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map((d) => {
            const isSelected = difficulty === d.key;
            return (
              <Pressable
                key={d.key}
                onPress={() => {
                  if (Platform.OS !== "web") Haptics.selectionAsync();
                  setDifficulty(d.key);
                }}
                style={[
                  styles.difficultyBtn,
                  isSelected && { backgroundColor: d.color + "20", borderColor: d.color },
                ]}
                testID={`difficulty-${d.key}`}
              >
                <View style={[styles.difficultyDot, { backgroundColor: d.color }]} />
                <Text
                  style={[
                    styles.difficultyText,
                    isSelected && { color: d.color },
                  ]}
                >
                  {d.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(150).duration(400)}>
        <Pressable
          onPress={() => handleCategoryPress(MIXED_CATEGORY.id, MIXED_CATEGORY.name)}
          style={({ pressed }) => [
            styles.mixedCard,
            { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          testID="category-mixed"
        >
          <View style={styles.mixedIconCircle}>
            <Ionicons name={MIXED_CATEGORY.icon as any} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.mixedTextCol}>
            <Text style={styles.mixedTitle}>Mixed Challenge</Text>
            <Text style={styles.mixedDesc}>Random questions from all categories</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF80" />
        </Pressable>
      </Animated.View>

      <Text style={styles.sectionTitle}>Books of the Bible</Text>
      <View style={styles.bookGrid}>
        {BOOK_GROUP_CATEGORIES.map((group, i) => (
          <Animated.View
            key={group.id}
            entering={FadeInDown.delay(200 + i * 60).duration(400).springify()}
            style={{ width: cardWidth }}
          >
            <Pressable
              onPress={() => handleCategoryPress(group.id, group.name)}
              style={({ pressed }) => [
                styles.categoryCard,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
              testID={`category-${group.id}`}
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: group.color + "18" }]}>
                {group.iconFamily === "MaterialCommunityIcons" ? (
                  <MaterialCommunityIcons name={group.icon as any} size={22} color={group.color} />
                ) : (
                  <Ionicons name={group.icon as any} size={22} color={group.color} />
                )}
              </View>
              <Text style={styles.categoryName} numberOfLines={2}>{group.name}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Themes</Text>
      <View style={styles.themesGrid}>
        {THEME_CATEGORIES.map((theme, i) => (
          <Animated.View
            key={theme.id}
            entering={FadeInDown.delay(400 + i * 40).duration(400).springify()}
            style={{ width: (width - 28 - 12) / 2 }}
          >
            <Pressable
              onPress={() => handleCategoryPress(theme.id, theme.name)}
              style={({ pressed }) => [
                styles.themeCard,
                { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
              testID={`category-theme-${theme.id}`}
            >
              <Ionicons name={theme.icon as any} size={24} color={theme.color} />
              <Text style={styles.themeName} numberOfLines={1}>{theme.name}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: 20,
    marginBottom: 8,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8A83818",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 26,
    color: Colors.light.text,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  difficultySection: {
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  difficultyLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  difficultyRow: {
    flexDirection: "row",
    gap: 8,
  },
  difficultyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  difficultyText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
  mixedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.accent,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 24,
    gap: 12,
  },
  mixedIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  mixedTextCol: {
    flex: 1,
  },
  mixedTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  mixedDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: "rgba(255,255,255,0.75)",
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  bookGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 6,
    marginBottom: 24,
  },
  categoryCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 90,
    justifyContent: "center",
  },
  categoryIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    color: Colors.light.text,
    textAlign: "center",
  },
  themesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 0,
    marginBottom: 20,
  },
  themeCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  themeName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.text,
    flex: 1,
  },
});
