// GoReady/src/services/suggestedTours.ts is shared with the backend seed script and reads
// `import.meta.env` (a Vite feature). This shim only satisfies the type checker; at runtime
// under tsx `import.meta.env` is undefined and that module falls back to defaults.
interface ImportMetaEnv {
  readonly BASE_URL?: string;
  readonly VITE_SUGGESTED_TOURS_URL?: string;
  readonly VITE_TOUR_IMAGE_BASE?: string;
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
