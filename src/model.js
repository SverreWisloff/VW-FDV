// Validering, id-er og normalisering av datamodellen.

import { MONTH_NAMES, daysInMonth, isDateString, todayISO } from "./dates.js";
import { UNITS, isValidSchedule } from "./schedule.js";

export const SCHEMA_VERSION = 1;

export function newId(prefix) {
  const raw = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}${raw.replace(/-/g, "").slice(0, 9)}`;
}

export function createArea(name) {
  return { id: newId("a"), name: String(name ?? "").trim() };
}

export function createTask({ title, areaId = "", notes = "", schedule, createdAt } = {}) {
  return {
    id: newId("t"),
    title: String(title ?? "").trim(),
    areaId: String(areaId ?? ""),
    notes: String(notes ?? ""),
    active: true,
    createdAt: createdAt || todayISO(),
    schedule,
  };
}

function normalizeArea(area) {
  if (!area || typeof area !== "object") return null;
  return {
    ...area,
    id: typeof area.id === "string" && area.id ? area.id : newId("a"),
    name: typeof area.name === "string" ? area.name : "",
  };
}

function normalizeTask(task) {
  if (!task || typeof task !== "object") return null;
  return {
    ...task,
    id: typeof task.id === "string" && task.id ? task.id : newId("t"),
    title: typeof task.title === "string" ? task.title : "",
    areaId: typeof task.areaId === "string" ? task.areaId : "",
    notes: typeof task.notes === "string" ? task.notes : "",
    active: task.active !== false,
    createdAt: isDateString(task.createdAt) ? task.createdAt : "",
    schedule: task.schedule && typeof task.schedule === "object" ? task.schedule : null,
  };
}

function normalizeCompletion(completion) {
  if (!completion || typeof completion !== "object") return null;
  return {
    ...completion,
    id: typeof completion.id === "string" && completion.id ? completion.id : newId("c"),
    taskId: typeof completion.taskId === "string" ? completion.taskId : "",
    doneOn: typeof completion.doneOn === "string" ? completion.doneOn : "",
    cost: Number.isFinite(completion.cost) ? completion.cost : 0,
    note: typeof completion.note === "string" ? completion.note : "",
  };
}

export function normalizeData(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("data.json må inneholde et JSON-objekt.");
  }

  const version = Number.isInteger(raw.schemaVersion) ? raw.schemaVersion : SCHEMA_VERSION;
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `data.json har schemaVersion ${version}, men appen støtter ${SCHEMA_VERSION}. Oppdater appen før du lagrer.`,
    );
  }

  return {
    ...raw,
    schemaVersion: SCHEMA_VERSION,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    areas: Array.isArray(raw.areas) ? raw.areas.map(normalizeArea).filter(Boolean) : [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks.map(normalizeTask).filter(Boolean) : [],
    completions: Array.isArray(raw.completions)
      ? raw.completions.map(normalizeCompletion).filter(Boolean)
      : [],
  };
}

export function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: "",
    areas: [],
    tasks: [],
    completions: [],
  };
}

/**
 * Returnerer en liste med norske feilmeldinger. Tom liste betyr gyldig.
 */
export function validateTask(task) {
  const errors = [];

  if (!task || typeof task !== "object") {
    return ["Oppgaven mangler data."];
  }

  if (!String(task.title ?? "").trim()) {
    errors.push("Tittel må fylles ut.");
  }

  const schedule = task.schedule;
  if (
    !schedule ||
    typeof schedule !== "object" ||
    (schedule.type !== "fixed-annual" && schedule.type !== "interval")
  ) {
    errors.push("Velg en gyldig plan.");
    return errors;
  }

  if (schedule.type === "fixed-annual") {
    if (!Number.isInteger(schedule.month) || schedule.month < 1 || schedule.month > 12) {
      errors.push("Måned må være mellom 1 og 12.");
    } else if (
      !Number.isInteger(schedule.day) ||
      schedule.day < 1 ||
      schedule.day > daysInMonth(2024, schedule.month)
    ) {
      errors.push(`Dag må være mellom 1 og ${daysInMonth(2024, schedule.month)} i ${MONTH_NAMES[schedule.month - 1]}.`);
    }
  }

  if (schedule.type === "interval") {
    if (!UNITS.includes(schedule.unit)) {
      errors.push("Velg en gyldig enhet.");
    }
    if (!Number.isInteger(schedule.count) || schedule.count < 1 || schedule.count > 120) {
      errors.push("Antall må være mellom 1 og 120.");
    }
    if (schedule.anchor && !isDateString(schedule.anchor)) {
      errors.push("Anker må være en gyldig dato.");
    }
  }

  return errors;
}

export function findArea(data, areaId) {
  return data?.areas?.find((area) => area.id === areaId) ?? null;
}
