// Classify every BodyParts3D part into layer + group: bone (from picks.tsv), org, mus, surf. Writes picks2.tsv (id, layer, group, size, name).
const fs = require('fs');
const tree = JSON.parse(fs.readFileSync('bp3d_tree.json', 'utf8'));
const size = {};
for (const e of tree.tree) { const m = e.path.match(/stl\/(FMA\d+|BP\d+)\.stl$/); if (m) size[m[1]] = e.size; }
const names = Object.fromEntries(fs.readFileSync('parts_list_e.txt', 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split('\t')));
const comp = {};
for (const r of fs.readFileSync('composite_parts.txt', 'utf8').trim().split(/\r?\n/).slice(1).map(l => l.split('\t'))) (comp[r[1]] = comp[r[1]] || new Set()).add(r[2]);
const bones = new Set(fs.readFileSync('picks.tsv', 'utf8').trim().split('\n').map(l => l.split('\t')[0]));
const inComp = n => comp[n] || new Set();
const brain = inComp('brain'), heart = inComp('heart');

const ORG = [
  ['eye', /^eyeball$/], ['ear', /^ear$/], ['nose', /nasal cartilage|thyroid cartilage|cricoid|arytenoid|epiglott/],
  ['lung', /lobe of (right |left )?lung|^trachea$|^bronchus$/], ['liver', /^liver$/], ['gall', /^gallbladder$/],
  ['stomach', /^stomach$|^esophagus$/], ['spleen', /^spleen$/], ['kidney', /^(right|left) kidney$|ureter$/], ['adrenal', /adrenal gland$/],
  ['colon', /taenia|^rectum$|^appendix$|caecum|cecum|colon/], ['bowel', /^(duodenum|jejunum|ileum)$/], ['bladder', /^urinary bladder$|^urethra$/],
  ['prostate', /^prostate$|seminal vesicle/], ['cord', /spinal cord/],
  ['vessel', /aorta|vena cava|artery|vein|pulmonary trunk|sinus of|portal/]
];
const MUS = [
  ['cuff', /supraspinatus|infraspinatus|teres minor|subscapularis/], ['pect', /pectoralis|serratus anterior|subclavius/], ['delt', /deltoid/], ['triceps', /triceps brachii/],
  ['biceps', /biceps brachii|brachialis|coracobrachialis/],
  ['forearm', /carpi|digitorum superficialis|digitorum profundus|extensor digitorum$|extensor digiti|extensor indicis|pollicis longus|extensor pollicis|abductor pollicis longus|brachioradialis|pronator|supinator|palmaris longus|anconeus/],
  ['abs', /rectus abdominis|^(right|left) (external|internal) oblique|abdominal|transversus abdominis|pyramidalis|linea alba/], ['trap', /trapezius/], ['lat', /latissimus|teres major/],
  ['back', /rotator|iliocostalis|longissimus|spinalis|multifid|rhomboid|levator scapulae|serratus posterior|splenius|rotatores|interspinales|intertransvers|quadratus lumborum|erector/],
  ['glute', /gluteus|tensor fasciae|piriformis|obturator|gemellus|quadratus femoris/], ['adduct', /adductor (brevis|longus|magnus|minimus)|gracilis|pectineus/], ['psoas', /iliacus|psoas/], ['shin', /tibialis anterior|extensor hallucis longus|extensor digitorum longus|fibularis/], ['pelvic', /coccygeus|puborectalis|anal sphincter|levator ani/], ['quad', /rectus femoris|vastus|sartorius/], ['ham', /biceps femoris|semitendinosus|semimembranosus/],
  ['calf', /gastrocnemius|soleus|plantaris|calcaneal tendon|tibialis posterior|flexor hallucis longus|flexor digitorum longus|popliteus/], ['neck', /sternocleidomastoid|scalen|hyoid|sternothyroid|platysma|longus c|capitis (posterior|anterior|lateralis|superior|inferior)|digastric/],
  ['face', /masseter|temporalis|pterygoid|orbicularis|zygomaticus|frontalis|occipitalis|buccinator|nasalis|levator labii|levator anguli|depressor|mentalis|risorius|procerus|corrugator|auricularis|temporoparietalis/],
  ['diaph', /^diaphragm$|intercostal|levatores costarum|transversus thoracis/]
];
const SKIP = /tooth|disk|ligament|membrane|nerve|optic|eyebrow|thymus| duct$|penis|testis|eyelid|retinaculum|aponeurosis|fascia$|bursa|cartilage|tendon sheath|papillary|chiasm|tract$|hairs|gingiva|epididymis|tendinous arch/;
const out = [], sum = {}, left = [];
for (const id of Object.keys(size)) {
  const n = names[id] || ''; if (bones.has(id)) continue;
  let layer, g;
  if (n === 'skin') { layer = 'surf'; g = 'surf'; }
  else if ((brain.has(id) || /gyr|white matter|commissure|fornix|internal capsule|choroid|mammillary|lamina terminalis|stria |interpeduncular|interventricular foramen|corpus callosum|pituitary/.test(n)) && !/nerve|optic|chiasm/.test(n)) { layer = 'org'; g = 'brain'; }
  else if (heart.has(id) || /coronary|wall of heart/.test(n)) { layer = 'org'; g = 'heart'; }
  else { const o = ORG.find(([, re]) => re.test(n)); if (o) { layer = 'org'; g = o[0]; } }
  if (!layer) { if (!n || SKIP.test(n)) { left.push('skip:' + n); continue; } const m = MUS.find(([, re]) => re.test(n)); layer = 'mus'; g = m ? m[0] : 'mother'; if (!m) left.push(n); }
  out.push([id, layer, g, size[id], n].join('\t'));
  const k = layer + '/' + g; sum[k] = sum[k] || [0, 0]; sum[k][0]++; sum[k][1] += size[id];
}
fs.writeFileSync('picks2.tsv', out.join('\n') + '\n');
let total = 0; for (const [k, [n, s]] of Object.entries(sum).sort()) { total += s; console.log(k, n, (s / 1e6).toFixed(1) + 'MB'); }
console.log('files', out.length, 'total', (total / 1e6).toFixed(0) + 'MB');
console.log('LEFT/OTHER:', left.join(' | '));
