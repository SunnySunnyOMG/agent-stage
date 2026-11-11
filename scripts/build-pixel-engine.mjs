// Rebuild the checked-in browser engine from the approved upstream snapshot.
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const commit = '5247b24e51ba07926ad5fe4e4fcd7a3bf9ef36e2';
const builtIns = ['kokeshi', 'neko', 'onigiri', 'paper'];
const maps = ['santorini-props.webp', 'santorini-floor.webp', 'santorini-architecture.webp', 'santorini-wall-left.webp'];
const upstream = process.argv[2];
if (!upstream) throw new Error('Usage: node scripts/build-pixel-engine.mjs <AI Box checkout>');
const checkout = resolve(upstream);
const viewer = fileURLToPath(new URL('../skills/agent-stage/assets/viewer/', import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), 'agent-stage-pixel-'));
const root = join(scratch, 'packages/ori-office');
const src = join(root, 'src');
const zen = join(src, 'zen');
const kitPath = join(zen, 'zen-kit.generated.js');
try {
  const archive = execFileSync('git', ['-C', checkout, 'archive', commit, 'packages/ori-office/src', ...maps.map(name => 'packages/ori-office/assets/' + name)], { maxBuffer: 32 * 1024 * 1024 });
  execFileSync('tar', ['-xf', '-', '-C', scratch], { input: archive });
  const upstreamKit = await readFile(kitPath, 'utf8');
  const markers = [...upstreamKit.matchAll(/^  \/\/ ── ([\w-]+\.js)$/gm)];
  const rejected = new Set();
  let kit = upstreamKit.slice(0, markers[0].index);
  for (const [index, marker] of markers.entries()) {
    const [, filename] = marker;
    const actor = /^(?:turn|f)-([\w-]+)\.js$/.exec(filename)?.[1];
    if (actor && actor !== 'sprout' && !builtIns.includes(actor)) {
      rejected.add(actor);
      continue;
    }
    kit += upstreamKit.slice(marker.index, markers[index + 1]?.index);
  }
  if (rejected.size !== 20) throw new Error('Unexpected upstream character inventory');
  kit = kit.replaceAll('../../assets/santorini-', './pixel-assets/santorini-');
  await writeFile(kitPath, kit);

  const looksPath = join(zen, 'zen-looks.ts');
  const looks = await readFile(looksPath, 'utf8');
  await writeFile(looksPath, looks.replace(/export const zenLooks = \[[\s\S]*?\] as const;/, `export const zenLooks = ${JSON.stringify(builtIns)} as const;`));

  const stagePath = join(zen, 'zen-stage.ts');
  const stage = await readFile(stagePath, 'utf8');
  const original = 'character = characterFor(kit.characters, options.look);';
  if (!stage.includes(original)) throw new Error('Upstream character entry point changed');
  await writeFile(stagePath, stage.replace('  look: ZenLook;', '  look: ZenLook;\n  customCharacter?: ZenCharacter;').replace(original, `character = options.customCharacter ?? characterFor(kit.characters, options.look);
    if (options.customCharacter) kit.turns[character.key] = character.poses.turn.rows;`));

  const entry = join(scratch, 'entry.mjs');
  const bundlePath = join(scratch, 'pixel-engine.mjs');
  await writeFile(entry, `export { mountZenOffice as mountPixelStage, zenLooks as pixelCharacters, zenRooms as pixelRooms } from './packages/ori-office/src/zen/zen-stage.ts';
export { createDirector } from './packages/ori-office/src/director.ts';
import { createZenKit } from './packages/ori-office/src/zen/zen-kit.generated.js';
export function inspectPixelCatalog() {
  const kit = createZenKit();
  return { rooms: kit.rooms.map(room => room.key), characters: kit.characters.map(character => character.key), turns: Object.keys(kit.turns) };
}
`);
  execFileSync(join(checkout, 'node_modules/.bin/esbuild'), [entry, '--bundle', '--format=esm', '--platform=browser', '--legal-comments=none', '--outfile=' + bundlePath], { cwd: scratch });
  const bundle = (await readFile(bundlePath, 'utf8'))
    .replace(/^\/\/ (?:packages\/ori-office\/src\/\S+|entry\.mjs)\n/gm, '')
    .replace(/\bOri(?=[A-Z]|\b)/g, 'Agent')
    .replace(/\bORI(?=\b|_)/g, 'ACTOR')
    .replace(/\bori(?=\b|[A-Z])/g, 'actor');
  for (const actor of rejected) {
    if (bundle.includes('fin-' + actor) || bundle.includes('turn-' + actor + '.js')) {
      throw new Error('A personal character remains in the bundle');
    }
  }
  await writeFile(join(viewer, 'pixel-engine.mjs'), '// Agent Stage pixel renderer. Rebuild with scripts/build-pixel-engine.mjs.\n' + bundle);
  await mkdir(join(viewer, 'pixel-assets'), { recursive: true });
  for (const name of maps) await cp(join(root, 'assets', name), join(viewer, 'pixel-assets', name));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
