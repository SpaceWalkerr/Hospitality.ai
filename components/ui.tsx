"use client";

import { useEffect, useRef, useState } from "react";

type Tone = "plum" | "sage" | "ochre" | "clay" | "neutral";

const TONE_CHIP: Record<Tone, string> = {
  plum: "bg-plum-100 text-plum-700 border-plum-200",
  sage: "bg-sage-100 text-sage-700 border-sage-300/60",
  ochre: "bg-ochre-100 text-ochre-700 border-ochre-300/60",
  clay: "bg-clay-100 text-clay-600 border-clay-300/60",
  neutral: "bg-surface-sunk text-ink-muted border-line",
};

export function Pill({
  tone = "neutral",
  children,
  className = "",
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] leading-none font-medium whitespace-nowrap ${TONE_CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Dot({ tone = "neutral" }: { tone?: Tone }) {
  const color: Record<Tone, string> = {
    plum: "bg-plum-400",
    sage: "bg-sage-500",
    ochre: "bg-ochre-500",
    clay: "bg-clay-500",
    neutral: "bg-ink-subtle",
  };
  return (
    <span className={`inline-block size-[6px] shrink-0 rounded-full ${color[tone]}`} />
  );
}

export function SectionHeading({
  eyebrow,
  title,
  caption,
  right,
}: {
  eyebrow?: string;
  title: string;
  caption?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 text-[11px] font-semibold tracking-[0.16em] text-plum-400 uppercase">
            {eyebrow}
          </div>
        )}
        <h2 className="font-display text-[21px] leading-tight text-ink sm:text-[23px]">
          {title}
        </h2>
        {caption && (
          <p className="mt-1 max-w-2xl text-[13.5px] leading-relaxed text-ink-muted">
            {caption}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function StatTile({
  label,
  value,
  sub,
  tone = "neutral",
  footer,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
  footer?: React.ReactNode;
}) {
  const accent: Record<Tone, string> = {
    plum: "before:bg-plum-400",
    sage: "before:bg-sage-500",
    ochre: "before:bg-ochre-500",
    clay: "before:bg-clay-500",
    neutral: "before:bg-line-strong",
  };
  return (
    <div
      className={`card relative overflow-hidden p-4 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[''] ${accent[tone]}`}
    >
      <div className="text-[11px] font-semibold tracking-[0.13em] text-ink-subtle uppercase">
        {label}
      </div>
      <div className="tnum mt-2 font-display text-[26px] leading-none text-ink sm:text-[29px]">
        {value}
      </div>
      {sub && (
        <div className="mt-1.5 text-[12.5px] leading-snug text-ink-muted">{sub}</div>
      )}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

/** Progress readout for a multi-step server operation. */
export function StatusLine({
  status,
  className = "",
}: {
  status: { label: string; step: number; of: number } | null;
  className?: string;
}) {
  if (!status) return null;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <span className="relative flex size-2">
        <span className="animate-breathe absolute inline-flex size-2 rounded-full bg-plum-400" />
      </span>
      <span className="text-[13px] font-medium text-ink-muted">{status.label}</span>
      <span className="tnum text-[11.5px] text-ink-subtle">
        {status.step}/{status.of}
      </span>
    </div>
  );
}

/** Prose that grows as tokens arrive, with a caret while the stream is open. */
export function StreamingProse({
  text,
  streaming,
  className = "",
}: {
  text: string;
  streaming: boolean;
  className?: string;
}) {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={`font-display text-[16.5px] leading-[1.72] text-ink/90 sm:text-[17.5px] ${
            i > 0 ? "mt-4" : ""
          } ${streaming && i === paragraphs.length - 1 ? "streaming-caret" : ""}`}
        >
          {p}
        </p>
      ))}
      {!paragraphs.length && streaming && (
        <div className="space-y-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[70%]" />
        </div>
      )}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[12px] border border-clay-300/60 bg-clay-50 p-3.5">
      <svg viewBox="0 0 20 20" className="mt-[1px] size-4 shrink-0 text-clay-500" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a.9.9 0 01.9.9v4.2a.9.9 0 11-1.8 0V6.9A.9.9 0 0110 6zm0 8.6a1.05 1.05 0 110-2.1 1.05 1.05 0 010 2.1z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-[13.5px] leading-relaxed text-clay-600">{message}</p>
    </div>
  );
}

/** Simple accessible disclosure used for score breakdowns and room tables. */
export function Expander({
  label,
  openLabel,
  children,
}: {
  label: string;
  openLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(() => {
      if (ref.current) setHeight(ref.current.scrollHeight);
    });
    ro.observe(ref.current);
    setHeight(ref.current.scrollHeight);
    return () => ro.disconnect();
  }, [children]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-plum-500 transition-colors hover:text-plum-600"
      >
        {open ? (openLabel ?? label) : label}
        <svg
          viewBox="0 0 16 16"
          className={`size-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M4 6.5 8 10.5 12 6.5" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ height: open ? height : 0, opacity: open ? 1 : 0 }}
      >
        <div ref={ref}>{children}</div>
      </div>
    </div>
  );
}
