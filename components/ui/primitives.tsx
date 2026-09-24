"use client";

import { useEffect, useRef, useState } from "react";
import { Alert, Chevron } from "./Icons";

export type Tone = "plum" | "sage" | "ochre" | "clay" | "neutral";

const TONE_CHIP: Record<Tone, string> = {
  plum: "bg-plum-100 text-plum-700 border-plum-200",
  sage: "bg-sage-100 text-sage-700 border-sage-300/60",
  ochre: "bg-ochre-100 text-ochre-700 border-ochre-300/60",
  clay: "bg-clay-100 text-clay-600 border-clay-300/60",
  neutral: "bg-surface-sunk text-ink-muted border-line",
};

/** Badge. Status is always carried by the words, never by colour alone. */
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label leading-none font-medium whitespace-nowrap ${TONE_CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export const Badge = Pill;

const DOT: Record<Tone, string> = {
  plum: "bg-plum-400",
  sage: "bg-sage-500",
  ochre: "bg-ochre-500",
  clay: "bg-clay-500",
  neutral: "bg-ink-subtle",
};

export function Dot({ tone = "neutral", className = "" }: { tone?: Tone; className?: string }) {
  return (
    <span className={`inline-block size-[7px] shrink-0 rounded-full ${DOT[tone]} ${className}`} />
  );
}

export function Eyebrow({
  children,
  className = "",
  tone = "accent",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "accent" | "muted";
}) {
  return (
    <div
      className={`label inline-flex items-center gap-2 ${tone === "accent" ? "!text-plum-400" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  caption,
  right,
  id,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: string;
  caption?: string;
  right?: React.ReactNode;
  id?: string;
  as?: "h1" | "h2";
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-2">{eyebrow}</Eyebrow>}
        <Tag
          id={id}
          className={`font-display text-ink ${Tag === "h1" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-[28px]"}`}
        >
          {title}
        </Tag>
        {caption && (
          <p className="mt-1.5 max-w-2xl text-base text-ink-muted">{caption}</p>
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
  return (
    <div className="card flex flex-col p-4 sm:p-5">
      <div className="label flex items-center gap-2">
        <Dot tone={tone} />
        {label}
      </div>
      <div className="figure mt-2.5 text-2xl leading-none text-ink sm:text-[28px]">
        {value}
      </div>
      {sub && <div className="mt-2 text-sm text-ink-muted">{sub}</div>}
      {footer && <div className="mt-auto pt-3">{footer}</div>}
    </div>
  );
}

/**
 * The one number a screen leads with. Sans, never the serif: a display face on
 * a figure reads as decoration, and this number is a fact the reader is going
 * to act on. Exactly one per view.
 */
export function HeroFigure({
  label,
  value,
  caption,
  children,
}: {
  label: string;
  value: React.ReactNode;
  caption?: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className="hero-figure mt-2.5 text-[clamp(38px,4.6vw,56px)] text-ink">
        {value}
      </div>
      {caption && (
        <p className="mt-2 max-w-sm text-sm text-ink-muted">{caption}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

/**
 * A single ratio against a limit. The unfilled track is a lighter step of the
 * fill's own ramp rather than a neutral grey, so the state reads across the
 * whole bar.
 */
export function Meter({
  value,
  max,
  tone = "good",
  leftLabel,
  rightLabel,
}: {
  value: number;
  max: number;
  tone?: "good" | "warn" | "bad";
  leftLabel?: string;
  rightLabel?: string;
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const fill = { good: "bg-viz-good", warn: "bg-viz-warn", bad: "bg-viz-bad" }[tone];
  const track = {
    good: "bg-viz-good-wash",
    warn: "bg-viz-warn-wash",
    bad: "bg-viz-bad-wash",
  }[tone];

  return (
    <div>
      <div
        className={`h-[10px] w-full overflow-hidden rounded-full ${track}`}
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-label={leftLabel}
      >
        <div
          className={`h-full rounded-full ${fill} transition-[width] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {(leftLabel || rightLabel) && (
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-ink-muted">{leftLabel}</span>
          <span className="figure font-medium text-ink-subtle">{rightLabel}</span>
        </div>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** A few lines of placeholder text at natural, uneven widths. */
export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  const widths = ["100%", "94%", "72%", "88%", "60%"];
  return (
    <div className={`space-y-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: widths[i % widths.length] }} />
      ))}
    </div>
  );
}

/** A card-shaped placeholder: label, figure, a line of text. */
export function SkeletonCard({ className = "", tall = false }: { className?: string; tall?: boolean }) {
  return (
    <div className={`card space-y-3 p-5 ${className}`} aria-hidden="true">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className={tall ? "h-7 w-3/4" : "h-6 w-2/3"} />
      <SkeletonText lines={tall ? 3 : 2} />
    </div>
  );
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
    <div className={`flex items-center gap-2.5 ${className}`} role="status">
      <span className="relative flex size-2">
        <span className="animate-breathe absolute inline-flex size-2 rounded-full bg-plum-400" />
      </span>
      <span className="text-sm font-medium text-ink-muted">{status.label}</span>
      <span className="figure text-label font-normal text-ink-subtle">
        {status.step}/{status.of}
      </span>
    </div>
  );
}

/**
 * Prose that grows as tokens arrive, with a caret while the stream is open.
 * aria-live is polite and the region is marked busy while streaming, so a
 * screen reader reads the finished answer once rather than token by token.
 */
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
    <div className={className} aria-live="polite" aria-busy={streaming}>
      {paragraphs.map((p, i) => (
        <p
          key={i}
          className={`font-display text-lg text-ink/90 ${i > 0 ? "mt-4" : ""} ${
            streaming && i === paragraphs.length - 1 ? "streaming-caret" : ""
          }`}
        >
          {p}
        </p>
      ))}
      {!paragraphs.length && streaming && <SkeletonText lines={3} />}
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-[12px] border border-clay-300/60 bg-clay-50 p-3.5">
      <Alert className="mt-[2px] size-4 shrink-0 text-clay-500" />
      <p className="text-sm text-clay-600">{message}</p>
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
        className="-mx-2 inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
      >
        {open ? (openLabel ?? label) : label}
        <Chevron className={`size-3.5 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div
        className="overflow-hidden transition-[height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ height: open ? height : 0, opacity: open ? 1 : 0 }}
        inert={!open}
      >
        <div ref={ref}>{children}</div>
      </div>
    </div>
  );
}
