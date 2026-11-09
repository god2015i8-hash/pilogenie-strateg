export type ID = string;
export type ISODate = string;
export type ISODateTime = string;

export type ThemePreference = "system" | "light" | "dark";
export type CurrencyCode = "RUB" | "USD" | "EUR" | "KZT" | "BYN" | "UAH";

export type TaskStatus = "open" | "done" | "cancelled";
export type TaskPriority = "high" | "medium" | "low";
export type GoalStatus = "active" | "paused" | "done" | "dropped";
export type GoalSphere =
  | "finance"
  | "health"
  | "career"
  | "relationships"
  | "growth"
  | "experiences";

export type TransactionType =
  | "expense"
  | "income"
  | "transfer"
  | "debt_payment"
  | "savings_in"
  | "savings_out"
  | "loan_given"
  | "loan_returned";

export type RecordSource = "manual" | "import" | "demo";

export interface NamedColor {
  id: ID;
  name: string;
  color: string;
}

export interface Settings {
  locale: "ru-RU";
  weekStartsOn: 1;
  currency: CurrencyCode;
  theme: ThemePreference;
  demoMode: boolean;
  displayName: string;
}

export interface WeekReview {
  doneSummary: string;
  leftover: string;
  blockers: string;
  carryNotes: string;
  nextWeekBigThree: [string, string, string];
  rating: number | null;
}

export interface WeekPlan {
  id: ID;
  startDate: ISODate;
  goal: string;
  weeklyBigThree: [string, string, string];
  goalReached: boolean;
  review: WeekReview;
  templateId?: ID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface Task {
  id: ID;
  weekId: ID;
  title: string;
  date: ISODate;
  categoryId: ID | null;
  dueDate: ISODate | null;
  status: TaskStatus;
  note: string;
  isBig: boolean;
  isWeeklyBig: boolean;
  carriedFromTaskId: ID | null;
  goalId: ID | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface BacklogTask {
  id: ID;
  title: string;
  dueDate: ISODate | null;
  priority: TaskPriority;
  status: TaskStatus;
  categoryId: ID | null;
  note: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface Habit {
  id: ID;
  name: string;
  weeklyTarget: number;
  startDate: ISODate;
  color: string;
  category: string;
  anchorAction: string;
  archived: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface HabitLog {
  id: ID;
  habitId: ID;
  date: ISODate;
  done: boolean;
  skipped: boolean;
  comment: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface MoodEntry {
  id: ID;
  date: ISODate;
  score: number;
  sleepHours: number | null;
  emotions: string[];
  factors: string[];
  activities: string[];
  note: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface DifficultMoment {
  id: ID;
  date: ISODate;
  situation: string;
  emotion: string;
  thought: string;
  whatHelped: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface GoalIfThen {
  ifTrigger: string;
  thenAction: string;
}

export interface Goal {
  id: ID;
  title: string;
  measurableResult: string;
  deadline: ISODate | null;
  why: string;
  status: GoalStatus;
  sphere: GoalSphere;
  priorityRank: number | null;
  firstAction: string;
  obstacles: string;
  ifThen: GoalIfThen[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface GoalStage {
  id: ID;
  goalId: ID;
  title: string;
  dueDate: ISODate | null;
  weeklyAction: string;
  done: boolean;
  sortOrder: number;
}

export interface Account {
  id: ID;
  name: string;
  startingBalance: number;
  actualBalance: number | null;
  archived: boolean;
}

export interface FinanceCategory {
  id: ID;
  name: string;
  kind: "income" | "expense";
  monthlyLimit: number | null;
  color: string;
}

export interface Transaction {
  id: ID;
  date: ISODate;
  type: TransactionType;
  amount: number;
  interestAmount: number;
  accountId: ID;
  toAccountId: ID | null;
  categoryId: ID | null;
  goalId: ID | null;
  debtId: ID | null;
  savingsId: ID | null;
  borrowerId: ID | null;
  comment: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  source: RecordSource;
}

export interface Debt {
  id: ID;
  name: string;
  principal: number;
  ratePercent: number;
  dueDate: ISODate | null;
  archived: boolean;
}

export interface SavingsGoal {
  id: ID;
  name: string;
  targetAmount: number;
  dueDate: ISODate | null;
  linkedGoalId: ID | null;
  archived: boolean;
}

export interface Borrower {
  id: ID;
  name: string;
  note: string;
}

export interface ImportJob {
  id: ID;
  createdAt: ISODateTime;
  fileName: string;
  sourceKind: string;
  status: "preview" | "imported" | "pending_source" | "failed";
  message: string;
  importedCount: number;
}

export interface AppDatabase {
  version: 1;
  settings: Settings;
  taskCategories: NamedColor[];
  weeks: WeekPlan[];
  tasks: Task[];
  backlog: BacklogTask[];
  habits: Habit[];
  habitLogs: HabitLog[];
  moodEntries: MoodEntry[];
  difficultMoments: DifficultMoment[];
  goals: Goal[];
  goalStages: GoalStage[];
  accounts: Account[];
  financeCategories: FinanceCategory[];
  transactions: Transaction[];
  debts: Debt[];
  savings: SavingsGoal[];
  borrowers: Borrower[];
  importJobs: ImportJob[];
}

export const DEFAULT_TASK_CATEGORIES: NamedColor[] = [
  { id: "cat-work", name: "Работа", color: "#3B6FD9" },
  { id: "cat-study", name: "Учёба", color: "#7C5CBF" },
  { id: "cat-home", name: "Дом", color: "#C9842A" },
  { id: "cat-health", name: "Здоровье", color: "#2A9D6E" },
  { id: "cat-personal", name: "Личное", color: "#D45B7A" },
];

export const DEFAULT_FINANCE_CATEGORIES: FinanceCategory[] = [
  { id: "fin-inc-salary", name: "Зарплата", kind: "income", monthlyLimit: null, color: "#2A9D6E" },
  { id: "fin-inc-other", name: "Прочие доходы", kind: "income", monthlyLimit: null, color: "#4C8C4A" },
  { id: "fin-exp-food", name: "Еда", kind: "expense", monthlyLimit: null, color: "#D45B7A" },
  { id: "fin-exp-home", name: "Жильё", kind: "expense", monthlyLimit: null, color: "#C9842A" },
  { id: "fin-exp-transport", name: "Транспорт", kind: "expense", monthlyLimit: null, color: "#3B6FD9" },
  { id: "fin-exp-interest", name: "Проценты по долгу", kind: "expense", monthlyLimit: null, color: "#8B4A3B" },
];

export function emptyDatabase(): AppDatabase {
  const now = new Date().toISOString();
  return {
    version: 1,
    settings: {
      locale: "ru-RU",
      weekStartsOn: 1,
      currency: "RUB",
      theme: "system",
      demoMode: false,
      displayName: "",
    },
    taskCategories: DEFAULT_TASK_CATEGORIES,
    weeks: [],
    tasks: [],
    backlog: [],
    habits: [],
    habitLogs: [],
    moodEntries: [],
    difficultMoments: [],
    goals: [],
    goalStages: [],
    accounts: [{ id: "acc-main", name: "Основной счёт", startingBalance: 0, actualBalance: null, archived: false }],
    financeCategories: DEFAULT_FINANCE_CATEGORIES,
    transactions: [],
    debts: [],
    savings: [],
    borrowers: [],
    importJobs: [
      {
        id: "pending-finmark",
        createdAt: now,
        fileName: "",
        sourceKind: "finances-workbook",
        status: "pending_source",
        message: "Таблица финансов не найдена в папке проекта. Импорт журнала, счетов и долгов ожидает исходный XLSX/CSV.",
        importedCount: 0,
      },
      {
        id: "pending-habitmark",
        createdAt: now,
        fileName: "",
        sourceKind: "habits-workbook",
        status: "pending_source",
        message: "Таблица привычек не найдена. Импорт отметок ожидает исходный файл.",
        importedCount: 0,
      },
      {
        id: "pending-moodmark",
        createdAt: now,
        fileName: "",
        sourceKind: "mood-workbook",
        status: "pending_source",
        message: "Таблица дневника состояния не найдена. Импорт записей ожидает исходный файл.",
        importedCount: 0,
      },
      {
        id: "pending-lifemark",
        createdAt: now,
        fileName: "",
        sourceKind: "goals-workbook",
        status: "pending_source",
        message: "Таблица целей не найдена. Импорт карты целей ожидает исходный файл.",
        importedCount: 0,
      },
    ],
  };
}
