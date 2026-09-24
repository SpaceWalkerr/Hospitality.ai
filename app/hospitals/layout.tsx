import type { Metadata } from "next";

export const metadata: Metadata = { title: "Find a hospital" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
