#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { bundleOffice } from './bundle-office.mjs';

export async function exportViewer(output, { oriSource } = {}) {
  const destination = resolve(output);
  const bundle = oriSource ? await bundleOffice(oriSource) : null;
  await mkdir(destination, { recursive: false });
  const source = fileURLToPath(new URL('../assets/viewer/', import.meta.url));
  for (const entry of await readdir(source)) await cp(resolve(source, entry), resolve(destination, entry), { recursive: true, errorOnExist: true, force: false });
  if (bundle) {
    await writeFile(resolve(destination, 'ori-engine.mjs'), bundle);
    const page = resolve(destination, 'index.html');
    const html = await readFile(page, 'utf8');
    await writeFile(page, html.replace('<html lang="en">', '<html lang="en" data-engine="ori">'));
    await cp(resolve(source, 'office-demo.jsonl'), resolve(destination, 'demo.jsonl'));
  }
  return destination;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { values } = parseArgs({ options: { out: { type: 'string', default: './agent-stage-web' }, 'ori-source': { type: 'string' } } });
    const directory = await exportViewer(values.out, { oriSource: values['ori-source'] });
    console.log(`Exported: ${directory}`);
    console.log(values['ori-source'] ? 'Ori office export includes the supplied AIBox engine and atlas.' : 'Replay/import work on a static host. Live observation needs an event bridge.');
  } catch (error) { console.error(error.code === 'EEXIST' ? 'Output already exists. Choose a new directory; existing files were preserved.' : error.message); process.exitCode = 1; }
}
