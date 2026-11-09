import type { ISODate } from "../types/models";

const WEEKDAYS = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье"];
const WEEKDAYS_SHORT = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const MONTHS = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function todayISO(now = new Date()): ISODate {
  return toISODate(now);
}

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Monday-start week, matching WEEKDAY(..., 2). */
export function startOfWeek(iso: ISODate): ISODate {
  const d = parseISODate(iso);
  const js = d.getDay();
  const offset = js === 0 ? 6 : js - 1;
  d.setDate(d.getDate() - offset);
  return toISODate(d);
}

export function weekdayIndex(iso: ISODate): number {
  const js = parseISODate(iso).getDay();
  return js === 0 ? 6 : js - 1;
}

export function weekdayName(iso: ISODate, short = false): string {
  const i = weekdayIndex(iso);
  return short ? WEEKDAYS_SHORT[i] : WEEKDAYS[i];
}

export function formatLongDate(iso: ISODate): string {
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatShortDate(iso: ISODate): string {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export function weekDates(start: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthGrid(year: number, monthIndex: number): (ISODate | null)[] {
  const first = new Date(year, monthIndex, 1);
  const iso = toISODate(first);
  const start = startOfWeek(iso);
  const cells: (ISODate | null)[] = [];
  for (let i = 0; i < 42; i++) {
    const cur = addDays(start, i);
    const d = parseISODate(cur);
    cells.push(d.getMonth() === monthIndex ? cur : null);
  }
  return cells;
}

export function startOfMonth(iso: ISODate): ISODate {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function inRange(iso: ISODate, from: ISODate, to: ISODate): boolean {
  return iso >= from && iso <= to;
}

export function excelSerialToISO(serial: number): ISODate {
  const utc = new Date(Date.UTC(1899, 11, 30 + serial));
  return `${utc.getUTCFullYear()}-${String(utc.getUTCMonth() + 1).padStart(2, "0")}-${String(utc.getUTCDate()).padStart(2, "0")}`;
}
