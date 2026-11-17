import { ChevronLeft, ChevronRight } from "lucide-react";

export type ShellNavItem = {
  href: string;
  /** Names the item in the app's messages (appShell.nav). */
  id: "documents" | "new-envelope" | "settings" | "templates";
  label: string;
};

export const primaryNavItems: ShellNavItem[] = [
  { href: "/dashboard", id: "documents", label: "Documents" },
  { href: "/templates", id: "templates", label: "Templates" },
  { href: "/envelopes/new", id: "new-envelope", label: "New envelope" },
  { href: "/settings", id: "settings", label: "Settings" },
];

export const ChevronLeftIcon = ChevronLeft;

export const ChevronRightIcon = ChevronRight;
