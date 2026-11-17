/// <reference lib="deno.ns" />

import { join } from 'node:path';
import { errorResponse, GameDataApi } from './gameData.ts';

const contentTypes: Record<string, string> = {
  css: 'text/css; charset=utf-8',
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  png: 'image/png',
  svg: 'image/svg+xml',
  ttf: 'font/ttf',
  wasm: 'application/wasm',
};

self.onmessage = ({ data }: MessageEvent<{ distUrl: string }>) => {
  void serve(data).catch((error: unknown) => {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  });
};

async function serve({ distUrl: value }: { distUrl: string }) {
  const distUrl = new URL(value);
  const appDataDirectory = Deno.build.os === 'windows'
    ? Deno.env.get('APPDATA')
    : Deno.env.get('XDG_CONFIG_HOME') ?? (Deno.env.get('HOME') ? join(Deno.env.get('HOME')!, '.config') : undefined);
  if (!appDataDirectory) throw new Error('Could not locate the application data directory.');

  const gameDataApi = new GameDataApi(join(appDataDirectory, '7dtd-map', 'game-data.json'));
  await gameDataApi.initialize();

  Deno.serve(
    {
      hostname: '127.0.0.1',
      port: 37621,
      onListen: ({ port }) => self.postMessage({ type: 'ready', url: `http://127.0.0.1:${port}/` }),
    },
    async (request) => {
      const { pathname } = new URL(request.url);
      if (pathname.startsWith('/api/')) {
        try {
          return await gameDataApi.handle(request);
        } catch (error) {
          return errorResponse(error);
        }
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
      }

      let pathnameDecoded: string;
      try {
        pathnameDecoded = decodeURIComponent(pathname);
      } catch (error) {
        if (error instanceof URIError) return new Response('Bad Request', { status: 400 });
        throw error;
      }

      const pathSegments = pathnameDecoded.split('/');
      if (pathnameDecoded.includes('\\') || pathnameDecoded.includes('\0') || pathSegments.includes('..')) {
        return new Response('Bad Request', { status: 400 });
      }

      const relativePath = pathnameDecoded.replace(/^\/+/, '') || 'index.html';
      const fileUrl = new URL(relativePath, distUrl);
      if (!fileUrl.href.startsWith(distUrl.href)) {
        return new Response('Bad Request', { status: 400 });
      }

      let file: Awaited<ReturnType<typeof Deno.readFile>>;
      try {
        file = await Deno.readFile(fileUrl);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) return new Response('Not Found', { status: 404 });
        throw error;
      }

      const extension = fileUrl.pathname.split('.').pop()?.toLowerCase() ?? '';
      const headers = { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream' };
      return new Response(request.method === 'HEAD' ? null : file, { headers });
    },
  );
}
