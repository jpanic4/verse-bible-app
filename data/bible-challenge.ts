export interface ChallengeCategory {
  id: string;
  name: string;
  icon: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons" | "Feather";
  color: string;
  type: "book-group" | "theme" | "mixed";
  seedTopics: string[];
}

export const BOOK_GROUP_CATEGORIES: ChallengeCategory[] = [
  {
    id: "gospels",
    name: "Gospels",
    icon: "book-open-outline",
    iconFamily: "Ionicons",
    color: "#D4736A",
    type: "book-group",
    seedTopics: [
      "Life and ministry of Jesus",
      "Parables of Jesus",
      "Miracles in the Gospels",
      "The Sermon on the Mount",
      "Jesus' disciples and apostles",
      "The crucifixion and resurrection",
      "Birth narratives of Jesus",
      "Geography of Jesus' travels",
      "Pharisees and Sadducees interactions",
      "Last Supper and Passover",
    ],
  },
  {
    id: "pentateuch",
    name: "Pentateuch",
    icon: "scroll-outline",
    iconFamily: "MaterialCommunityIcons",
    color: "#C4794A",
    type: "book-group",
    seedTopics: [
      "Creation account in Genesis",
      "The Exodus from Egypt",
      "Moses and the burning bush",
      "The Ten Commandments",
      "The patriarchs: Abraham, Isaac, Jacob",
      "Joseph in Egypt",
      "Levitical laws and sacrifices",
      "The wilderness wanderings",
      "Covenant promises to Abraham",
      "The tabernacle and its furnishings",
    ],
  },
  {
    id: "wisdom-books",
    name: "Wisdom Books",
    icon: "bulb-outline",
    iconFamily: "Ionicons",
    color: "#E8A838",
    type: "book-group",
    seedTopics: [
      "Proverbs about wisdom and folly",
      "The Book of Job and suffering",
      "Ecclesiastes and the meaning of life",
      "Psalms of David",
      "Song of Solomon imagery",
      "Fear of the Lord as beginning of wisdom",
      "Poetry and literary forms in Psalms",
      "Lament psalms and praise psalms",
      "Job's friends and their arguments",
      "Royal psalms and messianic themes",
    ],
  },
  {
    id: "prophets",
    name: "Prophets",
    icon: "megaphone-outline",
    iconFamily: "Ionicons",
    color: "#8B7BB5",
    type: "book-group",
    seedTopics: [
      "Isaiah's messianic prophecies",
      "Jeremiah the weeping prophet",
      "Ezekiel's visions",
      "Daniel in Babylon",
      "Minor prophets and their messages",
      "The exile and return of Israel",
      "Prophecies about the coming Messiah",
      "Elijah and Elisha",
      "Jonah and Nineveh",
      "Amos and social justice",
    ],
  },
  {
    id: "letters-of-paul",
    name: "Letters of Paul",
    icon: "mail-outline",
    iconFamily: "Ionicons",
    color: "#6A9EC4",
    type: "book-group",
    seedTopics: [
      "Paul's conversion on the Damascus road",
      "Justification by faith in Romans",
      "The fruit of the Spirit in Galatians",
      "The armor of God in Ephesians",
      "Paul's missionary journeys",
      "The church at Corinth",
      "Timothy and Titus as Paul's protégés",
      "Paul's imprisonment letters",
      "The body of Christ metaphor",
      "Eschatology in Thessalonians",
    ],
  },
];

export const THEME_CATEGORIES: ChallengeCategory[] = [
  { id: "theme-hope", name: "Hope", icon: "sunny-outline", iconFamily: "Ionicons", color: "#E8A838", type: "theme", seedTopics: ["Hope in suffering", "Eternal hope", "Hope in God's promises", "Hope and perseverance", "Living hope through resurrection"] },
  { id: "theme-anxiety", name: "Anxiety & Worry", icon: "leaf-outline", iconFamily: "Ionicons", color: "#7BAE6E", type: "theme", seedTopics: ["Casting cares on God", "Peace over worry", "Trusting God in uncertainty", "Jesus' teaching on worry", "Spiritual rest"] },
  { id: "theme-strength", name: "Strength", icon: "shield-outline", iconFamily: "Ionicons", color: "#C4794A", type: "theme", seedTopics: ["God as our strength", "Strength in weakness", "Spiritual warfare", "Endurance in trials", "Power of the Holy Spirit"] },
  { id: "theme-forgiveness", name: "Forgiveness", icon: "hand-left-outline", iconFamily: "Ionicons", color: "#8B7BB5", type: "theme", seedTopics: ["God's forgiveness", "Forgiving others", "Parables about forgiveness", "Repentance and restoration", "The cost of forgiveness"] },
  { id: "theme-love", name: "Love", icon: "heart-outline", iconFamily: "Ionicons", color: "#D4736A", type: "theme", seedTopics: ["God's love for humanity", "Love one another", "Agape love", "Love in 1 Corinthians 13", "Sacrificial love"] },
  { id: "theme-grace", name: "Grace", icon: "sparkles-outline", iconFamily: "Ionicons", color: "#D4A76A", type: "theme", seedTopics: ["Grace vs works", "Amazing grace", "Grace and salvation", "Unmerited favor", "Grace in the New Testament"] },
  { id: "theme-prayer", name: "Prayer", icon: "chatbubble-ellipses-outline", iconFamily: "Ionicons", color: "#6A9EC4", type: "theme", seedTopics: ["The Lord's Prayer", "Prayer warriors in the Bible", "Intercessory prayer", "Prayer in the Psalms", "Jesus' prayer life"] },
  { id: "theme-faith", name: "Faith", icon: "compass-outline", iconFamily: "Ionicons", color: "#5B8B8B", type: "theme", seedTopics: ["Heroes of faith in Hebrews 11", "Mustard seed faith", "Faith and works", "Abraham's faith", "Walking by faith"] },
  { id: "theme-peace", name: "Peace", icon: "water-outline", iconFamily: "Ionicons", color: "#6AB0A0", type: "theme", seedTopics: ["Peace of God", "Prince of Peace", "Peace in storms", "Peacemakers", "Inner peace through Christ"] },
  { id: "theme-trust", name: "Trust", icon: "navigate-outline", iconFamily: "Ionicons", color: "#8BA06A", type: "theme", seedTopics: ["Trusting God's plan", "Trust in Proverbs", "Trusting during trials", "Relying on God not self", "Trust and obedience"] },
  { id: "theme-identity", name: "Identity in Christ", icon: "star-outline", iconFamily: "Ionicons", color: "#C49A6A", type: "theme", seedTopics: ["New creation in Christ", "Children of God", "Chosen and loved", "Identity vs world's standards", "Living as God's workmanship"] },
  { id: "theme-salvation", name: "Salvation", icon: "flag-outline", iconFamily: "Ionicons", color: "#A06A8B", type: "theme", seedTopics: ["The plan of salvation", "Jesus as the way", "Born again", "Salvation by grace", "Eternal life"] },
  { id: "theme-purpose", name: "Purpose", icon: "bulb-outline", iconFamily: "Ionicons", color: "#B08A5B", type: "theme", seedTopics: ["God's plan for your life", "Calling and vocation", "The Great Commission", "Spiritual gifts", "Bearing fruit"] },
  { id: "theme-grief", name: "Grief & Comfort", icon: "umbrella-outline", iconFamily: "Ionicons", color: "#7A8BA0", type: "theme", seedTopics: ["God comforts the brokenhearted", "Mourning and comfort", "Psalms of lament", "Hope after loss", "Jesus wept"] },
  { id: "theme-courage", name: "Courage", icon: "flame-outline", iconFamily: "Ionicons", color: "#D47A5B", type: "theme", seedTopics: ["Be strong and courageous", "Courageous figures in the Bible", "Facing giants", "Standing firm in faith", "Boldness in the Spirit"] },
  { id: "theme-scripture", name: "Scripture & Truth", icon: "book-outline", iconFamily: "Ionicons", color: "#6A7AC4", type: "theme", seedTopics: ["Authority of Scripture", "The word as a lamp", "Truth in John's Gospel", "Meditating on God's word", "Scripture memorization in the Bible"] },
  { id: "theme-gratitude", name: "Gratitude", icon: "gift-outline", iconFamily: "Ionicons", color: "#C46AA0", type: "theme", seedTopics: ["Giving thanks always", "Gratitude psalms", "Thankfulness in hardship", "Every good gift from above", "Praise and thanksgiving"] },
  { id: "theme-gods-character", name: "God's Character", icon: "prism-outline", iconFamily: "Ionicons", color: "#6AC4B0", type: "theme", seedTopics: ["God is love", "God's faithfulness", "God's sovereignty", "God's mercy and compassion", "The holiness of God"] },
];

export const MIXED_CATEGORY: ChallengeCategory = {
  id: "mixed",
  name: "Mixed",
  icon: "shuffle-outline",
  iconFamily: "Ionicons",
  color: "#7B68EE",
  type: "mixed",
  seedTopics: [
    "Famous Bible stories",
    "Key figures in the Bible",
    "Biblical geography and places",
    "Chronology of Bible events",
    "Famous Bible verses",
    "Miracles in the Bible",
    "Kings and rulers in the Bible",
    "Women of the Bible",
    "Animals mentioned in the Bible",
    "Numbers and symbolism in the Bible",
  ],
};

export const ALL_CATEGORIES: ChallengeCategory[] = [
  MIXED_CATEGORY,
  ...BOOK_GROUP_CATEGORIES,
  ...THEME_CATEGORIES,
];

export function getCategoryById(id: string): ChallengeCategory | undefined {
  return ALL_CATEGORIES.find((c) => c.id === id);
}
