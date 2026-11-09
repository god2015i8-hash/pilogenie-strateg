import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { GUIDES, GUIDE_TOPICS } from "@/src/content/guides";
import { Card, Screen, Subtitle, Title } from "@/src/ui/components";

export default function GuidesScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Title>Инструкции Strategsoft</Title>
      <Subtitle>Как пользоваться разделами приложения. Тексты написаны для Strategsoft, без чужих продуктовых названий.</Subtitle>
      {GUIDE_TOPICS.map((topic) => (
        <Card key={topic}>
          <Title>{topic}</Title>
          {GUIDES.filter((g) => g.topic === topic).map((g) => (
            <Pressable
              key={g.id}
              accessibilityRole="button"
              accessibilityLabel={g.title}
              onPress={() => router.push(`/guides/${g.id}`)}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
              <Subtitle>{g.title}</Subtitle>
            </Pressable>
          ))}
        </Card>
      ))}
    </Screen>
  );
}
