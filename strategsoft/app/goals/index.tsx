import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { useApp } from "@/src/state/AppProvider";
import { Body, Card, EmptyState, GhostButton, Screen, Subtitle, Title } from "@/src/ui/components";
import type { GoalSphere } from "@/src/types/models";

const SPHERES: { id: GoalSphere; title: string }[] = [
  { id: "finance", title: "Финансы" },
  { id: "health", title: "Здоровье" },
  { id: "career", title: "Карьера" },
  { id: "relationships", title: "Близкие" },
  { id: "growth", title: "Развитие" },
  { id: "experiences", title: "Впечатления" },
];

const STATUS: Record<string, string> = {
  active: "в работе",
  paused: "пауза",
  done: "достигнута",
  dropped: "снята",
};

export default function GoalsScreen() {
  const { db } = useApp();
  const router = useRouter();
  const priorities = db.goals.filter((g) => g.priorityRank != null).sort((a, b) => (a.priorityRank ?? 9) - (b.priorityRank ?? 9));

  return (
    <Screen>
      <Title>Цели</Title>
      <GhostButton label="Новая цель" onPress={() => router.push("/goal-form")} />
      <GhostButton label="Инструкция раздела" onPress={() => router.push("/guides/goals-how")} />
      <GhostButton label="Все инструкции" onPress={() => router.push("/guides")} />

      <Card>
        <Title>Приоритеты (до трёх)</Title>
        {priorities.length ? (
          priorities.map((g) => (
            <Pressable key={g.id} onPress={() => router.push({ pathname: "/goal-form", params: { id: g.id } })}>
              <Body>
                {g.priorityRank}. {g.title} — {g.firstAction || "нет первого действия"}
              </Body>
            </Pressable>
          ))
        ) : (
          <EmptyState title="Нет приоритетных целей" action="Добавить" onAction={() => router.push("/goal-form")} />
        )}
      </Card>

      {SPHERES.map((sphere) => {
        const items = db.goals.filter((g) => g.sphere === sphere.id);
        return (
          <Card key={sphere.id}>
            <Title>{sphere.title}</Title>
            {items.length ? (
              items.map((g) => (
                <Pressable key={g.id} onPress={() => router.push({ pathname: "/goal-form", params: { id: g.id } })}>
                  <Body>{g.title}</Body>
                  <Subtitle>
                    {g.measurableResult} · {STATUS[g.status]}
                  </Subtitle>
                </Pressable>
              ))
            ) : (
              <EmptyState title="В этой сфере пока пусто" action="Добавить" onAction={() => router.push({ pathname: "/goal-form", params: { sphere: sphere.id } })} />
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
