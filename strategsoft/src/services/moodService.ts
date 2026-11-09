import { addDays, inRange, startOfWeek } from "../lib/dates";
import type { AppDatabase, ISODate, MoodEntry } from "../types/models";

export function averageScore(entries: MoodEntry[]): number | null {
  if (!entries.length) return null;
  const sum = entries.reduce((a, e) => a + e.score, 0);
  return Math.round((sum / entries.length) * 10) / 10;
}

export function entriesInRange(db: AppDatabase, from: ISODate, to: ISODate) {
  return db.moodEntries.filter((e) => inRange(e.date, from, to));
}

export function weekMood(db: AppDatabase, date: ISODate) {
  const from = startOfWeek(date);
  const to = addDays(from, 6);
  const entries = entriesInRange(db, from, to);
  return { from, to, entries, average: averageScore(entries) };
}

export function yearMood(db: AppDatabase, year: string) {
  const entries = entriesInRange(db, `${year}-01-01`, `${year}-12-31`);
  return { entries, average: averageScore(entries) };
}

export function factorAverages(entries: MoodEntry[]) {
  const buckets = new Map<string, number[]>();
  for (const e of entries) {
    for (const f of [...e.factors, ...e.activities]) {
      const arr = buckets.get(f) ?? [];
      arr.push(e.score);
      buckets.set(f, arr);
    }
  }
  return [...buckets.entries()]
    .map(([name, scores]) => ({
      name,
      count: scores.length,
      average: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count);
}
