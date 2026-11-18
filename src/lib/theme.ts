// Light, dark, or whatever the system is set to.
//
// The choice is kept in this browser only: it is about the screen in front
// of someone, not their account, and signers have no account. "system"
// stores nothing, so a new visitor follows the system. A picked theme is
// written to <html data-theme>, which globals.css reads; with no attribute
// the stylesheet follows prefers-color-scheme by itself.

export type ThemePreference = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "signudoc-theme";

const THEME_CHANGE_EVENT = "signudoc-theme-change";

export function parseThemePreference(value: unknown): ThemePreference {
  return value === "light" || value === "dark" ? value : "system";
}

/**
 * Runs in <head> before the page paints, so a picked theme never flashes
 * the other one first. Kept small and free of anything that could throw
 * outside the try: storage can be blocked.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;

  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Blocked storage: the choice still holds until the page is left.
  }

  applyThemePreference(preference);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** For useSyncExternalStore: this tab's changes and other tabs'. */
export function subscribeToThemePreference(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      applyThemePreference(readThemePreference());
      onChange();
    }
  }

  window.addEventListener(THEME_CHANGE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}
