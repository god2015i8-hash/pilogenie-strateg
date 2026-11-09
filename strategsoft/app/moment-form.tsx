import { useRouter } from "expo-router";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import { todayISO } from "@/src/lib/dates";

export default function MomentForm() {
  const { update } = useApp();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [situation, setSituation] = useState("");
  const [emotion, setEmotion] = useState("");
  const [thought, setThought] = useState("");
  const [whatHelped, setWhatHelped] = useState("");
  const [error, setError] = useState("");

  const save = async () => {
    if (!situation.trim() || !emotion.trim()) {
      setError("Заполните ситуацию и эмоцию");
      return;
    }
    const now = new Date().toISOString();
    await update((d) => {
      d.difficultMoments.unshift({
        id: createId("moment"),
        date,
        situation: situation.trim(),
        emotion: emotion.trim(),
        thought: thought.trim(),
        whatHelped: whatHelped.trim(),
        createdAt: now,
        updatedAt: now,
        source: "manual",
      });
    });
    router.back();
  };

  return (
    <Screen>
      <Title>Трудный момент</Title>
      <Subtitle>Форма для разбора. Без диагнозов и советов «что с вами».</Subtitle>
      <Field label="Дата" value={date} onChangeText={setDate} />
      <Field label="Ситуация" value={situation} onChangeText={setSituation} multiline />
      <Field label="Эмоция" value={emotion} onChangeText={setEmotion} />
      <Field label="Мысль" value={thought} onChangeText={setThought} multiline />
      <Field label="Что помогло" value={whatHelped} onChangeText={setWhatHelped} multiline />
      {error ? <Subtitle>{error}</Subtitle> : null}
      <PrimaryButton label="Сохранить" onPress={save} />
    </Screen>
  );
}
