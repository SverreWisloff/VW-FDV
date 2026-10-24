import * as s from "../src/schedule.js";

const TODAY = "2026-10-24";

function task(id, schedule, extra = {}) {
  return { id, title: `Oppgave ${id}`, active: true, createdAt: "2026-01-01", ...extra, schedule };
}

function completed(taskId, dates) {
  return dates.map((doneOn, index) => ({ id: `c${taskId}${index}`, taskId, doneOn, cost: 0, note: "" }));
}

export const cases = [
  {
    name: "fast årlig dato senere i år gir samme år",
    run(t) {
      const r = s.computeDue(task("t1", { type: "fixed-annual", month: 11, day: 1 }), {
        completions: [],
        today: TODAY,
      });
      t.equal(r.dueDate, "2026-11-01");
      t.equal(r.days, 8);
      t.equal(r.status, "snart");
      t.equal(r.lastDone, null);
    },
  },
  {
    name: "fast årlig dato i dag gir i dag",
    run(t) {
      const r = s.computeDue(task("t1", { type: "fixed-annual", month: 10, day: 24 }), {
        completions: [],
        today: TODAY,
      });
      t.equal(r.dueDate, TODAY);
      t.equal(r.days, 0);
      t.equal(r.status, "snart");
    },
  },
  {
    name: "fast årlig dato som er passert gir neste år",
    run(t) {
      const r = s.computeDue(task("t1", { type: "fixed-annual", month: 10, day: 1 }), {
        completions: [],
        today: TODAY,
      });
      t.equal(r.dueDate, "2027-10-01");
      t.equal(r.status, "ok");
    },
  },
  {
    name: "fast 29. februar klemmes i ikke-skuddår",
    run(t) {
      const r = s.computeDue(task("t1", { type: "fixed-annual", month: 2, day: 29 }), {
        completions: [],
        today: "2026-02-27",
      });
      t.equal(r.dueDate, "2026-02-28");
      t.equal(r.days, 1);
      t.equal(r.status, "snart");
    },
  },
  {
    name: "historikk flytter ikke en fast årlig dato",
    run(t) {
      const r = s.computeDue(task("t1", { type: "fixed-annual", month: 10, day: 1 }), {
        completions: completed("t1", ["2026-10-20"]),
        today: TODAY,
      });
      t.equal(r.dueDate, "2027-10-01");
      t.equal(r.lastDone, "2026-10-20");
    },
  },
  {
    name: "intervall regnes fra siste fullføring",
    run(t) {
      const r = s.computeDue(
        task("t1", { type: "interval", count: 1, unit: "month", anchor: "2026-01-01" }),
        { completions: completed("t1", ["2026-01-15"]), today: "2026-02-01" },
      );
      t.equal(r.dueDate, "2026-02-15");
      t.equal(r.days, 14);
      t.equal(r.status, "snart");
    },
  },
  {
    name: "intervall bruker nyeste fullføring, ikke eldste",
    run(t) {
      const r = s.computeDue(task("t1", { type: "interval", count: 1, unit: "month" }), {
        completions: completed("t1", ["2026-01-15", "2026-02-15"]),
        today: "2026-03-01",
      });
      t.equal(r.dueDate, "2026-03-15");
      t.equal(r.lastDone, "2026-02-15");
    },
  },
  {
    name: "intervall fra månedsslutt klemmer til neste månedsslutt",
    run(t) {
      const r = s.computeDue(task("t1", { type: "interval", count: 1, unit: "month" }), {
        completions: completed("t1", ["2026-01-31"]),
        today: "2026-02-01",
      });
      t.equal(r.dueDate, "2026-02-28");
    },
  },
  {
    name: "intervall uten historikk bruker anker",
    run(t) {
      const r = s.computeDue(
        task("t1", { type: "interval", count: 6, unit: "month", anchor: "2026-05-01" }),
        { completions: [], today: TODAY },
      );
      t.equal(r.dueDate, "2026-11-01");
    },
  },
  {
    name: "intervall uten anker bruker createdAt",
    run(t) {
      const r = s.computeDue(
        task("t1", { type: "interval", count: 7, unit: "day" }, { createdAt: "2026-05-01" }),
        { completions: [], today: "2026-05-02" },
      );
      t.equal(r.dueDate, "2026-05-08");
    },
  },
  {
    name: "fullføring har forrang foran anker",
    run(t) {
      const r = s.computeDue(
        task("t1", { type: "interval", count: 1, unit: "month", anchor: "2020-01-01" }),
        { completions: completed("t1", ["2026-01-15"]), today: "2026-02-01" },
      );
      t.equal(r.dueDate, "2026-02-15");
    },
  },
  {
    name: "intervall uten grunnlag gir ukjent forfall",
    run(t) {
      const r = s.computeDue(
        task("t1", { type: "interval", count: 1, unit: "month" }, { createdAt: "" }),
        { completions: [], today: TODAY },
      );
      t.equal(r.dueDate, null);
      t.equal(r.status, "ukjent");
    },
  },
  {
    name: "forfalt dato flyttes ikke stille",
    run(t) {
      const r = s.computeDue(task("t1", { type: "interval", count: 1, unit: "year" }), {
        completions: completed("t1", ["2025-01-01"]),
        today: TODAY,
      });
      t.equal(r.dueDate, "2026-01-01");
      t.equal(r.status, "forfalt");
      t.true(r.days < 0);
    },
  },
  {
    name: "intervall over skuddår klemmer 29. februar",
    run(t) {
      const r = s.computeDue(task("t1", { type: "interval", count: 1, unit: "year" }), {
        completions: completed("t1", ["2024-02-29"]),
        today: "2025-01-01",
      });
      t.equal(r.dueDate, "2025-02-28");
    },
  },
  {
    name: "dueStatus har riktige grenser",
    run(t) {
      t.equal(s.dueStatus(-1), "forfalt");
      t.equal(s.dueStatus(0), "snart");
      t.equal(s.dueStatus(30), "snart");
      t.equal(s.dueStatus(31), "ok");
    },
  },
  {
    name: "ugyldig plan gir ukjent forfall",
    run(t) {
      const r = s.computeDue(task("t1", { type: "fixed-annual", month: 13, day: 1 }), {
        completions: [],
        today: TODAY,
      });
      t.equal(r.dueDate, null);
      t.equal(r.status, "ukjent");
    },
  },
  {
    name: "latestCompletion ser bort fra andre oppgaver og ugyldige datoer",
    run(t) {
      const completions = [
        ...completed("t1", ["2026-01-01"]),
        ...completed("t2", ["2026-09-01"]),
        { id: "x", taskId: "t1", doneOn: "2026-13-01" },
      ];
      t.equal(s.latestCompletion("t1", completions), "2026-01-01");
      t.equal(s.latestCompletion("t3", completions), null);
    },
  },
  {
    name: "buildTaskList sorterer forfalt, snart og senere",
    run(t) {
      const tasks = [
        task("a", { type: "fixed-annual", month: 12, day: 1 }),
        task("b", { type: "fixed-annual", month: 11, day: 15 }),
        task("c", { type: "fixed-annual", month: 10, day: 1 }),
        task("d", { type: "nonsense" }),
        task("e", { type: "interval", count: 1, unit: "year" }),
      ];
      const list = s.buildTaskList(tasks, {
        completions: completed("e", ["2025-01-01"]),
        today: TODAY,
      });
      t.deepEqual(
        list.map((item) => item.task.id),
        ["e", "b", "a", "c", "d"],
      );
      t.equal(list[0].status, "forfalt");
      t.equal(list[4].status, "ukjent");
    },
  },
  {
    name: "describeSchedule gir norsk tekst",
    run(t) {
      t.equal(s.describeSchedule({ type: "fixed-annual", month: 10, day: 1 }), "Hvert år 1. oktober");
      t.equal(s.describeSchedule({ type: "interval", count: 1, unit: "month" }), "Hver måned");
      t.equal(s.describeSchedule({ type: "interval", count: 2, unit: "month" }), "Hver 2. måned");
      t.equal(s.describeSchedule({ type: "interval", count: 1, unit: "year" }), "Hvert år");
      t.equal(s.describeSchedule({ type: "interval", count: 2, unit: "year" }), "Hvert 2. år");
      t.equal(s.describeSchedule({ type: "interval", count: 14, unit: "day" }), "Hver 14. dag");
      t.equal(s.describeSchedule(null), "Ingen plan");
    },
  },
];
