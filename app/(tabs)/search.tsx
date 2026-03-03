import { useState, useCallback, useEffect, useRef } from "react";
import { StyleSheet, Text, View, TextInput, Pressable, FlatList, Platform, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { fetch } from "expo/fetch";
import Colors from "@/constants/colors";
import { searchBooks, BIBLE_BOOKS } from "@/data/bibleBooks";
import { fetchVerse, VerseResult } from "@/lib/bible-api";
import { VerseCard } from "@/components/VerseCard";
import { getApiUrl } from "@/lib/query-client";

interface SearchResult {
  reference: string;
  content: string;
}

interface KeywordSearchResponse {
  results: SearchResult[];
  totalResults: number;
  page: number;
  totalPages: number;
}

function isReferenceQuery(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const refPattern = /^(\d\s+)?[a-zA-Z]+(\s+[a-zA-Z]+)*\s+\d/;
  if (refPattern.test(trimmed)) return true;

  const lowerTrimmed = trimmed.toLowerCase();
  const matchesBook = BIBLE_BOOKS.some((book) => {
    const lowerBook = book.toLowerCase();
    return lowerTrimmed === lowerBook || lowerTrimmed.startsWith(lowerBook + " ");
  });

  if (matchesBook) {
    const hasNumber = /\d/.test(trimmed);
    if (hasNumber) return true;
  }

  return false;
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ q?: string }>();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const [query, setQuery] = useState("");
  const lastIncomingQuery = useRef<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [result, setResult] = useState<VerseResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<VerseResult[]>([]);

  const [keywordResults, setKeywordResults] = useState<SearchResult[]>([]);
  const [keywordPage, setKeywordPage] = useState(1);
  const [keywordTotalPages, setKeywordTotalPages] = useState(0);
  const [keywordTotalResults, setKeywordTotalResults] = useState(0);
  const [isKeywordMode, setIsKeywordMode] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setError(null);
    const parts = text.split(" ");
    if (parts.length === 1 || (parts.length === 2 && !parts[1].match(/^\d/))) {
      setSuggestions(searchBooks(text));
    } else {
      setSuggestions([]);
    }
  };

  const performKeywordSearch = useCallback(async (searchText: string, page: number) => {
    const baseUrl = getApiUrl();
    const url = new URL("/api/search", baseUrl);
    url.searchParams.set("q", searchText);
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }
    const data: KeywordSearchResponse = await response.json();
    return data;
  }, []);

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setIsLoading(true);
    setError(null);
    setResult(null);
    setSuggestions([]);
    setKeywordResults([]);
    setKeywordPage(1);
    setKeywordTotalPages(0);
    setKeywordTotalResults(0);

    const useReference = isReferenceQuery(q);
    setIsKeywordMode(!useReference);

    if (useReference) {
      try {
        const verse = await fetchVerse(q);
        setResult(verse);
        setRecentSearches((prev) => {
          const filtered = prev.filter((v) => v.reference !== verse.reference);
          return [verse, ...filtered].slice(0, 10);
        });
      } catch {
        setError("Could not find that verse. Try something like \"John 3:16\"");
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const data = await performKeywordSearch(q, 1);
        setKeywordResults(data.results);
        setKeywordPage(data.page);
        setKeywordTotalPages(data.totalPages);
        setKeywordTotalResults(data.totalResults);
        if (data.results.length === 0) {
          setError(`No results found for "${q}"`);
        }
      } catch {
        setError("Search failed. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }
  }, [query, performKeywordSearch]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || keywordPage >= keywordTotalPages) return;

    setIsLoadingMore(true);
    try {
      const nextPage = keywordPage + 1;
      const data = await performKeywordSearch(query.trim(), nextPage);
      setKeywordResults((prev) => [...prev, ...data.results]);
      setKeywordPage(data.page);
      setKeywordTotalPages(data.totalPages);
    } catch {
      setError("Failed to load more results.");
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, keywordPage, keywordTotalPages, query, performKeywordSearch]);

  useEffect(() => {
    if (params.q && params.q !== lastIncomingQuery.current) {
      lastIncomingQuery.current = params.q;
      setQuery(params.q);
      handleSearch(params.q);
    }
  }, [params.q, handleSearch]);

  const handleSuggestionPress = (book: string) => {
    setQuery(book + " ");
    setSuggestions([]);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setResult(null);
    setError(null);
    setKeywordResults([]);
    setKeywordPage(1);
    setKeywordTotalPages(0);
    setKeywordTotalResults(0);
    setIsKeywordMode(false);
  };

  const renderKeywordItem = ({ item, index }: { item: SearchResult; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400).springify()} testID={`keyword-result-${index}`}>
      <View style={styles.keywordCard}>
        <Text style={styles.keywordContent}>{item.content}</Text>
        <View style={styles.keywordFooter}>
          <Text style={styles.keywordReference}>{item.reference}</Text>
        </View>
      </View>
    </Animated.View>
  );

  const verseData = result ? [result] : recentSearches;

  return (
    <View style={styles.container}>
      {isKeywordMode && keywordResults.length > 0 ? (
        <FlatList
          data={keywordResults}
          keyExtractor={(item, index) => `${item.reference}-${index}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + webTopInset + 20, paddingBottom: insets.bottom + 100 },
          ]}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>Search</Text>
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={Colors.light.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder='Try "John 3:16" or search "love"'
                    placeholderTextColor={Colors.light.textTertiary}
                    value={query}
                    onChangeText={handleQueryChange}
                    onSubmitEditing={() => handleSearch()}
                    returnKeyType="search"
                    autoCapitalize="words"
                    autoCorrect={false}
                    testID="search-input"
                  />
                  {query.length > 0 && (
                    <Pressable onPress={handleClear} hitSlop={8} testID="search-clear">
                      <Ionicons name="close-circle" size={18} color={Colors.light.textTertiary} />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={() => handleSearch()}
                  style={({ pressed }) => [
                    styles.searchBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  testID="search-button"
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              </View>

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.light.accent} size="small" />
                  <Text style={styles.loadingText}>Searching...</Text>
                </View>
              )}

              {error && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.light.accent} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              <Text style={styles.recentTitle}>
                {keywordTotalResults} result{keywordTotalResults !== 1 ? "s" : ""} found
              </Text>
            </View>
          }
          renderItem={renderKeywordItem}
          ListFooterComponent={
            keywordPage < keywordTotalPages ? (
              <Pressable
                onPress={handleLoadMore}
                style={({ pressed }) => [
                  styles.loadMoreBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
                disabled={isLoadingMore}
                testID="load-more-button"
              >
                {isLoadingMore ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Load More</Text>
                )}
              </Pressable>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          testID="keyword-search-results"
        />
      ) : (
        <FlatList
          data={verseData}
          keyExtractor={(item) => item.reference}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + webTopInset + 20, paddingBottom: insets.bottom + 100 },
          ]}
          ListHeaderComponent={
            <View>
              <Text style={styles.title}>Search</Text>
              <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={18} color={Colors.light.textTertiary} />
                  <TextInput
                    style={styles.input}
                    placeholder='Try "John 3:16" or search "love"'
                    placeholderTextColor={Colors.light.textTertiary}
                    value={query}
                    onChangeText={handleQueryChange}
                    onSubmitEditing={() => handleSearch()}
                    returnKeyType="search"
                    autoCapitalize="words"
                    autoCorrect={false}
                    testID="search-input"
                  />
                  {query.length > 0 && (
                    <Pressable onPress={handleClear} hitSlop={8} testID="search-clear">
                      <Ionicons name="close-circle" size={18} color={Colors.light.textTertiary} />
                    </Pressable>
                  )}
                </View>
                <Pressable
                  onPress={() => handleSearch()}
                  style={({ pressed }) => [
                    styles.searchBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                  testID="search-button"
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              </View>

              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestions.map((book) => (
                    <Pressable
                      key={book}
                      onPress={() => handleSuggestionPress(book)}
                      style={({ pressed }) => [
                        styles.suggestionItem,
                        { backgroundColor: pressed ? Colors.light.surfaceSecondary : Colors.light.surface },
                      ]}
                    >
                      <Ionicons name="book-outline" size={16} color={Colors.light.olive} />
                      <Text style={styles.suggestionText}>{book}</Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color={Colors.light.accent} size="small" />
                  <Text style={styles.loadingText}>
                    {isKeywordMode ? "Searching..." : "Looking up verse..."}
                  </Text>
                </View>
              )}

              {error && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={Colors.light.accent} />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              )}

              {!result && recentSearches.length > 0 && !isLoading && (
                <Text style={styles.recentTitle}>Recent Searches</Text>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <VerseCard verse={item} index={index} />
          )}
          ListEmptyComponent={
            !isLoading && !error ? (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
                <Ionicons name="search-outline" size={40} color={Colors.light.textTertiary} />
                <Text style={styles.emptyTitle}>Look up any verse</Text>
                <Text style={styles.emptySubtitle}>
                  Enter a book, chapter, and verse to find scripture
                </Text>
              </Animated.View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          testID="search-results"
        />
      )}
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
  title: {
    fontFamily: "Lora_700Bold",
    fontSize: 28,
    color: Colors.light.text,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center" as const,
    backgroundColor: Colors.light.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 10,
  },
  input: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
    padding: 0,
  },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  suggestionsContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden" as const,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center" as const,
    padding: 14,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  suggestionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    color: Colors.light.text,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    paddingVertical: 20,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center" as const,
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 14,
    backgroundColor: "#FFF5F0",
    borderRadius: 12,
  },
  errorText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.light.accentDark,
    flex: 1,
  },
  recentTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.textSecondary,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
    paddingHorizontal: 24,
    marginBottom: 12,
    marginTop: 8,
  },
  emptyState: {
    alignItems: "center" as const,
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
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
  keywordCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  keywordContent: {
    fontFamily: "Lora_400Regular",
    fontSize: 17,
    lineHeight: 28,
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  keywordFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center" as const,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  keywordReference: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: Colors.light.accent,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  loadMoreBtn: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  loadMoreText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
