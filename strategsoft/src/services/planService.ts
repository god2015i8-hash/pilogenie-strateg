import { addDays, startOfWeek, weekDates, weekdayIndex } from "../lib/dates";
import { createId } from "../lib/id";
import type { AppDatabase, BacklogTask, ISODate, RecordSource, Task, WeekPlan } from "../types/models";

export function emptyReview(): WeekPlan["review"] {
  return { doneSummary: "", leftover: "", blockers: "", carryNotes: "", nextWeekBigThree: ["", "", ""], rating: null };
}

export function makeWeek(startDate: ISODate, source: RecordSource, extras: Partial<WeekPlan> = {}): WeekPlan {
  const now = new Date().toISOString();
  return {
    id: createId("week"),
    startDate,
    goal: extras.goal ?? "",
    weeklyBigThree: extras.weeklyBigThree ?? ["", "", ""],
    goalReached: extras.goalReached ?? false,
    review: extras.review ?? emptyReview(),
    createdAt: extras.createdAt ?? now,
    updatedAt: extras.updatedAt ?? now,
    source,
  };
}

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

export function dayProgress(tasks: Task[]) {
  const active = tasks.filter((t) => t.status !== "cancelled");
  const done = active.filter((t) => t.status === "done").length;
  return {
    total: active.length,
    done,
    leftover: active.length - done,
    text: `всего ${active.length} · готово ${done} · осталось ${active.length - done}`,
  };
}

export function previousWeekUnfinished(db: AppDatabase, start: ISODate): Task[] {
  const prev = db.weeks.find((w) => w.startDate === previousWeekStart(start));
  if (!prev) return [];
  return unfinishedForCarry(weekTasks(db, prev.id));
}

export function compareWeeks(current: ReturnType<typeof weekProgress>, previous: ReturnType<typeof weekProgress> | null) {
  if (!previous) return { percentDelta: null, bigDelta: null, previous };
  return {
    percentDelta: current.percent - previous.percent,
    bigDelta: current.bigPercent - previous.bigPercent,
    previous,
  };
}

export function archiveRows(db: AppDatabase) {
  return [...db.weeks]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((week) => {
      const stats = weekProgress(weekTasks(db, week.id));
      return { week, stats };
    });
}

export function archiveSummary(rows: ReturnType<typeof archiveRows>) {
  const withTasks = rows.filter((r) => r.stats.total > 0);
  const percents = withTasks.map((r) => r.stats.percent);
  const goalsHit = rows.filter((r) => r.week.goalReached).length;
  const ratings = rows.map((r) => r.week.review.rating).filter((n): n is number => n != null);
  return {
    weeks: rows.length,
    averagePercent: percents.length ? Math.round(percents.reduce((a, b) => a + b, 0) / percents.length) : 0,
    bestPercent: percents.length ? Math.max(...percents) : 0,
    worstPercent: percents.length ? Math.min(...percents) : 0,
    goalsHit,
    averageRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
  };
}

export function backlogStats(items: BacklogTask[], today: ISODate) {
  const open = items.filter((i) => i.status === "open");
  const done = items.filter((i) => i.status === "done");
  const overdue = open.filter((i) => i.dueDate && i.dueDate < today);
  const byPriority = {
    high: open.filter((i) => i.priority === "high").length,
    medium: open.filter((i) => i.priority === "medium").length,
    low: open.filter((i) => i.priority === "low").length,
  };
  return {
    total: items.length,
    done: done.length,
    leftover: open.length,
    overdue: overdue.length,
    percent: items.length ? Math.round((done.length / items.length) * 100) : 0,
    byPriority,
  };
}

export function seedWeekFromPrevious(db: AppDatabase, start: ISODate): Partial<WeekPlan> {
  const prev = db.weeks.find((w) => w.startDate === previousWeekStart(start));
  if (!prev) return {};
  const nextThree = prev.review.nextWeekBigThree;
  const hasNext = nextThree.some(Boolean);
  return {
    weeklyBigThree: hasNext ? nextThree : ["", "", ""],
  };
}
