"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Wordmark } from "./Brand";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/coverage", label: "Coverage", icon: ShieldIcon },
  { href: "/hospitals", label: "Hospitals", icon: PinIcon },
  { href: "/journey", label: "Journey", icon: RouteIcon },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, reset, config } = useStore();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1240px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="Hospitality home">
            <Wordmark compact />
          </Link>

          <nav className="ml-4 hidden items-center gap-1 md:flex">
            {(session.policy ? NAV : []).map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors ${
                    active
                      ? "bg-plum-100 text-plum-700"
                      : "text-ink-muted hover:bg-surface-sunk hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ModePill demo={config?.demo ?? true} model={config?.model ?? null} />
            {session.policy && (
              <button
                type="button"
                onClick={() => {
                  reset();
                  router.push("/");
                }}
                className="hidden rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink sm:block"
              >
                New policy
              </button>
            )}
          </div>
        </div>

        <DisclosureStrip />
      </header>

      <main className="flex-1 pb-24 md:pb-12">{children}</main>

      <MobileNav pathname={pathname} />
    </div>
  );
}

function ModePill({ demo, model }: { demo: boolean; model: string | null }) {
  return (
    <span
      title={
        demo
          ? "No API key is set, so responses come from built-in fixtures."
          : `Live responses from ${model}.`
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[4px] text-[11.5px] leading-none font-medium ${
        demo
          ? "border-ochre-300/60 bg-ochre-50 text-ochre-700"
          : "border-sage-300/60 bg-sage-50 text-sage-700"
      }`}
    >
      <span
        className={`inline-block size-[6px] rounded-full ${
          demo ? "bg-ochre-500" : "animate-breathe bg-sage-500"
        }`}
      />
      {demo ? "Demo Mode" : "Live"}
    </span>
  );
}

/**
 * The persistent AI disclosure.
 *
 * Deliberately not dismissible. It sits directly under the header on every
 * screen, moves with it, and expands into the full caveat on press.
 */
function DisclosureStrip() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-plum-200/50 bg-plum-50/70">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex w-full items-center gap-2.5 py-[7px] text-left"
        >
          <SparkIcon className="size-3.5 shrink-0 text-plum-400" />
          <span className="min-w-0 flex-1 truncate text-[12px] leading-none font-medium text-plum-700">
            AI-generated guidance, traced to your policy — not a coverage
            guarantee.
          </span>
          <span className="shrink-0 text-[11.5px] font-medium text-plum-400">
            {open ? "Less" : "What this means"}
          </span>
        </button>
        <div
          className="overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ maxHeight: open ? 190 : 0, opacity: open ? 1 : 0 }}
        >
          <div className="pb-3.5 text-[12.5px] leading-relaxed text-plum-700/90">
            Hospitality reads your policy document and explains what it appears
            to say. It does not diagnose, does not recommend treatment, and
            cannot approve or reject a claim. Every coverage statement here links
            to the lines it came from, so you can check it yourself — but the
            final decision rests with your insurer and the hospital, and you
            should confirm anything that affects money with them directly before
            you act on it.
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileNav({ pathname }: { pathname: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    setVisible(pathname !== "/");
  }, [pathname]);
  if (!visible) return null;


  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <div className="flex">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                active ? "text-plum-600" : "text-ink-subtle"
              }`}
            >
              <Icon className="size-[18px]" />
              {item.label}
              <span
                className={`h-[2px] w-6 rounded-full transition-colors ${
                  active ? "bg-plum-500" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ---- icons kept local so the shell has no icon-library dependency ---- */

export function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0.8 9.4 5 13.6 6.4 9.4 7.8 8 12 6.6 7.8 2.4 6.4 6.6 5 8 0.8ZM13 10.2l.6 1.8 1.8.6-1.8.6-.6 1.8-.6-1.8-1.8-.6 1.8-.6.6-1.8Z" />
    </svg>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M10 2.5 4 4.8v4.6c0 3.4 2.4 6.5 6 7.9 3.6-1.4 6-4.5 6-7.9V4.8L10 2.5Z" />
      <path d="M7.6 9.8 9.3 11.5 12.7 8.1" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M10 17.5s5.5-4.9 5.5-9a5.5 5.5 0 1 0-11 0c0 4.1 5.5 9 5.5 9Z" strokeLinejoin="round" />
      <circle cx="10" cy="8.4" r="2.1" />
    </svg>
  );
}

function RouteIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="4.5" cy="5" r="2.2" />
      <circle cx="15.5" cy="15" r="2.2" />
      <path d="M6.7 5h4.3a3.2 3.2 0 0 1 0 6.4H9a3.2 3.2 0 0 0 0 6.4h.3" />
    </svg>
  );
}
