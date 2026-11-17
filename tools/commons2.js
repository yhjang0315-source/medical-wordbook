// Slow second pass of Wikimedia Commons searches (one request every 8 s). Results merge into commons.json.
const fs = require('fs');
const UA = { 'User-Agent': 'MedicalWordbookStudyPage/1.0 (educational static page; generic client)' };
const Q = {
  '통풍': 'gout foot', '소화성 궤양': 'gastric ulcer endoscopy', '대장암': 'colorectal cancer colonoscopy', '요로결석': 'kidney stone CT', '담석증': 'gallstones ultrasound',
  '뇌졸중': 'ischemic stroke CT', '간경변증': 'liver cirrhosis CT', '화상': 'second degree burn', '편도염': 'tonsillitis', '추간판 탈출증': 'disc herniation MRI lumbar',
  '폐암': 'lung cancer chest x-ray', '골다공증': 'vertebral compression fracture x-ray', '결핵': 'pulmonary tuberculosis chest x-ray', '녹내장': 'glaucoma optic disc cupping',
  '당뇨병': 'diabetic retinopathy fundus', '심부전': 'cardiomegaly chest x-ray', '만성폐쇄성폐질환': 'emphysema CT', '충수염': 'appendicitis CT', '유방암': 'breast cancer mammogram',
  '백혈병': 'acute leukemia blood smear', '빈혈': 'iron deficiency anemia blood smear', '말라리아': 'plasmodium falciparum blood smear', '대동맥류': 'abdominal aortic aneurysm CT',
  '위암': 'gastric cancer endoscopy', '알츠하이머병': 'Alzheimer disease brain MRI atrophy', '다낭성 난소 증후군': 'polycystic ovary ultrasound', '자궁근종': 'uterine fibroid ultrasound',
  '간암': 'hepatocellular carcinoma CT', '췌장염': 'acute pancreatitis CT', '염증성 장질환': 'ulcerative colitis endoscopy', '부비동염': 'sinusitis CT', '중이염': 'acute otitis media otoscopy',
  '갑상선기능항진증': 'goiter neck', '홍역': 'Koplik spots', '신우신염': 'pyelonephritis CT', '심부정맥혈전증': 'deep vein thrombosis leg', '회전근개 파열': 'rotator cuff tear MRI',
  '척추관 협착증': 'lumbar spinal stenosis MRI', '뇌수막염': 'meningitis MRI', '파킨슨병': 'DaTscan Parkinson', '갑상선암': 'thyroid nodule ultrasound', '폐렴2': 'pneumonia CT'
};
const strip = s => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
(async () => {
  const out = JSON.parse(fs.readFileSync('commons.json', 'utf8'));
  for (const [k, q] of Object.entries(Q)) {
    if (out[k] && out[k].length) continue;
    await new Promise(r => setTimeout(r, 8000));
    const u = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: q + ' filetype:bitmap', gsrnamespace: '6', gsrlimit: '7',
      prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '560', format: 'json' });
    let j; try { const r = await fetch(u, { headers: UA }); const t = await r.text(); if (t[0] !== '{') { console.log('RATE LIMITED at', k, '- stopping'); break; } j = JSON.parse(t); } catch (e) { console.log('ERR', k, String(e).slice(0, 60)); continue; }
    out[k] = Object.values((j.query || {}).pages || {}).sort((a, b) => a.index - b.index).map(p => { const i = p.imageinfo[0], m = i.extmetadata || {};
      return { title: p.title, w: i.width, h: i.height, thumb: i.thumburl, page: i.descriptionurl, lic: strip(m.LicenseShortName && m.LicenseShortName.value), by: strip(m.Artist && m.Artist.value).slice(0, 80) }; });
    fs.writeFileSync('commons.json', JSON.stringify(out));
    console.log('\n## ' + k + ' — ' + q); out[k].forEach((r, i) => console.log(`${i} [${r.lic}] ${r.title.slice(5, 90)} (${r.w}x${r.h})`));
  }
})();
