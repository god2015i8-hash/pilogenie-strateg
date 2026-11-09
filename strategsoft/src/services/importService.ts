import type { AppDatabase, ISODate, NamedColor, RecordSource, Task } from "../types/models";
import { excelSerialToISO, startOfWeek } from "../lib/dates";
import { createId } from "../lib/id";

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

function parseHashtag(title: string, categories: NamedColor[]): { title: string; categoryId: string | null } {
  const match = title.match(/#([^\s#]+)/);
  if (!match) return { title: title.trim(), categoryId: null };
  const tag = match[1].toLowerCase();
  const cat = categories.find((c) => c.name.toLowerCase() === tag);
  return { title: title.replace(/#[^\s#]+/g, "").trim(), categoryId: cat?.id ?? null };
}

export function applyWeekmarkWorkbook(
  db: AppDatabase,
  sheets: Record<string, unknown[][]>,
  fileName: string
): { db: AppDatabase; imported: number; message: string } {
  const now = new Date().toISOString();
  let imported = 0;
  const settings = sheets["Настройки"];
  if (settings) {
    const cats: NamedColor[] = [];
    for (let r = 5; r <= 12; r++) {
      const name = String(settings[r]?.[1] ?? "").trim();
      if (name && !/^категория/i.test(name) && name !== "Работает") {
        cats.push({ id: createId("cat"), name, color: ["#3B6FD9", "#7C5CBF", "#C9842A", "#2A9D6E", "#D45B7A"][cats.length % 5] });
      }
    }
    if (cats.length) db.taskCategories = cats;
  }

  for (const [name, grid] of Object.entries(sheets)) {
    if (SKIP_SHEETS.has(name.toLowerCase())) continue;
    if (!WEEK_NAME.test(name)) continue;
    const start = startOfWeek(name);
    if (db.weeks.some((w) => w.startDate === start)) continue;
    const weekId = createId("week");
    const goal = String(grid[7]?.[1] ?? "").trim();
    db.weeks.push({
      id: weekId,
      startDate: start,
      goal,
      weeklyBigThree: ["", "", ""],
      goalReached: false,
      review: {
        doneSummary: String(grid[119]?.[1] ?? ""),
        leftover: "",
        blockers: String(grid[120]?.[1] ?? ""),
        carryNotes: String(grid[123]?.[1] ?? ""),
        nextWeekBigThree: ["", "", ""],
        rating: Number(grid[126]?.[1]) || null,
      },
      createdAt: now,
      updatedAt: now,
      source: "import",
    });
    imported += 1;

    const dayCols = [2, 4, 6, 8, 10, 12, 14];
    const doneCols = [1, 3, 5, 7, 9, 11, 13];
    for (let day = 0; day < 7; day++) {
      const date = `${start.slice(0, 8)}${String(Number(start.slice(8)) + day).padStart(2, "0")}`;
      const iso = addDateSafe(start, day);
      for (let row = 31; row <= 42; row++) {
        const raw = grid[row]?.[dayCols[day]];
        const titleRaw = String(raw ?? "").trim();
        if (!titleRaw || titleRaw === "0") continue;
        const parsed = parseHashtag(titleRaw, db.taskCategories);
        const done = Boolean(grid[row]?.[doneCols[day]]);
        const task: Task = {
          id: createId("task"),
          weekId,
          title: parsed.title,
          date: iso,
          categoryId: parsed.categoryId,
          dueDate: iso,
          status: done ? "done" : "open",
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
  }

  const extra = sheets["Доп. задачи"];
  if (extra) {
    for (let r = 4; r < extra.length; r++) {
      const titleRaw = String(extra[r]?.[1] ?? "").trim();
      if (!titleRaw) continue;
      const parsed = parseHashtag(titleRaw, db.taskCategories);
      const due = cellDate(extra[r]?.[2]);
      const prioRaw = String(extra[r]?.[4] ?? "");
      db.backlog.push({
        id: createId("back"),
        title: parsed.title,
        dueDate: due,
        priority: prioRaw.includes("Высок") ? "high" : prioRaw.includes("Низк") ? "low" : "medium",
        status: extra[r]?.[0] ? "done" : "open",
        categoryId: parsed.categoryId,
        note: "Импорт дополнительных задач",
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
    message: "Импортированы недели, задачи и бэклог. Служебные формулы и лист «Итоги» пропущены.",
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
        week = {
          id: createId("week"),
          startDate: weekStart,
          goal: "",
          weeklyBigThree: ["", "", ""],
          goalReached: false,
          review: { doneSummary: "", leftover: "", blockers: "", carryNotes: "", nextWeekBigThree: ["", "", ""], rating: null },
          createdAt: now,
          updatedAt: now,
          source,
        };
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
