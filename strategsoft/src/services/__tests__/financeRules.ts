import { accountDelta, expenseAmount, validateTransaction } from "../financeService";
import { emptyDatabase, type Transaction } from "../../types/models";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: "1",
    date: "2026-11-06",
    type: "expense",
    amount: 100,
    interestAmount: 0,
    accountId: "acc-main",
    toAccountId: null,
    categoryId: "fin-exp-food",
    goalId: null,
    debtId: null,
    savingsId: null,
    borrowerId: null,
    comment: "",
    createdAt: "",
    updatedAt: "",
    source: "manual",
    ...partial,
  };
}

const checks: string[] = [];
function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
  checks.push(msg);
}

const db = emptyDatabase();
assert(validateTransaction(db, tx({ amount: 0 })).length > 0, "zero amount rejected");
assert(expenseAmount(tx({ type: "transfer" })) === 0, "transfer is not expense");
assert(expenseAmount(tx({ type: "savings_in" })) === 0, "savings in is not expense");
assert(expenseAmount(tx({ type: "debt_payment", amount: 80, interestAmount: 20 })) === 20, "interest is expense");
assert(accountDelta(tx({ type: "transfer", toAccountId: "acc-2" }), "acc-main") === -100, "transfer out");
assert(accountDelta(tx({ type: "transfer", toAccountId: "acc-2" }), "acc-2") === 100, "transfer in");
assert(accountDelta(tx({ type: "loan_given" }), "acc-main") === -100, "loan given reduces cash");
console.log("finance rules ok", checks.length);
