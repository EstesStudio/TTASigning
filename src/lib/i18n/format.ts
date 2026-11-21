export type MessageValues = Record<string, string | number>;

/**
 * Replaces `{name}` placeholders in a message. Unknown placeholders are left
 * alone so a missing value is visible in review instead of becoming blank.
 */
export function formatMessage(
  template: string,
  values: MessageValues = {},
): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.prototype.hasOwnProperty.call(values, name)
      ? String(values[name])
      : placeholder,
  );
}
