import {
  GitHubError,
  clearToken,
  createClient,
  getConfig,
  getToken,
  hasToken,
  saveConfig,
  saveToken,
} from "./github.js";
import { buildTaskList, computeDue, describeSchedule, isValidSchedule } from "./schedule.js";
import { MONTH_NAMES, daysInMonth, isDateString, todayISO } from "./dates.js";
import { createArea, createTask, emptyData, findArea, normalizeData, newId, validateTask } from "./model.js";

const els = {
  repoStatus: document.querySelector("#repoStatus"),
  reloadAllBtn: document.querySelector("#reloadAllBtn"),
  settingsBtn: document.querySelector("#settingsBtn"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".tab-panel"),
  newTaskBtn: document.querySelector("#newTaskBtn"),
  taskList: document.querySelector("#taskList"),
  taskCount: document.querySelector("#taskCount"),
  taskEmpty: document.querySelector("#taskEmpty"),
  editorTitle: document.querySelector("#editorTitle"),
  editorSubtitle: document.querySelector("#editorSubtitle"),
  dirtyBadge: document.querySelector("#dirtyBadge"),
  taskForm: document.querySelector("#taskForm"),
  taskId: document.querySelector("#taskId"),
  taskTitle: document.querySelector("#taskTitle"),
  taskArea: document.querySelector("#taskArea"),
  taskNotes: document.querySelector("#taskNotes"),
  taskActive: document.querySelector("#taskActive"),
  taskCreatedAt: document.querySelector("#taskCreatedAt"),
  scheduleBtns: document.querySelectorAll(".segmented button"),
  panelFixed: document.querySelector("#panelFixed"),
  panelInterval: document.querySelector("#panelInterval"),
  fixedMonth: document.querySelector("#fixedMonth"),
  fixedDay: document.querySelector("#fixedDay"),
  intervalCount: document.querySelector("#intervalCount"),
  intervalUnit: document.querySelector("#intervalUnit"),
  intervalAnchor: document.querySelector("#intervalAnchor"),
  schedulePreview: document.querySelector("#schedulePreview"),
  taskFormError: document.querySelector("#taskFormError"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  deleteTaskBtn: document.querySelector("#deleteTaskBtn"),
  noTaskSelected: document.querySelector("#noTaskSelected"),
  areaInput: document.querySelector("#areaInput"),
  addAreaBtn: document.querySelector("#addAreaBtn"),
  areaListEl: document.querySelector("#areaList"),
  settingsForm: document.querySelector("#settingsForm"),
  setOwner: document.querySelector("#setOwner"),
  setRepo: document.querySelector("#setRepo"),
  setBranch: document.querySelector("#setBranch"),
  setToken: document.querySelector("#setToken"),
  tokenInfo: document.querySelector("#tokenInfo"),
  clearTokenBtn: document.querySelector("#clearTokenBtn"),
  log: document.querySelector("#log"),
};

const state = {
  client: null,
  data: null,
  sha: "",
  dirty: false,
  busy: false,
  selectedTaskId: null,
  scheduleType: "fixed-annual",
  today: todayISO(),
};

function log(message, kind = "info") {
  const item = document.createElement("li");
  item.className = `log-${kind}`;
  const time = new Date().toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  item.textContent = `${time} – ${message}`;
  els.log.prepend(item);
}

function setBusy(busy) {
  state.busy = busy;
  document.querySelectorAll("button").forEach((button) => {
    if (button.id === "clearTokenBtn" || button.classList.contains("tab")) return;
    button.disabled = busy;
  });
}

function showTab(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  els.panels.forEach((panel) => {
    panel.hidden = panel.dataset.panel !== name;
  });
}

function populateMonths() {
  if (els.fixedMonth.options.length) return;
  for (let m = 1; m <= 12; m += 1) {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = MONTH_NAMES[m - 1];
    els.fixedMonth.append(opt);
  }
}

function populateDays(month) {
  const days = daysInMonth(2024, month);
  const current = Number(els.fixedDay.value) || days;
  els.fixedDay.replaceChildren();
  for (let d = 1; d <= days; d += 1) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = String(d);
    els.fixedDay.append(opt);
  }
  els.fixedDay.value = String(Math.min(current, days));
}

function syncScheduleUI() {
  els.panelFixed.hidden = state.scheduleType !== "fixed-annual";
  els.panelInterval.hidden = state.scheduleType !== "interval";
  els.scheduleBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.schedule === state.scheduleType));
  updateSchedulePreview();
}

function updateSchedulePreview() {
  const schedule = readScheduleFromForm();
  if (!isValidSchedule(schedule)) {
    els.schedulePreview.textContent = "Ugyldig plan – sjekk feltene ovenfor.";
    return;
  }
  els.schedulePreview.textContent = `Norsk beskrivelse: ${describeSchedule(schedule)}. Neste forfall beregnes når oppgaven vises i listen.`;
}

function readScheduleFromForm() {
  if (state.scheduleType === "fixed-annual") {
    return { type: "fixed-annual", month: Number(els.fixedMonth.value), day: Number(els.fixedDay.value) };
  }
  return {
    type: "interval",
    count: Number(els.intervalCount.value),
    unit: els.intervalUnit.value,
    anchor: els.intervalAnchor.value || undefined,
  };
}

function writeScheduleToForm(schedule) {
  if (!schedule || typeof schedule !== "object") {
    state.scheduleType = "fixed-annual";
    syncScheduleUI();
    return;
  }
  state.scheduleType = schedule.type === "interval" ? "interval" : "fixed-annual";
  syncScheduleUI();

  if (state.scheduleType === "fixed-annual") {
    els.fixedMonth.value = String(schedule.month ?? 1);
    populateDays(Number(els.fixedMonth.value));
    els.fixedDay.value = String(schedule.day ?? 1);
  } else {
    els.intervalCount.value = String(schedule.count ?? 1);
    els.intervalUnit.value = schedule.unit ?? "month";
    els.intervalAnchor.value = schedule.anchor ?? "";
  }
  updateSchedulePreview();
}

function fillAreas() {
  const areas = state.data?.areas ?? [];
  const current = els.taskArea.value;
  els.taskArea.replaceChildren();
  const none = document.createElement("option");
  none.value = "";
  none.textContent = "Ingen område";
  els.taskArea.append(none);
  for (const area of areas) {
    const opt = document.createElement("option");
    opt.value = area.id;
    opt.textContent = area.name;
    els.taskArea.append(opt);
  }
  if ([...els.taskArea.options].some((o) => o.value === current)) els.taskArea.value = current;
}

function renderAreas() {
  const areas = state.data?.areas ?? [];
  els.areaListEl.replaceChildren();
  if (areas.length === 0) {
    const item = document.createElement("div");
    item.className = "empty-state";
    item.textContent = "Ingen områder.";
    els.areaListEl.append(item);
    return;
  }
  for (const area of areas) {
    const row = document.createElement("div");
    row.className = "check";
    const span = document.createElement("span");
    span.textContent = area.name;
    row.append(span);
    els.areaListEl.append(row);
  }
}

function renderTasks() {
  if (!state.data) {
    els.taskList.replaceChildren();
    els.taskCount.textContent = "0 oppgaver";
    els.taskEmpty.hidden = false;
    return;
  }

  const tasks = (state.data.tasks ?? []).filter((t) => t.active !== false);
  const list = buildTaskList(tasks, { completions: state.data.completions ?? [], today: state.today });
  els.taskList.replaceChildren();
  els.taskCount.textContent = `${list.length} ${list.length === 1 ? "oppgave" : "oppgaver"}`;
  els.taskEmpty.hidden = list.length > 0;

  for (const item of list) {
    const btn = document.createElement("button");
    btn.className = "task-item";
    btn.type = "button";
    btn.dataset.id = item.task.id;
    if (item.task.id === state.selectedTaskId) btn.classList.add("active");

    const dot = document.createElement("div");
    dot.className = `pill ${item.status}`;
    dot.textContent = item.status === "forfalt" ? "Forfalt" : item.status === "snart" ? "Snart" : item.status === "ok" ? "I orden" : "Ukjent";

    const main = document.createElement("div");
    main.className = "task-main";
    const title = document.createElement("div");
    title.className = "task-title";
    title.textContent = item.task.title || "(uten tittel)";
    const meta = document.createElement("div");
    meta.className = "task-meta";
    const area = findArea(state.data, item.task.areaId);
    if (area) {
      const areaSpan = document.createElement("span");
      areaSpan.textContent = area.name;
      meta.append(areaSpan);
    }
    const plan = document.createElement("span");
    plan.className = area ? "dot" : "";
    plan.textContent = describeSchedule(item.task.schedule);
    meta.append(plan);
    if (item.dueDate) {
      const due = document.createElement("span");
      due.className = area || meta.children.length > 0 ? "dot" : "";
      due.textContent = `Forfall ${item.dueDate}`;
      meta.append(due);
    }
    main.append(title, meta);

    const right = document.createElement("div");
    right.className = "muted";
    right.textContent = item.status === "forfalt" && item.days !== null ? `${Math.abs(item.days)} d siden` : item.days !== null ? `om ${item.days} d` : "";

    btn.append(dot, main, right);
    btn.addEventListener("click", () => selectTask(item.task.id));
    els.taskList.append(btn);
  }
}

function selectTask(id) {
  const task = state.data?.tasks?.find((t) => t.id === id);
  if (!task) return;
  state.selectedTaskId = id;
  els.taskForm.hidden = false;
  els.noTaskSelected.hidden = true;
  els.editorTitle.textContent = task.title || "(uten tittel)";
  els.editorSubtitle.textContent = "Rediger oppgaven og lagre til GitHub";
  els.taskId.value = task.id;
  els.taskTitle.value = task.title || "";
  els.taskNotes.value = task.notes || "";
  els.taskActive.value = task.active === false ? "false" : "true";
  els.taskCreatedAt.value = task.createdAt || "";
  els.taskArea.value = task.areaId || "";
  writeScheduleToForm(task.schedule);
  els.taskFormError.hidden = true;
  renderTasks();
}

function newTask() {
  state.selectedTaskId = null;
  els.taskForm.hidden = false;
  els.noTaskSelected.hidden = true;
  els.editorTitle.textContent = "Ny oppgave";
  els.editorSubtitle.textContent = "Fyll inn detaljene og lagre til GitHub";
  els.taskId.value = "";
  els.taskTitle.value = "";
  els.taskNotes.value = "";
  els.taskActive.value = "true";
  els.taskCreatedAt.value = state.today;
  els.taskArea.value = "";
  state.scheduleType = "fixed-annual";
  populateMonths();
  populateDays(1);
  els.fixedMonth.value = "10";
  populateDays(10);
  els.fixedDay.value = "1";
  els.intervalCount.value = "1";
  els.intervalUnit.value = "month";
  els.intervalAnchor.value = state.today;
  syncScheduleUI();
  els.taskFormError.hidden = true;
  renderTasks();
  showTab("oppgaver");
  els.taskTitle.focus();
}

function makeClient() {
  if (state.client) return state.client;
  state.client = createClient(getConfig());
  return state.client;
}

function updateRepoStatus() {
  const config = getConfig();
  if (!config.owner || !config.repo) {
    els.repoStatus.textContent = "Ikke tilkoblet";
    return;
  }
  els.repoStatus.textContent = `${config.owner}/${config.repo}@${config.branch || "main"}`;
}

function markDirty() {
  state.dirty = true;
  els.dirtyBadge.hidden = false;
}

function renderAll() {
  fillAreas();
  renderAreas();
  renderTasks();
  updateRepoStatus();
}

async function loadFromGitHub() {
  if (state.busy) return;
  const config = getConfig();
  if (!config.owner || !config.repo) {
    log("Fyll inn eier og repo i Innstillinger.", "warn");
    showTab("innstillinger");
    return;
  }
  try {
    setBusy(true);
    const client = makeClient();
    state.client = client;
    const { data, sha } = await client.readData();
    state.data = normalizeData(data ?? emptyData());
    state.sha = sha;
    state.dirty = false;
    els.dirtyBadge.hidden = true;
    renderAll();
    log(`Lastet data.json (sha ${sha.slice(0, 7)}).`, "ok");
  } catch (error) {
    if (error instanceof GitHubError) {
      log(error.message, error.kind === "unauthorized" || error.kind === "forbidden" ? "warn" : "error");
    } else {
      log("Uventet feil under lasting.", "error");
      console.error(error);
    }
  } finally {
    setBusy(false);
  }
}

async function saveData(message) {
  if (state.busy) return;
  if (!state.data) {
    log("Last data først.", "warn");
    return;
  }
  if (!hasToken()) {
    log("Du trenger et token for å lagre. Se Innstillinger.", "warn");
    showTab("innstillinger");
    return;
  }
  try {
    setBusy(true);
    const data = { ...state.data, updatedAt: new Date().toISOString() };
    const result = await makeClient().writeData(data, state.sha, message);
    state.data = data;
    state.sha = result.sha || state.sha;
    state.dirty = false;
    els.dirtyBadge.hidden = true;
    renderAll();
    log(`Lagret. Commit ${(result.commit?.sha ?? "").slice(0, 7) || "opprettet"}.`, "ok");
  } catch (error) {
    if (error instanceof GitHubError && error.kind === "conflict") {
      log(error.message, "warn");
      if (confirm("Filen er endret. Laste på nytt fra GitHub og overskrive med dine endringer?")) {
        const client = makeClient();
        const fresh = await client.readData();
        await saveData(message);
        return;
      }
    } else if (error instanceof GitHubError) {
      log(error.message, "error");
    } else {
      log("Uventet feil under lagring.", "error");
      console.error(error);
    }
  } finally {
    setBusy(false);
  }
}

els.tabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
els.reloadAllBtn.addEventListener("click", () => loadFromGitHub());
els.settingsBtn.addEventListener("click", () => showTab("innstillinger"));
els.newTaskBtn.addEventListener("click", newTask);

els.scheduleBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.scheduleType = btn.dataset.schedule;
    syncScheduleUI();
  });
});

els.fixedMonth.addEventListener("change", () => {
  populateDays(Number(els.fixedMonth.value));
  updateSchedulePreview();
});

els.fixedDay.addEventListener("change", updateSchedulePreview);
els.intervalCount.addEventListener("input", updateSchedulePreview);
els.intervalUnit.addEventListener("change", updateSchedulePreview);
els.intervalAnchor.addEventListener("change", updateSchedulePreview);

els.taskForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.data) {
    log("Last data først.", "warn");
    return;
  }

  const schedule = readScheduleFromForm();
  const errors = validateTask({
    title: els.taskTitle.value,
    schedule,
  });

  if (errors.length) {
    els.taskFormError.textContent = errors.join(" ");
    els.taskFormError.hidden = false;
    return;
  }
  els.taskFormError.hidden = true;

  const id = els.taskId.value || newId("t");
  const task = {
    id,
    title: els.taskTitle.value.trim(),
    areaId: els.taskArea.value,
    notes: els.taskNotes.value,
    active: els.taskActive.value === "true",
    createdAt: els.taskCreatedAt.value || state.today,
    schedule,
  };

  state.data.tasks = Array.isArray(state.data.tasks) ? state.data.tasks : [];
  const idx = state.data.tasks.findIndex((t) => t.id === id);
  if (idx >= 0) state.data.tasks[idx] = { ...state.data.tasks[idx], ...task };
  else state.data.tasks.push(task);

  state.selectedTaskId = id;
  markDirty();
  renderAll();
  await saveData(id ? `Oppdater oppgave: ${task.title}` : `Legg til oppgave: ${task.title}`);
});

els.cancelEditBtn.addEventListener("click", () => {
  if (state.selectedTaskId) selectTask(state.selectedTaskId);
  else {
    els.taskForm.hidden = true;
    els.noTaskSelected.hidden = false;
  }
});

els.deleteTaskBtn.addEventListener("click", async () => {
  if (!state.selectedTaskId || !state.data) return;
  if (!confirm("Deaktivere denne oppgaven? Den forsvinner fra listen, men blir liggende i historikken.")) return;
  const idx = state.data.tasks.findIndex((t) => t.id === state.selectedTaskId);
  if (idx >= 0) state.data.tasks[idx] = { ...state.data.tasks[idx], active: false };
  markDirty();
  renderAll();
  await saveData(`Deaktiver oppgave`);
  els.taskForm.hidden = true;
  els.noTaskSelected.hidden = false;
  state.selectedTaskId = null;
  renderTasks();
});

els.addAreaBtn.addEventListener("click", async () => {
  const name = els.areaInput.value.trim();
  if (!name) return;
  if (!state.data) state.data = emptyData();
  state.data.areas = Array.isArray(state.data.areas) ? state.data.areas : [];
  state.data.areas.push(createArea(name));
  els.areaInput.value = "";
  markDirty();
  renderAll();
  await saveData(`Legg til område: ${name}`);
});

els.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const config = saveConfig({
    owner: els.setOwner.value,
    repo: els.setRepo.value,
    branch: els.setBranch.value,
  });
  const token = els.setToken.value.trim();
  if (token) {
    saveToken(token);
    els.setToken.value = "";
  }
  updateRepoStatus();
  log("Innstillinger lagret.", "ok");
  loadFromGitHub();
  showTab("oppgaver");
});

els.clearTokenBtn.addEventListener("click", () => {
  clearToken();
  log("Token slettet.", "ok");
  updateTokenInfo();
});

function updateTokenInfo() {
  els.tokenInfo.textContent = hasToken() ? "Token er lagret i denne nettleseren." : "Ingen token lagret. Skriv inn et token for å lagre til GitHub.";
}

populateMonths();
populateDays(1);
syncScheduleUI();
els.taskForm.hidden = true;
els.noTaskSelected.hidden = false;

const cfg = getConfig();
els.setOwner.value = cfg.owner;
els.setRepo.value = cfg.repo;
els.setBranch.value = cfg.branch;
updateTokenInfo();
updateRepoStatus();

if (cfg.owner && cfg.repo) {
  loadFromGitHub();
}
