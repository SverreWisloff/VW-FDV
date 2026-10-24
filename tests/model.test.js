import * as m from "../src/model.js";

export const cases = [
  {
    name: "normalizeData fyller manglende felt",
    run(t) {
      const data = m.normalizeData({ areas: [{ id: "a1", name: "Ute" }] });
      t.equal(data.schemaVersion, 1);
      t.equal(data.updatedAt, "");
      t.deepEqual(data.tasks, []);
      t.deepEqual(data.completions, []);
      t.equal(data.areas.length, 1);
    },
  },
  {
    name: "normalizeData bevarer ukjente felt",
    run(t) {
      const data = m.normalizeData({
        extra: "behold",
        tasks: [{ id: "t1", title: "Test", schedule: { type: "fixed-annual", month: 1, day: 1 }, custom: 42 }],
      });
      t.equal(data.extra, "behold");
      t.equal(data.tasks[0].custom, 42);
      t.equal(data.tasks[0].active, true);
    },
  },
  {
    name: "normalizeData avviser ugyldig rot",
    run(t) {
      t.throws(() => m.normalizeData(null), "JSON-objekt");
      t.throws(() => m.normalizeData([]), "JSON-objekt");
    },
  },
  {
    name: "normalizeData avviser nyere schemaVersion",
    run(t) {
      t.throws(() => m.normalizeData({ schemaVersion: 2 }), "schemaVersion 2");
    },
  },
  {
    name: "createTask setter id, aktiv og createdAt",
    run(t) {
      const task = m.createTask({
        title: "  Stenge utekrana  ",
        schedule: { type: "fixed-annual", month: 10, day: 1 },
        createdAt: "2026-10-24",
      });
      t.true(task.id.startsWith("t"));
      t.equal(task.title, "Stenge utekrana");
      t.equal(task.active, true);
      t.equal(task.createdAt, "2026-10-24");
      t.equal(task.notes, "");
    },
  },
  {
    name: "createArea trimmer navn og gir id",
    run(t) {
      const area = m.createArea("  Ute  ");
      t.true(area.id.startsWith("a"));
      t.equal(area.name, "Ute");
    },
  },
  {
    name: "validateTask godtar gyldig fast dato",
    run(t) {
      t.deepEqual(
        m.validateTask({ title: "Test", schedule: { type: "fixed-annual", month: 10, day: 1 } }),
        [],
      );
    },
  },
  {
    name: "validateTask godtar 29. februar",
    run(t) {
      t.deepEqual(
        m.validateTask({ title: "Test", schedule: { type: "fixed-annual", month: 2, day: 29 } }),
        [],
      );
    },
  },
  {
    name: "validateTask avviser tom tittel og ugyldig dag",
    run(t) {
      const errors = m.validateTask({
        title: "   ",
        schedule: { type: "fixed-annual", month: 2, day: 30 },
      });
      t.equal(errors.length, 2);
      t.true(errors.some((text) => text.includes("Tittel")));
      t.true(errors.some((text) => text.includes("februar")));
    },
  },
  {
    name: "validateTask avviser ugyldig intervall",
    run(t) {
      const errors = m.validateTask({
        title: "Test",
        schedule: { type: "interval", count: 0, unit: "month" },
      });
      t.equal(errors.length, 1);
      t.true(errors[0].includes("Antall"));
    },
  },
  {
    name: "validateTask avviser ugyldig anker",
    run(t) {
      const errors = m.validateTask({
        title: "Test",
        schedule: { type: "interval", count: 1, unit: "month", anchor: "2026-02-30" },
      });
      t.equal(errors.length, 1);
      t.true(errors[0].includes("Anker"));
    },
  },
  {
    name: "findArea finner område eller null",
    run(t) {
      const data = { areas: [{ id: "a1", name: "Ute" }] };
      t.equal(m.findArea(data, "a1").name, "Ute");
      t.equal(m.findArea(data, "nope"), null);
    },
  },
];
