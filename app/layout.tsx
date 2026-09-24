import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { CitationProvider } from "@/components/Citation";
import { ToastProvider } from "@/components/ui/Toast";
import { THEME_BOOT_SCRIPT } from "@/components/ThemeToggle";

/**
 * Fraunces carries the voice. Its optical-size axis keeps it warm at hero
 * sizes and comfortable in the plain-language brief, and the SOFT axis rounds
 * it off so it reads as reassuring rather than formal.
 *
 * Instrument Sans handles the interface and every number, where labels and
 * figures need to stay unambiguous at small sizes. It ships tabular figures.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hospitality — insurance-aware hospital navigation",
  description:
    "Understand what your health policy actually covers, find hospitals that fit it, and stay oriented through the whole admission.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141017" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Sets data-theme before first paint so there is no flash of the
            wrong theme. Must stay inline and synchronous. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="bg-paper grain min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only z-[60] rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>
        <StoreProvider>
          <ToastProvider>
            <CitationProvider>{children}</CitationProvider>
          </ToastProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
