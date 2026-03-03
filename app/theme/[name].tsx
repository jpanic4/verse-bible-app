import { useEffect, useState, useCallback } from "react";
import { StyleSheet, Text, View, FlatList, Pressable, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { THEMES } from "@/data/themes";
import { fetchVerse, VerseResult } from "@/lib/bible-api";
import { VerseCard } from "@/components/VerseCard";
import { VerseLoadingCard } from "@/components/VerseLoadingCard";

export default function ThemeScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [verses, setVerses] = useState<VerseResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const theme = THEMES.find((t) => t.name === name);

  const loadVerses = useCallback(async () => {
    if (!theme) return;
    setIsLoading(true);
    try {
      const results = await Promise.allSettled(
        theme.verses.map((ref) => fetchVerse(ref))
      );
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<VerseResult> => r.status === "fulfilled")
        .map((r) => r.value);
      setVerses(loaded);
    } catch {} finally {
      setIsLoading(false);
    }
  }, [theme]);

  useEffect(() => {
    loadVerses();
  }, [loadVerses]);

  if (!theme) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.errorText}>Theme not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={verses}
        keyExtractor={(item) => item.reference}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + webTopInset + 12, paddingBottom: insets.bottom + 40 },
        ]}
        ListHeaderComponent={
          <View>
            <View style={styles.headerRow}>
              <Pressable
                onPress={() => router.back()}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.backBtn,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                testID="back-button"
              >
                <Ionicons name="chevron-back" size={24} color={Colors.light.text} />
              </Pressable>
            </View>

            <Animated.View entering={FadeIn.duration(400)} style={styles.headerContent}>
              <View style={[styles.themeIconBg, { backgroundColor: theme.color + "20" }]}>
                <Ionicons name={theme.icon as any} size={32} color={theme.color} />
              </View>
              <Text style={styles.themeName}>{theme.name}</Text>
              <Text style={styles.themeCount}>{theme.verses.length} verses</Text>
            </Animated.View>

            {isLoading && (
              <View style={styles.loadingSection}>
                <VerseLoadingCard />
                <VerseLoadingCard />
              </View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <VerseCard verse={item} index={index} />
        )}
        showsVerticalScrollIndicator={false}
        scrollEnabled={verses.length > 0 || isLoading}
        testID="theme-verses"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  listContent: {
    paddingHorizontal: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center" as const,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  headerContent: {
    alignItems: "center" as const,
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  themeIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 14,
  },
  themeName: {
    fontFamily: "Lora_700Bold",
    fontSize: 26,
    color: Colors.light.text,
    textAlign: "center" as const,
    marginBottom: 4,
  },
  themeCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  loadingSection: {
    gap: 0,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    marginTop: 40,
  },
});
