"use client";

import { STAGES, STAGE_META } from "@/lib/services/journeyCopilot";
import type { JourneyStage } from "@/lib/types";

/**
 * The stage tracker, drawn as a shallow arch.
 *
 * The product's only decorative form is the portico from the wordmark, so the
 * journey rides the same curve rather than sitting on a generic straight rail.
 * Progress is drawn with `pathLength="1"`, which normalises the stroke so the
 * dash offset is just a fraction — no path measurement in JS, and it stays
 * correct at every width.
 *
 * Narrow screens get a vertical spine instead: an arc across four labels is
 * unreadable under about 600px.
 */

// Pulled in from the edges so the end nodes' labels have room to centre
// underneath them without running off the card.
const P0 = { x: 120, y: 80 };
const P1 = { x: 360, y: 22 };
const P2 = { x: 640, y: 22 };
const P3 = { x: 880, y: 80 };

function pointAt(t: number) {
  const u = 1 - t;
  return {
    x: u ** 3 * P0.x + 3 * u ** 2 * t * P1.x + 3 * u * t ** 2 * P2.x + t ** 3 * P3.x,
    y: u ** 3 * P0.y + 3 * u ** 2 * t * P1.y + 3 * u * t ** 2 * P2.y + t ** 3 * P3.y,
  };
}

const CURVE = `M ${P0.x} ${P0.y} C ${P1.x} ${P1.y} ${P2.x} ${P2.y} ${P3.x} ${P3.y}`;

export function StageSpine({
  stage,
  visited,
  onSelect,
}: {
  stage: JourneyStage;
  visited: JourneyStage[];
  onSelect: (s: JourneyStage) => void;
}) {
  const idx = STAGES.indexOf(stage);
  const progress = idx / (STAGES.length - 1);

  return (
    <div className="card mt-1 overflow-hidden p-4 sm:p-5">
      {/* ---------- arch, >= 600px ---------- */}
      <div className="hidden sm:block">
        {/* Nodes and their labels are both positioned from the same curve
            sample, so they stay aligned at every width — a four-column grid
            underneath drifts away from the arc at the ends. */}
        <div className="relative pb-12">
          <svg viewBox="0 0 1000 104" className="w-full" aria-hidden="true">
            <path
              d={CURVE}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d={CURVE}
              fill="none"
              stroke="var(--color-plum-400)"
              strokeWidth="2"
              strokeLinecap="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - progress}
              style={{
                transition: "stroke-dashoffset .65s var(--ease-out-soft)",
              }}
            />
          </svg>

          {/* Nodes ride the curve, positioned in percentages of the same box. */}
          {STAGES.map((s, i) => {
            const t = i / (STAGES.length - 1);
            const p = pointAt(t);
            const done = i < idx;
            const active = s === stage;
            const seen = visited.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => onSelect(s)}
                aria-current={active ? "step" : undefined}
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(p.x / 1000) * 100}%`, top: `${(p.y / 104) * 100}%` }}
              >
                <span
                  className={`flex size-7 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all duration-300 ${
                    active
                      ? "scale-110 border-plum-500 bg-plum-500 text-white shadow-[0_4px_14px_-4px_rgba(91,62,104,.55)]"
                      : done
                        ? "border-plum-400 bg-plum-100 text-plum-600"
                        : seen
                          ? "border-line-strong bg-surface text-ink-muted"
                          : "border-line bg-surface text-ink-subtle group-hover:border-plum-300"
                  }`}
                >
                  {done ? <Tick /> : i + 1}
                </span>
              </button>
            );
          })}

          {STAGES.map((s, i) => {
            const t = i / (STAGES.length - 1);
            const p = pointAt(t);
            const active = s === stage;
            return (
              <button
                key={`${s}-label`}
                type="button"
                onClick={() => onSelect(s)}
                className="group absolute bottom-0 w-[150px] -translate-x-1/2 px-1 text-center"
                style={{ left: `${(p.x / 1000) * 100}%` }}
              >
                <span
                  className={`block font-display text-[15.5px] leading-tight transition-colors ${
                    active ? "text-ink" : "text-ink-muted group-hover:text-ink"
                  }`}
                >
                  {STAGE_META[s].label}
                </span>
                <span className="mt-0.5 block text-[11.5px] leading-tight text-ink-subtle">
                  {STAGE_META[s].caption}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------- vertical spine, < 600px ---------- */}
      <ol className="relative sm:hidden">
        <span
          className="absolute top-3 bottom-3 left-[13px] w-[2px] rounded-full bg-line"
          aria-hidden="true"
        />
        <span
          className="absolute top-3 left-[13px] w-[2px] rounded-full bg-plum-400 transition-[height] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ height: `calc(${progress * 100}% - ${progress * 24}px)` }}
          aria-hidden="true"
        />
        {STAGES.map((s, i) => {
          const done = i < idx;
          const active = s === stage;
          const seen = visited.includes(s);
          return (
            <li key={s}>
              <button
                type="button"
                onClick={() => onSelect(s)}
                aria-current={active ? "step" : undefined}
                className="flex w-full items-center gap-3.5 py-2 text-left"
              >
                <span
                  className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-semibold transition-all duration-300 ${
                    active
                      ? "border-plum-500 bg-plum-500 text-white"
                      : done
                        ? "border-plum-400 bg-plum-100 text-plum-600"
                        : seen
                          ? "border-line-strong bg-surface text-ink-muted"
                          : "border-line bg-surface text-ink-subtle"
                  }`}
                >
                  {done ? <Tick /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block font-display text-[16px] leading-tight ${
                      active ? "text-ink" : "text-ink-muted"
                    }`}
                  >
                    {STAGE_META[s].label}
                  </span>
                  <span className="block text-[11.5px] text-ink-subtle">
                    {STAGE_META[s].caption}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true">
      <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
    </svg>
  );
}
