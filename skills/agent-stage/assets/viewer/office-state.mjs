export const activityKey = activity => JSON.stringify([activity.run, activity.activity]);

const intentStations = {
  research: 'library',
  computer: 'desk',
  web: 'browser',
  planning: 'board',
  code: 'terminal',
  delegation: 'meeting',
  communication: 'phone',
};

export function officeStation(activity) {
  if (activity.state === 'needs-user') return 'handoff';
  if (activity.kind === 'memory' || activity.kind === 'reuse') return 'shelf';
  if (activity.kind === 'verification') return 'review';
  return intentStations[activity.intent] ?? 'desk';
}

const terminalStates = new Set(['done', 'failed', 'cancelled']);

export function officeSnapshot(snapshot, previous) {
  const visibleRuns = snapshot.runs.filter(run => run.availability !== 'unavailable');
  if (snapshot.source?.available === false || !visibleRuns.length) {
    return { station: null, focus: null, availability: 'unavailable' };
  }
  const visibleIds = new Set(visibleRuns.map(run => run.id));
  const activities = snapshot.activities.filter(activity => visibleIds.has(activity.run));
  const active = activities.filter(activity => activity.state === 'working' || activity.state === 'needs-user');
  const recentFirst = (a, b) => Date.parse(b.at) - Date.parse(a.at) ||
    (a.run === b.run ? b.seq - a.seq : a.run.localeCompare(b.run)) ||
    activityKey(a).localeCompare(activityKey(b));
  const specific = activity => officeStation(activity) !== 'desk';
  const focus = active.sort((a, b) => Number(b.state === 'needs-user') - Number(a.state === 'needs-user') ||
    Number(specific(b)) - Number(specific(a)) || recentFirst(a, b))[0] ?? null;
  const knownRuns = new Set(active.map(activity => activity.run));
  for (const activity of activities) {
    if (!activity.parent && activity.kind === 'task' && terminalStates.has(activity.state)) knownRuns.add(activity.run);
  }
  const uncertain = snapshot.truncated || snapshot.dropped > 0 ||
    snapshot.runs.some(run => run.availability !== 'ready' || !knownRuns.has(run.id)) ||
    activities.some(activity => activity.state === 'unknown' || activity.state === 'waiting');
  const availableBefore = previous && previous.source?.available !== false;
  const before = new Map(availableBefore ? previous.activities.map(activity => [activityKey(activity), activity.seq]) : []);
  const previouslyReady = new Set(availableBefore ? previous.runs.filter(run => run.availability === 'ready').map(run => run.id) : []);
  const newlyDone = activities.filter(activity => previouslyReady.has(activity.run) && activity.state === 'done' &&
    specific(activity) && activity.seq > (before.get(activityKey(activity)) ?? -1)).sort(recentFirst)[0] ?? null;
  return {
    station: focus ? officeStation(focus) : uncertain ? null : 'coffee',
    focus,
    newlyDone,
    availability: uncertain ? 'partial' : 'ready',
  };
}
