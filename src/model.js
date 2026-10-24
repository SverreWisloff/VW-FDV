// Validering, id-er, normalisering og migrering av datamodellen.

import { MONTH_NAMES, daysInMonth, isDateString, todayISO } from "./dates.js";
import { UNITS, isValidSchedule } from "./schedule.js";

export const SCHEMA_VERSION = 2;

export function newId(prefix = "id") {
  const raw = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
  return `${prefix}${raw.replace(/-/g, "").slice(0, 10)}`;
}

export function emptyData() {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: "",
    areas: [],
    rooms: [],
    fdvTaskTypes: [],
    logEntries: [],
    // beholdes midlertidig for migrering / bakoverkompat
    tasks: [],
    completions: [],
  };
}

function normalizeArea(area) {
  if (!area || typeof area !== "object") return null;
  return {
    ...area,
    id: typeof area.id === "string" && area.id ? area.id : newId("a"),
    name: typeof area.name === "string" ? area.name.trim() : "",
  };
}

function normalizeRoom(room) {
  if (!room || typeof room !== "object") return null;
  return {
    ...room,
    id: typeof room.id === "string" && room.id ? room.id : newId("r"),
    name: typeof room.name === "string" ? room.name.trim() : "",
    areaId: typeof room.areaId === "string" ? room.areaId : "",
  };
}

function normalizeFdvType(type) {
  if (!type || typeof type !== "object") return null;

  const rooms = Array.isArray(type.rooms)
    ? type.rooms.filter((r) => typeof r === "string")
    : Array.isArray(type.roomIds)
      ? type.roomIds.filter((r) => typeof r === "string")
      : [];

  const frequency = type.frequency && typeof type.frequency === "object" ? type.frequency : null;
  const schedule = type.schedule && typeof type.schedule === "object" ? type.schedule : frequency;

  return {
    ...type,
    id: typeof type.id === "string" && type.id ? type.id : newId("ft"),
    name: typeof type.name === "string" ? type.name.trim() : "",
    rooms,
    roomIds: rooms,
    description: typeof type.description === "string" ? type.description : "",
    frequency: isValidSchedule(schedule) ? schedule : schedule,
    schedule: isValidSchedule(schedule) ? schedule : schedule,
    createdAt: isDateString(type.createdAt) ? type.createdAt : todayISO(),
    active: type.active !== false,
  };
}

function normalizeLogEntry(entry) {
  if (!entry || typeof entry !== "object") return null;

  return {
    ...entry,
    id: typeof entry.id === "string" && entry.id ? entry.id : newId("lg"),
    typeId: typeof entry.typeId === "string" ? entry.typeId : "",
    name: typeof entry.name === "string" ? entry.name : "",
    rooms: Array.isArray(entry.rooms) ? entry.rooms.filter((r) => typeof r === "string") : [],
    roomIds: Array.isArray(entry.roomIds) ? entry.roomIds.filter((r) => typeof r === "string") : [],
    description: typeof entry.description === "string" ? entry.description : "",
    frequency: entry.frequency && typeof entry.frequency === "object" ? entry.frequency : entry.schedule || null,
    schedule: entry.schedule && typeof entry.schedule === "object" ? entry.schedule : entry.frequency || null,
    dueDate: isDateString(entry.dueDate) ? entry.dueDate : (isDateString(entry.dueOn) ? entry.dueOn : ""),
    done: entry.done === true || entry.completed === true || entry.utført === true,
    doneDate: isDateString(entry.doneDate)
      ? entry.doneDate
      : isDateString(entry.completedOn)
        ? entry.completedOn
        : isDateString(entry.doneOn)
          ? entry.doneOn
          : isDateString(entry.utførtDato)
            ? entry.utførtDato
            : "",
    note: typeof entry.note === "string" ? entry.note : typeof entry.merknad === "string" ? entry.merknad : "",
    merknad: typeof entry.merknad === "string" ? entry.merknad : typeof entry.note === "string" ? entry.note : "",
  };
}

function migrateFromOld(raw) {
  const data = {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
    areas: Array.isArray(raw.areas) ? raw.areas.map(normalizeArea).filter(Boolean) : [],
    rooms: Array.isArray(raw.rooms) ? raw.rooms.map(normalizeRoom).filter(Boolean) : [],
    fdvTaskTypes: [],
    logEntries: [],
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    completions: Array.isArray(raw.completions) ? raw.completions : [],
  };

  // Forsøk å migrere gamle tasks til fdvTaskTypes hvis ingen nye finnes
  if (Array.isArray(raw.tasks)) {
    for (const task of raw.tasks) {
      if (!task || typeof task !== "object") continue;
      data.fdvTaskTypes.push(
        normalizeFdvType({
          id: task.id,
          name: task.title,
          rooms: [],
          roomIds: [],
          description: task.notes || "",
          frequency: task.schedule,
          schedule: task.schedule,
          createdAt: task.createdAt || todayISO(),
          active: task.active !== false,
        }),
      );
    }
  }

  // Migrer completions til logg-oppgaver
  if (Array.isArray(raw.completions)) {
    for (const comp of raw.completions) {
      if (!comp || typeof comp !== "object") continue;
      const type = data.fdvTaskTypes.find((t) => t.id === comp.taskId);
      data.logEntries.push(
        normalizeLogEntry({
          id: comp.id || newId("lg"),
          typeId: comp.taskId,
          name: type?.name || "",
          rooms: type?.rooms || type?.roomIds || [],
          description: type?.description || "",
          frequency: type?.frequency || type?.schedule || null,
          schedule: type?.schedule || type?.frequency || null,
          dueDate: comp.doneOn || "",
          done: true,
          doneDate: comp.doneOn || "",
          note: comp.note || "",
          merknad: comp.note || "",
        }),
      );
    }
  }

  return data;
}

export function normalizeData(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("data.json må inneholde et JSON-objekt.");
  }

  const version = Number.isInteger(raw.schemaVersion) ? raw.schemaVersion : 1;

  if (version >= 2 && Array.isArray(raw.fdvTaskTypes)) {
    const data = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : "",
      areas: Array.isArray(raw.areas) ? raw.areas.map(normalizeArea).filter(Boolean) : [],
      rooms: Array.isArray(raw.rooms) ? raw.rooms.map(normalizeRoom).filter(Boolean) : [],
      fdvTaskTypes: Array.isArray(raw.fdvTaskTypes) ? raw.fdvTaskTypes.map(normalizeFdvType).filter(Boolean) : [],
      logEntries: Array.isArray(raw.logEntries) ? raw.logEntries.map(normalizeLogEntry).filter(Boolean) : [],
      tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
      completions: Array.isArray(raw.completions) ? raw.completions : [],
    };
    return data;
  }

  return migrateFromOld(raw);
}

export function createFdvType({ name, rooms = [], description = "", frequency = null } = {}) {
  return normalizeFdvType({
    id: newId("ft"),
    name: String(name ?? "").trim(),
    rooms: Array.isArray(rooms) ? rooms.filter((r) => typeof r === "string") : [],
    description: String(description ?? ""),
    frequency,
    schedule: frequency,
    createdAt: todayISO(),
    active: true,
  });
}

export function createLogEntryFromType(type, { dueDate = "", done = false, note = "" } = {}) {
  if (!type) return null;
  const normalized = normalizeFdvType(type);
  return normalizeLogEntry({
    id: newId("lg"),
    typeId: normalized.id,
    name: normalized.name,
    rooms: normalized.rooms,
    roomIds: normalized.rooms,
    description: normalized.description,
    frequency: normalized.frequency,
    schedule: normalized.schedule,
    dueDate,
    done,
    doneDate: done ? dueDate || todayISO() : "",
    note,
    merknad: note,
  });
}

export function validateFdvType(type) {
  const errors = [];
  if (!type || typeof type !== "object") return ["FDV-oppgavetype mangler data."];
  if (!String(type.name ?? "").trim()) errors.push("Oppgavenavn må fylles ut.");
  const schedule = type.frequency || type.schedule;
  if (schedule && !isValidSchedule(schedule)) {
    errors.push("Ugyldig «hvor ofte».");
  }
  if (!Array.isArray(type.rooms) || type.rooms.length === 0) {
    errors.push("Velg minst ett rom/område.");
  }
  return errors;
}
