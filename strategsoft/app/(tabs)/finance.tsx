import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useApp } from "@/src/state/AppProvider";
import { Card, EmptyState, GhostButton, Screen, Subtitle, Title } from "@/src/ui/components";
import { formatShortDate, todayISO } from "@/src/lib/dates";
import { formatMoney } from "@/src/lib/money";
import {
  borrowerBalance,
  calculatedBalance,
  debtRemaining,
  monthReport,
  savingsBalance,
  yearReport,
} from "@/src/services/financeService";

const TYPE_LABEL: Record<string, string> = {
  expense: "Расход",
  income: "Доход",
  transfer: "Перевод",
  debt_payment: "Платёж по долгу",
  savings_in: "Взнос в накопления",
  savings_out: "Вывод из накоплений",
  loan_given: "Выданный долг",
  loan_returned: "Возврат долга вам",
};

export default function FinanceScreen() {
  const { db } = useApp();
  const router = useRouter();
  const today = todayISO();
  const cur = db.settings.currency;
  const month = monthReport(db, today);
  const year = yearReport(db, today.slice(0, 4));

  return (
    <Screen>
      <Title>Финансы</Title>
      <GhostButton label="Новая операция" onPress={() => router.push("/tx-form")} />
      <GhostButton label="Импорт CSV/XLSX" onPress={() => router.push("/import")} />

      <Card>
        <Title>Месяц</Title>
        <Subtitle>Доходы {formatMoney(month.income, cur)}</Subtitle>
        <Subtitle>Расходы {formatMoney(month.expense, cur)}</Subtitle>
        <Subtitle>Разница {formatMoney(month.difference, cur)}</Subtitle>
        <Subtitle>Норма сбережений {month.savingRate == null ? "—" : `${month.savingRate}%`}</Subtitle>
        {month.limits.map((l) => (
          <Subtitle key={l.category.id}>
            {l.category.name}: {formatMoney(l.spent, cur)}
            {l.limit != null ? ` из ${formatMoney(l.limit, cur)}` : ""}
            {l.over ? " · лимит превышен" : ""}
          </Subtitle>
        ))}
      </Card>

      <Card>
        <Title>Счета</Title>
        {db.accounts.filter((a) => !a.archived).map((a) => {
          const calc = calculatedBalance(a, db.transactions);
          return (
            <View key={a.id}>
              <Subtitle>{a.name}</Subtitle>
              <Subtitle>Расчётный {formatMoney(calc, cur)}</Subtitle>
              <Subtitle>Фактический {a.actualBalance == null ? "не задан" : formatMoney(a.actualBalance, cur)}</Subtitle>
            </View>
          );
        })}
      </Card>

      <Card>
        <Title>Долги</Title>
        {db.debts.filter((d) => !d.archived).length ? (
          db.debts
            .filter((d) => !d.archived)
            .map((d) => (
              <Subtitle key={d.id}>
                {d.name}: остаток {formatMoney(debtRemaining(db, d.id), cur)} из {formatMoney(d.principal, cur)} · {d.ratePercent}%
                {d.dueDate ? ` · до ${formatShortDate(d.dueDate)}` : ""}
              </Subtitle>
            ))
        ) : (
          <Subtitle>Долгов нет. Добавьте в настройках.</Subtitle>
        )}
      </Card>

      <Card>
        <Title>Накопления</Title>
        {db.savings.filter((s) => !s.archived).length ? (
          db.savings
            .filter((s) => !s.archived)
            .map((s) => {
              const bal = savingsBalance(db, s.id);
              const pct = s.targetAmount ? Math.round((bal / s.targetAmount) * 100) : 0;
              return (
                <Subtitle key={s.id}>
                  {s.name}: {formatMoney(bal, cur)} / {formatMoney(s.targetAmount, cur)} ({pct}%)
                </Subtitle>
              );
            })
        ) : (
          <Subtitle>Целей накоплений нет.</Subtitle>
        )}
      </Card>

      <Card>
        <Title>Должники</Title>
        {db.borrowers.length ? (
          db.borrowers.map((b) => (
            <Subtitle key={b.id}>
              {b.name}: {formatMoney(borrowerBalance(db, b.id), cur)}
            </Subtitle>
          ))
        ) : (
          <Subtitle>Список пуст</Subtitle>
        )}
      </Card>

      <Card>
        <Title>Журнал</Title>
        {db.transactions.length ? (
          [...db.transactions]
            .sort((a, b) => b.date.localeCompare(a.date))
            .slice(0, 30)
            .map((t) => (
              <Text key={t.id} style={{ marginBottom: 6 }}>
                {formatShortDate(t.date)} · {TYPE_LABEL[t.type]} · {formatMoney(t.amount, cur)}
                {t.interestAmount ? ` + % ${formatMoney(t.interestAmount, cur)}` : ""} · {t.comment}
                {t.source === "import" ? " · импорт" : ""}
              </Text>
            ))
        ) : (
          <EmptyState title="Журнал операций пуст" action="Добавить" onAction={() => router.push("/tx-form")} />
        )}
      </Card>

      <Card>
        <Title>Год {today.slice(0, 4)}</Title>
        {year.months.map((m) => (
          <Subtitle key={m.month}>
            {String(m.month).padStart(2, "0")}: доходы {formatMoney(m.income, cur)}, расходы {formatMoney(m.expense, cur)}, чистыми {formatMoney(m.difference, cur)}
          </Subtitle>
        ))}
        <Subtitle>Чистый капитал {formatMoney(year.netWorth, cur)}</Subtitle>
      </Card>
    </Screen>
  );
}
