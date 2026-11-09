import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Body, Card, EmptyState, Field, GhostButton, PrimaryButton, Screen, Subtitle, Title, useThemeColors } from "@/src/ui/components";
import { addDays, formatShortDate, startOfWeek, todayISO, weekDates, weekdayName } from "@/src/lib/dates";
import { createId } from "@/src/lib/id";
import { canAddBigTask, categoryStats, unfinishedForCarry, weekProgress, weekTasks } from "@/src/services/planService";
import type { Task, WeekPlan } from "@/src/types/models";

function emptyReview(): WeekPlan["review"] {
  return { doneSummary: "", leftover: "", blockers: "", carryNotes: "", nextWeekBigThree: ["", "", ""], rating: null };
}

export default function PlanScreen() {
  const { db, update } = useApp();
  const router = useRouter();
  const c = useThemeColors();
  const today = todayISO();
  const [cursor, setCursor] = useState(startOfWeek(today));
  const [query, setQuery] = useState("");
  const week = db.weeks.find((w) => w.startDate === cursor);
  const tasks = week ? weekTasks(db, week.id) : [];
  const filtered = query
    ? tasks.filter((t) => {
        const cat = db.taskCategories.find((x) => x.id === t.categoryId);
        return `${t.title} ${cat?.name ?? ""}`.toLowerCase().includes(query.toLowerCase());
      })
    : tasks;
  const stats = weekProgress(filtered);
  const cats = categoryStats(db, filtered);
  const dates = weekDates(cursor);

  const createWeek = async () => {
    const now = new Date().toISOString();
    const template = db.weeks.find((w) => w.templateId === "default");
    await update((d) => {
      if (d.weeks.some((w) => w.startDate === cursor)) return;
      d.weeks.push({
        id: createId("week"),
        startDate: cursor,
        goal: template?.goal ?? "",
        weeklyBigThree: template?.weeklyBigThree ?? ["", "", ""],
        goalReached: false,
        review: emptyReview(),
        createdAt: now,
        updatedAt: now,
        source: "manual",
      });
    });
  };

  const toggle = async (task: Task) => {
    await update((d) => {
      const t = d.tasks.find((x) => x.id === task.id);
      if (!t) return;
      t.status = t.status === "done" ? "open" : "done";
      t.updatedAt = new Date().toISOString();
    });
  };

  const carry = async () => {
    if (!week) return;
    const leftover = unfinishedForCarry(tasks);
    if (!leftover.length) {
      Alert.alert("Нечего переносить", "Все открытые задачи уже закрыты.");
      return;
    }
    const nextStart = addDays(cursor, 7);
    await update((d) => {
      let next = d.weeks.find((w) => w.startDate === nextStart);
      const now = new Date().toISOString();
      if (!next) {
        next = {
          id: createId("week"),
          startDate: nextStart,
          goal: "",
          weeklyBigThree: ["", "", ""],
          goalReached: false,
          review: emptyReview(),
          createdAt: now,
          updatedAt: now,
          source: "manual",
        };
        d.weeks.push(next);
      }
      for (const t of leftover) {
        d.tasks.push({
          ...t,
          id: createId("task"),
          weekId: next.id,
          date: addDays(t.date, 7),
          dueDate: t.dueDate ? addDays(t.dueDate, 7) : null,
          status: "open",
          carriedFromTaskId: t.id,
          createdAt: now,
          updatedAt: now,
          source: "manual",
        });
      }
    });
    Alert.alert("Перенесено", "Невыполненные задачи скопированы на следующую неделю со связью с исходными.");
  };

  const archive = useMemo(() => [...db.weeks].sort((a, b) => b.startDate.localeCompare(a.startDate)), [db.weeks]);

  return (
    <Screen>
      <Title>План</Title>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <GhostButton label="←" onPress={() => setCursor(addDays(cursor, -7))} />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <Subtitle>
            {formatShortDate(cursor)} — {formatShortDate(addDays(cursor, 6))}
          </Subtitle>
        </View>
        <GhostButton label="→" onPress={() => setCursor(addDays(cursor, 7))} />
      </View>

      {!week ? (
        <EmptyState title="Этой недели ещё нет. Новая неделя создаётся из шаблона и не стирает архив." action="Создать неделю" onAction={createWeek} />
      ) : (
        <>
          <Card>
            <Subtitle>Цель недели</Subtitle>
            <Body>{week.goal || "Не указана"}</Body>
            <GhostButton
              label="Изменить цель и три дела недели"
              onPress={() => router.push({ pathname: "/week-review", params: { weekId: week.id, mode: "setup" } })}
            />
            {week.weeklyBigThree.filter(Boolean).map((t) => (
              <Text key={t} style={{ color: c.text }}>
                • {t}
              </Text>
            ))}
            <Subtitle>
              {stats.done} из {stats.total} · {stats.percent}% · главные {stats.bigDone}/{stats.bigTotal}
            </Subtitle>
          </Card>

          <Field label="Поиск по задаче или категории" value={query} onChangeText={setQuery} />

          {dates.map((date) => {
            const dayItems = filtered.filter((t) => t.date === date);
            return (
              <Card key={date}>
                <Title>
                  {weekdayName(date)} · {formatShortDate(date)}
                </Title>
                {!dayItems.length ? <Subtitle>Нет задач</Subtitle> : null}
                {dayItems.map((t) => {
                  const cat = db.taskCategories.find((x) => x.id === t.categoryId);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => toggle(t)}
                      onLongPress={() => router.push({ pathname: "/task-form", params: { id: t.id } })}
                      style={{ minHeight: 48, justifyContent: "center" }}
                    >
                      <Text style={{ color: c.text, fontSize: 16 }}>
                        {t.status === "done" ? "☑" : "☐"} {t.isBig ? "★ " : ""}
                        {t.title}
                      </Text>
                      {cat ? <Text style={{ color: cat.color }}>{cat.name}</Text> : null}
                    </Pressable>
                  );
                })}
                <GhostButton
                  label="Добавить задачу"
                  onPress={() =>
                    router.push({
                      pathname: "/task-form",
                      params: { weekId: week.id, date, big: canAddBigTask(dayItems, date) ? "0" : "0" },
                    })
                  }
                />
              </Card>
            );
          })}

          <Card>
            <Title>Категории недели</Title>
            {cats.map((cat) => (
              <Subtitle key={cat.name}>
                {cat.name}: {cat.done}/{cat.total}
              </Subtitle>
            ))}
            <GhostButton label="Изменить категории" onPress={() => router.push("/settings")} />
          </Card>

          <Card>
            <Title>Дополнительные задачи</Title>
            {db.backlog.length ? (
              db.backlog.map((b) => (
                <Pressable
                  key={b.id}
                  onPress={() =>
                    update((d) => {
                      const x = d.backlog.find((i) => i.id === b.id);
                      if (x) x.status = x.status === "done" ? "open" : "done";
                    })
                  }
                >
                  <Body>
                    {b.status === "done" ? "☑" : "☐"} {b.title} · {b.priority === "high" ? "высокая" : b.priority === "low" ? "низкая" : "средняя"}
                  </Body>
                </Pressable>
              ))
            ) : (
              <EmptyState title="Список дополнительных задач пуст" action="Добавить" onAction={() => router.push({ pathname: "/task-form", params: { backlog: "1" } })} />
            )}
          </Card>

          <PrimaryButton label="Обзор недели" onPress={() => router.push({ pathname: "/week-review", params: { weekId: week.id } })} />
          <GhostButton label="Перенести невыполненное на следующую неделю" onPress={carry} />
        </>
      )}

      <Card>
        <Title>Архив недель</Title>
        {archive.length ? (
          archive.map((w) => (
            <Pressable key={w.id} onPress={() => setCursor(w.startDate)} style={{ minHeight: 44, justifyContent: "center" }}>
              <Subtitle>
                {formatShortDate(w.startDate)} · {w.goal || "без цели"}
              </Subtitle>
            </Pressable>
          ))
        ) : (
          <Subtitle>Архив появится после первой недели</Subtitle>
        )}
      </Card>
    </Screen>
  );
}
