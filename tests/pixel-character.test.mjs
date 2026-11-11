import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { inspectPixelCatalog, pixelCharacters } from '../skills/agent-stage/assets/viewer/pixel-engine.mjs';
import { parseCharacter } from '../skills/agent-stage/assets/viewer/character-format.mjs';

const starter = new URL('../skills/agent-stage-character/assets/starter-character.json', import.meta.url);

test('the packaged renderer registers eight rooms and no personal skins or turn poses', () => {
  const { rooms, characters, turns } = inspectPixelCatalog();
  assert.deepEqual(rooms, ['zen', 'court', 'ubud', 'marrakech', 'venice', 'dali', 'alpine', 'santorini']);
  assert.deepEqual(pixelCharacters, ['kokeshi', 'neko', 'onigiri', 'paper']);
  assert.deepEqual(characters, pixelCharacters.map(name => 'fin-' + name));
  assert.deepEqual(turns, ['sprout', ...characters]);
});

test('the character Skill example supplies every runtime pose and rejects broken sprite data', async () => {
  const example = JSON.parse(await readFile(starter, 'utf8'));
  const character = parseCharacter(JSON.stringify(example));
  assert.equal(character.name, 'Amber Robot');
  assert.deepEqual(character.anim.walk, ['walkA', 'walkB']);
  assert.deepEqual(character.poses.turn.rows, example.poses.work);
  assert.deepEqual(character.poses.sleep.rows, example.poses.sleep);
  for (const poses of [
    { ...example.poses, sleep: undefined },
    { ...example.poses, walkA: ['ab', 'a'] },
    { ...example.poses, walkB: ['Z'] },
    { ...example.poses, read: ['...'] },
  ]) {
    assert.throws(() => parseCharacter(JSON.stringify({ ...example, poses })));
  }
  assert.throws(() => parseCharacter(JSON.stringify({ ...example, palette: { o: 'url(example)' } })));
});
