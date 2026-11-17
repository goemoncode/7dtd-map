/// <reference lib="deno.ns" />

Deno.env.set('7DTD_MAP_DEBUG', '1');
Deno.env.set('7DTD_MAP_HMR', '1');
await import('./main.ts');
