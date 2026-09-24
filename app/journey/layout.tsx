import type { Metadata } from "next";

export const metadata: Metadata = { title: "Your stay" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
