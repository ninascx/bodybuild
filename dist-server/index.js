// server/index.ts
import express from "express";
import { copyFile, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from "node:fs/promises";
import path2 from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// server/appData.ts
import crypto from "node:crypto";

// src/data/plans.ts
var userProfile = {
  sex: "male",
  birthDate: "2002-11-10",
  heightCm: 174,
  initialWeightKg: 80,
  estimatedBodyFatPercent: 18,
  targetWeeks: "8-12 \u5468",
  goal: "\u51CF\u8102\u8FC7\u7A0B\u4E2D\u5C3D\u91CF\u589E\u808C\uFF0C\u91CD\u70B9\u63D0\u5347\u80F8\u808C\u89C6\u89C9\u6548\u679C\uFF0C\u540C\u65F6\u4FDD\u62A4\u80A9\u90E8",
  sleepHours: 7,
  averageSteps: 6500,
  trainingDays: [0, 1, 2, 3, 4]
};
var weekendNotes = [
  "\u5141\u8BB8\u81EA\u7531\u996E\u98DF\uFF0C\u4F46\u4E0D\u8981\u5168\u5929\u96F6\u98DF\u5316\u8FDB\u98DF\u3002",
  "\u989D\u5916\u70ED\u91CF\u4F18\u5148\u6765\u81EA\u78B3\u6C34\uFF0C\u4E0D\u8981\u4E3B\u8981\u6765\u81EA\u9AD8\u8102\u96F6\u98DF\u3001\u6CB9\u70B8\u3001\u751C\u54C1\u548C\u9152\u7CBE\u3002"
];
var dailyTargets = {
  0: {
    day: 0,
    dayName: "\u5468\u65E5",
    workoutName: "\u63A8 A",
    calories: 2100,
    protein: 170,
    carbs: 220,
    fat: 60,
    stepTarget: 6500,
    notes: ["\u80F8\u90E8\u4E3B\u523A\u6FC0\u65E5\uFF0C\u5367\u63A8\u4FDD\u7559 1-2 \u6B21\u4F59\u529B\u3002"],
    isTrainingDay: true
  },
  1: {
    day: 1,
    dayName: "\u5468\u4E00",
    workoutName: "\u62C9 A",
    calories: 2100,
    protein: 170,
    carbs: 220,
    fat: 60,
    stepTarget: 6500,
    notes: ["\u80CC\u9614\u548C\u540E\u675F\u4E3A\u4E3B\uFF0C\u5212\u8239\u4FDD\u6301\u80A9\u80DB\u7A33\u5B9A\u3002"],
    isTrainingDay: true
  },
  2: {
    day: 2,
    dayName: "\u5468\u4E8C",
    workoutName: "\u817F",
    calories: 2200,
    protein: 170,
    carbs: 245,
    fat: 60,
    stepTarget: 6500,
    notes: ["\u5B8C\u6574\u4E0B\u80A2\u65E5\uFF0C\u4E3B\u9879\u524D\u4FDD\u8BC1\u70ED\u8EAB\u5145\u5206\u3002"],
    isTrainingDay: true
  },
  3: {
    day: 3,
    dayName: "\u5468\u4E09",
    workoutName: "\u63A8 B",
    calories: 2050,
    protein: 170,
    carbs: 207,
    fat: 60,
    stepTarget: 6500,
    notes: ["\u4E0A\u80F8\u4E0E\u80F8\u578B\u65E5\uFF0C\u63A8\u4E3E\u52A8\u4F5C\u4EC5\u5728\u65E0\u4E0D\u9002\u65F6\u4FDD\u7559\u3002"],
    isTrainingDay: true
  },
  4: {
    day: 4,
    dayName: "\u5468\u56DB",
    workoutName: "\u62C9 B + \u817F\u90E8\u8865\u91CF",
    calories: 2050,
    protein: 170,
    carbs: 207,
    fat: 60,
    stepTarget: 6500,
    notes: ["\u62C9 B \u52A0\u817F\u90E8\u8865\u91CF\uFF0C\u907F\u514D\u628A\u8865\u91CF\u505A\u6210\u7B2C\u4E8C\u4E2A\u817F\u65E5\u3002"],
    isTrainingDay: true
  },
  5: {
    day: 5,
    dayName: "\u5468\u4E94",
    workoutName: "\u4F11\u606F / \u81EA\u7531\u996E\u98DF",
    calorieRange: [2600, 3e3],
    protein: 160,
    stepTarget: 8e3,
    notes: weekendNotes,
    isTrainingDay: false
  },
  6: {
    day: 6,
    dayName: "\u5468\u516D",
    workoutName: "\u4F11\u606F / \u81EA\u7531\u996E\u98DF",
    calorieRange: [2600, 3e3],
    protein: 160,
    stepTarget: 8e3,
    notes: weekendNotes,
    isTrainingDay: false
  }
};
var workoutPlans = {
  0: {
    day: 0,
    name: "\u63A8 A",
    focus: "\u80F8\u90E8\u4E3B\u523A\u6FC0",
    exercises: [
      { id: "bench-press", name: "\u6760\u94C3\u5367\u63A8", prescription: "4 \u7EC4 \xD7 5-8 \u6B21", note: "\u4FDD\u7559 1-2 \u6B21\u4F59\u529B" },
      { id: "low-incline-press", name: "\u4F4E\u4E0A\u659C\u54D1\u94C3\u6216\u5668\u68B0\u5367\u63A8", prescription: "3 \u7EC4 \xD7 6-10 \u6B21", note: "\u503E\u89D2 15-30\xB0\uFF0C\u80A9\u4E0D\u8212\u670D\u5C31\u6362\u5668\u68B0\u4E2D\u7ACB\u63E1" },
      { id: "cable-fly", name: "\u7EF3\u7D22\u5939\u80F8\u6216\u98DE\u9E1F", prescription: "2 \u7EC4 \xD7 12-15 \u6B21" },
      { id: "lateral-raise-a", name: "\u4FA7\u5E73\u4E3E", prescription: "3 \u7EC4 \xD7 12-20 \u6B21" },
      { id: "triceps-pushdown", name: "\u7EF3\u7D22\u4E0B\u538B", prescription: "2 \u7EC4 \xD7 10-15 \u6B21" },
      { id: "face-pull-a", name: "\u9762\u62C9\u6216\u5916\u65CB", prescription: "2 \u7EC4 \xD7 12-20 \u6B21" }
    ]
  },
  1: {
    day: 1,
    name: "\u62C9 A",
    focus: "\u80CC\u9614 + \u540E\u675F",
    exercises: [
      { id: "neutral-pulldown", name: "\u4E2D\u7ACB\u63E1\u4E0B\u62C9 / \u5F15\u4F53", prescription: "4 \u7EC4 \xD7 6-10 \u6B21" },
      { id: "chest-supported-row", name: "\u80F8\u6258\u5212\u8239", prescription: "3 \u7EC4 \xD7 8-12 \u6B21" },
      { id: "single-arm-cable-pulldown", name: "\u5355\u81C2\u94A2\u7EBF\u4E0B\u62C9", prescription: "2 \u7EC4 \xD7 10-15 \u6B21" },
      { id: "rear-delt-fly-a", name: "\u53CD\u5411\u98DE\u9E1F / \u540E\u675F\u94A2\u7EBF", prescription: "3 \u7EC4 \xD7 12-20 \u6B21" },
      { id: "curl-a", name: "\u5F2F\u4E3E", prescription: "3 \u7EC4 \xD7 8-12 \u6B21" },
      { id: "y-raise", name: "\u4F4E\u659C\u65B9\u6216 Y raise", prescription: "2 \u7EC4 \xD7 12-15 \u6B21" }
    ]
  },
  2: {
    day: 2,
    name: "\u817F",
    focus: "\u5B8C\u6574\u4E0B\u80A2",
    exercises: [
      { id: "squat-variant", name: "\u524D\u8E72 / \u54C8\u514B\u6DF1\u8E72 / \u53F2\u5BC6\u65AF\u6DF1\u8E72", prescription: "4 \u7EC4 \xD7 5-8 \u6B21" },
      { id: "romanian-deadlift", name: "\u7F57\u9A6C\u5C3C\u4E9A\u786C\u62C9", prescription: "3 \u7EC4 \xD7 6-10 \u6B21" },
      { id: "split-squat-or-leg-press", name: "\u4FDD\u52A0\u5229\u4E9A\u5206\u817F\u8E72\u6216\u817F\u4E3E", prescription: "3 \u7EC4 \xD7 8-12 \u6B21" },
      { id: "leg-curl-a", name: "\u817F\u5F2F\u4E3E", prescription: "3 \u7EC4 \xD7 10-15 \u6B21" },
      { id: "back-extension-or-hip-thrust", name: "\u5C71\u7F8A\u633A\u8EAB\u6216\u81C0\u63A8", prescription: "2 \u7EC4 \xD7 8-12 \u6B21" },
      { id: "calf-raise-a", name: "\u5C0F\u817F\u63D0\u8E35", prescription: "3 \u7EC4 \xD7 10-15 \u6B21" }
    ]
  },
  3: {
    day: 3,
    name: "\u63A8 B",
    focus: "\u4E0A\u80F8\u4E0E\u80F8\u578B",
    exercises: [
      { id: "machine-chest-press", name: "\u4E2D\u7ACB\u63E1\u5668\u68B0\u80F8\u63A8 / \u4F4E\u4E0A\u659C\u53F2\u5BC6\u65AF", prescription: "3 \u7EC4 \xD7 8-12 \u6B21" },
      { id: "push-up-variant", name: "\u628A\u624B\u4FEF\u5367\u6491 / \u8D1F\u91CD\u4FEF\u5367\u6491 / \u5E73\u677F\u5668\u68B0\u80F8\u63A8", prescription: "2 \u7EC4 \xD7 10-15 \u6B21" },
      { id: "low-to-high-fly", name: "\u4F4E\u5230\u9AD8\u7EF3\u7D22\u98DE\u9E1F", prescription: "3 \u7EC4 \xD7 12-15 \u6B21" },
      { id: "landmine-press", name: "\u5730\u96F7\u7BA1\u63A8\u4E3E", prescription: "2 \u7EC4 \xD7 8-12 \u6B21", note: "\u4EC5\u65E0\u75DB\u65F6\u4FDD\u7559" },
      { id: "lateral-raise-b", name: "\u4FA7\u5E73\u4E3E", prescription: "3 \u7EC4 \xD7 12-20 \u6B21" },
      { id: "overhead-cable-extension", name: "\u8FC7\u9876\u7EF3\u7D22\u81C2\u5C48\u4F38", prescription: "2 \u7EC4 \xD7 12-15 \u6B21" }
    ]
  },
  4: {
    day: 4,
    name: "\u62C9 B + \u817F\u90E8\u8865\u91CF",
    focus: "\u80CC\u90E8 + \u4E0B\u80A2\u8865\u91CF",
    exercises: [
      { id: "seated-row", name: "\u5750\u59FF\u5212\u8239", prescription: "3 \u7EC4 \xD7 8-12 \u6B21" },
      { id: "pulldown-or-straight-arm", name: "\u4E0B\u62C9\u6216\u76F4\u81C2\u4E0B\u538B", prescription: "3 \u7EC4 \xD7 10-12 \u6B21" },
      { id: "single-arm-machine-row", name: "\u5355\u81C2\u5668\u68B0\u5212\u8239", prescription: "2 \u7EC4 \xD7 10-12 \u6B21" },
      { id: "rear-delt-fly-b", name: "\u540E\u675F\u98DE\u9E1F", prescription: "3 \u7EC4 \xD7 12-20 \u6B21" },
      { id: "hammer-curl", name: "\u9524\u5F0F\u5F2F\u4E3E", prescription: "2-3 \u7EC4 \xD7 10-12 \u6B21" },
      { id: "leg-extension", name: "\u817F\u4F38", prescription: "2 \u7EC4 \xD7 12-15 \u6B21" },
      { id: "leg-curl-or-calf", name: "\u817F\u5F2F\u4E3E\u6216\u5C0F\u817F", prescription: "2 \u7EC4 \xD7 12-15 \u6B21" }
    ]
  },
  5: {
    day: 5,
    name: "\u4F11\u606F / \u81EA\u7531\u996E\u98DF",
    focus: "\u6062\u590D\u4E0E\u6D3B\u52A8\u91CF",
    exercises: []
  },
  6: {
    day: 6,
    name: "\u4F11\u606F / \u81EA\u7531\u996E\u98DF",
    focus: "\u6062\u590D\u4E0E\u6D3B\u52A8\u91CF",
    exercises: []
  }
};

// src/lib/userPreferences.ts
var defaultUserPreference = {
  restDurationSec: 90,
  autoStartRest: false,
  goalType: "fat_loss",
  weeklyWeightChangeGoalKg: -0.4,
  sleepFloorHours: 6.5,
  fatigueThreshold: 7,
  weekendCalorieUpperKcal: 3e3
};
function mergeUserPreference(preference) {
  return {
    ...defaultUserPreference,
    ...preference
  };
}

// server/db.ts
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { fileURLToPath } from "node:url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var projectRoot = path.resolve(__dirname, "..");
process.env.DATABASE_URL ??= `file:${path.join(projectRoot, "data", "bodybuild.db").replaceAll("\\", "/")}`;
var prisma = new PrismaClient();
async function configureDatabaseRuntime() {
  await prisma.$queryRawUnsafe("PRAGMA journal_mode = WAL");
  await prisma.$queryRawUnsafe("PRAGMA synchronous = NORMAL");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout = 5000");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys = ON");
}

// server/appData.ts
function parseJson(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
function toJson(value) {
  return JSON.stringify(value ?? []);
}
function createServerId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
function createShareToken() {
  return crypto.randomBytes(32).toString("hex");
}
function normalizeToken(value) {
  const token = value.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new Error("\u8BF7\u8F93\u5165 64 \u4F4D token");
  }
  return token;
}
function toClientDailyLog(row) {
  return {
    date: row.date,
    morningWeightKg: row.morningWeightKg ?? void 0,
    waistCm: row.waistCm ?? void 0,
    chestCm: row.chestCm ?? void 0,
    upperArmCm: row.upperArmCm ?? void 0,
    thighCm: row.thighCm ?? void 0,
    calories: row.calories ?? void 0,
    protein: row.protein ?? void 0,
    carbs: row.carbs ?? void 0,
    fat: row.fat ?? void 0,
    steps: row.steps ?? void 0,
    sleepHours: row.sleepHours ?? void 0,
    trained: row.trained ?? void 0,
    workoutCompletion: row.workoutCompletion ?? void 0,
    fatigueScore: row.fatigueScore ?? void 0,
    notes: row.notes ?? void 0
  };
}
function toClientWorkoutLog(row) {
  return {
    date: row.date,
    workoutName: row.workoutName,
    exercises: parseJson(row.exercisesJson, []),
    notes: row.notes ?? void 0
  };
}
function toClientWorkoutTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    category: row.category,
    exercises: parseJson(row.exercisesJson, []),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    isBuiltin: row.isBuiltin
  };
}
function toClientUserProfile(row) {
  return {
    sex: row.sex === "male" || row.sex === "female" || row.sex === "other" ? row.sex : void 0,
    birthDate: row.birthDate ?? void 0,
    heightCm: row.heightCm ?? void 0,
    initialWeightKg: row.initialWeightKg ?? void 0,
    currentWeightKg: row.currentWeightKg ?? void 0,
    estimatedBodyFatPercent: row.estimatedBodyFatPercent ?? void 0,
    waistCm: row.waistCm ?? void 0,
    chestCm: row.chestCm ?? void 0,
    upperArmCm: row.upperArmCm ?? void 0,
    thighCm: row.thighCm ?? void 0,
    targetWeeks: row.targetWeeks ?? void 0,
    goal: row.goal ?? void 0,
    sleepHours: row.sleepHours ?? void 0,
    averageSteps: row.averageSteps ?? void 0,
    trainingDays: parseJson(row.trainingDaysJson, [])
  };
}
function toClientUserPreference(row) {
  if (!row) return mergeUserPreference(void 0);
  return mergeUserPreference({
    theme: row.theme ?? void 0,
    restDurationSec: row.restDurationSec,
    autoStartRest: row.autoStartRest,
    activeTab: row.activeTab ?? void 0,
    goalType: row.goalType === "fat_loss" || row.goalType === "muscle_gain" || row.goalType === "maintenance" ? row.goalType : void 0,
    weeklyWeightChangeGoalKg: row.weeklyWeightChangeGoalKg ?? void 0,
    sleepFloorHours: row.sleepFloorHours ?? void 0,
    fatigueThreshold: row.fatigueThreshold ?? void 0,
    weekendCalorieUpperKcal: row.weekendCalorieUpperKcal ?? void 0
  });
}
function dailyLogWriteData(userId, log) {
  return {
    userId,
    date: log.date,
    morningWeightKg: log.morningWeightKg ?? null,
    waistCm: log.waistCm ?? null,
    chestCm: log.chestCm ?? null,
    upperArmCm: log.upperArmCm ?? null,
    thighCm: log.thighCm ?? null,
    calories: log.calories ?? null,
    protein: log.protein ?? null,
    carbs: log.carbs ?? null,
    fat: log.fat ?? null,
    steps: log.steps ?? null,
    sleepHours: log.sleepHours ?? null,
    trained: log.trained ?? null,
    workoutCompletion: log.workoutCompletion ?? null,
    fatigueScore: log.fatigueScore ?? null,
    notes: log.notes ?? null
  };
}
function workoutLogWriteData(userId, log) {
  return {
    userId,
    date: log.date,
    workoutName: log.workoutName,
    exercisesJson: toJson(log.exercises),
    notes: log.notes ?? null
  };
}
function workoutTemplateWriteData(userId, template) {
  return {
    id: template.id,
    userId,
    name: template.name,
    focus: template.focus,
    category: template.category,
    exercisesJson: toJson(template.exercises),
    isBuiltin: false
  };
}
function userProfileWriteData(userId, profile) {
  return {
    userId,
    sex: profile.sex ?? null,
    birthDate: profile.birthDate?.trim() || null,
    heightCm: profile.heightCm ?? null,
    initialWeightKg: profile.initialWeightKg ?? null,
    currentWeightKg: profile.currentWeightKg ?? null,
    estimatedBodyFatPercent: profile.estimatedBodyFatPercent ?? null,
    waistCm: profile.waistCm ?? null,
    chestCm: profile.chestCm ?? null,
    upperArmCm: profile.upperArmCm ?? null,
    thighCm: profile.thighCm ?? null,
    targetWeeks: profile.targetWeeks?.trim() || null,
    goal: profile.goal?.trim() || null,
    sleepHours: profile.sleepHours ?? null,
    averageSteps: profile.averageSteps ?? null,
    trainingDaysJson: toJson(profile.trainingDays ?? [])
  };
}
function userPreferenceWriteData(userId, preference) {
  const merged = mergeUserPreference(preference);
  return {
    userId,
    theme: merged.theme ?? null,
    restDurationSec: merged.restDurationSec ?? defaultUserPreference.restDurationSec,
    autoStartRest: merged.autoStartRest ?? defaultUserPreference.autoStartRest,
    activeTab: merged.activeTab ?? null,
    goalType: merged.goalType ?? defaultUserPreference.goalType,
    weeklyWeightChangeGoalKg: merged.weeklyWeightChangeGoalKg ?? defaultUserPreference.weeklyWeightChangeGoalKg,
    sleepFloorHours: merged.sleepFloorHours ?? defaultUserPreference.sleepFloorHours,
    fatigueThreshold: merged.fatigueThreshold ?? defaultUserPreference.fatigueThreshold,
    weekendCalorieUpperKcal: merged.weekendCalorieUpperKcal ?? defaultUserPreference.weekendCalorieUpperKcal
  };
}
function sanitizeExercise(exercise) {
  if (typeof exercise !== "object" || exercise === null) return null;
  const value = exercise;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createServerId("template-exercise"),
    name: value.name.trim(),
    prescription: typeof value.prescription === "string" && value.prescription.trim() ? value.prescription.trim() : "3 \u7EC4 \xD7 8-12 \u6B21",
    note: typeof value.note === "string" && value.note.trim() ? value.note.trim() : void 0
  };
}
function sanitizeTemplate(template) {
  if (typeof template !== "object" || template === null) return null;
  const value = template;
  if (value.isBuiltin) return null;
  if (typeof value.name !== "string" || !value.name.trim()) return null;
  const exercises = Array.isArray(value.exercises) ? value.exercises.map(sanitizeExercise).filter((exercise) => exercise !== null) : [];
  if (exercises.length === 0) return null;
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    id: typeof value.id === "string" && value.id.trim() ? value.id : createServerId("template"),
    name: value.name.trim(),
    focus: typeof value.focus === "string" && value.focus.trim() ? value.focus.trim() : "\u81EA\u5B9A\u4E49",
    category: typeof value.category === "string" && value.category.trim() ? value.category.trim() : "\u81EA\u5B9A\u4E49",
    exercises,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
    isBuiltin: false
  };
}
function cloneImportedTemplate(template) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  return {
    ...template,
    id: createServerId("template"),
    exercises: template.exercises.map((exercise) => ({
      ...exercise,
      id: createServerId("template-exercise")
    })),
    createdAt: now,
    updatedAt: now,
    isBuiltin: false
  };
}
async function getUserAppData(userId) {
  const [dailyLogs, workoutLogs, userTemplates] = await Promise.all([
    prisma.dailyLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.workoutLog.findMany({ where: { userId }, orderBy: { date: "asc" } }),
    prisma.workoutTemplate.findMany({
      where: { userId, isBuiltin: false },
      orderBy: [{ createdAt: "asc" }, { name: "asc" }]
    })
  ]);
  return {
    dailyLogs: dailyLogs.map(toClientDailyLog),
    workoutLogs: workoutLogs.map(toClientWorkoutLog),
    workoutTemplates: userTemplates.map(toClientWorkoutTemplate)
  };
}
async function getUserProfile(userId) {
  const profile = await prisma.userProfile.findUnique({ where: { userId } });
  return profile ? toClientUserProfile(profile) : { trainingDays: [] };
}
async function getUserPreference(userId) {
  const preference = await prisma.userPreference.findUnique({ where: { userId } });
  return toClientUserPreference(preference);
}
async function replaceUserProfile(userId, profile) {
  const data = userProfileWriteData(userId, profile);
  const saved = await prisma.userProfile.upsert({
    where: { userId },
    create: data,
    update: data
  });
  return toClientUserProfile(saved);
}
async function replaceUserPreference(userId, preference) {
  const data = userPreferenceWriteData(userId, preference);
  const saved = await prisma.userPreference.upsert({
    where: { userId },
    create: data,
    update: data
  });
  return toClientUserPreference(saved);
}
async function getUserPlanData(userId) {
  const [nutritionTargets, trainingPlans] = await Promise.all([
    prisma.nutritionTarget.findMany({ where: { userId }, orderBy: { dayOfWeek: "asc" } }),
    prisma.workoutPlan.findMany({ where: { userId }, orderBy: { dayOfWeek: "asc" } })
  ]);
  const mergedTargets = { ...dailyTargets };
  const mergedPlans = { ...workoutPlans };
  nutritionTargets.forEach((target) => {
    mergedTargets[target.dayOfWeek] = toClientNutritionTarget(target);
  });
  trainingPlans.forEach((plan) => {
    mergedPlans[plan.dayOfWeek] = toClientWorkoutPlan(plan);
  });
  return {
    dailyTargets: mergedTargets,
    workoutPlans: mergedPlans
  };
}
async function replaceUserPlanData(userId, data) {
  await prisma.$transaction([
    ...Object.values(data.dailyTargets).map((target) => {
      const next = nutritionTargetData(userId, target);
      return prisma.nutritionTarget.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: target.day } },
        create: next,
        update: next
      });
    }),
    ...Object.values(data.workoutPlans).map((plan) => {
      const next = workoutPlanData(userId, plan);
      return prisma.workoutPlan.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: plan.day } },
        create: next,
        update: next
      });
    })
  ]);
  return getUserPlanData(userId);
}
async function replaceUserAppData(userId, data) {
  await prisma.$transaction(async (tx) => {
    await tx.dailyLog.deleteMany({ where: { userId } });
    await tx.workoutLog.deleteMany({ where: { userId } });
    await tx.workoutTemplate.deleteMany({ where: { userId, isBuiltin: false } });
    if (data.dailyLogs.length > 0) {
      await tx.dailyLog.createMany({
        data: data.dailyLogs.map((log) => dailyLogWriteData(userId, log))
      });
    }
    if (data.workoutLogs.length > 0) {
      await tx.workoutLog.createMany({
        data: data.workoutLogs.map((log) => workoutLogWriteData(userId, log))
      });
    }
    const customTemplates = data.workoutTemplates.filter((template) => !template.isBuiltin);
    if (customTemplates.length > 0) {
      await tx.workoutTemplate.createMany({
        data: customTemplates.map((template) => workoutTemplateWriteData(userId, template))
      });
    }
  });
  return getUserAppData(userId);
}
async function deleteUserData(userId) {
  await prisma.$transaction([
    prisma.dailyLog.deleteMany({ where: { userId } }),
    prisma.workoutLog.deleteMany({ where: { userId } }),
    prisma.workoutTemplate.deleteMany({ where: { userId, isBuiltin: false } }),
    prisma.workoutTemplateShare.deleteMany({ where: { userId } }),
    prisma.userProfile.deleteMany({ where: { userId } }),
    prisma.nutritionTarget.deleteMany({ where: { userId } }),
    prisma.workoutPlan.deleteMany({ where: { userId } }),
    prisma.userPreference.deleteMany({ where: { userId } })
  ]);
}
async function getUserExportData(userId) {
  const [appData, profile, planData, preference] = await Promise.all([
    getUserAppData(userId),
    getUserProfile(userId),
    getUserPlanData(userId),
    getUserPreference(userId)
  ]);
  return {
    version: 1,
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    profile,
    planData,
    preference,
    ...appData
  };
}
async function upsertDailyLog(userId, log) {
  const data = dailyLogWriteData(userId, log);
  const saved = await prisma.dailyLog.upsert({
    where: { userId_date: { userId, date: log.date } },
    create: data,
    update: data
  });
  return toClientDailyLog(saved);
}
async function upsertWorkoutLog(userId, log) {
  const data = workoutLogWriteData(userId, log);
  const saved = await prisma.workoutLog.upsert({
    where: { userId_date: { userId, date: log.date } },
    create: data,
    update: data
  });
  return toClientWorkoutLog(saved);
}
async function replaceUserTemplates(userId, templates) {
  const customTemplates = templates.filter((template) => !template.isBuiltin);
  await prisma.$transaction([
    prisma.workoutTemplate.deleteMany({ where: { userId, isBuiltin: false } }),
    ...customTemplates.map(
      (template) => prisma.workoutTemplate.create({
        data: workoutTemplateWriteData(userId, template)
      })
    )
  ]);
  const saved = await prisma.workoutTemplate.findMany({
    where: { userId, isBuiltin: false },
    orderBy: [{ createdAt: "asc" }, { name: "asc" }]
  });
  return saved.map(toClientWorkoutTemplate);
}
async function createWorkoutTemplateShareToken(userId, templates) {
  const customTemplates = templates.map(sanitizeTemplate).filter((template) => template !== null);
  if (customTemplates.length === 0) {
    throw new Error("\u6CA1\u6709\u53EF\u5BFC\u51FA\u7684\u81EA\u5B9A\u4E49\u8BAD\u7EC3\u6A21\u677F");
  }
  const templatesJson = JSON.stringify(customTemplates);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const token = createShareToken();
    try {
      await prisma.$executeRawUnsafe(
        'INSERT INTO "WorkoutTemplateShare" ("token", "userId", "templatesJson") VALUES (?, ?, ?)',
        token,
        userId,
        templatesJson
      );
      return { token, count: customTemplates.length };
    } catch (error) {
      if (attempt === 2) throw error;
    }
  }
  throw new Error("\u751F\u6210 token \u5931\u8D25");
}
async function importWorkoutTemplatesByToken(userId, tokenValue) {
  const token = normalizeToken(tokenValue);
  const rows = await prisma.$queryRawUnsafe(
    'SELECT "token", "templatesJson" FROM "WorkoutTemplateShare" WHERE "token" = ? LIMIT 1',
    token
  );
  const row = rows[0];
  if (!row) {
    throw new Error("\u672A\u627E\u5230\u5BF9\u5E94\u7684\u8BAD\u7EC3\u6A21\u677F token");
  }
  const sharedTemplates = parseJson(row.templatesJson, []).map(sanitizeTemplate).filter((template) => template !== null).map(cloneImportedTemplate);
  if (sharedTemplates.length === 0) {
    throw new Error("\u8FD9\u4E2A token \u6CA1\u6709\u53EF\u5BFC\u5165\u7684\u8BAD\u7EC3\u6A21\u677F");
  }
  await prisma.workoutTemplate.createMany({
    data: sharedTemplates.map((template) => workoutTemplateWriteData(userId, template))
  });
  return {
    workoutTemplates: await getUserAppData(userId).then((data) => data.workoutTemplates),
    importedCount: sharedTemplates.length
  };
}
function nutritionTargetData(userId, target) {
  return {
    userId,
    dayOfWeek: target.day,
    workoutName: target.workoutName,
    calories: target.calories ?? null,
    calorieMin: target.calorieRange?.[0] ?? null,
    calorieMax: target.calorieRange?.[1] ?? null,
    protein: target.protein,
    carbs: target.carbs ?? null,
    fat: target.fat ?? null,
    stepTarget: target.stepTarget,
    notesJson: toJson(target.notes),
    isTrainingDay: target.isTrainingDay
  };
}
function workoutPlanData(userId, plan) {
  return {
    userId,
    dayOfWeek: plan.day,
    name: plan.name,
    focus: plan.focus,
    exercisesJson: toJson(plan.exercises)
  };
}
function toClientNutritionTarget(row) {
  return {
    day: row.dayOfWeek,
    dayName: dailyTargets[row.dayOfWeek]?.dayName ?? "",
    workoutName: row.workoutName,
    calories: row.calories ?? void 0,
    calorieRange: row.calorieMin !== null && row.calorieMax !== null ? [row.calorieMin, row.calorieMax] : void 0,
    protein: row.protein,
    carbs: row.carbs ?? void 0,
    fat: row.fat ?? void 0,
    stepTarget: row.stepTarget,
    notes: parseJson(row.notesJson, []),
    isTrainingDay: row.isTrainingDay
  };
}
function toClientWorkoutPlan(row) {
  return {
    day: row.dayOfWeek,
    name: row.name,
    focus: row.focus,
    exercises: parseJson(row.exercisesJson, [])
  };
}
async function cloneDefaultPlanToUser(userId) {
  await prisma.$transaction([
    prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        sex: userProfile.sex,
        birthDate: userProfile.birthDate,
        heightCm: userProfile.heightCm,
        initialWeightKg: userProfile.initialWeightKg,
        currentWeightKg: userProfile.currentWeightKg ?? userProfile.initialWeightKg,
        estimatedBodyFatPercent: userProfile.estimatedBodyFatPercent,
        waistCm: userProfile.waistCm ?? null,
        chestCm: userProfile.chestCm ?? null,
        upperArmCm: userProfile.upperArmCm ?? null,
        thighCm: userProfile.thighCm ?? null,
        targetWeeks: userProfile.targetWeeks,
        goal: userProfile.goal,
        sleepHours: userProfile.sleepHours,
        averageSteps: userProfile.averageSteps,
        trainingDaysJson: toJson(userProfile.trainingDays)
      },
      update: {
        sex: userProfile.sex,
        birthDate: userProfile.birthDate,
        heightCm: userProfile.heightCm,
        initialWeightKg: userProfile.initialWeightKg,
        currentWeightKg: userProfile.currentWeightKg ?? userProfile.initialWeightKg,
        estimatedBodyFatPercent: userProfile.estimatedBodyFatPercent,
        waistCm: userProfile.waistCm ?? null,
        chestCm: userProfile.chestCm ?? null,
        upperArmCm: userProfile.upperArmCm ?? null,
        thighCm: userProfile.thighCm ?? null,
        targetWeeks: userProfile.targetWeeks,
        goal: userProfile.goal,
        sleepHours: userProfile.sleepHours,
        averageSteps: userProfile.averageSteps,
        trainingDaysJson: toJson(userProfile.trainingDays)
      }
    }),
    prisma.userPreference.upsert({
      where: { userId },
      create: userPreferenceWriteData(userId, defaultUserPreference),
      update: userPreferenceWriteData(userId, defaultUserPreference)
    }),
    ...Object.values(dailyTargets).map((target) => {
      const data = nutritionTargetData(userId, target);
      return prisma.nutritionTarget.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: target.day } },
        create: data,
        update: data
      });
    }),
    ...Object.values(workoutPlans).map((plan) => {
      const data = workoutPlanData(userId, plan);
      return prisma.workoutPlan.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: plan.day } },
        create: data,
        update: data
      });
    })
  ]);
}

// server/auth.ts
import bcrypt from "bcrypt";
import { parse, serialize } from "cookie";
import crypto2 from "node:crypto";
var SESSION_COOKIE = "bodybuild_session";
var SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
var DEFAULT_BCRYPT_ROUNDS = 10;
var MIN_BCRYPT_ROUNDS = 8;
var MAX_BCRYPT_ROUNDS = 14;
function toPublicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role
  };
}
function hashToken(token) {
  return crypto2.createHash("sha256").update(token).digest("hex");
}
function createSessionToken() {
  return crypto2.randomBytes(32).toString("base64url");
}
function bcryptRounds() {
  const parsed = Number(process.env.BODYBUILD_BCRYPT_ROUNDS);
  if (!Number.isFinite(parsed)) return DEFAULT_BCRYPT_ROUNDS;
  return Math.min(MAX_BCRYPT_ROUNDS, Math.max(MIN_BCRYPT_ROUNDS, Math.round(parsed)));
}
function secureCookieForRequest(request) {
  const configured = process.env.BODYBUILD_SECURE_COOKIES;
  if (configured === "true" || configured === "1") return true;
  if (configured === "false" || configured === "0") return false;
  return request.secure || request.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
}
function sessionCookie(token, maxAge, secure) {
  return serialize(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge
  });
}
function clearSessionCookie(request) {
  return sessionCookie("", 0, secureCookieForRequest(request));
}
async function createSession(request, response, userId) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1e3);
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });
  response.setHeader("Set-Cookie", sessionCookie(token, SESSION_MAX_AGE_SECONDS, secureCookieForRequest(request)));
}
async function destroySession(request, response) {
  const token = parse(request.headers.cookie ?? "")[SESSION_COOKIE];
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  response.setHeader("Set-Cookie", clearSessionCookie(request));
}
async function getCurrentUser(request) {
  const token = parse(request.headers.cookie ?? "")[SESSION_COOKIE];
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  });
  if (!session || session.expiresAt <= /* @__PURE__ */ new Date() || !session.user.isActive) {
    if (session) {
      await prisma.session.deleteMany({ where: { id: session.id } });
    }
    return null;
  }
  return session.user;
}
async function requireUser(request, response) {
  const user = await getCurrentUser(request);
  if (!user) {
    response.status(401).json({ error: "\u8BF7\u5148\u767B\u5F55" });
    return null;
  }
  return user;
}
async function requireAdmin(request, response) {
  const user = await requireUser(request, response);
  if (!user) return null;
  if (user.role !== "admin") {
    response.status(403).json({ error: "\u9700\u8981\u7BA1\u7406\u5458\u6743\u9650" });
    return null;
  }
  return user;
}
async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}
async function hashPassword(password) {
  return bcrypt.hash(password, bcryptRounds());
}

// server/ensureDatabase.ts
var statements = [
  `CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "Session_tokenHash_key" ON "Session"("tokenHash")`,
  `CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sex" TEXT,
    "birthDate" TEXT,
    "heightCm" REAL,
    "initialWeightKg" REAL,
    "currentWeightKg" REAL,
    "estimatedBodyFatPercent" REAL,
    "waistCm" REAL,
    "chestCm" REAL,
    "upperArmCm" REAL,
    "thighCm" REAL,
    "targetWeeks" TEXT,
    "goal" TEXT,
    "sleepHours" REAL,
    "averageSteps" INTEGER,
    "trainingDaysJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userId_key" ON "UserProfile"("userId")`,
  `CREATE TABLE IF NOT EXISTS "NutritionTarget" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "workoutName" TEXT NOT NULL,
    "calories" INTEGER,
    "calorieMin" INTEGER,
    "calorieMax" INTEGER,
    "protein" INTEGER NOT NULL,
    "carbs" INTEGER,
    "fat" INTEGER,
    "stepTarget" INTEGER NOT NULL,
    "notesJson" TEXT NOT NULL DEFAULT '[]',
    "isTrainingDay" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NutritionTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "NutritionTarget_userId_dayOfWeek_key" ON "NutritionTarget"("userId", "dayOfWeek")`,
  `CREATE TABLE IF NOT EXISTS "WorkoutPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutPlan_userId_dayOfWeek_key" ON "WorkoutPlan"("userId", "dayOfWeek")`,
  `CREATE TABLE IF NOT EXISTS "WorkoutTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "focus" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
    "isBuiltin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS "WorkoutTemplateShare" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "templatesJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkoutTemplateShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS "WorkoutTemplateShare_userId_idx" ON "WorkoutTemplateShare"("userId")`,
  `CREATE TABLE IF NOT EXISTS "DailyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "morningWeightKg" REAL,
    "waistCm" REAL,
    "chestCm" REAL,
    "upperArmCm" REAL,
    "thighCm" REAL,
    "calories" INTEGER,
    "protein" INTEGER,
    "carbs" INTEGER,
    "fat" INTEGER,
    "steps" INTEGER,
    "sleepHours" REAL,
    "trained" BOOLEAN,
    "workoutCompletion" INTEGER,
    "fatigueScore" INTEGER,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "DailyLog_userId_date_key" ON "DailyLog"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "DailyLog_userId_date_idx" ON "DailyLog"("userId", "date")`,
  `CREATE TABLE IF NOT EXISTS "WorkoutLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "workoutName" TEXT NOT NULL,
    "exercisesJson" TEXT NOT NULL DEFAULT '[]',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "WorkoutLog_userId_date_key" ON "WorkoutLog"("userId", "date")`,
  `CREATE INDEX IF NOT EXISTS "WorkoutLog_userId_date_idx" ON "WorkoutLog"("userId", "date")`,
  `CREATE TABLE IF NOT EXISTS "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "theme" TEXT,
    "restDurationSec" INTEGER NOT NULL DEFAULT 90,
    "autoStartRest" BOOLEAN NOT NULL DEFAULT false,
    "activeTab" TEXT,
    "goalType" TEXT,
    "weeklyWeightChangeGoalKg" REAL,
    "sleepFloorHours" REAL,
    "fatigueThreshold" INTEGER,
    "weekendCalorieUpperKcal" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserPreference_userId_key" ON "UserPreference"("userId")`,
  `CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "detailsJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`
];
async function ensureUserIdentityColumns() {
  const columns = await prisma.$queryRawUnsafe('PRAGMA table_info("User")');
  const columnNames = new Set(columns.map((column) => column.name));
  if (!columnNames.has("username")) {
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "username" TEXT');
    if (columnNames.has("email")) {
      await prisma.$executeRawUnsafe(`UPDATE "User" SET "username" = "email" WHERE "username" IS NULL OR "username" = ''`);
    }
    await prisma.$executeRawUnsafe(`UPDATE "User" SET "username" = COALESCE(NULLIF("username", ''), "displayName", "id")`);
  }
  if (!columnNames.has("email")) {
    await prisma.$executeRawUnsafe('ALTER TABLE "User" ADD COLUMN "email" TEXT');
  }
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username")');
  await prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email")');
}
async function ensureUserProfileCurrentColumns() {
  const columns = await prisma.$queryRawUnsafe('PRAGMA table_info("UserProfile")');
  const columnNames = new Set(columns.map((column) => column.name));
  const numericColumns = ["currentWeightKg", "waistCm", "chestCm", "upperArmCm", "thighCm"];
  for (const column of numericColumns) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "UserProfile" ADD COLUMN "${column}" REAL`);
    }
  }
}
async function ensureUserPreferenceRuleColumns() {
  const columns = await prisma.$queryRawUnsafe('PRAGMA table_info("UserPreference")');
  const columnNames = new Set(columns.map((column) => column.name));
  const columnsToAdd = [
    ["goalType", "TEXT"],
    ["weeklyWeightChangeGoalKg", "REAL"],
    ["sleepFloorHours", "REAL"],
    ["fatigueThreshold", "INTEGER"],
    ["weekendCalorieUpperKcal", "INTEGER"]
  ];
  for (const [column, type] of columnsToAdd) {
    if (!columnNames.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "UserPreference" ADD COLUMN "${column}" ${type}`);
    }
  }
}
async function ensureDatabaseSchema() {
  for (const [index, statement] of statements.entries()) {
    await prisma.$executeRawUnsafe(statement);
    if (index === 0) {
      await ensureUserIdentityColumns();
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "UserProfile"')) {
      await ensureUserProfileCurrentColumns();
    }
    if (statement.includes('CREATE TABLE IF NOT EXISTS "UserPreference"')) {
      await ensureUserPreferenceRuleColumns();
    }
  }
}

// server/index.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var projectRoot2 = path2.resolve(__dirname2, "..");
var port = Number(process.env.PORT ?? 8787);
var bind = process.env.BODYBUILD_BIND ?? "127.0.0.1";
var dataFile = path2.resolve(process.env.BODYBUILD_DATA_FILE ?? path2.join(projectRoot2, "data", "bodybuild-data.json"));
var distDir = path2.join(projectRoot2, "dist");
var BACKUP_KEEP = 7;
var JSON_BODY_LIMIT = process.env.BODYBUILD_JSON_LIMIT ?? "2mb";
var SQLITE_BACKUP_KEEP = Math.max(1, Number(process.env.BODYBUILD_SQLITE_BACKUP_KEEP ?? 14) || 14);
var LOGIN_WINDOW_MS = 10 * 60 * 1e3;
var LOGIN_MAX_ATTEMPTS = 5;
var LOGIN_ATTEMPT_MAX_KEYS = 1e3;
var loginAttempts = /* @__PURE__ */ new Map();
var emptyData = () => ({
  version: 1,
  updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
  dailyLogs: [],
  workoutLogs: [],
  workoutTemplates: []
});
function validateData(value) {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid data payload");
  }
  const payload = value;
  if (payload.version !== 1 || !Array.isArray(payload.dailyLogs) || !Array.isArray(payload.workoutLogs) || payload.workoutTemplates !== void 0 && !Array.isArray(payload.workoutTemplates)) {
    throw new Error("Invalid data payload");
  }
  return {
    version: 1,
    updatedAt: typeof payload.updatedAt === "string" ? payload.updatedAt : (/* @__PURE__ */ new Date()).toISOString(),
    dailyLogs: payload.dailyLogs,
    workoutLogs: payload.workoutLogs,
    workoutTemplates: payload.workoutTemplates ?? []
  };
}
function validateAppData(value) {
  if (typeof value !== "object" || value === null) {
    throw new Error("Invalid app data payload");
  }
  const payload = value;
  if (!Array.isArray(payload.dailyLogs) || !Array.isArray(payload.workoutLogs) || payload.workoutTemplates !== void 0 && !Array.isArray(payload.workoutTemplates)) {
    throw new Error("Invalid app data payload");
  }
  return {
    dailyLogs: payload.dailyLogs,
    workoutLogs: payload.workoutLogs,
    workoutTemplates: payload.workoutTemplates ?? []
  };
}
function requireString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}
function trustProxySetting() {
  const value = process.env.BODYBUILD_TRUST_PROXY;
  if (!value) return "loopback";
  if (value === "true") return true;
  if (value === "false" || value === "0") return false;
  return value;
}
function loginAttemptKey(request, username) {
  return `${request.ip ?? request.socket.remoteAddress ?? "unknown"}:${username}`;
}
function cleanupLoginAttempts(now = Date.now()) {
  for (const [key, attempt] of loginAttempts) {
    if (now - attempt.firstAt > LOGIN_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
  while (loginAttempts.size > LOGIN_ATTEMPT_MAX_KEYS) {
    const oldestKey = loginAttempts.keys().next().value;
    if (!oldestKey) break;
    loginAttempts.delete(oldestKey);
  }
}
function isLoginLimited(key) {
  cleanupLoginAttempts();
  const attempt = loginAttempts.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return attempt.count >= LOGIN_MAX_ATTEMPTS;
}
function recordLoginFailure(key) {
  const now = Date.now();
  cleanupLoginAttempts(now);
  const current = loginAttempts.get(key);
  if (!current || now - current.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { count: 1, firstAt: now });
    return;
  }
  loginAttempts.set(key, { ...current, count: current.count + 1 });
}
function clearLoginFailures(key) {
  loginAttempts.delete(key);
}
function sqliteFilePath() {
  const databaseUrl = process.env.DATABASE_URL ?? `file:${path2.join(projectRoot2, "data", "bodybuild.db").replaceAll("\\", "/")}`;
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("\u5F53\u524D\u4EC5\u652F\u6301 SQLite file: \u6570\u636E\u5E93\u5907\u4EFD");
  }
  return path2.resolve(databaseUrl.slice("file:".length));
}
async function cleanupSqliteBackups(backupDir) {
  const entries = await readdir(backupDir);
  const backups = entries.filter((entry) => /^bodybuild-.+\.db$/.test(entry)).sort();
  while (backups.length > SQLITE_BACKUP_KEEP) {
    const name = backups.shift();
    if (name) await unlink(path2.join(backupDir, name));
  }
  return backups.length;
}
async function createSqliteBackup() {
  const source = sqliteFilePath();
  await stat(source);
  await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
  const stamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
  const backupDir = path2.join(path2.dirname(source), "backups");
  await mkdir(backupDir, { recursive: true });
  const backupPath = path2.join(backupDir, `bodybuild-${stamp}.db`);
  await copyFile(source, backupPath);
  const [backupStats, retainedCount] = await Promise.all([
    stat(backupPath),
    cleanupSqliteBackups(backupDir)
  ]);
  return { path: backupPath, sizeBytes: backupStats.size, retainedCount, keepCount: SQLITE_BACKUP_KEEP };
}
async function ensureDataFile() {
  await mkdir(path2.dirname(dataFile), { recursive: true });
  try {
    await stat(dataFile);
  } catch {
    await writeFile(dataFile, `${JSON.stringify(emptyData(), null, 2)}
`, "utf8");
  }
}
async function readData() {
  await ensureDataFile();
  const raw = await readFile(dataFile, "utf8");
  return validateData(JSON.parse(raw));
}
async function rotateBackup() {
  try {
    const stats = await stat(dataFile);
    if (!stats.isFile()) return;
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const backupPath = `${dataFile}.${today}.bak.json`;
    try {
      await stat(backupPath);
    } catch {
      await copyFile(dataFile, backupPath);
    }
    const dir = path2.dirname(dataFile);
    const prefix = `${path2.basename(dataFile)}.`;
    const entries = await readdir(dir);
    const backups = entries.filter((entry) => entry.startsWith(prefix) && entry.endsWith(".bak.json")).sort();
    while (backups.length > BACKUP_KEEP) {
      const name = backups.shift();
      if (name) {
        await unlink(path2.join(dir, name));
      }
    }
  } catch (err) {
    console.warn("\u5907\u4EFD\u5931\u8D25", err);
  }
}
async function writeData(data) {
  await ensureDataFile();
  await rotateBackup();
  const nextData = {
    ...data,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tempFile, `${JSON.stringify(nextData, null, 2)}
`, "utf8");
  await rename(tempFile, dataFile);
  return nextData;
}
var app = express();
app.set("trust proxy", trustProxySetting());
app.use("/api", (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("Pragma", "no-cache");
  next();
});
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(((error, request, response, next) => {
  if (!request.path.startsWith("/api")) {
    next(error);
    return;
  }
  const status = typeof error?.status === "number" ? error.status : 400;
  const type = typeof error?.type === "string" ? error.type : "";
  if (status === 413 || type === "entity.too.large") {
    response.status(413).json({ error: `\u672C\u6B21\u63D0\u4EA4\u8D85\u8FC7\u670D\u52A1\u5668\u63A5\u6536\u4E0A\u9650\uFF08${JSON_BODY_LIMIT}\uFF09\uFF0C\u8BF7\u51CF\u5C11\u4E00\u6B21\u63D0\u4EA4\u7684\u6570\u636E\u91CF\u6216\u8054\u7CFB\u7BA1\u7406\u5458\u8C03\u6574\u4E0A\u9650\u3002` });
    return;
  }
  if (status === 400 || type === "entity.parse.failed") {
    response.status(400).json({ error: "\u8BF7\u6C42\u5185\u5BB9\u4E0D\u662F\u6709\u6548\u7684 JSON\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u540E\u91CD\u8BD5\u3002" });
    return;
  }
  next(error);
}));
app.get("/api/health", async (_request, response) => {
  try {
    await prisma.$queryRawUnsafe("SELECT 1 AS ok");
    response.json({
      ok: true,
      dataFile,
      database: { ok: true },
      uptimeSec: Math.round(process.uptime()),
      memory: {
        rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024)
      },
      limits: {
        jsonBody: JSON_BODY_LIMIT
      }
    });
  } catch (error) {
    response.status(500).json({
      ok: false,
      database: {
        ok: false,
        error: error instanceof Error ? error.message : "\u6570\u636E\u5E93\u4E0D\u53EF\u7528"
      }
    });
  }
});
app.get("/api/data", async (_request, response) => {
  try {
    response.json(await readData());
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Failed to read data" });
  }
});
app.put("/api/data", async (request, response) => {
  try {
    const data = validateData(request.body);
    const saved = await writeData(data);
    response.json(saved);
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "Failed to save data" });
  }
});
app.post("/api/auth/login", async (request, response) => {
  try {
    const username = requireString(request.body?.username ?? request.body?.email, "username").toLowerCase();
    const password = requireString(request.body?.password, "password");
    const attemptKey = loginAttemptKey(request, username);
    if (isLoginLimited(attemptKey)) {
      response.status(429).json({ error: "\u767B\u5F55\u5C1D\u8BD5\u8FC7\u591A\uFF0C\u8BF7 10 \u5206\u949F\u540E\u518D\u8BD5" });
      return;
    }
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive || !await verifyPassword(password, user.passwordHash)) {
      recordLoginFailure(attemptKey);
      response.status(401).json({ error: "\u6635\u79F0\u6216\u5BC6\u7801\u4E0D\u6B63\u786E" });
      return;
    }
    clearLoginFailures(attemptKey);
    await createSession(request, response, user.id);
    response.json({ user: toPublicUser(user) });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u767B\u5F55\u5931\u8D25" });
  }
});
app.post("/api/auth/logout", async (request, response) => {
  try {
    await destroySession(request, response);
    response.json({ ok: true });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u9000\u51FA\u5931\u8D25" });
  }
});
app.get("/api/auth/me", async (request, response) => {
  try {
    const user = await getCurrentUser(request);
    response.json({ user: user ? toPublicUser(user) : null });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u767B\u5F55\u72B6\u6001\u5931\u8D25" });
  }
});
app.get("/api/export", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    response.json(await getUserExportData(user.id));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u5BFC\u51FA\u5F53\u524D\u7528\u6237\u6570\u636E\u5931\u8D25" });
  }
});
app.get("/api/app-data", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    response.json(await getUserAppData(user.id));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u7528\u6237\u6570\u636E\u5931\u8D25" });
  }
});
app.put("/api/app-data", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    const data = validateAppData(request.body);
    response.json(await replaceUserAppData(user.id, data));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u7528\u6237\u6570\u636E\u5931\u8D25" });
  }
});
app.get("/api/profile", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    response.json(await getUserProfile(user.id));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u4E2A\u4EBA\u8D44\u6599\u5931\u8D25" });
  }
});
app.put("/api/profile", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    if (typeof request.body !== "object" || request.body === null) throw new Error("Invalid profile payload");
    response.json(await replaceUserProfile(user.id, request.body));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u4E2A\u4EBA\u8D44\u6599\u5931\u8D25" });
  }
});
app.get("/api/preferences", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    response.json(await getUserPreference(user.id));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u4E2A\u4EBA\u914D\u7F6E\u5931\u8D25" });
  }
});
app.put("/api/preferences", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    if (typeof request.body !== "object" || request.body === null) throw new Error("Invalid preference payload");
    response.json(await replaceUserPreference(user.id, request.body));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u4E2A\u4EBA\u914D\u7F6E\u5931\u8D25" });
  }
});
app.get("/api/plan-data", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    response.json(await getUserPlanData(user.id));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u8BA1\u5212\u5931\u8D25" });
  }
});
app.put("/api/plan-data", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    if (typeof request.body !== "object" || request.body === null) throw new Error("Invalid plan payload");
    response.json(await replaceUserPlanData(user.id, request.body));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u8BA1\u5212\u5931\u8D25" });
  }
});
app.put("/api/daily-logs/:date", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    const log = request.body;
    if (!log || typeof log !== "object") throw new Error("Invalid daily log payload");
    response.json(await upsertDailyLog(user.id, { ...log, date: request.params.date }));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u6BCF\u65E5\u8BB0\u5F55\u5931\u8D25" });
  }
});
app.put("/api/workout-logs/:date", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    const log = request.body;
    if (!log || typeof log !== "object" || typeof log.workoutName !== "string" || !Array.isArray(log.exercises)) {
      throw new Error("Invalid workout log payload");
    }
    response.json(await upsertWorkoutLog(user.id, { ...log, date: request.params.date }));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u8BAD\u7EC3\u8BB0\u5F55\u5931\u8D25" });
  }
});
app.get("/api/workout-templates", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    const data = await getUserAppData(user.id);
    response.json(data.workoutTemplates);
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u8BAD\u7EC3\u6A21\u677F\u5931\u8D25" });
  }
});
app.put("/api/workout-templates", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    if (!Array.isArray(request.body)) throw new Error("Invalid workout templates payload");
    response.json(await replaceUserTemplates(user.id, request.body));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u4FDD\u5B58\u8BAD\u7EC3\u6A21\u677F\u5931\u8D25" });
  }
});
app.post("/api/workout-template-token/export", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    const templates = Array.isArray(request.body?.workoutTemplates) ? request.body.workoutTemplates : (await getUserAppData(user.id)).workoutTemplates;
    response.json(await createWorkoutTemplateShareToken(user.id, templates));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u5BFC\u51FA\u8BAD\u7EC3\u6A21\u677F\u5931\u8D25" });
  }
});
app.post("/api/workout-template-token/import", async (request, response) => {
  try {
    const user = await requireUser(request, response);
    if (!user) return;
    const token = requireString(request.body?.token, "token");
    response.json(await importWorkoutTemplatesByToken(user.id, token));
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u5BFC\u5165\u8BAD\u7EC3\u6A21\u677F\u5931\u8D25" });
  }
});
app.get("/api/admin/users", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    const users = await prisma.user.findMany({
      orderBy: [{ createdAt: "asc" }],
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });
    response.json({ users });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u7528\u6237\u5217\u8868\u5931\u8D25" });
  }
});
app.post("/api/admin/users", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    const username = requireString(request.body?.username ?? request.body?.email, "username").toLowerCase();
    const displayName = typeof request.body?.displayName === "string" && request.body.displayName.trim() ? request.body.displayName.trim() : username;
    const password = requireString(request.body?.password, "password");
    const role = request.body?.role === "admin" ? "admin" : "member";
    const user = await prisma.user.create({
      data: {
        username,
        email: username,
        displayName,
        passwordHash: await hashPassword(password),
        role
      }
    });
    await cloneDefaultPlanToUser(user.id);
    response.status(201).json({ user: toPublicUser(user) });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u521B\u5EFA\u7528\u6237\u5931\u8D25" });
  }
});
app.put("/api/admin/users/:userId", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    const displayName = typeof request.body?.displayName === "string" ? request.body.displayName.trim() : void 0;
    const isActive = typeof request.body?.isActive === "boolean" ? request.body.isActive : void 0;
    const role = request.body?.role === "admin" || request.body?.role === "member" ? request.body.role : void 0;
    const user = await prisma.user.update({
      where: { id: request.params.userId },
      data: {
        ...displayName ? { displayName } : {},
        ...isActive !== void 0 ? { isActive } : {},
        ...role ? { role } : {}
      }
    });
    response.json({ user: toPublicUser(user), isActive: user.isActive });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u66F4\u65B0\u7528\u6237\u5931\u8D25" });
  }
});
app.post("/api/admin/users/:userId/reset-password", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    const password = requireString(request.body?.password, "password");
    await prisma.user.update({
      where: { id: request.params.userId },
      data: { passwordHash: await hashPassword(password) }
    });
    await prisma.session.deleteMany({ where: { userId: request.params.userId } });
    response.json({ ok: true });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u91CD\u7F6E\u5BC6\u7801\u5931\u8D25" });
  }
});
app.get("/api/admin/users/:userId/app-data", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    response.json(await getUserAppData(request.params.userId));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u8BFB\u53D6\u7528\u6237\u6570\u636E\u5931\u8D25" });
  }
});
app.get("/api/admin/users/:userId/export", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    response.json(await getUserExportData(request.params.userId));
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u5BFC\u51FA\u7528\u6237\u6570\u636E\u5931\u8D25" });
  }
});
app.delete("/api/admin/users/:userId/data", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    await deleteUserData(request.params.userId);
    await prisma.session.deleteMany({ where: { userId: request.params.userId } });
    response.json({ ok: true });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u5220\u9664\u7528\u6237\u6570\u636E\u5931\u8D25" });
  }
});
app.post("/api/admin/users/:userId/clone-default-plan", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    await cloneDefaultPlanToUser(request.params.userId);
    response.json({ ok: true });
  } catch (error) {
    response.status(400).json({ error: error instanceof Error ? error.message : "\u514B\u9686\u9ED8\u8BA4\u8BA1\u5212\u5931\u8D25" });
  }
});
app.post("/api/admin/backup", async (request, response) => {
  try {
    const admin = await requireAdmin(request, response);
    if (!admin) return;
    response.json(await createSqliteBackup());
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "\u521B\u5EFA\u5907\u4EFD\u5931\u8D25" });
  }
});
app.use("/api", (_request, response) => {
  response.status(404).json({ error: "API endpoint not found" });
});
app.use(
  express.static(distDir, {
    index: false,
    maxAge: "1h",
    setHeaders(response, filePath) {
      if (filePath.includes(`${path2.sep}assets${path2.sep}`) || /\.(?:png|svg|ico|webmanifest|woff2)$/.test(filePath)) {
        response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
    }
  })
);
app.get(/.*/, (_request, response) => {
  response.setHeader("Cache-Control", "no-cache");
  response.sendFile(path2.join(distDir, "index.html"));
});
await configureDatabaseRuntime();
await ensureDatabaseSchema();
await ensureDataFile();
app.listen(port, bind, () => {
  console.log(`Bodybuild tracker listening on http://${bind}:${port}`);
  console.log(`Data file: ${dataFile}`);
});
