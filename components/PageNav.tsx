"use client";

import { useEffect, useRef, useState } from "react";

/**
 * In-page section navigation for long screens. Sticks under the header,
 * scrolls horizontally on phones, and highlights the section in view.
 */
export function SectionNav({
  sections,
  label = "On this page",
  className = "",
}: {
  sections: { id: string; label: string }[];
  label?: string;
  className?: string;
}) {
  const [active, setActive] = useState(sections[0]?.id);
  const listRef = useRef<HTMLUListElement>(null);
  const key = sections.map((s) => s.id).join("|");

  // Active = the last section whose top has passed under the sticky chrome.
  // Deterministic on every scroll position, including jumps and the very end
  // of the page, which an IntersectionObserver band gets wrong.
  useEffect(() => {
    // Seven getBoundingClientRect calls per scroll event is cheap enough that
    // throttling buys nothing, and an rAF throttle stalls in background tabs.
    const measure = () => {
      const chrome = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue("--chrome-h"),
      ) || 94;
      const line = chrome + 80;
      let current = sections[0]?.id;
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) current = s.id;
      }
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = sections[sections.length - 1]?.id;
      setActive(current);
    };
    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Keep the active chip visible in the horizontal scroller.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    const list = listRef.current;
    if (!el || !list) return;
    const left = el.offsetLeft - list.clientWidth / 2 + el.clientWidth / 2;
    list.scrollTo({ left, behavior: "smooth" });
  }, [active]);

  return (
    <nav
      aria-label={label}
      className={`sticky top-[var(--chrome-h)] z-30 ${className} -mx-4 border-b border-line/70 bg-canvas/85 px-4 backdrop-blur-xl sm:-mx-6 sm:px-6`}
    >
      <ul ref={listRef} className="no-scrollbar fade-x flex gap-1 overflow-x-auto py-2">
        {sections.map((s) => {
          const on = s.id === active;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                data-id={s.id}
                aria-current={on ? "location" : undefined}
                className={`inline-flex min-h-9 items-center rounded-full px-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  on
                    ? "bg-accent-soft text-accent"
                    : "text-ink-subtle hover:bg-surface-sunk hover:text-ink"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * A bar that carries the screen's next step once the reader has scrolled
 * past the top. It hides again when `hideWhen` (usually the in-page CTA at
 * the bottom) is on screen, so the same action is never shown twice.
 */
export function StickyNext({
  showAfter,
  hideWhen,
  children,
}: {
  showAfter: string;
  hideWhen?: string;
  children: React.ReactNode;
}) {
  const [past, setPast] = useState(false);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const start = document.getElementById(showAfter);
    const end = hideWhen ? document.getElementById(hideWhen) : null;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === start) setPast(!e.isIntersecting && e.boundingClientRect.top < 0);
        if (e.target === end) setAtEnd(e.isIntersecting);
      }
    });
    if (start) io.observe(start);
    if (end) io.observe(end);
    return () => io.disconnect();
  }, [showAfter, hideWhen]);

  const shown = past && !atEnd;

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-30 px-3 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] md:bottom-5 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
      }`}
      inert={!shown}
    >
      <div className="pointer-events-auto mx-auto flex max-w-2xl items-center justify-between gap-3 rounded-full border border-plum-200 bg-surface/95 py-2 pr-2 pl-5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        {children}
      </div>
    </div>
  );
}
