import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const port = Number(process.env.PORT ?? 4173);
const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  const candidate = resolve(root, `.${pathname}`);
  if (candidate !== root && !candidate.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  const requested = existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : extname(pathname)
      ? undefined
      : resolve(root, 'index.html');
  if (!requested) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }
  response.writeHead(200, {
    'content-type': types[extname(requested)] ?? 'application/octet-stream',
    'cache-control': pathname === '/service-worker.js' ? 'no-cache' : 'public, max-age=0'
  });
  createReadStream(requested).pipe(response);
}).listen(port, '127.0.0.1', () => {
  process.stdout.write(`PuzzleScroll test server listening on http://127.0.0.1:${port}\n`);
});
