export const KINDS = ['task', 'agent', 'tool', 'verification', 'memory', 'reuse'];
export const STATES = ['working', 'waiting', 'needs-user', 'done', 'failed', 'cancelled', 'unknown'];
const origins = ['observed', 'reported', 'demo'];
const availability = ['ready', 'partial', 'unavailable'];
const identifier = value => typeof value === 'string' && /^[a-zA-Z0-9_.:@/-]{1,120}$/.test(value);

// Project only display-safe fields. Adapters must additionally redact short labels.
export function validateEvent(raw) {
  if (!raw || raw.v !== 1 || !identifier(raw.id) || !identifier(raw.run) || !Number.isSafeInteger(raw.seq) || raw.seq < 0 ||
      typeof raw.at !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(raw.at) || !Number.isFinite(Date.parse(raw.at)) || !origins.includes(raw.origin)) return null;
  const base = { v: 1, id: raw.id, run: raw.run, seq: raw.seq, at: raw.at, kind: raw.kind, origin: raw.origin };
  if (raw.kind === 'observation') return availability.includes(raw.availability) ? { ...base, availability: raw.availability } : null;
  if (!KINDS.includes(raw.kind) || !identifier(raw.activity) || !STATES.includes(raw.state) || typeof raw.label !== 'string' ||
      !raw.label.trim() || raw.label.length > 160 || (raw.parent !== undefined && (!identifier(raw.parent) || raw.parent === raw.activity))) return null;
  return { ...base, activity: raw.activity, state: raw.state, label: raw.label, ...(raw.parent === undefined ? {} : { parent: raw.parent }) };
}

export function createStore({ maxEvents = 20000, maxActivities = 2000 } = {}) {
  const seen = new Set(), activities = new Map(), runs = new Map();
  let dropped = 0, truncated = false;
  return {
    accept(raw) {
      const e = validateEvent(raw);
      if (!e) { dropped++; return false; }
      const eventKey = JSON.stringify([e.run, e.id]);
      if (seen.has(eventKey)) return false;
      if (seen.size >= maxEvents) { dropped++; truncated = true; return false; }
      seen.add(eventKey);
      const run = runs.get(e.run) ?? { id: e.run, seq: -1, observationSeq: -1, availability: 'ready', at: e.at };
      const nextRun = e.seq > run.seq ? { ...run, seq: e.seq, at: e.at } : { ...run };
      if (e.kind === 'observation' && e.seq > run.observationSeq) { nextRun.observationSeq = e.seq; nextRun.availability = e.availability; }
      runs.set(e.run, nextRun);
      if (e.kind === 'observation') return true;
      const key = JSON.stringify([e.run, e.activity]), previous = activities.get(key);
      if (previous && previous.seq >= e.seq) return false;
      if (!previous && activities.size >= maxActivities) { dropped++; truncated = true; return false; }
      activities.set(key, e);
      return true;
    },
    snapshot() {
      const items = [...activities.values()].map(a => ({ ...a }));
      const edges = items.filter(a => a.parent && activities.has(JSON.stringify([a.run, a.parent])))
        .map(a => ({ run: a.run, from: a.parent, to: a.activity }));
      return { activities: items, edges, runs: [...runs.values()].map(r => ({ ...r })), dropped, truncated };
    }
  };
}

export function readJSONL(text) {
  const events = []; let invalid = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try { const e = validateEvent(JSON.parse(line)); if (e) events.push(e); else invalid++; } catch { invalid++; }
  }
  return { events, invalid };
}

// Presentation only: priorities select a focus, never schedule or complete work.
export function direct(snapshot, now) {
  const priority = { 'needs-user': 0, working: 1, waiting: 2, failed: 3, unknown: 4, done: 5, cancelled: 6 };
  const ordered = [...snapshot.activities].sort((a, b) => (priority[a.state] - priority[b.state]) || b.at.localeCompare(a.at) || a.activity.localeCompare(b.activity));
  const active = ordered.filter(a => ['working', 'waiting', 'needs-user'].includes(a.state));
  const pool = active.length ? active : ordered;
  return { focus: pool.length ? pool[Math.floor(now / 2800) % pool.length] : null, active };
}
