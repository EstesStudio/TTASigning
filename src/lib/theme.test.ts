import assert from "node:assert/strict";
import test from "node:test";

import {
  parseThemePreference,
  readThemePreference,
  setThemePreference,
  THEME_SCRIPT,
  THEME_STORAGE_KEY,
} from "./theme.ts";

test("only light and dark are kept; anything else follows the system", () => {
  assert.equal(parseThemePreference("light"), "light");
  assert.equal(parseThemePreference("dark"), "dark");

  for (const value of [null, undefined, "", "system", "Dark", "blue", 1]) {
    assert.equal(parseThemePreference(value), "system", String(value));
  }
});

test("the head script sets a stored theme and nothing else", () => {
  function run(stored: string | null, throws = false) {
    const attributes = new Map<string, string>();
    const sandbox = {
      document: {
        documentElement: {
          setAttribute: (name: string, value: string) =>
            attributes.set(name, value),
        },
      },
      localStorage: {
        getItem: (key: string) => {
          if (throws) {
            throw new Error("blocked");
          }

          return key === THEME_STORAGE_KEY ? stored : null;
        },
      },
    };

    new Function("document", "localStorage", THEME_SCRIPT)(
      sandbox.document,
      sandbox.localStorage,
    );

    return attributes.get("data-theme") ?? null;
  }

  assert.equal(run("dark"), "dark");
  assert.equal(run("light"), "light");
  assert.equal(run(null), null);
  assert.equal(run('"><script>'), null);
  assert.equal(run("dark", true), null);
});

test("a pick shows in the menu even when the browser blocks storage", () => {
  const attributes = new Map<string, string>();
  const blocked = () => {
    throw new Error("blocked");
  };
  const globals = globalThis as Record<string, unknown>;
  const saved = { document: globals.document, window: globals.window };

  globals.document = {
    documentElement: {
      getAttribute: (name: string) => attributes.get(name) ?? null,
      removeAttribute: (name: string) => attributes.delete(name),
      setAttribute: (name: string, value: string) =>
        attributes.set(name, value),
    },
  };
  globals.window = {
    localStorage: {
      getItem: blocked,
      removeItem: blocked,
      setItem: blocked,
    },
  };

  try {
    assert.equal(readThemePreference(), "system");

    setThemePreference("dark");
    assert.equal(attributes.get("data-theme"), "dark");
    assert.equal(readThemePreference(), "dark");

    setThemePreference("system");
    assert.equal(attributes.has("data-theme"), false);
    assert.equal(readThemePreference(), "system");
  } finally {
    globals.document = saved.document;
    globals.window = saved.window;
  }
});
