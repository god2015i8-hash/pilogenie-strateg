import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useColorScheme } from "@/components/useColorScheme";
import { useApp } from "@/src/state/AppProvider";
import { colors } from "./theme";

export function useThemeColors() {
  const scheme = useColorScheme();
  const { db } = useApp();
  const pref = db.settings.theme;
  const resolved = pref === "system" ? scheme : pref;
  return colors(resolved === "dark");
}

export function Screen({
  children,
  padded = true,
}: {
  children: React.ReactNode;
  padded?: boolean;
}) {
  const c = useThemeColors();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ padding: padded ? 16 : 0, paddingBottom: 48, gap: 12 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const c = useThemeColors();
  return <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }, style]}>{children}</View>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return <Text style={[styles.title, { color: c.text }]}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return <Text style={[styles.sub, { color: c.muted }]}>{children}</Text>;
}

export function Body({ children }: { children: React.ReactNode }) {
  const c = useThemeColors();
  return <Text style={[styles.body, { color: c.text }]}>{children}</Text>;
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
  danger,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: danger ? c.danger : c.accent, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
      ]}
    >
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useThemeColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.ghost, { borderColor: c.border, opacity: pressed ? 0.7 : 1 }]}
    >
      <Text style={{ color: c.navy, fontWeight: "600", fontSize: 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  ...rest
}: { label: string } & TextInputProps) {
  const c = useThemeColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 14 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={c.muted}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.bg }]}
        {...rest}
      />
    </View>
  );
}

export function EmptyState({
  title,
  action,
  onAction,
}: {
  title: string;
  action: string;
  onAction: () => void;
}) {
  const c = useThemeColors();
  return (
    <View style={[styles.empty, { backgroundColor: c.empty }]}>
      <Text style={{ color: c.muted, fontSize: 16, textAlign: "center" }}>{title}</Text>
      <PrimaryButton label={action} onPress={onAction} />
    </View>
  );
}

export function Loader() {
  const scheme = useColorScheme();
  const c = colors(scheme === "dark");
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}>
      <ActivityIndicator color={c.accent} />
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  const c = useThemeColors();
  return (
    <View style={[styles.empty, { backgroundColor: "#F8D7D0" }]}>
      <Text style={{ color: c.danger }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 14 },
  body: { fontSize: 16, lineHeight: 22 },
  button: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonLabel: { color: "#fff", fontSize: 16, fontWeight: "700" },
  ghost: { minHeight: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, paddingHorizontal: 16 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16 },
  empty: { borderRadius: 16, padding: 20, gap: 12, alignItems: "center" },
});
