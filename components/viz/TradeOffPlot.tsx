"use client";

import { useMemo, useState } from "react";
import type { HospitalMatch, NormalizedPolicy } from "@/lib/types";
import { inr } from "@/lib/services/matchingEngine";

/**
 * The trade-off plot.
 *
 * The brief's hardest requirement is to make trade-offs explicit rather than
 * buried, and the trade-off in a hospital choice is two-dimensional: how far
 * you travel against how much you end up paying. A ranked list flattens that
 * into one number. Plotting it puts the shape of the decision on one screen —
 * the cheap-and-close corner, and what it costs to leave it.
 *
 * Form: scatter, because the job is "find the sweet spot across two measures
 * while telling network state apart". Network state is a STATE, so it wears
 * the reserved status trio, never categorical series colours — and per the
 * status rule it is never colour alone: each state also carries its own shape
 * and appears in the legend with a label. Three states is also the all-pairs
 * series cap, which is what the palette was validated against.
 *
 * The ranked list beneath this chart is its table view: every value plotted
 * here is readable there without hovering anything.
 */

type Band = "good" | "warn" | "bad";

const BAND: Record<
  Band,
  { label: string; color: string; wash: string; shape: Shape }
> = {
  good: {
    label: "In network, cashless",
    color: "var(--color-viz-good)",
    wash: "var(--color-viz-good-wash)",
    shape: "circle",
  },
  warn: {
    label: "Reimbursed, you pay first",
    color: "var(--color-viz-warn)",
    wash: "var(--color-viz-warn-wash)",
    shape: "square",
  },
  bad: {
    label: "Nothing payable here",
    color: "var(--color-viz-bad)",
    wash: "var(--color-viz-bad-wash)",
    shape: "triangle",
  },
};

type Shape = "circle" | "square" | "triangle";

function bandFor(m: HospitalMatch, policy: NormalizedPolicy): Band {
  if (m.inNetwork && m.cashless) return "good";
  if (m.inNetwork || policy.reimbursement.outOfNetworkAllowed) return "warn";
  return "bad";
}

/** ₹0 / ₹48k / ₹1.5L — Indian grouping, short enough for an axis tick. */
function compactInr(n: number): string {
  if (n >= 100000) {
    const l = n / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(1)}L`;
  }
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n}`;
}

/** Clean tick stops at or above the data ceiling. */
function ticks(max: number, count = 4): number[] {
  if (max <= 0) return [0];
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? mag * 10;
  const out: number[] = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(Math.round(v));
  return out;
}

const W = 680;
const H = 360;
const PAD = { top: 22, right: 26, bottom: 46, left: 62 };

export function TradeOffPlot({
  matches,
  policy,
  selectedId,
  onSelect,
}: {
  matches: HospitalMatch[];
  policy: NormalizedPolicy;
  selectedId?: string | null;
  onSelect?: (hospitalId: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);

  const points = useMemo(
    () =>
      matches
        .filter((m) => m.estimate)
        .map((m) => ({
          id: m.hospital.id,
          name: m.hospital.name,
          area: m.hospital.area,
          x: m.distanceKm,
          y: m.estimate!.patientPays,
          room: m.bestRoom?.room.category ?? "—",
          band: bandFor(m, policy),
          rank: matches.indexOf(m) + 1,
        })),
    [matches, policy],
  );

  if (!points.length) return null;

  const xMax = Math.max(2, ...points.map((p) => p.x)) * 1.1;
  const yMax = Math.max(1, ...points.map((p) => p.y)) * 1.12;
  const xTicks = ticks(xMax, 4);
  const yTicks = ticks(yMax, 4);

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const sx = (v: number) => PAD.left + (v / xMax) * plotW;
  const sy = (v: number) => PAD.top + plotH - (v / yMax) * plotH;

  // Cheapest option gets the one direct label — labelling every point is noise.
  const best = points.reduce((a, b) => (b.y < a.y ? b : a), points[0]);
  const hovered = points.find((p) => p.id === active) ?? null;
  const bandsPresent = (["good", "warn", "bad"] as Band[]).filter((b) =>
    points.some((p) => p.band === b),
  );

  return (
    <figure className="m-0">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Distance against what you pay, for ${points.length} hospitals. Lowest cost: ${best.name} at ${inr(best.y)} and ${best.x} kilometres.`}
        >
          {/* Recessive grid: hairline, solid, one step off the surface. */}
          {yTicks.map((t) => (
            <line
              key={`y${t}`}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={sy(t)}
              y2={sy(t)}
              stroke="var(--color-viz-grid)"
              strokeWidth="1"
            />
          ))}
          {yTicks.map((t) => (
            <text
              key={`yl${t}`}
              x={PAD.left - 10}
              y={sy(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="figure"
              fontSize="11"
              fill="var(--color-ink-subtle)"
            >
              {compactInr(t)}
            </text>
          ))}
          {xTicks.map((t) => (
            <text
              key={`xl${t}`}
              x={sx(t)}
              y={H - PAD.bottom + 18}
              textAnchor="middle"
              className="figure"
              fontSize="11"
              fill="var(--color-ink-subtle)"
            >
              {t}
            </text>
          ))}

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={H - PAD.bottom}
            y2={H - PAD.bottom}
            stroke="var(--color-line-strong)"
            strokeWidth="1"
          />

          <text
            x={sx(xTicks[xTicks.length - 1])}
            y={H - 8}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-ink-subtle)"
          >
            Distance from you (km)
          </text>
          <text
            x={PAD.left - 52}
            y={PAD.top - 7}
            fontSize="10.5"
            fontWeight="600"
            letterSpacing="0.08em"
            fill="var(--color-ink-subtle)"
          >
            WHAT YOU PAY
          </text>

          {points.map((p) => {
            const meta = BAND[p.band];
            const isActive = active === p.id;
            const isSelected = selectedId === p.id;
            return (
              <g key={p.id}>
                {isSelected && (
                  <circle
                    cx={sx(p.x)}
                    cy={sy(p.y)}
                    r="12"
                    fill="none"
                    stroke="var(--color-plum-400)"
                    strokeWidth="1.5"
                  />
                )}
                <Mark
                  shape={meta.shape}
                  x={sx(p.x)}
                  y={sy(p.y)}
                  color={meta.color}
                  emphasised={isActive || isSelected}
                />
                {/* Hit target far larger than the 9px mark. */}
                <circle
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r="15"
                  fill="transparent"
                  tabIndex={0}
                  role="button"
                  aria-label={`${p.name}, ${p.area}. ${inr(p.y)} out of pocket, ${p.x} km away. ${meta.label}.`}
                  className="cursor-pointer outline-none"
                  onPointerEnter={() => setActive(p.id)}
                  onPointerLeave={() => setActive((a) => (a === p.id ? null : a))}
                  onFocus={() => setActive(p.id)}
                  onBlur={() => setActive((a) => (a === p.id ? null : a))}
                  onClick={() => onSelect?.(p.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(p.id);
                    }
                  }}
                />
              </g>
            );
          })}

          {/* One direct label, on the cheapest option, set above the mark with
              a short leader — the low-cost options crowd the baseline, so
              there is never room beside them but always room above. */}
          {!hovered && (
            <g>
              <line
                x1={sx(best.x)}
                x2={sx(best.x)}
                y1={sy(best.y) - 9}
                y2={sy(best.y) - 19}
                stroke="var(--color-line-strong)"
                strokeWidth="1"
              />
              <text
                x={Math.min(Math.max(sx(best.x), PAD.left + 40), W - PAD.right - 40)}
                y={sy(best.y) - 25}
                fontSize="11"
                fontWeight="600"
                textAnchor="middle"
                fill="var(--color-ink-muted)"
              >
                {best.name.split(" ").slice(0, 2).join(" ")} · cheapest
              </text>
            </g>
          )}
        </svg>

        {hovered && (
          <Tooltip
            point={hovered}
            left={(sx(hovered.x) / W) * 100}
            top={(sy(hovered.y) / H) * 100}
          />
        )}
      </div>

      {/* Legend: always present for two or more series, shape + label so the
          state never depends on hue. */}
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-3">
        {bandsPresent.map((b) => {
          const meta = BAND[b];
          return (
            <span key={b} className="inline-flex items-center gap-2">
              <svg viewBox="0 0 14 14" className="size-3.5" aria-hidden="true">
                <Mark shape={meta.shape} x={7} y={7} color={meta.color} />
              </svg>
              <span className="text-[12px] text-ink-muted">{meta.label}</span>
            </span>
          );
        })}
        <span className="ml-auto text-[11.5px] text-ink-subtle">
          Every value here is listed below
        </span>
      </figcaption>
    </figure>
  );
}

/** Composite encoding — shape carries the state alongside hue. */
function Mark({
  shape,
  x,
  y,
  color,
  emphasised = false,
}: {
  shape: Shape;
  x: number;
  y: number;
  color: string;
  emphasised?: boolean;
}) {
  const s = emphasised ? 6 : 4.8;
  const common = {
    fill: color,
    // 2px surface ring keeps overlapping marks legible.
    stroke: "var(--color-surface)",
    strokeWidth: 2,
    style: { transition: "all .18s var(--ease-out-soft)" },
  };

  if (shape === "circle") return <circle cx={x} cy={y} r={s} {...common} />;
  if (shape === "square") {
    return (
      <rect
        x={x - s}
        y={y - s}
        width={s * 2}
        height={s * 2}
        rx={1.2}
        {...common}
      />
    );
  }
  const h = s * 1.15;
  return (
    <polygon
      points={`${x},${y - h} ${x + h},${y + h * 0.72} ${x - h},${y + h * 0.72}`}
      {...common}
    />
  );
}

function Tooltip({
  point,
  left,
  top,
}: {
  point: {
    name: string;
    area: string;
    x: number;
    y: number;
    room: string;
    band: Band;
    rank: number;
  };
  left: number;
  top: number;
}) {
  const meta = BAND[point.band];
  const flip = left > 62;
  return (
    <div
      className="pointer-events-none absolute z-10 w-[188px] rounded-[10px] border border-line bg-surface p-2.5 shadow-[var(--shadow-lift)]"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        transform: `translate(${flip ? "calc(-100% - 14px)" : "14px"}, -50%)`,
      }}
    >
      {/* Value leads, label follows. */}
      <div className="figure text-[17px] leading-none text-ink">
        {inr(point.y)}
      </div>
      <div className="mt-0.5 text-[11px] text-ink-subtle">
        out of your pocket · {point.x} km
      </div>
      <div className="mt-2 border-t border-line pt-2 text-[12px] leading-snug font-medium text-ink">
        {point.name}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        {/* Line key, not a box. */}
        <svg viewBox="0 0 14 6" className="h-1.5 w-3.5" aria-hidden="true">
          <rect width="14" height="6" rx="3" fill={meta.color} />
        </svg>
        <span className="text-[11px] text-ink-muted">{meta.label}</span>
      </div>
      <div className="mt-1 text-[11px] text-ink-subtle">
        Ranked #{point.rank} · {point.room}
      </div>
    </div>
  );
}
