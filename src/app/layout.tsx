import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { ThemeSync } from "@/components/theme/theme-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { THEME_SCRIPT } from "@/lib/theme";

import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SignuDoc",
  description:
    "Free e-signature software for small businesses. Upload, send, sign — no enterprise circus required.",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  // The browser's own parts (scrollbars, form controls) before the
  // stylesheet loads. globals.css sets it per theme after that.
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The head script sets data-theme on <html> before React hydrates it.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${plusJakartaSans.variable} antialiased`}>
        <ThemeSync />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
