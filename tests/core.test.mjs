import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEvent, createStore } from '../skills/agent-stage/assets/viewer/core.mjs';

const event = (change = {}) => ({ v: 1, id: 'e1', run: 'r1', seq: 1, at: '2026-01-01T00:00:00Z', activity: 'tool-1', kind: 'tool', state: 'working', label: 'Read documentation', origin: 'observed', ...change });

test('valid events retain only display fields and reject invalid contracts', () => {
  const clean = validateEvent(event({ token: 'not-for-browser', args: { secret: true } }));
  assert.equal(clean?.activity, 'tool-1');
  assert.equal(Object.hasOwn(clean, 'token'), false);
  assert.equal(Object.hasOwn(clean, 'args'), false);
  for (const change of [{ v: 2 }, { seq: -1 }, { at: 'yesterday' }, { origin: 'guessed' }, { state: 'verified' }, { label: 'x'.repeat(161) }, { parent: 'tool-1' }]) assert.equal(validateEvent(event(change)), null);
});

test('duplicate and late activity events cannot resurrect completed work', () => {
  const s = createStore();
  assert.equal(s.accept(event()), true);
  assert.equal(s.accept(event()), false);
  s.accept(event({ id: 'e3', seq: 3, state: 'done' }));
  s.accept(event({ id: 'e2', seq: 2, state: 'working' }));
  assert.equal(s.snapshot().activities[0].state, 'done');
});

test('tool success and suggestive names do not fabricate agents, memory or acceptance', () => {
  const s = createStore();
  s.accept(event({ state: 'done', label: 'remember verified research by team' }));
  const view = s.snapshot();
  assert.deepEqual(view.activities.map(a => a.kind), ['tool']);
  assert.deepEqual(view.edges, []);
});

test('relationships require explicit same-run parents; equal activity IDs in other runs stay separate', () => {
  const s = createStore();
  s.accept(event({ id: 'root', activity: 'a', kind: 'agent' }));
  s.accept(event({ id: 'child', seq: 2, parent: 'a' }));
  s.accept(event({ id: 'other', run: 'r2', parent: 'a' }));
  assert.equal(s.snapshot().activities.length, 3);
  assert.equal(s.snapshot().edges.length, 1);
  assert.equal(s.snapshot().edges[0].run, 'r1');
});

test('observation loss never supplies a missing completion, and origins stay visible', () => {
  const s = createStore();
  s.accept(event({ origin: 'reported' }));
  s.accept({ v: 1, id: 'offline', run: 'r1', seq: 2, at: '2026-01-01T00:00:01Z', kind: 'observation', availability: 'unavailable', origin: 'observed' });
  assert.equal(s.snapshot().activities[0].state, 'working');
  assert.equal(s.snapshot().activities[0].origin, 'reported');
  assert.equal(s.snapshot().runs[0].availability, 'unavailable');
});

test('late observation reports keep their own ordering and need explicit ready recovery', () => {
  const s = createStore();
  s.accept(event({ id: 'a3', seq: 3 }));
  s.accept({ v: 1, id: 'o2', run: 'r1', seq: 2, at: '2026-01-01T00:00:01Z', kind: 'observation', availability: 'unavailable', origin: 'observed' });
  assert.equal(s.snapshot().runs[0].availability, 'unavailable');
  s.accept({ v: 1, id: 'o1', run: 'r1', seq: 1, at: '2026-01-01T00:00:00Z', kind: 'observation', availability: 'ready', origin: 'observed' });
  assert.equal(s.snapshot().runs[0].availability, 'unavailable');
  s.accept({ v: 1, id: 'o4', run: 'r1', seq: 4, at: '2026-01-01T00:00:03Z', kind: 'observation', availability: 'ready', origin: 'observed' });
  assert.equal(s.snapshot().runs[0].availability, 'ready');
});
