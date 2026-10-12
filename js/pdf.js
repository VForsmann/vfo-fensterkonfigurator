// Angebots-PDF im K3-Design: Deckblatt mit Positionsliste, je Position eine Detailseite mit 3D-Renderings.
import {
  MATERIALS, PROFILES, COLORS, GLAZING, GLASS_SURFACES, MUNTINS, MUNTIN_TYPES, HANDLES, HANDLE_COLORS, SECURITY,
  SHUTTERS, SHUTTER_COLORS, SHUTTER_DRIVES, SCREENS, SILLS, OPENINGS, VAT, byId, priceOf, layoutFields, fmtEUR,
} from './catalog.js';
import { effective, groupOfKey } from './state.js';
import { snapshot } from './viewer.js';
import { openingSummary } from './ui.js';

const C = {
  primary: [0, 164, 221], primaryDark: [4, 121, 163], primaryLight: [232, 247, 253],
  ink: [17, 24, 39], ink2: [55, 65, 81], muted: [107, 114, 128], line: [229, 231, 235], bg: [243, 245, 248], white: [255, 255, 255],
};
const PW = 210, PH = 297, M = 18;
const COMPANY = 'VFO Fenster · Musterstraße 12 · 10115 Berlin · Tel. 030 123 456 0 · angebot@vfo-fenster.de';

const tick = () => new Promise((r) => setTimeout(r, 0));
const mm = (v) => `${Math.round(v).toLocaleString('de-DE')} mm`;
const eur = (v) => fmtEUR(v).replace(/ /g, ' ');

export async function generateOfferPDF(state, onProgress = () => {}) {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) throw new Error('PDF-Bibliothek nicht geladen. Bitte Internetverbindung prüfen.');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const wins = state.windows;
  const now = new Date();
  const ref = state.customer?.ref || `VFO-${now.toISOString().slice(2, 10).replace(/-/g, '')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  const date = now.toLocaleDateString('de-DE');
  const valid = new Date(now.getTime() + 30 * 864e5).toLocaleDateString('de-DE');

  // 3D-Renderings
  const imgs = [];
  for (let i = 0; i < wins.length; i++) {
    const cfg = effective(wins[i]);
    const out = snapshot(cfg, 'outside', 1600, 700);
    await tick();
    const inn = snapshot(cfg, 'inside', 960, 600);
    await tick();
    const thumb = snapshot(cfg, 'outside', 420, 300);
    imgs.push({ out, inn, thumb });
    onProgress(((i + 1) / (wins.length + 1)) * 0.9);
    await tick();
  }

  const rows = wins.map((w, i) => {
    const cfg = effective(w);
    return { w, i, cfg, price: priceOf(cfg) };
  });
  const net = rows.reduce((s, r) => s + r.price.total, 0);
  const vat = Math.round(net * VAT * 100) / 100;
  const gross = net + vat;
  const count = wins.reduce((s, w) => s + w.qty, 0);
  const area = rows.reduce((s, r) => s + r.price.area * r.w.qty, 0);

  // ---------- Deckblatt ----------
  const header = () => {
    // Logo
    doc.setDrawColor(...C.primary); doc.setLineWidth(0.8);
    doc.roundedRect(M, 12, 8, 8, 1.2, 1.2, 'S');
    doc.setFillColor(...C.primary); doc.rect(M + 4.4, 13.6, 2.2, 2.2, 'F');
    doc.setFillColor(201, 236, 249); doc.rect(M + 1.6, 13.6, 2.2, 2.2, 'F'); doc.rect(M + 1.6, 16.3, 2.2, 2.2, 'F'); doc.rect(M + 4.4, 16.3, 2.2, 2.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.ink);
    doc.text('VFO Fenster', M + 11, 15.6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    doc.text('Fenster nach Maß', M + 11, 19.2);
    doc.setFontSize(8); doc.setTextColor(...C.ink2);
    doc.text(`Angebot ${ref}`, PW - M, 15.6, { align: 'right' });
    doc.setTextColor(...C.muted);
    doc.text(date, PW - M, 19.2, { align: 'right' });
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2);
    doc.line(M, 24, PW - M, 24);
  };
  const footer = (n, total) => {
    doc.setDrawColor(...C.line); doc.setLineWidth(0.2);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.muted);
    doc.text(COMPANY, M, PH - 9);
    doc.text(`Seite ${n} von ${total}`, PW - M, PH - 9, { align: 'right' });
  };

  header();
  let y = 40;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.primary);
  doc.text('ANGEBOT', M, y);
  doc.setFontSize(25); doc.setTextColor(...C.ink);
  doc.text('Ihr Fensterangebot', M, y + 10);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.muted);
  doc.text(`${count} Fenster in ${wins.length} ${wins.length === 1 ? 'Position' : 'Positionen'} – individuell für Sie konfiguriert.`, M, y + 17);

  // Kunde & Meta
  y = 68;
  const cust = state.customer;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
  doc.text('KUNDE', M, y);
  doc.text('ANGEBOTSDATEN', 120, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.ink);
  const custLines = cust ? [cust.name, cust.street, cust.city, cust.email, cust.phone].filter(Boolean) : ['Noch keine Kundendaten', 'Angebot anfordern, um Ihre Daten zu ergänzen'];
  custLines.forEach((l, i) => { doc.setTextColor(...(cust || i === 0 ? C.ink : C.muted)); doc.text(String(l), M, y + 6 + i * 4.8); });
  const meta = [['Angebotsnummer', ref], ['Datum', date], ['Gültig bis', valid], ['Lieferzeit', 'ca. 6–8 Wochen']];
  meta.forEach(([k, v], i) => {
    doc.setTextColor(...C.muted); doc.text(k, 120, y + 6 + i * 4.8);
    doc.setTextColor(...C.ink); doc.setFont('helvetica', 'bold'); doc.text(v, PW - M, y + 6 + i * 4.8, { align: 'right' }); doc.setFont('helvetica', 'normal');
  });

  // KPI-Kacheln
  y = 98;
  const kpis = [['Positionen', String(wins.length)], ['Fenster gesamt', String(count)], ['Fensterfläche', `${area.toFixed(2).replace('.', ',')} m²`], ['Gesamt brutto', eur(gross)]];
  const kw = (PW - 2 * M - 3 * 4) / 4;
  kpis.forEach(([k, v], i) => {
    const x = M + i * (kw + 4);
    const hl = i === 3;
    doc.setFillColor(...(hl ? C.primary : C.bg));
    doc.roundedRect(x, y, kw, 20, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...(hl ? C.white : C.muted));
    doc.text(k, x + 4, y + 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(hl ? 12 : 13); doc.setTextColor(...(hl ? C.white : C.ink));
    doc.text(v, x + 4, y + 15);
  });

  // Positionstabelle
  y = 128;
  const cols = { img: M, pos: M + 27, desc: M + 35, size: 117, qty: 147, ep: 170, gp: PW - M };
  const tableHead = (yy) => {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
    doc.text('POS.', cols.pos, yy); doc.text('BEZEICHNUNG', cols.desc, yy); doc.text('MASSE (B × H)', cols.size, yy);
    doc.text('MENGE', cols.qty, yy, { align: 'right' }); doc.text('EINZELPREIS', cols.ep, yy, { align: 'right' }); doc.text('GESAMT', cols.gp, yy, { align: 'right' });
    doc.setDrawColor(...C.line); doc.line(M, yy + 2.5, PW - M, yy + 2.5);
  };
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...C.ink);
  doc.text('Positionen', M, y);
  y += 8;
  tableHead(y);
  y += 4;
  const pages = [];
  const rowH = 21;
  for (const r of rows) {
    if (y + rowH > PH - 62) {
      pages.push(doc.getNumberOfPages());
      doc.addPage(); header(); y = 36; tableHead(y); y += 4;
    }
    try { doc.addImage(imgs[r.i].thumb, 'JPEG', cols.img, y + 2, 23.5, 16.8); } catch { /* Bild fehlt */ }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...C.primary);
    doc.text(String(r.i + 1), cols.pos, y + 8);
    doc.setTextColor(...C.ink); doc.text(clip(doc, r.w.name, 78), cols.desc, y + 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...C.muted);
    doc.text(clip(doc, `${r.w.floor}${r.w.room ? ' · ' + r.w.room : ''} · ${byId(MATERIALS, r.cfg.material).name} · ${openingSummary(r.cfg)}`, 78), cols.desc, y + 12.3);
    doc.text(clip(doc, `${byId(COLORS, r.cfg.colorOut).name} / ${byId(COLORS, r.cfg.colorIn).name} · ${byId(GLAZING, r.cfg.glazing).name}`, 78), cols.desc, y + 16.2);
    doc.setFontSize(9); doc.setTextColor(...C.ink);
    doc.text(`${r.cfg.width} × ${r.cfg.height}`, cols.size, y + 8);
    doc.text(`${r.w.qty}`, cols.qty, y + 8, { align: 'right' });
    doc.text(eur(r.price.unit), cols.ep, y + 8, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(eur(r.price.total), cols.gp, y + 8, { align: 'right' });
    doc.setDrawColor(...C.line); doc.line(M, y + rowH, PW - M, y + rowH);
    y += rowH;
  }

  // Summen
  y += 8;
  const sx = 118;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.ink2);
  doc.text('Summe netto', sx, y); doc.text(eur(net), PW - M, y, { align: 'right' });
  doc.text(`zzgl. ${Math.round(VAT * 100)} % MwSt.`, sx, y + 6); doc.text(eur(vat), PW - M, y + 6, { align: 'right' });
  doc.setFillColor(...C.primary);
  doc.roundedRect(sx - 4, y + 10, PW - M - sx + 4, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...C.white);
  doc.text('Gesamt brutto', sx, y + 17.8); doc.text(eur(gross), PW - M - 3, y + 17.8, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(...C.muted);
  const note = doc.splitTextToSize('Preise inkl. Lieferung frei Baustelle, zzgl. Montage. Unverbindliche Preisindikation auf Basis Ihrer Konfiguration – das verbindliche Angebot erhalten Sie nach Aufmaß vor Ort.', 90);
  doc.text(note, M, y + 1);

  onProgress(0.94);

  // ---------- Positionsseiten ----------
  for (const r of rows) {
    doc.addPage();
    header();
    positionPage(doc, r, imgs[r.i], wins.length);
    await tick();
  }

  // ---------- Hinweise ----------
  doc.addPage();
  header();
  y = 40;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.primary);
  doc.text('SO GEHT ES WEITER', M, y);
  doc.setFontSize(18); doc.setTextColor(...C.ink);
  doc.text('Ihre nächsten Schritte', M, y + 9);
  const stepsList = [
    ['Angebot prüfen', 'Kontrollieren Sie alle Positionen, Maße und Ausstattungen. Änderungen sind jederzeit im Konfigurator möglich.'],
    ['Aufmaß vor Ort', 'Unser Fachberater misst alle Öffnungen exakt aus und prüft die Einbausituation – kostenlos und unverbindlich.'],
    ['Verbindliches Angebot', 'Auf Basis des Aufmaßes erhalten Sie Ihr finales Angebot inkl. Montage und Entsorgung der Altfenster.'],
    ['Fertigung & Montage', 'Nach Auftragsbestätigung fertigen wir Ihre Fenster in ca. 6–8 Wochen und bauen sie fachgerecht nach RAL ein.'],
  ];
  y += 22;
  stepsList.forEach(([t, d], i) => {
    doc.setFillColor(...C.primaryLight); doc.circle(M + 5, y + 1.5, 5, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.primaryDark);
    doc.text(String(i + 1), M + 5, y + 3, { align: 'center' });
    doc.setTextColor(...C.ink); doc.setFontSize(10.5); doc.text(t, M + 15, y + 1);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.ink2);
    doc.text(doc.splitTextToSize(d, PW - 2 * M - 15), M + 15, y + 6);
    y += 20;
  });
  y += 6;
  doc.setFillColor(...C.bg); doc.roundedRect(M, y, PW - 2 * M, 38, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.ink);
  doc.text('Konditionen', M + 6, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...C.ink2);
  doc.text(doc.splitTextToSize(`Gültigkeit des Angebots bis ${valid}. Zahlungsbedingungen: 30 % Anzahlung bei Auftragserteilung, Rest nach Montage. Gewährleistung 5 Jahre auf Profile und Beschläge, 10 Jahre auf Isolierglas. Alle Maße sind Rahmenaußenmaße; Farbabweichungen zu den Darstellungen sind möglich. 3D-Darstellungen sind nicht maßstabsgetreu.`, PW - 2 * M - 12), M + 6, y + 15);

  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) { doc.setPage(p); footer(p, total); }
  onProgress(1);
  doc.save(`Angebot_${ref}.pdf`);
}

function clip(doc, text, maxW) {
  let t = String(text);
  if (doc.getTextWidth(t) <= maxW) return t;
  while (t.length > 1 && doc.getTextWidth(`${t}…`) > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function positionPage(doc, r, img, n) {
  const { w, i, cfg, price } = r;
  let y = 36;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.primary);
  doc.text(`POSITION ${i + 1} VON ${n}`, M, y);
  doc.setFontSize(19); doc.setTextColor(...C.ink);
  doc.text(clip(doc, w.name, 120), M, y + 8.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...C.muted);
  doc.text(`${w.floor}${w.room ? ' · ' + w.room : ''} · ${mm(cfg.width)} × ${mm(cfg.height)} · ${w.qty} Stück`, M, y + 14.5);
  // Preis-Pill rechts
  doc.setFillColor(...C.ink);
  const pt = eur(price.total);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const pw = doc.getTextWidth(pt) + 10;
  doc.roundedRect(PW - M - pw, y + 1, pw, 10, 2, 2, 'F');
  doc.setTextColor(...C.white); doc.text(pt, PW - M - pw / 2, y + 7.6, { align: 'center' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...C.muted);
  doc.text('netto, Position gesamt', PW - M, y + 15, { align: 'right' });

  // Hero
  y = 56;
  const hw = PW - 2 * M, hh = hw * (700 / 1600);
  try { doc.addImage(img.out, 'JPEG', M, y, hw, hh); } catch { /* */ }
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(M + 3, y + 3, 26, 6.5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C.ink2);
  doc.text('Außenansicht', M + 16, y + 7.3, { align: 'center' });

  // Spalten
  y = y + hh + 7;
  const colW = (PW - 2 * M - 8) / 2;
  const lx = M, rx = M + colW + 8;
  // Innenansicht
  const ih = colW * (600 / 960);
  try { doc.addImage(img.inn, 'JPEG', lx, y, colW, ih); } catch { /* */ }
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(lx + 2.5, y + 2.5, 24, 6, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C.ink2);
  doc.text('Innenansicht', lx + 14.5, y + 6.5, { align: 'center' });
  // Technische Zeichnung
  const dy = y + ih + 5;
  const dh = PH - 18 - dy;
  drawTechnical(doc, cfg, lx, dy, colW, dh);

  // Spezifikation
  let sy = y + 1;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...C.ink);
  doc.text('Ausstattung', rx, sy + 3);
  sy += 8;
  const specs = specRows(w, cfg);
  const hasOwn = specs.some((s) => s[2]);
  const bottom = PH - 19;
  let rowH = 5, lineH = 4.4;
  const need = () => specs.length * rowH + (hasOwn ? 4 : 0) + 4 + 9 + price.lines.length * lineH + 15;
  while (sy + need() > bottom && rowH > 3.9) { rowH -= 0.1; lineH = Math.max(3.6, lineH - 0.08); }
  doc.setFontSize(8);
  for (const s of specs) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.muted);
    doc.text(s[0], rx, sy);
    doc.setTextColor(...C.ink);
    if (s[2]) { doc.setFillColor(...C.primary); doc.circle(rx + colW - doc.getTextWidth(clip(doc, s[1], colW - 32)) - 2.6, sy - 1, 0.9, 'F'); }
    doc.text(clip(doc, s[1], colW - 32), rx + colW, sy, { align: 'right' });
    doc.setDrawColor(...C.line); doc.setLineWidth(0.15); doc.line(rx, sy + rowH * 0.32, rx + colW, sy + rowH * 0.32);
    sy += rowH;
  }
  if (specs.some((s) => s[2])) {
    doc.setFillColor(...C.primary); doc.circle(rx + 0.9, sy - 0.2, 0.9, 'F');
    doc.setFontSize(7); doc.setTextColor(...C.muted); doc.text('= abweichend von den Grundeinstellungen', rx + 3, sy + 0.5);
    sy += 4;
  }
  // Preisaufstellung
  sy += 4;
  const boxH = 9 + price.lines.length * lineH + 15;
  doc.setFillColor(...C.bg); doc.roundedRect(rx, sy, colW, boxH, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...C.ink);
  doc.text('Preisaufstellung je Stück', rx + 4, sy + 6.5);
  let py = sy + 11.5;
  doc.setFontSize(7.6);
  for (const l of price.lines) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.ink2);
    doc.text(clip(doc, l.label, colW - 30), rx + 4, py);
    doc.text(eur(l.amount), rx + colW - 4, py, { align: 'right' });
    py += lineH;
  }
  doc.setDrawColor(209, 213, 219); doc.setLineWidth(0.2); doc.line(rx + 4, py - 1.8, rx + colW - 4, py - 1.8);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.ink);
  doc.text('Einzelpreis netto', rx + 4, py + 2.6); doc.text(eur(price.unit), rx + colW - 4, py + 2.6, { align: 'right' });
  doc.setTextColor(...C.primaryDark);
  doc.text(`Gesamt (${w.qty} Stück)`, rx + 4, py + 8); doc.text(eur(price.total), rx + colW - 4, py + 8, { align: 'right' });
}

function specRows(w, cfg) {
  const own = (k) => !!w.overrides[groupOfKey(k)];
  const prof = byId(PROFILES, cfg.profile);
  const gl = byId(GLAZING, cfg.glazing);
  const rows = [
    ['Rahmenaußenmaß', `${cfg.width} × ${cfg.height} mm`, false],
    ['Aufteilung', openingSummary(cfg), false],
    ['Material', byId(MATERIALS, cfg.material).name, own('material')],
    ['Profilsystem', `${prof.name}, ${Math.round(prof.depth * 1000)} mm, ${prof.chambers} Kammern`, own('profile')],
    ['Farbe außen', `${byId(COLORS, cfg.colorOut).name} (${byId(COLORS, cfg.colorOut).code})`, own('colorOut')],
    ['Farbe innen', `${byId(COLORS, cfg.colorIn).name} (${byId(COLORS, cfg.colorIn).code})`, own('colorIn')],
    ['Verglasung', `${gl.name}, ${gl.desc}`, own('glazing')],
    ['Glasart', byId(GLASS_SURFACES, cfg.glassSurface).name, own('glassSurface')],
    ['Sprossen', cfg.muntins === 'none' ? 'Keine' : `${byId(MUNTINS, cfg.muntins).name}, ${byId(MUNTIN_TYPES, cfg.muntinType).name}`, own('muntins')],
    ['Griff', `${byId(HANDLES, cfg.handle).name}, ${byId(HANDLE_COLORS, cfg.handleColor).name}`, own('handle')],
    ['Sicherheit', byId(SECURITY, cfg.security).name, own('security')],
    ['Rollladen', cfg.shutter === 'none' ? 'Kein' : `${byId(SHUTTERS, cfg.shutter).name}, ${byId(SHUTTER_COLORS, cfg.shutterColor).name}, ${byId(SHUTTER_DRIVES, cfg.shutterDrive).name}`, own('shutter')],
    ['Insektenschutz', byId(SCREENS, cfg.screen).name, own('screen')],
    ['Fensterbank außen', byId(SILLS, cfg.sill).name, own('sill')],
    ['Uw-Wert (ca.)', `${(Math.round((prof.uw + (gl.ug - 0.6) * 0.5) * 100) / 100).toString().replace('.', ',')} W/m²K`, false],
  ];
  return rows;
}

// 2D-Ansicht von innen mit DIN-Öffnungssymbolen und Maßketten
function drawTechnical(doc, cfg, x, y, w, h) {
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...C.ink2);
  doc.text('Technische Ansicht (von innen)', x, y + 2.5);
  const lay = layoutFields(cfg);
  const top = y + 7, availW = w - 14, availH = h - 7 - 10;
  const s = Math.min(availW / lay.W, availH / lay.H);
  const ox = x + (availW - lay.W * s) / 2, oy = top + 1;
  const X = (v) => ox + v * s, Y = (v) => oy + v * s;
  doc.setDrawColor(...C.ink); doc.setLineWidth(0.35);
  doc.setFillColor(255, 255, 255);
  doc.rect(X(0), Y(0), lay.W * s, lay.H * s, 'S');
  const field = (f, opening) => {
    const op = byId(OPENINGS, opening);
    doc.setFillColor(232, 244, 250); doc.setLineWidth(0.2);
    doc.rect(X(f.x), Y(f.y), f.w * s, f.h * s, 'FD');
    if (op.id !== 'F') {
      const ins = lay.fw * 0.25;
      doc.setLineWidth(0.3);
      doc.rect(X(f.x - ins), Y(f.y - ins), (f.w + 2 * ins) * s, (f.h + 2 * ins) * s, 'S');
    }
    doc.setLineWidth(0.18); doc.setDrawColor(...C.ink2);
    const midY = f.y + f.h / 2, midX = f.x + f.w / 2;
    if (op.turn) {
      const left = op.hinge === 'L';
      const ax = left ? f.x : f.x + f.w, bx = left ? f.x + f.w : f.x;
      doc.line(X(bx), Y(f.y), X(ax), Y(midY)); doc.line(X(ax), Y(midY), X(bx), Y(f.y + f.h));
      doc.setFillColor(...C.ink);
      const gx = left ? f.x + f.w - lay.fw * 0.15 : f.x + lay.fw * 0.15;
      doc.rect(X(gx) - 0.5, Y(midY - lay.fw * 0.5), 1, lay.fw * s, 'F');
    }
    if (op.tilt) { doc.line(X(f.x), Y(f.y), X(midX), Y(f.y + f.h)); doc.line(X(midX), Y(f.y + f.h), X(f.x + f.w), Y(f.y)); }
    if (op.id === 'F') { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(156, 163, 175); doc.text('F', X(midX), Y(midY) + 1.2, { align: 'center' }); }
    doc.setDrawColor(...C.ink);
  };
  lay.fields.forEach((f) => field(f, f.opening));
  if (lay.transomField) field(lay.transomField, lay.transomField.opening === 'K' ? 'K' : 'F');
  doc.setFillColor(255, 255, 255); doc.setLineWidth(0.2);
  lay.mullions.forEach((m) => doc.rect(X(m.x), Y(m.y), m.w * s, m.h * s, 'FD'));
  if (lay.transomBar) { const b = lay.transomBar; doc.rect(X(b.x), Y(b.y), b.w * s, b.h * s, 'FD'); }

  // Maßketten
  doc.setDrawColor(...C.primary); doc.setLineWidth(0.2);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C.primaryDark);
  const by = Y(lay.H) + 5;
  doc.line(X(0), by, X(lay.W), by);
  doc.line(X(0), by - 1.3, X(0), by + 1.3); doc.line(X(lay.W), by - 1.3, X(lay.W), by + 1.3);
  doc.line(X(0), Y(lay.H) + 0.8, X(0), by); doc.line(X(lay.W), Y(lay.H) + 0.8, X(lay.W), by);
  doc.text(`${cfg.width}`, X(lay.W / 2), by + 3.6, { align: 'center' });
  const rxx = X(lay.W) + 5;
  doc.line(rxx, Y(0), rxx, Y(lay.H));
  doc.line(rxx - 1.3, Y(0), rxx + 1.3, Y(0)); doc.line(rxx - 1.3, Y(lay.H), rxx + 1.3, Y(lay.H));
  doc.line(X(lay.W) + 0.8, Y(0), rxx, Y(0)); doc.line(X(lay.W) + 0.8, Y(lay.H), rxx, Y(lay.H));
  doc.text(`${cfg.height}`, rxx + 2.2, Y(lay.H / 2), { angle: 90, align: 'center' });
}
