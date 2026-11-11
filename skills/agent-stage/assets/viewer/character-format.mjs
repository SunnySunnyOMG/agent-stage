export const maxCharacterBytes = 32 * 1024;

const required = ['idle', 'back', 'walkA', 'walkB', 'work', 'read', 'sleep'];
const optional = ['blink', 'work2', 'post', 'phone', 'tea'];
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function sprite(name, rows, palette) {
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > 24 ||
      rows.some(row => typeof row !== 'string' || !row.length || row.length > 30 || row.length !== rows[0].length)) {
    throw new Error(`Pose "${name}" needs a rectangular grid up to 30 × 24.`);
  }
  const pixels = rows.join('');
  if (!pixels.replaceAll('.', '').length || [...pixels].some(key => key !== '.' && !Object.hasOwn(palette, key))) {
    throw new Error(`Pose "${name}" needs visible pixels and can only use palette keys or ".".`);
  }
  return { w: rows[0].length, h: rows.length, rows: [...rows] };
}

export function parseCharacter(text) {
  if (new TextEncoder().encode(text).length > maxCharacterBytes) throw new Error('Choose a character file under 32 KiB.');
  const input = JSON.parse(text);
  if (!object(input) || input.version !== 1 || typeof input.name !== 'string' ||
      !input.name.trim() || input.name.trim().length > 40 || /[\u0000-\u001f\u007f]/.test(input.name)) {
    throw new Error('Set version to 1 and give the character a display name of 1–40 characters.');
  }
  if (!object(input.palette) || !Object.keys(input.palette).length || Object.keys(input.palette).length > 24 ||
      Object.entries(input.palette).some(([key, color]) => !/^[a-zA-Z0-9]$/.test(key) ||
        typeof color !== 'string' || !/^#[0-9a-f]{6}$/i.test(color))) {
    throw new Error('Use 1–24 single-letter or digit palette keys with six-digit hex colors.');
  }
  if (!object(input.poses) || Object.keys(input.poses).some(name => !required.includes(name) && !optional.includes(name))) {
    throw new Error('Use the pose names listed in the character guide.');
  }
  const poses = {};
  for (const name of required) poses[name] = sprite(name, input.poses[name], input.palette);
  for (const name of optional) {
    if (Object.hasOwn(input.poses, name)) poses[name] = sprite(name, input.poses[name], input.palette);
  }
  return {
    key: 'local-custom',
    name: input.name.trim(),
    pal: { ...input.palette },
    k: 2,
    poses: {
      ...poses, type: poses.work, type2: poses.work2 ?? poses.work, turn: poses.work,
      post: poses.post ?? poses.back, phone: poses.phone ?? poses.idle, tea: poses.tea ?? poses.idle,
    },
    anim: {
      idle: poses.blink ? ['idle', 'idle', 'idle', 'blink'] : ['idle'],
      walk: ['walkA', 'walkB'],
      type: ['type', 'type2'],
      turn: ['type', 'type2'],
      read: ['read'],
      sleep: ['sleep'],
      tea: ['tea'],
      phone: ['phone'],
    },
  };
}
