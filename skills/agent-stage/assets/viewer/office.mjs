import { drawStudio, size, stations } from './office-art.mjs';
import { officeSnapshot, officeStation } from './office-state.mjs';

export function mountOffice(canvas) {
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  const caption = document.getElementById('office-location');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const home = { x: 159, y: 420 };
  let position = { ...home }, previous, projection, cue, frame, paused = false;
  let time = 0, lastFrame, coffeeSince, destination = null, displayed = '';

  function describe(station, activity) {
    const status = station ? stations[station].label : projection?.availability === 'partial' ? 'Activity incomplete' : 'Awaiting activity data';
    const label = activity ? `${status} · ${activity.label} · ${activity.state} · ${activity.origin}` : status;
    if (label === displayed) return;
    caption.textContent = label;
    caption.dataset.station = station ?? '';
    displayed = label;
  }

  function paint(now) {
    const delta = paused || lastFrame === undefined ? 0 : Math.min(now - lastFrame, 50);
    time += delta;
    lastFrame = now;
    if (cue?.arrivedAt !== undefined && time - cue.arrivedAt >= 1250) cue = null;
    const activity = cue?.activity ?? projection?.focus;
    let station = cue ? officeStation(cue.activity) : projection?.station;
    if (station === 'coffee' && coffeeSince !== undefined && time - coffeeSince >= 2600) station = 'sofa';
    destination = station ?? null;
    const target = stations[destination];
    let walking = false;
    if (target) {
      const dx = target.x - position.x, dy = target.y - position.y;
      const distance = Math.hypot(dx, dy);
      const step = delta * 0.35;
      walking = !reducedMotion.matches && distance > Math.max(step, 0.5);
      if (walking) {
        position.x += dx * step / distance;
        position.y += dy * step / distance;
      } else {
        position = { x: target.x, y: target.y };
        if (cue && cue.arrivedAt === undefined) cue.arrivedAt = time;
        if (destination === 'coffee' && coffeeSince === undefined) coffeeSince = time;
      }
    }
    describe(destination, activity);
    drawStudio(ctx, { ...position, station: destination, walking, time: reducedMotion.matches ? 0 : time, activity });
    frame = requestAnimationFrame(paint);
  }
  frame = requestAnimationFrame(paint);

  return {
    accept(snapshot) {
      projection = officeSnapshot(snapshot, previous);
      previous = snapshot;
      const focus = projection.focus;
      if (projection.availability === 'unavailable' || (focus && officeStation(focus) !== 'desk')) cue = null;
      if (projection.newlyDone && (!focus || officeStation(focus) === 'desk')) {
        cue = { activity: projection.newlyDone };
      }
      if (projection.station !== 'coffee') coffeeSince = undefined;
    },
    reset() {
      previous = projection = cue = coffeeSince = undefined;
      destination = null;
      position = { ...home };
    },
    setPaused(value) { paused = value; },
    dispose() { cancelAnimationFrame(frame); },
  };
}
