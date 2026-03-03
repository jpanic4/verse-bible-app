import { StyleSheet, Text, Pressable, Platform, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { Theme } from "@/data/themes";

interface ThemeCardProps {
  theme: Theme;
  index: number;
  onPress: () => void;
}

export function ThemeCard({ theme, index, onPress }: ThemeCardProps) {
  const { width } = useWindowDimensions();
  const cardWidth = (width - 28 - 12) / 2;

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400).springify()} style={{ width: cardWidth }}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.card,
          { opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        ]}
        testID={`theme-card-${theme.name}`}
      >
        <Ionicons
          name={theme.icon as any}
          size={28}
          color={theme.color}
          style={styles.icon}
        />
        <Text style={styles.name} numberOfLines={1}>{theme.name}</Text>
        <Text style={styles.count}>{theme.verses.length} verses</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center" as const,
    minHeight: 110,
    justifyContent: "center" as const,
  },
  icon: {
    marginBottom: 8,
  },
  name: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.text,
    textAlign: "center" as const,
    marginBottom: 4,
  },
  count: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: Colors.light.textTertiary,
  },
});
