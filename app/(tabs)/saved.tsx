import { StyleSheet, Text, View, FlatList, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { useSavedVerses } from "@/context/SavedVersesContext";
import { VerseCard } from "@/components/VerseCard";

export default function SavedScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const { savedVerses } = useSavedVerses();

  return (
    <View style={styles.container}>
      <FlatList
        data={savedVerses}
        keyExtractor={(item) => item.reference}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + webTopInset + 20, paddingBottom: insets.bottom + 100 },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Saved</Text>
            {savedVerses.length > 0 && (
              <Animated.View entering={FadeIn.duration(300)}>
                <Text style={styles.count}>
                  {savedVerses.length} verse{savedVerses.length !== 1 ? "s" : ""}
                </Text>
              </Animated.View>
            )}
          </View>
        }
        renderItem={({ item, index }) => (
          <VerseCard verse={item} index={index} />
        )}
        ListEmptyComponent={
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <Ionicons name="bookmark-outline" size={36} color={Colors.light.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No saved verses yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the bookmark icon on any verse to save it here
            </Text>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
        scrollEnabled={savedVerses.length > 0}
        testID="saved-list"
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
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: Colors.light.text,
    marginBottom: 4,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIconWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.light.surfaceSecondary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
    lineHeight: 20,
  },
});
