const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.join(__dirname, '..', 'dist');
const port = Number(process.env.PORT ?? 4173);
const basePath = '/Daily-Plank';

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.wav': 'audio/wav',
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || '/';

  let filePath = path.normalize(path.join(root, pathname));
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    filePath = path.join(root, 'index.html');
  }

  const extension = path.extname(filePath);
  response.writeHead(200, {
    'Content-Type': mimeTypes[extension] ?? 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} at http://127.0.0.1:${port}${basePath}/`);
});
