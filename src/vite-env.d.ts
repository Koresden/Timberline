/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// Build date frozen in at build time via Vite `define` (DB-5). Used by the
// unobtrusive footer stamp so a user can tell which build's safety logic they
// hold while offline. Format: 'YYYY-MM-DD' (UTC).
declare const __BUILD_DATE__: string;
