import * as d from "../src/dates.js";

export const cases = [
  {
    name: "isDateString godtar gyldige datoer",
    run(t) {
      t.true(d.isDateString("2026-10-24"));
      t.true(d.isDateString("2024-02-29"));
      t.true(d.isDateString("2000-02-29"));
    },
  },
  {
    name: "isDateString avviser ugyldige datoer",
    run(t) {
      t.false(d.isDateString("2026-02-29"));
      t.false(d.isDateString("2100-02-29"));
      t.false(d.isDateString("2026-13-01"));
      t.false(d.isDateString("2026-04-31"));
      t.false(d.isDateString("2026-1-01"));
      t.false(d.isDateString(""));
      t.false(d.isDateString(null));
    },
  },
  {
    name: "daysInMonth kjenner skuddår og månedslengder",
    run(t) {
      t.equal(d.daysInMonth(2026, 1), 31);
      t.equal(d.daysInMonth(2026, 2), 28);
      t.equal(d.daysInMonth(2024, 2), 29);
      t.equal(d.daysInMonth(2026, 4), 30);
      t.equal(d.daysInMonth(2026, 12), 31);
    },
  },
  {
    name: "isLeapYear følger 4/100/400-regelen",
    run(t) {
      t.true(d.isLeapYear(2024));
      t.false(d.isLeapYear(2025));
      t.false(d.isLeapYear(2100));
      t.true(d.isLeapYear(2000));
    },
  },
  {
    name: "makeDate klemmer dagen til månedens slutt",
    run(t) {
      t.equal(d.makeDate(2026, 2, 31), "2026-02-28");
      t.equal(d.makeDate(2024, 2, 31), "2024-02-29");
      t.equal(d.makeDate(2026, 4, 31), "2026-04-30");
      t.equal(d.makeDate(2026, 12, 31), "2026-12-31");
    },
  },
  {
    name: "addDays går over måneds- og årsskifte",
    run(t) {
      t.equal(d.addDays("2026-10-24", 10), "2026-11-03");
      t.equal(d.addDays("2026-12-31", 1), "2027-01-01");
      t.equal(d.addDays("2026-03-01", -1), "2026-02-28");
      t.equal(d.addDays("2026-10-24", 0), "2026-10-24");
    },
  },
  {
    name: "addMonths klemmer månedsslutt",
    run(t) {
      t.equal(d.addMonths("2026-01-31", 1), "2026-02-28");
      t.equal(d.addMonths("2024-01-31", 1), "2024-02-29");
      t.equal(d.addMonths("2026-08-31", 6), "2027-02-28");
      t.equal(d.addMonths("2026-12-31", 2), "2027-02-28");
      t.equal(d.addMonths("2026-01-15", 12), "2027-01-15");
      t.equal(d.addMonths("2026-03-31", -1), "2026-02-28");
    },
  },
  {
    name: "addYears klemmer 29. februar",
    run(t) {
      t.equal(d.addYears("2024-02-29", 1), "2025-02-28");
      t.equal(d.addYears("2025-02-28", 1), "2026-02-28");
      t.equal(d.addYears("2024-02-29", 4), "2028-02-29");
    },
  },
  {
    name: "addUnits støtter dag, uke, måned og år",
    run(t) {
      t.equal(d.addUnits("2026-10-24", 2, "week"), "2026-11-07");
      t.equal(d.addUnits("2026-01-31", 1, "month"), "2026-02-28");
      t.equal(d.addUnits("2024-02-29", 1, "year"), "2025-02-28");
      t.throws(() => d.addUnits("2026-01-01", 1, "time"), "Ukjent enhet");
    },
  },
  {
    name: "daysBetween teller hele dager",
    run(t) {
      t.equal(d.daysBetween("2026-10-24", "2026-11-23"), 30);
      t.equal(d.daysBetween("2026-11-23", "2026-10-24"), -30);
      t.equal(d.daysBetween("2024-02-28", "2024-03-01"), 2);
      t.equal(d.daysBetween("2026-10-24", "2026-10-24"), 0);
    },
  },
  {
    name: "nextFixedAnnual velger neste forekomst på eller etter i dag",
    run(t) {
      t.equal(d.nextFixedAnnual(10, 24, "2026-10-24"), "2026-10-24");
      t.equal(d.nextFixedAnnual(11, 1, "2026-10-24"), "2026-11-01");
      t.equal(d.nextFixedAnnual(10, 1, "2026-10-24"), "2027-10-01");
    },
  },
  {
    name: "nextFixedAnnual klemmer 29. februar i ikke-skuddår",
    run(t) {
      t.equal(d.nextFixedAnnual(2, 29, "2026-02-27"), "2026-02-28");
      t.equal(d.nextFixedAnnual(2, 29, "2027-02-28"), "2027-02-28");
      t.equal(d.nextFixedAnnual(2, 29, "2027-03-01"), "2028-02-29");
      t.equal(d.nextFixedAnnual(2, 29, "2028-02-28"), "2028-02-29");
    },
  },
  {
    name: "todayISO bruker lokal dato",
    run(t) {
      t.equal(d.todayISO(new Date(2026, 9, 24, 23, 59)), "2026-10-24");
      t.equal(d.todayISO(new Date(2026, 0, 1, 0, 1)), "2026-01-01");
    },
  },
  {
    name: "parseDate og formatDate er motsatte",
    run(t) {
      t.equal(d.formatDate(d.parseDate("2026-10-24")), "2026-10-24");
      t.throws(() => d.parseDate("2026-02-29"), "Ugyldig dato");
    },
  },
  {
    name: "formatNorwegianDate gir norsk dato",
    run(t) {
      const text = d.formatNorwegianDate("2026-10-01");
      t.true(text.includes("1."));
      t.true(text.includes("oktober"));
      t.true(text.includes("2026"));
    },
  },
];
