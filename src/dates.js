// Kalenderaritmetikk for datoer på formen YYYY-MM-DD.
// Alle funksjoner er rene og regner i UTC, slik at sommertid ikke flytter dager.
// Ingen UI- eller nettverkskall her.

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MONTH_NAMES = [
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

function pad2(value) {
  return String(value).padStart(2, "0");
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year, month) {
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Ugyldig måned: ${month}`);
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isDateString(value) {
  if (typeof value !== "string") return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > daysInMonth(year, month)) return false;
  return true;
}

export function parseDate(value) {
  if (!isDateString(value)) {
    throw new Error(`Ugyldig dato: ${value}`);
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDate(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

// Dagens dato i brukerens lokale tidssone, ikke UTC.
export function todayISO(now = new Date()) {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

// Lager en gyldig dato og klemmer dagen til siste dag i måneden.
export function makeDate(year, month, day) {
  const clampedDay = Math.min(Math.max(1, day), daysInMonth(year, month));
  return formatDate(new Date(Date.UTC(year, month - 1, clampedDay)));
}

export function compareDates(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

export function addDays(dateString, days) {
  const date = parseDate(dateString);
  return formatDate(new Date(date.getTime() + days * DAY_MS));
}

export function addMonths(dateString, months) {
  const date = parseDate(dateString);
  const totalMonths = date.getUTCFullYear() * 12 + date.getUTCMonth() + months;
  const year = Math.floor(totalMonths / 12);
  const monthIndex = totalMonths - year * 12;
  return makeDate(year, monthIndex + 1, date.getUTCDate());
}

export function addYears(dateString, years) {
  const date = parseDate(dateString);
  const year = date.getUTCFullYear() + years;
  return makeDate(year, date.getUTCMonth() + 1, date.getUTCDate());
}

export function addUnits(dateString, count, unit) {
  switch (unit) {
    case "day":
      return addDays(dateString, count);
    case "week":
      return addDays(dateString, count * 7);
    case "month":
      return addMonths(dateString, count);
    case "year":
      return addYears(dateString, count);
    default:
      throw new Error(`Ukjent enhet: ${unit}`);
  }
}

// Antall dager fra `from` til `to`. Positivt når `to` er senere.
export function daysBetween(from, to) {
  const start = parseDate(from);
  const end = parseDate(to);
  return Math.round((end.getTime() - start.getTime()) / DAY_MS);
}

// Neste forekomst av måned/dag på eller etter `from`.
export function nextFixedAnnual(month, day, from) {
  const fromDate = parseDate(from);
  const year = fromDate.getUTCFullYear();
  const thisYear = makeDate(year, month, day);
  if (compareDates(thisYear, from) >= 0) return thisYear;
  return makeDate(year + 1, month, day);
}

export function formatNorwegianDate(dateString) {
  const date = parseDate(dateString);
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
