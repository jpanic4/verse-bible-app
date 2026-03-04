import { useState, useMemo } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";

function safeString(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0] ?? "";
  return "";
}

export default function FillBlankScreen() {
  const params = useLocalSearchParams<{ reference: string; text: string }>();
  const reference = safeString(params.reference);
  const text = safeString(params.text);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const words = useMemo(() => (text || "").split(/\s+/).filter(Boolean), [text]);

  const blankedIndices = useMemo(() => {
    const indices: number[] = [];
    words.forEach((_, i) => {
      if (Math.random() < 0.4 && words[i].length > 2) indices.push(i);
    });
    if (indices.length === 0 && words.length > 0) indices.push(0);
    return new Set(indices);
  }, [words]);

  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  const revealWord = (index: number) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRevealed((prev) => new Set([...prev, index]));
  };

  const revealAll = () => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setRevealed(new Set(blankedIndices));
  };

  const totalBlanks = blankedIndices.size;
  const filledBlanks = [...blankedIndices].filter((i) => revealed.has(i)).length;
  const progress = totalBlanks > 0 ? filledBlanks / totalBlanks : 0;
  const complete = filledBlanks === totalBlanks;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="fillblank-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Fill in the Blank</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>
        <Text style={styles.progressText}>{filledBlanks}/{totalBlanks}</Text>
      </View>

      <Text style={styles.refLabel}>{reference}</Text>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.wordContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.wordsWrap}>
          {words.map((word, i) => {
            const isBlanked = blankedIndices.has(i);
            const isRevealed = revealed.has(i);

            if (!isBlanked) {
              return <Text key={i} style={styles.word}>{word} </Text>;
            }

            if (isRevealed) {
              return (
                <Animated.View key={i} entering={FadeIn.duration(300)}>
                  <Text style={styles.revealedWord}>{word} </Text>
                </Animated.View>
              );
            }

            return (
              <Pressable key={i} onPress={() => revealWord(i)} testID={`blank-${i}`}>
                <Text style={styles.blank}>{"_".repeat(Math.max(word.length, 3))} </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {complete ? (
          <Pressable onPress={() => router.back()} style={styles.doneBtn} testID="fillblank-done">
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.doneBtnText}>Complete!</Text>
          </Pressable>
        ) : (
          <Pressable onPress={revealAll} style={styles.revealBtn} testID="fillblank-reveal">
            <Ionicons name="eye-outline" size={18} color={Colors.light.accent} />
            <Text style={styles.revealBtnText}>Reveal All</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  progressBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.light.border },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.accent },
  progressText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.textSecondary },
  refLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent, marginBottom: 16, letterSpacing: 0.5 },
  scrollArea: { flex: 1 },
  wordContainer: { paddingBottom: 20 },
  wordsWrap: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline" as const },
  word: { fontFamily: "Lora_400Regular", fontSize: 20, lineHeight: 36, color: Colors.light.text },
  revealedWord: { fontFamily: "Lora_700Bold", fontSize: 20, lineHeight: 36, color: Colors.light.olive },
  blank: { fontFamily: "Lora_400Regular", fontSize: 20, lineHeight: 36, color: Colors.light.accent, textDecorationLine: "underline" as const },
  footer: { marginTop: 16 },
  revealBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.surface,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  revealBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.accent },
  doneBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.olive,
  },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
