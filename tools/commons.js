// Search Wikimedia Commons for candidate images. Usage: node commons.js search  |  node commons.js fetch <outDir>
const fs = require('fs'), path = require('path');
const UA = { 'User-Agent': 'MedicalWordbookStudyPage/1.0 (educational static page; generic client)' };
const Q = {
  '건선': 'psoriasis plaque', '두드러기': 'urticaria wheals', '대상포진': 'herpes zoster rash', '흑색종': 'melanoma skin', '아토피 피부염': 'atopic dermatitis eczema',
  '여드름': 'acne vulgaris', '무좀': 'tinea pedis', '봉와직염': 'cellulitis leg', '수두': 'chickenpox rash', '홍역': 'measles rash', '수족구병': 'hand foot and mouth disease',
  '결막염': 'conjunctivitis eye', '백내장': 'cataract human eye', '하지정맥류': 'varicose veins leg', '통풍': 'gout toe podagra', '류마티스 관절염': 'rheumatoid arthritis hand',
  '헤르페스': 'herpes labialis', '쯔쯔가무시병': 'scrub typhus eschar', '폐렴': 'lobar pneumonia chest x-ray', '골절': 'colles fracture x-ray', '골관절염': 'knee osteoarthritis x-ray',
  '소화성 궤양': 'gastric ulcer endoscopy', '대장암': 'colon cancer colonoscopy', '요로결석': 'kidney stone CT', '담석증': 'gallstones ultrasound', '뇌졸중': 'ischemic stroke CT MCA',
  '간경변증': 'liver cirrhosis gross', '화상': 'second degree burn blister', '편도염': 'tonsillitis throat', '추간판 탈출증': 'lumbar disc herniation MRI', '폐암': 'lung cancer chest CT',
  '골다공증': 'osteoporosis vertebral compression fracture x-ray', '심근경색': 'ST elevation myocardial infarction ECG', '심방세동': 'atrial fibrillation ECG'
};
const strip = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
async function search(q, n = 7) {
  const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: q + ' filetype:bitmap', gsrnamespace: '6', gsrlimit: String(n),
    prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '560', format: 'json' });
  const j = await (await fetch(u, { headers: UA })).json();
  return Object.values((j.query || {}).pages || {}).sort((a, b) => a.index - b.index).map(p => { const i = p.imageinfo[0], m = i.extmetadata || {};
    return { title: p.title, w: i.width, h: i.height, thumb: i.thumburl, page: i.descriptionurl, lic: strip(m.LicenseShortName && m.LicenseShortName.value), by: strip(m.Artist && m.Artist.value).slice(0, 80) }; });
}
(async () => {
  const mode = process.argv[2];
  if (mode === 'search') {
    const out = fs.existsSync('commons.json') ? JSON.parse(fs.readFileSync('commons.json', 'utf8')) : {};
    for (const [k, q] of Object.entries(Q)) { if (out[k] && out[k].length) continue; await new Promise(r => setTimeout(r, 2500)); try { out[k] = await search(q); } catch (e) { out[k] = []; console.log('ERR', String(e).slice(0, 80)); }
      console.log('\n## ' + k + ' — ' + q); out[k].forEach((r, i) => console.log(`${i} [${r.lic}] ${r.title.slice(5, 95)} (${r.w}x${r.h})`)); }
    fs.writeFileSync('commons.json', JSON.stringify(out));
  } else if (mode === 'fetch') {
    const dir = process.argv[3], all = JSON.parse(fs.readFileSync('commons.json', 'utf8')), choice = JSON.parse(fs.readFileSync(process.argv[4] || 'choice.json', 'utf8')), meta = {};
    fs.mkdirSync(dir, { recursive: true });
    for (const [k, [idx, name]] of Object.entries(choice)) { const r = all[k][idx]; if (!r) { console.log('no', k); continue; }
      await new Promise(r2 => setTimeout(r2, 2500)); const res = await fetch(r.thumb, { headers: UA }); if (!res.ok || !(res.headers.get('content-type') || '').startsWith('image/')) { console.log('FAIL', k, res.status); continue; } const b = Buffer.from(await res.arrayBuffer()); const ext = /\.png$/i.test(r.thumb) ? 'png' : 'jpg';
      fs.writeFileSync(path.join(dir, name + '.' + ext), b); meta[k] = { f: name + '.' + ext, by: r.by, lic: r.lic, src: r.page, title: r.title.slice(5) }; console.log(k, name + '.' + ext, b.length, r.lic, '|', r.by); }
    fs.writeFileSync(process.argv[5] || 'photos.json', JSON.stringify(meta, null, 1));
  }
})();
