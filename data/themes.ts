export interface Theme {
  name: string;
  icon: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons" | "Feather";
  color: string;
  verses: string[];
}

export const THEMES: Theme[] = [
  {
    name: "Hope",
    icon: "sunny-outline",
    iconFamily: "Ionicons",
    color: "#E8A838",
    verses: ["Romans 15:13", "Jeremiah 29:11", "Psalm 42:11", "Hebrews 11:1", "Romans 8:28"],
  },
  {
    name: "Anxiety & Worry",
    icon: "leaf-outline",
    iconFamily: "Ionicons",
    color: "#7BAE6E",
    verses: ["Philippians 4:6-7", "Matthew 6:34", "1 Peter 5:7", "Psalm 55:22", "Isaiah 41:10"],
  },
  {
    name: "Strength",
    icon: "shield-outline",
    iconFamily: "Ionicons",
    color: "#C4794A",
    verses: ["Isaiah 40:31", "Philippians 4:13", "Psalm 28:7", "Deuteronomy 31:6", "2 Corinthians 12:9"],
  },
  {
    name: "Forgiveness",
    icon: "hand-left-outline",
    iconFamily: "Ionicons",
    color: "#8B7BB5",
    verses: ["Ephesians 4:32", "Colossians 3:13", "1 John 1:9", "Psalm 103:12", "Micah 7:18"],
  },
  {
    name: "Love",
    icon: "heart-outline",
    iconFamily: "Ionicons",
    color: "#D4736A",
    verses: ["1 Corinthians 13:4-7", "John 3:16", "Romans 5:8", "1 John 4:19", "John 15:13"],
  },
  {
    name: "Grace",
    icon: "sparkles-outline",
    iconFamily: "Ionicons",
    color: "#D4A76A",
    verses: ["Ephesians 2:8-9", "Romans 5:8", "Titus 2:11", "2 Corinthians 12:9", "Hebrews 4:16"],
  },
  {
    name: "Prayer",
    icon: "chatbubble-ellipses-outline",
    iconFamily: "Ionicons",
    color: "#6A9EC4",
    verses: ["Philippians 4:6-7", "1 Thessalonians 5:16-18", "Matthew 7:7", "James 5:16", "Psalm 145:18"],
  },
  {
    name: "Faith",
    icon: "compass-outline",
    iconFamily: "Ionicons",
    color: "#5B8B8B",
    verses: ["Hebrews 11:1", "Romans 10:17", "Matthew 17:20", "James 2:17", "Ephesians 2:8-9"],
  },
  {
    name: "Peace",
    icon: "water-outline",
    iconFamily: "Ionicons",
    color: "#6AB0A0",
    verses: ["John 14:27", "Philippians 4:7", "Isaiah 26:3", "Psalm 29:11", "Romans 15:13"],
  },
  {
    name: "Trust",
    icon: "navigate-outline",
    iconFamily: "Ionicons",
    color: "#8BA06A",
    verses: ["Proverbs 3:5-6", "Psalm 37:5", "Isaiah 26:4", "Psalm 56:3", "Nahum 1:7"],
  },
  {
    name: "Identity in Christ",
    icon: "star-outline",
    iconFamily: "Ionicons",
    color: "#C49A6A",
    verses: ["2 Corinthians 5:17", "Galatians 2:20", "Ephesians 2:10", "1 Peter 2:9", "John 1:12"],
  },
  {
    name: "Salvation",
    icon: "flag-outline",
    iconFamily: "Ionicons",
    color: "#A06A8B",
    verses: ["Romans 6:23", "John 3:16", "Acts 4:12", "Romans 10:9", "Ephesians 2:8-9"],
  },
  {
    name: "Purpose",
    icon: "bulb-outline",
    iconFamily: "Ionicons",
    color: "#B08A5B",
    verses: ["Jeremiah 29:11", "Romans 8:28", "Ephesians 2:10", "Proverbs 16:3", "Matthew 28:19-20"],
  },
  {
    name: "Grief & Comfort",
    icon: "umbrella-outline",
    iconFamily: "Ionicons",
    color: "#7A8BA0",
    verses: ["Psalm 34:18", "Matthew 5:4", "2 Corinthians 1:3-4", "Revelation 21:4", "Psalm 147:3"],
  },
  {
    name: "Courage",
    icon: "flame-outline",
    iconFamily: "Ionicons",
    color: "#D47A5B",
    verses: ["Joshua 1:9", "2 Timothy 1:7", "Psalm 27:1", "Isaiah 41:10", "Deuteronomy 31:6"],
  },
  {
    name: "Scripture & Truth",
    icon: "book-outline",
    iconFamily: "Ionicons",
    color: "#6A7AC4",
    verses: ["Psalm 119:105", "Hebrews 4:12", "2 Timothy 3:16-17", "John 17:17", "Romans 15:4"],
  },
  {
    name: "Gratitude",
    icon: "gift-outline",
    iconFamily: "Ionicons",
    color: "#C46AA0",
    verses: ["1 Thessalonians 5:16-18", "Psalm 107:1", "Colossians 3:17", "Psalm 100:4", "James 1:17"],
  },
  {
    name: "God's Character",
    icon: "prism-outline",
    iconFamily: "Ionicons",
    color: "#6AC4B0",
    verses: ["Lamentations 3:22-23", "Psalm 145:8", "Exodus 34:6", "1 John 4:8", "Psalm 86:15"],
  },
];
