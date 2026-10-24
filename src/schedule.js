// Hjelpere for hyppighet og fristberegning

import { addUnits, daysBetween, isDateString, nextFixedAnnual, todayISO } from "./dates.js";

export const UNITS = ["day", "week", "month", "year"];

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

export function describeFrequency(schedule) {
  if (!isValidSchedule(schedule)) return "Ikke satt";

  if (schedule.type === "fixed-annual") {
    const months = [
      "januar",
      "februar",
      "mars",
      "april",
      "mai",
      "juni",
      "juli",
      "august",
      "september",
      "oktober",
      "november",
      "desember",
    ];
    return `Hvert år ${schedule.day}. ${months[schedule.month - 1]}`;
  }

  if (schedule.type === "interval") {
    const count = schedule.count;
    const unit = schedule.unit;
    const map = { day: "dag", week: "uke", month: "måned", year: "år" };
    const singular = map[unit];
    if (!singular) return "Intervall";
    if (count === 1) {
      if (unit === "month") return "Hver måned";
      if (unit === "year") return "Hvert år";
      return `Hver ${singular}`;
    }
    if (unit === "year") return `Hvert ${count}. ${singular}`;
    return `Hver ${count}. ${singular}`;
  }

  return "Ikke satt";
}

export function computeDueDate(schedule, { anchor = null, from = todayISO() } = {}) {
  if (!isValidSchedule(schedule) || !isDateString(from)) return "";

  if (schedule.type === "fixed-annual") {
    return nextFixedAnnual(schedule.month, schedule.day, from);
  }

  if (schedule.type === "interval") {
    const base = isDateString(anchor) ? anchor : from;
    return addUnits(base, schedule.count, schedule.unit);
  }

  return "";
}

export function getDueInfo(dueDate, from = todayISO()) {
  if (!isDateString(dueDate) || !isDateString(from)) {
    return { days: null, status: "ukjent" };
  }
  const days = daysBetween(from, dueDate);
  if (days < 0) return { days, status: "forfalt" };
  if (days <= 30) return { days, status: "snart" };
  return { days, status: "ok" };
}
