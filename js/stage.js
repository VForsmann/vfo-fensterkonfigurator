// Bühne: Wandausschnitt mit Laibungen, Böden innen/außen, Licht, Umgebung, Maßketten.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildWindow } from './window3d.js';
import * as M from './materials.js';

export const WALL_OUT = 0.18, WALL_IN = -0.18, FRAME_FRONT = 0.065;
const BG = 0xe9edf0;

export class Stage {
  constructor(renderer) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG);
    this.scene.fog = new THREE.Fog(BG, 7, 16);
    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const hemi = new THREE.HemisphereLight(0xe6eef5, 0x9c8f80, 0.6);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight(0xfff3e2, 2.3);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.015;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    this.fill = new THREE.DirectionalLight(0xf4f1ec, 2.1);
    this.fill.position.set(-1.2, 2.6, -3.5);
    this.scene.add(this.fill);

    // Böden
    const inFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), M.parquetMaterial());
    inFloor.rotation.x = -Math.PI / 2;
    inFloor.position.set(0, 0, WALL_IN - 3.5);
    inFloor.receiveShadow = true;
    const outFloor = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), M.pavingMaterial());
    outFloor.rotation.x = -Math.PI / 2;
    outFloor.position.set(0, 0, WALL_OUT + 3.5);
    outFloor.receiveShadow = true;
    outFloor.userData.part = 'env';
    inFloor.userData.part = 'env';
    this.scene.add(inFloor, outFloor);

    this.wall = new THREE.Group();
    this.scene.add(this.wall);
    this.dimGroup = new THREE.Group();
    this.dimGroup.visible = false;
    this.scene.add(this.dimGroup);
    this.win = null;
    this.key = null;
    this.windowRoot = new THREE.Group();
    this.scene.add(this.windowRoot);
  }

  // Baut das Fenster neu, wenn sich die Konfiguration geändert hat. Gibt true zurück bei Neuaufbau.
  setWindow(cfg, preview) {
    const key = cfg ? JSON.stringify(cfg) : 'none';
    if (key === this.key) return false;
    const prev = this.win;
    this.key = key;
    if (prev) prev.dispose();
    this.win = null;
    this.clearWall();
    this.clearDims();
    if (!cfg) { this.buildWall(null); return true; }

    const H = cfg.height / 1000;
    const revealOut = WALL_OUT - FRAME_FRONT, wallIn = WALL_IN - FRAME_FRONT;
    const win = buildWindow(cfg, { revealOut, wallIn });
    const boxH = win.dims.boxH;
    this.sillY = Math.min(0.95, Math.max(0.12, 2.3 - H - boxH));
    win.group.position.set(0, this.sillY, FRAME_FRONT);
    this.windowRoot.add(win.group);
    // Animationszustand übernehmen, damit ein Neuaufbau nicht "springt"
    if (prev && preview) win.update(preview, 0, true);
    else if (preview) win.update(preview, 0, true);
    this.win = win;
    this.cfg = cfg;
    this.buildWall(win, cfg);
    this.buildDims(win, cfg);

    const cx = 0, cy = this.sillY + H / 2;
    const ext = Math.max(win.dims.W, H) / 2 + 1.2;
    this.sun.position.set(cx + 2.2, cy + 3.6, 3.2);
    this.sun.target.position.set(cx, cy, 0);
    const cam = this.sun.shadow.camera;
    cam.left = -ext; cam.right = ext; cam.top = ext; cam.bottom = -ext;
    cam.near = 0.5; cam.far = 12;
    cam.updateProjectionMatrix();
    this.scene.updateMatrixWorld(true);
    return true;
  }

  clearWall() {
    this.wall.children.slice().forEach((m) => { m.geometry?.dispose(); this.wall.remove(m); });
  }

  buildWall(win, cfg) {
    const W = win ? win.dims.W : 1.2;
    const H = win ? win.dims.H : 1.3;
    const d = win ? win.dims.d : 0.08;
    const boxH = win ? win.dims.boxH : 0;
    const sillY = win ? this.sillY : 0.9;
    const WW = Math.max(7, W + 5);
    const WH = Math.max(2.8, sillY + H + boxH + 0.55);
    const zMid = FRAME_FRONT - d / 2;
    const top = win ? sillY + H + boxH : sillY;
    const outBottom = win ? sillY + (cfg.sill !== 'none' ? -0.095 : -0.03) : sillY;
    const inBottom = win ? sillY - 0.025 : sillY;
    const hw = win ? W / 2 : 0;
    const out = M.plasterOutMaterial(), inn = M.paintInMaterial();
    const layer = (z0, z1, bottom, mat) => {
      const parts = [
        [-WW / 2, -hw, 0, WH], [hw, WW / 2, 0, WH], [-hw, hw, 0, bottom], [-hw, hw, top, WH],
      ];
      for (const [x0, x1, y0, y1] of parts) {
        if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4) continue;
        const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat);
        m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        m.castShadow = m.receiveShadow = true;
        m.userData.part = 'env';
        this.wall.add(m);
      }
    };
    layer(zMid, WALL_OUT, outBottom, out);
    layer(WALL_IN, zMid, inBottom, inn);
    // Sockelleiste innen
    const sk = new THREE.Mesh(new THREE.BoxGeometry(WW, 0.07, 0.014), M.skirtingMaterial());
    sk.position.set(0, 0.035, WALL_IN - 0.007);
    sk.receiveShadow = true;
    this.wall.add(sk);
    // Sockel außen (dunkler Spritzschutz)
    const pl = new THREE.Mesh(new THREE.BoxGeometry(WW, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x9a958d, roughness: 0.95, bumpMap: M.plasterBump(), bumpScale: 1.5 }));
    pl.position.set(0, 0.15, WALL_OUT + 0.01);
    pl.receiveShadow = true;
    this.wall.add(pl);
    this.wallSize = { WW, WH };
  }

  clearDims() {
    this.dimGroup.children.slice().forEach((c) => {
      c.geometry?.dispose();
      if (c.material?.map) c.material.map.dispose();
      c.material?.dispose?.();
      this.dimGroup.remove(c);
    });
  }

  buildDims(win, cfg) {
    const { W, H, boxH } = win.dims;
    const y0 = this.sillY, z = WALL_OUT + (cfg.shutter === 'front' ? 0.24 : 0.03);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x00a4dd, depthTest: false, transparent: true });
    const seg = (pts) => {
      const g = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(...p)));
      const l = new THREE.LineSegments(g, lineMat);
      l.renderOrder = 10;
      this.dimGroup.add(l);
    };
    const yTop = y0 + H + boxH + 0.12;
    const t = 0.03;
    seg([[-W / 2, yTop, z], [W / 2, yTop, z], [-W / 2, yTop - t, z], [-W / 2, yTop + t, z], [W / 2, yTop - t, z], [W / 2, yTop + t, z],
      [-W / 2, y0 + H, z], [-W / 2, yTop + t, z], [W / 2, y0 + H, z], [W / 2, yTop + t, z]]);
    const xR = W / 2 + 0.14;
    seg([[xR, y0, z], [xR, y0 + H, z], [xR - t, y0, z], [xR + t, y0, z], [xR - t, y0 + H, z], [xR + t, y0 + H, z],
      [W / 2, y0, z], [xR + t, y0, z], [W / 2, y0 + H, z], [xR + t, y0 + H, z]]);
    this.dimGroup.add(label(`${cfg.width.toLocaleString('de-DE')} mm`, 0, yTop + 0.065, z));
    const l2 = label(`${cfg.height.toLocaleString('de-DE')} mm`, xR + 0.13, y0 + H / 2, z);
    this.dimGroup.add(l2);
  }

  setDims(on) { this.dimGroup.visible = !!on && !!this.win; }

  tick(preview, dt, instant = false) {
    return this.win ? this.win.update(preview, dt, instant) : false;
  }
}

function label(text, x, y, z) {
  const c = document.createElement('canvas');
  const s = 2;
  c.width = 320 * s; c.height = 72 * s;
  const g = c.getContext('2d');
  g.scale(s, s);
  g.fillStyle = '#00a4dd';
  roundRect(g, 4, 10, 312, 52, 26);
  g.fill();
  g.fillStyle = '#fff';
  g.font = '700 30px "Nunito Sans", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 160, 37);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.3, 0.0675, 1);
  sp.position.set(x, y, z);
  sp.renderOrder = 11;
  return sp;
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
