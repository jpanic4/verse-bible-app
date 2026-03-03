import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  SlideInRight,
} from "react-native-reanimated";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useStreak } from "@/context/StreakContext";

interface ChallengeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

const OPTION_LABELS = ["A", "B", "C", "D"];

function getStarRating(pct: number): number {
  if (pct >= 80) return 3;
  if (pct >= 50) return 2;
  if (pct >= 20) return 1;
  return 0;
}

function getResultMessage(pct: number): { title: string; subtitle: string } {
  if (pct === 100)
    return { title: "Perfect Round!", subtitle: "Flawless performance!" };
  if (pct >= 80)
    return { title: "Outstanding!", subtitle: "You really know your Bible!" };
  if (pct >= 60)
    return { title: "Well Done!", subtitle: "Solid knowledge on display." };
  if (pct >= 40)
    return { title: "Good Effort!", subtitle: "Keep studying to improve." };
  return { title: "Keep Learning!", subtitle: "Every question is a chance to grow." };
}

function AnswerOption({
  label,
  text,
  index,
  selected,
  correctIndex,
  showResult,
  onPress,
}: {
  label: string;
  text: string;
  index: number;
  selected: number | null;
  correctIndex: number;
  showResult: boolean;
  onPress: (idx: number) => void;
}) {
  const isCorrect = index === correctIndex;
  const isSelected = index === selected;
  const isWrong = isSelected && !isCorrect;

  let bgColor = Colors.light.surface;
  let borderColor = Colors.light.border;
  let textColor = Colors.light.text;
  let labelBg = Colors.light.border;
  let labelTextColor = Colors.light.text;

  if (showResult && isCorrect) {
    bgColor = "#4CAF50";
    borderColor = "#4CAF50";
    textColor = "#fff";
    labelBg = "rgba(255,255,255,0.3)";
    labelTextColor = "#fff";
  } else if (showResult && isWrong) {
    bgColor = "#E53935";
    borderColor = "#E53935";
    textColor = "#fff";
    labelBg = "rgba(255,255,255,0.3)";
    labelTextColor = "#fff";
  }

  return (
    <Pressable
      onPress={() => onPress(index)}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: pressed && !showResult ? 0.85 : 1,
          transform: [{ scale: pressed && !showResult ? 0.98 : 1 }],
        },
      ]}
      testID={`challenge-option-${index}`}
    >
      <View style={styles.optionRow}>
        <View style={[styles.optionLabel, { backgroundColor: labelBg }]}>
          <Text style={[styles.optionLabelText, { color: labelTextColor }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.optionText, { color: textColor, flex: 1 }]}>
          {text}
        </Text>
        {showResult && isCorrect && (
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
        )}
        {showResult && isWrong && (
          <Ionicons name="close-circle" size={22} color="#fff" />
        )}
      </View>
    </Pressable>
  );
}

function StarDisplay({ count }: { count: number }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} entering={ZoomIn.delay(300 + i * 150).duration(400)}>
          <Ionicons
            name={i <= count ? "star" : "star-outline"}
            size={36}
            color={i <= count ? "#E8A838" : Colors.light.border}
          />
        </Animated.View>
      ))}
    </View>
  );
}

export default function ChallengePlayScreen() {
  const { category, categoryName, difficulty } = useLocalSearchParams<{
    category: string;
    categoryName: string;
    difficulty: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { recordActivity } = useStreak();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [questions, setQuestions] = useState<ChallengeQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<{ correct: boolean; earned: number }[]>([]);
  const [showPointsAnim, setShowPointsAnim] = useState(false);
  const [lastEarned, setLastEarned] = useState(0);
  const [round, setRound] = useState(1);

  const fetchQuestions = useCallback(
    async (roundNum: number) => {
      setLoading(true);
      try {
        const res = await apiRequest("POST", "/api/generate-challenge", {
          category: category || "mixed",
          difficulty: difficulty || "beginner",
          round: roundNum,
        });
        const data = await res.json();
        if (data.questions?.length > 0) {
          setQuestions(data.questions);
          setMaxScore(
            data.questions.reduce(
              (sum: number, q: ChallengeQuestion) => sum + q.points,
              0
            )
          );
        }
      } catch {
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    },
    [category, difficulty]
  );

  useEffect(() => {
    fetchQuestions(1);
  }, [fetchQuestions]);

  const question = questions[currentQ];

  const handleAnswer = (idx: number) => {
    if (showResult || !question) return;
    setSelected(idx);
    setShowResult(true);

    const correct = idx === question.correctIndex;
    const earned = correct ? question.points : 0;

    setAnswers((prev) => [...prev, { correct, earned }]);

    if (correct) {
      setTotalScore((s) => s + earned);
      setLastEarned(earned);
      setShowPointsAnim(true);
      setTimeout(() => setShowPointsAnim(false), 1200);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setStreak(0);
      if (Platform.OS !== "web")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      recordActivity("challenge");
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const playAgain = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    setCurrentQ(0);
    setSelected(null);
    setShowResult(false);
    setFinished(false);
    setTotalScore(0);
    setMaxScore(0);
    setStreak(0);
    setBestStreak(0);
    setAnswers([]);
    setShowPointsAnim(false);
    fetchQuestions(nextRound);
  };

  const goToCategories = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/challenge" as any);
  };

  const goDone = () => {
    router.replace("/(tabs)/explore" as any);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { paddingTop: insets.top + webTopInset },
        ]}
      >
        <View style={styles.loadingIconCircle}>
          <Ionicons name="trophy" size={28} color="#E8A838" />
        </View>
        <ActivityIndicator
          size="large"
          color={Colors.light.accent}
          style={{ marginTop: 20 }}
        />
        <Text style={styles.loadingText}>Preparing your challenge...</Text>
        <Text style={styles.loadingSubtext}>
          {categoryName || category} - {difficulty}
        </Text>
      </View>
    );
  }

  if (!questions.length) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { paddingTop: insets.top + webTopInset },
        ]}
      >
        <Ionicons
          name="alert-circle-outline"
          size={48}
          color={Colors.light.textSecondary}
        />
        <Text style={styles.errorText}>Could not load questions</Text>
        <Pressable onPress={goToCategories} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Back to Categories</Text>
        </Pressable>
      </View>
    );
  }

  if (finished) {
    const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const stars = getStarRating(pct);
    const msg = getResultMessage(pct);

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.center,
          {
            paddingTop: insets.top + webTopInset + 30,
            paddingBottom: insets.bottom + webBottomInset + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.resultCard}>
          <StarDisplay count={stars} />

          <Text style={styles.resultTitle}>{msg.title}</Text>
          <Text style={styles.resultSubtitle}>{msg.subtitle}</Text>

          <View style={styles.scoreCircle}>
            <Text style={styles.scoreBig}>{totalScore}</Text>
            <Text style={styles.scoreMax}>/ {maxScore}</Text>
          </View>

          <View style={styles.resultStatsRow}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>
                {answers.filter((a) => a.correct).length}/{questions.length}
              </Text>
              <Text style={styles.resultStatLabel}>Correct</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{pct}%</Text>
              <Text style={styles.resultStatLabel}>Accuracy</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{bestStreak}</Text>
              <Text style={styles.resultStatLabel}>Best Streak</Text>
            </View>
          </View>

          <View style={styles.breakdownSection}>
            <Text style={styles.breakdownTitle}>Round Breakdown</Text>
            {questions.map((q, i) => (
              <View key={i} style={styles.breakdownRow}>
                <Ionicons
                  name={
                    answers[i]?.correct ? "checkmark-circle" : "close-circle"
                  }
                  size={20}
                  color={answers[i]?.correct ? "#4CAF50" : "#E53935"}
                />
                <Text style={styles.breakdownText} numberOfLines={1}>
                  {q.question}
                </Text>
                <Text
                  style={[
                    styles.breakdownPts,
                    {
                      color: answers[i]?.correct
                        ? "#4CAF50"
                        : Colors.light.textTertiary,
                    },
                  ]}
                >
                  {answers[i]?.correct ? `+${q.points}` : "0"}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.resultBtnsRow}>
            <Pressable
              onPress={playAgain}
              style={[styles.resultBtn, styles.resultBtnPrimary]}
              testID="challenge-play-again"
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.resultBtnPrimaryText}>Play Again</Text>
            </Pressable>
            <Pressable
              onPress={goToCategories}
              style={[styles.resultBtn, styles.resultBtnSecondary]}
              testID="challenge-new-category"
            >
              <Ionicons name="grid-outline" size={18} color={Colors.light.accent} />
              <Text style={styles.resultBtnSecondaryText}>New Category</Text>
            </Pressable>
          </View>
          <Pressable onPress={goDone} hitSlop={12} testID="challenge-done">
            <Text style={styles.doneLink}>Done</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    );
  }

  const isCorrect = selected !== null && selected === question.correctIndex;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + webTopInset + 12,
          paddingBottom: insets.bottom + webBottomInset + 20,
        },
      ]}
    >
      <View style={styles.topBar}>
        <Pressable onPress={goToCategories} hitSlop={12} testID="challenge-back">
          <Ionicons name="close" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.topBarCategory} numberOfLines={1}>
          {categoryName || category}
        </Text>
        <View style={styles.topBarScoreWrap}>
          <Ionicons name="diamond" size={14} color="#E8A838" />
          <Text style={styles.topBarScore}>{totalScore}</Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        <View style={styles.progressBg}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${((currentQ + (showResult ? 1 : 0)) / questions.length) * 100}%` as any,
              },
            ]}
          />
        </View>
        <Text style={styles.counterText}>
          {currentQ + 1}/{questions.length}
        </Text>
      </View>

      {streak >= 3 && (
        <Animated.View entering={ZoomIn.duration(300)} style={styles.streakBanner}>
          <Ionicons name="flame" size={16} color="#FF6B35" />
          <Text style={styles.streakBannerText}>{streak} Streak!</Text>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          key={currentQ}
          entering={SlideInRight.duration(350).springify()}
          style={styles.questionCard}
        >
          <View style={styles.pointsBadge}>
            <Text style={styles.pointsBadgeText}>{question.points} pts</Text>
          </View>
          <Text style={styles.questionText}>{question.question}</Text>
        </Animated.View>

        <View style={styles.optionsContainer}>
          {question.options.map((opt, idx) => (
            <AnswerOption
              key={idx}
              label={OPTION_LABELS[idx]}
              text={opt}
              index={idx}
              selected={selected}
              correctIndex={question.correctIndex}
              showResult={showResult}
              onPress={handleAnswer}
            />
          ))}
        </View>

        {showResult && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.feedbackArea}>
            {showPointsAnim && isCorrect && (
              <Animated.View
                entering={ZoomIn.duration(400)}
                style={styles.pointsPopup}
              >
                <Text style={styles.pointsPopupText}>+{lastEarned}</Text>
              </Animated.View>
            )}
            <View
              style={[
                styles.feedbackBanner,
                isCorrect ? styles.feedbackCorrect : styles.feedbackWrong,
              ]}
            >
              <Ionicons
                name={isCorrect ? "checkmark-circle" : "information-circle"}
                size={20}
                color={isCorrect ? "#4CAF50" : "#E53935"}
              />
              <Text
                style={[
                  styles.feedbackTitle,
                  { color: isCorrect ? "#4CAF50" : "#E53935" },
                ]}
              >
                {isCorrect ? "Correct!" : "Not quite"}
              </Text>
            </View>
            {question.explanation ? (
              <Text style={styles.explanationText}>{question.explanation}</Text>
            ) : null}
            <Pressable
              onPress={nextQuestion}
              style={styles.nextBtn}
              testID="challenge-next"
            >
              <Text style={styles.nextBtnText}>
                {currentQ + 1 >= questions.length
                  ? "See Results"
                  : "Next Question"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
  },
  center: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flex: 1,
  },
  loadingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8A83818",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  loadingText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.text,
    marginTop: 16,
  },
  loadingSubtext: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 4,
    textTransform: "capitalize" as const,
  },
  errorText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: 16,
  },
  retryBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
  },
  retryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  topBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 12,
  },
  topBarCategory: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
    textAlign: "center" as const,
    marginHorizontal: 12,
  },
  topBarScoreWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    backgroundColor: "#E8A83818",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  topBarScore: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#E8A838",
  },
  progressRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    marginBottom: 12,
  },
  progressBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.border,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.accent,
  },
  counterText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    minWidth: 30,
    textAlign: "right" as const,
  },
  streakBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    backgroundColor: "#FFF3EC",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "center" as const,
    marginBottom: 8,
  },
  streakBannerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FF6B35",
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  questionCard: {
    backgroundColor: Colors.light.oliveDark,
    borderRadius: 20,
    padding: 24,
    paddingTop: 20,
    marginBottom: 20,
    position: "relative" as const,
    overflow: "visible" as const,
  },
  pointsBadge: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    backgroundColor: "#E8A838",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 1,
  },
  pointsBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },
  questionText: {
    fontFamily: "Lora_400Regular",
    fontSize: 18,
    lineHeight: 28,
    color: "#FAF6F0",
  },
  optionsContainer: {
    gap: 10,
  },
  option: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
  },
  optionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  optionLabelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  optionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  feedbackArea: {
    marginTop: 16,
    gap: 10,
    alignItems: "center" as const,
  },
  pointsPopup: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  pointsPopupText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: "#fff",
  },
  feedbackBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "stretch" as const,
  },
  feedbackCorrect: {
    backgroundColor: "#E8F5E9",
  },
  feedbackWrong: {
    backgroundColor: "#FFEBEE",
  },
  feedbackTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  explanationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    paddingHorizontal: 4,
    alignSelf: "stretch" as const,
  },
  nextBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    alignSelf: "stretch" as const,
  },
  nextBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  resultCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center" as const,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    width: "90%" as any,
  },
  starsRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 8,
  },
  resultTitle: {
    fontFamily: "Lora_700Bold",
    fontSize: 26,
    color: Colors.light.text,
  },
  resultSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
  },
  scoreCircle: {
    alignItems: "center" as const,
    marginVertical: 12,
  },
  scoreBig: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 40,
    color: Colors.light.accent,
  },
  scoreMax: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    color: Colors.light.textSecondary,
    marginTop: -4,
  },
  resultStatsRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    width: "100%" as any,
    marginTop: 4,
    marginBottom: 4,
  },
  resultStat: {
    alignItems: "center" as const,
    flex: 1,
  },
  resultStatValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 20,
    color: Colors.light.accent,
  },
  resultStatLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  resultStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },
  breakdownSection: {
    width: "100%" as any,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 6,
  },
  breakdownTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  breakdownRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  breakdownText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: Colors.light.textSecondary,
    flex: 1,
  },
  breakdownPts: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    minWidth: 40,
    textAlign: "right" as const,
  },
  resultBtnsRow: {
    flexDirection: "row" as const,
    gap: 10,
    marginTop: 16,
    width: "100%" as any,
  },
  resultBtn: {
    flex: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  resultBtnPrimary: {
    backgroundColor: Colors.light.accent,
  },
  resultBtnPrimaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  resultBtnSecondary: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1.5,
    borderColor: Colors.light.accent,
  },
  resultBtnSecondaryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: Colors.light.accent,
  },
  doneLink: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 8,
    textDecorationLine: "underline" as const,
  },
});
