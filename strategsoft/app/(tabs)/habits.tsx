import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Card, EmptyState, GhostButton, Screen, Subtitle, Title, useThemeColors } from "@/src/ui/components";
import { monthGrid, todayISO } from "@/src/lib/dates";
import { createId } from "@/src/lib/id";
import { currentStreak, logsForHabit, monthHabitStats, weekHabitStats, yearHabitStats } from "@/src/services/habitService";
import type { Habit } from "@/src/types/models";

export default function HabitsScreen() {
  const { db, update } = useApp();
  const router = useRouter();
  const c = useThemeColors();
  const today = todayISO();
  const [monthOffset, setMonthOffset] = useState(0);
  const ref = new Date();
  ref.setMonth(ref.getMonth() + monthOffset);
  const grid = monthGrid(ref.getFullYear(), ref.getMonth());
  const active = db.habits.filter((h) => !h.archived);

  const toggle = async (habit: Habit, date = today) => {
    await update((d) => {
      const existing = d.habitLogs.find((l) => l.habitId === habit.id && l.date === date);
      const now = new Date().toISOString();
      if (existing) {
        if (existing.done) {
          existing.done = false;
          existing.skipped = true;
        } else {
          existing.done = true;
          existing.skipped = false;
        }
        existing.updatedAt = now;
      } else {
        d.habitLogs.push({
          id: createId("hlog"),
          habitId: habit.id,
          date,
          done: true,
          skipped: false,
          comment: "",
          createdAt: now,
          updatedAt: now,
          source: "manual",
        });
      }
    });
  };

  const remove = (habit: Habit) => {
    Alert.alert("Удалить привычку?", "История отметок останется, привычка будет скрыта.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Скрыть",
        style: "destructive",
        onPress: () =>
          update((d) => {
            const h = d.habits.find((x) => x.id === habit.id);
            if (h) h.archived = true;
          }),
      },
    ]);
  };

  return (
    <Screen>
      <Title>Привычки</Title>
      <GhostButton label="Новая привычка" onPress={() => router.push("/habit-form")} />
      {!active.length ? <EmptyState title="Пока нет привычек" action="Добавить" onAction={() => router.push("/habit-form")} /> : null}
      {active.map((habit) => {
        const logs = logsForHabit(db, habit.id);
        const week = weekHabitStats(habit, logs, today);
        const month = monthHabitStats(logs, today);
        const year = yearHabitStats(logs, today);
        const todayLog = logs.find((l) => l.date === today);
        return (
          <Card key={habit.id}>
            <Pressable onLongPress={() => router.push({ pathname: "/habit-form", params: { id: habit.id } })}>
              <Title>{habit.name}</Title>
            </Pressable>
            {habit.anchorAction ? <Subtitle>{habit.anchorAction}</Subtitle> : null}
            <Subtitle>
              Цель {habit.weeklyTarget} раз в неделю · серия {currentStreak(logs)} · неделя {week.done}/{week.target} ({week.percent}%)
            </Subtitle>
            <Subtitle>
              Месяц {month.percent}% · год {year.done} отметок
            </Subtitle>
            <Pressable
              accessibilityLabel={`Отметить ${habit.name}`}
              onPress={() => toggle(habit)}
              style={{ minHeight: 48, justifyContent: "center" }}
            >
              <Text style={{ color: c.accent, fontSize: 18, fontWeight: "700" }}>
                {todayLog?.done ? "Снято отметку за сегодня" : "Отметить сегодня"}
              </Text>
            </Pressable>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {["пн", "вт", "ср", "чт", "пт", "сб", "вс"].map((d, i) => (
                <Text key={d} style={{ color: c.muted, width: 36, textAlign: "center" }}>
                  {d}
                </Text>
              ))}
              {grid.map((iso, i) => {
                const log = iso ? logs.find((l) => l.date === iso) : undefined;
                return (
                  <Pressable
                    key={i}
                    disabled={!iso}
                    onPress={() => iso && toggle(habit, iso)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: !iso ? "transparent" : log?.done ? habit.color : c.empty,
                    }}
                  >
                    <Text style={{ color: c.text, fontSize: 12 }}>{iso ? iso.slice(8) : ""}</Text>
                  </Pressable>
                );
              })}
            </View>
            <GhostButton label="Пропуск не удаляет историю — скрыть привычку" onPress={() => remove(habit)} />
          </Card>
        );
      })}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <GhostButton label="Пред. месяц" onPress={() => setMonthOffset((v) => v - 1)} />
        <GhostButton label="След. месяц" onPress={() => setMonthOffset((v) => v + 1)} />
      </View>
    </Screen>
  );
}
