// Viewer mit eigenem Kamerasystem: ein Zielzustand (target/theta/phi/dist), dem die Kamera
// gedämpft folgt. Benutzereingaben und Fokus-Presets ändern nur den Zielzustand -> keine Konflikte.
import * as THREE from 'three';
import { Stage, WALL_OUT } from './stage.js';

const FOV = 34;

export class Viewer {
  constructor(container, { onPick, onHover } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.onHover = onHover;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;
    this.canvas.style.touchAction = 'none';

    this.stage = new Stage(this.renderer);
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 60);
    this.cur = { target: new THREE.Vector3(0, 1.4, 0), theta: 0, phi: 1.45, dist: 4 };
    this.goal = { target: new THREE.Vector3(0, 1.4, 0), theta: 0, phi: 1.45, dist: 4 };
    this.follow = null; // Funktion, die das Ziel jedes Frame liefert (z.B. Griff bei offenem Flügel)
    this.crossing = false;
    this.preview = { side: 'outside', open: 'closed', shutter: 0.35 };
    this.dirty = true;
    this.first = true;
    this.lastFocus = 'overview';

    this.raycaster = new THREE.Raycaster();
    this.pointers = new Map();
    this.bindInput();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.clock = new THREE.Clock();
    const loop = () => { this.frame(); this.raf = requestAnimationFrame(loop); };
    loop();
  }

  resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.lastFocusArgs) this.focus(...this.lastFocusArgs, true);
    // sofort zeichnen, damit nach setSize kein leerer Frame sichtbar ist
    this.place();
    this.renderer.render(this.stage.scene, this.camera);
  }

  // ---------- Konfiguration ----------
  setWindow(cfg, preview) {
    Object.assign(this.preview, preview);
    const rebuilt = this.stage.setWindow(cfg, this.preview);
    this.dirty = true;
    if (rebuilt && this.first) {
      this.focus('overview', { instant: true });
      this.first = false;
    }
    return rebuilt;
  }

  setPreview(p) { Object.assign(this.preview, p); this.dirty = true; }

  // ---------- Kamera-Presets ----------
  // name: overview | outside | inside | front | handle | glass | profile | shutter | sill | screen | dims
  focus(name, opts = {}, fromResize = false) {
    if (!fromResize) this.lastFocusArgs = [name, { ...opts, instant: false }];
    this.lastFocus = name;
    const win = this.stage.win;
    if (!win) {
      this.follow = null;
      this.setGoal(new THREE.Vector3(0, 1.3, 0), 0.25, 1.48, 4.2, opts.instant);
      return;
    }
    const { W, H, boxH, sillDrop } = win.dims;
    const f = win.focus;
    const aspect = this.camera.aspect || 1.5;
    // Overlays (Info oben, Werkzeugleiste unten) freihalten
    const ch = this.container.clientHeight || 600;
    const ui = ch / (ch - Math.min(130, ch * 0.2));
    const fit = (w, h, pad = 1.12) => {
      const t = Math.tan((FOV * Math.PI) / 360);
      return Math.max((h * ui) / (2 * t), w / (2 * t * aspect)) * pad;
    };
    const side = opts.side || this.preview.side;
    const base = side === 'inside' ? Math.PI : 0;
    const wholeH = H + boxH + (sillDrop || 0);
    let target, theta, phi = 1.5, dist, follow = null;
    switch (name) {
      case 'front':
      case 'dims': {
        target = f.center();
        target.z = side === 'inside' ? -0.1 : 0.1;
        theta = base; phi = 1.53;
        dist = fit(W + (name === 'dims' ? 0.75 : 0.35), wholeH + (name === 'dims' ? 0.5 : 0.3));
        break;
      }
      case 'outside':
      case 'inside':
      case 'overview': {
        const s = name === 'overview' ? side : name;
        target = f.center();
        theta = (s === 'inside' ? Math.PI : 0) + (s === 'inside' ? -0.4 : 0.4);
        phi = 1.48;
        dist = fit(W + 0.6, wholeH + 0.3);
        break;
      }
      case 'handle': {
        if (!win.hasHandle) return this.focus('inside', opts);
        follow = () => f.handle();
        target = follow();
        const n = f.handleNormal();
        theta = Math.atan2(n.x, n.z) + 0.38;
        phi = 1.36;
        dist = 0.62;
        break;
      }
      case 'glass': {
        follow = () => f.glass();
        target = follow();
        const out = side !== 'inside';
        theta = out ? 0.75 : Math.PI - 0.75;
        phi = 1.3; dist = 0.5;
        break;
      }
      case 'profile': {
        target = f.profile();
        theta = Math.PI + 0.62; phi = 1.12; dist = 0.62;
        break;
      }
      case 'shutter': {
        target = f.center();
        theta = 0.42; phi = 1.45;
        dist = fit(W + 0.8, wholeH + 0.5);
        break;
      }
      case 'sill': {
        target = f.sill();
        theta = 0.55; phi = 1.12; dist = Math.max(0.9, fit(W * 0.6, 0.5));
        break;
      }
      case 'screen': {
        target = f.screen();
        theta = 0.35; phi = 1.5; dist = fit(W + 0.4, H + 0.3);
        break;
      }
      default: return this.focus('overview', opts);
    }
    // Werkzeugleiste unten ist höher als die Info oben -> Motiv leicht nach oben schieben
    if (!follow && ['front', 'dims', 'outside', 'inside', 'overview', 'shutter', 'screen'].includes(name)) target.y -= dist * 0.035;
    this.follow = follow;
    this.setGoal(target, theta, phi, dist, opts.instant);
  }

  setGoal(target, theta, phi, dist, instant) {
    const g = this.goal;
    const sideBefore = Math.cos(this.cur.theta) >= 0;
    g.target.copy(target);
    // kürzester Weg für den Winkel
    g.theta = theta + 2 * Math.PI * Math.round((this.cur.theta - theta) / (2 * Math.PI));
    g.phi = phi; g.dist = dist;
    if (Math.cos(g.theta) >= 0 !== sideBefore && !instant) this.crossing = true;
    if (instant) {
      this.cur.target.copy(g.target);
      this.cur.theta = g.theta; this.cur.phi = g.phi; this.cur.dist = g.dist;
      this.crossing = false;
    }
    this.dirty = true;
  }

  // ---------- Eingabe ----------
  bindInput() {
    const c = this.canvas;
    let down = null;
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, pan: e.button === 2 || e.shiftKey };
      if (this.pointers.size === 2) this.pinch = this.pinchState();
    });
    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) { this.hover(e); return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (down) down.moved += Math.abs(dx) + Math.abs(dy);
      if (this.pointers.size === 1) {
        if (down?.pan) this.pan(dx, dy);
        else this.rotate(dx, dy);
      } else if (this.pointers.size === 2 && this.pinch) {
        const s = this.pinchState();
        this.goal.dist = clampDist(this.goal.dist * (this.pinch.d / s.d));
        this.pan((s.x - this.pinch.x), (s.y - this.pinch.y));
        this.pinch = s;
      }
      this.dirty = true;
    });
    const up = (e) => {
      this.pointers.delete(e.pointerId);
      if (this.pointers.size < 2) this.pinch = null;
      if (down && down.moved < 6 && performance.now() - down.t < 450 && this.pointers.size === 0) this.pick(e);
      if (this.pointers.size === 0) down = null;
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this.onHover?.(null); c.style.cursor = ''; });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.goal.dist = clampDist(this.goal.dist * Math.exp(e.deltaY * 0.0011));
      this.dirty = true;
    }, { passive: false });
  }

  pinchState() {
    const [a, b] = [...this.pointers.values()];
    return { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  rotate(dx, dy) {
    const g = this.goal;
    g.theta -= dx * 0.006;
    g.phi = Math.min(2.0, Math.max(0.4, g.phi - dy * 0.005));
    // Auf der aktuellen Wandseite bleiben (nicht durch die Wand drehen)
    const center = Math.cos(g.theta) >= 0 ? 0 : Math.PI;
    const c2 = center + 2 * Math.PI * Math.round((g.theta - center) / (2 * Math.PI));
    g.theta = Math.min(c2 + 1.25, Math.max(c2 - 1.25, g.theta));
  }

  pan(dx, dy) {
    this.follow = null;
    const s = this.goal.dist * 0.0014;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
    const upv = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
    this.goal.target.addScaledVector(right, -dx * s).addScaledVector(upv, dy * s);
    const win = this.stage.win;
    const lim = win ? Math.max(win.dims.W, win.dims.H) / 2 + 0.8 : 2;
    const c = win ? win.focus.center() : new THREE.Vector3(0, 1.3, 0);
    this.goal.target.x = Math.min(c.x + lim, Math.max(c.x - lim, this.goal.target.x));
    this.goal.target.y = Math.min(c.y + lim, Math.max(0.1, this.goal.target.y));
  }

  ndc(e) {
    const r = this.canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }

  partAt(e) {
    if (!this.stage.win) return null;
    this.raycaster.setFromCamera(this.ndc(e), this.camera);
    const hits = this.raycaster.intersectObject(this.stage.win.group, true);
    for (const h of hits) {
      const part = h.object.userData.part;
      if (part && part !== 'env' && part !== 'interior') return { part, point: h.point };
    }
    return null;
  }

  pick(e) {
    const hit = this.partAt(e);
    if (hit) this.onPick?.(hit.part, Math.cos(this.cur.theta) >= 0 ? 'outside' : 'inside');
  }

  hover(e) {
    if (this.hoverT && performance.now() - this.hoverT < 60) return;
    this.hoverT = performance.now();
    const hit = this.partAt(e);
    this.canvas.style.cursor = hit ? 'pointer' : 'grab';
    this.onHover?.(hit ? { part: hit.part, x: e.clientX, y: e.clientY, side: Math.cos(this.cur.theta) >= 0 ? 'outside' : 'inside' } : null);
  }

  // ---------- Frame ----------
  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    let active = this.stage.tick(this.preview, dt);
    if (this.follow) {
      const t = this.follow();
      if (t) this.goal.target.copy(t);
    }
    const c = this.cur, g = this.goal;
    const k = 1 - Math.exp(-dt * 6.5);
    const before = c.target.distanceTo(g.target) + Math.abs(c.theta - g.theta) + Math.abs(c.phi - g.phi) + Math.abs(c.dist - g.dist);
    if (before > 1e-4) {
      c.target.lerp(g.target, k);
      c.theta += (g.theta - c.theta) * k;
      c.phi += (g.phi - c.phi) * k;
      c.dist += (g.dist - c.dist) * k;
      active = true;
    } else if (this.crossing) {
      this.crossing = false;
    }
    if (this.crossing && Math.abs(g.theta - c.theta) < 0.01) this.crossing = false;
    if (!active && !this.dirty) return;
    this.dirty = false;
    this.place();
    this.renderer.render(this.stage.scene, this.camera);
  }

  place() {
    const c = this.cur;
    let dist = c.dist;
    // Seitenwechsel außen <-> innen: um die Wand herumfahren statt hindurch
    if (this.crossing && this.stage.wallSize) {
      // Ausweichradius blendet mit Annäherung an den Zielwinkel weich aus -> kein Sprung am Ende
      const clear = this.stage.wallSize.WW / 2 + 0.6;
      const w = Math.min(1, Math.abs(this.goal.theta - c.theta) / 0.9);
      dist = Math.max(dist, Math.abs(Math.sin(c.theta)) * clear * w);
    }
    const sp = Math.sin(c.phi);
    this.camera.position.set(
      c.target.x + dist * sp * Math.sin(c.theta),
      Math.max(0.12, c.target.y + dist * Math.cos(c.phi)),
      c.target.z + dist * sp * Math.cos(c.theta),
    );
    this.camera.lookAt(c.target);
    this.camera.updateMatrixWorld();
    this.preview.cameraSide = this.camera.position.z >= (WALL_OUT + -0.18) / 2 ? 'outside' : 'inside';
  }

  get cameraSide() { return Math.cos(this.cur.theta) >= 0 ? 'outside' : 'inside'; }
}

const clampDist = (d) => Math.min(9, Math.max(0.22, d));

// ---------- Screenshots für PDF / Vorschaubilder (separater Renderer) ----------
let snap = null;
export function snapshot(cfg, view, w = 1400, h = 900) {
  if (!snap) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const stage = new Stage(renderer);
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.02, 60);
    snap = { renderer, stage, camera };
  }
  const { renderer, stage, camera } = snap;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const preview = { open: 'closed', shutter: 0.22 };
  stage.setWindow(cfg, preview);
  stage.tick(preview, 0, true);
  stage.setDims(false);
  const win = stage.win;
  const { W, H, boxH, sillDrop } = win.dims;
  const t = Math.tan((FOV * Math.PI) / 360);
  const wholeH = H + boxH + (sillDrop || 0);
  const fit = (ww, hh) => Math.max(hh / (2 * t), ww / (2 * t * camera.aspect));
  const target = win.focus.center();
  let theta, phi, dist;
  if (view === 'inside') { theta = Math.PI - 0.2; phi = 1.5; dist = fit(W + 0.5, wholeH + 0.35); }
  else { theta = 0.32; phi = 1.48; dist = fit(W + 0.8, wholeH + 0.45); }
  const sp = Math.sin(phi);
  camera.position.set(target.x + dist * sp * Math.sin(theta), Math.max(0.12, target.y + dist * Math.cos(phi)), target.z + dist * sp * Math.cos(theta));
  camera.lookAt(target);
  renderer.render(stage.scene, camera);
  return renderer.domElement.toDataURL('image/jpeg', 0.9);
}
