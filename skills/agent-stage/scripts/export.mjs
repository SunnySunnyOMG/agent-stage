#!/usr/bin/env node
import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

export async function exportViewer(output) {
  const destination = resolve(output);
  await mkdir(destination, { recursive: false });
  const source = fileURLToPath(new URL('../assets/viewer/', import.meta.url));
  for (const entry of await readdir(source)) await cp(resolve(source, entry), resolve(destination, entry), { recursive: true, errorOnExist: true, force: false });
  return destination;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { out: { type: 'string', default: './agent-stage-web' } } });
    const directory = await exportViewer(values.out);
    console.log(`Exported: ${directory}`);
    console.log('Deploy this directory to a static host. Replay/import work; live observation needs an event bridge.');
  } catch (error) { console.error(error.code === 'EEXIST' ? 'Output already exists. Choose a new directory; existing files were preserved.' : error.message); process.exitCode = 1; }
}
