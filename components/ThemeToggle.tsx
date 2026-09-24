"use client";

import { useEffect, useSyncExternalStore } from "react";

/**
 * Theme preference: follow the system by default, or pin light / dark.
 *
 * The preference lives in localStorage (a per-device convenience, not session
 * data). The resolved theme lives on <html data-theme>, which is what the CSS
 * keys off. THEME_BOOT_SCRIPT sets it before first paint; this module keeps it
 * in sync afterwards, including when the OS switches while the tab is open.
 */

type Pref = "system" | "light" | "dark";
const KEY = "hospitality.theme";

export const THEME_BOOT_SCRIPT = `(function(){try{var p=localStorage.getItem('${KEY}')||'system';var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;

const listeners = new Set<() => void>();

function read(): Pref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: Pref, animate: boolean) {
  const dark =
    pref === "dark" ||
    (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const root = document.documentElement;
  if (animate) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 320);
  }
  root.dataset.theme = dark ? "dark" : "light";
}

function setPref(pref: Pref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* private mode — the choice still applies for this page */
  }
  apply(pref, true);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function useThemePref() {
  const pref = useSyncExternalStore(subscribe, read, () => "system" as Pref);

  useEffect(() => {
    if (pref !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system", true);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  return pref;
}

const OPTIONS: { id: Pref; label: string; Icon: (p: { className?: string }) => React.ReactElement }[] = [
  { id: "system", label: "Match system", Icon: SystemIcon },
  { id: "light", label: "Light", Icon: SunIcon },
  { id: "dark", label: "Dark", Icon: MoonIcon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useThemePref();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className={`inline-flex items-center rounded-full border border-line bg-surface/70 p-[3px] ${className}`}
      onKeyDown={(e) => {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        e.preventDefault();
        const i = OPTIONS.findIndex((o) => o.id === pref);
        const next = OPTIONS[(i + (e.key === "ArrowRight" ? 1 : OPTIONS.length - 1)) % OPTIONS.length];
        setPref(next.id);
        (e.currentTarget.querySelector(`[data-id="${next.id}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {OPTIONS.map(({ id, label, Icon }) => {
        const on = pref === id;
        return (
          <button
            key={id}
            data-id={id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={label}
            title={label}
            tabIndex={on ? 0 : -1}
            onClick={() => setPref(id)}
            className={`flex size-7 items-center justify-center rounded-full transition-colors duration-150 ${
              on
                ? "bg-accent-soft text-accent"
                : "text-ink-subtle hover:text-ink"
            }`}
          >
            <Icon className="size-[15px]" />
          </button>
        );
      })}
    </div>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2v1.6M10 16.4V18M2 10h1.6M16.4 10H18M4.3 4.3l1.2 1.2M14.5 14.5l1.2 1.2M4.3 15.7l1.2-1.2M14.5 5.5l1.2-1.2" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true">
      <path d="M16.2 12.3A6.6 6.6 0 0 1 7.7 3.8a6.6 6.6 0 1 0 8.5 8.5Z" />
    </svg>
  );
}

function SystemIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="10" cy="10" r="6.6" />
      <path d="M10 3.4v13.2a6.6 6.6 0 0 0 0-13.2Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
