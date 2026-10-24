// The colour theme. Dark is the default for every visitor (owner, 2026-10-24: the site was light-first); a visitor who picks light
// with the header's toggle (components/ThemeToggle.tsx) keeps it, in their own browser only (localStorage "dex-theme").
//
// Why the client decides, not the server: every page is one CDN-cached copy that reads no cookie or header (as lib/season.ts).
// THEME_BOOT_SCRIPT runs in <head> before first paint and stamps data-theme="light" on <html> only for a saved light choice, so a
// light visitor never sees a dark flash, and a page without JavaScript is dark (globals.css: dark unless data-theme="light").
// The observer keeps the attribute through a failed hydration, which resets <html>'s attributes to React's props.

export const THEME_KEY = "dex-theme";
export type Theme = "light" | "dark";
export const THEME_COLOR: Record<Theme, string> = { light: "#ffffff", dark: "#17181d" };

/** The theme a saved value asks for: light only when "light" was saved; anything else (nothing, junk) is dark. */
export function themeFromSaved(saved: string | null | undefined): Theme {
  return saved === "light" ? "light" : "dark";
}

// Inline, dependency-free, never throws (storage blocked: dark).
export const THEME_BOOT_SCRIPT = `(function(){try{var t=null;try{t=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}if(t!=="light")return;var e=document.documentElement;e.setAttribute("data-theme","light");if(typeof MutationObserver=="function")new MutationObserver(function(){var w=window.__dexTheme||"light";if(e.getAttribute("data-theme")!==w&&w==="light")e.setAttribute("data-theme",w)}).observe(e,{attributes:true,attributeFilter:["data-theme"]})}catch(e){}})();`;
