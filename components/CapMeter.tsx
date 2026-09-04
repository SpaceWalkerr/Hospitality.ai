"use client";

import { inr } from "@/lib/services/matchingEngine";

/**
 * The room-rent picture, in one bar.
 *
 * Room rent against the policy's daily cap is the single most consequential
 * number in an Indian hospital admission, and it is almost never presented
 * visually. Over-cap is drawn as an overhang past the limit line rather than
 * as a longer bar, so the excess reads as excess.
 */
export function CapMeter({
  rate,
  cap,
  label,
  compact = false,
}: {
  rate: number;
  cap: number | null;
  label?: string;
  compact?: boolean;
}) {
  const ceiling = Math.max(rate, cap ?? rate) * 1.12;
  const ratePct = (rate / ceiling) * 100;
  const capPct = cap != null ? (cap / ceiling) * 100 : null;
  const over = cap != null && rate > cap;
  const withinPct = cap != null ? Math.min(ratePct, capPct!) : ratePct;
  const overPct = over ? ratePct - capPct! : 0;

  return (
    <div className={compact ? "" : "space-y-2"}>
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[12.5px] font-medium text-ink-muted">{label}</span>
          <span className="tnum text-[12.5px] font-semibold text-ink">
            {inr(rate)}
            <span className="font-normal text-ink-subtle">/day</span>
          </span>
        </div>
      )}
      <div className="relative">
        <div className="flex h-[9px] w-full overflow-hidden rounded-full bg-surface-sunk">
          <div
            className="h-full rounded-l-full bg-sage-500 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${withinPct}%` }}
          />
          {over && (
            <div
              className="h-full bg-clay-500 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{
                width: `${overPct}%`,
                backgroundImage:
                  "repeating-linear-gradient(115deg, rgba(255,255,255,.28) 0 3px, transparent 3px 7px)",
              }}
            />
          )}
        </div>
        {capPct != null && (
          <div
            className="absolute -top-[3px] bottom-[-3px] w-[2px] rounded-full bg-ink/70"
            style={{ left: `calc(${capPct}% - 1px)` }}
            aria-hidden="true"
          />
        )}
      </div>
      {!compact && (
        <div className="flex items-center justify-between gap-3 text-[11.5px]">
          <span className={over ? "font-medium text-clay-600" : "text-sage-700"}>
            {cap == null
              ? "No cap stated"
              : over
                ? `${inr(rate - cap)}/day over your limit`
                : `${inr(cap - rate)}/day of headroom`}
          </span>
          <span className="tnum text-ink-subtle">
            {cap != null ? `Limit ${inr(cap)}` : ""}
          </span>
        </div>
      )}
    </div>
  );
}
