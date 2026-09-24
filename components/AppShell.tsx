"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Wordmark } from "./Brand";
import { ThemeToggle } from "./ThemeToggle";
import { ArchRule } from "./Ornament";
import { useToast } from "./ui/Toast";
import { Check, Pin, Route, Shield, Spark } from "./ui/Icons";
import { useStore } from "@/lib/store";

/** The three screens of the flow, in order. */
const STEPS = [
  { href: "/coverage", label: "Coverage", long: "Your coverage", icon: Shield },
  { href: "/hospitals", label: "Hospitals", long: "Find a hospital", icon: Pin },
  { href: "/journey", label: "Journey", long: "Your stay", icon: Route },
] as const;

function useStepState() {
  const { session } = useStore();
  const done = [
    !!session.policy,
    !!session.chosen,
    session.visited.length >= 4,
  ];
  return { enabled: !!session.policy, done };
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, reset, update, config } = useStore();
  const toast = useToast();
  const { enabled, done } = useStepState();
  const headerRef = useRef<HTMLElement>(null);

  // Publish the header's live height so sticky page elements can sit flush
  // under it — the disclosure strip wraps on phones, so it isn't a constant.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const set = () =>
      document.documentElement.style.setProperty("--chrome-h", `${el.offsetHeight}px`);
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const startOver = () => {
    const snapshot = session;
    reset();
    router.push("/");
    toast({
      title: "Started over",
      description: "Your previous policy was cleared from this tab.",
      tone: "info",
      action: {
        label: "Undo",
        onClick: () => {
          update(snapshot);
          router.push("/coverage");
        },
      },
    });
  };

  return (
    <div className="relative z-[1] flex min-h-dvh flex-col">
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-line/80 bg-canvas/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-[60px] max-w-[1240px] items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="shrink-0 rounded-lg" aria-label="Hospitality home">
            <Wordmark compact />
          </Link>

          {enabled && (
            <nav aria-label="Steps" className="mx-auto hidden md:block">
              <ol className="flex items-center gap-1">
                {STEPS.map((s, i) => {
                  const active = pathname.startsWith(s.href);
                  return (
                    <li key={s.href} className="flex items-center gap-1">
                      {i > 0 && (
                        <span
                          aria-hidden="true"
                          className={`h-px w-5 transition-colors ${done[i - 1] ? "bg-plum-300" : "bg-line-strong"}`}
                        />
                      )}
                      <Link
                        href={s.href}
                        aria-current={active ? "page" : undefined}
                        className={`group inline-flex h-9 items-center gap-2 rounded-full pr-3.5 pl-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "bg-accent-soft text-accent"
                            : "text-ink-muted hover:bg-surface-sunk hover:text-ink"
                        }`}
                      >
                        <span
                          className={`grid size-6 place-items-center rounded-full text-label font-semibold transition-colors ${
                            active
                              ? "bg-accent text-accent-fg"
                              : done[i]
                                ? "bg-sage-100 text-sage-700"
                                : "border border-line-strong text-ink-subtle"
                          }`}
                        >
                          {done[i] && !active ? <Check className="size-3.5" /> : i + 1}
                        </span>
                        {s.label}
                        {done[i] && !active && <span className="sr-only">(done)</span>}
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-2">
            <ModePill demo={config?.demo ?? true} model={config?.model ?? null} />
            <ThemeToggle />
            {session.policy && (
              <button
                type="button"
                onClick={startOver}
                className="hidden h-9 rounded-full border border-line px-3.5 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-ink lg:block"
              >
                New policy
              </button>
            )}
          </div>
        </div>

        <DisclosureStrip />
      </header>

      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        <div className="animate-page">{children}</div>
      </main>

      <Footer onStartOver={session.policy ? startOver : undefined} />

      <MobileNav pathname={pathname} enabled={enabled} done={done} />
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
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-label leading-none font-medium ${
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
      {demo ? "Demo" : "Live"}
      <span className="sr-only">{demo ? "mode: responses come from fixtures" : "mode"}</span>
    </span>
  );
}

/**
 * The persistent AI disclosure. Deliberately not dismissible. It sits under
 * the header on every screen and expands into the full caveat on press. The
 * short line wraps rather than truncating: a caveat cut off mid-sentence is
 * not a caveat.
 */
function DisclosureStrip() {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-t border-plum-200/50 bg-plum-50/80">
      <div className="mx-auto max-w-[1240px] px-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="disclosure-detail"
          className="flex w-full items-start gap-2.5 py-2 text-left sm:items-center"
        >
          <Spark className="mt-[3px] size-3.5 shrink-0 text-plum-400 sm:mt-0" />
          <span className="min-w-0 flex-1 text-label font-medium text-plum-700">
            AI-generated guidance, traced to your policy. Not a coverage guarantee.
          </span>
          <span className="shrink-0 text-label font-semibold text-plum-500 underline decoration-plum-300 underline-offset-2">
            {open ? "Less" : "Details"}
          </span>
        </button>
        <div
          id="disclosure-detail"
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ gridTemplateRows: open ? "1fr" : "0fr", opacity: open ? 1 : 0 }}
          inert={!open}
        >
          <div className="overflow-hidden">
            <p className="max-w-3xl pb-3.5 text-sm text-plum-700/90">
              Hospitality reads your policy document and explains what it
              appears to say. It does not diagnose, does not recommend
              treatment, and cannot approve or reject a claim. Every coverage
              statement here links to the lines it came from, so you can check
              it yourself — but the final decision rests with your insurer and
              the hospital, and you should confirm anything that affects money
              with them directly before you act on it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Footer({ onStartOver }: { onStartOver?: () => void }) {
  const { session } = useStore();
  return (
    <footer className="relative mt-16 border-t border-line/80 bg-surface/40 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-0">
      <div className="mx-auto max-w-[1240px] px-4 pt-12 pb-10 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Wordmark />
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              Reads your health policy, shows you the clause behind every
              answer, and finds hospitals it actually fits.
            </p>
            <ThemeToggle className="mt-5" />
          </div>

          <FooterCol title="The app">
            {session.policy ? (
              STEPS.map((s) => (
                <FooterLink key={s.href} href={s.href}>
                  {s.long}
                </FooterLink>
              ))
            ) : (
              <FooterLink href="/#start">Start with a policy</FooterLink>
            )}
            {onStartOver && (
              <li>
                <button
                  type="button"
                  onClick={onStartOver}
                  className="text-sm text-ink-muted transition-colors hover:text-accent"
                >
                  Start over with a new policy
                </button>
              </li>
            )}
          </FooterCol>

          <FooterCol title="Trust">
            <FooterLink href="/#how-we-check">How we check every answer</FooterLink>
            <FooterLink href="/#boundaries">What it will never do</FooterLink>
            <FooterLink href="/#how-it-works">How it works</FooterLink>
          </FooterCol>

          <FooterCol title="Privacy">
            <li className="text-sm text-ink-muted">
              Documents are read on the server and never stored. Your session
              lives only in this browser tab.
            </li>
          </FooterCol>
        </div>

        <ArchRule className="my-8" />

        <div className="flex flex-col items-center justify-between gap-3 text-center text-label text-ink-subtle sm:flex-row sm:text-left">
          <p>
            Sample policies, hospitals, rates and people are synthetic. No real
            insurer, facility or person is depicted.
          </p>
          <p className="shrink-0">Built for the GE HealthCare Precision Care Challenge 2026</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="label font-sans">{title}</h2>
      <ul className="mt-3.5 space-y-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="text-sm text-ink-muted transition-colors hover:text-accent">
        {children}
      </Link>
    </li>
  );
}

function MobileNav({
  pathname,
  enabled,
  done,
}: {
  pathname: string;
  enabled: boolean;
  done: boolean[];
}) {
  if (pathname === "/" || !enabled) return null;

  return (
    <nav
      aria-label="Steps"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <div className="flex">
        {STEPS.map((item, i) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex min-h-[60px] flex-1 flex-col items-center justify-center gap-1 text-label font-medium transition-colors ${
                active ? "text-accent" : "text-ink-subtle"
              }`}
            >
              <span
                className={`absolute top-0 h-[3px] w-10 rounded-b-full transition-colors ${
                  active ? "bg-accent" : "bg-transparent"
                }`}
                aria-hidden="true"
              />
              <span className="relative">
                <Icon className="size-5" />
                {done[i] && !active && (
                  <span className="absolute -top-1 -right-1.5 grid size-3.5 place-items-center rounded-full bg-sage-500 text-white dark:text-canvas">
                    <Check className="size-2.5" />
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* Kept for existing imports. */
export { Spark as SparkIcon } from "./ui/Icons";
