/// <reference lib="deno.ns" />

interface ViteDevServer {
  process: Deno.ChildProcess;
  url: string;
}

export async function startViteDevServer(port = 5173): Promise<ViteDevServer> {
  const reservation = Deno.listen({ transport: 'tcp', hostname: '127.0.0.1', port });
  reservation.close();
  const url = `http://127.0.0.1:${port}/index.html`;
  const projectDirectory = await Deno.realPath(new URL('../../', import.meta.url));
  const process = new Deno.Command(Deno.execPath(), {
    args: [
      'run',
      '-A',
      '--node-modules-dir=auto',
      'npm:vite',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
      '--mode',
      'desktop-debug',
    ],
    cwd: projectDirectory,
    stdin: 'null',
    stdout: 'inherit',
    stderr: 'inherit',
  }).spawn();
  const processStatus = process.status;

  try {
    for (let attempt = 0; attempt < 100; attempt++) {
      const exited = await Promise.race([
        processStatus.then((status) => status),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 100)),
      ]);
      if (exited) throw new Error(`The Vite development server exited with code ${exited.code}.`);

      try {
        const response = await fetch(url);
        if (response.ok) return { process, url };
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
      }
    }
    throw new Error('Timed out while starting the Vite development server.');
  } catch (error) {
    try {
      process.kill();
    } catch (killError) {
      if (!(killError instanceof Deno.errors.NotFound)) {
        console.error('Could not stop the Vite development server after startup failed.', killError);
      }
    }
    await processStatus;
    throw error;
  }
}

export async function stopViteDevServer(process: Deno.ChildProcess): Promise<void> {
  try {
    process.kill();
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  await process.status;
}
