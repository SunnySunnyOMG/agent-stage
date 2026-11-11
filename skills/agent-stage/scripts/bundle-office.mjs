import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export async function bundleOffice(aiboxSource) {
  const source = resolve(aiboxSource);
  const directory = await mkdtemp(join(tmpdir(), 'agent-stage-office-'));
  const entry = join(directory, 'entry.mjs');
  const output = join(directory, 'ori-engine.mjs');
  const office = file => JSON.stringify(join(source, 'packages/ori-office/src', file));
  try {
    await writeFile(entry, [
      `export { mountOriOffice } from ${office('stage.ts')};`,
      `export { createDirector } from ${office('director.ts')};`,
      `export { officeAtlas } from ${office('atlas.ts')};`,
    ].join('\n'));
    await exec(join(source, 'node_modules/.bin/esbuild'), [entry, '--bundle', '--platform=browser', '--format=esm', '--loader:.png=dataurl', `--outfile=${output}`]);
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
