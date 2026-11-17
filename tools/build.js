// Read the picked BodyParts3D STL files, simplify them, merge per bone group, and pack into one binary.
const fs = require('fs'), path = require('path');
const { MeshoptSimplifier } = require('meshoptimizer');
const [dlDir, picksPath, outPath] = process.argv.slice(2);
const BUDGET = { skull: 16000, mandible: 3000, hyoid: 300, cerv: 6000, thor: 10000, lumb: 6000, sacr: 3000, clav: 1200, scap: 4000, ster: 1500,
  ribs: 16000, hume: 2400, radi: 1600, ulna: 1600, hand: 9000, hip: 6000, femu: 3000, pate: 600, tibi: 2400, fibu: 1400, foot: 9000 };
const ORDER = Object.keys(BUDGET);

function readStl(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(80);
  if (b.length < 84 + n * 50) throw new Error('not a binary STL: ' + file);
  const map = new Map(), pos = [], idx = new Uint32Array(n * 3);
  for (let t = 0; t < n; t++) for (let v = 0; v < 3; v++) {
    const o = 84 + t * 50 + 12 + v * 12, key = b.toString('latin1', o, o + 12);
    let i = map.get(key);
    if (i === undefined) { i = pos.length / 3; map.set(key, i); pos.push(b.readFloatLE(o), b.readFloatLE(o + 4), b.readFloatLE(o + 8)); }
    idx[t * 3 + v] = i;
  }
  return { pos: new Float32Array(pos), idx };
}

(async () => {
  await MeshoptSimplifier.ready;
  const picks = fs.readFileSync(picksPath, 'utf8').trim().split('\n').map(l => l.split('\t'));
  const parts = picks.map(([id, g, , name]) => ({ id, g, name, ...readStl(path.join(dlDir, id + '.stl')) }));
  const srcTris = {}; for (const p of parts) srcTris[p.g] = (srcTris[p.g] || 0) + p.idx.length / 3;

  // source frame: find bounds, vertical axis, and which way is the front (patella sits in front of femur)
  const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
  const centre = g => { const c = [0, 0, 0]; let n = 0; for (const p of parts) if (p.g === g) for (let i = 0; i < p.pos.length; i += 3) { c[0] += p.pos[i]; c[1] += p.pos[i + 1]; c[2] += p.pos[i + 2]; n++; } return c.map(v => v / n); };
  for (const p of parts) for (let i = 0; i < p.pos.length; i++) { const a = i % 3; if (p.pos[i] < lo[a]) lo[a] = p.pos[i]; if (p.pos[i] > hi[a]) hi[a] = p.pos[i]; }
  const pat = centre('pate'), fem = centre('femu'), skull = centre('skull'), foot = centre('foot');
  console.log('bbox lo', lo.map(v => v.toFixed(0)), 'hi', hi.map(v => v.toFixed(0)));
  console.log('patella-femur', pat.map((v, i) => (v - fem[i]).toFixed(0)), 'skull-foot', skull.map((v, i) => (v - foot[i]).toFixed(0)));
  if (!(hi[2] - lo[2] > hi[0] - lo[0] && hi[2] - lo[2] > hi[1] - lo[1] && skull[2] > foot[2])) throw new Error('unexpected up axis');
  const frontNegY = pat[1] < fem[1], s = 1.70 / (hi[2] - lo[2]), xm = centre('sacr')[0], ym = centre('sacr')[1];
  // rotate so y is up and the front faces +z (a proper rotation either way, so left stays left)
  const tf = frontNegY ? (x, y, z) => [(x - xm) * s, (z - lo[2]) * s, -(y - ym) * s] : (x, y, z) => [-(x - xm) * s, (z - lo[2]) * s, (y - ym) * s];
  console.log('frontNegY', frontNegY, 'scale', s);

  const Q = 1.8 / 32767, groups = [], chunks = [];
  let total = 0;
  for (const g of ORDER) {
    const P = [], I = []; let base = 0;
    for (const p of parts.filter(p => p.g === g)) {
      const target = Math.max(60, Math.round(p.idx.length / 3 * BUDGET[g] / srcTris[g])) * 3;
      const [si] = target < p.idx.length ? MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 0.2) : [p.idx];
      const remap = new Map();
      for (const i of si) { let j = remap.get(i); if (j === undefined) { j = remap.size; remap.set(i, j); P.push(...tf(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2])); } I.push(base + j); }
      base += remap.size;
    }
    const nv = P.length / 3, u32 = nv > 65535;
    const pq = new Int16Array(nv * 3); for (let i = 0; i < P.length; i++) pq[i] = Math.round(P[i] / Q);
    const iq = u32 ? new Uint32Array(I) : new Uint16Array(I);
    const pad = b => { const r = b.byteLength % 4; return r ? Buffer.concat([Buffer.from(b.buffer, b.byteOffset, b.byteLength), Buffer.alloc(4 - r)]) : Buffer.from(b.buffer, b.byteOffset, b.byteLength); };
    chunks.push(pad(pq), pad(iq)); groups.push({ id: g, nv, ni: I.length, u32: u32 ? 1 : 0 }); total += I.length / 3;
    console.log(g, 'src', srcTris[g], '->', I.length / 3, 'verts', nv);
  }
  let head = Buffer.from(JSON.stringify({ q: Q, groups }), 'utf8'); if (head.length % 4) head = Buffer.concat([head, Buffer.alloc(4 - head.length % 4, 0x20)]);
  const len = Buffer.alloc(4); len.writeUInt32LE(head.length);
  const out = Buffer.concat([len, head, ...chunks]); fs.writeFileSync(outPath, out);
  console.log('tris', total, 'bytes', out.length);
})();
