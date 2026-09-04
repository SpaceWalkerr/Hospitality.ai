import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { CitationProvider } from "@/components/Citation";

/**
 * Newsreader carries the voice — it is a reading serif, and this app asks
 * people to read carefully under stress. Inter handles the interface, where
 * numbers and labels need to stay unambiguous at small sizes.
 */
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hospitality — insurance-aware hospital navigation",
  description:
    "Understand what your health policy actually covers, find hospitals that fit it, and stay oriented through the whole admission.",
};

export const viewport: Viewport = {
  themeColor: "#f6f4f2",
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
    <html lang="en" className={`${newsreader.variable} ${inter.variable}`}>
      <body className="bg-paper min-h-dvh antialiased">
        <StoreProvider>
          <CitationProvider>{children}</CitationProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
