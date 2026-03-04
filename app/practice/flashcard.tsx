import { useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, interpolate } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useStreak } from "@/context/StreakContext";

function safeString(val: unknown): string {
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val[0] ?? "";
  return "";
}

export default function FlashcardScreen() {
  const params = useLocalSearchParams<{ reference: string; text: string }>();
  const reference = safeString(params.reference);
  const text = safeString(params.text);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const { recordActivity } = useStreak();
  const [flipped, setFlipped] = useState(false);
  const rotation = useSharedValue(0);

  const flip = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = flipped ? 0 : 1;
    rotation.value = withTiming(toValue, { duration: 500 });
    if (!flipped) recordActivity("practice");
    setFlipped(!flipped);
  };

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(rotation.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: "hidden" as const,
  }));

  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 1000 }, { rotateY: `${interpolate(rotation.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: "hidden" as const,
  }));

  const reset = () => {
    rotation.value = withTiming(0, { duration: 400 });
    setFlipped(false);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="flashcard-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Flashcard</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.instruction}>{flipped ? "Here's the verse" : "Can you recall this verse?"}</Text>

      <Pressable onPress={flip} style={styles.cardContainer} testID="flashcard-flip">
        <Animated.View style={[styles.card, styles.cardFront, frontStyle]}>
          <Ionicons name="book-outline" size={32} color={Colors.light.accentLight} style={{ marginBottom: 16 }} />
          <Text style={styles.refText}>{reference}</Text>
          <Text style={styles.tapHint}>Tap to reveal</Text>
        </Animated.View>
        <Animated.View style={[styles.card, styles.cardBack, backStyle]}>
          <Text style={styles.verseText}>{text}</Text>
          <Text style={styles.refSmall}>{reference}</Text>
        </Animated.View>
      </Pressable>

      {flipped && (
        <View style={styles.actions}>
          <Pressable onPress={reset} style={[styles.actionBtn, styles.retryBtn]} testID="flashcard-retry">
            <Ionicons name="refresh" size={18} color={Colors.light.accent} />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
          <Pressable onPress={() => router.back()} style={[styles.actionBtn, styles.doneBtn]} testID="flashcard-done">
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.doneText}>Got It</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  instruction: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" as const, marginBottom: 24 },
  cardContainer: { flex: 1, maxHeight: 380, alignSelf: "center" as const, width: "100%" as any },
  card: {
    position: "absolute" as const,
    width: "100%" as any,
    height: "100%" as any,
    borderRadius: 24,
    padding: 28,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cardFront: { backgroundColor: Colors.light.oliveDark },
  cardBack: { backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border },
  refText: { fontFamily: "Lora_700Bold", fontSize: 28, color: "#FAF6F0", textAlign: "center" as const },
  tapHint: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.accentLight, marginTop: 16 },
  verseText: { fontFamily: "Lora_400Regular", fontSize: 18, lineHeight: 30, color: Colors.light.text, textAlign: "center" as const },
  refSmall: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.accent, marginTop: 16, letterSpacing: 0.5 },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const, paddingVertical: 14, borderRadius: 14, gap: 8 },
  retryBtn: { backgroundColor: Colors.light.surface, borderWidth: 1, borderColor: Colors.light.border },
  doneBtn: { backgroundColor: Colors.light.accent },
  retryText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.accent },
  doneText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
