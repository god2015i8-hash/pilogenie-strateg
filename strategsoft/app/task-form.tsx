import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, GhostButton, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import { startOfWeek, todayISO } from "@/src/lib/dates";
import { parseHashtag, withCategoryTag } from "@/src/lib/tags";
import { canAddBigTask, dayTasks, makeWeek } from "@/src/services/planService";

export default function TaskForm() {
  const { db, update } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; weekId?: string; date?: string; big?: string; backlog?: string }>();
  const existing = db.tasks.find((t) => t.id === params.id);
  const backlogItem = db.backlog.find((t) => t.id === params.id);
  const isBacklog = params.backlog === "1" || Boolean(backlogItem);
  const [title, setTitle] = useState(existing?.title ?? backlogItem?.title ?? "");
  const [date, setDate] = useState(existing?.date ?? params.date ?? todayISO());
  const [note, setNote] = useState(existing?.note ?? backlogItem?.note ?? "");
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? backlogItem?.categoryId ?? db.taskCategories[0]?.id ?? "");
  const [isBig, setIsBig] = useState(existing?.isBig ?? params.big === "1");
  const [priority, setPriority] = useState(backlogItem?.priority ?? "medium");
  const [error, setError] = useState("");

  const taggedTitle = () => {
    const cat = db.taskCategories.find((x) => x.id === categoryId) ?? null;
    const parsed = parseHashtag(title, db.taskCategories);
    return withCategoryTag(parsed.title, cat);
  };

  const save = async () => {
    if (!title.trim()) {
      setError("Введите название");
      return;
    }
    const now = new Date().toISOString();
    const finalTitle = taggedTitle();
    const parsed = parseHashtag(finalTitle, db.taskCategories);
    if (isBacklog) {
      await update((d) => {
        if (backlogItem) {
          const x = d.backlog.find((i) => i.id === backlogItem.id);
          if (x) {
            x.title = parsed.title;
            x.note = note;
            x.priority = priority;
            x.dueDate = date;
            x.categoryId = parsed.categoryId;
            x.updatedAt = now;
          }
        } else {
          d.backlog.push({
            id: createId("back"),
            title: parsed.title,
            dueDate: date,
            priority,
            status: "open",
            categoryId: parsed.categoryId,
            note,
            createdAt: now,
            updatedAt: now,
            source: "manual",
          });
        }
      });
      router.back();
      return;
    }

    const weekStart = startOfWeek(date);
    await update((d) => {
      let week = d.weeks.find((w) => w.id === params.weekId) ?? d.weeks.find((w) => w.startDate === weekStart);
      if (!week) {
        week = makeWeek(weekStart, "manual");
        d.weeks.push(week);
      }
      const day = dayTasks(d, date);
      const wantBig = isBig && (existing?.isBig || canAddBigTask(day, date));
      if (existing) {
        const t = d.tasks.find((x) => x.id === existing.id);
        if (t) {
          t.title = parsed.title;
          t.date = date;
          t.note = note;
          t.categoryId = parsed.categoryId;
          t.isBig = wantBig;
          t.updatedAt = now;
        }
      } else {
        d.tasks.push({
          id: createId("task"),
          weekId: week.id,
          title: parsed.title,
          date,
          categoryId: parsed.categoryId,
          dueDate: date,
          status: "open",
          note,
          isBig: wantBig,
          isWeeklyBig: false,
          carriedFromTaskId: null,
          goalId: null,
          createdAt: now,
          updatedAt: now,
          source: "manual",
        });
      }
    });
    router.back();
  };

  const remove = () => {
    Alert.alert("Удалить задачу?", "Действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          await update((d) => {
            d.tasks = d.tasks.filter((t) => t.id !== existing?.id);
            d.backlog = d.backlog.filter((t) => t.id !== backlogItem?.id);
          });
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <Title>{isBacklog ? "Дополнительная задача" : "Задача"}</Title>
      <Field
        label="Название (тег #категория подсветит задачу)"
        value={title}
        onChangeText={(v) => {
          setTitle(v);
          const parsed = parseHashtag(v, db.taskCategories);
          if (parsed.categoryId) setCategoryId(parsed.categoryId);
        }}
      />
      <Field label="Дата (ГГГГ-ММ-ДД)" value={date} onChangeText={setDate} />
      <Field label="Заметка" value={note} onChangeText={setNote} multiline />
      <Subtitle>Категория</Subtitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {db.taskCategories.map((cat) => (
          <GhostButton key={cat.id} label={categoryId === cat.id ? `✓ ${cat.name}` : cat.name} onPress={() => setCategoryId(cat.id)} />
        ))}
      </View>
      {!isBacklog ? <GhostButton label={isBig ? "Главное дело: да" : "Сделать главным делом дня"} onPress={() => setIsBig((v) => !v)} /> : null}
      {isBacklog ? (
        <View style={{ flexDirection: "row", gap: 8 }}>
          {(["high", "medium", "low"] as const).map((p) => (
            <GhostButton key={p} label={p === "high" ? "высокая" : p === "low" ? "низкая" : "средняя"} onPress={() => setPriority(p)} />
          ))}
        </View>
      ) : null}
      {error ? <Subtitle>{error}</Subtitle> : null}
      <PrimaryButton label="Сохранить" onPress={save} />
      {(existing || backlogItem) && <PrimaryButton danger label="Удалить" onPress={remove} />}
    </Screen>
  );
}
