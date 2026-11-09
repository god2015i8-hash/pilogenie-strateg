import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";
import { useMemo, useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Body, Card, EmptyState, Field, GhostButton, PrimaryButton, Screen, Subtitle, Title, useThemeColors } from "@/src/ui/components";
import { addDays, formatShortDate, startOfWeek, todayISO, weekDates, weekdayName } from "@/src/lib/dates";
import { createId } from "@/src/lib/id";
import { progressBar, splitTitleTag } from "@/src/lib/tags";
import {
  archiveRows,
  archiveSummary,
  backlogStats,
  canAddBigTask,
  categoryStats,
  compareWeeks,
  dayProgress,
  makeWeek,
  previousWeekUnfinished,
  seedWeekFromPrevious,
  unfinishedForCarry,
  weekProgress,
  weekTasks,
} from "@/src/services/planService";
import { toggleHabitLog, weekHabitGrid } from "@/src/services/habitService";
import type { Task } from "@/src/types/models";

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
  const prevOpen = previousWeekUnfinished(db, cursor);
  const prevWeek = db.weeks.find((w) => w.startDate === addDays(cursor, -7));
  const cmp = compareWeeks(stats, prevWeek ? weekProgress(weekTasks(db, prevWeek.id)) : null);
  const habits = weekHabitGrid(db, cursor);
  const extra = backlogStats(db.backlog, today);
  const archive = useMemo(() => archiveRows(db), [db]);
  const summary = archiveSummary(archive);

  const createWeek = async () => {
    const seed = seedWeekFromPrevious(db, cursor);
    await update((d) => {
      if (d.weeks.some((w) => w.startDate === cursor)) return;
      d.weeks.push(makeWeek(cursor, "manual", seed));
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
      if (!next) {
        next = makeWeek(nextStart, "manual", { weeklyBigThree: week.review.nextWeekBigThree });
        d.weeks.push(next);
      }
      const now = new Date().toISOString();
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

  return (
    <Screen>
      <Title>План</Title>
      <GhostButton label="Инструкция раздела" onPress={() => router.push("/guides/plan-week")} />
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
            <Subtitle>{week.goalReached ? "Цель достигнута" : "Цель пока не отмечена"}</Subtitle>
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
              Всего {stats.total} · готово {stats.done} · осталось {stats.leftover} · {stats.percent}%
            </Subtitle>
            <Subtitle>Главные {stats.bigDone} из {stats.bigTotal} · {progressBar(stats.percent)}</Subtitle>
            {cmp.percentDelta != null ? (
              <Subtitle>
                К прошлой неделе: {cmp.percentDelta > 0 ? "+" : ""}
                {cmp.percentDelta} п.п. выполнения
              </Subtitle>
            ) : null}
          </Card>

          <Field label="Поиск по задаче или категории" value={query} onChangeText={setQuery} />

          {dates.map((date) => {
            const dayItems = filtered.filter((t) => t.date === date);
            const big = dayItems.filter((t) => t.isBig).slice(0, 3);
            const rest = dayItems.filter((t) => !big.includes(t));
            const day = dayProgress(dayItems);
            return (
              <Card key={date}>
                <Title>
                  {weekdayName(date)} · {formatShortDate(date)}
                </Title>
                <Subtitle>Итог дня: {day.text}</Subtitle>
                <Subtitle>Главное (до трёх дел)</Subtitle>
                {big.length ? big.map((t) => <TaskLine key={t.id} task={t} dbCategories={db.taskCategories} color={c.text} gold="#C9A227" onPress={() => toggle(t)} onLongPress={() => router.push({ pathname: "/task-form", params: { id: t.id } })} />) : <Subtitle>Нет главных дел</Subtitle>}
                <Subtitle>Задачи</Subtitle>
                {rest.length ? rest.map((t) => <TaskLine key={t.id} task={t} dbCategories={db.taskCategories} color={c.text} gold="#C9A227" onPress={() => toggle(t)} onLongPress={() => router.push({ pathname: "/task-form", params: { id: t.id } })} />) : <Subtitle>Нет обычных задач</Subtitle>}
                <GhostButton
                  label="Добавить задачу"
                  onPress={() =>
                    router.push({
                      pathname: "/task-form",
                      params: { weekId: week.id, date, big: canAddBigTask(dayItems, date) ? "1" : "0" },
                    })
                  }
                />
              </Card>
            );
          })}

          <Card>
            <Title>Привычки недели</Title>
            {!habits.length ? (
              <EmptyState title="Привычки задаются в настройках и отмечаются по дням" action="Добавить" onAction={() => router.push("/habit-form")} />
            ) : (
              habits.map((row) => (
                <View key={row.habit.id} style={{ gap: 6 }}>
                  <Subtitle>
                    {row.habit.name} · {row.done} из {row.target}
                  </Subtitle>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {row.dates.map((date, i) => (
                      <Pressable
                        key={date}
                        onPress={() => update((d) => toggleHabitLog(d, row.habit.id, date))}
                        style={{
                          minWidth: 40,
                          minHeight: 40,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: row.checks[i] ? "#1F7A6A" : c.empty,
                        }}
                      >
                        <Text style={{ color: row.checks[i] ? "#fff" : c.muted, fontSize: 12 }}>{weekdayName(date, true)}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            )}
          </Card>

          <Card>
            <Title>Категории недели</Title>
            {cats.map((cat) => (
              <View key={cat.name}>
                <Subtitle>
                  {cat.name}: {cat.done}/{cat.total} · {progressBar(cat.total ? Math.round((cat.done / cat.total) * 100) : 0)}
                </Subtitle>
              </View>
            ))}
            <GhostButton label="Изменить категории" onPress={() => router.push("/settings")} />
          </Card>

          <Card>
            <Title>Не выполнено за неделю</Title>
            {unfinishedForCarry(filtered).length ? (
              unfinishedForCarry(filtered).map((t) => (
                <Subtitle key={t.id}>
                  {weekdayName(t.date, true)} · {t.title}
                </Subtitle>
              ))
            ) : (
              <Subtitle>Открытых задач нет</Subtitle>
            )}
          </Card>

          <Card>
            <Title>Не сделано на прошлой неделе</Title>
            {prevOpen.length ? (
              prevOpen.map((t) => (
                <Subtitle key={t.id}>
                  {weekdayName(t.date, true)} {formatShortDate(t.date)} · {t.title}
                </Subtitle>
              ))
            ) : (
              <Subtitle>Хвостов с прошлой недели нет</Subtitle>
            )}
          </Card>

          <Card>
            <Title>Дополнительные задачи</Title>
            <Subtitle>
              Всего {extra.total} · готово {extra.done} · осталось {extra.leftover} · просрочено {extra.overdue} · {extra.percent}%
            </Subtitle>
            <Subtitle>
              Невыполненные: высокая {extra.byPriority.high} · средняя {extra.byPriority.medium} · низкая {extra.byPriority.low}
            </Subtitle>
            {db.backlog.length ? (
              db.backlog.map((b) => {
                const overdue = b.status === "open" && b.dueDate && b.dueDate < today;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() =>
                      update((d) => {
                        const x = d.backlog.find((i) => i.id === b.id);
                        if (x) x.status = x.status === "done" ? "open" : "done";
                      })
                    }
                    onLongPress={() => router.push({ pathname: "/task-form", params: { id: b.id, backlog: "1" } })}
                  >
                    <Body>
                      {b.status === "done" ? "☑" : "☐"} {b.title} · {b.priority === "high" ? "высокая" : b.priority === "low" ? "низкая" : "средняя"}
                      {b.dueDate ? ` · ${formatShortDate(b.dueDate)}` : ""}
                      {overdue ? " · просрочено" : ""}
                    </Body>
                  </Pressable>
                );
              })
            ) : (
              <EmptyState title="Список дополнительных задач пуст" action="Добавить" onAction={() => router.push({ pathname: "/task-form", params: { backlog: "1" } })} />
            )}
            {db.backlog.length ? <GhostButton label="Добавить" onPress={() => router.push({ pathname: "/task-form", params: { backlog: "1" } })} /> : null}
          </Card>

          <PrimaryButton label="Обзор недели" onPress={() => router.push({ pathname: "/week-review", params: { weekId: week.id } })} />
          <GhostButton label="Перенести невыполненное на следующую неделю" onPress={carry} />
        </>
      )}

      <Card>
        <Title>Итоги и архив недель</Title>
        <Subtitle>
          Недель в архиве: {summary.weeks} · средний % {summary.averagePercent} · лучшая {summary.bestPercent} · худшая {summary.worstPercent}
        </Subtitle>
        <Subtitle>
          Целей достигнуто: {summary.goalsHit}
          {summary.averageRating != null ? ` · средняя оценка ${summary.averageRating}` : ""}
        </Subtitle>
        {archive.length ? (
          [...archive].reverse().map(({ week: w, stats: s }) => (
            <Pressable key={w.id} onPress={() => setCursor(w.startDate)} style={{ minHeight: 44, justifyContent: "center" }}>
              <Subtitle>
                {formatShortDate(w.startDate)} · {w.goal || "без цели"} · {s.done} из {s.total} · {s.percent}%
                {w.review.rating ? ` · оценка ${w.review.rating}` : ""}
                {w.goalReached ? " · цель ✓" : ""}
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

function TaskLine({
  task,
  dbCategories,
  color,
  gold,
  onPress,
  onLongPress,
}: {
  task: Task;
  dbCategories: { id: string; name: string; color: string }[];
  color: string;
  gold: string;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const cat = dbCategories.find((x) => x.id === task.categoryId);
  const parts = splitTitleTag(task.title);
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={{ minHeight: 48, justifyContent: "center" }}>
      <Text style={{ color, fontSize: 16 }}>
        {task.status === "done" ? "☑ " : "☐ "}
        {task.isBig ? "★ " : ""}
        {parts.text}
        {parts.tag ? <Text style={{ color: cat?.color ?? gold }}> #{parts.tag}</Text> : null}
      </Text>
      {cat && !parts.tag ? <Text style={{ color: cat.color }}>{cat.name}</Text> : null}
    </Pressable>
  );
}
