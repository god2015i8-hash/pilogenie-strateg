import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useApp } from "@/src/state/AppProvider";
import { Card, EmptyState, GhostButton, Screen, Subtitle, Title, useThemeColors } from "@/src/ui/components";
import { formatLongDate, todayISO } from "@/src/lib/dates";
import { dayProgress, dayTasks, getOrSuggestWeek, weekProgress } from "@/src/services/planService";
import { splitTitleTag } from "@/src/lib/tags";
import { todayHabitProgress } from "@/src/services/habitService";
import { monthReport } from "@/src/services/financeService";
import { formatMoney } from "@/src/lib/money";

export default function TodayScreen() {
  const { db } = useApp();
  const router = useRouter();
  const c = useThemeColors();
  const today = todayISO();
  const week = getOrSuggestWeek(db, today);
  const tasks = dayTasks(db, today);
  const big = tasks.filter((t) => t.isBig).slice(0, 3);
  const rest = tasks.filter((t) => !big.includes(t));
  const day = dayProgress(tasks);
  const habits = todayHabitProgress(db, today);
  const mood = db.moodEntries.find((e) => e.date === today);
  const finance = monthReport(db, today);
  const goal = db.goals.filter((g) => g.status === "active" && g.priorityRank != null).sort((a, b) => (a.priorityRank ?? 9) - (b.priorityRank ?? 9))[0];
  const progress = week ? weekProgress(db.tasks.filter((t) => t.weekId === week.id)) : null;

  return (
    <Screen>
      <Title>Сегодня</Title>
      <Subtitle>
        {formatLongDate(today)}
        {db.settings.demoMode ? " · демонстрационный режим" : ""}
      </Subtitle>
      <GhostButton label="Инструкция Strategsoft" onPress={() => router.push("/guides/start-strategsoft")} />
      {progress ? (
        <Subtitle>
          Неделя: {progress.done} из {progress.total} задач · {progress.percent}%
        </Subtitle>
      ) : (
        <EmptyState title="Неделя ещё не создана" action="Открыть план" onAction={() => router.push("/plan")} />
      )}

      <Pressable onPress={() => router.push("/plan")}>
        <Card>
          <Title>Главные дела</Title>
          <Subtitle>Итог дня: {day.text}</Subtitle>
          {big.length ? (
            big.map((t) => {
              const parts = splitTitleTag(t.title);
              const cat = db.taskCategories.find((x) => x.id === t.categoryId);
              return (
                <Text key={t.id} style={{ color: c.text, fontSize: 16 }}>
                  {t.status === "done" ? "☑ " : "☐ "}★ {parts.text}
                  {parts.tag ? <Text style={{ color: cat?.color ?? "#C9A227" }}> #{parts.tag}</Text> : null}
                </Text>
              );
            })
          ) : (
            <EmptyState title="Нет главных дел на сегодня" action="Добавить" onAction={() => router.push({ pathname: "/task-form", params: { date: today, big: "1" } })} />
          )}
          {rest.length ? (
            <>
              <Subtitle>Задачи</Subtitle>
              {rest.map((t) => (
                <Text key={t.id} style={{ color: c.text, fontSize: 16 }}>
                  {t.status === "done" ? "☑ " : "☐ "}
                  {t.title}
                </Text>
              ))}
            </>
          ) : null}
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push("/habits")}>
        <Card>
          <Title>Привычки</Title>
          {habits.total ? (
            <Subtitle>
              Выполнено {habits.done} из {habits.total}
            </Subtitle>
          ) : (
            <EmptyState title="Привычки ещё не заданы" action="Добавить" onAction={() => router.push("/habit-form")} />
          )}
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push("/mood")}>
        <Card>
          <Title>Состояние</Title>
          {mood ? (
            <Subtitle>Сегодня: {mood.score} из 10</Subtitle>
          ) : (
            <EmptyState title="Нет записи о состоянии" action="Добавить" onAction={() => router.push({ pathname: "/mood-form", params: { date: today } })} />
          )}
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push("/finance")}>
        <Card>
          <Title>Финансы месяца</Title>
          {finance.txs.length ? (
            <View>
              <Subtitle>Доходы {formatMoney(finance.income, db.settings.currency)}</Subtitle>
              <Subtitle>Расходы {formatMoney(finance.expense, db.settings.currency)}</Subtitle>
              <Subtitle>Разница {formatMoney(finance.difference, db.settings.currency)}</Subtitle>
            </View>
          ) : (
            <EmptyState title="Операций за месяц нет" action="Добавить" onAction={() => router.push("/tx-form")} />
          )}
        </Card>
      </Pressable>

      <Pressable onPress={() => router.push("/goals")}>
        <Card>
          <Title>Активная цель</Title>
          {goal ? (
            <View>
              <Subtitle>{goal.title}</Subtitle>
              <Subtitle>Первый шаг: {goal.firstAction || "не указан"}</Subtitle>
            </View>
          ) : (
            <EmptyState title="Нет приоритетной цели" action="Добавить" onAction={() => router.push("/goal-form")} />
          )}
        </Card>
      </Pressable>
    </Screen>
  );
}
