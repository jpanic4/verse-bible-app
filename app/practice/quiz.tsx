import { useState, useEffect } from "react";
import { StyleSheet, Text, View, Pressable, ActivityIndicator, Platform, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import Colors from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { useStreak } from "@/context/StreakContext";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

function shuffleWithAnswer(correct: string, distractors: string[]): { options: string[]; correctIndex: number } {
  const all = [correct, ...distractors];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return { options: all, correctIndex: all.indexOf(correct) };
}

function generateFallbackQuiz(verseText: string, reference: string): QuizQuestion[] {
  const words = verseText.split(/\s+/).filter(Boolean);
  const book = reference.split(/\d/)[0].trim();

  const bibleBooks = ["Genesis", "Exodus", "Psalms", "Proverbs", "Isaiah", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "Revelation", "Hebrews", "James"];
  const bookDistractors = bibleBooks.filter((b) => b.toLowerCase() !== book.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
  const q1 = shuffleWithAnswer(book, bookDistractors.length >= 3 ? bookDistractors : ["Genesis", "Acts", "Revelation"]);

  const midIdx = Math.floor(words.length / 2);
  const blankWord = words[midIdx] || words[0] || "the";
  const before = words.slice(Math.max(0, midIdx - 3), midIdx).join(" ");
  const after = words.slice(midIdx + 1, midIdx + 4).join(" ");
  const blankDistractors = words.filter((w) => w.toLowerCase() !== blankWord.toLowerCase() && w.length > 2).sort(() => Math.random() - 0.5).slice(0, 3);
  while (blankDistractors.length < 3) blankDistractors.push(["grace", "faith", "love"][blankDistractors.length] || "hope");
  const q2 = shuffleWithAnswer(blankWord, blankDistractors);

  const firstWord = words[0] || "The";
  const firstDistractors = ["Therefore", "And", "But", "For", "Now", "Then", "Behold"].filter((w) => w.toLowerCase() !== firstWord.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
  const q3 = shuffleWithAnswer(firstWord, firstDistractors);

  const lastWord = words[words.length - 1]?.replace(/[.,;:!?]$/, "") || "amen";
  const lastDistractors = words.map((w) => w.replace(/[.,;:!?]$/, "")).filter((w) => w.toLowerCase() !== lastWord.toLowerCase() && w.length > 2).sort(() => Math.random() - 0.5).slice(0, 3);
  while (lastDistractors.length < 3) lastDistractors.push(["forever", "world", "Lord"][lastDistractors.length] || "peace");
  const q4 = shuffleWithAnswer(lastWord, lastDistractors);

  const q5 = shuffleWithAnswer(`${words.length}`, [`${words.length + 5}`, `${Math.max(1, words.length - 4)}`, `${words.length + 9}`]);

  return [
    { question: `Which book contains "${reference}"?`, ...q1, explanation: `${reference} is found in the book of ${book}.` },
    { question: `Complete the verse: "${before} ___ ${after}"`, ...q2, explanation: `The missing word is "${blankWord}."` },
    { question: `What is the first word of ${reference}?`, ...q3, explanation: `The verse begins with "${firstWord}."` },
    { question: `What is the last word of this verse?`, ...q4, explanation: `The verse ends with "${lastWord}."` },
    { question: `How many words are in ${reference}?`, ...q5, explanation: `The verse contains ${words.length} words.` },
  ];
}

function getScoreMessage(pct: number): { title: string; subtitle: string; icon: string } {
  if (pct === 100) return { title: "Perfect Score!", subtitle: "You know this verse inside and out!", icon: "star" };
  if (pct >= 80) return { title: "Excellent!", subtitle: "You have a strong grasp of this verse.", icon: "trophy" };
  if (pct >= 60) return { title: "Good Work!", subtitle: "You're getting there — keep studying!", icon: "ribbon" };
  if (pct >= 40) return { title: "Nice Try!", subtitle: "Review this verse and try again.", icon: "book" };
  return { title: "Keep Going!", subtitle: "Study this verse more and come back stronger.", icon: "school" };
}

export default function QuizScreen() {
  const { reference, text } = useLocalSearchParams<{ reference: string; text: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const { recordActivity } = useStreak();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answers, setAnswers] = useState<boolean[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/generate-quiz", { verseText: text, reference });
        const data = await res.json();
        if (!cancelled && data.questions?.length > 0) {
          setQuestions(data.questions);
        } else {
          setQuestions(generateFallbackQuiz(text || "", reference || ""));
        }
      } catch {
        if (!cancelled) setQuestions(generateFallbackQuiz(text || "", reference || ""));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [text, reference]);

  const question = questions[currentQ];

  const handleAnswer = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    const correct = idx === question.correctIndex;
    setAnswers((prev) => [...prev, correct]);
    if (correct) {
      setScore((s) => s + 1);
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setStreak(0);
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const nextQuestion = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
      recordActivity("practice");
    } else {
      setCurrentQ((q) => q + 1);
      setSelected(null);
      setShowResult(false);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <Text style={styles.loadingText}>Generating quiz questions...</Text>
      </View>
    );
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    const msg = getScoreMessage(pct);
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top + webTopInset }]}
        contentContainerStyle={[styles.center, { paddingBottom: insets.bottom + webBottomInset + 40, paddingTop: 40 }]}
      >
        <Animated.View entering={FadeIn.duration(500)} style={styles.resultCard}>
          <Ionicons name={msg.icon as any} size={52} color={Colors.light.accent} />
          <Text style={styles.resultTitle}>{msg.title}</Text>
          <Text style={styles.resultSubtitle}>{msg.subtitle}</Text>

          <View style={styles.resultStatsRow}>
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{score}/{questions.length}</Text>
              <Text style={styles.resultStatLabel}>Correct</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{pct}%</Text>
              <Text style={styles.resultStatLabel}>Score</Text>
            </View>
            <View style={styles.resultStatDivider} />
            <View style={styles.resultStat}>
              <Text style={styles.resultStatValue}>{bestStreak}</Text>
              <Text style={styles.resultStatLabel}>Best Streak</Text>
            </View>
          </View>

          <View style={styles.resultBreakdown}>
            <Text style={styles.breakdownTitle}>Question Breakdown</Text>
            {questions.map((q, i) => (
              <View key={i} style={styles.breakdownRow}>
                <Ionicons
                  name={answers[i] ? "checkmark-circle" : "close-circle"}
                  size={20}
                  color={answers[i] ? Colors.light.olive : "#D9534F"}
                />
                <Text style={styles.breakdownText} numberOfLines={1}>
                  Q{i + 1}: {q.question}
                </Text>
              </View>
            ))}
          </View>

          <Text style={styles.resultRef}>{reference}</Text>
          <Pressable onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/(tabs)/explore"); }} style={styles.doneBtn} testID="quiz-done">
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    );
  }

  const isCorrect = selected !== null && selected === question.correctIndex;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset + 16, paddingBottom: insets.bottom + webBottomInset + 40 }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="quiz-back">
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </Pressable>
        <Text style={styles.title}>Quiz</Text>
        <View style={styles.headerRight}>
          {streak > 1 && (
            <Animated.View entering={FadeIn.duration(200)} style={styles.streakBadge}>
              <Ionicons name="flame" size={14} color="#FF6B35" />
              <Text style={styles.streakText}>{streak}</Text>
            </Animated.View>
          )}
          <Text style={styles.counter}>{currentQ + 1}/{questions.length}</Text>
        </View>
      </View>

      <View style={styles.progressBg}>
        <Animated.View style={[styles.progressFill, { width: `${((currentQ + 1) / questions.length) * 100}%` as any }]} />
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreText}>{score} correct</Text>
      </View>

      <Animated.View key={currentQ} entering={FadeInDown.duration(350)} style={styles.questionCard}>
        <Text style={styles.questionText}>{question.question}</Text>
      </Animated.View>

      <View style={styles.optionsContainer}>
        {question.options.map((opt, idx) => {
          let optStyle = styles.option;
          let textStyle = styles.optionText;
          let labelStyle = styles.optionLabel;
          if (showResult) {
            if (idx === question.correctIndex) {
              optStyle = { ...styles.option, ...styles.optionCorrect };
              textStyle = { ...styles.optionText, color: "#fff" };
              labelStyle = { ...styles.optionLabel, ...styles.optionLabelActive };
            } else if (idx === selected && idx !== question.correctIndex) {
              optStyle = { ...styles.option, ...styles.optionWrong };
              textStyle = { ...styles.optionText, color: "#fff" };
              labelStyle = { ...styles.optionLabel, ...styles.optionLabelActive };
            }
          }
          return (
            <Pressable key={idx} onPress={() => handleAnswer(idx)} style={optStyle} testID={`quiz-option-${idx}`}>
              <View style={styles.optionRow}>
                <View style={labelStyle}>
                  <Text style={[styles.optionLabelText, showResult && (idx === question.correctIndex || idx === selected) ? { color: "#fff" } : {}]}>
                    {optionLabels[idx]}
                  </Text>
                </View>
                <Text style={[textStyle, { flex: 1 }]}>{opt}</Text>
                {showResult && idx === question.correctIndex && (
                  <Ionicons name="checkmark-circle" size={22} color="#fff" />
                )}
                {showResult && idx === selected && idx !== question.correctIndex && (
                  <Ionicons name="close-circle" size={22} color="#fff" />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>

      {showResult && (
        <Animated.View entering={FadeInUp.duration(300)} style={styles.feedbackArea}>
          <View style={[styles.feedbackBanner, isCorrect ? styles.feedbackCorrect : styles.feedbackWrong]}>
            <Ionicons
              name={isCorrect ? "checkmark-circle" : "information-circle"}
              size={20}
              color={isCorrect ? Colors.light.olive : "#D9534F"}
            />
            <Text style={[styles.feedbackTitle, { color: isCorrect ? Colors.light.olive : "#D9534F" }]}>
              {isCorrect ? "Correct!" : "Not quite"}
            </Text>
          </View>
          {question.explanation ? (
            <Text style={styles.explanationText}>{question.explanation}</Text>
          ) : null}
          <Pressable onPress={nextQuestion} style={styles.nextBtn} testID="quiz-next">
            <Text style={styles.nextBtnText}>
              {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, paddingHorizontal: 20 },
  center: { alignItems: "center" as const, justifyContent: "center" as const },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontFamily: "Lora_700Bold", fontSize: 22, color: Colors.light.text },
  counter: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.textSecondary },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, marginTop: 16 },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF3EC",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  streakText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FF6B35" },
  scoreRow: { marginBottom: 16 },
  scoreText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary },
  progressBg: { height: 6, borderRadius: 3, backgroundColor: Colors.light.border, marginBottom: 8 },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.light.accent },
  questionCard: {
    backgroundColor: Colors.light.oliveDark,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  questionText: { fontFamily: "Lora_400Regular", fontSize: 18, lineHeight: 28, color: "#FAF6F0" },
  optionsContainer: { gap: 10 },
  option: {
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
  },
  optionCorrect: { backgroundColor: Colors.light.olive, borderColor: Colors.light.olive },
  optionWrong: { backgroundColor: "#D9534F", borderColor: "#D9534F" },
  optionRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  optionLabel: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.border,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  optionLabelActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  optionLabelText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: Colors.light.text },
  optionText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: Colors.light.text },
  feedbackArea: { marginTop: 16, gap: 10 },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  feedbackCorrect: { backgroundColor: "#E8F5E9" },
  feedbackWrong: { backgroundColor: "#FFEBEE" },
  feedbackTitle: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  explanationText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.textSecondary,
    paddingHorizontal: 4,
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center" as const, justifyContent: "center" as const,
    gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.light.accent,
  },
  nextBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
  resultCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 28,
    alignItems: "center" as const,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
    width: "90%" as any,
  },
  resultTitle: { fontFamily: "Lora_700Bold", fontSize: 26, color: Colors.light.text },
  resultSubtitle: { fontFamily: "Inter_400Regular", fontSize: 14, color: Colors.light.textSecondary, textAlign: "center" as const },
  resultStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginTop: 8,
    marginBottom: 4,
    width: "100%",
  },
  resultStat: { alignItems: "center" as const, flex: 1 },
  resultStatValue: { fontFamily: "Inter_600SemiBold", fontSize: 22, color: Colors.light.accent },
  resultStatLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: Colors.light.textSecondary, marginTop: 2 },
  resultStatDivider: { width: 1, height: 32, backgroundColor: Colors.light.border },
  resultBreakdown: {
    width: "100%",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 6,
  },
  breakdownTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: Colors.light.text, marginBottom: 4 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownText: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, flex: 1 },
  resultRef: { fontFamily: "Inter_400Regular", fontSize: 13, color: Colors.light.textSecondary, marginTop: 4 },
  doneBtn: {
    paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14,
    backgroundColor: Colors.light.accent, marginTop: 8,
  },
  doneBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15, color: "#fff" },
});
