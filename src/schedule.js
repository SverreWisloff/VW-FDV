// Beregning av neste forfall og status. Rene funksjoner, ingen UI eller nettverk.

import {
  MONTH_NAMES,
  addUnits,
  daysBetween,
  isDateString,
  nextFixedAnnual,
} from "./dates.js";

export const UNITS = ["day", "week", "month", "year"];

const UNIT_SINGULAR = {
  day: "dag",
  week: "uke",
  month: "måned",
  year: "år",
};

export function isValidSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") return false;
  if (schedule.type === "fixed-annual") {
    return (
      Number.isInteger(schedule.month) &&
      schedule.month >= 1 &&
      schedule.month <= 12 &&
      Number.isInteger(schedule.day) &&
      schedule.day >= 1 &&
      schedule.day <= 31
    );
  }
  if (schedule.type === "interval") {
    return (
      Number.isInteger(schedule.count) &&
      schedule.count >= 1 &&
      UNITS.includes(schedule.unit)
    );
  }
  return false;
}

export function latestCompletion(taskId, completions = []) {
  let latest = null;
  for (const completion of completions) {
    if (!completion || completion.taskId !== taskId) continue;
    if (!isDateString(completion.doneOn)) continue;
    if (!latest || completion.doneOn > latest) latest = completion.doneOn;
  }
  return latest;
}

export function dueStatus(days) {
  if (days < 0) return "forfalt";
  if (days <= 30) return "snart";
  return "ok";
}

/**
 * Regner ut neste forfall for én oppgave.
 * Returnerer { dueDate, days, status, lastDone }.
 * dueDate er null når grunnlaget mangler eller planen er ugyldig.
 */
export function computeDue(task, { completions = [], today }) {
  if (!isDateString(today)) {
    throw new Error(`Ugyldig «i dag»-dato: ${today}`);
  }

  const lastDone = latestCompletion(task?.id, completions);

  if (!isValidSchedule(task?.schedule)) {
    return { dueDate: null, days: null, status: "ukjent", lastDone };
  }

  const schedule = task.schedule;
  let dueDate = null;

  if (schedule.type === "fixed-annual") {
    dueDate = nextFixedAnnual(schedule.month, schedule.day, today);
  }

  if (schedule.type === "interval") {
    const anchor = isDateString(schedule.anchor) ? schedule.anchor : null;
    const created = isDateString(task.createdAt) ? task.createdAt : null;
    const base = lastDone ?? anchor ?? created;
    if (base) dueDate = addUnits(base, schedule.count, schedule.unit);
  }

  if (!dueDate) {
    return { dueDate: null, days: null, status: "ukjent", lastDone };
  }

  const days = daysBetween(today, dueDate);
  return { dueDate, days, status: dueStatus(days), lastDone };
}

/**
 * Beregner og sorterer en liste. Forfalte kommer først fordi de har tidligst dato.
 * Oppgaver uten beregnbar dato havner sist.
 */
export function buildTaskList(tasks = [], { completions = [], today }) {
  return tasks
    .map((task) => ({ task, ...computeDue(task, { completions, today }) }))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return String(a.task.title).localeCompare(String(b.task.title), "nb");
    });
}

export function describeSchedule(schedule) {
  if (!schedule || typeof schedule !== "object") return "Ingen plan";

  if (schedule.type === "fixed-annual") {
    const month = MONTH_NAMES[schedule.month - 1];
    if (!month || !Number.isInteger(schedule.day)) return "Fast dato";
    return `Hvert år ${schedule.day}. ${month}`;
  }

  if (schedule.type === "interval") {
    const singular = UNIT_SINGULAR[schedule.unit];
    if (!singular || !Number.isInteger(schedule.count) || schedule.count < 1) {
      return "Intervall";
    }
    const prefix = schedule.unit === "year" ? "Hvert" : "Hver";
    if (schedule.count === 1) return `${prefix} ${singular}`;
    return `${prefix} ${schedule.count}. ${singular}`;
  }

  return "Ingen plan";
}
