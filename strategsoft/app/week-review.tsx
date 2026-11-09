import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, GhostButton, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { weekProgress, weekTasks } from "@/src/services/planService";

export default function WeekReviewScreen() {
  const { db, update } = useApp();
  const router = useRouter();
  const { weekId, mode } = useLocalSearchParams<{ weekId: string; mode?: string }>();
  const week = db.weeks.find((w) => w.id === weekId);
  const tasks = week ? weekTasks(db, week.id) : [];
  const stats = weekProgress(tasks);
  const [goal, setGoal] = useState(week?.goal ?? "");
  const [a, setA] = useState(week?.weeklyBigThree[0] ?? "");
  const [b, setB] = useState(week?.weeklyBigThree[1] ?? "");
  const [c, setC] = useState(week?.weeklyBigThree[2] ?? "");
  const [doneSummary, setDone] = useState(week?.review.doneSummary ?? "");
  const [leftover, setLeftover] = useState(week?.review.leftover ?? "");
  const [blockers, setBlockers] = useState(week?.review.blockers ?? "");
  const [carryNotes, setCarry] = useState(week?.review.carryNotes ?? "");
  const [n1, setN1] = useState(week?.review.nextWeekBigThree[0] ?? "");
  const [n2, setN2] = useState(week?.review.nextWeekBigThree[1] ?? "");
  const [n3, setN3] = useState(week?.review.nextWeekBigThree[2] ?? "");
  const [rating, setRating] = useState(String(week?.review.rating ?? ""));

  if (!week) {
    return (
      <Screen>
        <Title>Неделя не найдена</Title>
      </Screen>
    );
  }

  const save = async () => {
    await update((d) => {
      const w = d.weeks.find((x) => x.id === week.id);
      if (!w) return;
      w.goal = goal;
      w.weeklyBigThree = [a, b, c];
      w.review = {
        doneSummary,
        leftover,
        blockers,
        carryNotes,
        nextWeekBigThree: [n1, n2, n3],
        rating: rating ? Number(rating) : null,
      };
      w.updatedAt = new Date().toISOString();
    });
    router.back();
  };

  return (
    <Screen>
      <Title>{mode === "setup" ? "Цель недели" : "Обзор недели"}</Title>
      <Subtitle>
        Сделано {stats.done} из {stats.total}. Осталось {stats.leftover}.
      </Subtitle>
      <Field label="Цель недели" value={goal} onChangeText={setGoal} />
      <Field label="Главное дело недели 1" value={a} onChangeText={setA} />
      <Field label="Главное дело недели 2" value={b} onChangeText={setB} />
      <Field label="Главное дело недели 3" value={c} onChangeText={setC} />
      {mode !== "setup" ? (
        <>
          <Field label="Что выполнено" value={doneSummary} onChangeText={setDone} multiline />
          <Field label="Что осталось" value={leftover} onChangeText={setLeftover} multiline />
          <Field label="Что мешало" value={blockers} onChangeText={setBlockers} multiline />
          <Field label="Что перенести" value={carryNotes} onChangeText={setCarry} multiline />
          <Field label="Три дела на следующую неделю — 1" value={n1} onChangeText={setN1} />
          <Field label="2" value={n2} onChangeText={setN2} />
          <Field label="3" value={n3} onChangeText={setN3} />
          <Field label="Оценка недели 1–5" value={rating} onChangeText={setRating} keyboardType="number-pad" />
        </>
      ) : null}
      <GhostButton
        label={week.goalReached ? "Цель недели отмечена достигнутой" : "Отметить цель недели достигнутой"}
        onPress={() =>
          update((d) => {
            const w = d.weeks.find((x) => x.id === week.id);
            if (w) w.goalReached = !w.goalReached;
          })
        }
      />
      <PrimaryButton label="Сохранить" onPress={save} />
    </Screen>
  );
}
