import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your coverage" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
