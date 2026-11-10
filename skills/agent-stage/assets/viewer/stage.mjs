import { KINDS, direct } from './core.mjs';

const names = ['Tasks', 'Agents', 'Tools', 'Checks', 'Memory', 'Reuse'];
const tones = { working: '#d4ff79', waiting: '#adb7a9', 'needs-user': '#f7cd74', done: '#70d5bf', failed: '#ff927e', cancelled: '#77857b', unknown: '#77857b' };
const identity = a => JSON.stringify([a.run, a.activity]);

// A source-independent presentation stage. It consumes snapshots, never commands.
export function mountStage(canvas, onFocus) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable; use the activity list.');
  let snapshot = { activities: [], edges: [], runs: [] }, width = 600, height = 600, frame, disposed = false, selected = null;
  const changes = new Map(), media = matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocus = '';
  const resize = new ResizeObserver(entries => {
    const box = entries[0].contentRect;
    width = box.width; height = box.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (media.matches) draw(performance.now());
  });
  resize.observe(canvas);

  const point = (index, spread = 0) => {
    const angle = -Math.PI / 2 + index * Math.PI / 3 + spread;
    return { x: width / 2 + Math.cos(angle) * width * .35, y: height / 2 + Math.sin(angle) * height * .36 };
  };
  const circle = (p, r, color) => { ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); };
  function draw(now) {
    ctx.clearRect(0, 0, width, height);
    const cx = width / 2, cy = height / 2, size = Math.min(width, height), active = snapshot.activities;
    const chosen = selected ? active.find(a => identity(a) === selected) : null;
    const focus = chosen ?? direct(snapshot, now).focus;
    const focusKey = focus ? `${identity(focus)}:${focus.id}` : '';
    if (focusKey !== lastFocus) { lastFocus = focusKey; onFocus(focus); }
    ctx.strokeStyle = '#2c4031'; ctx.lineWidth = 1; ctx.setLineDash([2, 8]);
    ctx.beginPath(); ctx.ellipse(cx, cy, width * .35, height * .36, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(cx, cy, size * .215, 0, Math.PI * 2); ctx.strokeStyle = '#294031'; ctx.stroke();
    const positions = new Map();
    KINDS.forEach((kind, index) => {
      const members = active.filter(a => a.kind === kind), p = point(index);
      const lit = members.some(a => ['working', 'needs-user'].includes(a.state));
      circle(p, 28, lit ? '#263d24' : '#15231a');
      ctx.beginPath(); ctx.arc(p.x, p.y, 28, 0, Math.PI * 2); ctx.strokeStyle = lit ? '#9fc952' : '#38533f'; ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = members.length ? '#edf3e7' : '#91a395';
      ctx.font = `500 ${width < 450 ? 12 : 14}px system-ui`; ctx.fillText(names[index], p.x, p.y + 5);
      ctx.font = '11px system-ui'; ctx.fillStyle = '#91a395'; ctx.fillText(members.length ? `${members.length} recorded` : 'Not reported', p.x, p.y + 48);
      members.forEach((a, j) => {
        const offset = (j - (members.length - 1) / 2) * .105;
        const pin = point(index, offset);
        pin.x += (pin.x - cx) * .14; pin.y += (pin.y - cy) * .14;
        positions.set(identity(a), pin);
      });
    });
    for (const edge of snapshot.edges) {
      const from = positions.get(JSON.stringify([edge.run, edge.from])), to = positions.get(JSON.stringify([edge.run, edge.to]));
      if (!from || !to) continue;
      ctx.beginPath(); ctx.moveTo(from.x, from.y);
      ctx.quadraticCurveTo(cx, cy, to.x, to.y); ctx.strokeStyle = '#53745a'; ctx.lineWidth = 1; ctx.stroke();
      const target = active.find(a => a.run === edge.run && a.activity === edge.to);
      if (target && target.state === 'working' && !media.matches) {
        const t = (now % 2400) / 2400, inv = 1 - t;
        circle({ x: inv * inv * from.x + 2 * inv * t * cx + t * t * to.x, y: inv * inv * from.y + 2 * inv * t * cy + t * t * to.y }, 3, '#d4ff79');
      }
    }
    ctx.beginPath(); ctx.arc(cx, cy, size * .215, 0, Math.PI * 2); ctx.fillStyle = '#101713'; ctx.fill(); ctx.strokeStyle = '#294031'; ctx.stroke();
    for (const a of active) {
      const p = positions.get(identity(a)), color = tones[a.state];
      circle(p, focus && identity(a) === identity(focus) ? 6 : 4, color);
      const changedAt = changes.get(identity(a))?.at ?? -Infinity, age = now - changedAt;
      if (age >= 0 && age < 1600 && !media.matches) {
        ctx.globalAlpha = 1 - age / 1600;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6 + age / 90, 0, Math.PI * 2); ctx.strokeStyle = color; ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
  }
  function tick(now) { if (disposed) return; draw(now); frame = requestAnimationFrame(tick); }
  frame = requestAnimationFrame(tick);
  return {
    accept(next) {
      const now = performance.now();
      for (const a of next.activities) if (changes.get(identity(a))?.id !== a.id) changes.set(identity(a), { id: a.id, at: now });
      snapshot = next;
      if (media.matches) draw(now);
    },
    select(key) { selected = key; draw(performance.now()); },
    dispose() { disposed = true; cancelAnimationFrame(frame); resize.disconnect(); }
  };
}
