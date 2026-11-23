// 남성(BodyParts3D) 골격·장기·근육 모델을 세분화한 부위마다 따로 묶어 다시 만든다. 피부(skin.json)는 그대로 둔다.
// 사용: node build-detail.js <뼈 STL 폴더> <장기·근육 STL 폴더> <picks.tsv·picks2.tsv 가 있는 폴더> <출력 폴더>
// 좌표계와 삼각형 예산은 build.js, build2.js 와 같다. 부위를 나누는 규칙은 detail-rules.js.
const fs = require('fs'), path = require('path');
const { MeshoptSimplifier } = require('meshoptimizer');
const { fineId } = require('./detail-rules');
const [boneDir, dlDir, pickDir, outDir] = process.argv.slice(2);
const BUDGET = {
  bone: { skull: 16000, mandible: 3000, hyoid: 300, cerv: 6000, thor: 10000, lumb: 6000, sacr: 3000, clav: 1200, scap: 4000, ster: 1500,
    ribs: 16000, hume: 2400, radi: 1600, ulna: 1600, hand: 9000, hip: 6000, femu: 3000, pate: 600, tibi: 2400, fibu: 1400, foot: 9000 },
  org: { brain: 20000, heart: 9000, lung: 9000, vessel: 8000, liver: 2500, stomach: 2500, bowel: 6000, colon: 4000, kidney: 2500, spleen: 800, gall: 500,
    bladder: 700, prostate: 500, adrenal: 500, eye: 600, ear: 1200, nose: 1200, cord: 500 },
  mus: { abs: 9000, back: 14000, biceps: 5000, triceps: 4000, calf: 10000, cuff: 5000, delt: 4000, diaph: 10000, face: 12000, forearm: 14000, glute: 10000, ham: 6000,
    lat: 5000, neck: 10000, pect: 8000, quad: 8000, trap: 5000, adduct: 6000, psoas: 3000, shin: 7000, pelvic: 2500, mother: 12000 }
};
const FILE = { bone: 'skeleton.json', org: 'organs.json', mus: 'muscles.json' };
const SRC = 'BodyParts3D, (c) The Database Center for Life Science licensed under CC Attribution-Share Alike 2.1 Japan; meshes simplified and grouped into named parts';

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
const pad = b => { const r = b.byteLength % 4, buf = Buffer.from(b.buffer, b.byteOffset, b.byteLength); return r ? Buffer.concat([buf, Buffer.alloc(4 - r)]) : buf; };

(async () => {
  await MeshoptSimplifier.ready;
  const bones = fs.readFileSync(path.join(pickDir, 'picks.tsv'), 'utf8').trim().split('\n').map(l => l.split('\t'));
  let zlo = Infinity, zhi = -Infinity; const sac = [0, 0, 0]; let sn = 0;
  for (const [id, g] of bones) { const { pos } = readStl(path.join(boneDir, id + '.stl'));
    for (let i = 0; i < pos.length; i += 3) { if (pos[i + 2] < zlo) zlo = pos[i + 2]; if (pos[i + 2] > zhi) zhi = pos[i + 2]; if (g === 'sacr') { sac[0] += pos[i]; sac[1] += pos[i + 1]; sn++; } } }
  const s = 1.70 / (zhi - zlo), xm = sac[0] / sn, ym = sac[1] / sn;
  const tf = (x, y, z) => [(x - xm) * s, (z - zlo) * s, -(y - ym) * s];
  // 뼈: [id, 묶음, 크기, 이름], 장기·근육: [id, 겹, 묶음, 크기, 이름]
  const rows = { bone: bones.map(([id, g, sz, name]) => ({ id, g, sz: +sz, name, dir: boneDir })) };
  for (const [id, layer, g, sz, name] of fs.readFileSync(path.join(pickDir, 'picks2.tsv'), 'utf8').trim().split('\n').map(l => l.split('\t')))
    if (BUDGET[layer]) (rows[layer] = rows[layer] || []).push({ id, g, sz: +sz, name, dir: dlDir });
  const Q = 1.8 / 32767;
  for (const layer of Object.keys(BUDGET)) {
    const out = new Map(); // 세부 id -> {P, I}
    for (const g of Object.keys(BUDGET[layer])) {
      const mine = rows[layer].filter(r => r.g === g), total = mine.reduce((a, r) => a + r.sz, 0);
      for (const r of mine) {
        const f = path.join(r.dir, r.id + '.stl'); if (!fs.existsSync(f)) { console.log('MISSING', r.id); continue; }
        const p = readStl(f), target = Math.max(60, Math.round(BUDGET[layer][g] * r.sz / total)) * 3;
        let si = p.idx;
        if (target < p.idx.length) { si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, layer === 'bone' ? 0.2 : 0.05)[0];
          if (si.length > target * 1.5) si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 1.0)[0]; }
        const fid = fineId(g, [r.name]); if (!out.has(fid)) out.set(fid, { P: [], I: [] });
        const o = out.get(fid), base = o.P.length / 3, remap = new Map();
        for (const i of si) { let j = remap.get(i); if (j === undefined) { j = remap.size; remap.set(i, j); o.P.push(...tf(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2])); } o.I.push(base + j); }
      }
    }
    const groups = [], chunks = []; let tris = 0;
    for (const [id, { P, I }] of out) {
      const nv = P.length / 3, u32 = nv > 65535, pq = new Int16Array(nv * 3);
      for (let i = 0; i < P.length; i++) pq[i] = Math.max(-32767, Math.min(32767, Math.round(P[i] / Q)));
      chunks.push(pad(pq), pad(u32 ? new Uint32Array(I) : new Uint16Array(I))); groups.push({ id, nv, ni: I.length, u32: u32 ? 1 : 0 }); tris += I.length / 3;
    }
    let head = Buffer.from(JSON.stringify({ q: Q, groups }), 'utf8'); if (head.length % 4) head = Buffer.concat([head, Buffer.alloc(4 - head.length % 4, 0x20)]);
    const len = Buffer.alloc(4); len.writeUInt32LE(head.length);
    const bin = Buffer.concat([len, head, ...chunks]);
    fs.writeFileSync(path.join(outDir, FILE[layer]), JSON.stringify({ source: SRC, b64: bin.toString('base64') }));
    console.log(layer, 'parts', groups.length, 'tris', tris, 'bin', bin.length, '|', groups.map(g => g.id).join(' '));
  }
})();
