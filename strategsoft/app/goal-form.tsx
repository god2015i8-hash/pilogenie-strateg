import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, View } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, GhostButton, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import { startOfWeek, todayISO } from "@/src/lib/dates";
import type { GoalSphere, GoalStatus } from "@/src/types/models";

const SPHERES: { id: GoalSphere; title: string }[] = [
  { id: "finance", title: "Финансы" },
  { id: "health", title: "Здоровье" },
  { id: "career", title: "Карьера" },
  { id: "relationships", title: "Близкие" },
  { id: "growth", title: "Развитие" },
  { id: "experiences", title: "Впечатления" },
];

export default function GoalForm() {
  const { db, update } = useApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; sphere?: GoalSphere }>();
  const existing = db.goals.find((g) => g.id === params.id);
  const stages = db.goalStages.filter((s) => s.goalId === existing?.id);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [result, setResult] = useState(existing?.measurableResult ?? "");
  const [deadline, setDeadline] = useState(existing?.deadline ?? "");
  const [why, setWhy] = useState(existing?.why ?? "");
  const [sphere, setSphere] = useState<GoalSphere>(existing?.sphere ?? params.sphere ?? "growth");
  const [status, setStatus] = useState<GoalStatus>(existing?.status ?? "active");
  const [firstAction, setFirstAction] = useState(existing?.firstAction ?? "");
  const [obstacles, setObstacles] = useState(existing?.obstacles ?? "");
  const [ifTrigger, setIfTrigger] = useState(existing?.ifThen[0]?.ifTrigger ?? "");
  const [thenAction, setThenAction] = useState(existing?.ifThen[0]?.thenAction ?? "");
  const [stageTitle, setStageTitle] = useState("");
  const [stageDate, setStageDate] = useState("");
  const [weeklyAction, setWeeklyAction] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    if (!title.trim() || !result.trim()) return setError("Нужны название и измеримый результат");
    if (!firstAction.trim()) return setError("Укажите первое маленькое действие");
    const now = new Date().toISOString();
    const activePriorities = db.goals.filter((g) => g.id !== existing?.id && g.priorityRank != null).length;
    await update((d) => {
      const payload = {
        title: title.trim(),
        measurableResult: result.trim(),
        deadline: deadline || null,
        why,
        status,
        sphere,
        firstAction: firstAction.trim(),
        obstacles,
        ifThen: ifTrigger && thenAction ? [{ ifTrigger, thenAction }] : [],
        updatedAt: now,
        source: "manual" as const,
      };
      if (existing) {
        const g = d.goals.find((x) => x.id === existing.id);
        if (g) Object.assign(g, payload);
      } else {
        d.goals.push({
          id: createId("goal"),
          priorityRank: activePriorities < 3 ? activePriorities + 1 : null,
          createdAt: now,
          ...payload,
        });
      }
    });
    router.back();
  };

  const addStage = async () => {
    if (!existing) return setError("Сначала сохраните цель");
    if (!stageTitle.trim()) return;
    await update((d) => {
      d.goalStages.push({
        id: createId("stage"),
        goalId: existing.id,
        title: stageTitle.trim(),
        dueDate: stageDate || null,
        weeklyAction,
        done: false,
        sortOrder: d.goalStages.length,
      });
    });
    setStageTitle("");
    setWeeklyAction("");
  };

  const linkToWeek = async () => {
    if (!existing || !firstAction.trim()) return;
    const date = todayISO();
    const start = startOfWeek(date);
    const now = new Date().toISOString();
    await update((d) => {
      let week = d.weeks.find((w) => w.startDate === start);
      if (!week) {
        week = {
          id: createId("week"),
          startDate: start,
          goal: existing.title,
          weeklyBigThree: [firstAction, "", ""],
          goalReached: false,
          review: { doneSummary: "", leftover: "", blockers: "", carryNotes: "", nextWeekBigThree: ["", "", ""], rating: null },
          createdAt: now,
          updatedAt: now,
          source: "manual",
        };
        d.weeks.push(week);
      }
      d.tasks.push({
        id: createId("task"),
        weekId: week.id,
        title: firstAction.trim(),
        date,
        categoryId: null,
        dueDate: date,
        status: "open",
        note: `Связано с целью: ${existing.title}`,
        isBig: true,
        isWeeklyBig: true,
        carriedFromTaskId: null,
        goalId: existing.id,
        createdAt: now,
        updatedAt: now,
        source: "manual",
      });
    });
    Alert.alert("Связано", "Первое действие добавлено в план текущей недели.");
  };

  return (
    <Screen>
      <Title>{existing ? "Цель" : "Новая цель"}</Title>
      <Field label="Название" value={title} onChangeText={setTitle} />
      <Field label="Измеримый результат" value={result} onChangeText={setResult} />
      <Field label="Срок" value={deadline} onChangeText={setDeadline} placeholder="ГГГГ-ММ-ДД" />
      <Field label="Почему это важно" value={why} onChangeText={setWhy} multiline />
      <Field label="Первое маленькое действие" value={firstAction} onChangeText={setFirstAction} />
      <Field label="Препятствия" value={obstacles} onChangeText={setObstacles} />
      <Field label="Если (триггер)" value={ifTrigger} onChangeText={setIfTrigger} />
      <Field label="То (действие)" value={thenAction} onChangeText={setThenAction} />
      <Subtitle>Сфера</Subtitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {SPHERES.map((s) => (
          <GhostButton key={s.id} label={sphere === s.id ? `✓ ${s.title}` : s.title} onPress={() => setSphere(s.id)} />
        ))}
      </View>
      <Subtitle>Статус</Subtitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["active", "paused", "done", "dropped"] as GoalStatus[]).map((s) => (
          <GhostButton key={s} label={status === s ? `✓ ${s}` : s} onPress={() => setStatus(s)} />
        ))}
      </View>
      {error ? <Subtitle>{error}</Subtitle> : null}
      <PrimaryButton label="Сохранить" onPress={save} />
      {existing ? <GhostButton label="Связать первое действие с задачами недели" onPress={linkToWeek} /> : null}

      {existing ? (
        <>
          <Title>Этапы</Title>
          {stages.map((st) => (
            <Subtitle key={st.id}>
              {st.done ? "☑" : "☐"} {st.title} · {st.weeklyAction} · {st.dueDate ?? "без даты"}
            </Subtitle>
          ))}
          <Field label="Новый этап" value={stageTitle} onChangeText={setStageTitle} />
          <Field label="Дата этапа" value={stageDate} onChangeText={setStageDate} />
          <Field label="Недельное действие" value={weeklyAction} onChangeText={setWeeklyAction} />
          <GhostButton label="Добавить этап" onPress={addStage} />
          <PrimaryButton
            danger
            label="Удалить цель"
            onPress={() =>
              Alert.alert("Удалить цель?", "", [
                { text: "Отмена", style: "cancel" },
                {
                  text: "Удалить",
                  style: "destructive",
                  onPress: async () => {
                    await update((d) => {
                      d.goals = d.goals.filter((g) => g.id !== existing.id);
                      d.goalStages = d.goalStages.filter((s) => s.goalId !== existing.id);
                    });
                    router.back();
                  },
                },
              ])
            }
          />
        </>
      ) : null}
    </Screen>
  );
}
