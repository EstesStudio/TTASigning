// Light, dark, or whatever the system is set to.
//
// The choice is kept in this browser only: it is about the screen in front
// of someone, not their account, and signers have no account. "system"
// stores nothing, so a new visitor follows the system. A picked theme is
// written to <html data-theme>, which globals.css reads; with no attribute
// the stylesheet follows prefers-color-scheme by itself.

export type ThemePreference = "dark" | "light" | "system";

export const THEME_STORAGE_KEY = "signudoc-theme";

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

/**
 * The theme the page is showing: what the head script or a pick put on
 * <html>. The menu reads this rather than storage, so it stays right when
 * the browser blocks storage and the pick lives only on the page.
 */
export function readThemePreference(): ThemePreference {
  return parseThemePreference(
    document.documentElement.getAttribute("data-theme"),
  );
}

function readStoredThemePreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;

  if (preference === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preference);
  }
}

/** Puts the stored choice back on <html>, as the head script does. */
export function applyStoredThemePreference() {
  applyThemePreference(readStoredThemePreference());
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
}

/** For useSyncExternalStore: any change to the theme on <html>. */
export function subscribeToThemePreference(onChange: () => void) {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributeFilter: ["data-theme"],
    attributes: true,
  });

  return () => observer.disconnect();
}

/** Applies a choice made in another tab. */
export function followStoredThemePreference() {
  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === THEME_STORAGE_KEY) {
      applyStoredThemePreference();
    }
  }

  window.addEventListener("storage", handleStorage);

  return () => window.removeEventListener("storage", handleStorage);
}
