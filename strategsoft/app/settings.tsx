import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Card, Field, GhostButton, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import type { CurrencyCode, ThemePreference } from "@/src/types/models";

const CURRENCIES: CurrencyCode[] = ["RUB", "USD", "EUR", "KZT", "BYN", "UAH"];

export default function SettingsScreen() {
  const { db, update, loadDemo, resetAll } = useApp();
  const router = useRouter();
  const [name, setName] = useState(db.settings.displayName);
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#1F7A6A");
  const [accountName, setAccountName] = useState("");
  const [accountStart, setAccountStart] = useState("0");
  const [debtName, setDebtName] = useState("");
  const [debtPrincipal, setDebtPrincipal] = useState("");
  const [debtRate, setDebtRate] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saveTarget, setSaveTarget] = useState("");
  const [borrower, setBorrower] = useState("");

  const setTheme = (theme: ThemePreference) => update((d) => { d.settings.theme = theme; });
  const setCurrency = (currency: CurrencyCode) => update((d) => { d.settings.currency = currency; });

  return (
    <Screen>
      <Title>Настройки</Title>
      <Field
        label="Имя"
        value={name}
        onChangeText={setName}
        onEndEditing={() => update((d) => { d.settings.displayName = name; })}
      />
      <Subtitle>Тема</Subtitle>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {(["system", "light", "dark"] as ThemePreference[]).map((t) => (
          <GhostButton key={t} label={db.settings.theme === t ? `✓ ${t}` : t} onPress={() => setTheme(t)} />
        ))}
      </View>
      <Subtitle>Валюта</Subtitle>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {CURRENCIES.map((cur) => (
          <GhostButton key={cur} label={db.settings.currency === cur ? `✓ ${cur}` : cur} onPress={() => setCurrency(cur)} />
        ))}
      </View>
      <Subtitle>Неделя всегда начинается в понедельник, локаль ru-RU.</Subtitle>

      <Card>
        <Title>Категории задач</Title>
        {db.taskCategories.map((cat) => (
          <GhostButton
            key={cat.id}
            label={`${cat.name}`}
            onPress={() =>
              Alert.alert(cat.name, "Удалить категорию?", [
                { text: "Отмена", style: "cancel" },
                { text: "Удалить", style: "destructive", onPress: () => update((d) => { d.taskCategories = d.taskCategories.filter((x) => x.id !== cat.id); }) },
              ])
            }
          />
        ))}
        <Field label="Новая категория" value={catName} onChangeText={setCatName} />
        <Field label="Цвет" value={catColor} onChangeText={setCatColor} />
        <GhostButton
          label="Добавить категорию"
          onPress={() => {
            if (!catName.trim()) return;
            update((d) => {
              d.taskCategories.push({ id: createId("cat"), name: catName.trim(), color: catColor });
            });
            setCatName("");
          }}
        />
      </Card>

      <Card>
        <Title>Счета</Title>
        {db.accounts.map((a) => (
          <Field
            key={a.id}
            label={`${a.name}: фактический остаток`}
            value={a.actualBalance == null ? "" : String(a.actualBalance)}
            onChangeText={(v) =>
              update((d) => {
                const acc = d.accounts.find((x) => x.id === a.id);
                if (!acc) return;
                acc.actualBalance = v.trim() === "" ? null : Number(v.replace(",", ".")) || 0;
              })
            }
            keyboardType="decimal-pad"
          />
        ))}
        <Field label="Название счёта" value={accountName} onChangeText={setAccountName} />
        <Field label="Стартовый остаток" value={accountStart} onChangeText={setAccountStart} keyboardType="decimal-pad" />
        <GhostButton
          label="Добавить счёт"
          onPress={() => {
            if (!accountName.trim()) return;
            update((d) => {
              d.accounts.push({
                id: createId("acc"),
                name: accountName.trim(),
                startingBalance: Number(accountStart.replace(",", ".")) || 0,
                actualBalance: null,
                archived: false,
              });
            });
            setAccountName("");
          }}
        />
      </Card>

      <Card>
        <Title>Долги</Title>
        <Field label="Название" value={debtName} onChangeText={setDebtName} />
        <Field label="Основной долг" value={debtPrincipal} onChangeText={setDebtPrincipal} keyboardType="decimal-pad" />
        <Field label="Ставка %" value={debtRate} onChangeText={setDebtRate} keyboardType="decimal-pad" />
        <GhostButton
          label="Добавить долг"
          onPress={() => {
            if (!debtName.trim()) return;
            update((d) => {
              d.debts.push({
                id: createId("debt"),
                name: debtName.trim(),
                principal: Number(debtPrincipal.replace(",", ".")) || 0,
                ratePercent: Number(debtRate.replace(",", ".")) || 0,
                dueDate: null,
                archived: false,
              });
            });
            setDebtName("");
          }}
        />
      </Card>

      <Card>
        <Title>Накопления и должники</Title>
        <Field label="Цель накопления" value={saveName} onChangeText={setSaveName} />
        <Field label="Сумма цели" value={saveTarget} onChangeText={setSaveTarget} keyboardType="decimal-pad" />
        <GhostButton
          label="Добавить накопление"
          onPress={() => {
            if (!saveName.trim()) return;
            update((d) => {
              d.savings.push({
                id: createId("sav"),
                name: saveName.trim(),
                targetAmount: Number(saveTarget.replace(",", ".")) || 0,
                dueDate: null,
                linkedGoalId: null,
                archived: false,
              });
            });
            setSaveName("");
          }}
        />
        <Field label="Должник" value={borrower} onChangeText={setBorrower} />
        <GhostButton
          label="Добавить должника"
          onPress={() => {
            if (!borrower.trim()) return;
            update((d) => {
              d.borrowers.push({ id: createId("bor"), name: borrower.trim(), note: "" });
            });
            setBorrower("");
          }}
        />
      </Card>

      <GhostButton label="Цели" onPress={() => router.push("/goals")} />
      <GhostButton label="Руководства" onPress={() => router.push("/guides")} />
      <GhostButton label="Импорт данных" onPress={() => router.push("/import")} />
      <PrimaryButton
        label={db.settings.demoMode ? "Демо-режим включён (перезагрузить демо)" : "Включить демонстрационный режим"}
        onPress={() =>
          Alert.alert("Демо-данные", "Будут загружены явно помеченные демонстрационные записи и заменят текущие данные.", [
            { text: "Отмена", style: "cancel" },
            { text: "Загрузить демо", onPress: loadDemo },
          ])
        }
      />
      <PrimaryButton
        danger
        label="Сбросить все данные"
        onPress={() =>
          Alert.alert("Удалить все данные?", "Локальная база будет очищена.", [
            { text: "Отмена", style: "cancel" },
            { text: "Сбросить", style: "destructive", onPress: resetAll },
          ])
        }
      />
    </Screen>
  );
}
