import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  SignatureModeTabs,
  type SignatureMode,
} from "./signature-mode-tabs.ts";

type ParsedElement = {
  attributes: Record<string, string>;
  innerHtml: string;
  tag: string;
};

function parseAttributes(raw: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attrPattern = /([a-zA-Z0-9_-]+)(?:="([^"]*)")?/g;

  for (const match of raw.matchAll(attrPattern)) {
    const [, name, value] = match;
    attributes[name] = value ?? "";
  }

  return attributes;
}

function findElementsByRole(html: string, role: string): ParsedElement[] {
  const results: ParsedElement[] = [];
  const openTagPattern = /<(button|div)\b([^>]*)>/g;

  for (const match of html.matchAll(openTagPattern)) {
    const [fullMatch, tag, rawAttrs] = match;
    const attributes = parseAttributes(rawAttrs);

    if (attributes.role !== role) {
      continue;
    }

    const startIndex = (match.index ?? 0) + fullMatch.length;
    const tagPattern = new RegExp(`<(/?)${tag}\\b[^>]*>`, "g");
    tagPattern.lastIndex = startIndex;

    let depth = 1;
    let endIndex = html.length;

    for (const innerMatch of html.matchAll(tagPattern)) {
      if ((innerMatch.index ?? 0) < startIndex) {
        continue;
      }

      depth += innerMatch[1] === "/" ? -1 : 1;

      if (depth === 0) {
        endIndex = innerMatch.index ?? html.length;
        break;
      }
    }

    results.push({
      attributes,
      innerHtml: html.slice(startIndex, endIndex),
      tag,
    });
  }

  return results;
}

function renderSignatureTabs(mode: SignatureMode, fieldType = "signature") {
  return renderToStaticMarkup(
    createElement(SignatureModeTabs, {
      drawnPanel: createElement(
        "div",
        null,
        createElement("canvas", { "aria-label": "Draw signature canvas" }),
        createElement("button", { type: "button" }, "Clear"),
      ),
      mode,
      onModeChange: () => undefined,
      typedPanel: createElement("input", {
        id: `signature-modal-${fieldType}`,
        name: `signature-modal-${fieldType}`,
      }),
    }),
  );
}

test("Type mode links both Type and Draw tabs to existing tabpanels and exposes only Type content", () => {
  const html = renderSignatureTabs("typed");
  const tablists = findElementsByRole(html, "tablist");
  const tabs = findElementsByRole(html, "tab");
  const panels = findElementsByRole(html, "tabpanel");

  assert.equal(tablists.length, 1);
  assert.equal(tabs.length, 2);
  assert.equal(panels.length, 2);

  const panelsById = new Map(
    panels.map((panel) => [panel.attributes.id, panel] as const),
  );
  const tabsByLabel = new Map(
    tabs.map((tab) => [tab.innerHtml.trim(), tab] as const),
  );

  for (const tab of tabs) {
    const tabId = tab.attributes.id;
    const controlsId = tab.attributes["aria-controls"];

    assert.ok(tabId, "tab must have an id");
    assert.ok(controlsId, "tab must have aria-controls");

    const panel = panelsById.get(controlsId);

    assert.ok(
      panel,
      `tab "${tab.innerHtml.trim()}" aria-controls="${controlsId}" must resolve to a tabpanel`,
    );
    assert.equal(
      panel.attributes["aria-labelledby"],
      tabId,
      "tabpanel aria-labelledby must point back to its tab id",
    );
    assert.equal(
      "tabindex" in panel.attributes,
      false,
      "tabpanel should not add an extra Tab stop before focusable controls",
    );
  }

  const typeTab = tabsByLabel.get("Type")!;
  const drawTab = tabsByLabel.get("Draw")!;
  const typePanel = panelsById.get(typeTab.attributes["aria-controls"])!;
  const drawPanel = panelsById.get(drawTab.attributes["aria-controls"])!;

  assert.equal(typeTab.attributes["aria-selected"], "true");
  assert.equal(drawTab.attributes["aria-selected"], "false");
  assert.equal("hidden" in typePanel.attributes, false);
  assert.equal("hidden" in drawPanel.attributes, true);
  assert.match(typePanel.innerHtml, /id="signature-modal-signature"/);
  assert.doesNotMatch(typePanel.innerHtml, /Draw signature canvas/);
  assert.equal(drawPanel.innerHtml, "");
});

test("Draw mode switches selection and keeps every tab aria-controls target resolved", () => {
  const html = renderSignatureTabs("drawn");
  const tabs = findElementsByRole(html, "tab");
  const panels = findElementsByRole(html, "tabpanel");

  assert.equal(tabs.length, 2);
  assert.equal(panels.length, 2);

  const panelsById = new Map(
    panels.map((panel) => [panel.attributes.id, panel] as const),
  );
  const tabsByLabel = new Map(
    tabs.map((tab) => [tab.innerHtml.trim(), tab] as const),
  );
  const typeTab = tabsByLabel.get("Type")!;
  const drawTab = tabsByLabel.get("Draw")!;
  const typePanel = panelsById.get(typeTab.attributes["aria-controls"])!;
  const drawPanel = panelsById.get(drawTab.attributes["aria-controls"])!;

  assert.ok(typePanel);
  assert.ok(drawPanel);
  assert.equal(typePanel.attributes["aria-labelledby"], typeTab.attributes.id);
  assert.equal(drawPanel.attributes["aria-labelledby"], drawTab.attributes.id);
  assert.equal(typeTab.attributes["aria-selected"], "false");
  assert.equal(drawTab.attributes["aria-selected"], "true");
  assert.equal("hidden" in typePanel.attributes, true);
  assert.equal("hidden" in drawPanel.attributes, false);
  assert.equal(typePanel.innerHtml, "");
  assert.match(drawPanel.innerHtml, /aria-label="Draw signature canvas"/);
  assert.match(drawPanel.innerHtml, />Clear</);
});

test("initials dialog mode tabs keep valid tabpanel linkage", () => {
  const html = renderSignatureTabs("typed", "initials");
  const tabs = findElementsByRole(html, "tab");
  const panels = findElementsByRole(html, "tabpanel");

  assert.equal(tabs.length, 2);
  assert.equal(panels.length, 2);

  const panelsById = new Map(
    panels.map((panel) => [panel.attributes.id, panel] as const),
  );

  for (const tab of tabs) {
    const panel = panelsById.get(tab.attributes["aria-controls"]);
    assert.ok(panel);
    assert.equal(panel.attributes["aria-labelledby"], tab.attributes.id);
  }

  assert.match(html, /id="signature-modal-initials"/);
});

test("signing live shell wires SignatureModeTabs with TabsContent", async () => {
  const source = await readFile(
    new URL("./signing-live-shell.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s*\{[^}]*TabsContent[^}]*\}\s*from\s*"@\/components\/ui\/tabs"/,
  );
  assert.match(source, /<SignatureModeTabs\b/);
  assert.match(source, /Content:\s*TabsContent/);
});
