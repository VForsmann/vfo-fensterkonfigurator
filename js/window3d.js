// Detailliertes 3D-Fenstermodell: Blendrahmen, Flügel mit Überschlag, Glasleisten, Dichtungen,
// Mehrscheibenverglasung mit warmer Kante, Sprossen, Griffe, Bänder, Rollladen, Insektenschutz, Fensterbank.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { MATERIALS, PROFILES, GLAZING, OPENINGS, byId, layoutFields } from './catalog.js';
import { loftRect, prism, chamferRect, X, Y, Z } from './geometry.js';
import * as M from './materials.js';

const DEG = Math.PI / 180;

export function buildWindow(cfg, env) {
  const W = cfg.width / 1000, H = cfg.height / 1000;
  const mat = byId(MATERIALS, cfg.material), prof = byId(PROFILES, cfg.profile);
  const d = prof.depth, fw = mat.fw, sw = mat.sw, r = mat.round;
  const outM = M.profileMaterial(cfg.colorOut, cfg.material, 'out');
  const inM = M.profileMaterial(cfg.colorIn, cfg.material, 'in');
  const mats = [outM, inM];
  const group = new THREE.Group();
  group.name = 'window';
  const geos = [];
  const tagged = (mesh, part) => { mesh.userData.part = part; mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };
  const add = (geo, material, part, parent = group) => { geos.push(geo); const m = tagged(new THREE.Mesh(geo, material), part); parent.add(m); return m; };

  // ---------- Blendrahmen ----------
  const frameProfile = [
    [0, -r], [r, 0], [fw - r - 0.002, 0], [fw, -r - 0.002], [fw, -0.017], [fw - 0.022, -0.017],
    [fw - 0.022, -(d - 0.005)], [fw - 0.025, -d], [r, -d], [0, -(d - r)],
  ];
  add(loftRect(frameProfile, { x0: -W / 2, x1: W / 2, y0: 0, y1: H }, -0.0175), mats, 'frame');
  // Rahmendichtung (Anschlag außen)
  add(loftRect([[fw - 0.009, -0.017], [fw - 0.002, -0.017], [fw - 0.002, -0.0207], [fw - 0.009, -0.0207]], { x0: -W / 2, x1: W / 2, y0: 0, y1: H }), M.gasketMaterial(), 'frame');
  // Fensterbankanschlussprofil
  {
    const g = new THREE.BoxGeometry(W, 0.03, d);
    add(g, [inM, inM, inM, inM, outM, inM], 'frame').position.set(0, -0.015, -d / 2);
  }

  const lay = layoutFields(cfg);
  const toRect = (f) => ({ x0: W / 2 - (f.x + f.w) / 1000, x1: W / 2 - f.x / 1000, y0: H - (f.y + f.h) / 1000, y1: H - f.y / 1000 });

  // ---------- Pfosten & Kämpfer ----------
  const barShapes = (mw) => ({
    lip: [[-mw / 2 + r, 0], [mw / 2 - r, 0], [mw / 2, -r], [mw / 2, -0.017], [-mw / 2, -0.017], [-mw / 2, -r]],
    body: [[-(mw / 2 - 0.022), -0.017], [mw / 2 - 0.022, -0.017], [mw / 2 - 0.022, -(d - 0.005)], [mw / 2 - 0.025, -d], [-(mw / 2 - 0.025), -d], [-(mw / 2 - 0.022), -(d - 0.005)]],
  });
  for (const m of lay.mullions) {
    const mw = m.w / 1000, cx = W / 2 - (m.x + m.w / 2) / 1000;
    const y0 = H - (m.y + m.h) / 1000, y1 = H - m.y / 1000;
    const s = barShapes(mw);
    const o = new THREE.Vector3(cx, 0, -0.0004);
    add(prism(s.lip, y0, y1, { A: X, B: Z, L: Y, origin: o, split: -0.0175 }), mats, 'frame');
    add(prism(s.body, y0 - 0.022, y1 + 0.022, { A: X, B: Z, L: Y, origin: o, split: -0.0175 }), mats, 'frame');
  }
  if (lay.transomBar) {
    const b = lay.transomBar, mw = b.h / 1000, cy = H - (b.y + b.h / 2) / 1000;
    const x0 = -W / 2 + fw, x1 = W / 2 - fw;
    const s = barShapes(mw);
    const o = new THREE.Vector3(0, cy, -0.0004);
    add(prism(s.lip, x0, x1, { A: Y, B: Z, L: X, origin: o, split: -0.0175 }), mats, 'frame');
    add(prism(s.body, x0 - 0.022, x1 + 0.022, { A: Y, B: Z, L: X, origin: o, split: -0.0175 }), mats, 'frame');
  }

  // ---------- Verglasung ----------
  const gl = byId(GLAZING, cfg.glazing);
  const paneT = 0.004, gap = gl.panes === 3 ? 0.011 : 0.02;
  const glassTotal = gl.panes * paneT + (gl.panes - 1) * gap;

  function glazing(rect, zFront, spacerW, parent) {
    const clearM = M.glassMaterial('clear');
    const surfM = M.glassMaterial(cfg.glassSurface);
    const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
    for (let i = 0; i < gl.panes; i++) {
      const zc = zFront - paneT / 2 - i * (paneT + gap);
      const m = add(new THREE.BoxGeometry(w, h, paneT), i === gl.panes - 1 ? surfM : clearM, 'glass', parent);
      m.position.set((rect.x0 + rect.x1) / 2, (rect.y0 + rect.y1) / 2, zc);
      m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2;
      if (i < gl.panes - 1) {
        const zA = zc - paneT / 2, zB = zA - gap;
        add(loftRect([[0, zA], [spacerW, zA - 0.001], [spacerW, zB + 0.001], [0, zB]], rect), M.spacerMaterial(), 'glass', parent).castShadow = false;
      }
    }
    return zFront - glassTotal;
  }

  function muntins(vis, zFront, zBack, parent) {
    if (cfg.muntins === 'none') return;
    const xs = cfg.muntins === 'cross' ? [0.5] : [1 / 3, 2 / 3];
    const ys = [0.5];
    const w = vis.x1 - vis.x0, h = vis.y1 - vis.y0;
    const bars = [];
    if (cfg.muntinType === 'applied') {
      const bw = 0.026, bd = 0.009, c = 0.0035;
      bars.push({ shape: [[-bw / 2, zFront + 0.0005], [bw / 2, zFront + 0.0005], [bw / 2 - c, zFront + bd], [-bw / 2 + c, zFront + bd]], m: outM });
      bars.push({ shape: [[-bw / 2, zBack - 0.0005], [bw / 2, zBack - 0.0005], [bw / 2 - c, zBack - bd], [-bw / 2 + c, zBack - bd]], m: inM });
    } else {
      const zA = zFront - paneT - 0.0015, zB = zFront - paneT - gap + 0.0015;
      bars.push({ shape: chamferRect(0.018, zA - zB, 0.001, -0.009, zB), m: outM });
    }
    for (const b of bars) {
      for (const fx of xs) add(prism(b.shape, vis.y0, vis.y1, { A: X, B: Z, L: Y, origin: new THREE.Vector3(vis.x0 + w * fx, 0, 0) }), b.m, 'glass', parent);
      for (const fy of ys) add(prism(b.shape, vis.x0, vis.x1, { A: Y, B: Z, L: X, origin: new THREE.Vector3(0, vis.y0 + h * fy, 0) }), b.m, 'glass', parent);
    }
  }

  // Festverglasung direkt im Rahmen
  function fixedField(L) {
    const zFront = -0.0205;
    const zBack = glazing({ x0: L.x0 - 0.016, x1: L.x1 + 0.016, y0: L.y0 - 0.016, y1: L.y1 + 0.016 }, zFront, 0.024, group);
    const Rb = { x0: L.x0 - 0.022, x1: L.x1 + 0.022, y0: L.y0 - 0.022, y1: L.y1 + 0.022 };
    const zb = zBack - 0.0012;
    add(loftRect([[0, zb], [0.035, zb], [0.037, zb - 0.002], [0.029, -(d - 0.002)], [0, -(d - 0.002)]], Rb), inM, 'frame');
    add(loftRect([[0.019, zBack], [0.0255, zBack], [0.0255, zb - 0.0005], [0.019, zb - 0.0005]], Rb), M.gasketMaterial(), 'frame');
    add(loftRect([[-0.003, -0.017], [0.0025, -0.0175], [0.0025, zFront], [-0.003, zFront]], L), M.gasketMaterial(), 'frame');
    muntins(L, zFront, zBack, group);
  }

  // ---------- Flügel ----------
  const sashes = [];
  const handleMat = M.handleMaterial(cfg.handleColor);
  const hingeMat = cfg.handleColor === 'white' ? M.coverMaterial() : handleMat;

  function buildHandle(kind) {
    const root = new THREE.Group();
    const rosette = new RoundedBoxGeometry(0.03, 0.078, 0.011, 3, 0.004);
    add(rosette, handleMat, 'handle', root).position.set(0, 0, -0.0055);
    const neck = new THREE.CylinderGeometry(0.0095, 0.011, 0.016, 24);
    neck.rotateX(Math.PI / 2);
    add(neck, handleMat, 'handle', root).position.set(0, 0, -0.018);
    const lever = new THREE.Group();
    lever.position.set(0, 0, -0.03);
    root.add(lever);
    add(new RoundedBoxGeometry(0.026, 0.03, 0.02, 3, 0.008), handleMat, 'handle', lever).position.set(0, -0.004, 0);
    if (kind === 'design') {
      add(new RoundedBoxGeometry(0.016, 0.125, 0.013, 2, 0.0025), handleMat, 'handle', lever).position.set(0, -0.068, -0.002);
    } else {
      const arm = new RoundedBoxGeometry(0.021, 0.118, 0.015, 4, 0.0065);
      const armMesh = add(arm, handleMat, 'handle', lever);
      armMesh.position.set(0, -0.064, -0.004);
      armMesh.rotation.x = -4 * DEG;
    }
    if (kind === 'lock') {
      const cyl = new THREE.CylinderGeometry(0.0065, 0.0065, 0.004, 24);
      cyl.rotateX(Math.PI / 2);
      add(cyl, M.brassMaterial(), 'handle', root).position.set(0, -0.026, -0.012);
      const slot = new THREE.BoxGeometry(0.0015, 0.007, 0.001);
      add(slot, M.gasketMaterial(), 'handle', root).position.set(0, -0.026, -0.0143);
    }
    if (kind === 'button') {
      const btn = new THREE.CylinderGeometry(0.005, 0.005, 0.004, 20);
      add(btn, M.spacerMaterial(), 'handle', lever).position.set(0, 0.008, -0.009);
    }
    return { root, lever };
  }

  function hingeCap(parent, x, y, horizontal) {
    const g = horizontal ? new RoundedBoxGeometry(0.055, 0.02, 0.012, 2, 0.004) : new RoundedBoxGeometry(0.02, 0.055, 0.012, 2, 0.004);
    add(g, hingeMat, 'handle', parent).position.set(x, y, -(d + 0.016));
  }

  function sash(L, opId, isTransom) {
    const op = byId(OPENINGS, opId);
    const S = { x0: L.x0 - 0.02, x1: L.x1 + 0.02, y0: L.y0 - 0.02, y1: L.y1 + 0.02 };
    const zb = -(d + 0.01);
    const sashProfile = [
      [0, -0.021 - r], [r, -0.021], [sw - 0.004, -0.021], [sw, -0.025], [sw, -0.029],
      [sw - 0.01, -0.029], [sw - 0.01, -0.066], [sw - 0.004, -0.066], [sw - 0.001, -0.0685],
      [sw - 0.012, zb + 0.004], [sw - 0.016, zb], [-0.012 + r, zb], [-0.012, zb + r],
      [-0.012, -(d + 0.001)], [0, -(d + 0.001)],
    ];
    const content = new THREE.Group();
    add(loftRect(sashProfile, S, -0.03), mats, 'sash', content);
    const zFront = -0.0475 + glassTotal / 2;
    const G = { x0: S.x0 + sw - 0.012, x1: S.x1 - sw + 0.012, y0: S.y0 + sw - 0.012, y1: S.y1 - sw + 0.012 };
    const zBack = glazing(G, zFront, 0.02, content);
    add(loftRect([[sw - 0.003, -0.0262], [sw + 0.0025, -0.0275], [sw + 0.0025, zFront], [sw - 0.003, zFront]], S), M.gasketMaterial(), 'sash', content);
    add(loftRect([[sw - 0.004, zBack], [sw + 0.002, zBack], [sw + 0.002, -0.0675], [sw - 0.004, -0.0675]], S), M.gasketMaterial(), 'sash', content);
    const vis = { x0: S.x0 + sw, x1: S.x1 - sw, y0: S.y0 + sw, y1: S.y1 - sw };
    muntins(vis, zFront, zBack, content);

    // Griff
    const uh = (sw - 0.028) / 2;
    const hingePlus = op.hinge === 'L'; // DIN links (von innen) = Welt +x
    let handle = null, handleOnMinus = false;
    if (op.turn) {
      handleOnMinus = hingePlus;
      const hx = hingePlus ? S.x0 - 0.012 + uh + 0.006 : S.x1 + 0.012 - uh - 0.006;
      const hy = Math.min((S.y0 + S.y1) / 2, S.y0 + 1.05);
      handle = buildHandle(cfg.handle);
      handle.root.position.set(hx, hy, zb);
      content.add(handle.root);
    } else if (op.tilt) {
      handle = buildHandle(cfg.handle);
      handle.root.position.set((S.x0 + S.x1) / 2, S.y1 + 0.012 - uh - 0.006, zb);
      handle.root.rotation.z = Math.PI / 2;
      content.add(handle.root);
    }
    // Bänder
    if (op.turn) {
      const hx = hingePlus ? S.x1 - 0.002 : S.x0 + 0.002;
      hingeCap(content, hx, S.y0 + 0.07, false);
      hingeCap(content, hx, S.y1 - 0.07, false);
    } else if (op.tilt) {
      hingeCap(content, S.x0 + 0.08, S.y0 - 0.001, true);
      hingeCap(content, S.x1 - 0.08, S.y0 - 0.001, true);
    }

    // Drehpunkte für Animation
    const zP = -(d + 0.006);
    const turnPivot = new THREE.Group();
    const tiltPivot = new THREE.Group();
    const pTurn = new THREE.Vector3(hingePlus ? S.x1 - 0.004 : S.x0 + 0.004, (S.y0 + S.y1) / 2, zP);
    const pTilt = new THREE.Vector3((S.x0 + S.x1) / 2, S.y0 + 0.004, zP);
    turnPivot.position.copy(pTurn);
    tiltPivot.position.copy(pTilt).sub(pTurn);
    content.position.copy(pTilt).negate();
    turnPivot.add(tiltPivot);
    tiltPivot.add(content);
    group.add(turnPivot);
    const sh = {
      op, isTransom, turnPivot, tiltPivot, content, handle, handleOnMinus, S, G,
      turnSign: hingePlus ? -1 : 1, turn: 0, tilt: 0, lever: 0,
    };
    sashes.push(sh);
    return sh;
  }

  lay.fields.forEach((f) => (f.opening === 'F' ? fixedField(toRect(f)) : sash(toRect(f), f.opening, false)));
  if (lay.transomField) {
    const tf = lay.transomField;
    tf.opening === 'F' ? fixedField(toRect(tf)) : sash(toRect(tf), 'K', true);
  }

  // ---------- Rollladen ----------
  const revealOut = env.revealOut, wallIn = env.wallIn;
  let boxH = 0;
  let curtain = null;
  if (cfg.shutter !== 'none') {
    const shM = M.shutterMaterial(cfg.shutterColor);
    const slatShape = [[0, -0.004], [0.006, -0.006], [0.033, -0.006], [0.0385, -0.003], [0.0385, 0.002], [0.033, 0.0055], [0.006, 0.0055], [0, 0.002]];
    let cx0, cx1, cz, top, railX, railZ0, railZ1;
    if (cfg.shutter === 'top') {
      boxH = 0.22;
      const depth = 0.015 - wallIn;
      const box = new THREE.BoxGeometry(W, boxH, depth);
      add(box, [M.coverMaterial(), M.coverMaterial(), M.coverMaterial(), M.coverMaterial(), M.plasterOutMaterial(), M.coverMaterial()], 'shutter')
        .position.set(0, H + boxH / 2, 0.015 - depth / 2);
      // Revisionsdeckel-Fuge innen
      add(loftRect([[0, wallIn], [0.003, wallIn], [0.003, wallIn - 0.0008], [0, wallIn - 0.0008]], { x0: -W / 2 + 0.03, x1: W / 2 - 0.03, y0: H + 0.025, y1: H + boxH - 0.02 }), M.gasketMaterial(), 'shutter');
      cx0 = -W / 2 + 0.013; cx1 = W / 2 - 0.013; cz = 0.016; top = H;
      railX = [-W / 2, W / 2 - 0.026]; railZ0 = 0.0; railZ1 = 0.032;
    } else {
      const shape = [[0, 0], [0.165, 0], [0.205, 0.04], [0.205, 0.205], [0, 0.205]];
      add(prism(shape, -W / 2 - 0.065, W / 2 + 0.065, { A: Z, B: Y, L: X, origin: new THREE.Vector3(0, H, revealOut), caps: true }), shM, 'shutter');
      cx0 = -W / 2 - 0.022; cx1 = W / 2 + 0.022; cz = revealOut + 0.04; top = H;
      railX = [-W / 2 - 0.05, W / 2 + 0.05 - 0.026 + 0.0]; railZ0 = revealOut; railZ1 = revealOut + 0.075;
    }
    const railLen = cfg.shutter === 'top' ? [0, H] : [-0.03, H];
    for (const rx of railX) {
      const rs = chamferRect(0.026 + (cfg.shutter === 'front' ? 0.0 : 0), railZ1 - railZ0, 0.002, rx, railZ0);
      add(prism(rs, railLen[0], railLen[1], { A: X, B: Z, L: Y }), shM, 'shutter');
    }
    const slatGeo = prism(slatShape, cx0, cx1, { A: Y, B: Z, L: X, caps: true });
    geos.push(slatGeo);
    const maxSlats = Math.ceil((top - railLen[0]) / 0.0385) + 1;
    const inst = new THREE.InstancedMesh(slatGeo, shM, maxSlats);
    tagged(inst, 'shutter');
    group.add(inst);
    const endBarGeo = prism(chamferRect(0.045, 0.02, 0.004, 0, -0.01), cx0, cx1, { A: Y, B: Z, L: X, caps: true });
    const endBar = add(endBarGeo, M.alumMaterial(), 'shutter');
    curtain = { inst, endBar, top, bottom: railLen[0], cz, level: -1, maxSlats };
  }

  // ---------- Insektenschutz ----------
  if (cfg.screen !== 'none') {
    const inset = cfg.shutter === 'top' ? 0.03 : 0.006;
    const R = { x0: -W / 2 + inset, x1: W / 2 - inset, y0: 0.006, y1: H - 0.006 };
    add(loftRect([[0, 0.002], [0.024, 0.002], [0.024, 0.011], [0.02, 0.0145], [0, 0.0145]], R), outM, 'screen');
    const iw = R.x1 - R.x0 - 0.04, ih = R.y1 - R.y0 - 0.04;
    if (cfg.screen === 'frame') {
      const g = new THREE.PlaneGeometry(iw, ih);
      scaleUV(g, iw / 0.006, ih / 0.006);
      const m = add(g, M.screenMeshMaterial(), 'screen');
      m.position.set((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2, 0.008);
      m.castShadow = false;
    } else {
      const frac = 0.62;
      const fwid = iw * frac;
      const g = new THREE.PlaneGeometry(fwid, ih);
      scaleUV(g, Math.max(1, fwid / 0.05), 1);
      const m = add(g, M.pleatMaterial(), 'screen');
      m.position.set(R.x0 + 0.02 + fwid / 2, (R.y0 + R.y1) / 2, 0.008);
      m.castShadow = false;
      const bar = new THREE.BoxGeometry(0.022, ih, 0.012);
      add(bar, outM, 'screen').position.set(R.x0 + 0.02 + fwid + 0.011, (R.y0 + R.y1) / 2, 0.008);
    }
  }

  // ---------- Fensterbank ----------
  let sillDrop = 0.0;
  if (cfg.sill !== 'none') {
    const Lz = revealOut + 0.05, s = 0.085;
    const shape = [[-0.004, 0], [Lz, -Lz * s], [Lz, -Lz * s - 0.034], [Lz - 0.0025, -Lz * s - 0.034], [Lz - 0.0025, -Lz * s - 0.003], [-0.004, -0.003]];
    add(prism(shape, -W / 2 - 0.03, W / 2 + 0.03, { A: Z, B: Y, L: X, origin: new THREE.Vector3(0, -0.03, 0), caps: true }), M.sillMaterial(cfg.sill), 'sill');
    sillDrop = Lz * s + 0.04;
  }
  // Innenfensterbank (Naturstein)
  {
    const z0 = wallIn - 0.03, z1 = -d + 0.002;
    const g = new THREE.BoxGeometry(W + 0.1, 0.025, z1 - z0);
    add(g, M.stoneSillMaterial(), 'interior').position.set(0, -0.0125, (z0 + z1) / 2);
  }

  // ---------- Fokuspunkte ----------
  const v = new THREE.Vector3();
  const primary = sashes.find((s) => !s.isTransom && s.handle) || sashes.find((s) => s.handle) || null;
  const focus = {
    center: () => group.localToWorld(v.set(0, H / 2 + boxH / 2, -d / 2).clone()),
    handle: () => {
      if (!primary) return null;
      primary.content.updateWorldMatrix(true, true);
      return primary.handle.root.localToWorld(new THREE.Vector3(0, -0.03, -0.03));
    },
    // Blickrichtung zum Griff: Normale der Flügelinnenseite (zeigt in den Raum)
    handleNormal: () => {
      if (!primary) return new THREE.Vector3(0, 0, -1);
      primary.content.updateWorldMatrix(true, true);
      const q = new THREE.Quaternion();
      primary.content.getWorldQuaternion(q);
      return new THREE.Vector3(0, 0, -1).applyQuaternion(q);
    },
    glass: () => {
      const s = primary || sashes[0];
      if (s) {
        s.content.updateWorldMatrix(true, true);
        const gx = s.handleOnMinus ? s.S.x0 + sw + 0.03 : s.S.x1 - sw - 0.03;
        return s.content.localToWorld(new THREE.Vector3(gx, s.S.y0 + sw + 0.05, -0.045));
      }
      return group.localToWorld(new THREE.Vector3(W / 2 - fw - 0.05, fw + 0.05, -0.04));
    },
    profile: () => group.localToWorld(new THREE.Vector3(W / 2 - fw, fw * 0.6, -d / 2)),
    shutter: () => group.localToWorld(new THREE.Vector3(0, H * 0.72 + boxH / 2, 0.02)),
    sill: () => group.localToWorld(new THREE.Vector3(0, -0.02, revealOut * 0.6)),
    screen: () => group.localToWorld(new THREE.Vector3(0, H / 2, 0.01)),
  };

  // ---------- Animation ----------
  function update(preview, dt, instant) {
    const k = instant ? 1 : 1 - Math.exp(-dt * 5.5);
    let moving = false;
    for (const s of sashes) {
      let turnT = 0, tiltT = 0, leverT = 0;
      if (preview.open === 'open') {
        if (s.op.turn) { turnT = 72 * DEG; leverT = s.handleOnMinus ? Math.PI / 2 : -Math.PI / 2; }
        else if (s.op.tilt) { tiltT = 9 * DEG; leverT = -Math.PI / 2; }
      } else if (preview.open === 'tilt' && s.op.tilt) {
        tiltT = 9 * DEG; leverT = s.op.turn ? Math.PI : -Math.PI / 2;
      }
      for (const [key, t] of [['turn', turnT], ['tilt', tiltT], ['lever', leverT]]) {
        const nv = s[key] + (t - s[key]) * k;
        if (Math.abs(t - nv) > 1e-4) moving = true; else s[key] = t;
        if (Math.abs(t - nv) > 1e-4) s[key] = nv;
      }
      s.turnPivot.rotation.y = s.turnSign * s.turn;
      s.tiltPivot.rotation.x = -s.tilt;
      if (s.handle) s.handle.lever.rotation.z = s.lever;
    }
    if (curtain) {
      const target = Math.max(0, Math.min(1, preview.shutter));
      const lv = curtain.level < 0 || instant ? target : curtain.level + (target - curtain.level) * k;
      if (Math.abs(lv - curtain.level) > 1e-4) {
        curtain.level = Math.abs(lv - target) < 1e-4 ? target : lv;
        if (curtain.level !== target) moving = true;
        layoutCurtain(curtain);
      }
    }
    return moving;
  }

  function dispose() {
    geos.forEach((g) => g.dispose());
    group.removeFromParent();
  }

  return { group, sashes, focus, update, dispose, dims: { W, H, d, fw, boxH, sillDrop }, hasHandle: !!primary };
}

function layoutCurtain(c) {
  const len = (c.top - c.bottom) * c.level;
  const pitch = 0.0385;
  const n = Math.min(c.maxSlats, Math.floor(len / pitch));
  const m = new THREE.Matrix4();
  for (let i = 0; i < c.maxSlats; i++) {
    if (i < n) m.makeTranslation(0, c.top - (i + 1) * pitch, c.cz);
    else m.makeScale(0, 0, 0);
    c.inst.setMatrixAt(i, m);
  }
  c.inst.count = c.maxSlats;
  c.inst.instanceMatrix.needsUpdate = true;
  c.inst.computeBoundingSphere();
  c.endBar.position.set(0, c.top - Math.max(len, 0) - 0.045, c.cz);
  c.endBar.visible = true;
}

function scaleUV(geo, sx, sy) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * sx, uv.getY(i) * sy);
  uv.needsUpdate = true;
}
