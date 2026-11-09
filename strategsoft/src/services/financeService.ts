import { endOfMonth, inRange, startOfMonth } from "../lib/dates";
import type { Account, AppDatabase, ISODate, Transaction, TransactionType } from "../types/models";

const NON_EXPENSE: TransactionType[] = [
  "transfer",
  "debt_payment",
  "savings_in",
  "savings_out",
  "loan_given",
  "loan_returned",
  "income",
];

export interface TxIssue {
  field: string;
  message: string;
}

export function validateTransaction(
  db: AppDatabase,
  tx: Omit<Transaction, "id" | "createdAt" | "updatedAt" | "source">
): TxIssue[] {
  const issues: TxIssue[] = [];
  if (!tx.date) issues.push({ field: "date", message: "Укажите дату" });
  if (!(tx.amount > 0)) issues.push({ field: "amount", message: "Сумма должна быть положительным числом" });
  if (tx.interestAmount < 0) issues.push({ field: "interestAmount", message: "Проценты не могут быть отрицательными" });
  const account = db.accounts.find((a) => a.id === tx.accountId && !a.archived);
  if (!account) issues.push({ field: "accountId", message: "Выберите счёт" });
  if (tx.type === "transfer") {
    if (!tx.toAccountId) issues.push({ field: "toAccountId", message: "Для перевода укажите счёт назначения" });
    if (tx.toAccountId === tx.accountId) issues.push({ field: "toAccountId", message: "Счета перевода должны отличаться" });
  }
  if (tx.type === "expense" || tx.type === "income") {
    if (!tx.categoryId) issues.push({ field: "categoryId", message: "Выберите категорию" });
  }
  if (tx.type === "debt_payment" && !tx.debtId) issues.push({ field: "debtId", message: "Выберите долг" });
  if ((tx.type === "savings_in" || tx.type === "savings_out") && !tx.savingsId) {
    issues.push({ field: "savingsId", message: "Выберите цель накоплений" });
  }
  if ((tx.type === "loan_given" || tx.type === "loan_returned") && !tx.borrowerId) {
    issues.push({ field: "borrowerId", message: "Укажите должника" });
  }
  return issues;
}

export function isExpense(tx: Transaction): boolean {
  if (tx.type === "expense") return true;
  if (tx.type === "debt_payment" && tx.interestAmount > 0) return true;
  return false;
}

export function expenseAmount(tx: Transaction): number {
  if (tx.type === "expense") return tx.amount;
  if (tx.type === "debt_payment") return tx.interestAmount;
  return 0;
}

export function incomeAmount(tx: Transaction): number {
  return tx.type === "income" ? tx.amount : 0;
}

export function accountDelta(tx: Transaction, accountId: string): number {
  if (tx.type === "income") return tx.accountId === accountId ? tx.amount : 0;
  if (tx.type === "expense") return tx.accountId === accountId ? -tx.amount : 0;
  if (tx.type === "transfer") {
    if (tx.accountId === accountId) return -tx.amount;
    if (tx.toAccountId === accountId) return tx.amount;
    return 0;
  }
  if (tx.type === "debt_payment") {
    return tx.accountId === accountId ? -(tx.amount + tx.interestAmount) : 0;
  }
  if (tx.type === "savings_in") return tx.accountId === accountId ? -tx.amount : 0;
  if (tx.type === "savings_out") return tx.accountId === accountId ? tx.amount : 0;
  if (tx.type === "loan_given") return tx.accountId === accountId ? -tx.amount : 0;
  if (tx.type === "loan_returned") return tx.accountId === accountId ? tx.amount : 0;
  return 0;
}

export function calculatedBalance(account: Account, transactions: Transaction[]): number {
  return transactions.reduce((sum, tx) => sum + accountDelta(tx, account.id), account.startingBalance);
}

export function monthReport(db: AppDatabase, date: ISODate) {
  const from = startOfMonth(date);
  const to = endOfMonth(date);
  const txs = db.transactions.filter((t) => inRange(t.date, from, to));
  const income = txs.reduce((s, t) => s + incomeAmount(t), 0);
  const expense = txs.reduce((s, t) => s + expenseAmount(t), 0);
  const difference = income - expense;
  const savingRate = income > 0 ? Math.round((difference / income) * 100) : null;
  const limits = db.financeCategories
    .filter((c) => c.kind === "expense")
    .map((c) => {
      const spent = txs.filter((t) => t.categoryId === c.id).reduce((s, t) => s + expenseAmount(t), 0);
      return { category: c, spent, limit: c.monthlyLimit, over: c.monthlyLimit != null && spent > c.monthlyLimit };
    });
  return { from, to, income, expense, difference, savingRate, limits, txs };
}

export function yearReport(db: AppDatabase, year: string) {
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = `${year}-${String(i + 1).padStart(2, "0")}-01`;
    const m = monthReport(db, date);
    return { month: i + 1, income: m.income, expense: m.expense, difference: m.difference };
  });
  const txs = db.transactions.filter((t) => t.date.startsWith(year));
  const byCategory = db.financeCategories.map((c) => ({
    category: c,
    amount: txs.filter((t) => t.categoryId === c.id).reduce((s, t) => (c.kind === "income" ? s + incomeAmount(t) : s + expenseAmount(t)), 0),
  }));
  const netWorth = netCapital(db);
  return { months, byCategory, netWorth };
}

export function debtRemaining(db: AppDatabase, debtId: string): number {
  const debt = db.debts.find((d) => d.id === debtId);
  if (!debt) return 0;
  const paid = db.transactions.filter((t) => t.type === "debt_payment" && t.debtId === debtId).reduce((s, t) => s + t.amount, 0);
  return Math.max(0, debt.principal - paid);
}

export function savingsBalance(db: AppDatabase, savingsId: string): number {
  return db.transactions.reduce((s, t) => {
    if (t.savingsId !== savingsId) return s;
    if (t.type === "savings_in") return s + t.amount;
    if (t.type === "savings_out") return s - t.amount;
    return s;
  }, 0);
}

export function borrowerBalance(db: AppDatabase, borrowerId: string): number {
  return db.transactions.reduce((s, t) => {
    if (t.borrowerId !== borrowerId) return s;
    if (t.type === "loan_given") return s + t.amount;
    if (t.type === "loan_returned") return s - t.amount;
    return s;
  }, 0);
}

export function netCapital(db: AppDatabase): number {
  const accounts = db.accounts.filter((a) => !a.archived).reduce((s, a) => s + calculatedBalance(a, db.transactions), 0);
  const savings = db.savings.filter((x) => !x.archived).reduce((s, x) => s + savingsBalance(db, x.id), 0);
  const owedToUser = db.borrowers.reduce((s, b) => s + borrowerBalance(db, b.id), 0);
  const debts = db.debts.filter((d) => !d.archived).reduce((s, d) => s + debtRemaining(db, d.id), 0);
  return accounts + savings + owedToUser - debts;
}

export { NON_EXPENSE };
