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
<style>html, body { margin: 0 } #install { position: fixed; right: 16px; bottom: max(16px, env(safe-area-inset-bottom, 0px)); z-index: 50; box-shadow: 0 4px 16px rgba(0,0,0,.25) } #install[hidden] { display: none }</style>
</head>
<body>
`;
const tail = `
<button class="btn small primary" id="install" hidden>앱으로 설치</button>
<script>
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
(() => { let ev = null; const b = document.getElementById('install');
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; b.hidden = false; });
  b.addEventListener('click', async () => { if (!ev) return; ev.prompt(); await ev.userChoice; ev = null; b.hidden = true; });
  addEventListener('appinstalled', () => { b.hidden = true; }); })();
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
