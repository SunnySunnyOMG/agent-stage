import { createStore, readJSONL } from './core.mjs';
import { mountStage } from './stage.mjs';

const $ = id => document.getElementById(id);
let store = createStore(), stream, replay = null, timer, mode = 'Empty', selected;
const stage = mountStage($('stage'), focus => {
  $('focus-kind').textContent = focus ? `${focus.kind} · ${focus.origin}` : 'Ready when you are';
  $('focus-label').textContent = focus?.label ?? 'A stage for real activity.';
  $('focus-state').textContent = focus ? `${focus.state} · ${focus.run}` : 'Connect events or play the marked demo.';
});

function show(snapshot) {
  stage.accept(snapshot);
  $('count').textContent = snapshot.activities.length;
  $('activities').replaceChildren();
  const seen = new Set(snapshot.activities.map(a => a.kind));
  const absent = ['agent', 'verification', 'memory', 'reuse'].filter(k => !seen.has(k));
  $('notice').textContent = snapshot.source?.available === false ? 'The event source is unavailable. Last recorded states are preserved; completion is unknown.' : snapshot.truncated ? 'Display capacity reached. Observation is partial; narrow the input to one run.' :
    snapshot.runs.some(r => r.availability !== 'ready') ? 'Observation is incomplete. Last recorded work remains visible; completion is unknown.' :
    `Not reported: ${absent.join(', ') || 'none'}. Animation reflects recorded activity, not internal reasoning.`;
  for (const a of [...snapshot.activities].sort((a, b) => b.at.localeCompare(a.at))) {
    const button = document.createElement('button'); button.className = 'activity';
    const title = document.createElement('span'); title.className = 'activity-title'; title.textContent = a.label;
    const meta = document.createElement('span'); meta.className = 'activity-meta'; meta.dataset.state = a.state;
    const dot = document.createElement('i'); dot.className = 'state-dot';
    meta.append(dot, document.createTextNode(`${a.kind} · ${a.state} · ${a.origin}`)); button.append(title, meta);
    button.onclick = () => {
      selected = JSON.stringify([a.run, a.activity]); stage.select(selected);
      $('detail').hidden = false;
      $('detail').textContent = `Run: ${a.run}\nActivity: ${a.activity}\nParent: ${a.parent ?? 'not reported'}\nObserved: ${a.at}\nSource: ${a.origin}`;
      $('detail').style.whiteSpace = 'pre-line';
    };
    $('activities').append(button);
  }
  $('mode').textContent = `${mode} · ${snapshot.activities.length} activities · ${snapshot.edges.length} explicit links`;
}
function stop() { clearTimeout(timer); stream?.close(); stream = null; replay = null; $('pause').disabled = true; $('pause').textContent = 'Pause'; }
function badge(text, cls = '') { $('connection').textContent = text; $('connection').className = `badge ${cls}`; }
function startReplay(events, label) {
  stop(); store = createStore(); selected = null; stage.select(null); $('detail').hidden = true;
  mode = label; badge(label, events.every(e => e.origin === 'demo') ? 'demo' : '');
  const ordered = [...events].sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || a.seq - b.seq);
  if (!ordered.length) { show(store.snapshot()); $('progress').textContent = 'No valid events'; return; }
  replay = { events: ordered, index: 0, elapsed: 0, last: performance.now(), paused: false, start: Date.parse(ordered[0].at) };
  $('pause').disabled = false; show(store.snapshot()); tick();
}
function tick() {
  if (!replay) return;
  const now = performance.now();
  if (!replay.paused) replay.elapsed += (now - replay.last) * Number($('speed').value);
  replay.last = now;
  let changed = false;
  while (replay.index < replay.events.length && Date.parse(replay.events[replay.index].at) - replay.start <= replay.elapsed) {
    changed = store.accept(replay.events[replay.index++]) || changed;
  }
  if (changed) show(store.snapshot());
  $('progress').textContent = `${replay.index}/${replay.events.length} events${replay.index === replay.events.length ? ' · replay ended' : ''}`;
  if (replay.index < replay.events.length) timer = setTimeout(tick, 80);
  else { $('pause').disabled = true; replay = null; }
}
$('demo').onclick = async () => {
  try { const response = await fetch('demo.jsonl'); if (!response.ok) throw new Error('Demo file unavailable'); const result = readJSONL(await response.text()); startReplay(result.events, 'Demo · synthetic replay'); }
  catch (error) { badge('Demo could not load'); $('notice').textContent = error.message; }
};
$('pause').onclick = () => { if (replay) { replay.paused = !replay.paused; $('pause').textContent = replay.paused ? 'Resume' : 'Pause'; } };
$('import').onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 2 * 1024 * 1024) { $('notice').textContent = 'Import a normalized JSONL file smaller than 2 MB.'; return; }
  const result = readJSONL(await file.text()); startReplay(result.events, `Imported replay${result.invalid ? ` · ${result.invalid} invalid rows skipped` : ''}`);
};
show(store.snapshot());
const params = new URLSearchParams(location.search);
if (params.has('demo')) $('demo').click();
if (params.has('live')) {
  stop(); mode = 'Live · normalized JSONL'; badge('Connecting');
  stream = new EventSource('events');
  stream.onopen = () => badge('Connected · local source', 'connected');
  stream.onmessage = event => { try { const snapshot = JSON.parse(event.data); show(snapshot); badge(snapshot.source?.available === false ? 'Source unavailable' : 'Connected · local source', snapshot.source?.available === false ? '' : 'connected'); $('progress').textContent = `${snapshot.dropped ?? 0} invalid rows`; } catch { badge('Invalid server snapshot'); } };
  stream.onerror = () => { badge('Disconnected · completion unknown'); $('notice').textContent = 'The source connection was lost. Last recorded states are preserved.'; };
}
window.addEventListener('pagehide', () => { stop(); stage.dispose(); });
