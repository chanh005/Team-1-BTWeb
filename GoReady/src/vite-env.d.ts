/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Sheets link (edit/share or "Publish to web" CSV) holding the suggested tours. */
  readonly VITE_SUGGESTED_TOURS_URL?: string;
  /** Base path/URL that tour image filenames from the sheet are resolved against. */
  readonly VITE_TOUR_IMAGE_BASE?: string;
}
