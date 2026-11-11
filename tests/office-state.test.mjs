import assert from 'node:assert/strict';
import test from 'node:test';
import { createStore } from '../skills/agent-stage/assets/viewer/core.mjs';
import { officeSnapshot } from '../skills/agent-stage/assets/viewer/office-state.mjs';

function event(fields) {
  return { v: 1, id: 'event-1', run: 'run', seq: 1, at: '2026-01-01T00:00:00Z', activity: 'root', kind: 'task', state: 'working', label: 'Working on the request', origin: 'observed', ...fields };
}

function render(events, source) {
  const store = createStore();
  for (const row of events) assert.equal(store.accept(event(row)), true);
  return officeSnapshot({ ...store.snapshot(), source }, { generation: 'test', revision: 1, started: new Map() });
}

test('explicit research reaches the library projection while ordinary work and model steps stay at the computer', () => {
  const state = render([
    { intent: 'research', label: 'Find a source' },
    { id: 'event-2', seq: 2, activity: 'child', kind: 'tool', parent: 'root', label: 'Look up words in a label' },
    { id: 'event-3', seq: 3, activity: 'model', kind: 'agent', parent: 'root', intent: 'computer' },
  ]);
  assert.deepEqual(state.activities.map(activity => activity.kind), ['research', 'code', 'code']);
});

test('an office only receives an idle snapshot when root work is known to have ended', () => {
  const toolEnded = { kind: 'tool', state: 'done' };
  assert.equal(render([toolEnded]).availability, 'partial');
  assert.equal(render([{ state: 'waiting' }]).availability, 'partial');
  assert.equal(render([{ state: 'done' }]).availability, 'ready');
  assert.equal(render([{ state: 'done' }], { available: false }).availability, 'unavailable');
  assert.deepEqual(render([{}], { available: false }).activities, []);
});
