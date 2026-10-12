// Produktkatalog, Optionen und Preislogik des Fensterkonfigurators.

export const MATERIALS = [
  { id: 'pvc', name: 'Kunststoff', desc: 'Pflegeleicht, beste Dämmung pro Euro', pricePerM2: 215, fw: 0.062, sw: 0.078, round: 0.0035 },
  { id: 'pvc-alu', name: 'Kunststoff-Alu', desc: 'Außen wetterfeste Alu-Deckschale', pricePerM2: 305, fw: 0.064, sw: 0.080, round: 0.002 },
  { id: 'wood', name: 'Holz', desc: 'Natürlich, warm, langlebig (Meranti)', pricePerM2: 345, fw: 0.072, sw: 0.088, round: 0.006 },
  { id: 'alu', name: 'Aluminium', desc: 'Schlanke Ansichten, maximal stabil', pricePerM2: 395, fw: 0.052, sw: 0.068, round: 0.0012 },
];

export const PROFILES = [
  { id: 's70', name: 'Classic 70', depth: 0.070, chambers: 5, uw: 1.3, factor: 1.0 },
  { id: 's76', name: 'Comfort 76', depth: 0.076, chambers: 6, uw: 1.1, factor: 1.08 },
  { id: 's82', name: 'Premium 82', depth: 0.082, chambers: 7, uw: 0.95, factor: 1.16 },
  { id: 's88', name: 'Passiv 88', depth: 0.088, chambers: 8, uw: 0.78, factor: 1.29 },
];

// surcharge = Aufpreis-Anteil pro Seite bezogen auf den Grundpreis
export const COLORS = [
  { id: 'white', name: 'Weiß', code: 'RAL 9016', hex: '#f4f4f0', kind: 'solid', rough: 0.36, surcharge: 0 },
  { id: 'cream', name: 'Cremeweiß', code: 'RAL 9001', hex: '#ece3cf', kind: 'solid', rough: 0.4, surcharge: 0.08 },
  { id: 'silver', name: 'Silbergrau', code: 'RAL 7001', hex: '#8b9496', kind: 'solid', rough: 0.5, surcharge: 0.1 },
  { id: 'basalt', name: 'Basaltgrau', code: 'RAL 7012', hex: '#4f5856', kind: 'solid', rough: 0.55, surcharge: 0.1 },
  { id: 'anthracite', name: 'Anthrazitgrau', code: 'RAL 7016', hex: '#383e42', kind: 'solid', rough: 0.58, surcharge: 0.1 },
  { id: 'black', name: 'Tiefschwarz', code: 'RAL 9005', hex: '#1d1d1f', kind: 'solid', rough: 0.55, surcharge: 0.12 },
  { id: 'brown', name: 'Schokobraun', code: 'RAL 8017', hex: '#45322e', kind: 'solid', rough: 0.55, surcharge: 0.1 },
  { id: 'golden-oak', name: 'Golden Oak', code: 'Holzdekor', hex: '#b0763a', kind: 'wood', rough: 0.6, surcharge: 0.13 },
  { id: 'winchester', name: 'Winchester', code: 'Holzdekor', hex: '#94643c', kind: 'wood', rough: 0.6, surcharge: 0.13 },
  { id: 'walnut', name: 'Nussbaum', code: 'Holzdekor', hex: '#633e25', kind: 'wood', rough: 0.6, surcharge: 0.13 },
  { id: 'mahogany', name: 'Mahagoni', code: 'Holzdekor', hex: '#6e3421', kind: 'wood', rough: 0.6, surcharge: 0.13 },
];

export const GLAZING = [
  { id: 'g2', name: '2-fach Wärmeschutz', desc: 'Ug 1,1 W/m²K', panes: 2, ug: 1.1, pricePerM2: 0 },
  { id: 'g3', name: '3-fach Wärmeschutz', desc: 'Ug 0,6 W/m²K', panes: 3, ug: 0.6, pricePerM2: 42 },
  { id: 'g3s', name: '3-fach Schallschutz', desc: 'Ug 0,6 · Rw 42 dB', panes: 3, ug: 0.6, pricePerM2: 88 },
  { id: 'g3v', name: '3-fach Sicherheitsglas', desc: 'Ug 0,6 · VSG P4A innen', panes: 3, ug: 0.6, pricePerM2: 125 },
];

export const GLASS_SURFACES = [
  { id: 'clear', name: 'Klarglas', desc: 'Volle Durchsicht', pricePerM2: 0 },
  { id: 'satin', name: 'Satiniert', desc: 'Blickdicht, lichtdurchlässig', pricePerM2: 48 },
  { id: 'ornament', name: 'Ornament 504', desc: 'Strukturglas fürs Bad', pricePerM2: 39 },
];

export const MUNTINS = [
  { id: 'none', name: 'Keine Sprossen', price: 0 },
  { id: 'cross', name: 'Kreuz (4 Felder)', price: 34 },
  { id: 'grid6', name: '6 Felder', price: 58 },
];

export const MUNTIN_TYPES = [
  { id: 'applied', name: 'Wiener Sprosse', desc: 'Aufliegend, innen & außen', factor: 1 },
  { id: 'inner', name: 'Innenliegend', desc: 'Im Scheibenzwischenraum', factor: 0.7 },
];

export const HANDLES = [
  { id: 'standard', name: 'Standardgriff', desc: 'Klassische Form', price: 0 },
  { id: 'design', name: 'Designgriff', desc: 'Schlank, eckig', price: 26 },
  { id: 'lock', name: 'Abschließbar', desc: 'Mit Schließzylinder', price: 39 },
  { id: 'button', name: 'Druckknopf', desc: 'Kindersicher', price: 29 },
];

export const HANDLE_COLORS = [
  { id: 'white', name: 'Weiß', hex: '#f1f1ee', metal: 0.0, rough: 0.35, price: 0 },
  { id: 'silver', name: 'Silber', hex: '#c8cbcd', metal: 0.85, rough: 0.32, price: 0 },
  { id: 'steel', name: 'Edelstahl', hex: '#b9bbba', metal: 1.0, rough: 0.24, price: 9 },
  { id: 'titan', name: 'Titan', hex: '#8a8780', metal: 0.9, rough: 0.35, price: 9 },
  { id: 'black', name: 'Schwarz matt', hex: '#202020', metal: 0.3, rough: 0.55, price: 6 },
  { id: 'brass', name: 'Messing', hex: '#c8a258', metal: 1.0, rough: 0.28, price: 14 },
];

export const SECURITY = [
  { id: 'basic', name: 'Grundsicherheit', desc: '2 Pilzkopfzapfen je Flügel', price: 0 },
  { id: 'rc1', name: 'RC1 N', desc: 'Umlaufend Pilzkopfzapfen', price: 48 },
  { id: 'rc2', name: 'RC2', desc: 'Einbruchhemmend, mit VSG empfohlen', price: 115 },
];

export const SHUTTERS = [
  { id: 'none', name: 'Kein Rollladen', desc: '', base: 0, pricePerM2: 0 },
  { id: 'top', name: 'Aufsatzrollladen', desc: 'Kasten auf dem Fenster, innen sichtbar', base: 125, pricePerM2: 148 },
  { id: 'front', name: 'Vorbaurollladen', desc: 'Kasten außen auf der Fassade', base: 145, pricePerM2: 168 },
];

export const SHUTTER_COLORS = [
  { id: 'white', name: 'Weiß', hex: '#ecece8' },
  { id: 'silver', name: 'Silber', hex: '#a7adb1' },
  { id: 'anthracite', name: 'Anthrazit', hex: '#3b4045' },
  { id: 'brown', name: 'Braun', hex: '#4b3529' },
];

export const SHUTTER_DRIVES = [
  { id: 'belt', name: 'Gurtwickler', desc: 'Manuell', price: 0 },
  { id: 'motor', name: 'Elektromotor', desc: 'Mit Wandschalter', price: 185 },
  { id: 'smart', name: 'Smart-Motor', desc: 'Funk & App-Steuerung', price: 295 },
];

export const SCREENS = [
  { id: 'none', name: 'Kein Insektenschutz', desc: '', base: 0, pricePerM2: 0 },
  { id: 'frame', name: 'Spannrahmen', desc: 'Fest vor dem Fenster', base: 38, pricePerM2: 58 },
  { id: 'pleat', name: 'Plissee', desc: 'Seitlich verschiebbar', base: 85, pricePerM2: 112 },
];

export const SILLS = [
  { id: 'none', name: 'Keine', hex: null, pricePerM: 0 },
  { id: 'alu-silver', name: 'Alu silber', hex: '#c4c8cb', pricePerM: 46 },
  { id: 'alu-white', name: 'Alu weiß', hex: '#ededea', pricePerM: 52 },
  { id: 'alu-anthracite', name: 'Alu anthrazit', hex: '#3a3f43', pricePerM: 58 },
  { id: 'alu-bronze', name: 'Alu bronze', hex: '#7a6248', pricePerM: 58 },
];

export const OPENINGS = [
  { id: 'DKL', name: 'Dreh-Kipp links', short: 'DK links', hinge: 'L', turn: true, tilt: true, price: 98 },
  { id: 'DKR', name: 'Dreh-Kipp rechts', short: 'DK rechts', hinge: 'R', turn: true, tilt: true, price: 98 },
  { id: 'DL', name: 'Dreh links', short: 'Dreh links', hinge: 'L', turn: true, tilt: false, price: 72 },
  { id: 'DR', name: 'Dreh rechts', short: 'Dreh rechts', hinge: 'R', turn: true, tilt: false, price: 72 },
  { id: 'K', name: 'Kipp', short: 'Kipp', hinge: 'B', turn: false, tilt: true, price: 64 },
  { id: 'F', name: 'Festverglasung', short: 'Fest', hinge: null, turn: false, tilt: false, price: 0 },
];

export const TRANSOMS = [
  { id: 'none', name: 'Kein Oberlicht', price: 0 },
  { id: 'F', name: 'Oberlicht fest', price: 85 },
  { id: 'K', name: 'Oberlicht kippbar', price: 165 },
];

export const FLOORS = ['KG', 'EG', '1. OG', '2. OG', 'DG'];

export const LIMITS = { wMin: 400, wMax: 3000, hMin: 400, hMax: 2600, fieldMax: 1300, transomMin: 250 };

// Gruppen: werden in den Grundeinstellungen definiert und können pro Fenster überschrieben werden
export const GROUPS = {
  system: { title: 'Material & Profil', keys: ['material', 'profile'] },
  safety: { title: 'Sicherheit', keys: ['security'] },
  colors: { title: 'Farben', keys: ['colorOut', 'colorIn'] },
  glazing: { title: 'Verglasung', keys: ['glazing', 'glassSurface'] },
  muntins: { title: 'Sprossen', keys: ['muntins', 'muntinType'] },
  handle: { title: 'Griff', keys: ['handle', 'handleColor'] },
  shutter: { title: 'Rollladen', keys: ['shutter', 'shutterColor', 'shutterDrive'] },
  screen: { title: 'Insektenschutz', keys: ['screen'] },
  sill: { title: 'Fensterbank außen', keys: ['sill'] },
};

export const DEFAULTS = {
  material: 'pvc', profile: 's82',
  security: 'basic',
  colorOut: 'white', colorIn: 'white',
  glazing: 'g3', glassSurface: 'clear',
  muntins: 'none', muntinType: 'applied',
  handle: 'standard', handleColor: 'white',
  shutter: 'none', shutterColor: 'anthracite', shutterDrive: 'belt',
  screen: 'none',
  sill: 'alu-silver',
};

export const WINDOW_TABS = [
  { id: 'size', name: 'Maße' },
  { id: 'layout', name: 'Aufteilung' },
  { id: 'system', name: 'Profil' },
  { id: 'colors', name: 'Farben' },
  { id: 'glass', name: 'Glas' },
  { id: 'handle', name: 'Griff' },
  { id: 'extras', name: 'Extras' },
];

export const byId = (list, id) => list.find((o) => o.id === id) || list[0];

export const VAT = 0.19;

// --- Geometrie der Felder (Ansicht von innen, Maße in mm, y nach unten) ---
export function layoutFields(cfg) {
  const mat = byId(MATERIALS, cfg.material);
  const fw = mat.fw * 1000;
  const mw = fw * 1.25;
  const W = cfg.width, H = cfg.height;
  const n = cfg.fields.length;
  const res = { W, H, fw, mw, fields: [], mullions: [], transomBar: null, transomField: null };
  let top = fw;
  if (cfg.transom !== 'none') {
    const th = cfg.transomHeight;
    res.transomField = { x: fw, y: fw, w: W - 2 * fw, h: th, opening: cfg.transom };
    res.transomBar = { x: fw, y: fw + th, w: W - 2 * fw, h: mw };
    top = fw + th + mw;
  }
  const bottom = H - fw;
  const lightW = W - 2 * fw - (n - 1) * mw;
  const fieldW = lightW / n;
  for (let i = 0; i < n; i++) {
    const x = fw + i * (fieldW + mw);
    res.fields.push({ x, y: top, w: fieldW, h: bottom - top, opening: cfg.fields[i] });
    if (i < n - 1) res.mullions.push({ x: x + fieldW, y: top, w: mw, h: bottom - top });
  }
  return res;
}

export function validate(cfg) {
  const msgs = [];
  const lay = layoutFields(cfg);
  for (const f of lay.fields) {
    const op = byId(OPENINGS, f.opening);
    if (op.turn && f.w > LIMITS.fieldMax) msgs.push(`Flügelbreite ${Math.round(f.w)} mm überschreitet das Maximum von ${LIMITS.fieldMax} mm für Drehflügel. Bitte mehr Flügel wählen.`);
    if (f.w < 300) msgs.push('Ein Flügel ist schmaler als 300 mm. Bitte weniger Flügel oder größere Breite wählen.');
    if (f.h < 300) msgs.push('Flügelhöhe zu gering – Oberlicht kleiner wählen.');
  }
  if (cfg.transom !== 'none' && cfg.height < 1400) msgs.push('Oberlichter sind ab 1.400 mm Gesamthöhe möglich.');
  return msgs;
}

// --- Preise ---
export function priceOf(cfg) {
  const lines = [];
  const area = (cfg.width / 1000) * (cfg.height / 1000);
  const mat = byId(MATERIALS, cfg.material);
  const prof = byId(PROFILES, cfg.profile);
  const base = Math.max(area, 0.6) * mat.pricePerM2 * prof.factor;
  lines.push({ label: `${mat.name} · ${prof.name}`, amount: base });

  const lay = layoutFields(cfg);
  let opening = 0, sashes = 0;
  for (const f of lay.fields) {
    const op = byId(OPENINGS, f.opening);
    opening += op.price;
    if (op.id !== 'F') sashes++;
  }
  if (lay.mullions.length) opening += lay.mullions.length * 48;
  if (cfg.transom !== 'none') {
    opening += byId(TRANSOMS, cfg.transom).price;
    if (cfg.transom === 'K') sashes++;
  }
  lines.push({ label: 'Öffnungsarten & Pfosten', amount: opening });

  const cOut = byId(COLORS, cfg.colorOut), cIn = byId(COLORS, cfg.colorIn);
  const colorAmt = base * (cOut.surcharge + cIn.surcharge);
  if (colorAmt > 0) lines.push({ label: `Farbe außen ${cOut.name} / innen ${cIn.name}`, amount: colorAmt });

  const gl = byId(GLAZING, cfg.glazing), gs = byId(GLASS_SURFACES, cfg.glassSurface);
  const glassAmt = area * (gl.pricePerM2 + gs.pricePerM2);
  if (glassAmt > 0) lines.push({ label: `${gl.name}${gs.id !== 'clear' ? ', ' + gs.name : ''}`, amount: glassAmt });

  if (cfg.muntins !== 'none') {
    const fieldsCount = lay.fields.length + (lay.transomField ? 1 : 0);
    const amt = byId(MUNTINS, cfg.muntins).price * byId(MUNTIN_TYPES, cfg.muntinType).factor * fieldsCount;
    lines.push({ label: `Sprossen: ${byId(MUNTINS, cfg.muntins).name}`, amount: amt });
  }

  const hd = byId(HANDLES, cfg.handle), hc = byId(HANDLE_COLORS, cfg.handleColor);
  const handleAmt = (hd.price + hc.price) * sashes;
  if (handleAmt > 0) lines.push({ label: `Griff ${hd.name}, ${hc.name}`, amount: handleAmt });

  const sec = byId(SECURITY, cfg.security);
  if (sec.price) lines.push({ label: `Sicherheit ${sec.name}`, amount: sec.price * Math.max(sashes, 1) });

  if (cfg.shutter !== 'none') {
    const sh = byId(SHUTTERS, cfg.shutter), dr = byId(SHUTTER_DRIVES, cfg.shutterDrive);
    lines.push({ label: `${sh.name}, ${dr.name}`, amount: sh.base + area * sh.pricePerM2 + dr.price });
  }
  if (cfg.screen !== 'none') {
    const sc = byId(SCREENS, cfg.screen);
    lines.push({ label: `Insektenschutz ${sc.name}`, amount: sc.base + area * sc.pricePerM2 });
  }
  if (cfg.sill !== 'none') {
    const si = byId(SILLS, cfg.sill);
    lines.push({ label: `Fensterbank ${si.name}`, amount: ((cfg.width + 60) / 1000) * si.pricePerM + 18 });
  }
  const unit = round2(lines.reduce((s, l) => s + l.amount, 0));
  lines.forEach((l) => (l.amount = round2(l.amount)));
  return { lines, unit, total: round2(unit * (cfg.qty || 1)), area, uw: prof.uw + (gl.ug - 0.6) * 0.5 };
}

const round2 = (v) => Math.round(v * 100) / 100;

export const fmtEUR = (v) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const fmtMM = (v) => `${Math.round(v).toLocaleString('de-DE')} mm`;
