import { addDays, startOfWeek, todayISO } from "../lib/dates";
import { createId } from "../lib/id";
import { emptyDatabase, type AppDatabase } from "../types/models";

/** Explicitly marked demo dataset. Never mixed into a live empty store automatically. */
export function createDemoDatabase(): AppDatabase {
  const db = emptyDatabase();
  const now = new Date().toISOString();
  const today = todayISO();
  const weekStart = startOfWeek(today);
  db.settings.demoMode = true;
  db.settings.displayName = "Демо";

  const weekId = createId("week");
  db.weeks = [
    {
      id: weekId,
      startDate: weekStart,
      goal: "Закрыть ключевые рабочие задачи без выгорания",
      weeklyBigThree: ["Подготовить отчёт", "Тренировка 3 раза", "Вечер без экрана"],
      goalReached: false,
      review: {
        doneSummary: "",
        leftover: "",
        blockers: "",
        carryNotes: "",
        nextWeekBigThree: ["", "", ""],
        rating: null,
      },
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
  ];

  db.tasks = [
    {
      id: createId("task"),
      weekId,
      title: "Подготовить отчёт",
      date: today,
      categoryId: "cat-work",
      dueDate: today,
      status: "open",
      note: "",
      isBig: true,
      isWeeklyBig: true,
      carriedFromTaskId: null,
      goalId: null,
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
    {
      id: createId("task"),
      weekId,
      title: "Созвон с командой",
      date: today,
      categoryId: "cat-work",
      dueDate: today,
      status: "done",
      note: "",
      isBig: false,
      isWeeklyBig: false,
      carriedFromTaskId: null,
      goalId: null,
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
  ];

  const habitId = createId("habit");
  db.habits = [
    {
      id: habitId,
      name: "Зарядка",
      weeklyTarget: 5,
      startDate: addDays(today, -14),
      color: "#2A9D6E",
      category: "Здоровье",
      anchorAction: "После чистки зубов я делаю зарядку",
      archived: false,
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
  ];
  db.habitLogs = [
    {
      id: createId("hlog"),
      habitId,
      date: today,
      done: true,
      skipped: false,
      comment: "",
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
  ];

  db.moodEntries = [
    {
      id: createId("mood"),
      date: today,
      score: 7,
      sleepHours: 7.5,
      emotions: ["спокойствие"],
      factors: ["прогулка"],
      activities: ["работа"],
      note: "Демо-запись, не настоящие данные.",
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
  ];

  const goalId = createId("goal");
  db.goals = [
    {
      id: goalId,
      title: "Накопить подушку",
      measurableResult: "3 месячных расхода на отдельном счёте",
      deadline: addDays(today, 180),
      why: "Снизить тревогу из-за непредвиденных трат",
      status: "active",
      sphere: "finance",
      priorityRank: 1,
      firstAction: "Открыть накопительный счёт и перевести 1000",
      obstacles: "Спонтанные покупки",
      ifThen: [{ ifTrigger: "хочется незапланированную покупку", thenAction: "подождать 24 часа" }],
      createdAt: now,
      updatedAt: now,
      source: "demo",
    },
  ];

  db.transactions = [];
  return db;
}
