import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Body, Card, EmptyState, GhostButton, Screen, Subtitle, Title, useThemeColors } from "@/src/ui/components";
import { formatShortDate, monthGrid, todayISO } from "@/src/lib/dates";
import { factorAverages, weekMood, yearMood } from "@/src/services/moodService";

export default function MoodScreen() {
  const { db } = useApp();
  const router = useRouter();
  const c = useThemeColors();
  const today = todayISO();
  const [monthOffset, setMonthOffset] = useState(0);
  const ref = new Date();
  ref.setMonth(ref.getMonth() + monthOffset);
  const grid = monthGrid(ref.getFullYear(), ref.getMonth());
  const week = weekMood(db, today);
  const year = yearMood(db, String(ref.getFullYear()));
  const factors = factorAverages(year.entries);

  return (
    <Screen>
      <Title>Состояние</Title>
      <Subtitle>Это дневник наблюдений, а не диагноз и не медицинский вывод.</Subtitle>
      <GhostButton label="Инструкция раздела" onPress={() => router.push("/guides/mood-how")} />
      <GhostButton label="Запись на сегодня" onPress={() => router.push({ pathname: "/mood-form", params: { date: today } })} />
      <GhostButton label="Разбор трудного момента" onPress={() => router.push("/moment-form")} />

      <Card>
        <Title>Неделя</Title>
        <Subtitle>Среднее: {week.average ?? "нет данных"}</Subtitle>
        {week.entries.map((e) => (
          <Pressable key={e.id} onPress={() => router.push({ pathname: "/mood-form", params: { id: e.id } })}>
            <Body>
              {formatShortDate(e.date)} · {e.score}/10 {e.emotions.join(", ")}
            </Body>
          </Pressable>
        ))}
        {!week.entries.length ? <EmptyState title="Нет записей за неделю" action="Добавить" onAction={() => router.push("/mood-form")} /> : null}
      </Card>

      <Card>
        <Title>
          Календарь · {ref.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
        </Title>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {grid.map((iso, i) => {
            const e = iso ? db.moodEntries.find((x) => x.date === iso) : undefined;
            return (
              <Pressable
                key={i}
                disabled={!iso}
                onPress={() => iso && router.push({ pathname: "/mood-form", params: { date: iso, id: e?.id } })}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: !iso ? "transparent" : e ? `rgba(31,122,106,${e.score / 10})` : c.empty,
                }}
              >
                <Text style={{ color: c.text, fontSize: 12 }}>{iso ? iso.slice(8) : ""}</Text>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <GhostButton label="Пред. месяц" onPress={() => setMonthOffset((v) => v - 1)} />
          <GhostButton label="След. месяц" onPress={() => setMonthOffset((v) => v + 1)} />
        </View>
      </Card>

      <Card>
        <Title>Год {ref.getFullYear()}</Title>
        <Subtitle>Среднее состояние: {year.average ?? "нет данных"}</Subtitle>
        <Subtitle>Связь с факторами и занятиями — только наблюдаемые средние:</Subtitle>
        {factors.length ? (
          factors.map((f) => (
            <Subtitle key={f.name}>
              {f.name}: среднее {f.average} · {f.count} дн.
            </Subtitle>
          ))
        ) : (
          <Subtitle>Недостаточно отметок, чтобы показать закономерности.</Subtitle>
        )}
      </Card>

      <Card>
        <Title>Трудные моменты</Title>
        {db.difficultMoments.length ? (
          db.difficultMoments.map((m) => (
            <Body key={m.id}>
              {formatShortDate(m.date)} · {m.emotion}: {m.whatHelped}
            </Body>
          ))
        ) : (
          <EmptyState title="Форма разбора пока пуста" action="Добавить" onAction={() => router.push("/moment-form")} />
        )}
      </Card>
    </Screen>
  );
}
