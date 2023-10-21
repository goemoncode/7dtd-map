/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module 'pngjs/browser' {
  export * from 'pngjs';
}

interface ImportMetaEnv {
  readonly VITE_PREFABS_URL: string
  readonly VITE_WORLDS_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
