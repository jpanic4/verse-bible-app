import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";

const MODES = [
  { key: "flashcard", label: "Flashcard", icon: "layers-outline" as const, desc: "Flip to reveal the verse" },
  { key: "fill-blank", label: "Fill in the Blank", icon: "remove-outline" as const, desc: "Tap to reveal hidden words" },
  { key: "scramble", label: "Scramble", icon: "shuffle-outline" as const, desc: "Reorder shuffled words" },
  { key: "quiz", label: "Quiz", icon: "help-circle-outline" as const, desc: "AI-generated questions" },
  { key: "type-it", label: "Type It", icon: "create-outline" as const, desc: "Type the verse from memory" },
  { key: "sing-it", label: "Sing It", icon: "musical-notes-outline" as const, desc: "Generate a song from scripture" },
];

export default function PracticeModeSelector() {
  const { reference, text, translation } = useLocalSearchParams<{
    reference: string;
    text: string;
    translation: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const navigateToMode = (mode: string) => {
    router.push({
      pathname: `/practice/${mode}` as any,
      params: { reference, text, translation },
    });
  };

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
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn} testID="practice-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Practice</Text>
      </View>

      <View style={styles.versePreview}>
        <Text style={styles.previewText} numberOfLines={3}>{text}</Text>
        <Text style={styles.previewRef}>{reference}</Text>
      </View>

      <Text style={styles.sectionTitle}>Choose a mode</Text>

      <View style={styles.grid}>
        {MODES.map((mode, i) => (
          <Animated.View key={mode.key} entering={FadeInDown.delay(i * 60).duration(350).springify()} style={styles.gridItem}>
            <Pressable
              onPress={() => navigateToMode(mode.key)}
              style={({ pressed }) => [styles.modeCard, { opacity: pressed ? 0.85 : 1 }]}
              testID={`practice-mode-${mode.key}`}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={mode.icon} size={26} color={Colors.light.accent} />
              </View>
              <Text style={styles.modeLabel}>{mode.label}</Text>
              <Text style={styles.modeDesc}>{mode.desc}</Text>
            </Pressable>
          </Animated.View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20, gap: 12 },
  backBtn: { padding: 4 },
  title: { fontFamily: "Lora_700Bold", fontSize: 26, color: Colors.light.text },
  versePreview: {
    backgroundColor: Colors.light.oliveDark,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
  },
  previewText: { fontFamily: "Lora_400Regular", fontSize: 15, lineHeight: 24, color: "#FAF6F0" },
  previewRef: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: Colors.light.accentLight, marginTop: 10, letterSpacing: 0.5 },
  sectionTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.textSecondary, marginBottom: 14, letterSpacing: 0.5, textTransform: "uppercase" as const },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  gridItem: { width: "47%" as any, flexGrow: 1 },
  modeCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minHeight: 130,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFF0E6",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 10,
  },
  modeLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text, marginBottom: 4 },
  modeDesc: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, lineHeight: 17 },
});
