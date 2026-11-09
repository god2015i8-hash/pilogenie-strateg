import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import { Pressable } from "react-native";

import { useColorScheme } from "@/components/useColorScheme";
import { useApp } from "@/src/state/AppProvider";
import { colors } from "@/src/ui/theme";

export default function TabLayout() {
  const scheme = useColorScheme();
  const { db } = useApp();
  const pref = db.settings.theme;
  const resolved = pref === "system" ? scheme : pref;
  const c = colors(resolved === "dark");
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { minHeight: 58, backgroundColor: c.card },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerRight: () => (
          <Pressable
            accessibilityLabel="Настройки"
            onPress={() => router.push("/settings")}
            style={{ marginRight: 16, minWidth: 44, minHeight: 44, justifyContent: "center", alignItems: "center" }}
          >
            <Ionicons name="settings-outline" size={24} color={c.text} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Сегодня",
          tabBarIcon: ({ color }) => <Ionicons name="sunny-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: "План",
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          title: "Привычки",
          tabBarIcon: ({ color }) => <Ionicons name="checkbox-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: "Состояние",
          tabBarIcon: ({ color }) => <Ionicons name="heart-outline" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          title: "Финансы",
          tabBarIcon: ({ color }) => <Ionicons name="wallet-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
