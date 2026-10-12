// Geometrie-Helfer: Profil-Loft um ein Rechteck (echte Gehrung) und Prismen-Extrusion.
import * as THREE from 'three';

const _ab = new THREE.Vector3(), _ac = new THREE.Vector3(), _n = new THREE.Vector3();

function signedArea(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a;
}

class Builder {
  constructor(groups) { this.buf = Array.from({ length: groups }, () => ({ pos: [], nor: [], uv: [] })); }
  quad(g, A, B, C, D, N, uvA, uvB, uvC, uvD) {
    const b = this.buf[g];
    _ab.subVectors(B, A); _ac.subVectors(C, A); _n.crossVectors(_ab, _ac);
    const tris = _n.dot(N) >= 0 ? [[A, B, C, uvA, uvB, uvC], [A, C, D, uvA, uvC, uvD]] : [[A, C, B, uvA, uvC, uvB], [A, D, C, uvA, uvD, uvC]];
    for (const [p1, p2, p3, t1, t2, t3] of tris) {
      for (const p of [p1, p2, p3]) { b.pos.push(p.x, p.y, p.z); b.nor.push(N.x, N.y, N.z); }
      b.uv.push(...t1, ...t2, ...t3);
    }
  }
  tri(g, A, B, C, N) {
    const b = this.buf[g];
    _ab.subVectors(B, A); _ac.subVectors(C, A); _n.crossVectors(_ab, _ac);
    const pts = _n.dot(N) >= 0 ? [A, B, C] : [A, C, B];
    for (const p of pts) { b.pos.push(p.x, p.y, p.z); b.nor.push(N.x, N.y, N.z); b.uv.push(p.x, p.y); }
  }
  build() {
    const geo = new THREE.BufferGeometry();
    const pos = [], nor = [], uv = [];
    let start = 0;
    this.buf.forEach((b, i) => {
      pos.push(...b.pos); nor.push(...b.nor); uv.push(...b.uv);
      const count = b.pos.length / 3;
      if (count) geo.addGroup(start, count, i);
      start += count;
    });
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.computeBoundingSphere();
    return geo;
  }
}

/**
 * Loft eines geschlossenen Querschnitts [[u,z],...] um ein Rechteck.
 * u = Abstand nach innen von der Außenkante des Rechtecks, z = Tiefe.
 * Gehrungen ergeben sich automatisch. split: z-Grenze -> Gruppe 0 (z > split, außen) / 1 (innen).
 */
export function loftRect(profile, rect, split = null) {
  const { x0, x1, y0, y1 } = rect;
  const orient = Math.sign(signedArea(profile)) || 1;
  const corners = (u) => [[x0 + u, y0 + u], [x1 - u, y0 + u], [x1 - u, y1 - u], [x0 + u, y1 - u]];
  const inward = [[0, 1], [-1, 0], [0, -1], [1, 0]];
  const b = new Builder(split === null ? 1 : 2);
  let s = 0;
  for (let i = 0; i < profile.length; i++) {
    const p = profile[i], q = profile[(i + 1) % profile.length];
    const du = q[0] - p[0], dz = q[1] - p[1];
    const len = Math.hypot(du, dz);
    if (len < 1e-7) continue;
    const nu = (orient > 0 ? dz : -dz) / len, nz = (orient > 0 ? -du : du) / len;
    const g = split === null ? 0 : ((p[1] + q[1]) / 2 > split ? 0 : 1);
    const cp = corners(p[0]), cq = corners(q[0]);
    for (let side = 0; side < 4; side++) {
      const n2 = (side + 1) % 4;
      const N = new THREE.Vector3(nu * inward[side][0], nu * inward[side][1], nz);
      const A = new THREE.Vector3(cp[side][0], cp[side][1], p[1]);
      const B = new THREE.Vector3(cp[n2][0], cp[n2][1], p[1]);
      const C = new THREE.Vector3(cq[n2][0], cq[n2][1], q[1]);
      const D = new THREE.Vector3(cq[side][0], cq[side][1], q[1]);
      const horiz = side % 2 === 0;
      const along = (v) => (horiz ? v.x : v.y);
      quadUV(b, g, A, B, C, D, N, along, s, s + len);
    }
    s += len;
  }
  return b.build();
}

function quadUV(b, g, A, B, C, D, N, along, s0, s1) {
  b.quad(g, A, B, C, D, N, [along(A), s0], [along(B), s0], [along(C), s1], [along(D), s1]);
}

/**
 * Prisma: 2D-Querschnitt [[a,b],...] wird entlang L extrudiert.
 * world = origin + a*A + b*B + l*L, l in [l0, l1]. split auf b -> Gruppen.
 */
export function prism(shape, l0, l1, { A, B, L, origin = new THREE.Vector3(), split = null, caps = false }) {
  const orient = Math.sign(signedArea(shape)) || 1;
  const b = new Builder(split === null ? 1 : 2);
  const P = (a, bb, l) => origin.clone().addScaledVector(A, a).addScaledVector(B, bb).addScaledVector(L, l);
  let s = 0;
  for (let i = 0; i < shape.length; i++) {
    const p = shape[i], q = shape[(i + 1) % shape.length];
    const da = q[0] - p[0], db = q[1] - p[1];
    const len = Math.hypot(da, db);
    if (len < 1e-7) continue;
    const na = (orient > 0 ? db : -db) / len, nb = (orient > 0 ? -da : da) / len;
    const N = A.clone().multiplyScalar(na).addScaledVector(B, nb);
    const g = split === null ? 0 : ((p[1] + q[1]) / 2 > split ? 0 : 1);
    b.quad(g, P(p[0], p[1], l0), P(p[0], p[1], l1), P(q[0], q[1], l1), P(q[0], q[1], l0), N,
      [l0, s], [l1, s], [l1, s + len], [l0, s + len]);
    s += len;
  }
  if (caps) {
    const tris = THREE.ShapeUtils.triangulateShape(shape.map(([a, bb]) => new THREE.Vector2(a, bb)), []);
    for (const [l, sign] of [[l0, -1], [l1, 1]]) {
      const N = L.clone().multiplyScalar(sign);
      for (const t of tris) {
        const g = split === null ? 0 : (shape[t[0]][1] > split ? 0 : 1);
        b.tri(g, P(...shape[t[0]], l), P(...shape[t[1]], l), P(...shape[t[2]], l), N);
      }
    }
  }
  return b.build();
}

export const X = new THREE.Vector3(1, 0, 0);
export const Y = new THREE.Vector3(0, 1, 0);
export const Z = new THREE.Vector3(0, 0, 1);

// Rechteck-Querschnitt mit Fasen (für Leisten, Schienen, Sprossen)
export function chamferRect(w, h, c, ox = 0, oy = 0) {
  return [
    [ox + c, oy], [ox + w - c, oy], [ox + w, oy + c], [ox + w, oy + h - c],
    [ox + w - c, oy + h], [ox + c, oy + h], [ox, oy + h - c], [ox, oy + c],
  ];
}
