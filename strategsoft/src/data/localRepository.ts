import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyDatabase, type AppDatabase } from "../types/models";
import { STORAGE_KEY, type AppRepository } from "./repository";

function migrate(raw: unknown): AppDatabase {
  const empty = emptyDatabase();
  if (!raw || typeof raw !== "object") return empty;
  const data = raw as Partial<AppDatabase>;
  return {
    ...empty,
    ...data,
    version: 1,
    settings: { ...empty.settings, ...data.settings },
    taskCategories: data.taskCategories ?? empty.taskCategories,
    weeks: data.weeks ?? [],
    tasks: data.tasks ?? [],
    backlog: data.backlog ?? [],
    habits: data.habits ?? [],
    habitLogs: data.habitLogs ?? [],
    moodEntries: data.moodEntries ?? [],
    difficultMoments: data.difficultMoments ?? [],
    goals: data.goals ?? [],
    goalStages: data.goalStages ?? [],
    accounts: data.accounts?.length ? data.accounts : empty.accounts,
    financeCategories: data.financeCategories?.length ? data.financeCategories : empty.financeCategories,
    transactions: data.transactions ?? [],
    debts: data.debts ?? [],
    savings: data.savings ?? [],
    borrowers: data.borrowers ?? [],
    importJobs: data.importJobs?.length ? data.importJobs : empty.importJobs,
  };
}

export const localRepository: AppRepository = {
  async load() {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyDatabase();
    try {
      return migrate(JSON.parse(raw));
    } catch {
      return emptyDatabase();
    }
  },
  async save(db) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  },
};
