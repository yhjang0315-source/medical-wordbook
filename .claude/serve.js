// Local preview server: wraps the page like the artifact host does and serves its data and image files.
const fs = require('fs'), path = require('path'), http = require('http');
const root = path.resolve(__dirname, '..'), types = { '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.html': 'text/html; charset=utf-8', '.webmanifest': 'application/manifest+json', '.js': 'text/javascript' };
const wrap = body => '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0">' + body;
http.createServer((q, s) => {
  const p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/icon') { s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return s.end(wrap('<div style="background:#e9e9e9;padding:20px;display:flex;gap:24px;align-items:flex-end"><img src=/icon.svg width=300><img src=/icon.svg width=96><img src=/icon.svg width=48><img src=/icon.svg width=28><div style="background:#111;padding:16px"><img src=/icon.svg width=96></div></div>')); }
  if (p === '/sheet') {
    const sub = q.url.includes('new') ? 'img/new' : 'img'; const files = fs.readdirSync(path.join(root, sub)).filter(f => /.(jpg|png)$/.test(f));
    s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return s.end(wrap('<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;font:11px sans-serif;background:#fff">' +
      files.map(f => `<div><img src="/${sub}/${f}" style="width:100%;height:120px;object-fit:cover;display:block">${f}</div>`).join('') + '</div>'));
  }
  const f = path.join(root, p), ext = path.extname(f);
  if (types[ext] && f.startsWith(root) && fs.existsSync(f)) { s.writeHead(200, { 'content-type': types[ext] }); return s.end(fs.readFileSync(f)); }
  s.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); s.end(wrap(fs.readFileSync(path.join(root, 'medical-wordbook.html'), 'utf8')));
}).listen(process.env.PORT || 8765);
