"use client";

import { useId, useRef } from "react";

/**
 * Segmented control, in two semantic flavours:
 *   as="tabs"  — switches a panel (role=tablist/tab, aria-controls)
 *   as="radio" — picks a value (role=radiogroup/radio)
 * Both use a roving tabindex with arrow-key movement, so the group is a
 * single Tab stop, as the ARIA patterns expect.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  as = "radio",
  size = "md",
  idPrefix,
  className = "",
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, React.ReactNode])[];
  label: string;
  as?: "tabs" | "radio";
  size?: "sm" | "md";
  idPrefix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const auto = useId();
  const prefix = idPrefix ?? auto;
  const tabs = as === "tabs";

  const move = (dir: 1 | -1) => {
    const i = options.findIndex(([id]) => id === value);
    const next = options[(i + dir + options.length) % options.length][0];
    onChange(next);
    ref.current?.querySelector<HTMLElement>(`[data-id="${next}"]`)?.focus();
  };

  return (
    <div
      ref={ref}
      role={tabs ? "tablist" : "radiogroup"}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
      className={`flex rounded-full border border-line bg-surface-sunk p-1 ${className}`}
    >
      {options.map(([id, text]) => {
        const on = id === value;
        return (
          <button
            key={id}
            data-id={id}
            id={`${prefix}-tab-${id}`}
            type="button"
            role={tabs ? "tab" : "radio"}
            aria-selected={tabs ? on : undefined}
            aria-checked={tabs ? undefined : on}
            aria-controls={tabs ? `${prefix}-panel-${id}` : undefined}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(id)}
            className={`flex-1 rounded-full font-medium whitespace-nowrap transition-[background-color,color,box-shadow] duration-200 ${
              size === "sm" ? "min-h-8 px-3 text-xs" : "min-h-10 px-2 text-sm sm:px-3.5"
            } ${
              on
                ? "bg-surface text-ink shadow-[var(--shadow-xs)]"
                : "text-ink-subtle hover:text-ink"
            }`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Tab panel paired with a Segmented as="tabs". */
export function TabPanel({
  id,
  prefix,
  children,
  className = "",
}: {
  id: string;
  prefix: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${prefix}-panel-${id}`}
      aria-labelledby={`${prefix}-tab-${id}`}
      className={className}
    >
      {children}
    </div>
  );
}

/** A filter toggle. aria-pressed carries the state; the tick shows it. */
export function Chip({
  active,
  onClick,
  children,
  count,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color] duration-150 active:scale-[0.97] ${
        active
          ? "border-plum-300 bg-accent-soft text-accent"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      <span
        className={`grid size-4 place-items-center rounded-full transition-all duration-200 ${
          active ? "bg-accent text-accent-fg" : "border border-line-strong"
        }`}
        aria-hidden="true"
      >
        {active && (
          <svg viewBox="0 0 16 16" className="size-3" fill="currentColor">
            <path d="M6.2 11.4 3.3 8.5l1.1-1.1 1.8 1.8 4.4-4.4 1.1 1.1z" />
          </svg>
        )}
      </span>
      {children}
      {count != null && (
        <span className="figure text-label font-medium text-ink-subtle">{count}</span>
      )}
    </button>
  );
}

/** Labelled form field. Hint and error are wired to the control via aria. */
export function Field({
  label,
  hint,
  error,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: (props: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="label mb-1.5 block">
        {label}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-subtle">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 text-xs font-medium text-clay-600">
          {error}
        </p>
      )}
    </div>
  );
}
