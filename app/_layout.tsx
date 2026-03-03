import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useFonts, Lora_400Regular, Lora_700Bold } from "@expo-google-fonts/lora";
import { Inter_400Regular, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { SavedVersesProvider } from "@/context/SavedVersesContext";
import { AudioPlayerProvider } from "@/context/AudioPlayerContext";
import { SRSProvider } from "@/context/SRSContext";
import { StreakProvider } from "@/context/StreakContext";
import { precacheStaticVerses } from "@/lib/bible-api";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="theme/[name]"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen name="practice" options={{ headerShown: false }} />
      <Stack.Screen name="challenge" options={{ headerShown: false }} />
      <Stack.Screen name="songs" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="features" options={{ headerShown: false, presentation: "modal" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular,
    Lora_700Bold,
    Inter_400Regular,
    Inter_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
      precacheStaticVerses();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView>
          <KeyboardProvider>
            <SavedVersesProvider>
              <SRSProvider>
                <StreakProvider>
                  <AudioPlayerProvider>
                    <RootLayoutNav />
                  </AudioPlayerProvider>
                </StreakProvider>
              </SRSProvider>
            </SavedVersesProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
