import { useLocalSearchParams } from "expo-router";
import { GUIDES } from "@/src/content/guides";
import { Body, Card, Screen, Subtitle, Title } from "@/src/ui/components";

export default function GuideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const guide = GUIDES.find((g) => g.id === id);
  if (!guide) {
    return (
      <Screen>
        <Title>Материал не найден</Title>
      </Screen>
    );
  }
  return (
    <Screen>
      <Title>{guide.title}</Title>
      <Subtitle>{guide.topic}</Subtitle>
      {guide.body.map((p) => (
        <Body key={p}>{p}</Body>
      ))}
      {guide.exercise ? (
        <Card>
          <Title>{guide.exercise.title}</Title>
          {guide.exercise.steps.map((s, i) => (
            <Body key={s}>
              {i + 1}. {s}
            </Body>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
