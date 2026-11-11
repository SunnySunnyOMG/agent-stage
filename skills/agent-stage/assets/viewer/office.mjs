import { createDirector, mountOriOffice, officeAtlas } from './ori-engine.mjs';
import { activityKey, officeKind, officeSnapshot } from './office-state.mjs';

export function mountOffice(canvas, onFocus, onError) {
  let listener, current, currentFrame, revision = 0, generation = 0;
  let activities = new Map();
  const started = new Map();
  const stationCaption = document.getElementById('office-location');
  const stationNames = { code: 'Computer', library: 'Library', coffee: 'Coffee corner', sofa: 'Sofa', handoff: 'Handoff desk' };

  function describe(frame) {
    currentFrame = frame;
    const activity = activities.get(frame.focusActivityId);
    stationCaption.textContent = stationNames[frame.station] ?? (frame.availability === 'ready' ? 'Office' : 'Awaiting activity data');
    stationCaption.dataset.station = frame.station ?? '';
    onFocus(activity);
  }

  const stage = mountOriOffice(canvas, {
    source: { watch(next) { listener = next; if (current) next(current); return () => { listener = undefined; }; } },
    atlas: officeAtlas,
    director: createDirector({ config: { maxStayMs: Infinity } }),
    onFrame: describe,
    onError,
  });
  return {
    accept(snapshot) {
      activities = new Map(snapshot.activities.map(activity => [activityKey(activity), activity]));
      current = officeSnapshot(snapshot, { generation: String(generation), revision: ++revision, started });
      listener?.(current);
      if (currentFrame) describe(currentFrame);
    },
    reset() { generation++; started.clear(); stage.point(undefined); },
    select(key) {
      const activity = activities.get(key);
      if (!activity) { stage.point(undefined); return; }
      const kind = officeKind(activity);
      stage.point(kind === 'research' || kind === 'memory' ? 'library' : 'code');
    },
    setPaused(paused) { stage.setPaused(paused); },
    dispose() { stage.dispose(); },
  };
}
