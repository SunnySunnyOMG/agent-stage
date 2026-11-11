import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../skills/agent-stage/scripts/serve.mjs';
import { exportViewer } from '../skills/agent-stage/scripts/export.mjs';

test('local source arrives over SSE without raw payload, and no file path route is exposed', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stage-test-')), path = join(dir, 'events.jsonl');
  const raw = { v: 1, id: 'e1', run: 'r1', seq: 1, at: '2026-01-01T00:00:00Z', activity: 'tool-1', kind: 'tool', state: 'working', label: 'Read docs', origin: 'observed', rawPrompt: 'private payload' };
  await writeFile(path, JSON.stringify(raw) + '\n');
  const app = await startServer({ events: path, port: 0 });
  try {
    const base = new URL('/', app.url);
    const response = await fetch(new URL('events', base));
    assert.equal(response.headers.get('content-type'), 'text/event-stream');
    const reader = response.body.getReader();
    const first = new TextDecoder().decode((await reader.read()).value);
    assert.match(first, /Read docs/); assert.doesNotMatch(first, /private payload|rawPrompt/);
    await reader.cancel();
    assert.equal((await fetch(new URL('private.jsonl', base))).status, 404);
    assert.equal((await fetch(new URL('events', base), { method: 'POST', body: '{}' })).status, 405);
    const health = await (await fetch(new URL('health', base))).json();
    assert.equal(health.sourceReady, true); assert.equal(JSON.stringify(health).includes(path), false);
  } finally { await app.close(); await rm(dir, { recursive: true }); }
});

test('static export is self-contained and never overwrites an existing output', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stage-export-')), out = join(dir, 'web');
  try {
    await exportViewer(out);
    assert.match(await readFile(join(out, 'index.html'), 'utf8'), /Agent Stage/);
    assert.match(await readFile(join(out, 'office-art.mjs'), 'utf8'), /orthographic camera/);
    assert.match(await readFile(join(out, 'office-demo.jsonl'), 'utf8'), /"intent":"web"/);
    assert.match(await readFile(join(out, 'demo.jsonl'), 'utf8'), /"origin":"demo"/);
    await assert.rejects(exportViewer(out), { code: 'EEXIST' });
  } finally { await rm(dir, { recursive: true }); }
});

test('an initially unreadable event source is explicitly unavailable in browser snapshots', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'stage-unavailable-'));
  const app = await startServer({ events: join(dir, 'missing.jsonl'), port: 0 });
  try {
    const response = await fetch(new URL('events', app.url));
    const reader = response.body.getReader();
    const text = new TextDecoder().decode((await reader.read()).value);
    const snapshot = JSON.parse(text.slice('data: '.length).trim());
    assert.equal(snapshot.source?.available, false);
    assert.equal(snapshot.source?.mode, 'local-jsonl');
    assert.deepEqual(snapshot.activities, []);
    await reader.cancel();
  } finally { await app.close(); await rm(dir, { recursive: true }); }
});
