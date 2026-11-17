// Build organs-f.json and skin-f.json from HRA Visible Human Female GLB files. Usage: node build3.js <glbDir> <outDir>
const fs = require('fs'), path = require('path');
const { MeshoptSimplifier } = require('meshoptimizer');
const [dir, outDir] = process.argv.slice(2);
// group -> [file, triangle budget]
const PLAN = {
  org: { brain: [['3d-allen-f-brain', 16000]], eye: [['3d-vh-f-eye-l', 700], ['3d-vh-f-eye-r', 700]], nose: [['3d-vh-f-larynx', 900], ['3d-vh-f-palatine-tonsil-l', 250], ['3d-vh-f-palatine-tonsil-r', 250]],
    lung: [['3d-vh-f-lung', 9000], ['3d-vh-f-trachea', 700], ['3d-vh-f-main-bronchus', 800]], heart: [['3d-vh-f-heart', 7000]], liver: [['3d-vh-f-liver', 3500]], spleen: [['3d-vh-f-spleen', 800]],
    pancreas: [['3d-vh-f-pancreas', 1200]], kidney: [['3d-vh-f-kidney-l', 1800], ['3d-vh-f-kidney-r', 1800], ['3d-vh-f-renal-pelvis-l', 200], ['3d-vh-f-renal-pelvis-r', 200], ['3d-vh-f-ureter-l', 600], ['3d-vh-f-ureter-r', 600]],
    colon: [['3d-sbu-f-large-intestine', 4500]], bowel: [['3d-vh-f-small-intestine', 6000]], bladder: [['3d-vh-f-urinary-bladder', 900]], uterus: [['3d-vh-f-uterus', 1800]],
    ovary: [['3d-vh-f-ovary-l', 300], ['3d-vh-f-ovary-r', 300], ['3d-vh-f-fallopian-tube-l', 700], ['3d-vh-f-fallopian-tube-r', 700]], breast: [['3d-vh-f-mammary-gland-l', 3000], ['3d-vh-f-mammary-gland-r', 3000]],
    cord: [['3d-vh-f-spinal-cord', 2000]], vessel: [['3d-vh-f-blood-vasculature', 12000]] },
  surf: { surf: [['3d-vh-f-skin', 26000]] }
};
const FILE = { org: 'organs-f.json', surf: 'skin-f.json' };
const CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };

function readGlb(f) {
  const b = fs.readFileSync(f); let o = 12, json, bin;
  while (o < b.length) { const len = b.readUInt32LE(o), type = b.readUInt32LE(o + 4), d = b.subarray(o + 8, o + 8 + len); if (type === 0x4E4F534A) json = JSON.parse(d.toString('utf8')); else if (type === 0x004E4942) bin = d; o += 8 + len; }
  const acc = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], [T, sz] = CT[a.componentType], n = { SCALAR: 1, VEC3: 3 }[a.type];
    const start = (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || sz * n, out = new T(a.count * n), dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const get = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' }[a.componentType];
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[get](start + k * stride + c * sz, true);
    return out; };
  // merge every triangle primitive into one welded mesh (the files carry no node transforms)
  const map = new Map(), pos = [], idx = [];
  for (const m of json.meshes) for (const p of m.primitives) { if (p.mode !== undefined && p.mode !== 4) continue;
    const P = acc(p.attributes.POSITION), I = p.indices !== undefined ? acc(p.indices) : Uint32Array.from({ length: P.length / 3 }, (_, i) => i), local = new Uint32Array(P.length / 3);
    for (let i = 0; i < P.length; i += 3) { const key = P[i] + ',' + P[i + 1] + ',' + P[i + 2]; let j = map.get(key); if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(P[i], P[i + 1], P[i + 2]); } local[i / 3] = j; }
    for (let i = 0; i + 2 < I.length; i += 3) { const a = local[I[i]], b2 = local[I[i + 1]], c = local[I[i + 2]]; if (a !== b2 && b2 !== c && a !== c) idx.push(a, b2, c); } }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}

(async () => {
  await MeshoptSimplifier.ready;
  // frame from the skin: y is up, +z is the front, +x is the body's left (checked: eyes in front of brain, spleen at +x)
  const skin = readGlb(path.join(dir, '3d-vh-f-skin.glb')); const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (let i = 0; i < skin.pos.length; i++) { const a = i % 3; if (skin.pos[i] < lo[a]) lo[a] = skin.pos[i]; if (skin.pos[i] > hi[a]) hi[a] = skin.pos[i]; }
  const s = 1.63 / (hi[1] - lo[1]), xm = (lo[0] + hi[0]) / 2, zm = (lo[2] + hi[2]) / 2;
  console.log('skin', lo.map(v => v.toFixed(3)), hi.map(v => v.toFixed(3)), 'scale', s.toFixed(4));
  const Q = 1.8 / 32767;
  for (const layer of Object.keys(PLAN)) { const groups = [], chunks = []; let total = 0;
    for (const [g, files] of Object.entries(PLAN[layer])) { const P = [], I = []; let base = 0, src = 0;
      for (const [f, budget] of files) { const p = f === '3d-vh-f-skin' ? skin : readGlb(path.join(dir, f + '.glb')); src += p.idx.length / 3; const target = budget * 3;
        let si = p.idx; if (target < p.idx.length) { si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 0.05)[0]; if (si.length > target * 1.5) si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 1.0)[0]; }
        const remap = new Map();
        for (const i of si) { let j = remap.get(i); if (j === undefined) { j = remap.size; remap.set(i, j); P.push((p.pos[i * 3] - xm) * s, (p.pos[i * 3 + 1] - lo[1]) * s, (p.pos[i * 3 + 2] - zm) * s); } I.push(base + j); }
        base += remap.size; }
      const nv = P.length / 3, u32 = nv > 65535, pq = new Int16Array(nv * 3); for (let i = 0; i < P.length; i++) pq[i] = Math.max(-32767, Math.min(32767, Math.round(P[i] / Q)));
      const iq = u32 ? new Uint32Array(I) : new Uint16Array(I);
      const pad = b => { const r = b.byteLength % 4, buf = Buffer.from(b.buffer, b.byteOffset, b.byteLength); return r ? Buffer.concat([buf, Buffer.alloc(4 - r)]) : buf; };
      chunks.push(pad(pq), pad(iq)); groups.push({ id: g, nv, ni: I.length, u32: u32 ? 1 : 0 }); total += I.length / 3; console.log(layer, g, 'src', src, '->', I.length / 3); }
    let head = Buffer.from(JSON.stringify({ q: Q, groups }), 'utf8'); if (head.length % 4) head = Buffer.concat([head, Buffer.alloc(4 - head.length % 4, 0x20)]);
    const len = Buffer.alloc(4); len.writeUInt32LE(head.length); const bin = Buffer.concat([len, head, ...chunks]);
    fs.writeFileSync(path.join(outDir, FILE[layer]), JSON.stringify({ source: 'HuBMAP Human Reference Atlas 3D Reference Object Library, 3D Reference Organ Set for Female (Visible Human Female), CC BY 4.0; meshes simplified and rescaled', b64: bin.toString('base64') }));
    console.log(layer, 'tris', total, 'bin', bin.length); }
})();
