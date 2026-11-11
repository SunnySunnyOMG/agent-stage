export const size = { width: 680, height: 520 };

export const stations = {
  board:    { x:  61, y:  93, label: 'To-do board',   color: '#b9763d' },
  library:  { x: 166, y:  93, label: 'Reading table', color: '#876342' },
  shelf:    { x: 277, y:  93, label: 'Memory shelf',  color: '#6c7950' },
  browser:  { x: 397, y:  93, label: 'Web terminal',  color: '#427685' },
  meeting:  { x:  74, y: 217, label: 'Meeting table', color: '#826294' },
  desk:     { x: 207, y: 217, label: 'Work desk',      color: '#427d6a' },
  terminal: { x: 341, y: 217, label: 'Code bench',     color: '#48705e' },
  phone:    { x:  54, y: 335, label: 'Telephone',     color: '#ba704b' },
  handoff:  { x: 164, y: 335, label: 'Handoff tray',  color: '#93654d' },
  review:   { x: 278, y: 335, label: 'Review table',  color: '#457c85' },
  coffee:   { x: 399, y: 335, label: 'Coffee corner', color: '#a45a48' },
  sofa:     { x: 286, y: 426, label: 'Sofa',          color: '#9277a0' },
};

const palettes = {
  wood: ['#be8c5f', '#906446', '#a67450'],
  light: ['#f4dbaa', '#bf9b71', '#d4ae82'],
  mint: ['#9fc8ac', '#567968', '#729d86'],
  ink: ['#455557', '#28383c', '#34484a'],
  paper: ['#fff2d3', '#cab68b', '#e7d4a8'],
  violet: ['#bda6ce', '#79658b', '#977da7'],
  clay: ['#d4967e', '#9c6457', '#b97d65'],
  glass: ['#d7e8df', '#879e95', '#a6c4b7'],
  gold: ['#ffdb79', '#b77b3e', '#d5a254'],
};

// Fixed orthographic camera. Equal world distances project equally at every depth.
function project(x, y, z = 0) {
  return [size.width / 2 + (x - y) * 0.675, 111 + (x + y) * 0.383 - z * 0.89];
}

function painter(ctx) {
  function polygon(points, color) {
    ctx.beginPath();
    for (const [i, point] of points.entries()) {
      const [x, y] = project(...point);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }
  function box(x, y, z, w, d, h, colors) {
    const [top, front, side] = colors;
    const hi = z + h;
    polygon([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, hi], [x, y + d, hi]], front);
    polygon([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, hi], [x + w, y, hi]], side);
    polygon([[x, y, hi], [x + w, y, hi], [x + w, y + d, hi], [x, y + d, hi]], top);
  }
  return { polygon, box };
}

function room(ctx, polygon, box) {
  ctx.fillStyle = '#f0e9db';
  ctx.fillRect(0, 0, size.width, size.height);
  ctx.fillStyle = '#b19e7c56';
  for (let y = 17; y < size.height; y += 13) {
    for (let x = 17; x < size.width; x += 13) ctx.fillRect(x, y, 1, 1);
  }
  polygon([[8, 12, -17], [468, 12, -17], [468, 471, -17], [8, 471, -17]], '#5f493e2c');
  box(0, 0, -12, 453, 453, 12, ['#e5c9a0', '#9f7458', '#bd916d']);
  for (let y = 0; y < 450; y += 30) {
    for (let x = 0; x < 450; x += 90) {
      const shade = ['#f0d9af', '#ead1a7', '#f2dcb7', '#efd7ae'][(y / 30 + x / 45) % 4];
      const offset = y % 60 ? 0 : 11;
      polygon([[x + offset, y, 0], [x + 88, y, 0], [x + 88, y + 29, 0], [x + offset, y + 29, 0]], shade);
    }
  }
  box(0, 0, 0, 453, 8, 78, ['#fff5da', '#d0a881', '#b88d6f']);
  box(0, 8, 0, 8, 445, 78, ['#fff5da', '#bd9679', '#e4c5a3']);
  for (const x of [38, 162, 286, 410]) box(x, 6, 0, 6, 6, 74, palettes.light);
  for (const y of [37, 159, 281, 403]) box(6, y, 0, 6, 6, 74, palettes.light);
  for (const x of [114, 248, 369]) {
    box(x, 8, 32, 57, 3, 35, palettes.ink);
    box(x + 4, 11, 36, 49, 2, 27, palettes.glass);
    box(x + 27, 14, 35, 3, 1, 29, palettes.paper);
  }
  for (const y of [96, 225, 354]) {
    box(8, y, 33, 3, 55, 35, palettes.ink);
    box(11, y + 4, 37, 2, 47, 27, palettes.glass);
  }
}

function furniture(key, box, frame) {
  const { x, y } = stations[key];
  const block = (a, b, z, w, d, h, material) => box(x + a, y + b, z, w, d, h, palettes[material]);
  const inUse = frame.station === key && !frame.walking;
  const phase = Math.sin(frame.time / 195);
  const desk = (w = 61, material = 'wood') => {
    block(-w / 2 + 3, -53, 0, 6, 26, 26, material);
    block(w / 2 - 9, -53, 0, 6, 26, 26, material);
    block(-w / 2, -55, 25, w, 33, 5, material);
  };
  const screen = (offset = -19, w = 38, color = 'mint') => {
    block(offset + 10, -45, 30, 13, 9, 9, 'ink');
    block(offset, -49, 37, w, 5, 24, 'ink');
    block(offset + 3, -44, 41, w - 6, 1, 16, color);
  };
  const paper = (offset = -13) => block(offset, -35, 30, 24, 12, 2, 'paper');

  switch (key) {
    case 'board':
      block(-32, -54, 0, 6, 8, 57, 'wood');
      block(24, -54, 0, 6, 8, 57, 'wood');
      block(-37, -53, 32, 74, 6, 43, 'wood');
      block(-33, -47, 36, 66, 2, 35, 'paper');
      for (const [a, mat] of [[-26, 'gold'], [-7, 'mint'], [12, 'clay']]) {
        block(a, -44, 53, 11, 2, 10, mat);
        block(a, -44, 40, 10, 2, 8, mat);
      }
      if (inUse) block(27, -42 + Math.max(0, phase) * 10, 39, 9, 2, 8, 'gold');
      break;
    case 'library':
      desk(68, 'light');
      paper(-22);
      paper(2);
      block(-26, -39, 31, 2, 18, 2, 'clay');
      block(0, -39, 31, 2, 18, 2, 'clay');
      if (inUse) block(3, -36, 33 + Math.max(0, phase) * 5, 19, 11, 1, 'paper');
      break;
    case 'shelf':
      block(-37, -53, 0, 74, 8, 66, 'wood');
      for (const z of [6, 28, 50]) {
        block(-38, -49, z, 76, 24, 5, 'wood');
        for (const [offset, color] of [[-30, 'clay'], [-17, 'mint'], [-3, 'paper'], [12, 'violet']]) {
          block(offset, -43, z + 5, 10, 13, 13, color);
        }
      }
      block(-38, -49, 68, 76, 24, 5, 'wood');
      if (inUse) block(23, -40 + (phase + 1) * 7, 33, 10, 13, 13, 'gold');
      break;
    case 'browser':
      desk(68, 'mint');
      screen(-26, 53, 'glass');
      block(-20, -43, 51, 41, 1, 2, 'ink');
      if (inUse) {
        for (const z of [43, 46, 49]) block(-19, -42, z, 21 + z % 4 * 4, 1, 1, 'mint');
        block(16, -41, 43 + (phase + 1) * 3, 3, 1, 3, 'gold');
      }
      block(-17, -34, 30, 34, 9, 2, 'ink');
      break;
    case 'meeting':
      desk(98, 'wood');
      for (const offset of [-32, -8, 16]) block(offset, -43, 30, 16, 12, 3, 'paper');
      block(-35, -17, 0, 19, 16, 15, 'violet');
      block(18, -17, 0, 19, 16, 15, 'violet');
      if (inUse) block(-8 + phase * 19, -34, 33, 15, 9, 2, 'gold');
      break;
    case 'desk':
      desk(81, 'wood');
      screen(-22, 43);
      block(-19, -35, 30, 36, 8, 2, 'ink');
      block(23, -38, 30, 10, 9, 7, 'paper');
      if (inUse) block(-17, -43, 46, 19 + phase * 5, 1, 2, 'glass');
      break;
    case 'terminal':
      desk(90, 'ink');
      screen(-36, 32, 'mint');
      screen(4, 32, 'glass');
      block(-23, -34, 30, 45, 7, 2, 'mint');
      if (inUse) block(8 + phase * 5, -43, 47, 12, 1, 2, 'ink');
      break;
    case 'phone':
      desk(56, 'clay');
      block(-16, -47, 30, 32, 18, 5, 'ink');
      block(-14, -46, inUse ? 45 + phase * 2 : 35, 28, 5, 5, 'clay');
      block(-13, -41, 35, 4, 7, 3, 'clay');
      block(9, -41, 35, 4, 7, 3, 'clay');
      break;
    case 'handoff':
      desk(65, 'light');
      block(-22, -46, 30, 44, 19, 3, 'ink');
      block(-17, -44, 33, 35, 14, 3, 'paper');
      block(24, -40, 30, 7, 8, 8, 'gold');
      if (inUse) block(-17, -43, 36 + Math.max(0, phase) * 5, 35, 14, 1, 'paper');
      break;
    case 'review':
      desk(65, 'mint');
      paper(-21);
      block(5, -45, 30, 19, 18, 3, 'ink');
      block(8, -43, 33, 13, 12, 2, 'glass');
      block(19, -29, 30, 7, 4, 3, 'ink');
      if (inUse) block(-18 + phase * 9, -33, 32, 12, 5, 2, 'glass');
      break;
    case 'coffee':
      desk(71, 'clay');
      block(-23, -49, 30, 38, 23, 21, 'ink');
      block(-19, -43, 51, 15, 13, 5, 'light');
      block(23, -38, 30, 10, 10, 8, 'paper');
      if (inUse) block(27, -34, 43 + (phase + 1) * 6, 3, 3, 4, 'glass');
      break;
    case 'sofa':
      block(-48, -54, 0, 96, 33, 16, 'violet');
      block(-48, -57, 16, 96, 11, 21, 'violet');
      block(-47, -46, 16, 12, 24, 11, 'violet');
      block(35, -46, 16, 12, 24, 11, 'violet');
      block(-31, -45, 16, 62, 22, 5, 'violet');
      block(9, -44, 21, 16, 17, 6, 'paper');
      break;
  }
}

const actionIcons = {
  board: '+', library: '…', shelf: '↓', browser: '↗', meeting: '…', desk: '···',
  terminal: '›_', phone: '☎', handoff: '!', review: '✓', coffee: '♨', sofa: 'z',
};

function agent(ctx, box, { x, y, station, walking, time, activity }) {
  const sleeping = station === 'sofa' && !walking;
  const actorY = sleeping ? y - 35 : y;
  const base = sleeping ? 23 : 0;
  const bob = walking ? Math.abs(Math.sin(time / 72)) * 4 : 0;
  const step = walking ? Math.sin(time / 72) * 4 : 0;
  const [sx, sy] = project(x, actorY);
  if (!sleeping) {
    ctx.fillStyle = '#4f382c45';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 3, 15, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    box(x - 7, actorY - 4 + step, bob, 5, 7, 6, palettes.ink);
    box(x + 3, actorY - 4 - step, bob, 5, 7, 6, palettes.ink);
  }
  box(x - 10, actorY - 8, base + 6 + bob, sleeping ? 27 : 20, 16, sleeping ? 12 : 20,
    station ? palettes.gold : palettes.paper);
  const [faceX, faceY] = project(x + 2, actorY + 9, base + 15 + bob);
  if (!sleeping) {
    ctx.fillStyle = '#37312a';
    ctx.fillRect(faceX - 6, faceY - 5, 2, 4);
    ctx.fillRect(faceX - 1, faceY - 3, 2, 4);
  }
  if (walking || !station) return;
  const [px, py] = project(x, actorY, sleeping ? 58 : 45);
  const pulse = Math.sin(time / 200) * 2;
  const icon = station === 'shelf' && activity?.kind === 'reuse' ? '↑' : actionIcons[station];
  ctx.fillStyle = '#fff6e4';
  ctx.beginPath();
  ctx.roundRect(px - 14, py - 14 + pulse, 28, 19, 6);
  ctx.fill();
  ctx.fillStyle = stations[station].color;
  ctx.font = '700 13px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(icon, px, py + pulse);
  ctx.textAlign = 'start';
}

export function drawStudio(ctx, frame) {
  const { polygon, box } = painter(ctx);
  room(ctx, polygon, box);
  const current = stations[frame.station];
  if (current) {
    const { x, y, color } = current;
    polygon([[x - 43, y - 57, 1], [x + 43, y - 57, 1], [x + 43, y + 19, 1], [x - 43, y + 19, 1]], color + '55');
  }
  const subjects = Object.entries(stations).map(([key, { x, y }]) => ({ depth: x + y - 26, key }));
  subjects.push({ depth: frame.x + frame.y, key: null });
  subjects.sort((a, b) => a.depth - b.depth);
  for (const { key } of subjects) {
    if (key) furniture(key, box, frame);
    else agent(ctx, box, frame);
  }
}
