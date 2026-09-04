"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Citation } from "@/lib/types";
import { useStore } from "@/lib/store";

/**
 * Citation surface.
 *
 * Every coverage claim in this app is a chip you can press to see the exact
 * lines it came from. The drawer shows the real document, scrolled and
 * highlighted, plus whether the quote was found verbatim — the difference
 * between "the model says clause 1.4 says this" and "clause 1.4 says this".
 */

type CitationCtx = { open: (c: Citation) => void };
const Ctx = createContext<CitationCtx | null>(null);

export function CitationProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<Citation | null>(null);
  const open = useCallback((c: Citation) => setActive(c), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <SourceDrawer citation={active} onClose={() => setActive(null)} />
    </Ctx.Provider>
  );
}

export function useCitation() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCitation must be used inside CitationProvider");
  return ctx;
}

const VERIFICATION_COPY: Record<
  NonNullable<Citation["verification"]>,
  { label: string; tone: string; detail: string }
> = {
  exact: {
    label: "Verified in source",
    tone: "bg-sage-100 text-sage-700 border-sage-300/60",
    detail: "This wording was found verbatim in the document you provided.",
  },
  fuzzy: {
    label: "Close match",
    tone: "bg-ochre-100 text-ochre-700 border-ochre-300/60",
    detail:
      "We located this passage, but the quote differs slightly from the document — read the highlighted lines yourself before relying on it.",
  },
  unverified: {
    label: "Not found in source",
    tone: "bg-clay-100 text-clay-600 border-clay-300/60",
    detail:
      "We could not locate this quote in the document. Treat this claim as unreliable and confirm it with your insurer.",
  },
};

export function CitationChip({
  citation,
  label,
  className = "",
}: {
  citation: Citation | null;
  label?: string;
  className?: string;
}) {
  const { open } = useCitation();
  if (!citation) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-line bg-surface-sunk px-2 py-[2px] text-[11px] font-medium text-ink-subtle ${className}`}
      >
        General guidance
      </span>
    );
  }

  const v = citation.verification ?? "unverified";
  const ring =
    v === "exact"
      ? "border-plum-200 bg-plum-50 text-plum-600 hover:bg-plum-100"
      : v === "fuzzy"
        ? "border-ochre-300/60 bg-ochre-50 text-ochre-700 hover:bg-ochre-100"
        : "border-clay-300/60 bg-clay-50 text-clay-600 hover:bg-clay-100";

  return (
    <button
      type="button"
      onClick={() => open(citation)}
      className={`group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] leading-none font-medium transition-colors ${ring} ${className}`}
    >
      <svg viewBox="0 0 16 16" className="size-3 shrink-0" fill="currentColor">
        <path d="M4.4 2.5h5l3.1 3.1v7.9a1 1 0 0 1-1 1h-7.1a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Zm4.7 1.6v2.1h2.1L9.1 4.1Z" />
      </svg>
      {label ?? `Clause ${citation.clause}`}
      {v !== "exact" && (
        <span
          className="ml-0.5 inline-block size-[5px] rounded-full bg-current"
          aria-label={VERIFICATION_COPY[v].label}
        />
      )}
    </button>
  );
}

function SourceDrawer({
  citation,
  onClose,
}: {
  citation: Citation | null;
  onClose: () => void;
}) {
  const { session } = useStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!citation) {
      const t = setTimeout(() => setMounted(false), 260);
      return () => clearTimeout(t);
    }

    setMounted(true);
    // Position the highlight directly rather than relying on scrollIntoView:
    // the sheet is still transitioning, and a smooth scroll started mid-
    // transition lands in the wrong place (or nowhere) often enough to matter.
    let frame = 0;
    const centre = () => {
      const box = scrollRef.current;
      const mark = markRef.current;
      if (!box || !mark) return false;
      box.scrollTop = Math.max(0, mark.offsetTop - box.clientHeight / 2);
      return true;
    };
    const t = setTimeout(() => {
      if (!centre()) frame = requestAnimationFrame(() => centre());
    }, 180);
    return () => {
      clearTimeout(t);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [citation]);

  useEffect(() => {
    if (!citation) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [citation, onClose]);

  if (!mounted && !citation) return null;

  const doc = session.source?.text ?? "";
  const lines = doc.replace(/\r\n?/g, "\n").split("\n");
  const start = citation?.resolvedLineStart ?? citation?.lineStart ?? 0;
  const end = citation?.resolvedLineEnd ?? citation?.lineEnd ?? start;
  const v = citation?.verification ?? "unverified";
  const meta = VERIFICATION_COPY[v];
  const shown = !!citation;

  return (
    <div
      className="fixed inset-0 z-50"
      style={{ pointerEvents: shown ? "auto" : "none" }}
      role="dialog"
      aria-modal="true"
      aria-label="Policy source"
    >
      <div
        onClick={onClose}
        className="absolute inset-0 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-300"
        style={{ opacity: shown ? 1 : 0 }}
      />
      <div
        className="absolute right-0 bottom-0 flex w-full flex-col bg-surface shadow-[var(--shadow-sheet)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:top-0 sm:h-full sm:w-[min(520px,92vw)] sm:rounded-none"
        style={{
          maxHeight: "88vh",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          transform: shown
            ? "translate(0,0)"
            : "var(--drawer-hidden, translateY(102%))",
        }}
        data-open={shown}
      >
        <style>{`
          @media (min-width: 640px) {
            [data-open] { --drawer-hidden: translateX(102%); }
          }
        `}</style>

        <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-5 pb-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold tracking-[0.16em] text-plum-400 uppercase">
              Source document
            </div>
            <h3 className="mt-1.5 font-display text-[19px] leading-tight text-ink">
              {citation ? `Clause ${citation.clause}` : ""}
            </h3>
            <p className="mt-1 truncate text-[12.5px] text-ink-subtle">
              {session.source?.name ?? "Policy document"} · lines {start}–{end}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 rounded-full p-2 text-ink-subtle transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="m4 4 8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div className="border-b border-line bg-canvas px-5 py-3.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11.5px] font-medium ${meta.tone}`}
          >
            {v === "exact" ? (
              <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
                <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
              </svg>
            ) : (
              <span className="inline-block size-[6px] rounded-full bg-current" />
            )}
            {meta.label}
          </span>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-muted">{meta.detail}</p>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <div className="font-mono text-[12px] leading-[1.65]">
            {lines.map((line, i) => {
              const n = i + 1;
              const hit = n >= start && n <= end;
              return (
                <div
                  key={n}
                  ref={hit && n === start ? markRef : undefined}
                  className={`flex gap-3 rounded px-3 py-[1px] ${
                    hit ? "bg-plum-100/80 text-ink" : "text-ink-muted/75"
                  }`}
                >
                  <span
                    className={`tnum w-9 shrink-0 text-right select-none ${
                      hit ? "text-plum-400" : "text-ink-subtle/50"
                    }`}
                  >
                    {n}
                  </span>
                  <span className="whitespace-pre-wrap">{line || " "}</span>
                </div>
              );
            })}
          </div>
        </div>

        <footer className="border-t border-line bg-canvas px-5 py-3.5 text-[12px] leading-relaxed text-ink-subtle">
          Highlighted lines are the passage this claim was drawn from. Coverage is
          decided by your insurer on the final bill, not by this summary.
        </footer>
      </div>
    </div>
  );
}
