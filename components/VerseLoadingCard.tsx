import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";
import Colors from "@/constants/colors";

export function VerseLoadingCard() {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.7, { duration: 800 }), -1, true);
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.line, styles.lineLong, shimmerStyle]} />
      <Animated.View style={[styles.line, styles.lineMedium, shimmerStyle]} />
      <Animated.View style={[styles.line, styles.lineShort, shimmerStyle]} />
      <View style={styles.footer}>
        <Animated.View style={[styles.refLine, shimmerStyle]} />
      </View>
    </View>
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
  line: {
    height: 14,
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 7,
    marginBottom: 10,
  },
  lineLong: {
    width: "100%",
  },
  lineMedium: {
    width: "80%",
  },
  lineShort: {
    width: "50%",
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  refLine: {
    height: 12,
    width: 120,
    backgroundColor: Colors.light.surfaceSecondary,
    borderRadius: 6,
  },
});
