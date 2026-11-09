import type { AppDatabase } from "../types/models";

export interface AppRepository {
  load(): Promise<AppDatabase>;
  save(db: AppDatabase): Promise<void>;
}

export const STORAGE_KEY = "strategsoft.db.v1";
