import type { AppDatabase, ISODate, NamedColor, RecordSource, Task } from "../types/models";
import { excelSerialToISO, startOfWeek, todayISO } from "../lib/dates";
import { createId } from "../lib/id";
import { parseHashtag } from "../lib/tags";
import { emptyReview, makeWeek } from "./planService";

export interface ColumnMapping {
  title?: string;
  date?: string;
  category?: string;
  amount?: string;
  type?: string;
  note?: string;
  status?: string;
}

export interface PreviewRow {
  index: number;
  values: Record<string, string>;
  errors: string[];
}

export interface ImportPreview {
  fileName: string;
  sourceKind: string;
  headers: string[];
  rows: PreviewRow[];
  pendingReason?: string;
}

const SKIP_SHEETS = new Set(["старт", "итоги", "шаблон"]);
const WEEK_NAME = /^\d{4}-\d{2}-\d{2}$/;

export function parseCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = cells[i] ?? "";
    });
    return rec;
  });
  return { headers, rows };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export function previewGeneric(fileName: string, headers: string[], rows: Record<string, string>[]): ImportPreview {
  return {
    fileName,
    sourceKind: guessKind(fileName, headers),
    headers,
    rows: rows.slice(0, 40).map((values, index) => ({
      index,
      values,
      errors: validateRow(headers, values),
    })),
  };
}

function guessKind(fileName: string, headers: string[]): string {
  const h = headers.map((x) => x.toLowerCase()).join(" ");
  if (h.includes("сумм") || h.includes("amount")) return "finance-csv";
  if (h.includes("привыч")) return "habits-csv";
  if (h.includes("состоян") || h.includes("настроен")) return "mood-csv";
  if (/weekmark|задач/i.test(fileName)) return "week-plan";
  return "unknown-csv";
}

function validateRow(headers: string[], values: Record<string, string>): string[] {
  const errors: string[] = [];
  const titleKey = headers.find((h) => /задач|title|назван/i.test(h));
  const amountKey = headers.find((h) => /сумм|amount/i.test(h));
  if (titleKey && !values[titleKey]) errors.push("Пустое название");
  if (amountKey && values[amountKey]) {
    const n = Number(String(values[amountKey]).replace(",", "."));
    if (!(n > 0)) errors.push("Сумма должна быть положительной");
  }
  return errors;
}

function cellDate(value: unknown): ISODate | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return excelSerialToISO(value);
  const s = String(value);
  if (WEEK_NAME.test(s)) return s;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return null;
}

function truthy(value: unknown): boolean {
  if (value === true || value === 1) return true;
  const s = String(value ?? "").trim().toLowerCase();
  return s === "true" || s === "1" || s === "да" || s === "☑";
}

export function applyWeekmarkWorkbook(
  db: AppDatabase,
  sheets: Record<string, unknown[][]>,
  fileName: string
): { db: AppDatabase; imported: number; message: string } {
  const now = new Date().toISOString();
  const today = todayISO();
  let imported = 0;
  const settings = sheets["Настройки"];
  if (settings) {
    const cats: NamedColor[] = [];
    const palette = ["#3B6FD9", "#7C5CBF", "#C9842A", "#2A9D6E", "#D45B7A", "#8B4A3B", "#4C8C4A", "#C9A227"];
    for (let r = 5; r <= 12; r++) {
      const name = String(settings[r]?.[1] ?? "").trim();
      if (name && !/^категория/i.test(name)) {
        cats.push({ id: createId("cat"), name, color: palette[cats.length % palette.length] });
      }
    }
    if (cats.length) db.taskCategories = cats;

    for (let r = 16; r <= 21; r++) {
      const name = String(settings[r]?.[1] ?? "").trim();
      if (!name || /^привычка/i.test(name)) continue;
      if (db.habits.some((h) => h.name.toLowerCase() === name.toLowerCase())) continue;
      const target = Math.min(7, Math.max(1, Number(settings[r]?.[2]) || 7));
      db.habits.push({
        id: createId("habit"),
        name,
        weeklyTarget: target,
        startDate: today,
        color: palette[(r - 16) % palette.length],
        category: "",
        anchorAction: "",
        archived: false,
        createdAt: now,
        updatedAt: now,
        source: "import",
      });
      imported += 1;
    }
  }

  const dayCols = [2, 4, 6, 8, 10, 12, 14];
  const doneCols = [1, 3, 5, 7, 9, 11, 13];

  for (const [name, grid] of Object.entries(sheets)) {
    if (SKIP_SHEETS.has(name.toLowerCase())) continue;
    if (!WEEK_NAME.test(name)) continue;
    const start = startOfWeek(name);
    if (db.weeks.some((w) => w.startDate === start)) continue;
    const week = makeWeek(start, "import", {
      goal: String(grid[7]?.[1] ?? "").trim(),
      goalReached: truthy(grid[7]?.[13]),
      review: {
        ...emptyReview(),
        doneSummary: String(grid[118]?.[1] ?? grid[117]?.[1] ?? "").trim(),
        blockers: String(grid[121]?.[1] ?? grid[120]?.[1] ?? "").trim(),
        carryNotes: String(grid[124]?.[1] ?? grid[123]?.[1] ?? "").trim(),
        rating: Number(grid[127]?.[1] ?? grid[126]?.[1]) || null,
      },
    });
    db.weeks.push(week);
    imported += 1;

    for (let day = 0; day < 7; day++) {
      const iso = addDateSafe(start, day);
      for (let row = 31; row <= 43; row++) {
        const titleRaw = String(grid[row]?.[dayCols[day]] ?? "").trim();
        if (!titleRaw || titleRaw === "0") continue;
        const parsed = parseHashtag(titleRaw, db.taskCategories);
        const task: Task = {
          id: createId("task"),
          weekId: week.id,
          title: parsed.title,
          date: iso,
          categoryId: parsed.categoryId,
          dueDate: iso,
          status: truthy(grid[row]?.[doneCols[day]]) ? "done" : "open",
          note: "",
          isBig: row <= 33,
          isWeeklyBig: false,
          carriedFromTaskId: null,
          goalId: null,
          createdAt: now,
          updatedAt: now,
          source: "import",
        };
        db.tasks.push(task);
        imported += 1;
      }
    }

    const activeHabits = db.habits.filter((h) => !h.archived);
    for (let i = 0; i < activeHabits.length && i < 6; i++) {
      const row = 48 + i;
      for (let day = 0; day < 7; day++) {
        if (!truthy(grid[row]?.[doneCols[day]])) continue;
        const date = addDateSafe(start, day);
        if (db.habitLogs.some((l) => l.habitId === activeHabits[i].id && l.date === date)) continue;
        db.habitLogs.push({
          id: createId("hlog"),
          habitId: activeHabits[i].id,
          date,
          done: true,
          skipped: false,
          comment: "",
          createdAt: now,
          updatedAt: now,
          source: "import",
        });
        imported += 1;
      }
    }
  }

  const totals = sheets["Итоги"];
  if (totals) {
    for (let r = 5; r < totals.length; r++) {
      const sheetName = String(totals[r]?.[1] ?? "");
      if (!WEEK_NAME.test(sheetName)) continue;
      const start = startOfWeek(sheetName);
      const week = db.weeks.find((w) => w.startDate === start);
      if (!week) continue;
      const goal = String(totals[r]?.[3] ?? "").trim();
      if (goal) week.goal = goal;
      if (truthy(totals[r]?.[4])) week.goalReached = true;
      const rating = Number(totals[r]?.[9]);
      if (rating >= 1 && rating <= 5) week.review.rating = rating;
    }
  }

  const extra = sheets["Доп. задачи"];
  if (extra) {
    for (let r = 4; r < extra.length; r++) {
      const titleRaw = String(extra[r]?.[1] ?? "").trim();
      if (!titleRaw) continue;
      const parsed = parseHashtag(titleRaw, db.taskCategories);
      const due = cellDate(extra[r]?.[2]);
      const prioRaw = String(extra[r]?.[4] ?? "");
      const done = truthy(extra[r]?.[0]);
      db.backlog.push({
        id: createId("back"),
        title: parsed.title,
        dueDate: due,
        priority: prioRaw.includes("Высок") ? "high" : prioRaw.includes("Низк") ? "low" : "medium",
        status: done ? "done" : "open",
        categoryId: parsed.categoryId,
        note: due && !done && due < today ? "просрочено" : "",
        createdAt: now,
        updatedAt: now,
        source: "import",
      });
      imported += 1;
    }
  }

  db.importJobs.unshift({
    id: createId("imp"),
    createdAt: now,
    fileName,
    sourceKind: "week-plan",
    status: "imported",
    message: "Импортированы недели, задачи, привычки, бэклог и оценки из архива. Служебные формулы пропущены.",
    importedCount: imported,
  });
  return { db, imported, message: `Импортировано записей: ${imported}` };
}

function addDateSafe(start: ISODate, day: number): ISODate {
  const [y, m, d] = start.split("-").map(Number);
  const dt = new Date(y, m - 1, d + day);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function applyMappedCsv(
  db: AppDatabase,
  preview: ImportPreview,
  mapping: ColumnMapping,
  source: RecordSource = "import"
): { db: AppDatabase; imported: number } {
  const now = new Date().toISOString();
  let imported = 0;
  for (const row of preview.rows) {
    if (row.errors.length) continue;
    const title = mapping.title ? row.values[mapping.title] : "";
    const date = mapping.date ? cellDate(row.values[mapping.date]) : null;
    const note = mapping.note ? row.values[mapping.note] : "";
    if (preview.sourceKind.includes("finance")) {
      const amount = Number(String(row.values[mapping.amount ?? ""]).replace(",", "."));
      if (!(amount > 0) || !date) continue;
      db.transactions.push({
        id: createId("tx"),
        date,
        type: /доход|income/i.test(row.values[mapping.type ?? ""] ?? "") ? "income" : "expense",
        amount,
        interestAmount: 0,
        accountId: db.accounts[0]?.id ?? "acc-main",
        toAccountId: null,
        categoryId: null,
        goalId: null,
        debtId: null,
        savingsId: null,
        borrowerId: null,
        comment: note || title,
        createdAt: now,
        updatedAt: now,
        source,
      });
      imported += 1;
    } else if (title) {
      const weekStart = startOfWeek(date ?? new Date().toISOString().slice(0, 10));
      let week = db.weeks.find((w) => w.startDate === weekStart);
      if (!week) {
        week = makeWeek(weekStart, source);
        db.weeks.push(week);
      }
      db.tasks.push({
        id: createId("task"),
        weekId: week.id,
        title,
        date: date ?? weekStart,
        categoryId: null,
        dueDate: date,
        status: /готов|done|выполн/i.test(row.values[mapping.status ?? ""] ?? "") ? "done" : "open",
        note,
        isBig: false,
        isWeeklyBig: false,
        carriedFromTaskId: null,
        goalId: null,
        createdAt: now,
        updatedAt: now,
        source,
      });
      imported += 1;
    }
  }
  db.importJobs.unshift({
    id: createId("imp"),
    createdAt: now,
    fileName: preview.fileName,
    sourceKind: preview.sourceKind,
    status: "imported",
    message: `Импорт CSV подтверждён, записей: ${imported}`,
    importedCount: imported,
  });
  return { db, imported };
}
