import { StyleSheet, Text, View, Pressable, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { VerseResult } from "@/lib/bible-api";
import { useSavedVerses } from "@/context/SavedVersesContext";
import { useAudioPlayer } from "@/lib/useAudioPlayer";

interface VerseCardProps {
  verse: VerseResult;
  index?: number;
  showActions?: boolean;
  onPress?: () => void;
  compact?: boolean;
}

export function VerseCard({ verse, index = 0, showActions = true, onPress, compact = false }: VerseCardProps) {
  const { isSaved, toggleSave } = useSavedVerses();
  const router = useRouter();
  const saved = isSaved(verse.reference);
  const { isPlaying: globalPlaying, isLoading: globalAudioLoading, currentReference, toggleAudio } = useAudioPlayer();
  const isThisPlaying = globalPlaying && currentReference === verse.reference;
  const isThisLoading = globalAudioLoading && currentReference === verse.reference;

  const handleSave = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleSave(verse);
  };

  const handlePractice = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/practice/[reference]",
      params: { reference: verse.reference, text: verse.text, translation: verse.translation },
    });
  };

  const handleAudio = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    toggleAudio(verse.reference);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          { opacity: pressed && onPress ? 0.92 : 1 },
        ]}
        testID={`verse-card-${verse.reference}`}
      >
        <Text style={[styles.verseText, compact && styles.verseTextCompact]} numberOfLines={compact ? 3 : undefined}>
          {verse.text}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.reference}>{verse.reference}</Text>
          {showActions && (
            <View style={styles.actionRow}>
              <Pressable
                onPress={handleAudio}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.saveButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                testID={`audio-verse-${verse.reference}`}
              >
                {isThisLoading ? (
                  <ActivityIndicator size={18} color={Colors.light.textSecondary} />
                ) : (
                  <Ionicons
                    name={isThisPlaying ? "pause-circle" : "volume-medium-outline"}
                    size={20}
                    color={isThisPlaying ? Colors.light.accent : Colors.light.textSecondary}
                  />
                )}
              </Pressable>
              <Pressable
                onPress={handlePractice}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.saveButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                testID={`practice-verse-${verse.reference}`}
              >
                <Ionicons name="school-outline" size={20} color={Colors.light.textSecondary} />
              </Pressable>
              <Pressable
                onPress={handleSave}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.saveButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
                testID={`save-verse-${verse.reference}`}
              >
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={saved ? Colors.light.accent : Colors.light.textSecondary}
                />
              </Pressable>
            </View>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardCompact: {
    padding: 16,
    marginHorizontal: 0,
    marginBottom: 8,
  },
  verseText: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    lineHeight: 28,
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  verseTextCompact: {
    fontSize: 15,
    lineHeight: 24,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  reference: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  saveButton: {
    padding: 4,
  },
});
