const http = require('http');
const fs = require('fs');
const path = require('path');
const DIST_DIR = 'D:\\workspace\\my-prj\\tercher-work\\work-system\\web-app\\dist';
const m = {
  js: 'text/javascript',
  css: 'text/css',
  html: 'text/html',
  svg: 'image/svg+xml',
  json: 'application/json',
};
http.createServer((req, res) => {
  let f = req.url === '/' ? 'index.html' : req.url;
  f = path.join(DIST_DIR, f);
  try {
    let c = fs.readFileSync(f);
    let ext = path.extname(f).slice(1);
    res.writeHead(200, { 'Content-Type': m[ext] || 'text/plain' });
    res.end(c);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
  }
}).listen(8890, () => console.log('OK'));

process.on('SIGTERM', () => process.exit(0));
setInterval(() => {}, 60000);
