// 여성(HRA, Visible Human Female) 장기 모델을 세분화한 부위마다 따로 묶어 다시 만든다. 피부(skin-f.json)는 그대로 둔다.
// 사용: node build-detail-f.js <GLB 폴더> <출력 폴더>
// 좌표계는 build3.js 와 같다(피부 기준, 키 1.63m). GLB 안의 노드 이름과 그 윗 노드 이름으로 부위를 정한다(detail-rules.js).
const fs = require('fs'), path = require('path');
const { MeshoptSimplifier } = require('meshoptimizer');
const { fineId } = require('./detail-rules');
const [dir, outDir] = process.argv.slice(2);
// 묶음 -> [파일, 삼각형 예산]
const PLAN = { brain: [['3d-allen-f-brain', 20000]], eye: [['3d-vh-f-eye-l', 700], ['3d-vh-f-eye-r', 700]], nose: [['3d-vh-f-larynx', 900], ['3d-vh-f-palatine-tonsil-l', 250], ['3d-vh-f-palatine-tonsil-r', 250]],
  lung: [['3d-vh-f-lung', 9000], ['3d-vh-f-trachea', 700], ['3d-vh-f-main-bronchus', 800]], heart: [['3d-vh-f-heart', 7000]], liver: [['3d-vh-f-liver', 3500]], spleen: [['3d-vh-f-spleen', 800]],
  pancreas: [['3d-vh-f-pancreas', 1200]], kidney: [['3d-vh-f-kidney-l', 1800], ['3d-vh-f-kidney-r', 1800], ['3d-vh-f-renal-pelvis-l', 200], ['3d-vh-f-renal-pelvis-r', 200], ['3d-vh-f-ureter-l', 600], ['3d-vh-f-ureter-r', 600]],
  colon: [['3d-sbu-f-large-intestine', 4500]], bowel: [['3d-vh-f-small-intestine', 6000]], bladder: [['3d-vh-f-urinary-bladder', 900]], uterus: [['3d-vh-f-uterus', 1800]],
  ovary: [['3d-vh-f-ovary-l', 300], ['3d-vh-f-ovary-r', 300], ['3d-vh-f-fallopian-tube-l', 700], ['3d-vh-f-fallopian-tube-r', 700]], breast: [['3d-vh-f-mammary-gland-l', 3000], ['3d-vh-f-mammary-gland-r', 3000]],
  cord: [['3d-vh-f-spinal-cord', 2000]], vessel: [['3d-vh-f-blood-vasculature', 12000]] };
// 겉을 감싸는 껍질이라 세부 부위를 가리는 조각(콩팥은 한 덩어리로 두므로 해당 없음)
const CT = { 5120: [Int8Array, 1], 5121: [Uint8Array, 1], 5122: [Int16Array, 2], 5123: [Uint16Array, 2], 5125: [Uint32Array, 4], 5126: [Float32Array, 4] };
const GET = { 5120: 'getInt8', 5121: 'getUint8', 5122: 'getInt16', 5123: 'getUint16', 5125: 'getUint32', 5126: 'getFloat32' };

// GLB 를 읽어 메시가 달린 노드마다 {names: [자기 이름, 윗 노드 이름...], pos, idx} 를 돌려준다(이 파일들에는 노드 변환이 없다)
function readGlb(f) {
  const b = fs.readFileSync(f); let o = 12, json, bin;
  while (o < b.length) { const len = b.readUInt32LE(o), type = b.readUInt32LE(o + 4), d = b.subarray(o + 8, o + 8 + len); if (type === 0x4E4F534A) json = JSON.parse(d.toString('utf8')); else if (type === 0x004E4942) bin = d; o += 8 + len; }
  const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
  const acc = i => { const a = json.accessors[i], v = json.bufferViews[a.bufferView], [T, sz] = CT[a.componentType], n = { SCALAR: 1, VEC3: 3 }[a.type];
    const start = (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || sz * n, out = new T(a.count * n);
    for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = dv[GET[a.componentType]](start + k * stride + c * sz, true);
    return out; };
  const par = {}; json.nodes.forEach((n, i) => (n.children || []).forEach(c => { par[c] = i; }));
  const out = [];
  json.nodes.forEach((node, ni) => { if (node.mesh === undefined) return;
    if (node.matrix || node.translation || node.rotation || node.scale) throw new Error('node transform in ' + f + ': ' + node.name);
    const names = []; for (let i = ni; i !== undefined; i = par[i]) names.push(json.nodes[i].name || '');
    const map = new Map(), pos = [], idx = [];
    for (const p of json.meshes[node.mesh].primitives) { if (p.mode !== undefined && p.mode !== 4) continue;
      const P = acc(p.attributes.POSITION), I = p.indices !== undefined ? acc(p.indices) : Uint32Array.from({ length: P.length / 3 }, (_, i) => i), local = new Uint32Array(P.length / 3);
      for (let i = 0; i < P.length; i += 3) { const key = P[i] + ',' + P[i + 1] + ',' + P[i + 2]; let j = map.get(key); if (j === undefined) { j = pos.length / 3; map.set(key, j); pos.push(P[i], P[i + 1], P[i + 2]); } local[i / 3] = j; }
      for (let i = 0; i + 2 < I.length; i += 3) { const a = local[I[i]], b2 = local[I[i + 1]], c = local[I[i + 2]]; if (a !== b2 && b2 !== c && a !== c) idx.push(a, b2, c); } }
    if (idx.length) out.push({ names, pos: new Float32Array(pos), idx: new Uint32Array(idx) }); });
  return out;
}
const pad = b => { const r = b.byteLength % 4, buf = Buffer.from(b.buffer, b.byteOffset, b.byteLength); return r ? Buffer.concat([buf, Buffer.alloc(4 - r)]) : buf; };

(async () => {
  await MeshoptSimplifier.ready;
  // 좌표계: 피부 전체를 기준으로 y 위, +z 앞, +x 몸의 왼쪽 (build3.js 와 같다)
  const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const p of readGlb(path.join(dir, '3d-vh-f-skin.glb'))) for (let i = 0; i < p.pos.length; i++) { const a = i % 3; if (p.pos[i] < lo[a]) lo[a] = p.pos[i]; if (p.pos[i] > hi[a]) hi[a] = p.pos[i]; }
  const s = 1.63 / (hi[1] - lo[1]), xm = (lo[0] + hi[0]) / 2, zm = (lo[2] + hi[2]) / 2, Q = 1.8 / 32767;
  const out = new Map();
  for (const [g, files] of Object.entries(PLAN)) for (const [f, budget] of files) {
    const parts = readGlb(path.join(dir, f + '.glb')), total = parts.reduce((a, p) => a + p.idx.length / 3, 0);
    for (const p of parts) {
      const target = Math.max(40, Math.round(budget * (p.idx.length / 3) / total)) * 3;
      let si = p.idx; if (target < p.idx.length) { si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 0.05)[0]; if (si.length > target * 1.5) si = MeshoptSimplifier.simplify(p.idx, p.pos, 3, target, 1.0)[0]; }
      const fid = fineId(g, p.names.concat(f)); if (!out.has(fid)) out.set(fid, { P: [], I: [] });
      const o = out.get(fid), base = o.P.length / 3, remap = new Map();
      for (const i of si) { let j = remap.get(i); if (j === undefined) { j = remap.size; remap.set(i, j); o.P.push((p.pos[i * 3] - xm) * s, (p.pos[i * 3 + 1] - lo[1]) * s, (p.pos[i * 3 + 2] - zm) * s); } o.I.push(base + j); }
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
  fs.writeFileSync(path.join(outDir, 'organs-f.json'), JSON.stringify({ source: 'HuBMAP Human Reference Atlas 3D Reference Object Library, 3D Reference Organ Set for Female (Visible Human Female), CC BY 4.0; meshes simplified, rescaled and grouped into named parts', b64: bin.toString('base64') }));
  console.log('org parts', groups.length, 'tris', tris, 'bin', bin.length, '|', groups.map(g => g.id).join(' '));
})();
