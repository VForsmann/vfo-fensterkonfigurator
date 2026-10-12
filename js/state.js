// Zentrale Zustandsverwaltung: Positionen, Grundeinstellungen, Navigation, Persistenz.
import { DEFAULTS, GROUPS, WINDOW_TABS, LIMITS } from './catalog.js';

const STORAGE_KEY = 'vfo-fensterkonfigurator-v2';
const listeners = new Set();

let uid = 0;
const newId = () => `w${Date.now().toString(36)}${(uid++).toString(36)}`;

export const state = {
  defaults: { ...DEFAULTS },
  windows: [],
  activeId: null,
  view: 'defaults', // 'defaults' | 'overview' | 'window'
  tab: 'size',
  preview: { side: 'outside', open: 'closed', shutter: 0.35 },
  customer: null,
};

export function createWindow(partial = {}) {
  const n = state.windows.length + 1;
  return {
    id: newId(),
    name: `Fenster ${n}`,
    floor: 'EG',
    room: '',
    qty: 1,
    width: 1000,
    height: 1250,
    fields: ['DKL'],
    transom: 'none',
    transomHeight: 450,
    overrides: {},
    values: {},
    ...partial,
  };
}

// Effektive Konfiguration = Fensterwerte + (Gruppe vererbt ? Grundeinstellung : individueller Wert)
export function effective(win) {
  const cfg = {
    width: win.width, height: win.height, fields: win.fields, transom: win.transom,
    transomHeight: win.transomHeight, qty: win.qty,
  };
  for (const [g, def] of Object.entries(GROUPS)) {
    for (const k of def.keys) cfg[k] = win.overrides[g] ? win.values[k] ?? state.defaults[k] : state.defaults[k];
  }
  return cfg;
}

export const groupOfKey = (key) => Object.keys(GROUPS).find((g) => GROUPS[g].keys.includes(key));

export const activeWindow = () => state.windows.find((w) => w.id === state.activeId) || null;
export const windowIndex = (id) => state.windows.findIndex((w) => w.id === id);

export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// meta: { focus?: string, scene?: bool } – Hinweise für Kamera/Szene
export function commit(meta = {}) {
  save();
  listeners.forEach((fn) => fn(meta));
}

// ---- Aktionen ----
export function setDefault(key, value) {
  state.defaults[key] = value;
}

export function setWindowOption(win, key, value) {
  const g = groupOfKey(key);
  if (g && !win.overrides[g]) {
    win.overrides[g] = true;
    for (const k of GROUPS[g].keys) win.values[k] = state.defaults[k];
  }
  win.values[key] = value;
  // Wenn wieder identisch mit Grundeinstellung -> Vererbung automatisch wiederherstellen
  if (g && GROUPS[g].keys.every((k) => win.values[k] === state.defaults[k])) delete win.overrides[g];
}

export function resetGroup(win, g) {
  delete win.overrides[g];
  for (const k of GROUPS[g].keys) delete win.values[k];
}

export function applyGroupToAll(g) {
  for (const w of state.windows) resetGroup(w, g);
}

export function addWindow(partial) {
  const win = createWindow(partial);
  state.windows.push(win);
  state.activeId = win.id;
  state.view = 'window';
  state.tab = 'size';
  return win;
}

export function duplicateWindow(id) {
  const src = state.windows.find((w) => w.id === id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(src));
  copy.id = newId();
  copy.name = nextCopyName(src.name);
  const idx = windowIndex(id);
  state.windows.splice(idx + 1, 0, copy);
  state.activeId = copy.id;
  state.view = 'window';
  return copy;
}

function nextCopyName(name) {
  const base = name.replace(/ \(Kopie( \d+)?\)$/, '');
  let i = 1, cand = `${base} (Kopie)`;
  while (state.windows.some((w) => w.name === cand)) cand = `${base} (Kopie ${++i})`;
  return cand;
}

export function removeWindow(id) {
  const idx = windowIndex(id);
  if (idx < 0) return null;
  const [removed] = state.windows.splice(idx, 1);
  if (state.activeId === id) {
    const next = state.windows[Math.min(idx, state.windows.length - 1)];
    state.activeId = next ? next.id : null;
    if (!next && state.view === 'window') state.view = 'overview';
  }
  return { removed, idx };
}

export function restoreWindow({ removed, idx }) {
  state.windows.splice(idx, 0, removed);
  state.activeId = removed.id;
}

export function setLayoutCount(win, n) {
  const cur = win.fields;
  const presets = { 1: ['DKL'], 2: ['DKL', 'DKR'], 3: ['DKL', 'F', 'DKR'] };
  win.fields = cur.length === n ? cur : presets[n].slice();
  const minW = n * 450;
  if (win.width < minW) win.width = minW;
}

export function clampSize(win) {
  win.width = clamp(Math.round(win.width), LIMITS.wMin, LIMITS.wMax);
  win.height = clamp(Math.round(win.height), LIMITS.hMin, LIMITS.hMax);
  if (win.transom !== 'none') {
    win.transomHeight = clamp(Math.round(win.transomHeight), LIMITS.transomMin, Math.max(LIMITS.transomMin, win.height - 900));
  }
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---- Navigation (Weiter / Zurück) ----
export function steps() {
  const s = [{ view: 'defaults' }];
  for (const w of state.windows) for (const t of WINDOW_TABS) s.push({ view: 'window', id: w.id, tab: t.id });
  s.push({ view: 'overview' });
  return s;
}

export function currentStepIndex() {
  const s = steps();
  return s.findIndex((st) => st.view === state.view && (st.view !== 'window' || (st.id === state.activeId && st.tab === state.tab)));
}

export function goStep(st) {
  state.view = st.view;
  if (st.view === 'window') { state.activeId = st.id; state.tab = st.tab; }
}

// ---- Persistenz ----
function save() {
  try {
    const { defaults, windows, activeId, view, tab, customer } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ defaults, windows, activeId, view, tab, customer }));
  } catch { /* Speicher nicht verfügbar */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const d = JSON.parse(raw);
      Object.assign(state.defaults, d.defaults || {});
      state.windows = Array.isArray(d.windows) ? d.windows : [];
      state.activeId = d.activeId;
      state.tab = WINDOW_TABS.some((t) => t.id === d.tab) ? d.tab : 'size';
      state.customer = d.customer || null;
    }
  } catch { /* defekter Speicher -> Neustart */ }
  // Nach dem Laden immer mindestens ein Fenster
  if (!state.windows.length) state.windows.push(createWindow({ room: 'Wohnzimmer' }));
  if (!state.windows.some((w) => w.id === state.activeId)) state.activeId = state.windows[0].id;
  // Start immer mit den Grundeinstellungen
  state.view = 'defaults';
}
