// Prozedurale Texturen und Materialbibliothek (gecacht).
import * as THREE from 'three';
import { COLORS, HANDLE_COLORS, SHUTTER_COLORS, SILLS, byId } from './catalog.js';

const texCache = new Map();
const matCache = new Map();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

// Deterministischer Zufall, damit Texturen bei jedem Laden identisch sind
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function toTex(c, { srgb = true, repeat = [1, 1] } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Holzmaserung entlang U (Profillänge) – graustufig, wird mit Farbe multipliziert
export function woodTexture() {
  if (texCache.has('wood')) return texCache.get('wood');
  const [c, g] = canvas(1024, 256);
  const r = rng(7);
  g.fillStyle = '#d8d8d8';
  g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 260; i++) {
    const y = r() * 256;
    const amp = 2 + r() * 6;
    const freq = 0.002 + r() * 0.01;
    const ph = r() * 10;
    const shade = 120 + r() * 120;
    g.strokeStyle = `rgba(${shade * 0.55},${shade * 0.55},${shade * 0.55},${0.08 + r() * 0.22})`;
    g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath();
    for (let x = 0; x <= 1024; x += 8) {
      const yy = y + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 3.1 + ph) * amp * 0.3;
      x === 0 ? g.moveTo(x, yy) : g.lineTo(x, yy);
    }
    g.stroke();
  }
  // Poren
  for (let i = 0; i < 4000; i++) {
    g.fillStyle = `rgba(60,60,60,${r() * 0.18})`;
    g.fillRect(r() * 1024, r() * 256, 2 + r() * 6, 0.8);
  }
  const t = toTex(c, { repeat: [1.6, 6] });
  texCache.set('wood', t);
  return t;
}

function noiseCanvas(size, seed, contrast) {
  const [c, g] = canvas(size, size);
  const img = g.createImageData(size, size);
  const r = rng(seed);
  for (let i = 0; i < size * size; i++) {
    const v = 128 + (r() - 0.5) * contrast;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  // weichzeichnen für Putzkörnung
  g.filter = 'blur(0.6px)';
  g.drawImage(c, 0, 0);
  return c;
}

export function plasterBump() {
  if (texCache.has('plaster')) return texCache.get('plaster');
  const t = toTex(noiseCanvas(512, 3, 160), { srgb: false, repeat: [3, 3] });
  texCache.set('plaster', t);
  return t;
}

export function fineNoise() {
  if (texCache.has('fine')) return texCache.get('fine');
  const t = toTex(noiseCanvas(256, 11, 90), { srgb: false, repeat: [8, 8] });
  texCache.set('fine', t);
  return t;
}

export function parquetTexture() {
  if (texCache.has('parquet')) return texCache.get('parquet');
  const [c, g] = canvas(1024, 1024);
  const r = rng(21);
  const pw = 1024 / 6;
  for (let col = 0; col < 6; col++) {
    let y = -r() * 400;
    while (y < 1024) {
      const len = 300 + r() * 380;
      const base = 150 + r() * 30;
      g.fillStyle = `rgb(${base + 22},${base - 8},${base - 48})`;
      g.fillRect(col * pw, y, pw, len);
      for (let k = 0; k < 26; k++) {
        g.strokeStyle = `rgba(90,60,30,${0.05 + r() * 0.1})`;
        g.lineWidth = 1 + r() * 2;
        const x = col * pw + r() * pw;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 4, y + len * 0.3, x - 4, y + len * 0.6, x + r() * 6, y + len); g.stroke();
      }
      g.fillStyle = 'rgba(50,30,15,0.5)';
      g.fillRect(col * pw, y, pw, 2);
      y += len;
    }
    g.fillStyle = 'rgba(50,30,15,0.45)';
    g.fillRect(col * pw, 0, 2, 1024);
  }
  const t = toTex(c, { repeat: [1.4, 1.4] });
  texCache.set('parquet', t);
  return t;
}

export function pavingTexture() {
  if (texCache.has('paving')) return texCache.get('paving');
  const [c, g] = canvas(1024, 1024);
  const r = rng(5);
  g.fillStyle = '#8f8b84';
  g.fillRect(0, 0, 1024, 1024);
  const s = 256;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const v = 168 + r() * 26;
    g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    g.fillRect(x * s + 4, y * s + 4, s - 8, s - 8);
    for (let k = 0; k < 900; k++) {
      g.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0,0.0)`;
      const q = 120 + r() * 80;
      g.fillStyle = `rgba(${q},${q},${q},0.22)`;
      g.fillRect(x * s + 4 + r() * (s - 8), y * s + 4 + r() * (s - 8), 2, 2);
    }
  }
  const t = toTex(c, { repeat: [3, 3] });
  texCache.set('paving', t);
  return t;
}

export function meshAlpha() {
  if (texCache.has('mesh')) return texCache.get('mesh');
  const [c, g] = canvas(64, 64);
  g.fillStyle = '#000';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#fff';
  g.lineWidth = 1.4;
  for (let i = 0; i <= 64; i += 8) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 64); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(64, i); g.stroke();
  }
  const t = toTex(c, { srgb: false, repeat: [60, 60] });
  texCache.set('mesh', t);
  return t;
}

export function pleatTexture() {
  if (texCache.has('pleat')) return texCache.get('pleat');
  const [c, g] = canvas(256, 64);
  for (let x = 0; x < 256; x++) {
    const v = 0.5 + 0.5 * Math.cos((x / 256) * Math.PI * 2 * 8);
    const q = Math.round(70 + v * 70);
    g.fillStyle = `rgb(${q},${q},${q})`;
    g.fillRect(x, 0, 1, 64);
  }
  const t = toTex(c, { repeat: [12, 1] });
  texCache.set('pleat', t);
  return t;
}

// ---- Materialien ----
const ENV = 0.75;

function cached(key, make) {
  if (!matCache.has(key)) matCache.set(key, make());
  return matCache.get(key);
}

// Profilmaterial abhängig von Farbe und Werkstoff (Seite: außen/innen)
export function profileMaterial(colorId, materialId, side) {
  const col = byId(COLORS, colorId);
  const metalSkin = side === 'out' && (materialId === 'alu' || materialId === 'pvc-alu');
  return cached(`profile:${colorId}:${materialId}:${metalSkin}`, () => {
    const m = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(col.hex),
      roughness: col.rough,
      metalness: 0,
      envMapIntensity: ENV,
    });
    if (col.kind === 'wood') {
      m.map = woodTexture();
      m.color.multiplyScalar(1.28);
      m.bumpMap = woodTexture();
      m.bumpScale = 0.4;
    } else if (materialId === 'wood') {
      // Lackiertes Echtholz: leichte Struktur
      m.bumpMap = woodTexture();
      m.bumpScale = 0.15;
      m.roughness = Math.min(0.7, col.rough + 0.1);
    } else if (metalSkin) {
      m.metalness = 0.25;
      m.roughness = Math.min(0.6, col.rough + 0.05);
      m.bumpMap = fineNoise();
      m.bumpScale = 0.08;
    } else {
      // Kunststoff: leichter Glanz
      m.clearcoat = colorId === 'white' || colorId === 'cream' ? 0.35 : 0.12;
      m.clearcoatRoughness = 0.35;
      if (col.id !== 'white' && col.id !== 'cream') { m.bumpMap = fineNoise(); m.bumpScale = 0.12; }
    }
    return m;
  });
}

export const gasketMaterial = () => cached('gasket', () => new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.85, envMapIntensity: 0.3 }));
export const spacerMaterial = () => cached('spacer', () => new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.6, metalness: 0.2, envMapIntensity: 0.4 }));

export function glassMaterial(surface) {
  return cached(`glass:${surface}`, () => {
    if (surface === 'clear') {
      return new THREE.MeshPhysicalMaterial({
        color: 0xd8ebe6, metalness: 0, roughness: 0.02, transparent: true, opacity: 0.16,
        envMapIntensity: 1.6, specularIntensity: 1, ior: 1.52, depthWrite: false, side: THREE.DoubleSide,
      });
    }
    const m = new THREE.MeshPhysicalMaterial({
      color: 0xf2f6f5, metalness: 0, roughness: surface === 'satin' ? 0.55 : 0.35, transparent: true,
      opacity: surface === 'satin' ? 0.82 : 0.7, envMapIntensity: 1, depthWrite: false, side: THREE.DoubleSide,
    });
    if (surface === 'ornament') { m.bumpMap = plasterBump(); m.bumpScale = 3; }
    return m;
  });
}

export function handleMaterial(colorId) {
  const c = byId(HANDLE_COLORS, colorId);
  return cached(`handle:${colorId}`, () => new THREE.MeshPhysicalMaterial({
    color: c.hex, metalness: c.metal, roughness: c.rough, envMapIntensity: 1.1, clearcoat: c.metal ? 0 : 0.4,
  }));
}

export const brassMaterial = () => cached('brass', () => new THREE.MeshStandardMaterial({ color: 0xc9a75e, metalness: 1, roughness: 0.25 }));

export function shutterMaterial(colorId) {
  const c = byId(SHUTTER_COLORS, colorId);
  return cached(`shutter:${colorId}`, () => new THREE.MeshPhysicalMaterial({ color: c.hex, roughness: 0.45, metalness: 0.35, envMapIntensity: 0.8, clearcoat: 0.2 }));
}

export function sillMaterial(sillId) {
  const s = byId(SILLS, sillId);
  return cached(`sill:${sillId}`, () => new THREE.MeshPhysicalMaterial({ color: s.hex || '#cccccc', roughness: 0.32, metalness: 0.6, envMapIntensity: 0.9, bumpMap: fineNoise(), bumpScale: 0.05 }));
}

export const alumMaterial = () => cached('alum', () => new THREE.MeshStandardMaterial({ color: 0x8e9398, roughness: 0.4, metalness: 0.7 }));

export const screenMeshMaterial = () => cached('screenMesh', () => new THREE.MeshStandardMaterial({
  color: 0x222426, alphaMap: meshAlpha(), transparent: true, opacity: 0.9, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false,
}));

export const pleatMaterial = () => cached('pleat', () => new THREE.MeshStandardMaterial({
  color: 0x3a3c3f, map: pleatTexture(), transparent: true, opacity: 0.8, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false,
}));

export const plasterOutMaterial = () => cached('plasterOut', () => new THREE.MeshStandardMaterial({
  color: 0xe8e2d6, roughness: 0.95, bumpMap: plasterBump(), bumpScale: 1.2, envMapIntensity: 0.45,
}));

export const paintInMaterial = () => cached('paintIn', () => new THREE.MeshStandardMaterial({
  color: 0xf1ede7, roughness: 0.92, bumpMap: fineNoise(), bumpScale: 0.25, envMapIntensity: 0.35,
}));

export const parquetMaterial = () => cached('parquet', () => new THREE.MeshStandardMaterial({ map: parquetTexture(), roughness: 0.55, envMapIntensity: 0.4 }));
export const pavingMaterial = () => cached('paving', () => new THREE.MeshStandardMaterial({ map: pavingTexture(), roughness: 0.92, envMapIntensity: 0.3 }));
export const stoneSillMaterial = () => cached('stoneSill', () => new THREE.MeshPhysicalMaterial({ color: 0xeeebe6, roughness: 0.22, clearcoat: 0.5, bumpMap: fineNoise(), bumpScale: 0.05, envMapIntensity: 0.5 }));
export const skirtingMaterial = () => cached('skirting', () => new THREE.MeshStandardMaterial({ color: 0xf2f0ec, roughness: 0.5, envMapIntensity: 0.4 }));
export const coverMaterial = () => cached('cover', () => new THREE.MeshPhysicalMaterial({ color: 0xf1f1ee, roughness: 0.38, clearcoat: 0.3, envMapIntensity: 0.5 }));
