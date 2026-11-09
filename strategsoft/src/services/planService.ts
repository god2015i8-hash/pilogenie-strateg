import { addDays, startOfWeek, weekDates, weekdayIndex } from "../lib/dates";
import type { AppDatabase, ISODate, Task, WeekPlan } from "../types/models";

export function getOrSuggestWeek(db: AppDatabase, date: ISODate): WeekPlan | undefined {
  const start = startOfWeek(date);
  return db.weeks.find((w) => w.startDate === start);
}

export function weekTasks(db: AppDatabase, weekId: string): Task[] {
  return db.tasks.filter((t) => t.weekId === weekId);
}

export function dayTasks(db: AppDatabase, date: ISODate): Task[] {
  return db.tasks.filter((t) => t.date === date);
}

export function bigTasksForDay(tasks: Task[], date: ISODate): Task[] {
  return tasks.filter((t) => t.date === date && t.isBig).slice(0, 3);
}

export function canAddBigTask(tasks: Task[], date: ISODate): boolean {
  return bigTasksForDay(tasks, date).length < 3;
}

export function weekProgress(tasks: Task[]) {
  const openOrDone = tasks.filter((t) => t.status !== "cancelled");
  const done = openOrDone.filter((t) => t.status === "done");
  const leftover = openOrDone.filter((t) => t.status === "open");
  const big = openOrDone.filter((t) => t.isBig || t.isWeeklyBig);
  const bigDone = big.filter((t) => t.status === "done");
  return {
    total: openOrDone.length,
    done: done.length,
    leftover: leftover.length,
    percent: openOrDone.length ? Math.round((done.length / openOrDone.length) * 100) : 0,
    bigTotal: big.length,
    bigDone: bigDone.length,
    bigPercent: big.length ? Math.round((bigDone.length / big.length) * 100) : 0,
  };
}

export function categoryStats(db: AppDatabase, tasks: Task[]) {
  const map = new Map<string, { name: string; color: string; total: number; done: number }>();
  for (const cat of db.taskCategories) {
    map.set(cat.id, { name: cat.name, color: cat.color, total: 0, done: 0 });
  }
  map.set("none", { name: "Без категории", color: "#888888", total: 0, done: 0 });
  for (const t of tasks.filter((x) => x.status !== "cancelled")) {
    const key = t.categoryId && map.has(t.categoryId) ? t.categoryId : "none";
    const row = map.get(key)!;
    row.total += 1;
    if (t.status === "done") row.done += 1;
  }
  return [...map.values()].filter((r) => r.total > 0);
}

export function unfinishedForCarry(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "open");
}

export function nextWeekStart(start: ISODate): ISODate {
  return addDays(start, 7);
}

export function previousWeekStart(start: ISODate): ISODate {
  return addDays(start, -7);
}

export function tasksByWeekday(tasks: Task[], start: ISODate) {
  return weekDates(start).map((date) => ({
    date,
    weekday: weekdayIndex(date),
    tasks: tasks.filter((t) => t.date === date),
  }));
}
