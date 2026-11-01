/// <reference lib="deno.ns" />

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
  const distUrl = new URL(data.distUrl);

  Deno.serve(
    {
      hostname: '127.0.0.1',
      port: 37621,
      onListen: ({ port }) => self.postMessage({ type: 'ready', url: `http://127.0.0.1:${port}/` }),
    },
    async (request) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
      }

      let pathname: string;
      try {
        pathname = decodeURIComponent(new URL(request.url).pathname);
      } catch (error) {
        if (error instanceof URIError) {
          return new Response('Bad Request', { status: 400 });
        }
        throw error;
      }

      const pathSegments = pathname.split('/');
      if (pathname.includes('\\') || pathname.includes('\0') || pathSegments.includes('..')) {
        return new Response('Bad Request', { status: 400 });
      }

      const relativePath = pathname.replace(/^\/+/, '') || 'index.html';
      const fileUrl = new URL(relativePath, distUrl);
      if (!fileUrl.href.startsWith(distUrl.href)) {
        return new Response('Bad Request', { status: 400 });
      }

      let file: Awaited<ReturnType<typeof Deno.readFile>>;
      try {
        file = await Deno.readFile(fileUrl);
      } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
          return new Response('Not Found', { status: 404 });
        }
        throw error;
      }

      const extension = fileUrl.pathname.split('.').pop()?.toLowerCase() ?? '';
      const headers = { 'Content-Type': contentTypes[extension] ?? 'application/octet-stream' };
      return new Response(request.method === 'HEAD' ? null : file, { headers });
    },
  );
};
