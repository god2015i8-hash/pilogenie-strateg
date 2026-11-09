import { addDays, endOfMonth, inRange, startOfMonth, startOfWeek, todayISO } from "../lib/dates";
import type { AppDatabase, Habit, HabitLog, ISODate } from "../types/models";

export function logsForHabit(db: AppDatabase, habitId: string): HabitLog[] {
  return db.habitLogs.filter((l) => l.habitId === habitId);
}

export function logOnDate(logs: HabitLog[], date: ISODate): HabitLog | undefined {
  return logs.find((l) => l.date === date);
}

export function currentStreak(logs: HabitLog[], today = todayISO()): number {
  const done = new Set(logs.filter((l) => l.done).map((l) => l.date));
  let streak = 0;
  let cursor = today;
  if (!done.has(cursor)) cursor = addDays(cursor, -1);
  while (done.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function completionInRange(logs: HabitLog[], from: ISODate, to: ISODate, targetDays: number) {
  const slice = logs.filter((l) => inRange(l.date, from, to) && l.done);
  const percent = targetDays ? Math.round((slice.length / targetDays) * 100) : 0;
  return { done: slice.length, target: targetDays, percent };
}

export function weekHabitStats(habit: Habit, logs: HabitLog[], date: ISODate) {
  const start = startOfWeek(date);
  const end = addDays(start, 6);
  return completionInRange(logs, start, end, habit.weeklyTarget);
}

export function monthHabitStats(logs: HabitLog[], date: ISODate) {
  const from = startOfMonth(date);
  const to = endOfMonth(date);
  const days = Number(to.slice(8)) ;
  return completionInRange(logs, from, to, days);
}

export function yearHabitStats(logs: HabitLog[], date: ISODate) {
  const year = date.slice(0, 4);
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const slice = logs.filter((l) => inRange(l.date, from, to) && l.done);
  return { done: slice.length, percent: Math.round((slice.length / 365) * 100) };
}

export function todayHabitProgress(db: AppDatabase, date: ISODate) {
  const active = db.habits.filter((h) => !h.archived && h.startDate <= date);
  const done = active.filter((h) =>
    db.habitLogs.some((l) => l.habitId === h.id && l.date === date && l.done)
  );
  return { total: active.length, done: done.length };
}
