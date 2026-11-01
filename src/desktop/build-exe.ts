/// <reference lib="deno.ns" />

import { fileURLToPath } from 'node:url';

if (Deno.build.os !== 'windows' || Deno.build.arch !== 'x86_64') {
  throw new Error('The standalone desktop executable can only be built on Windows x86_64.');
}

const projectRoot = new URL('../../', import.meta.url);
const desktopDistUrl = new URL('dist-desktop/', projectRoot);
const nativeLibraryUrl = new URL('native/', desktopDistUrl);
const outputUrl = new URL('release/7dtd-map.exe', projectRoot);
const mainUrl = new URL('src/desktop/main.ts', projectRoot);

const config = JSON.parse(await Deno.readTextFile(new URL('deno.json', projectRoot))) as {
  imports: Record<string, string>;
};
const webviewSpecifier = config.imports['@webview/webview'];
const version = webviewSpecifier?.match(/^jsr:@webview\/webview@(\d+\.\d+\.\d+)$/)?.[1];
if (!version) {
  throw new Error('Could not determine the pinned @webview/webview version from deno.json.');
}

await Deno.mkdir(nativeLibraryUrl, { recursive: true });
await Promise.all(
  ['webview.dll', 'WebView2Loader.dll'].map(async (filename) => {
    const url = `https://github.com/webview/webview_deno/releases/download/${version}/${filename}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${filename} (${response.status} ${response.statusText}).`);
    }
    await Deno.writeFile(new URL(filename, nativeLibraryUrl), new Uint8Array(await response.arrayBuffer()));
  }),
);

await Deno.mkdir(new URL('release/', projectRoot), { recursive: true });
const compile = new Deno.Command(Deno.execPath(), {
  args: [
    'compile',
    '--allow-all',
    '--no-terminal',
    '--unstable-ffi',
    '--self-extracting',
    '--app-name',
    '7dtd-map',
    '--include',
    fileURLToPath(desktopDistUrl),
    '--include',
    fileURLToPath(new URL('src/desktop/server.worker.ts', projectRoot)),
    '--output',
    fileURLToPath(outputUrl),
    fileURLToPath(mainUrl),
  ],
  cwd: fileURLToPath(projectRoot),
  stdout: 'inherit',
  stderr: 'inherit',
});
const result = await compile.output();
if (!result.success) {
  throw new Error(`Deno compile failed with exit code ${result.code}.`);
}

console.log(`Created ${fileURLToPath(outputUrl)}`);
