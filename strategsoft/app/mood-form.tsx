import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, PrimaryButton, Screen, Subtitle, Title, useThemeColors } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import { todayISO } from "@/src/lib/dates";

const EMOTIONS = ["спокойствие", "радость", "тревога", "усталость", "злость", "интерес"];
const FACTORS = ["сон", "спорт", "общение", "перегруз", "погода", "еда"];
const ACTIVITIES = ["работа", "учёба", "прогулка", "творчество", "отдых"];

export default function MoodForm() {
  const { db, update } = useApp();
  const router = useRouter();
  const c = useThemeColors();
  const params = useLocalSearchParams<{ id?: string; date?: string }>();
  const existing = db.moodEntries.find((e) => e.id === params.id) ?? db.moodEntries.find((e) => e.date === params.date);
  const [date, setDate] = useState(existing?.date ?? params.date ?? todayISO());
  const [score, setScore] = useState(existing?.score ?? 6);
  const [sleep, setSleep] = useState(existing?.sleepHours != null ? String(existing.sleepHours) : "");
  const [emotions, setEmotions] = useState<string[]>(existing?.emotions ?? []);
  const [factors, setFactors] = useState<string[]>(existing?.factors ?? []);
  const [activities, setActivities] = useState<string[]>(existing?.activities ?? []);
  const [note, setNote] = useState(existing?.note ?? "");
  const [error, setError] = useState("");

  const toggle = (list: string[], set: (v: string[]) => void, item: string) => {
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
  };

  const save = async () => {
    if (score < 1 || score > 10) return setError("Оценка от 1 до 10");
    const sleepHours = sleep ? Number(sleep.replace(",", ".")) : null;
    if (sleepHours != null && !(sleepHours >= 0 && sleepHours <= 24)) return setError("Сон: часы от 0 до 24");
    const now = new Date().toISOString();
    await update((d) => {
      const payload = {
        date,
        score,
        sleepHours,
        emotions,
        factors,
        activities,
        note,
        updatedAt: now,
        source: "manual" as const,
      };
      const found = d.moodEntries.find((e) => e.id === existing?.id) ?? d.moodEntries.find((e) => e.date === date);
      if (found) Object.assign(found, payload);
      else d.moodEntries.push({ id: createId("mood"), createdAt: now, ...payload });
    });
    router.back();
  };

  return (
    <Screen>
      <Title>Запись состояния</Title>
      <Subtitle>Только наблюдение. Приложение не ставит диагнозов.</Subtitle>
      <Field label="Дата" value={date} onChangeText={setDate} />
      <Subtitle>Оценка 1–10: {score}</Subtitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <Pressable
            key={n}
            accessibilityLabel={`Оценка ${n}`}
            onPress={() => setScore(n)}
            style={{ minWidth: 44, minHeight: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: score === n ? c.accent : c.empty }}
          >
            <Text style={{ color: score === n ? "#fff" : c.text, fontWeight: "700" }}>{n}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Сон, часов (необязательно)" value={sleep} onChangeText={setSleep} keyboardType="decimal-pad" />
      <Chips label="Эмоции" items={EMOTIONS} selected={emotions} onToggle={(i) => toggle(emotions, setEmotions, i)} />
      <Chips label="Факторы дня" items={FACTORS} selected={factors} onToggle={(i) => toggle(factors, setFactors, i)} />
      <Chips label="Занятия" items={ACTIVITIES} selected={activities} onToggle={(i) => toggle(activities, setActivities, i)} />
      <Field label="Короткая заметка" value={note} onChangeText={setNote} multiline />
      {error ? <Subtitle>{error}</Subtitle> : null}
      <PrimaryButton label="Сохранить" onPress={save} />
      {existing ? (
        <PrimaryButton
          danger
          label="Удалить запись"
          onPress={() =>
            Alert.alert("Удалить запись?", "", [
              { text: "Отмена", style: "cancel" },
              {
                text: "Удалить",
                style: "destructive",
                onPress: async () => {
                  await update((d) => {
                    d.moodEntries = d.moodEntries.filter((e) => e.id !== existing.id);
                  });
                  router.back();
                },
              },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}

function Chips({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Subtitle>{label}</Subtitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((item) => (
          <Pressable key={item} onPress={() => onToggle(item)} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
            <Subtitle>{selected.includes(item) ? `✓ ${item}` : item}</Subtitle>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
