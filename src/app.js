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
import { describeFrequency, computeDueDate } from "./schedule.js";
import { MONTH_NAMES, daysInMonth, isDateString, todayISO, addUnits } from "./dates.js";
import { createFdvType, createLogEntryFromType, emptyData, newId, normalizeData, validateFdvType } from "./model.js";

const els = {
  repoStatus: document.querySelector("#repoStatus"),
  reloadAllBtn: document.querySelector("#reloadAllBtn"),
  tabs: document.querySelectorAll(".tab"),
  panels: document.querySelectorAll(".tab-panel"),
  newTypeBtn: document.querySelector("#newTypeBtn"),
  typeTableBody: document.querySelector("#typeTable tbody"),
  typeEmpty: document.querySelector("#typeEmpty"),
  typeEditor: document.querySelector("#typeEditor"),
  typeEditorTitle: document.querySelector("#typeEditorTitle"),
  typeForm: document.querySelector("#typeForm"),
  typeId: document.querySelector("#typeId"),
  typeName: document.querySelector("#typeName"),
  typeCreatedAt: document.querySelector("#typeCreatedAt"),
  typeDescription: document.querySelector("#typeDescription"),
  typeRoomChips: document.querySelector("#typeRoomChips"),
  typeRoomSelect: document.querySelector("#typeRoomSelect"),
  addTypeRoomBtn: document.querySelector("#addTypeRoomBtn"),
  typeScheduleBtns: document.querySelectorAll("[data-type-schedule]"),
  typePanelFixed: document.querySelector("#typePanelFixed"),
  typePanelInterval: document.querySelector("#typePanelInterval"),
  typeFixedMonth: document.querySelector("#typeFixedMonth"),
  typeFixedDay: document.querySelector("#typeFixedDay"),
  typeIntervalCount: document.querySelector("#typeIntervalCount"),
  typeIntervalUnit: document.querySelector("#typeIntervalUnit"),
  typeFreqPreview: document.querySelector("#typeFreqPreview"),
  typeFormError: document.querySelector("#typeFormError"),
  cancelTypeBtn: document.querySelector("#cancelTypeBtn"),
  roomFilter: document.querySelector("#roomFilter"),
  roomInput: document.querySelector("#roomInput"),
  addRoomBtn: document.querySelector("#addRoomBtn"),
  roomList: document.querySelector("#roomList"),
  logTableBody: document.querySelector("#logTable tbody"),
  logEmpty: document.querySelector("#logEmpty"),
  logFilters: document.querySelectorAll("[data-log-filter]"),
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
  busy: false,
  selectedTypeId: null,
  typeSchedule: "fixed-annual",
  roomFilter: "alle",
  logFilter: "alle",
  typeSortKey: "rooms",
  typeSortDir: "asc",
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
    if (button.classList.contains("tab")) return;
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
  if (els.typeFixedMonth.options.length) return;
  for (let m = 1; m <= 12; m += 1) {
    const opt = document.createElement("option");
    opt.value = String(m);
    opt.textContent = MONTH_NAMES[m - 1];
    els.typeFixedMonth.append(opt);
  }
}

function populateDays(month) {
  const days = daysInMonth(2024, month);
  const current = Number(els.typeFixedDay.value) || days;
  els.typeFixedDay.replaceChildren();
  for (let d = 1; d <= days; d += 1) {
    const opt = document.createElement("option");
    opt.value = String(d);
    opt.textContent = String(d);
    els.typeFixedDay.append(opt);
  }
  els.typeFixedDay.value = String(Math.min(current, days));
}

function readTypeSchedule() {
  if (state.typeSchedule === "fixed-annual") {
    return { type: "fixed-annual", month: Number(els.typeFixedMonth.value), day: Number(els.typeFixedDay.value) };
  }
  return { type: "interval", count: Number(els.typeIntervalCount.value) || 1, unit: els.typeIntervalUnit.value };
}

function syncTypeScheduleUI() {
  els.typePanelFixed.hidden = state.typeSchedule !== "fixed-annual";
  els.typePanelInterval.hidden = state.typeSchedule !== "interval";
  els.typeScheduleBtns.forEach((btn) => btn.classList.toggle("active", btn.dataset.typeSchedule === state.typeSchedule));
  els.typeFreqPreview.textContent = `Forhåndsvisning: ${describeFrequency(readTypeSchedule())}`;
}

function roomName(roomId) {
  return state.data?.rooms?.find((r) => r.id === roomId)?.name || roomId;
}

function renderRoomFilters() {
  const rooms = state.data?.rooms ?? [];
  els.roomFilter.replaceChildren();
  for (const room of rooms) {
    const btn = document.createElement("button");
    btn.className = `filter-chip ${state.roomFilter === room.id ? "active" : ""}`;
    btn.dataset.roomFilter = room.id;
    btn.textContent = room.name;
    btn.addEventListener("click", () => {
      state.roomFilter = room.id;
      renderRoomFilters();
      renderTypes();
    });
    els.roomFilter.append(btn);
  }
  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === "alle" && state.roomFilter === "alle");
    btn.onclick = () => {
      state.roomFilter = "alle";
      document.querySelectorAll("[data-room-filter]").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      renderRoomFilters();
      renderTypes();
    };
  });
}

function renderRooms() {
  const rooms = state.data?.rooms ?? [];
  els.roomList.replaceChildren();
  els.typeRoomSelect.replaceChildren();
  if (rooms.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Ingen rom – legg til rom under";
    els.typeRoomSelect.append(opt);
  }
  for (const room of rooms) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${room.name}</span>`;
    els.roomList.append(chip);

    const opt = document.createElement("option");
    opt.value = room.id;
    opt.textContent = room.name;
    els.typeRoomSelect.append(opt);
  }
  renderRoomFilters();
}

function renderTypeRooms() {
  const ids = JSON.parse(els.typeId.dataset.rooms || "[]");
  els.typeRoomChips.replaceChildren();
  for (const id of ids) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.innerHTML = `<span>${roomName(id)}</span><button type="button" data-remove-room="${id}">×</button>`;
    chip.querySelector("button").addEventListener("click", () => {
      const list = JSON.parse(els.typeId.dataset.rooms || "[]").filter((r) => r !== id);
      els.typeId.dataset.rooms = JSON.stringify(list);
      renderTypeRooms();
    });
    els.typeRoomChips.append(chip);
  }
}

function renderTypes() {
  if (!state.data) return;
  const types = (state.data.fdvTaskTypes ?? []).filter((t) => t.active !== false);
  let list = [...types];
  if (state.roomFilter !== "alle") {
    list = list.filter((t) => Array.isArray(t.rooms) && t.rooms.includes(state.roomFilter));
  }
  list.sort((a, b) => {
    const ra = (a.rooms || []).map(roomName).join(",");
    const rb = (b.rooms || []).map(roomName).join(",");
    if (state.typeSortKey === "rooms") {
      return state.typeSortDir === "asc" ? ra.localeCompare(rb, "nb") || a.name.localeCompare(b.name, "nb") : rb.localeCompare(ra, "nb") || b.name.localeCompare(a.name, "nb");
    }
    const va = state.typeSortKey === "frequency" ? describeFrequency(a.frequency || a.schedule) : a.name;
    const vb = state.typeSortKey === "frequency" ? describeFrequency(b.frequency || b.schedule) : b.name;
    return state.typeSortDir === "asc" ? va.localeCompare(vb, "nb") : vb.localeCompare(va, "nb");
  });

  els.typeTableBody.replaceChildren();
  els.typeEmpty.hidden = list.length > 0;
  for (const type of list) {
    const tr = document.createElement("tr");
    tr.className = "clickable";
    if (type.id === state.selectedTypeId) tr.classList.add("selected");
    const roomsCell = document.createElement("td");
    roomsCell.textContent = (type.rooms || []).map(roomName).join(", ");
    const nameCell = document.createElement("td");
    nameCell.textContent = type.name;
    const freqCell = document.createElement("td");
    freqCell.textContent = describeFrequency(type.frequency || type.schedule);
    const descCell = document.createElement("td");
    descCell.className = "muted";
    descCell.textContent = type.description || "";
    tr.append(roomsCell, nameCell, freqCell, descCell);
    tr.addEventListener("click", () => editType(type.id));
    els.typeTableBody.append(tr);
  }
}

function editType(id) {
  const type = state.data?.fdvTaskTypes?.find((t) => t.id === id);
  if (!type) return;
  state.selectedTypeId = id;
  els.typeEditor.hidden = false;
  els.typeEditorTitle.textContent = "Rediger oppgavetype";
  els.typeId.value = type.id;
  els.typeId.dataset.rooms = JSON.stringify(type.rooms || type.roomIds || []);
  els.typeName.value = type.name || "";
  els.typeCreatedAt.value = type.createdAt || "";
  els.typeDescription.value = type.description || "";
  state.typeSchedule = (type.frequency || type.schedule)?.type === "interval" ? "interval" : "fixed-annual";
  const schedule = type.frequency || type.schedule;
  if (state.typeSchedule === "fixed-annual") {
    els.typeFixedMonth.value = String(schedule?.month ?? 1);
    populateDays(Number(els.typeFixedMonth.value));
    els.typeFixedDay.value = String(schedule?.day ?? 1);
  } else {
    els.typeIntervalCount.value = String(schedule?.count ?? 1);
    els.typeIntervalUnit.value = schedule?.unit ?? "month";
  }
  syncTypeScheduleUI();
  renderTypeRooms();
  renderTypes();
  els.typeFormError.hidden = true;
  showTab("typer");
  els.typeName.focus();
}

function newType() {
  state.selectedTypeId = null;
  els.typeEditor.hidden = false;
  els.typeEditorTitle.textContent = "Ny oppgavetype";
  els.typeId.value = "";
  els.typeId.dataset.rooms = "[]";
  els.typeName.value = "";
  els.typeCreatedAt.value = state.today;
  els.typeDescription.value = "";
  state.typeSchedule = "fixed-annual";
  populateMonths();
  populateDays(1);
  els.typeFixedMonth.value = "10";
  populateDays(10);
  els.typeFixedDay.value = "1";
  els.typeIntervalCount.value = "1";
  els.typeIntervalUnit.value = "month";
  syncTypeScheduleUI();
  renderTypeRooms();
  renderTypes();
  els.typeFormError.hidden = true;
  showTab("typer");
  els.typeName.focus();
}

function isOverdue(entry, today) {
  return !entry.done && isDateString(entry.dueDate) && entry.dueDate < today;
}

function renderLog() {
  if (!state.data) return;
  let entries = [...(state.data.logEntries ?? [])];
  if (state.logFilter === "aapne") entries = entries.filter((e) => !e.done);
  if (state.logFilter === "utført") entries = entries.filter((e) => e.done);
  if (state.logFilter === "forfalt") {
    entries = entries.filter((e) => isOverdue(e, state.today));
  }

  entries.sort((a, b) => {
    const ad = a.done ? 1 : 0;
    const bd = b.done ? 1 : 0;
    if (ad !== bd) return ad - bd;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return (a.name || "").localeCompare(b.name || "", "nb");
  });

  els.logTableBody.replaceChildren();
  els.logEmpty.hidden = entries.length > 0;
  for (const entry of entries) {
    const tr = document.createElement("tr");
    if (isOverdue(entry, state.today)) {
      tr.classList.add("overdue-row");
    }
    const roomsCell = document.createElement("td");
    roomsCell.textContent = (entry.rooms || entry.roomIds || []).map(roomName).join(", ");
    const nameCell = document.createElement("td");
    if (isOverdue(entry, state.today)) {
      const icon = document.createElement("span");
      icon.className = "overdue-icon";
      icon.textContent = "⚠";
      icon.title = "Forfalt";
      nameCell.append(icon, document.createTextNode(" " + (entry.name || "")));
    } else {
      nameCell.textContent = entry.name || "";
    }
    const freqCell = document.createElement("td");
    freqCell.className = "muted";
    freqCell.textContent = describeFrequency(entry.frequency || entry.schedule);

    const dueCell = document.createElement("td");
    const dueInput = document.createElement("input");
    dueInput.type = "date";
    dueInput.value = entry.dueDate || "";
    dueInput.addEventListener("change", () => {
      entry.dueDate = dueInput.value;
      if (entry.done && !entry.doneDate) entry.doneDate = dueInput.value || state.today;
      markLogChanged(entry);
      renderLog();
    });
    dueCell.append(dueInput);

    const doneCell = document.createElement("td");
    const doneWrap = document.createElement("label");
    doneWrap.className = "inline-check";
    const doneChk = document.createElement("input");
    doneChk.type = "checkbox";
    doneChk.checked = entry.done === true;
    doneChk.addEventListener("change", () => {
      entry.done = doneChk.checked;
      if (doneChk.checked) entry.doneDate = entry.doneDate || entry.dueDate || state.today;
      else entry.doneDate = "";
      markLogChanged(entry);
      renderLog();
    });
    const doneText = document.createElement("span");
    doneText.textContent = "Utført";
    doneWrap.append(doneChk, doneText);
    doneCell.append(doneWrap);

    const noteCell = document.createElement("td");
    const noteInput = document.createElement("input");
    noteInput.type = "text";
    noteInput.value = entry.note || entry.merknad || "";
    noteInput.placeholder = "Merknad";
    noteInput.addEventListener("change", () => {
      entry.note = noteInput.value;
      entry.merknad = noteInput.value;
      markLogChanged(entry);
    });
    noteCell.append(noteInput);

    tr.append(roomsCell, nameCell, freqCell, dueCell, doneCell, noteCell);
    els.logTableBody.append(tr);
  }
}

function addMonthsISO(dateStr, months) {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + months);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ensureUpcomingLogEntries() {
  if (!state.data) return false;
  state.data.logEntries = Array.isArray(state.data.logEntries) ? state.data.logEntries : [];
  const types = Array.isArray(state.data.fdvTaskTypes) ? state.data.fdvTaskTypes.filter((t) => t.active !== false) : [];
  const endDate = addMonthsISO(state.today, 3);
  let changed = false;

  for (const type of types) {
    const schedule = type.frequency || type.schedule;
    if (!schedule) continue;

    // Find existing entries for this type (by typeId) - avoid duplicates for same due date
    const existingDueDates = new Set(
      state.data.logEntries
        .filter((e) => e.typeId === type.id && isDateString(e.dueDate))
        .map((e) => e.dueDate),
    );

    // For fixed annual, check this year's occurrence if within 3 months
    if (schedule.type === "fixed-annual") {
      const candidate = computeDueDate(schedule, { from: state.today });
      if (isDateString(candidate) && candidate <= endDate && !existingDueDates.has(candidate)) {
        const entry = createLogEntryFromType(type, { dueDate: candidate });
        if (entry) {
          state.data.logEntries.push(entry);
          changed = true;
        }
      }
    } else if (schedule.type === "interval") {
      // Generate next occurrence if it's within 3 months and not already present
      const candidate = computeDueDate(schedule, { anchor: type.createdAt || state.today, from: state.today });
      if (isDateString(candidate) && candidate <= endDate && !existingDueDates.has(candidate)) {
        const entry = createLogEntryFromType(type, { dueDate: candidate });
        if (entry) {
          state.data.logEntries.push(entry);
          changed = true;
        }
      }
    }
  }
  return changed;
}

function markLogChanged(entry) {
  state.data.logEntries = Array.isArray(state.data.logEntries) ? state.data.logEntries : [];
  const idx = state.data.logEntries.findIndex((e) => e.id === entry.id);
  if (idx >= 0) state.data.logEntries[idx] = entry;
  saveData("Oppdater oppgave");
}

function makeClient() {
  if (state.client) return state.client;
  state.client = createClient(getConfig());
  return state.client;
}

function updateRepoStatus() {
  const config = getConfig();
  els.repoStatus.textContent = config.owner && config.repo ? `${config.owner}/${config.repo}@${config.branch || "main"}` : "Ikke tilkoblet";
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
    const generated = ensureUpcomingLogEntries();
    renderRooms();
    renderTypes();
    renderLog();
    updateRepoStatus();
    log(`Lastet data.json (schema v${state.data.schemaVersion}) sha ${sha.slice(0, 7)}.`, "ok");
    if (generated && hasToken()) {
      saveData("Automatisk opprettet oppgaver de neste 3 månedene");
    }
    showTab("oppgaver");
  } catch (error) {
    if (error instanceof GitHubError) log(error.message, "error");
    else {
      log("Uventet feil under lasting.", "error");
      console.error(error);
    }
  } finally {
    setBusy(false);
  }
}

async function saveData(message) {
  if (state.busy) return;
  if (!state.data) return;
  if (!hasToken()) {
    log("Trenger token for å lagre. Se Innstillinger.", "warn");
    showTab("innstillinger");
    return;
  }
  try {
    setBusy(true);
    const data = { ...state.data, updatedAt: new Date().toISOString() };
    const result = await makeClient().writeData(data, state.sha, message);
    state.data = data;
    state.sha = result.sha || state.sha;
    renderRooms();
    renderTypes();
    renderLog();
    log(`Lagret. Commit ${(result.commit?.sha ?? "").slice(0, 7) || "opprettet"}.`, "ok");
  } catch (error) {
    if (error instanceof GitHubError) log(error.message, "error");
    else {
      log("Uventet feil under lagring.", "error");
      console.error(error);
    }
  } finally {
    setBusy(false);
  }
}

els.tabs.forEach((tab) => tab.addEventListener("click", () => showTab(tab.dataset.tab)));
els.reloadAllBtn.addEventListener("click", () => loadFromGitHub());
els.newTypeBtn.addEventListener("click", newType);

els.typeScheduleBtns.forEach((btn) => btn.addEventListener("click", () => { state.typeSchedule = btn.dataset.typeSchedule; syncTypeScheduleUI(); }));
els.typeFixedMonth.addEventListener("change", () => { populateDays(Number(els.typeFixedMonth.value)); syncTypeScheduleUI(); });
els.typeFixedDay.addEventListener("change", syncTypeScheduleUI);
els.typeIntervalCount.addEventListener("input", syncTypeScheduleUI);
els.typeIntervalUnit.addEventListener("change", syncTypeScheduleUI);

els.addTypeRoomBtn.addEventListener("click", () => {
  if (!state.data) state.data = emptyData();
  const id = els.typeRoomSelect.value;
  if (!id) return;
  const list = JSON.parse(els.typeId.dataset.rooms || "[]");
  if (!list.includes(id)) list.push(id);
  els.typeId.dataset.rooms = JSON.stringify(list);
  renderTypeRooms();
});

els.typeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.data) state.data = emptyData();
  const schedule = readTypeSchedule();
  const rooms = JSON.parse(els.typeId.dataset.rooms || "[]");
  const errors = validateFdvType({ name: els.typeName.value, rooms, frequency: schedule });
  if (errors.length) {
    els.typeFormError.textContent = errors.join(" ");
    els.typeFormError.hidden = false;
    return;
  }
  els.typeFormError.hidden = true;

  const type = {
    id: els.typeId.value || newId("ft"),
    name: els.typeName.value.trim(),
    rooms,
    roomIds: rooms,
    description: els.typeDescription.value,
    frequency: schedule,
    schedule,
    createdAt: els.typeCreatedAt.value || state.today,
    active: true,
  };

  state.data.fdvTaskTypes = Array.isArray(state.data.fdvTaskTypes) ? state.data.fdvTaskTypes : [];
  const idx = state.data.fdvTaskTypes.findIndex((t) => t.id === type.id);
  if (idx >= 0) state.data.fdvTaskTypes[idx] = { ...state.data.fdvTaskTypes[idx], ...type };
  else state.data.fdvTaskTypes.push(type);
  state.selectedTypeId = type.id;
  renderRooms();
  renderTypes();
  await saveData(`Lagre oppgavetype: ${type.name}`);
  els.typeEditor.hidden = true;
});

els.cancelTypeBtn.addEventListener("click", () => { els.typeEditor.hidden = true; });

els.addRoomBtn.addEventListener("click", async () => {
  const name = els.roomInput.value.trim();
  if (!name) return;
  if (!state.data) state.data = emptyData();
  state.data.rooms = Array.isArray(state.data.rooms) ? state.data.rooms : [];
  state.data.rooms.push({ id: newId("r"), name, areaId: "" });
  els.roomInput.value = "";
  renderRooms();
  await saveData(`Legg til rom: ${name}`);
});

els.logFilters.forEach((btn) => btn.addEventListener("click", () => {
  els.logFilters.forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  state.logFilter = btn.dataset.logFilter;
  renderLog();
}));

document.querySelectorAll(".sortable").forEach((th) => th.addEventListener("click", () => {
  const key = th.dataset.sort;
  if (state.typeSortKey === key) state.typeSortDir = state.typeSortDir === "asc" ? "desc" : "asc";
  else { state.typeSortKey = key; state.typeSortDir = "asc"; }
  renderTypes();
}));

els.settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  saveConfig({ owner: els.setOwner.value, repo: els.setRepo.value, branch: els.setBranch.value });
  const token = els.setToken.value.trim();
  if (token) { saveToken(token); els.setToken.value = ""; }
  updateTokenInfo();
  log("Innstillinger lagret.", "ok");
  loadFromGitHub();
  showTab("oppgaver");
});

els.clearTokenBtn.addEventListener("click", () => { clearToken(); updateTokenInfo(); log("Token slettet.", "ok"); });
function updateTokenInfo() { els.tokenInfo.textContent = hasToken() ? "Token er lagret i denne nettleseren." : "Ingen token lagret."; }

populateMonths();
populateDays(1);
syncTypeScheduleUI();
els.typeEditor.hidden = true;

const cfg = getConfig();
els.setOwner.value = cfg.owner;
els.setRepo.value = cfg.repo;
els.setBranch.value = cfg.branch;
updateTokenInfo();
updateRepoStatus();
if (cfg.owner && cfg.repo) loadFromGitHub();
else {
  showTab("oppgaver");
}
