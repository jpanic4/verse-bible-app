import { useState, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ScrambleScreen() {
  const { reference, text } = useLocalSearchParams<{ reference: string; text: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const words = useMemo(() => (text || "").split(/\s+/).filter(Boolean), [text]);
  const [shuffled, setShuffled] = useState(() => shuffle(words.map((w, i) => ({ word: w, origIndex: i }))));
  const [placed, setPlaced] = useState<number[]>([]);
  const [wrongIndex, setWrongIndex] = useState<number | null>(null);

  const currentIndex = placed.length;
  const complete = placed.length === words.length;
  const progress = words.length > 0 ? placed.length / words.length : 0;

  const handleTap = (origIndex: number) => {
    if (origIndex === currentIndex) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPlaced((prev) => [...prev, origIndex]);
      setWrongIndex(null);
    } else {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setWrongIndex(origIndex);
      setTimeout(() => setWrongIndex(null), 600);
    }
  };

  const resetGame = () => {
    setPlaced([]);
    setShuffled(shuffle(words.map((w, i) => ({ word: w, origIndex: i }))));
    setWrongIndex(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="scramble-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Scramble</Text>
        <Pressable onPress={resetGame} hitSlop={12} testID="scramble-reset">
          <Ionicons name="refresh" size={22} color={Colors.light.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.progressText}>{placed.length}/{words.length}</Text>
      </View>

      <Text style={styles.refLabel}>{reference}</Text>

      <View style={styles.placedArea}>
        <View style={styles.placedWrap}>
          {placed.map((idx) => (
            <Animated.View key={`p-${idx}`} entering={FadeInUp.duration(250)}>
              <Text style={styles.placedWord}>{words[idx]} </Text>
            </Animated.View>
          ))}
          {!complete && <Text style={styles.cursor}>|</Text>}
        </View>
      </View>

      <ScrollView style={styles.chipArea} contentContainerStyle={styles.chipContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.chipWrap}>
          {shuffled.map((item, i) => {
            const isPlaced = placed.includes(item.origIndex);
            const isWrong = wrongIndex === item.origIndex;
            if (isPlaced) return <View key={i} style={styles.chipGhost} />;
            return (
              <Animated.View key={i} entering={FadeIn.delay(i * 20).duration(200)}>
                <Pressable
                  onPress={() => handleTap(item.origIndex)}
                  style={[styles.chip, isWrong && styles.chipWrong]}
                  testID={`scramble-chip-${i}`}
                >
                  <Text style={[styles.chipText, isWrong && styles.chipTextWrong]}>{item.word}</Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {complete && (
        <Animated.View entering={FadeIn.duration(400)}>
          <Pressable onPress={() => router.back()} style={styles.doneBtn} testID="scramble-done">
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.doneBtnText}>Well Done!</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  progressBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.light.border },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.accent },
  progressText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  refLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent, marginBottom: 12, letterSpacing: 0.5 },
  placedArea: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 18,
    minHeight: 100,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  placedWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" as const },
  placedWord: { fontFamily: "Lora_400Regular", fontSize: 18, lineHeight: 30, color: Colors.light.text },
  cursor: { fontFamily: "Inter_400Regular", fontSize: 20, color: Colors.light.accent },
  chipArea: { flex: 1 },
  chipContainer: { paddingBottom: 16 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipWrong: { borderColor: "#D9534F", backgroundColor: "#FFF0EF" },
  chipGhost: { width: 60, height: 40, opacity: 0 },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
  chipTextWrong: { color: "#D9534F" },
  doneBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.olive, marginTop: 12,
  },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
