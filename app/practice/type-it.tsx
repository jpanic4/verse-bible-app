import { useState, useRef, useMemo, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, ScrollView, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useStreak } from "@/context/StreakContext";

function safeString(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0] ?? "";
  return "";
}

export default function TypeItScreen() {
  const params = useLocalSearchParams<{ reference: string; text: string }>();
  const reference = safeString(params.reference);
  const text = safeString(params.text);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const inputRef = useRef<TextInput>(null);

  const { recordActivity } = useStreak();
  const [typed, setTyped] = useState("");
  const [showHint, setShowHint] = useState(false);

  const verseWords = useMemo(() => (text || "").split(/\s+/).filter(Boolean), [text]);
  const typedWords = typed.split(/\s+/).filter(Boolean);

  const accuracy = useMemo(() => {
    if (typedWords.length === 0) return 0;
    let correct = 0;
    typedWords.forEach((w, i) => {
      if (i < verseWords.length && w.toLowerCase() === verseWords[i].toLowerCase()) correct++;
    });
    return Math.round((correct / Math.max(typedWords.length, 1)) * 100);
  }, [typed, verseWords]);

  const nextHintWord = verseWords[typedWords.length] || "";
  const isComplete = typedWords.length >= verseWords.length && accuracy >= 80;
  const completedRef = useRef(false);

  useEffect(() => {
    if (isComplete && !completedRef.current) {
      completedRef.current = true;
      recordActivity("practice");
    }
  }, [isComplete, recordActivity]);

  const handleHint = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowHint(true);
    setTimeout(() => setShowHint(false), 2000);
  };

  const renderComparison = () => {
    return typedWords.map((word, i) => {
      const expected = verseWords[i] || "";
      const correct = word.toLowerCase() === expected.toLowerCase();
      return (
        <Text key={i} style={correct ? styles.correctWord : styles.wrongWord}>
          {word}{" "}
        </Text>
      );
    });
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top + webTopInset + 16 }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + webBottomInset + 40 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="typeit-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Type It</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.refLabel}>{reference}</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{accuracy}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{typedWords.length}/{verseWords.length}</Text>
          <Text style={styles.statLabel}>Words</Text>
        </View>
      </View>

      {typedWords.length > 0 && (
        <View style={styles.comparisonArea}>
          <View style={styles.comparisonWrap}>{renderComparison()}</View>
        </View>
      )}

      <TextInput
        ref={inputRef}
        style={styles.input}
        value={typed}
        onChangeText={setTyped}
        placeholder="Type the verse from memory..."
        placeholderTextColor={Colors.light.textTertiary}
        multiline
        autoCapitalize="sentences"
        testID="typeit-input"
      />

      {showHint && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.hintBox}>
          <Text style={styles.hintLabel}>Next word:</Text>
          <Text style={styles.hintWord}>{nextHintWord}</Text>
        </Animated.View>
      )}

      <View style={styles.actions}>
        {!isComplete && (
          <Pressable onPress={handleHint} style={styles.hintBtn} testID="typeit-hint">
            <Ionicons name="bulb-outline" size={18} color={Colors.light.accent} />
            <Text style={styles.hintBtnText}>Show Hint</Text>
          </Pressable>
        )}

        {isComplete && (
          <Animated.View entering={FadeIn.duration(400)} style={{ width: "100%" as any }}>
            <Pressable onPress={() => router.back()} style={styles.doneBtn} testID="typeit-done">
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.doneBtnText}>Excellent!</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  refLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent, marginBottom: 16, letterSpacing: 0.5 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  stat: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center" as const,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statValue: { fontFamily: "Inter_600SemiBold", fontSize: 20, color: Colors.light.text },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  comparisonArea: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  comparisonWrap: { flexDirection: "row", flexWrap: "wrap" },
  correctWord: { fontFamily: "Lora_400Regular", fontSize: 16, lineHeight: 26, color: Colors.light.olive },
  wrongWord: { fontFamily: "Lora_400Regular", fontSize: 16, lineHeight: 26, color: "#D9534F", textDecorationLine: "underline" as const },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 16,
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    lineHeight: 28,
    color: Colors.light.text,
    minHeight: 120,
    textAlignVertical: "top" as const,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: "#FFF0E6",
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  hintLabel: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  hintWord: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.accent },
  actions: { marginTop: 20, gap: 10 },
  hintBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border,
  },
  hintBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.accent },
  doneBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.olive,
  },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
