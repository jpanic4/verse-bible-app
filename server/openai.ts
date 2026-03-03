import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

function deduplicateOptions(q: QuizQuestion): QuizQuestion {
  if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
    q.correctIndex = 0;
  }

  const correctOption = q.options[q.correctIndex];
  const seen = new Set<string>();
  seen.add(correctOption.toLowerCase().trim());

  const finalOptions: string[] = [];
  for (let i = 0; i < q.options.length; i++) {
    const lower = q.options[i].toLowerCase().trim();
    if (i === q.correctIndex) {
      finalOptions.push(q.options[i]);
    } else if (seen.has(lower)) {
      finalOptions.push(null as any);
    } else {
      seen.add(lower);
      finalOptions.push(q.options[i]);
    }
  }

  const fillers = ["None of the above", "All of the above", "Not mentioned in the verse", "Cannot be determined"];
  let fillerIdx = 0;
  for (let i = 0; i < finalOptions.length; i++) {
    if (finalOptions[i] === null) {
      while (fillerIdx < fillers.length && seen.has(fillers[fillerIdx].toLowerCase())) {
        fillerIdx++;
      }
      finalOptions[i] = fillerIdx < fillers.length ? fillers[fillerIdx] : `Option ${i + 1}`;
      if (fillerIdx < fillers.length) seen.add(fillers[fillerIdx].toLowerCase());
      fillerIdx++;
    }
  }

  return {
    ...q,
    options: finalOptions,
    correctIndex: q.correctIndex,
  };
}

export async function generateQuiz(verseText: string, reference: string): Promise<QuizQuestion[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 5 Bible quiz questions as JSON. Return {"questions":[...]} where each question has: "question" (string), "options" (4 unique strings), "correctIndex" (0-3), "explanation" (short string). Include fill-in-the-blank, meaning, and recall questions. All 4 options must be different.`,
        },
        {
          role: "user",
          content: `${reference}: "${verseText}"`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const questions = parsed.questions || parsed;
    if (Array.isArray(questions) && questions.length > 0) {
      const valid = questions.slice(0, 5)
        .filter((q: any) => q.question && Array.isArray(q.options) && q.options.length >= 4)
        .map((q: any) => {
          const opts = q.options.slice(0, 4).map((o: any) => String(o));
          const ci = typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0;
          const mapped: QuizQuestion = {
            question: String(q.question),
            options: opts,
            correctIndex: ci,
            explanation: q.explanation ? String(q.explanation) : "",
          };
          return deduplicateOptions(mapped);
        });
      if (valid.length > 0) return valid;
    }
    console.error("Quiz AI: no questions in response, keys:", Object.keys(parsed), "finish_reason:", response.choices[0]?.finish_reason);
  } catch (err: any) {
    console.error("Quiz AI error:", err.message?.slice(0, 300));
  }

  return generateFallbackQuiz(verseText, reference);
}

function shuffleWithCorrect(correct: string, distractors: string[]): { options: string[]; correctIndex: number } {
  const unique = distractors.filter((d) => d.toLowerCase() !== correct.toLowerCase());
  while (unique.length < 3) {
    unique.push(`Option ${unique.length + 1}`);
  }
  const all = [correct, ...unique.slice(0, 3)];
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return { options: all, correctIndex: all.indexOf(correct) };
}

export interface ChallengeQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  points: number;
}

export async function generateChallenge(
  category: string,
  difficulty: "beginner" | "intermediate" | "advanced",
  round: number,
  seedTopics: string[]
): Promise<ChallengeQuestion[]> {
  const difficultyGuide = {
    beginner: "Easy questions suitable for someone new to the Bible. Focus on well-known stories, famous verses, and major figures.",
    intermediate: "Moderate questions requiring good Bible knowledge. Include lesser-known details, supporting characters, and specific chapter references.",
    advanced: "Challenging questions for Bible scholars. Include obscure details, exact quotes, minor characters, precise chronology, and cross-references.",
  };

  const topicSample = seedTopics.sort(() => Math.random() - 0.5).slice(0, 5).join(", ");
  const pointValues = [100, 200, 300, 400, 500];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a Bible trivia game show host. Generate exactly 5 trivia questions as JSON. Return {"questions":[...]} where each question object has: "question" (string), "options" (exactly 4 unique strings), "correctIndex" (0-3), "explanation" (1-2 sentence explanation of the correct answer).

Rules:
- ${difficultyGuide[difficulty]}
- Questions should cover: people, events, geography, key verses, chronology, and themes
- All 4 options must be plausible and distinct
- Questions should be varied in type (who, what, where, when, which)
- This is round ${round}, so vary questions from typical first-round questions
- Make questions engaging and interesting, like a game show`,
        },
        {
          role: "user",
          content: `Category: "${category}". Topics to draw from: ${topicSample}. Difficulty: ${difficulty}. Generate 5 unique Bible trivia questions.`,
        },
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2048,
    });

    const content = response.choices[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    const questions = parsed.questions || parsed;
    if (Array.isArray(questions) && questions.length > 0) {
      const valid = questions.slice(0, 5)
        .filter((q: any) => q.question && Array.isArray(q.options) && q.options.length >= 4)
        .map((q: any, i: number) => {
          const opts = q.options.slice(0, 4).map((o: any) => String(o));
          const ci = typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex < 4 ? q.correctIndex : 0;
          const mapped: QuizQuestion = {
            question: String(q.question),
            options: opts,
            correctIndex: ci,
            explanation: q.explanation ? String(q.explanation) : "",
          };
          const deduped = deduplicateOptions(mapped);
          return {
            ...deduped,
            points: pointValues[i] || (i + 1) * 100,
          } as ChallengeQuestion;
        });
      if (valid.length > 0) return valid;
    }
    console.error("Challenge AI: no questions in response, keys:", Object.keys(parsed));
  } catch (err: any) {
    console.error("Challenge AI error:", err.message?.slice(0, 300));
  }

  return generateFallbackChallenge(category, difficulty);
}

function generateFallbackChallenge(category: string, _difficulty: string): ChallengeQuestion[] {
  const pointValues = [100, 200, 300, 400, 500];

  const fallbackQuestions: ChallengeQuestion[] = [
    {
      question: "How many books are in the Bible?",
      ...shuffleWithCorrect("66", ["39", "73", "27"]),
      explanation: "The Protestant Bible contains 66 books: 39 in the Old Testament and 27 in the New Testament.",
      points: pointValues[0],
    },
    {
      question: "Who wrote the most books in the New Testament?",
      ...shuffleWithCorrect("Paul", ["Peter", "John", "Luke"]),
      explanation: "The apostle Paul is credited with writing 13 epistles in the New Testament.",
      points: pointValues[1],
    },
    {
      question: "What is the shortest verse in the Bible?",
      ...shuffleWithCorrect("Jesus wept (John 11:35)", ["God is love (1 John 4:8)", "Rejoice always (1 Thessalonians 5:16)", "Pray continually (1 Thessalonians 5:17)"]),
      explanation: "John 11:35 — 'Jesus wept' — is the shortest verse in most English translations.",
      points: pointValues[2],
    },
    {
      question: "Which Old Testament prophet was swallowed by a great fish?",
      ...shuffleWithCorrect("Jonah", ["Elijah", "Elisha", "Amos"]),
      explanation: "The prophet Jonah was swallowed by a great fish after fleeing from God's command to preach to Nineveh.",
      points: pointValues[3],
    },
    {
      question: "On which mountain did Moses receive the Ten Commandments?",
      ...shuffleWithCorrect("Mount Sinai", ["Mount Carmel", "Mount Ararat", "Mount Nebo"]),
      explanation: "God gave Moses the Ten Commandments on Mount Sinai, also called Mount Horeb.",
      points: pointValues[4],
    },
  ];

  return fallbackQuestions;
}

function generateFallbackQuiz(verseText: string, reference: string): QuizQuestion[] {
  const words = verseText.split(/\s+/).filter(Boolean);
  const book = reference.split(/\d/)[0].trim();

  const bibleBooks = ["Genesis", "Exodus", "Psalms", "Proverbs", "Isaiah", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "Revelation", "Hebrews", "James"];
  const bookDistractors = bibleBooks.filter((b) => b.toLowerCase() !== book.toLowerCase()).sort(() => Math.random() - 0.5).slice(0, 3);
  const q1 = shuffleWithCorrect(book, bookDistractors);

  const midIdx = Math.floor(words.length / 2);
  const blankWord = words[midIdx] || words[0] || "the";
  const before = words.slice(Math.max(0, midIdx - 3), midIdx).join(" ");
  const after = words.slice(midIdx + 1, midIdx + 4).join(" ");
  const blankDistractors = words
    .filter((w) => w.toLowerCase() !== blankWord.toLowerCase() && w.length > 2)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  while (blankDistractors.length < 3) {
    blankDistractors.push(["grace", "faith", "love", "hope", "truth"][blankDistractors.length] || "mercy");
  }
  const q2 = shuffleWithCorrect(blankWord, blankDistractors);

  const firstWord = words[0] || "The";
  const firstWordDistractors = ["Therefore", "And", "But", "For", "Now", "Then", "Behold", "In"]
    .filter((w) => w.toLowerCase() !== firstWord.toLowerCase())
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const q3 = shuffleWithCorrect(firstWord, firstWordDistractors);

  const lastWord = words[words.length - 1]?.replace(/[.,;:!?]$/, "") || "amen";
  const lastWordDistractors = words
    .map((w) => w.replace(/[.,;:!?]$/, ""))
    .filter((w) => w.toLowerCase() !== lastWord.toLowerCase() && w.length > 2)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  while (lastWordDistractors.length < 3) {
    lastWordDistractors.push(["forever", "world", "Lord", "spirit"][lastWordDistractors.length] || "peace");
  }
  const q4 = shuffleWithCorrect(lastWord, lastWordDistractors);

  const wordCount = words.length;
  const q5 = shuffleWithCorrect(
    String(wordCount),
    [String(wordCount + 5), String(Math.max(1, wordCount - 4)), String(wordCount + 9)]
  );

  return [
    { question: `Which book of the Bible contains "${reference}"?`, ...q1, explanation: `${reference} is found in the book of ${book}.` },
    { question: `Complete the verse: "${before} ___ ${after}"`, ...q2, explanation: `The missing word is "${blankWord}."` },
    { question: `What is the first word of ${reference}?`, ...q3, explanation: `The verse begins with "${firstWord}."` },
    { question: `What is the last word of this verse?`, ...q4, explanation: `The verse ends with "${lastWord}."` },
    { question: `How many words are in ${reference}?`, ...q5, explanation: `The verse contains ${wordCount} words.` },
  ];
}
