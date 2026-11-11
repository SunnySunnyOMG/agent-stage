import { createDirector, mountPixelStage, pixelCharacters, pixelRooms } from './pixel-engine.mjs';
import { maxCharacterBytes, parseCharacter } from './character-format.mjs';
import { activityKey, officeSnapshot, officeStation } from './office-state.mjs';

const stations = {
  board: ['organize', 'To-do board'],
  library: ['research', 'Reading area'],
  shelf: ['research', 'Memory shelf'],
  browser: ['code', 'Web browsing'],
  meeting: ['meeting', 'Meeting table'],
  desk: ['other', 'Work desk'],
  terminal: ['code', 'Code bench'],
  phone: ['company', 'Telephone'],
  handoff: ['other', 'Handoff tray'],
  review: ['research', 'Evidence review'],
};
const storageKey = 'agent-stage.custom-character.v1';
const displayName = key => key[0].toUpperCase() + key.slice(1);
const characterNames = { kokeshi: 'Wooden doll', neko: 'Cat', onigiri: 'Rice ball', paper: 'Curled paper' };

export function mountPixelOffice(canvas, params, onLookChange) {
  const panel = document.getElementById('pixel-controls');
  const room = document.getElementById('pixel-room');
  const skin = document.getElementById('pixel-character');
  const upload = document.getElementById('character-file');
  const remove = document.getElementById('remove-character');
  const feedback = document.getElementById('character-feedback');
  const caption = document.getElementById('office-location');
  const listeners = new Set();
  let stage, custom, current, previous, projection, cue, cueTimer;
  let revision = 0, generation = 0, paused = false, disposed = false;
  const source = {
    watch(listener) {
      listeners.add(listener);
      if (current) listener(current);
      return () => listeners.delete(listener);
    },
  };

  for (const name of pixelRooms) room.add(new Option(displayName(name), name));
  for (const name of pixelCharacters) skin.add(new Option(characterNames[name], name));
  room.value = pixelRooms.includes(params.get('room')) ? params.get('room') : 'zen';
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved) custom = parseCharacter(saved);
  } catch { /* The picker remains usable without persistent storage. */ }
  if (custom) skin.add(new Option(custom.name, 'custom'));
  const requested = params.get('character');
  skin.value = [...skin.options].some(option => option.value === requested) ? requested : custom ? 'custom' : 'paper';
  panel.hidden = false;
  remove.hidden = !custom;

  function describe(frame) {
    const focus = cue ?? projection?.focus;
    const place = focus ? stations[officeStation(focus)][1]
      : frame.station === 'coffee' ? 'Coffee corner'
      : frame.station === 'sofa' ? 'Resting'
      : projection?.station === 'coffee' ? 'Idle'
      : projection?.availability === 'partial' ? 'Activity incomplete' : 'Awaiting activity data';
    const next = focus ? `${place} · ${focus.label} · ${focus.state} · ${focus.origin}` : place;
    if (caption.textContent !== next) caption.textContent = next;
    caption.dataset.station = frame.station ?? '';
  }

  function mount() {
    stage?.dispose();
    canvas.removeAttribute('data-room');
    stage = mountPixelStage(canvas, {
      room: room.value,
      look: skin.value === 'custom' ? 'paper' : skin.value,
      customCharacter: skin.value === 'custom' ? custom : undefined,
      source,
      links: { claude: false, slack: false },
      night: false,
      reducedMotion: 'system',
      environment: false,
      director: createDirector({ config: { breakAfterMs: 1500, deskMs: 1000, restMs: 2800, napAfterMs: 3400, minDwellMs: 1000, kindSettleMs: 0 } }),
      onFrame: describe,
      onError(error) {
        caption.textContent = 'Could not render this room or character.';
        console.error(error);
      },
    });
    stage.setPaused(paused);
  }

  function publish() {
    const focus = cue ?? projection?.focus;
    const now = new Date().toISOString();
    const station = focus ? officeStation(focus) : null;
    current = {
      schemaVersion: 1, generation: String(generation), revision: ++revision, observedAt: now,
      availability: projection?.availability ?? 'unavailable',
      activities: focus ? [{
        id: activityKey(focus), kind: stations[station][0], summary: focus.label, importance: 'high',
        phase: focus.state === 'needs-user' ? 'needs-user' : 'working', startedAt: focus.at, updatedAt: focus.at,
      }] : [],
      recent: [],
    };
    for (const listener of listeners) listener(current);
    describe({ station: caption.dataset.station || undefined });
  }

  function cancelCue() {
    clearTimeout(cueTimer);
    cueTimer = undefined;
    cue = undefined;
  }
  function timeCue() {
    if (!cue || paused) return;
    cueTimer = setTimeout(() => { cancelCue(); publish(); }, 3400);
  }

  function changeLook() {
    const url = new URL(location.href);
    url.searchParams.set('room', room.value);
    url.searchParams.set('character', skin.value);
    history.replaceState(null, '', url);
    onLookChange();
    mount();
  }
  room.onchange = skin.onchange = changeLook;
  upload.onchange = async () => {
    const file = upload.files[0];
    if (!file) return;
    try {
      if (file.size > maxCharacterBytes) throw new Error('Choose a character file under 32 KiB.');
      const text = await file.text();
      if (disposed) return;
      custom = parseCharacter(text);
      skin.querySelector('[value="custom"]')?.remove();
      skin.add(new Option(custom.name, 'custom'));
      skin.value = 'custom';
      remove.hidden = false;
      try { localStorage.setItem(storageKey, text); }
      catch { /* The character is still available for the current page. */ }
      feedback.textContent = `${custom.name} is ready to use.`;
      changeLook();
    } catch (error) {
      feedback.textContent = error instanceof SyntaxError ? 'This is not valid JSON.' : error.message;
    } finally { upload.value = ''; }
  };
  remove.onclick = () => {
    custom = undefined;
    skin.querySelector('[value="custom"]')?.remove();
    skin.value = 'paper';
    remove.hidden = true;
    feedback.textContent = 'Custom character cleared.';
    try { localStorage.removeItem(storageKey); } catch { /* Storage is unavailable. */ }
    changeLook();
  };

  mount();
  return {
    accept(snapshot) {
      projection = officeSnapshot(snapshot, previous);
      previous = snapshot;
      const specific = projection.focus && officeStation(projection.focus) !== 'desk';
      if (specific || projection.availability === 'unavailable') cancelCue();
      else if (projection.newlyDone) {
        cancelCue();
        cue = projection.newlyDone;
        timeCue();
      }
      publish();
    },
    reset() { cancelCue(); previous = projection = undefined; generation++; publish(); },
    setPaused(value) {
      paused = value;
      clearTimeout(cueTimer);
      stage?.setPaused(value);
      if (!value) timeCue();
    },
    dispose() { disposed = true; cancelCue(); stage?.dispose(); },
  };
}
