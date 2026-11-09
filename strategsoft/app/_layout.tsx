import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { Platform, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/components/useColorScheme";
import { AppProvider, useApp } from "@/src/state/AppProvider";
import { Loader } from "@/src/ui/components";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  anchor: "(tabs)",
};

function ThemedNav() {
  const scheme = useColorScheme();
  const { db, loading } = useApp();
  const pref = db.settings.theme;
  const resolved = pref === "system" ? scheme : pref;
  if (loading) return <Loader />;
  return (
    <ThemeProvider value={resolved === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={resolved === "dark" ? "light" : "dark"} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="goals/index" options={{ title: "Цели" }} />
        <Stack.Screen name="guides/index" options={{ title: "Инструкции" }} />
        <Stack.Screen name="guides/[id]" options={{ title: "Инструкция" }} />
        <Stack.Screen name="settings" options={{ title: "Настройки" }} />
        <Stack.Screen name="import" options={{ title: "Импорт" }} />
        <Stack.Screen name="task-form" options={{ title: "Задача", presentation: "modal" }} />
        <Stack.Screen name="habit-form" options={{ title: "Привычка", presentation: "modal" }} />
        <Stack.Screen name="mood-form" options={{ title: "Состояние", presentation: "modal" }} />
        <Stack.Screen name="goal-form" options={{ title: "Цель", presentation: "modal" }} />
        <Stack.Screen name="tx-form" options={{ title: "Операция", presentation: "modal" }} />
        <Stack.Screen name="week-review" options={{ title: "Обзор недели", presentation: "modal" }} />
        <Stack.Screen name="moment-form" options={{ title: "Трудный момент", presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}

function WebFrame({ children }: { children: ReactNode }) {
  if (Platform.OS !== "web") return children;
  return (
    <View style={{ flex: 1, minHeight: "100%", backgroundColor: "#0E1512", alignItems: "center" }}>
      <View
        style={{
          width: "100%",
          maxWidth: 480,
          flex: 1,
          minHeight: "100vh" as unknown as number,
          backgroundColor: "#F4F1EA",
          overflow: "hidden",
        }}
      >
        {children}
      </View>
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <WebFrame>
        <ThemedNav />
      </WebFrame>
    </AppProvider>
  );
}
