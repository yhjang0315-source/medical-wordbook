// Classify BodyParts3D part names into the app's bone groups and write a download list.
const fs = require('fs');
const [treePath, listPath, outPath] = process.argv.slice(2);
const tree = JSON.parse(fs.readFileSync(treePath, 'utf8'));
const size = {};
for (const e of tree.tree) { const m = e.path.match(/stl\/(FMA\d+)\.stl$/); if (m) size[m[1]] = e.size; }
const rows = fs.readFileSync(listPath, 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split('\t'));
const rules = [
  ['skull', /^(occipital bone|frontal bone|sphenoid bone|ethmoid|vomer|(right|left) (temporal bone|parietal bone|zygomatic bone|lacrimal bone|nasal bone|maxilla|palatine bone|inferior nasal concha))$/],
  ['mandible', /^mandible$/],
  ['hyoid', /^hyoid bone$/],
  ['cerv', /^(atlas|axis|\w+ cervical vertebra)$/],
  ['thor', /^\w+ thoracic vertebra$/],
  ['lumb', /^\w+ lumbar vertebra$/],
  ['sacr', /^(sacrum|coccyx)$/],
  ['clav', /^(right|left) clavicle$/],
  ['scap', /^(right|left) scapula$/],
  ['ster', /^(manubrium|body of sternum|xiphoid process)$/],
  ['ribs', /^(right|left) \w+ (rib|costal cartilage)$/],
  ['hume', /^(right|left) humerus$/],
  ['radi', /^(right|left) radius$/],
  ['ulna', /^(right|left) ulna$/],
  ['hand', /^((right|left) (scaphoid|lunate|triquetral|pisiform|trapezium|trapezoid|capitate|hamate|\w+ metacarpal bone)|\w+ phalanx of (right|left) (thumb|\w+ finger))$/],
  ['hip', /^(right|left) hip bone$/],
  ['femu', /^(right|left) femur$/],
  ['pate', /^(right|left) patella$/],
  ['tibi', /^(right|left) tibia$/],
  ['fibu', /^(right|left) fibula$/],
  ['foot', /^((right|left) (talus|calcaneus|\w+ metatarsal bone|\w+ cuneiform bone|cuboid bone)|navicular bone of (right|left) foot|\w+ phalanx of (right|left) (big toe|\w+ toe)|sesamoid bone of (right|left) foot)$/]
];
const out = [], sum = {};
for (const [id, name] of rows) {
  if (!size[id]) continue;
  const r = rules.find(([, re]) => re.test(name));
  if (!r) continue;
  out.push([id, r[0], size[id], name].join('\t'));
  sum[r[0]] = sum[r[0]] || [0, 0]; sum[r[0]][0]++; sum[r[0]][1] += size[id];
}
fs.writeFileSync(outPath, out.join('\n') + '\n');
let total = 0; for (const [g, [n, s]] of Object.entries(sum)) { total += s; console.log(g, n, (s / 1e6).toFixed(1) + 'MB'); }
console.log('files', out.length, 'total', (total / 1e6).toFixed(0) + 'MB');
