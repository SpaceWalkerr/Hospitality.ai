"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals its children once they scroll into view.
 *
 * Deliberately one-shot and short: content that animates every time it
 * re-enters the viewport is exhausting, and this app is read by people who are
 * already tired. Respects prefers-reduced-motion via the global override in
 * globals.css, which collapses the animation to zero duration.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as = "div",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;

    // No IntersectionObserver (or an unusual environment): show it rather than
    // leaving content invisible forever.
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );
    io.observe(el);

    // Fail-safe. The animation starts from opacity 0, so anything that stops
    // the observer from ever firing would leave content permanently invisible —
    // an unacceptable failure mode for a page someone is reading in a hospital.
    // Worst case the reveal is skipped and the content is simply there.
    const failsafe = setTimeout(() => setSeen(true), 1600);

    return () => {
      io.disconnect();
      clearTimeout(failsafe);
    };
  }, [seen]);

  return (
    <Tag
      ref={ref}
      className={`reveal ${seen ? "is-in" : ""} ${className}`}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/**
 * Counts a figure up once, on first view.
 *
 * Only worth doing where the magnitude is the point (a sum insured, a total
 * bill). Eased so it decelerates into the real number rather than ticking
 * linearly, and it always lands exactly on the target.
 */
export function CountUp({
  value,
  format,
  duration = 1000,
  className = "",
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const started = useRef(false);

  useEffect(() => {
    // A changed target (a new policy, a re-ranked case) just snaps.
    if (started.current) {
      setShown(value);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const reduced =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      started.current = true;
      setShown(value);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || started.current) return;
      started.current = true;
      io.disconnect();

      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(p === 1 ? value : Math.round(value * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });

    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {format(shown)}
    </span>
  );
}
