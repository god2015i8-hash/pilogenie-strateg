import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { GUIDES } from "@/src/content/guides";
import { Body, Card, GhostButton, Screen, Subtitle, Title } from "@/src/ui/components";

export default function GuideDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
      <Subtitle>Strategsoft · {guide.topic}</Subtitle>
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
      {guide.href ? <GhostButton label="Открыть раздел" onPress={() => router.push(guide.href as Href)} /> : null}
    </Screen>
  );
}
