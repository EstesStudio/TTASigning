/**
 * Minimal structural view of a focusable DOM element, allowing focus
 * restoration logic to be unit-tested without a browser runtime.
 */
export type FocusableElement = {
  disabled?: boolean;
  focus: (options?: { preventScroll?: boolean }) => void;
  isConnected: boolean;
};

export type DialogFocusDocument = {
  activeElement: unknown;
  body: unknown;
  documentElement?: unknown;
};

export type DialogCloseFocusEvent = {
  defaultPrevented: boolean;
  preventDefault: () => void;
};

function isFocusableElement(value: unknown): value is FocusableElement {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { focus?: unknown }).focus === "function" &&
    typeof (value as { isConnected?: unknown }).isConnected === "boolean"
  );
}

function isPageRoot(
  value: unknown,
  doc: Pick<DialogFocusDocument, "body" | "documentElement"> | null | undefined,
): boolean {
  if (!doc) {
    return false;
  }

  return value === doc.body || value === doc.documentElement;
}

/**
 * Captures the currently focused element before a state-driven modal dialog
 * moves focus inside itself. Ignores body / documentElement and disconnected
 * or disabled controls so Radix can fall back to any explicit trigger.
 */
export function captureDialogReturnFocusTarget(
  doc: DialogFocusDocument | null | undefined,
): FocusableElement | null {
  if (!doc) {
    return null;
  }

  const candidate = doc.activeElement;

  if (
    !isFocusableElement(candidate) ||
    !candidate.isConnected ||
    candidate.disabled === true ||
    isPageRoot(candidate, doc)
  ) {
    return null;
  }

  return candidate;
}

/**
 * Restores focus to the element that opened a state-driven dialog when the
 * dialog closes, unless a caller's own `onCloseAutoFocus` already handled it
 * or the opener is no longer mounted and focusable.
 */
export function restoreDialogReturnFocus(
  target: FocusableElement | null,
  event: DialogCloseFocusEvent,
  doc?: Pick<DialogFocusDocument, "body" | "documentElement"> | null,
): boolean {
  if (event.defaultPrevented || !target) {
    return false;
  }

  if (
    !target.isConnected ||
    target.disabled === true ||
    isPageRoot(target, doc)
  ) {
    return false;
  }

  event.preventDefault();
  target.focus();

  return true;
}

/**
 * Guards against restoring focus during a simulated effect cleanup while the
 * dialog is still open (for example under React Strict Mode in development).
 */
export function shouldRestoreDialogReturnFocus(state: {
  isMounted: boolean;
  isOpen: boolean;
}): boolean {
  return !state.isMounted || !state.isOpen;
}
