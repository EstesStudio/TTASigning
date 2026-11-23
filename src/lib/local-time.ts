// Times on a page, written in the reader's own time zone.
//
// The server does not know where the reader is, so a page is given the
// moment itself and the browser writes it out (LocalTime, in
// src/components/shared/local-time.tsx). Emails, signed PDFs, certificates
// and exports keep UTC: one copy of each is read by people in different
// places.

export type LocalTimeFormat =
  /** "December 18, 2026" */
  | "date"
  /** "December 18, 2026 at 9:00 PM EST" */
  | "dateTime"
  /** "Dec 18, 2026" */
  | "shortDate"
  /** "Dec 18, 9:00 PM EST" */
  | "shortDateTime";

const FORMAT_OPTIONS: Record<LocalTimeFormat, Intl.DateTimeFormatOptions> = {
  date: { day: "numeric", month: "long", year: "numeric" },
  dateTime: {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    timeZoneName: "short",
    year: "numeric",
  },
  shortDate: { day: "numeric", month: "short", year: "numeric" },
  shortDateTime: {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
  },
};

/**
 * A moment, in Unix seconds, written out in a time zone such as
 * "America/Detroit". A format with a time of day names the zone, so the same
 * moment read in two places is plainly the same moment.
 */
export function formatLocalTime(
  unixTimestamp: number,
  format: LocalTimeFormat,
  timeZone: string,
): string {
  return (
    new Intl.DateTimeFormat("en-US", { ...FORMAT_OPTIONS[format], timeZone })
      .format(new Date(unixTimestamp * 1000))
      // Some versions put a narrow no-break space before "PM".
      .replace(/[  ]/g, " ")
  );
}
