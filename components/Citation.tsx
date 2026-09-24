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
import { Sheet } from "./ui/Dialog";
import { Check, Close, Doc } from "./ui/Icons";
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
        className={`inline-flex min-h-7 items-center gap-1 rounded-full border border-line bg-surface-sunk px-2.5 text-label font-medium text-ink-subtle ${className}`}
      >
        General guidance
      </span>
    );
  }

  const v = citation.verification ?? "unverified";
  const ring =
    v === "exact"
      ? "border-plum-200 bg-plum-50 text-plum-600 hover:border-plum-300 hover:bg-plum-100"
      : v === "fuzzy"
        ? "border-ochre-300/60 bg-ochre-50 text-ochre-700 hover:bg-ochre-100"
        : "border-clay-300/60 bg-clay-50 text-clay-600 hover:bg-clay-100";

  return (
    <button
      type="button"
      onClick={() => open(citation)}
      aria-haspopup="dialog"
      className={`group inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-label leading-none font-medium transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] ${ring} ${className}`}
    >
      <Doc className="size-3 shrink-0" />
      {label ?? `Clause ${citation.clause}`}
      {v === "exact" ? (
        <span className="sr-only">, {VERIFICATION_COPY.exact.label}</span>
      ) : (
        <>
          <span className="ml-0.5 inline-block size-[5px] rounded-full bg-current" aria-hidden="true" />
          <span className="sr-only">, {VERIFICATION_COPY[v].label}</span>
        </>
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
  // Keep the last citation while the sheet animates closed.
  const [shownCitation, setShownCitation] = useState<Citation | null>(citation);

  useEffect(() => {
    if (citation) setShownCitation(citation);
  }, [citation]);

  useEffect(() => {
    if (!citation) return;
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

  const c = shownCitation;
  const doc = session.source?.text ?? "";
  const lines = doc.replace(/\r\n?/g, "\n").split("\n");
  const start = c?.resolvedLineStart ?? c?.lineStart ?? 0;
  const end = c?.resolvedLineEnd ?? c?.lineEnd ?? start;
  const v = c?.verification ?? "unverified";
  const meta = VERIFICATION_COPY[v];

  return (
    <Sheet open={!!citation} onClose={onClose} label={c ? `Source for clause ${c.clause}` : "Policy source"}>
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 pt-4 pb-4 sm:pt-5">
        <div className="min-w-0">
          <div className="label !text-plum-400">Source document</div>
          <h2 className="mt-1.5 font-display text-2xl leading-tight text-ink">
            {c ? `Clause ${c.clause}` : ""}
          </h2>
          <p className="mt-1 truncate text-sm text-ink-subtle">
            {session.source?.name ?? "Policy document"} · lines {start}–{end}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close source"
          className="-mt-1 -mr-1 flex size-10 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunk hover:text-ink"
        >
          <Close />
        </button>
      </header>

      <div className="border-b border-line bg-canvas px-5 py-3.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-label font-medium ${meta.tone}`}
        >
          {v === "exact" ? (
            <Check className="size-3" />
          ) : (
            <span className="inline-block size-[6px] rounded-full bg-current" aria-hidden="true" />
          )}
          {meta.label}
        </span>
        <p className="mt-2 text-sm text-ink-muted">{meta.detail}</p>
      </div>

      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto px-2 py-3" tabIndex={0} aria-label="Policy text">
        <div className="font-mono text-xs leading-[1.65]">
          {lines.map((line, i) => {
            const n = i + 1;
            const hit = n >= start && n <= end;
            return (
              <div
                key={n}
                ref={hit && n === start ? markRef : undefined}
                className={`flex gap-3 rounded px-3 py-[1px] ${
                  hit ? "bg-plum-100 text-ink" : "text-ink-muted"
                }`}
              >
                <span
                  className={`tnum w-9 shrink-0 text-right select-none ${
                    hit ? "text-plum-500" : "text-ink-subtle"
                  }`}
                  aria-hidden="true"
                >
                  {n}
                </span>
                <span className="whitespace-pre-wrap">{line || " "}</span>
              </div>
            );
          })}
        </div>
      </div>

      <footer className="border-t border-line bg-canvas px-5 py-3.5 pb-[calc(14px+env(safe-area-inset-bottom))] text-xs text-ink-subtle">
        Highlighted lines are the passage this claim was drawn from. Coverage is
        decided by your insurer on the final bill, not by this summary.
      </footer>
    </Sheet>
  );
}
