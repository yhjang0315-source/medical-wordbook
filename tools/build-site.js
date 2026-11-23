// 설치형 웹앱(PWA)용 파일을 만든다: index.html, 아이콘 PNG. 저장소 폴더에서 `node tools/build-site.js` 로 실행.
// medical-wordbook.html 을 고친 뒤에는 이 스크립트를 다시 돌려 index.html 을 맞춘다.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.resolve(__dirname, '..');

// ---- index.html: 아티팩트용 페이지 조각에 문서 머리와 설치 기능을 붙인다
const page = fs.readFileSync(path.join(root, 'medical-wordbook.html'), 'utf8');
const head = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0E1618">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="의학 단어장">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>html, body { margin: 0 }
#install { position: fixed; right: 16px; bottom: max(16px, env(safe-area-inset-bottom, 0px)); z-index: 50; box-shadow: 0 4px 16px rgba(0,0,0,.25) } #install[hidden] { display: none }
#guide { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; background: var(--surface); color: var(--ink); border-top: 1px solid var(--line); border-radius: 16px 16px 0 0; box-shadow: 0 -8px 24px rgba(0,0,0,.25);
  padding: 18px max(16px, env(safe-area-inset-left, 0px)) max(20px, env(safe-area-inset-bottom, 0px)); max-width: 720px; margin: 0 auto }
#guide[hidden] { display: none } #guide h2 { margin: 0 0 8px; font-size: 18px } #guide ol { margin: 0 0 12px; padding-left: 20px; line-height: 1.7 } #guide p { margin: 0 0 12px; color: var(--muted); font-size: 14px }
#guide .row { display: flex; flex-wrap: wrap; gap: 8px } #guide a.btn { text-decoration: none; display: inline-block }</style>
</head>
<body>
`;
const tail = `
<button class="btn small primary" id="install" hidden>앱으로 설치</button>
<section id="guide" role="dialog" aria-labelledby="guide-t" hidden></section>
<script>
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
// 설치 버튼: 브라우저가 설치 창을 띄워 주면 그것을 쓰고, 아니면 브라우저별 설치 방법을 보여 준다.
(() => {
  const ua = navigator.userAgent, b = document.getElementById('install'), g = document.getElementById('guide');
  const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  const kakao = /KAKAOTALK/i.test(ua), inApp = kakao || /NAVER\\(inapp|Instagram|FBAN|FBAV|FB_IAB|Line\\/|DaumApps|everytimeApp|BAND\\/|; wv\\)/i.test(ua);
  const url = location.href.split('#')[0];
  let ev = null;
  const btn = (id, text, href, primary) => href ? \`<a class="btn small\${primary ? ' primary' : ''}" id="\${id}" href="\${href}">\${text}</a>\` : \`<button class="btn small\${primary ? ' primary' : ''}" id="\${id}">\${text}</button>\`;
  function steps() {
    if (inApp) {
      const open = kakao ? 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url)
        : android ? 'intent://' + url.replace(/^https?:\\/\\//, '') + '#Intent;scheme=https;package=com.android.chrome;end' : '';
      return { t: '다른 브라우저에서 열어야 설치됩니다', p: '카카오톡, 네이버, 인스타그램 같은 앱 안의 브라우저에서는 앱 설치가 되지 않습니다.',
        s: ios ? ['오른쪽 아래나 위의 메뉴(… 또는 공유)를 누릅니다', '"Safari로 열기" 또는 "다른 브라우저로 열기"를 고릅니다', '열린 Safari에서 공유 버튼 → "홈 화면에 추가"를 누릅니다']
               : [\`아래 "\${kakao ? '외부 브라우저로 열기' : 'Chrome에서 열기'}"를 누릅니다\`, '열린 브라우저에서 이 버튼("앱으로 설치")을 다시 누릅니다'],
        x: (open ? btn('g-open', ios || kakao ? '외부 브라우저로 열기' : 'Chrome에서 열기', open, true) : '') + btn('g-copy', '주소 복사') };
    }
    if (ios) return { t: '홈 화면에 추가하기', p: '아이폰과 아이패드는 공유 메뉴에서 설치합니다. Safari, Chrome 모두 됩니다.',
      s: ['주소창 옆이나 화면 아래의 공유 버튼(네모에서 화살표가 위로 나온 모양)을 누릅니다', '메뉴를 아래로 내려 "홈 화면에 추가"를 누릅니다', '오른쪽 위 "추가"를 누릅니다'], x: '' };
    if (/SamsungBrowser/.test(ua)) return { t: '앱으로 설치하기', p: '삼성 인터넷에서는 메뉴에서 설치합니다.',
      s: ['주소창의 설치 아이콘(아래 화살표)이 보이면 누릅니다', '없으면 오른쪽 아래 메뉴(☰) → "현재 페이지 추가" → "홈 화면"을 누릅니다'], x: '' };
    if (android) return { t: '앱으로 설치하기', p: '설치 창이 뜨지 않으면 Chrome 메뉴에서 설치합니다.',
      s: ['오른쪽 위 메뉴(⋮)를 누릅니다', '"앱 설치" 또는 "홈 화면에 추가"를 누릅니다', '"설치"를 누릅니다'], x: '' };
    return { t: '앱으로 설치하기', p: '컴퓨터에서는 Chrome이나 Edge에서 설치할 수 있습니다.',
      s: ['주소창 오른쪽 끝의 설치 아이콘(모니터에 아래 화살표)을 누릅니다', '없으면 메뉴(⋮ 또는 …) → "앱 설치" 또는 "앱 → 이 사이트를 앱으로 설치"를 누릅니다'], x: '' };
  }
  function guide(open) {
    if (!open) { g.hidden = true; return; }
    const s = steps();
    g.innerHTML = \`<h2 id="guide-t">\${s.t}</h2><p>\${s.p}</p><ol>\${s.s.map(x => '<li>' + x + '</li>').join('')}</ol><div class="row">\${s.x}\${btn('g-close', '닫기')}</div>\`;
    g.hidden = false;
  }
  g.addEventListener('click', async e => {
    const t = e.target.closest('#g-close, #g-copy'); if (!t) return;
    if (t.id === 'g-close') return guide(false);
    try { await navigator.clipboard.writeText(url); t.textContent = '복사했습니다'; } catch (x) { prompt('주소를 복사하세요', url); }
  });
  b.addEventListener('click', async () => {
    if (ev) { ev.prompt(); const r = await ev.userChoice.catch(() => null); ev = null; if (r && r.outcome === 'accepted') b.hidden = true; return; }
    guide(g.hidden);
  });
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; });
  addEventListener('appinstalled', () => { b.hidden = true; guide(false); });
  if (!installed()) b.hidden = false;
  // 앱 안 브라우저로 들어오면 처음 한 번 안내를 먼저 띄운다
  if (inApp && !installed()) { let seen = false; try { seen = sessionStorage.getItem('medwords.inapp') === '1'; sessionStorage.setItem('medwords.inapp', '1'); } catch (x) {} if (!seen) guide(true); }
})();
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'index.html'), head + page + tail);

// ---- 아이콘: 선으로만 그린 주사기 (단색 선, 단색 바탕)
const SEG = [];
const seg = (x1, y1, x2, y2) => SEG.push([x1, y1, x2, y2]);
seg(-.92, -.2, -.92, .2);            // 밀대 손잡이
seg(-.92, 0, -.5, 0);                // 밀대
seg(-.5, -.3, -.5, .3);              // 날개
seg(-.5, -.17, .3, -.17); seg(-.5, .17, .3, .17); seg(.3, -.17, .3, .17); // 몸통
seg(-.2, -.17, -.2, -.05); seg(.05, -.17, .05, -.05); // 눈금
seg(.3, 0, .46, 0);                  // 바늘 꼭지
seg(.46, 0, .95, 0);                 // 바늘
const C = Math.SQRT1_2;
const dist = (px, py, [x1, y1, x2, y2]) => { const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))); return Math.hypot(px - x1 - t * dx, py - y1 - t * dy); };
const crcT = Array.from({ length: 256 }, (_, n) => { for (let k = 0; k < 8; k++) n = n & 1 ? 0xEDB88320 ^ (n >>> 1) : n >>> 1; return n >>> 0; });
const crc = b => { let c = ~0; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return ~c >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4), t = Buffer.from(type), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([len, t, data, c]); };
function icon(size, scale) { // scale: 그림이 차지하는 비율 (마스크형 아이콘은 가장자리가 잘리므로 작게)
  const bg = [0x0E, 0x16, 0x18], fg = [0xFF, 0xFF, 0xFF], half = .045, raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) { raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) { const u = ((x + .5) / size * 2 - 1) / scale, v = ((y + .5) / size * 2 - 1) / scale;
      // 화면 좌표를 주사기 축 좌표로 돌린다: 바늘이 오른쪽 위를 향한다
      const ax = (u - v) * C, ay = (u + v) * C; let d = 1e9; for (const s of SEG) d = Math.min(d, dist(ax, ay, s));
      const px = 2 / size / scale, a = Math.max(0, Math.min(1, (half - d) / px + .5)), o = y * (size * 3 + 1) + 1 + x * 3;
      for (let c = 0; c < 3; c++) raw[o + c] = Math.round(bg[c] + (fg[c] - bg[c]) * a); } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
fs.mkdirSync(path.join(root, 'icons'), { recursive: true });
for (const [name, size, scale] of [['icon-192.png', 192, .68], ['icon-512.png', 512, .68], ['maskable-512.png', 512, .5], ['apple-touch-icon.png', 180, .62]])
  fs.writeFileSync(path.join(root, 'icons', name), icon(size, scale));
console.log('index.html', (head + page + tail).length, 'bytes; icons written');
