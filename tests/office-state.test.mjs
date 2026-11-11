import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore } from '../skills/agent-stage/assets/viewer/core.mjs';
import { stations } from '../skills/agent-stage/assets/viewer/office-art.mjs';
import { officeSnapshot } from '../skills/agent-stage/assets/viewer/office-state.mjs';

function event(fields) {
  return { v: 1, id: 'event-1', run: 'run', seq: 1, at: '2026-01-01T00:00:00Z', activity: 'root', kind: 'task', state: 'working', label: 'Working on the request', origin: 'observed', ...fields };
}

function render(events, source) {
  const store = createStore();
  for (const row of events) assert.equal(store.accept(event(row)), true);
  return officeSnapshot({ ...store.snapshot(), source });
}

test('every workstation maps to an explicit intent or activity state', () => {
  const scenarios = {
    board: { intent: 'planning' },
    library: { intent: 'research' },
    shelf: { kind: 'memory' },
    browser: { intent: 'web' },
    meeting: { intent: 'delegation' },
    desk: { label: 'Maybe search online' },
    terminal: { intent: 'code' },
    phone: { intent: 'communication' },
    handoff: { state: 'needs-user', intent: 'web' },
    review: { kind: 'verification' },
    coffee: { state: 'done' },
  };
  for (const [station, fields] of Object.entries(scenarios)) assert.equal(render([fields]).station, station);
  assert.equal(render([{ kind: 'reuse' }]).station, 'shelf');
  assert.equal(render([{ intent: 'computer' }]).station, 'desk');
  assert.deepEqual(Object.keys(stations).sort(), [...Object.keys(scenarios), 'sofa'].sort());
});

test('idle requires ended root work and complete observation', () => {
  assert.equal(render([{ kind: 'tool', state: 'done' }]).station, null);
  assert.equal(render([{ state: 'waiting' }]).availability, 'partial');
  assert.equal(render([{ state: 'done' }]).availability, 'ready');
  assert.equal(render([{ state: 'done' }], { available: false }).availability, 'unavailable');
  assert.equal(render([{}], { available: false }).focus, null);
});

test('a newly observed completed to-do update gets a cue once, without replaying on reconnect', () => {
  const store = createStore();
  store.accept(event({}));
  const before = store.snapshot();
  store.accept(event({ id: 'plan', activity: 'todo', parent: 'root', seq: 2, kind: 'tool', state: 'done', intent: 'planning' }));
  const after = store.snapshot();
  assert.equal(officeSnapshot(after, before).newlyDone.intent, 'planning');
  assert.equal(officeSnapshot(after, after).newlyDone, null);
  assert.equal(officeSnapshot(after, { ...before, source: { available: false } }).newlyDone, null);
  assert.equal(officeSnapshot(after).newlyDone, null);
});
