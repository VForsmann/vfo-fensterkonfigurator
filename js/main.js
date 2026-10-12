// App-Steuerung: Sidebar (3 Tab-Zeilen), Inhalte, Weiter/Zurück, 3D-Kopplung, Kamera-Fokus.
import {
  MATERIALS, PROFILES, COLORS, GLAZING, GLASS_SURFACES, MUNTINS, MUNTIN_TYPES, HANDLES, HANDLE_COLORS,
  SECURITY, SHUTTERS, SHUTTER_COLORS, SHUTTER_DRIVES, SCREENS, SILLS, OPENINGS, TRANSOMS, FLOORS, LIMITS,
  GROUPS, WINDOW_TABS, VAT, byId, priceOf, validate, fmtEUR,
} from './catalog.js';
import {
  state, load, commit, subscribe, effective, activeWindow, windowIndex, addWindow, duplicateWindow, removeWindow,
  restoreWindow, setDefault, setWindowOption, resetGroup, applyGroupToAll, setLayoutCount, clampSize, steps,
  currentStepIndex, goStep, groupOfKey,
} from './state.js';
import { esc, icon, cards, chips, swatches, priceTag, schematic, openingSummary } from './ui.js';
import { Viewer } from './viewer.js';
import { generateOfferPDF } from './pdf.js';

const $ = (s) => document.querySelector(s);
const ui = { field: 0, contentKey: null, scroll: {} };

load();

// ---------- 3D ----------
const viewer = new Viewer($('#canvas-host'), {
  onPick: (part, side) => onPick(part, side),
  onHover: (h) => {
    const tip = $('#tooltip');
    if (!h) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.textContent = PART_LABEL[h.part] || 'Bearbeiten';
    tip.style.left = `${h.x}px`;
    tip.style.top = `${h.y}px`;
  },
});

const PART_LABEL = {
  frame: 'Rahmen · Farbe bearbeiten', sash: 'Flügel · Farbe bearbeiten', glass: 'Verglasung bearbeiten',
  handle: 'Griff bearbeiten', shutter: 'Rollladen bearbeiten', screen: 'Insektenschutz bearbeiten', sill: 'Fensterbank bearbeiten',
};

const SIDE_OF = { inside: 'inside', handle: 'inside', profile: 'inside', 'front-inside': 'inside' };
function focus(name) {
  let preset = name;
  let side = SIDE_OF[name] || 'outside';
  if (name === 'front-inside') preset = 'front';
  if (name === 'glass') side = state.preview.side;
  state.preview.side = side;
  viewer.setPreview({ side });
  viewer.focus(preset, { side });
  renderToolbar();
}

function contextFocus() {
  const win = activeWindow();
  if (!win || state.view !== 'window') return 'overview';
  const cfg = effective(win);
  switch (state.tab) {
    case 'size': return 'dims';
    case 'layout': return 'front-inside';
    case 'system': return 'profile';
    case 'colors': return state.preview.side === 'inside' ? 'inside' : 'outside';
    case 'glass': return 'glass';
    case 'handle': return 'handle';
    case 'extras': return cfg.shutter !== 'none' ? 'shutter' : cfg.screen !== 'none' ? 'screen' : cfg.sill !== 'none' ? 'sill' : 'outside';
    default: return 'overview';
  }
}

const KEY_FOCUS = {
  colorOut: 'outside', colorIn: 'inside', handle: 'handle', handleColor: 'handle', security: 'handle',
  glazing: 'glass', glassSurface: 'glass', muntins: 'outside', muntinType: 'outside', material: 'profile', profile: 'profile',
  shutter: 'shutter', shutterColor: 'shutter', shutterDrive: 'shutter', screen: 'screen', sill: 'sill',
  width: 'dims', height: 'dims', transomHeight: 'dims', fields: 'front-inside', transom: 'front-inside',
};

function focusForKey(key, value) {
  let f = KEY_FOCUS[key];
  if ((key === 'shutter' || key === 'screen' || key === 'sill') && value === 'none') f = 'outside';
  if (key.startsWith('shutter') && state.preview.shutter < 0.15) { state.preview.shutter = 0.35; viewer.setPreview({ shutter: 0.35 }); }
  return f;
}

// Synchronisiert die 3D-Szene mit dem Zustand. focusName: optionaler Fokus.
function syncScene(focusName) {
  const win = activeWindow();
  const cfg = win ? effective(win) : null;
  const rebuilt = viewer.setWindow(cfg, state.preview);
  viewer.stage.setDims(state.view === 'window' && state.tab === 'size');
  $('#stage-empty').hidden = !!win;
  if (!win) { $('#stage-empty').innerHTML = emptyStage(); viewer.focus('overview'); return; }
  if (focusName) focus(focusName);
  else if (rebuilt) viewer.focus(viewer.lastFocus === 'front' && state.preview.side === 'inside' ? 'front' : viewer.lastFocus, { side: state.preview.side });
}

// ---------- Rendering ----------
function render(meta = {}) {
  renderTabs();
  if (!meta.light) renderContent();
  renderFooter();
  renderInfo();
  renderToolbar();
  syncScene(meta.focus);
}
subscribe((meta) => render(meta));

function renderTabs() {
  const rows = [];
  const n = state.windows.length;
  rows.push(`<div class="tabrow" role="tablist">
    ${tab('Grundeinstellungen', state.view === 'defaults', 'data-act="view" data-view="defaults"')}
    ${tab(`Übersicht <span class="num">${n}</span>`, state.view === 'overview', 'data-act="view" data-view="overview"')}
  </div>`);
  if (n) {
    rows.push(`<div class="tabrow">${state.windows.map((w, i) => {
      const act = state.view === 'window' && w.id === state.activeId;
      const sel = !act && w.id === state.activeId;
      return `<button type="button" class="tab ${act ? 'is-active' : ''} ${sel ? 'is-selected' : ''}" data-act="win" data-id="${w.id}" title="${esc(w.name)}">
        <span class="num">${i + 1}</span>${esc(shortName(w, i))}</button>`;
    }).join('')}
      <button type="button" class="tab tab-add" data-act="add" title="Fenster hinzufügen">${icon('plus')}Fenster</button>
    </div>`);
  }
  if (state.view === 'window' && activeWindow()) {
    rows.push(`<div class="tabrow sub" role="tablist">${WINDOW_TABS.map((t) => tab(t.name, state.tab === t.id, `data-act="tab" data-tab="${t.id}"`)).join('')}</div>`);
  }
  $('#tabs').innerHTML = rows.join('');
}

const tab = (label, on, attrs) => `<button type="button" role="tab" aria-selected="${on}" class="tab ${on ? 'is-active' : ''}" ${attrs}>${label}</button>`;
const shortName = (w, i) => {
  const s = w.name || `Fenster ${i + 1}`;
  return s.length > 16 ? `${s.slice(0, 15)}…` : s;
};

function renderContent() {
  const el = $('#content');
  const key = `${state.view}:${state.view === 'window' ? state.activeId + ':' + state.tab : ''}`;
  if (ui.contentKey) ui.scroll[ui.contentKey] = el.scrollTop;
  let html = '';
  if (state.view === 'defaults') html = viewDefaults();
  else if (state.view === 'overview') html = viewOverview();
  else html = viewWindow();
  el.innerHTML = html;
  el.style.scrollBehavior = 'auto';
  el.scrollTop = key === ui.contentKey ? ui.scroll[key] || 0 : 0;
  el.style.scrollBehavior = '';
  ui.contentKey = key;
}

// ----- Grundeinstellungen -----
const GROUP_ORDER = ['system', 'safety', 'colors', 'glazing', 'muntins', 'handle', 'shutter', 'screen', 'sill'];

function viewDefaults() {
  const n = state.windows.length;
  return `<div class="view-head"><div>
      <span class="eyebrow">Für alle Fenster</span>
      <h2>Grundeinstellungen</h2>
      <p>Diese Einstellungen gelten für alle ${n > 1 ? `${n} Fenster` : 'Fenster'}. In jedem Fenster können Sie einzelne Bereiche individuell abweichend wählen.</p>
    </div></div>
    ${GROUP_ORDER.map((g) => section(g, null)).join('')}`;
}

function section(g, win) {
  const vals = win ? effective(win) : state.defaults;
  let right = '';
  if (win) {
    right = win.overrides[g]
      ? `<span class="badge badge-own">Individuell</span><button type="button" class="link-btn" data-act="reset-group" data-group="${g}">Zurücksetzen</button>`
      : `<span class="badge badge-inherit">${icon('link')}Grundeinstellung</span>`;
  } else {
    const c = state.windows.filter((w) => w.overrides[g]).length;
    if (c) right = `<span class="badge badge-warn">${c} ${c === 1 ? 'Fenster weicht' : 'Fenster weichen'} ab</span><button type="button" class="link-btn" data-act="align-group" data-group="${g}">Angleichen</button>`;
  }
  return `<div class="section" data-group="${g}">
    <div class="section-head"><h3>${GROUPS[g].title}</h3><div class="head-right">${right}</div></div>
    ${groupBody(g, vals)}
  </div>`;
}

const D = (key) => `data-act="opt" data-key="${key}"`;

function groupBody(g, v) {
  switch (g) {
    case 'system':
      return `<label class="field-label">Material</label>
        ${cards(MATERIALS, v.material, D('material'), { price: (o) => `ab ${fmtEUR(o.pricePerM2)}/m²` })}
        <label class="field-label">Profilsystem</label>
        ${cards(PROFILES, v.profile, D('profile'), { sub: (o) => `${o.chambers} Kammern · ${Math.round(o.depth * 1000)} mm Bautiefe · Uw ≈ ${String(o.uw).replace('.', ',')}` })}`;
    case 'safety':
      return cards(SECURITY, v.security, D('security'), { cols: 3, price: (o) => (o.price ? `+ ${fmtEUR(o.price)} / Flügel` : 'inklusive') });
    case 'colors':
      return `<label class="field-label">Außen</label>${swatches(COLORS, v.colorOut, D('colorOut'))}
        <label class="field-label" style="display:flex;justify-content:space-between;align-items:center">Innen
          ${v.colorIn !== v.colorOut ? '<button type="button" class="link-btn" data-act="color-same">Wie außen übernehmen</button>' : ''}</label>
        ${swatches(COLORS, v.colorIn, D('colorIn'))}`;
    case 'glazing':
      return `${cards(GLAZING, v.glazing, D('glazing'), { price: (o) => (o.pricePerM2 ? `+ ${fmtEUR(o.pricePerM2)}/m²` : 'inklusive') })}
        <label class="field-label">Glasart</label>${cards(GLASS_SURFACES, v.glassSurface, D('glassSurface'), { cols: 3 })}`;
    case 'muntins':
      return `${chips(MUNTINS, v.muntins, D('muntins'))}
        ${v.muntins !== 'none' ? `<label class="field-label">Ausführung</label>${cards(MUNTIN_TYPES, v.muntinType, D('muntinType'))}` : ''}`;
    case 'handle':
      return `${cards(HANDLES, v.handle, D('handle'), { price: (o) => priceTag(o.price) })}
        <label class="field-label">Farbe / Oberfläche</label>${swatches(HANDLE_COLORS.map((c) => ({ ...c, code: c.price ? `+ ${fmtEUR(c.price)}` : '' })), v.handleColor, D('handleColor'))}`;
    case 'shutter':
      return `${cards(SHUTTERS, v.shutter, D('shutter'), { cols: 3 })}
        ${v.shutter !== 'none' ? `<label class="field-label">Panzerfarbe</label>${swatches(SHUTTER_COLORS, v.shutterColor, D('shutterColor'))}
        <label class="field-label">Antrieb</label>${cards(SHUTTER_DRIVES, v.shutterDrive, D('shutterDrive'), { cols: 3, price: (o) => priceTag(o.price) })}` : ''}`;
    case 'screen':
      return cards(SCREENS, v.screen, D('screen'), { cols: 3 });
    case 'sill':
      return chips(SILLS, v.sill, D('sill'));
    default: return '';
  }
}

// ----- Fenster -----
function viewWindow() {
  const win = activeWindow();
  if (!win) return viewOverview();
  const i = windowIndex(win.id);
  const cfg = effective(win);
  const head = `<div class="view-head"><div>
      <span class="eyebrow">Position ${i + 1} von ${state.windows.length} · ${esc(win.floor)}${win.room ? ' · ' + esc(win.room) : ''}</span>
      <h2>${esc(win.name)}</h2>
      <p>${cfg.width.toLocaleString('de-DE')} × ${cfg.height.toLocaleString('de-DE')} mm · ${esc(openingSummary(cfg))}</p>
    </div>
    <div class="head-actions">
      <button type="button" class="icon-btn" data-act="dup" data-id="${win.id}" title="Fenster duplizieren">${icon('copy')}</button>
      <button type="button" class="icon-btn danger" data-act="del" data-id="${win.id}" title="Fenster löschen">${icon('trash')}</button>
    </div></div>`;
  let body = '';
  switch (state.tab) {
    case 'size': body = tabSize(win, cfg); break;
    case 'layout': body = tabLayout(win, cfg); break;
    case 'system': body = section('system', win) + section('safety', win); break;
    case 'colors': body = section('colors', win); break;
    case 'glass': body = section('glazing', win) + section('muntins', win); break;
    case 'handle': body = section('handle', win) + `<div class="notice info">${icon('info')}<span>Tipp: Mit <b>Gekippt</b> oder <b>Geöffnet</b> in der 3D-Leiste sehen Sie den Griff in jeder Stellung – die Kamera folgt automatisch.</span></div>`; break;
    case 'extras': body = section('shutter', win) + section('screen', win) + section('sill', win); break;
  }
  return head + body;
}

function warnings(cfg) {
  return validate(cfg).map((m) => `<div class="notice warn">${icon('warn')}<span>${esc(m)}</span></div>`).join('');
}

function tabSize(win, cfg) {
  return `<div class="section">
      <div class="section-head"><h3>Bezeichnung & Lage</h3></div>
      <div class="grid-2">
        <div><label class="field-label" for="f-name">Bezeichnung</label><input id="f-name" class="input" data-input="name" value="${esc(win.name)}" maxlength="40" /></div>
        <div><label class="field-label" for="f-room">Raum</label><input id="f-room" class="input" data-input="room" value="${esc(win.room)}" placeholder="z. B. Küche" list="rooms" maxlength="40" /></div>
      </div>
      <datalist id="rooms">${['Wohnzimmer', 'Küche', 'Schlafzimmer', 'Kinderzimmer', 'Bad', 'Arbeitszimmer', 'Flur', 'Treppenhaus', 'Keller'].map((r) => `<option value="${r}">`).join('')}</datalist>
      <label class="field-label">Etage</label>
      ${chips(FLOORS.map((f) => ({ id: f, name: f })), win.floor, 'data-act="floor"')}
      <label class="field-label">Stückzahl</label>
      ${stepper(win.qty, win.id)}
    </div>
    <div class="section">
      <div class="section-head"><h3>Rahmenaußenmaße</h3></div>
      ${dimInput('width', 'Breite', win.width, LIMITS.wMin, LIMITS.wMax)}
      ${dimInput('height', 'Höhe', win.height, LIMITS.hMin, LIMITS.hMax)}
      <div class="notice info">${icon('ruler')}<span>Maße sind Rahmenaußenmaße ${cfg.shutter === 'top' ? '(ohne Rollladenkasten, +220 mm)' : ''}. Gern übernehmen wir das Aufmaß vor Ort.</span></div>
      ${warnings(cfg)}
    </div>`;
}

function dimInput(key, label, value, min, max) {
  return `<label class="field-label" for="f-${key}">${label}</label>
    <div class="unit-input"><input id="f-${key}" class="input" type="number" inputmode="numeric" min="${min}" max="${max}" step="10" value="${value}" data-num="${key}" /><span>mm</span></div>
    <input class="range" type="range" min="${min}" max="${max}" step="10" value="${value}" data-range="${key}" aria-label="${label}" />
    <div class="range-scale"><span>${min.toLocaleString('de-DE')}</span><span>${max.toLocaleString('de-DE')}</span></div>`;
}

const stepper = (qty, id, sm = false) => `<div class="stepper ${sm ? 'sm' : ''}">
  <button type="button" data-act="qty" data-d="-1" data-id="${id}" aria-label="weniger">−</button>
  <input type="number" min="1" max="99" value="${qty}" data-qty="${id}" aria-label="Stückzahl" />
  <button type="button" data-act="qty" data-d="1" data-id="${id}" aria-label="mehr">+</button></div>`;

function tabLayout(win, cfg) {
  const n = win.fields.length;
  if (ui.field >= n) ui.field = 0;
  const posName = (i) => (n === 1 ? '' : n === 2 ? ['links', 'rechts'][i] : ['links', 'Mitte', 'rechts'][i]);
  return `<div class="section">
      <div class="section-head"><h3>Flügelaufteilung</h3><span class="badge badge-inherit">Ansicht von innen</span></div>
      ${chips([{ id: '1', name: '1-flügelig' }, { id: '2', name: '2-flügelig' }, { id: '3', name: '3-flügelig' }], String(n), 'data-act="field-count"')}
      <div class="layout-preview" style="margin-top:12px">${schematic(cfg, { hl: ui.field, interactive: true })}</div>
      ${win.fields.map((f, i) => `<div class="field-row ${i === ui.field ? 'is-hl' : ''}"><span>Flügel ${i + 1}${posName(i) ? `<br><small style="font-weight:600;color:var(--muted)">${posName(i)}</small>` : ''}</span>
        ${chips(OPENINGS, f, `data-act="opening" data-idx="${i}"`)}</div>`).join('')}
    </div>
    <div class="section">
      <div class="section-head"><h3>Oberlicht</h3></div>
      ${chips(TRANSOMS, win.transom, 'data-act="transom"')}
      ${win.transom !== 'none' ? `<div style="margin-top:4px">${dimInput('transomHeight', 'Höhe Oberlicht (Glasfeld)', win.transomHeight, LIMITS.transomMin, Math.max(LIMITS.transomMin + 10, win.height - 900))}</div>` : ''}
    </div>
    ${warnings(cfg)}`;
}

// ----- Übersicht -----
function viewOverview() {
  const n = state.windows.length;
  if (!n) {
    return `<div class="view-head"><div><span class="eyebrow">Ihr Angebot</span><h2>Übersicht</h2></div></div>
      <div class="empty">${icon('window')}<h3>Keine Fenster in der Liste</h3><p>Fügen Sie ein Fenster hinzu, um mit der Konfiguration zu starten.</p>
      <button type="button" class="btn btn-primary" data-act="add">${icon('plus')}Fenster hinzufügen</button></div>`;
  }
  const totals = sumTotals();
  const floors = [...FLOORS, ...new Set(state.windows.map((w) => w.floor).filter((f) => !FLOORS.includes(f)))];
  const groups = floors.map((f) => ({ f, list: state.windows.filter((w) => w.floor === f) })).filter((g) => g.list.length);
  return `<div class="view-head"><div>
      <span class="eyebrow">Ihr Angebot</span><h2>Übersicht</h2>
      <p>${totals.count} Fenster in ${n} ${n === 1 ? 'Position' : 'Positionen'} · Klicken Sie auf eine Position, um sie zu bearbeiten.</p>
    </div></div>
    ${groups.map((g) => `<div class="floor-head">${esc(g.f)}</div>${g.list.map(posCard).join('')}`).join('')}
    <button type="button" class="add-card" data-act="add">${icon('plus')}Weiteres Fenster hinzufügen</button>
    <div class="summary">
      <div class="row"><span>Summe netto</span><span>${fmtEUR(totals.net)}</span></div>
      <div class="row"><span>zzgl. ${Math.round(VAT * 100)} % MwSt.</span><span>${fmtEUR(totals.vat)}</span></div>
      <div class="row total"><span>Gesamt brutto</span><span>${fmtEUR(totals.gross)}</span></div>
    </div>
    <div class="notice info">${icon('info')}<span>Unverbindliche Preisindikation inkl. Lieferung, zzgl. Montage. Mit <b>Angebot anfordern</b> erhalten Sie ein verbindliches Angebot nach Aufmaß.</span></div>`;
}

function posCard(w) {
  const i = windowIndex(w.id);
  const cfg = effective(w);
  const p = priceOf(cfg);
  const own = Object.keys(w.overrides).filter((g) => w.overrides[g]);
  return `<div class="pos ${w.id === state.activeId ? 'is-selected' : ''}" data-act="open-pos" data-id="${w.id}" role="button" tabindex="0">
    <div class="pos-thumb">${schematic(cfg, { stroke: '#374151' })}</div>
    <div class="pos-main">
      <div class="pos-title"><small>Pos. ${i + 1}</small><span>${esc(w.name)}</span></div>
      <div class="pos-meta">${w.room ? esc(w.room) + ' · ' : ''}${cfg.width.toLocaleString('de-DE')} × ${cfg.height.toLocaleString('de-DE')} mm · ${esc(openingSummary(cfg))}</div>
      <div class="pos-tags">${own.length ? `<span class="badge badge-own" title="${own.map((g) => GROUPS[g].title).join(', ')}">${own.length} individuell</span>` : '<span class="badge badge-inherit">Grundeinstellung</span>'}
        ${validate(cfg).length ? `<span class="badge badge-warn">Prüfen</span>` : ''}</div>
    </div>
    <div class="pos-side">
      <div class="pos-price"><b>${fmtEUR(p.total * (1 + VAT))}</b><small>${w.qty} × ${fmtEUR(p.unit * (1 + VAT))}</small></div>
      <div class="pos-actions">
        ${stepper(w.qty, w.id, true)}
        <button type="button" class="icon-btn" data-act="dup" data-id="${w.id}" title="Duplizieren">${icon('copy')}</button>
        <button type="button" class="icon-btn danger" data-act="del" data-id="${w.id}" title="Löschen">${icon('trash')}</button>
      </div>
    </div>
  </div>`;
}

function sumTotals() {
  let net = 0, count = 0;
  for (const w of state.windows) { const p = priceOf(effective(w)); net += p.total; count += w.qty; }
  const vat = Math.round(net * VAT * 100) / 100;
  return { net, vat, gross: net + vat, count };
}

// ----- Footer -----
function stepLabel(st) {
  if (st.view === 'defaults') return 'Grundeinstellungen';
  if (st.view === 'overview') return 'Übersicht';
  const cur = state.view === 'window' ? state.activeId : null;
  const w = state.windows.find((x) => x.id === st.id);
  const t = WINDOW_TABS.find((x) => x.id === st.tab);
  return st.id === cur ? t.name : w?.name || 'Fenster';
}

function renderFooter() {
  const s = steps();
  const idx = currentStepIndex();
  const totals = sumTotals();
  const win = activeWindow();
  let lbl = `Gesamt · <b>${totals.count}</b> Fenster`;
  if (state.view === 'window' && win) {
    const p = priceOf(effective(win));
    lbl = `<span class="lbl-win">Dieses Fenster <b>${fmtEUR(p.unit * (1 + VAT))}</b>${win.qty > 1 ? ` × ${win.qty}` : ''} · </span>Gesamt · <b>${totals.count}</b> Fenster`;
  }
  const dots = s.length <= 36 ? `<div class="step-dots">${s.map((_, i) => `<i class="${i < idx ? 'done' : i === idx ? 'cur' : ''}"></i>`).join('')}</div>` : '';
  let nav;
  if (state.view === 'overview') {
    nav = `<button type="button" class="btn" data-act="prev" ${idx <= 0 ? 'disabled' : ''} title="Zurück">${icon('left')}</button>
      <button type="button" class="btn btn-grow" data-act="pdf" ${state.windows.length ? '' : 'disabled'}>${icon('download')}<span>PDF</span></button>
      <button type="button" class="btn btn-primary btn-grow" data-act="request" ${state.windows.length ? '' : 'disabled'}>${icon('send')}<span>Angebot anfordern</span></button>`;
  } else {
    const next = s[idx + 1];
    nav = `<button type="button" class="btn" data-act="prev" ${idx <= 0 ? 'disabled' : ''}>${icon('left')}<span>Zurück</span></button>
      <button type="button" class="btn btn-primary btn-grow" data-act="next"><span>Weiter: ${esc(next ? stepLabel(next) : 'Übersicht')}</span>${icon('right')}</button>`;
  }
  $('#footer').innerHTML = `${dots}
    <div class="foot-price"><span class="lbl">${lbl}</span><span class="val">${fmtEUR(totals.gross)}<small>inkl. MwSt.</small></span></div>
    <div class="foot-nav">${nav}</div>`;
}

// ----- Bühne -----
function renderInfo() {
  const win = activeWindow();
  if (!win) { $('#stage-info').innerHTML = ''; return; }
  const cfg = effective(win);
  const p = priceOf(cfg);
  $('#stage-info').innerHTML = `<div class="info-card"><b>Pos. ${windowIndex(win.id) + 1} · ${esc(win.name)}</b>
    <small>${esc(win.floor)}${win.room ? ' · ' + esc(win.room) : ''} · ${cfg.width.toLocaleString('de-DE')} × ${cfg.height.toLocaleString('de-DE')} mm</small></div>
    <div class="info-price">${fmtEUR(p.unit * (1 + VAT))}</div>`;
}

function renderToolbar() {
  const win = activeWindow();
  const tb = $('#stage-toolbar');
  if (!win) { tb.hidden = true; return; }
  tb.hidden = false;
  const cfg = effective(win);
  const pv = state.preview;
  const hasTilt = [...cfg.fields, cfg.transom === 'K' ? 'K' : 'F'].some((f) => byId(OPENINGS, f).tilt);
  const hasTurn = cfg.fields.some((f) => byId(OPENINGS, f).turn);
  const seg = (act, items, cur) => `<div class="seg">${items.map(([v, l, extra = '']) => `<button type="button" class="${v === cur ? 'is-on' : ''}" data-act="${act}" data-val="${v}" ${extra}>${l}</button>`).join('')}</div>`;
  tb.innerHTML = `
    ${seg('side', [['outside', `${icon('sun')}<span>Außen</span>`], ['inside', `${icon('home')}<span>Innen</span>`]], pv.side)}
    <span class="tb-sep"></span>
    ${seg('open', [['closed', 'Zu'], ...(hasTilt ? [['tilt', 'Gekippt']] : []), ...(hasTurn ? [['open', 'Offen']] : [])], pv.open)}
    ${cfg.shutter !== 'none' ? `<span class="tb-sep"></span><label class="tb-range"><span>Rollladen</span><input type="range" min="0" max="1" step="0.01" value="${pv.shutter}" data-shutter aria-label="Rollladen-Position" /></label>` : ''}
    <span class="tb-sep"></span>
    <button type="button" class="tb-btn" data-act="reset-cam" title="Ansicht zentrieren">${icon('focus')}</button>`;
}

function emptyStage() {
  return `<div class="empty">${icon('window')}<h3>Kein Fenster ausgewählt</h3><p>Alle Fenster wurden entfernt.</p>
    <button type="button" class="btn btn-primary" data-act="add">${icon('plus')}Fenster hinzufügen</button></div>`;
}

// ---------- Aktionen ----------
function enterWindow(id, tab) {
  state.activeId = id;
  state.view = 'window';
  if (tab) state.tab = tab;
  ui.field = 0;
  commit({ focus: contextFocus() });
}

function onPick(part, side) {
  const win = activeWindow();
  if (!win) return;
  const map = { frame: 'colors', sash: 'colors', glass: 'glass', handle: 'handle', shutter: 'extras', screen: 'extras', sill: 'extras' };
  const t = map[part];
  if (!t) return;
  state.view = 'window';
  state.tab = t;
  const f = t === 'colors' ? side : part === 'glass' ? 'glass' : part === 'handle' ? 'handle' : part;
  commit({ focus: f });
  const sec = { shutter: 'shutter', screen: 'screen', sill: 'sill' }[part];
  if (sec) document.querySelector(`#content [data-group="${sec}"]`)?.scrollIntoView({ block: 'start' });
}

function setOption(key, val) {
  if (state.view === 'defaults') setDefault(key, val);
  else {
    const win = activeWindow();
    if (!win) return;
    setWindowOption(win, key, val);
  }
  commit({ focus: focusForKey(key, val) });
}

function toast(msg, action) {
  const root = $('#toast-root');
  root.innerHTML = '';
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  if (action) el.querySelector('button').onclick = () => { action.run(); el.remove(); };
  root.appendChild(el);
  setTimeout(() => el.remove(), 6000);
}

function nextName() {
  let i = state.windows.length + 1;
  while (state.windows.some((w) => w.name === `Fenster ${i}`)) i++;
  return `Fenster ${i}`;
}

document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-act]');
  if (!t) return;
  const act = t.dataset.act;
  const id = t.dataset.id;
  switch (act) {
    case 'view':
      state.view = t.dataset.view;
      commit({ focus: 'overview' });
      break;
    case 'win': enterWindow(id); break;
    case 'open-pos': enterWindow(id); break;
    case 'tab':
      state.tab = t.dataset.tab;
      commit({ focus: contextFocus() });
      break;
    case 'add': {
      addWindow({ name: nextName(), floor: activeWindow()?.floor || 'EG' });
      ui.field = 0;
      commit({ focus: 'dims' });
      break;
    }
    case 'dup': {
      e.stopPropagation();
      duplicateWindow(id);
      commit({ focus: contextFocus() });
      toast('Fenster dupliziert');
      break;
    }
    case 'del': {
      e.stopPropagation();
      const w = state.windows.find((x) => x.id === id);
      const res = removeWindow(id);
      commit({ focus: state.view === 'window' ? contextFocus() : 'overview' });
      if (res) toast(`„${w.name}“ gelöscht`, { label: 'Rückgängig', run: () => { restoreWindow(res); commit({ focus: contextFocus() }); } });
      break;
    }
    case 'opt': setOption(t.dataset.key, t.dataset.val); break;
    case 'color-same': setOption('colorIn', (state.view === 'defaults' ? state.defaults : effective(activeWindow())).colorOut); break;
    case 'reset-group': resetGroup(activeWindow(), t.dataset.group); commit({ focus: contextFocus() }); break;
    case 'align-group': applyGroupToAll(t.dataset.group); commit({}); toast(`${GROUPS[t.dataset.group].title}: alle Fenster angeglichen`); break;
    case 'floor': activeWindow().floor = t.dataset.val; commit({ light: false }); break;
    case 'qty': {
      e.stopPropagation();
      const w = state.windows.find((x) => x.id === id);
      w.qty = Math.max(1, Math.min(99, w.qty + Number(t.dataset.d)));
      commit({});
      break;
    }
    case 'field-count': {
      const w = activeWindow();
      setLayoutCount(w, Number(t.dataset.val));
      ui.field = 0;
      commit({ focus: 'front-inside' });
      break;
    }
    case 'opening': {
      const w = activeWindow();
      w.fields = w.fields.slice();
      w.fields[Number(t.dataset.idx)] = t.dataset.val;
      ui.field = Number(t.dataset.idx);
      commit({ focus: 'front-inside' });
      break;
    }
    case 'pick-field': ui.field = Number(t.dataset.idx); render({ focus: null }); break;
    case 'transom': {
      const w = activeWindow();
      w.transom = t.dataset.val;
      if (w.transom !== 'none' && w.height < 1400) w.height = 1400;
      clampSize(w);
      commit({ focus: 'front-inside' });
      break;
    }
    case 'prev': case 'next': {
      const s = steps();
      const i = currentStepIndex();
      const st = s[i + (act === 'next' ? 1 : -1)];
      if (st) { goStep(st); ui.field = 0; commit({ focus: contextFocus() }); }
      break;
    }
    case 'side': focus(t.dataset.val); break;
    case 'open': {
      state.preview.open = t.dataset.val;
      viewer.setPreview({ open: t.dataset.val });
      // Beim Öffnen von außen nach innen wechseln, damit der Flügel sichtbar aufschwingt
      if (t.dataset.val !== 'closed' && viewer.lastFocus !== 'handle' && state.preview.side === 'outside') focus('inside');
      renderToolbar();
      break;
    }
    case 'reset-cam': focus(contextFocus()); break;
    case 'pdf': downloadPDF(); break;
    case 'request': openRequest(); break;
    case 'close-modal': closeModal(); break;
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.pos')) { e.preventDefault(); enterWindow(e.target.dataset.id); }
  if (e.key === 'Escape') closeModal();
});

document.addEventListener('input', (e) => {
  const t = e.target;
  const win = activeWindow();
  if (t.dataset.input && win) {
    win[t.dataset.input] = t.value;
    commit({ light: true });
  } else if (t.dataset.range && win) {
    const key = t.dataset.range;
    win[key] = Number(t.value);
    const num = document.querySelector(`[data-num="${key}"]`);
    if (num) num.value = t.value;
    commit({ light: true, focus: 'dims' });
  } else if (t.hasAttribute('data-shutter')) {
    state.preview.shutter = Number(t.value);
    viewer.setPreview({ shutter: state.preview.shutter });
  }
});

document.addEventListener('change', (e) => {
  const t = e.target;
  const win = activeWindow();
  if (t.dataset.num && win) {
    const key = t.dataset.num;
    win[key] = Number(t.value) || 0;
    clampSize(win);
    commit({ focus: 'dims' });
  } else if (t.dataset.range && win) {
    clampSize(win);
    commit({ focus: 'dims' });
  } else if (t.dataset.qty) {
    const w = state.windows.find((x) => x.id === t.dataset.qty);
    w.qty = Math.max(1, Math.min(99, Math.round(Number(t.value) || 1)));
    commit({});
  }
});
document.addEventListener('click', (e) => { if (e.target.matches('.stepper input')) e.stopPropagation(); }, true);

// ---------- Angebot & PDF ----------
async function downloadPDF() {
  const btn = document.querySelector('[data-act="pdf"]');
  const modal = showModal(`<h2>PDF wird erstellt</h2><p class="lead">Wir rendern alle Positionen in 3D und setzen Ihr Angebot.</p><div class="progress"><i id="pdf-progress"></i></div>`);
  try {
    if (btn) btn.disabled = true;
    await generateOfferPDF(state, (p) => { const el = document.getElementById('pdf-progress'); if (el) el.style.width = `${Math.round(p * 100)}%`; });
    closeModal();
    toast('PDF heruntergeladen');
  } catch (err) {
    console.error(err);
    modal.querySelector('.modal').innerHTML = `<h2>PDF konnte nicht erstellt werden</h2><p class="lead">${esc(err.message)}</p><div class="actions"><button class="btn" data-act="close-modal">Schließen</button></div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function showModal(html) {
  const root = $('#modal-root');
  root.innerHTML = `<div class="modal-backdrop"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`;
  root.querySelector('.modal-backdrop').addEventListener('click', (e) => { if (e.target.classList.contains('modal-backdrop')) closeModal(); });
  return root;
}
function closeModal() { $('#modal-root').innerHTML = ''; }

function openRequest() {
  const c = state.customer || {};
  const totals = sumTotals();
  showModal(`<h2>Angebot anfordern</h2>
    <p class="lead">${totals.count} Fenster · ${fmtEUR(totals.gross)} inkl. MwSt. – wir melden uns innerhalb von 24 Stunden mit einem verbindlichen Angebot.</p>
    <form id="req-form" novalidate>
      <div class="grid-2">
        <div><label class="field-label" for="r-name">Name *</label><input id="r-name" name="name" class="input" value="${esc(c.name)}" autocomplete="name" required /></div>
        <div><label class="field-label" for="r-phone">Telefon</label><input id="r-phone" name="phone" class="input" value="${esc(c.phone)}" autocomplete="tel" /></div>
      </div>
      <label class="field-label" for="r-email">E-Mail *</label><input id="r-email" name="email" type="email" class="input" value="${esc(c.email)}" autocomplete="email" required />
      <div class="grid-2">
        <div><label class="field-label" for="r-street">Straße & Nr.</label><input id="r-street" name="street" class="input" value="${esc(c.street)}" autocomplete="street-address" /></div>
        <div><label class="field-label" for="r-city">PLZ & Ort</label><input id="r-city" name="city" class="input" value="${esc(c.city)}" autocomplete="postal-code" /></div>
      </div>
      <label class="field-label" for="r-msg">Nachricht</label><textarea id="r-msg" name="message" class="input" placeholder="z. B. gewünschter Einbautermin">${esc(c.message)}</textarea>
      <label class="check"><input type="checkbox" name="measure" ${c.measure ? 'checked' : ''} /> Ich wünsche ein kostenloses Aufmaß vor Ort.</label>
      <div class="err" id="req-err"></div>
      <div class="actions">
        <button type="button" class="btn" data-act="close-modal">Abbrechen</button>
        <button type="submit" class="btn btn-primary">${icon('send')}Angebot anfordern</button>
      </div>
    </form>`);
  $('#req-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target).entries());
    fd.measure = !!fd.measure;
    if (!fd.name?.trim() || !/^\S+@\S+\.\S+$/.test(fd.email || '')) {
      $('#req-err').textContent = 'Bitte Name und eine gültige E-Mail-Adresse angeben.';
      return;
    }
    state.customer = fd;
    commit({ light: true });
    const ref = `VFO-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 900) + 100)}`;
    state.customer.ref = ref;
    commit({ light: true });
    $('#modal-root .modal').innerHTML = `<div class="success-icon">${icon('check')}</div>
      <h2>Vielen Dank, ${esc(fd.name.split(' ')[0])}!</h2>
      <p class="lead">Ihre Anfrage <b>${ref}</b> ist eingegangen. Die Zusammenfassung mit allen Positionen können Sie sich jetzt als PDF herunterladen.</p>
      <div class="actions"><button type="button" class="btn" data-act="close-modal">Schließen</button>
      <button type="button" class="btn btn-primary" data-act="pdf">${icon('download')}PDF herunterladen</button></div>`;
  });
}

// ---------- Start ----------
render({ focus: 'overview' });
requestAnimationFrame(() => requestAnimationFrame(() => $('#loading').classList.add('done')));
setTimeout(() => $('#loading').classList.add('done'), 900);
