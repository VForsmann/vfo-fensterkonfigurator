// UI-Bausteine: Icons, Optionskarten, Farbfelder, Fensterschema (SVG).
import { OPENINGS, byId, layoutFields, fmtEUR } from './catalog.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const P = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>',
  left: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 18l6-6-6-6"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  send: '<path d="M4 12l16-8-6 16-3-7-7-1z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  reset: '<path d="M4 4v6h6"/><path d="M5 15a8 8 0 1 0 2-8.5L4 10"/>',
  focus: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/><circle cx="12" cy="12" r="3"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18h.01"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ruler: '<path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/>',
  window: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
};
export const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

// Optionskarten
export function cards(options, current, data, { cols = 2, sub = (o) => o.desc, price } = {}) {
  return `<div class="opts cols-${cols}">${options.map((o) => `
    <button type="button" class="opt ${o.id === current ? 'is-on' : ''}" ${data} data-val="${esc(o.id)}" aria-pressed="${o.id === current}">
      <b>${esc(o.name)}</b>${sub && sub(o) ? `<small>${esc(sub(o))}</small>` : ''}${price ? `<span class="price">${price(o)}</span>` : ''}
    </button>`).join('')}</div>`;
}

export function chips(options, current, data) {
  return `<div class="chips">${options.map((o) => `
    <button type="button" class="chip ${o.id === current ? 'is-on' : ''}" ${data} data-val="${esc(o.id)}" aria-pressed="${o.id === current}">${esc(o.name)}</button>`).join('')}</div>`;
}

export function swatches(options, current, data) {
  return `<div class="swatches">${options.map((o) => `
    <button type="button" class="swatch ${o.id === current ? 'is-on' : ''}" ${data} data-val="${esc(o.id)}" title="${esc(o.name)} ${esc(o.code || '')}" aria-pressed="${o.id === current}">
      <i class="${o.kind === 'wood' ? 'wood' : ''}" style="background-color:${o.hex}"></i><b>${esc(o.name)}</b>${o.code ? `<small>${esc(o.code)}</small>` : ''}
    </button>`).join('')}</div>`;
}

export const priceTag = (v) => (v > 0 ? `+ ${fmtEUR(v)}` : 'inklusive');

// Fensterschema in Innenansicht (DIN-Öffnungssymbole: Spitze zeigt zur Bandseite)
export function schematic(cfg, { hl = -1, interactive = false, stroke = '#111827', glass = '#e8f4fa' } = {}) {
  const lay = layoutFields(cfg);
  const pad = Math.max(lay.W, lay.H) * 0.04;
  const sw = Math.max(lay.W, lay.H) / 140;
  const parts = [];
  parts.push(`<rect x="0" y="0" width="${lay.W}" height="${lay.H}" fill="#fff" stroke="${stroke}" stroke-width="${sw * 1.2}"/>`);
  const field = (f, idx, opening) => {
    const op = byId(OPENINGS, opening);
    const inset = op.id === 'F' ? 0 : -lay.fw * 0.25;
    const x = f.x + inset, y = f.y + inset, w = f.w - 2 * inset, h = f.h - 2 * inset;
    const on = idx === hl;
    let g = `<rect class="glass" x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="${on ? '#c9ecf9' : glass}" stroke="${stroke}" stroke-width="${sw * 0.7}"/>`;
    if (op.id !== 'F') g += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${stroke}" stroke-width="${sw * 0.9}"/>`;
    const L = [];
    const midY = f.y + f.h / 2, midX = f.x + f.w / 2;
    if (op.turn) {
      const hingeLeft = op.hinge === 'L';
      const ax = hingeLeft ? f.x : f.x + f.w, bx = hingeLeft ? f.x + f.w : f.x;
      L.push(`M${bx} ${f.y} L${ax} ${midY} L${bx} ${f.y + f.h}`);
      // Griff
      const gx = hingeLeft ? f.x + f.w - lay.fw * 0.15 : f.x + lay.fw * 0.15;
      g += `<rect x="${gx - sw * 1.2}" y="${midY - lay.fw * 0.55}" width="${sw * 2.4}" height="${lay.fw * 1.1}" rx="${sw}" fill="${stroke}"/>`;
    }
    if (op.tilt) L.push(`M${f.x} ${f.y} L${midX} ${f.y + f.h} L${f.x + f.w} ${f.y}`);
    if (op.id === 'F') g += `<text x="${midX}" y="${midY}" text-anchor="middle" dominant-baseline="central" font-size="${Math.min(f.w, f.h) * 0.16}" font-family="Nunito Sans, sans-serif" font-weight="800" fill="#9ca3af">F</text>`;
    if (L.length) g += `<path d="${L.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${sw * 0.6}" stroke-dasharray="${op.turn && op.tilt ? '' : ''}"/>`;
    return interactive && idx >= 0 ? `<g class="field-hit" data-act="pick-field" data-idx="${idx}">${g}</g>` : g;
  };
  lay.fields.forEach((f, i) => parts.push(field(f, i, f.opening)));
  if (lay.transomField) parts.push(field(lay.transomField, -1, lay.transomField.opening === 'K' ? 'K' : 'F'));
  for (const m of lay.mullions) parts.push(`<rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" fill="#fff" stroke="${stroke}" stroke-width="${sw * 0.7}"/>`);
  if (lay.transomBar) { const b = lay.transomBar; parts.push(`<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="#fff" stroke="${stroke}" stroke-width="${sw * 0.7}"/>`); }
  return `<svg viewBox="${-pad} ${-pad} ${lay.W + 2 * pad} ${lay.H + 2 * pad}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">${parts.join('')}</svg>`;
}

export function openingSummary(cfg) {
  const names = cfg.fields.map((f) => byId(OPENINGS, f).short);
  const t = cfg.transom !== 'none' ? ` + OL ${cfg.transom === 'K' ? 'kipp' : 'fest'}` : '';
  return names.join(' | ') + t;
}
