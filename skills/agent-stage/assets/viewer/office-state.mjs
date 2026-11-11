const activePhases = { working: 'working', 'needs-user': 'needs-user' };

export const activityKey = activity => JSON.stringify([activity.run, activity.activity]);

export function officeKind(activity) {
  if (activity.intent === 'research') return 'research';
  if (activity.intent === 'computer') return 'code';
  return activity.kind === 'memory' ? 'memory' : 'code';
}

export function officeSnapshot(snapshot, { generation, revision, started }) {
  const invisibleRuns = new Set(snapshot.runs.filter(run => run.availability === 'unavailable').map(run => run.id));
  const unavailable = snapshot.source?.available === false || !snapshot.runs.length ||
    invisibleRuns.size === snapshot.runs.length;
  const finishedRuns = new Set(snapshot.activities.filter(activity =>
    !activity.parent && activity.kind === 'task' &&
    ['done', 'failed', 'cancelled'].includes(activity.state)).map(activity => activity.run));
  const workingRuns = new Set(snapshot.activities.filter(activity => activePhases[activity.state]).map(activity => activity.run));
  const uncertain = snapshot.truncated || snapshot.dropped > 0 ||
    snapshot.runs.some(run => run.availability !== 'ready') ||
    snapshot.runs.some(run => !finishedRuns.has(run.id) && !workingRuns.has(run.id)) ||
    snapshot.activities.some(activity => ['unknown', 'waiting'].includes(activity.state));
  const availability = unavailable ? 'unavailable' : uncertain ? 'partial' : 'ready';
  const active = [];
  for (const activity of snapshot.activities) {
    const phase = activePhases[activity.state];
    if (!phase || unavailable || invisibleRuns.has(activity.run)) continue;
    const id = activityKey(activity);
    if (!started.has(id)) started.set(id, activity.at);
    active.push({
      id, kind: officeKind(activity), phase, summary: activity.label,
      importance: activity.intent === 'research' ? 'high' : 'normal',
      startedAt: started.get(id), updatedAt: activity.at,
    });
  }
  const observedAt = snapshot.runs.reduce((latest, run) =>
    Date.parse(run.at) > Date.parse(latest) ? run.at : latest, '1970-01-01T00:00:00.000Z');
  return { schemaVersion: 1, generation, revision, observedAt, availability, activities: active, recent: [] };
}
