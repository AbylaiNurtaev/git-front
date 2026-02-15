/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** URL сайта для QR (на Vercel задать в Environment Variables) */
  readonly VITE_APP_PUBLIC_URL: string;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
