// Build organs.json / muscles.json / skin.json in the same coordinate frame as skeleton.json.
// Usage: node build2.js <bonesDir> <partsDir> <outDir>
const fs = require('fs'), path = require('path');
const { MeshoptSimplifier } = require('meshoptimizer');
const [boneDir, dlDir, outDir] = process.argv.slice(2);
const BUDGET = {
  org: { brain: 16000, heart: 9000, lung: 9000, vessel: 8000, liver: 2500, stomach: 2500, bowel: 6000, colon: 4000, kidney: 2500, spleen: 800, gall: 500,
    bladder: 700, prostate: 500, adrenal: 500, eye: 600, ear: 1200, nose: 1200, cord: 500 },
  mus: { abs: 9000, back: 14000, biceps: 5000, triceps: 4000, calf: 10000, cuff: 5000, delt: 4000, diaph: 10000, face: 12000, forearm: 14000, glute: 10000, ham: 6000,
    lat: 5000, neck: 10000, pect: 8000, quad: 8000, trap: 5000, adduct: 6000, psoas: 3000, shin: 7000, pelvic: 2500, mother: 12000 },
  surf: { surf: 26000 }
};
const FILE = { org: 'organs.json', mus: 'muscles.json', surf: 'skin.json' };

function readStl(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(80);
  if (b.length < 84 + n * 50) throw new Error('not a binary STL: ' + file);
  const map = new Map(), pos = new Float32Array(n * 9), idx = new Uint32Array(n * 3); let nv = 0;
  for (let t = 0; t < n; t++) for (let v = 0; v < 3; v++) {
    const o = 84 + t * 50 + 12 + v * 12, key = b.toString('latin1', o, o + 12);
    let i = map.get(key);
    if (i === undefined) { i = nv++; map.set(key, i); pos[i * 3] = b.readFloatLE(o); pos[i * 3 + 1] = b.readFloatLE(o + 4); pos[i * 3 + 2] = b.readFloatLE(o + 8); }
    idx[t * 3 + v] = i;
  }
  return { pos: pos.slice(0, nv * 3), idx };
}

(async () => {
  await MeshoptSimplifier.ready;
  // same frame as build.js: derived from the bone set only
  const bones = fs.readFileSync('picks.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
  let zlo = Infinity, zhi = -Infinity; const sac = [0, 0, 0]; let sn = 0;
  for (const [id, g] of bones) { const { pos } = readStl(path.join(boneDir, id + '.stl'));
    for (let i = 0; i < pos.length; i += 3) { if (pos[i + 2] < zlo) zlo = pos[i + 2]; if (pos[i + 2] > zhi) zhi = pos[i + 2]; if (g === 'sacr') { sac[0] += pos[i]; sac[1] += pos[i + 1]; sn++; } } }
  const s = 1.70 / (zhi - zlo), xm = sac[0] / sn, ym = sac[1] / sn;
  const tf = (x, y, z) => [(x - xm) * s, (z - zlo) * s, -(y - ym) * s]; // front was -y in the source (checked in build.js)
  console.log('frame', { zlo, zhi, s, xm, ym });

  const picks = fs.readFileSync('picks2.tsv', 'utf8').trim().split('\n').map(l => l.split('\t'));
  const Q = 1.8 / 32767;
  for (const layer of Object.keys(BUDGET)) {
    const groups = [], chunks = []; let total = 0;
    for (const g of Object.keys(BUDGET[layer])) {
      const mine = picks.filter(p => p[1] === layer && p[2] === g);
      const srcBytes = mine.reduce((a, p) => a + +p[3], 0);
      const P = [], I = []; let base = 0, src = 0;
      for (const [id, , , sz] of mine) {
        const f = path.join(dlDir, id + '.stl'); if (!fs.existsSync(f)) { console.log('MISSING', id); continue; }
        const p = readStl(f); src += p.idx.length / 3;
        const target = Math.max(60, Math.round(BUDGET[layer][g] * (+sz / srcBytes))) * 3;
        let si = p.idx;
        if (target < p.idx.length) { si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 0.05)[0];
          if (si.length > target * 1.5) si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 1.0)[0]; }
        const remap = new Map();
        for (const i of si) { let j = remap.get(i); if (j === undefined) { j = remap.size; remap.set(i, j); const t = tf(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]); P.push(t[0], t[1], t[2]); } I.push(base + j); }
        base += remap.size;
      }
      const nv = P.length / 3, u32 = nv > 65535;
      const pq = new Int16Array(nv * 3); for (let i = 0; i < P.length; i++) pq[i] = Math.max(-32767, Math.min(32767, Math.round(P[i] / Q)));
      const iq = u32 ? new Uint32Array(I) : new Uint16Array(I);
      const pad = b => { const r = b.byteLength % 4, buf = Buffer.from(b.buffer, b.byteOffset, b.byteLength); return r ? Buffer.concat([buf, Buffer.alloc(4 - r)]) : buf; };
      chunks.push(pad(pq), pad(iq)); groups.push({ id: g, nv, ni: I.length, u32: u32 ? 1 : 0 }); total += I.length / 3;
      console.log(layer, g, 'parts', mine.length, 'src', src, '->', I.length / 3);
    }
    let head = Buffer.from(JSON.stringify({ q: Q, groups }), 'utf8'); if (head.length % 4) head = Buffer.concat([head, Buffer.alloc(4 - head.length % 4, 0x20)]);
    const len = Buffer.alloc(4); len.writeUInt32LE(head.length);
    const bin = Buffer.concat([len, head, ...chunks]);
    fs.writeFileSync(path.join(outDir, FILE[layer]), JSON.stringify({ source: 'BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan; meshes simplified', b64: bin.toString('base64') }));
    console.log(layer, 'tris', total, 'bin', bin.length);
  }
})();
