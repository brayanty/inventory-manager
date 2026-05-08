/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_BACKEND_PORT: number;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}