import { useRouter } from "expo-router";
import { Pressable } from "react-native";
import { GUIDES } from "@/src/content/guides";
import { Card, Screen, Subtitle, Title } from "@/src/ui/components";

export default function GuidesScreen() {
  const router = useRouter();
  return (
    <Screen>
      <Title>Руководства</Title>
      <Subtitle>Короткие инструкции Strategsoft. Тексты переписаны для приложения, без исходных продуктовых брендов.</Subtitle>
      {GUIDES.map((g) => (
        <Pressable key={g.id} onPress={() => router.push(`/guides/${g.id}`)}>
          <Card>
            <Title>{g.title}</Title>
            <Subtitle>{g.topic}</Subtitle>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
