/// <reference types="vite/client" />

/**
 * Build-time configuration surface.
 *
 * Only non-secret values belong here: anything in `import.meta.env` is inlined
 * into the shipped bundle and is therefore public. App secrets, private keys
 * and server credentials must never appear here or in any `.env` read by the
 * client build.
 */
interface ImportMetaEnv {
  /** Base URL for audio assets (object storage / CDN). */
  readonly VITE_LINGOZA_AUDIO_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
