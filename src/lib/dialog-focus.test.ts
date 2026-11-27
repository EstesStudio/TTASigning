import assert from "node:assert/strict";
import { test } from "node:test";

import {
  captureDialogReturnFocusTarget,
  restoreDialogReturnFocus,
  shouldRestoreDialogReturnFocus,
  type DialogCloseFocusEvent,
  type FocusableElement,
} from "./dialog-focus.ts";

function makeElement(
  overrides: Partial<FocusableElement> = {},
): FocusableElement & { focusCalls: number } {
  const element = {
    disabled: false,
    focus() {
      element.focusCalls += 1;
    },
    focusCalls: 0,
    isConnected: true,
    ...overrides,
  };

  return element;
}

function makeCloseEvent(defaultPrevented = false): DialogCloseFocusEvent {
  const event: DialogCloseFocusEvent = {
    defaultPrevented,
    preventDefault() {
      event.defaultPrevented = true;
    },
  };

  return event;
}

test("capturing and restoring focus returns keyboard focus to the opener button (issue #241)", () => {
  const body = makeElement();
  const documentElement = makeElement();

  for (const openerLabel of [
    "Delete draft",
    "Send envelope",
    "Void envelope",
    "Copy to new draft",
  ]) {
    const opener = makeElement();
    const doc = { activeElement: opener, body, documentElement };
    const captured = captureDialogReturnFocusTarget(doc);

    assert.equal(captured, opener, `${openerLabel} should be captured`);

    const closeEvent = makeCloseEvent();
    const restored = restoreDialogReturnFocus(captured, closeEvent, doc);

    assert.equal(restored, true, `${openerLabel} should restore focus`);
    assert.equal(closeEvent.defaultPrevented, true);
    assert.equal(opener.focusCalls, 1);
  }
});

test("body, documentElement, disconnected, disabled, and missing targets are ignored", () => {
  const body = makeElement();
  const documentElement = makeElement();
  const disconnected = makeElement({ isConnected: false });
  const disabled = makeElement({ disabled: true });

  assert.equal(
    captureDialogReturnFocusTarget({
      activeElement: body,
      body,
      documentElement,
    }),
    null,
  );
  assert.equal(
    captureDialogReturnFocusTarget({
      activeElement: documentElement,
      body,
      documentElement,
    }),
    null,
  );
  assert.equal(
    captureDialogReturnFocusTarget({
      activeElement: disconnected,
      body,
      documentElement,
    }),
    null,
  );
  assert.equal(
    captureDialogReturnFocusTarget({
      activeElement: disabled,
      body,
      documentElement,
    }),
    null,
  );
  assert.equal(captureDialogReturnFocusTarget(null), null);

  // Opener removed or disabled while the dialog was open (e.g. Save as template).
  const opener = makeElement();
  const doc = { activeElement: opener, body, documentElement };
  const captured = captureDialogReturnFocusTarget(doc);

  opener.isConnected = false;
  const removedEvent = makeCloseEvent();

  assert.equal(restoreDialogReturnFocus(captured, removedEvent, doc), false);
  assert.equal(removedEvent.defaultPrevented, false);
  assert.equal(opener.focusCalls, 0);

  opener.isConnected = true;
  opener.disabled = true;
  const disabledEvent = makeCloseEvent();

  assert.equal(restoreDialogReturnFocus(captured, disabledEvent, doc), false);
  assert.equal(disabledEvent.defaultPrevented, false);
  assert.equal(opener.focusCalls, 0);
});

test("caller onCloseAutoFocus calling preventDefault takes precedence", () => {
  const body = makeElement();
  const opener = makeElement();
  const doc = { activeElement: opener, body };
  const captured = captureDialogReturnFocusTarget(doc);
  const alreadyHandled = makeCloseEvent(true);

  assert.equal(restoreDialogReturnFocus(captured, alreadyHandled, doc), false);
  assert.equal(opener.focusCalls, 0);
});

test("focus is only restored when the dialog has closed or unmounted", () => {
  assert.equal(
    shouldRestoreDialogReturnFocus({ isMounted: true, isOpen: true }),
    false,
  );
  assert.equal(
    shouldRestoreDialogReturnFocus({ isMounted: false, isOpen: true }),
    true,
  );
  assert.equal(
    shouldRestoreDialogReturnFocus({ isMounted: true, isOpen: false }),
    true,
  );
  assert.equal(
    shouldRestoreDialogReturnFocus({ isMounted: false, isOpen: false }),
    true,
  );
});
