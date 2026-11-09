import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import { todayISO } from "@/src/lib/dates";

export default function HabitForm() {
  const { db, update } = useApp();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = db.habits.find((h) => h.id === id);
  const [name, setName] = useState(existing?.name ?? "");
  const [target, setTarget] = useState(String(existing?.weeklyTarget ?? 5));
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayISO());
  const [color, setColor] = useState(existing?.color ?? "#1F7A6A");
  const [category, setCategory] = useState(existing?.category ?? "");
  const [anchor, setAnchor] = useState(existing?.anchorAction ?? "После  я делаю ");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    const weeklyTarget = Number(target);
    if (!name.trim()) return setError("Введите название");
    if (!Number.isInteger(weeklyTarget) || weeklyTarget < 1 || weeklyTarget > 7) return setError("Цель: целое число от 1 до 7");
    const now = new Date().toISOString();
    await update((d) => {
      if (existing) {
        const h = d.habits.find((x) => x.id === existing.id);
        if (h) {
          Object.assign(h, { name: name.trim(), weeklyTarget, startDate, color, category, anchorAction: anchor, updatedAt: now });
        }
        if (comment) {
          const log = d.habitLogs.find((l) => l.habitId === existing.id && l.date === todayISO());
          if (log) log.comment = comment;
        }
      } else {
        d.habits.push({
          id: createId("habit"),
          name: name.trim(),
          weeklyTarget,
          startDate,
          color,
          category,
          anchorAction: anchor,
          archived: false,
          createdAt: now,
          updatedAt: now,
          source: "manual",
        });
      }
    });
    router.back();
  };

  return (
    <Screen>
      <Title>{existing ? "Привычка" : "Новая привычка"}</Title>
      <Field label="Название" value={name} onChangeText={setName} />
      <Field label="Повторений в неделю (1–7)" value={target} onChangeText={setTarget} keyboardType="number-pad" />
      <Field label="Дата начала" value={startDate} onChangeText={setStartDate} />
      <Field label="Цвет (#RRGGBB)" value={color} onChangeText={setColor} />
      <Field label="Категория" value={category} onChangeText={setCategory} />
      <Field label="Якорь: после [действие] я делаю [привычка]" value={anchor} onChangeText={setAnchor} />
      <Field label="Комментарий к сегодняшней отметке" value={comment} onChangeText={setComment} />
      {error ? <Subtitle>{error}</Subtitle> : null}
      <PrimaryButton label="Сохранить" onPress={save} />
      {existing ? (
        <PrimaryButton
          danger
          label="Скрыть"
          onPress={() =>
            Alert.alert("Скрыть привычку?", "Отметки сохранятся.", [
              { text: "Отмена", style: "cancel" },
              {
                text: "Скрыть",
                onPress: async () => {
                  await update((d) => {
                    const h = d.habits.find((x) => x.id === existing.id);
                    if (h) h.archived = true;
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
