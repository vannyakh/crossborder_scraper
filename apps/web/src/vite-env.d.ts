/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PANEL_ENTRY_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg?raw' {
  const content: string
  export default content
}
