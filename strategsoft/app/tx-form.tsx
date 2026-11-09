import { useRouter } from "expo-router";
import { View } from "react-native";
import { useState } from "react";
import { useApp } from "@/src/state/AppProvider";
import { Field, GhostButton, PrimaryButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { createId } from "@/src/lib/id";
import { todayISO } from "@/src/lib/dates";
import { parseAmount } from "@/src/lib/money";
import { validateTransaction } from "@/src/services/financeService";
import type { TransactionType } from "@/src/types/models";

const TYPES: { id: TransactionType; label: string }[] = [
  { id: "expense", label: "Расход" },
  { id: "income", label: "Доход" },
  { id: "transfer", label: "Перевод" },
  { id: "debt_payment", label: "Платёж по долгу" },
  { id: "savings_in", label: "Взнос в накопления" },
  { id: "savings_out", label: "Вывод из накоплений" },
  { id: "loan_given", label: "Выданный долг" },
  { id: "loan_returned", label: "Возврат вам" },
];

export default function TxForm() {
  const { db, update } = useApp();
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [accountId, setAccountId] = useState(db.accounts[0]?.id ?? "");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [debtId, setDebtId] = useState("");
  const [savingsId, setSavingsId] = useState("");
  const [borrowerId, setBorrowerId] = useState("");
  const [goalId, setGoalId] = useState("");
  const [comment, setComment] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  const save = async () => {
    const parsed = parseAmount(amount);
    const interestAmount = interest ? parseAmount(interest) : 0;
    if (parsed == null) {
      setErrors(["Сумма: положительное число"]);
      return;
    }
    if (interestAmount == null) {
      setErrors(["Проценты: неотрицательное число"]);
      return;
    }
    const draft = {
      date,
      type,
      amount: parsed,
      interestAmount,
      accountId,
      toAccountId: toAccountId || null,
      categoryId: categoryId || null,
      goalId: goalId || null,
      debtId: debtId || null,
      savingsId: savingsId || null,
      borrowerId: borrowerId || null,
      comment,
    };
    const issues = validateTransaction(db, draft);
    if (issues.length) {
      setErrors(issues.map((i) => i.message));
      return;
    }
    const now = new Date().toISOString();
    await update((d) => {
      d.transactions.push({ id: createId("tx"), ...draft, createdAt: now, updatedAt: now, source: "manual" });
    });
    router.back();
  };

  const cats = db.financeCategories.filter((c) => (type === "income" ? c.kind === "income" : c.kind === "expense"));

  return (
    <Screen>
      <Title>Операция</Title>
      <Subtitle>Сумма всегда положительная. Влияние на баланс задаёт тип.</Subtitle>
      <Field label="Дата" value={date} onChangeText={setDate} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {TYPES.map((t) => (
          <GhostButton key={t.id} label={type === t.id ? `✓ ${t.label}` : t.label} onPress={() => setType(t.id)} />
        ))}
      </View>
      <Field label="Сумма" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      {type === "debt_payment" ? <Field label="Проценты (учитываются как расход)" value={interest} onChangeText={setInterest} keyboardType="decimal-pad" /> : null}
      <Subtitle>Счёт</Subtitle>
      {db.accounts.filter((a) => !a.archived).map((a) => (
        <GhostButton key={a.id} label={accountId === a.id ? `✓ ${a.name}` : a.name} onPress={() => setAccountId(a.id)} />
      ))}
      {type === "transfer" ? (
        <>
          <Subtitle>Куда</Subtitle>
          {db.accounts.filter((a) => !a.archived).map((a) => (
            <GhostButton key={a.id} label={toAccountId === a.id ? `✓ ${a.name}` : a.name} onPress={() => setToAccountId(a.id)} />
          ))}
        </>
      ) : null}
      {(type === "expense" || type === "income") && (
        <>
          <Subtitle>Категория</Subtitle>
          {cats.map((c) => (
            <GhostButton key={c.id} label={categoryId === c.id ? `✓ ${c.name}` : c.name} onPress={() => setCategoryId(c.id)} />
          ))}
        </>
      )}
      {type === "debt_payment" &&
        db.debts.map((d) => <GhostButton key={d.id} label={debtId === d.id ? `✓ ${d.name}` : d.name} onPress={() => setDebtId(d.id)} />)}
      {(type === "savings_in" || type === "savings_out") &&
        db.savings.map((s) => <GhostButton key={s.id} label={savingsId === s.id ? `✓ ${s.name}` : s.name} onPress={() => setSavingsId(s.id)} />)}
      {(type === "loan_given" || type === "loan_returned") &&
        db.borrowers.map((b) => <GhostButton key={b.id} label={borrowerId === b.id ? `✓ ${b.name}` : b.name} onPress={() => setBorrowerId(b.id)} />)}
      <Subtitle>Связанная цель (необязательно)</Subtitle>
      {db.goals.map((g) => (
        <GhostButton key={g.id} label={goalId === g.id ? `✓ ${g.title}` : g.title} onPress={() => setGoalId(g.id)} />
      ))}
      <Field label="Комментарий" value={comment} onChangeText={setComment} />
      {errors.map((e) => (
        <Subtitle key={e}>{e}</Subtitle>
      ))}
      <PrimaryButton label="Сохранить" onPress={save} />
    </Screen>
  );
}
