#!/usr/bin/env node
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { createStore, readJSONL } from '../assets/viewer/core.mjs';

const assets = fileURLToPath(new URL('../assets/viewer/', import.meta.url));
const files = { '/': ['index.html', 'text/html'], '/index.html': ['index.html', 'text/html'], '/style.css': ['style.css', 'text/css'], '/app.mjs': ['app.mjs', 'text/javascript'], '/core.mjs': ['core.mjs', 'text/javascript'], '/stage.mjs': ['stage.mjs', 'text/javascript'], '/demo.jsonl': ['demo.jsonl', 'application/x-ndjson'] };

export async function startServer({ events, demo = false, port = 4317, webRoot = assets } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Port must be an integer from 0 to 65535.');
  if (events && demo) throw new Error('Choose a real event source or demo mode, not both.');
  const source = events ? resolve(events) : null, clients = new Set();
  let snapshot = createStore().snapshot(), fingerprint = '', sourceReady = !source, refreshing = false;
  function send(response) { response.write(`data: ${JSON.stringify({ ...snapshot, source: { available: sourceReady, mode: source ? 'local-jsonl' : demo ? 'demo' : 'empty' } })}\n\n`); }
  async function refresh() {
    if (!source || refreshing) return;
    refreshing = true;
    try {
      const info = await stat(source);
      if (!info.isFile() || info.size > 2 * 1024 * 1024) throw new Error('Source must be a JSONL file no larger than 2 MB.');
      const nextFingerprint = `${info.ino}:${info.size}:${info.mtimeMs}`;
      if (nextFingerprint === fingerprint && sourceReady) return;
      const text = await readFile(source, 'utf8');
      if (Buffer.byteLength(text) > 2 * 1024 * 1024) throw new Error('Source grew beyond the size limit.');
      const parsed = readJSONL(text), store = createStore();
      for (const event of parsed.events) store.accept(event);
      snapshot = store.snapshot(); snapshot.dropped += parsed.invalid;
      fingerprint = nextFingerprint; sourceReady = true;
      for (const response of clients) send(response);
    } catch {
      sourceReady = false;
      snapshot = { ...snapshot, runs: snapshot.runs.map(r => ({ ...r, availability: 'unavailable' })) };
      for (const response of clients) send(response);
    } finally { refreshing = false; }
  }
  await refresh();
  const server = http.createServer(async (request, response) => {
    const host = request.headers.host ?? '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) { response.writeHead(403).end('Local host only'); return; }
    if (request.method !== 'GET') { response.writeHead(405, { Allow: 'GET' }).end(); return; }
    const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    if (pathname === '/health') { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ ok: true, mode: source ? 'local-jsonl' : demo ? 'demo' : 'empty', sourceReady })); return; }
    if (pathname === '/events') {
      if (!source) { response.writeHead(404).end('No live source configured'); return; }
      response.writeHead(200, { 'Content-Type': 'text/event-stream', Connection: 'keep-alive' });
      clients.add(response); send(response);
      const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 10000);
      request.on('close', () => { clients.delete(response); clearInterval(heartbeat); });
      return;
    }
    const file = files[pathname];
    if (!file) { response.writeHead(404).end('Not found'); return; }
    try { const body = await readFile(resolve(webRoot, file[0])); response.setHeader('Content-Type', `${file[1]}; charset=utf-8`); response.end(body); }
    catch { response.writeHead(404).end('Asset not found'); }
  });
  await new Promise((yes, no) => { server.once('error', no); server.listen(port, '127.0.0.1', yes); });
  const poll = setInterval(refresh, 500);
  const url = `http://127.0.0.1:${server.address().port}/${source ? '?live=1' : demo ? '?demo=1' : ''}`;
  return { server, url, close: async () => { clearInterval(poll); for (const client of clients) client.end(); await new Promise(done => server.close(done)); } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { events: { type: 'string' }, demo: { type: 'boolean' }, port: { type: 'string' }, web: { type: 'string' } } });
    const app = await startServer({ events: values.events, demo: values.demo, port: values.port === undefined ? 4317 : Number(values.port), webRoot: values.web ? resolve(values.web) : assets });
    console.log(`Agent Stage: ${app.url}`);
    console.log(values.events ? 'Read-only local event source. No remote upload.' : values.demo ? 'Synthetic replay; not a live agent.' : 'No source connected. Use --events <normalized.jsonl> or --demo.');
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => app.close().then(() => process.exit(0)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
