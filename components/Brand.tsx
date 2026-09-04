export function Mark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3.5 28.5V16a12.5 12.5 0 0 1 25 0v12.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M11.5 28.5V21a4.5 4.5 0 0 1 9 0v7.5"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <circle cx="16" cy="12.4" r="2.1" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Mark className="h-[22px] w-[22px] text-plum-500" />
      <span className="font-display text-[19px] leading-none font-medium tracking-[-0.02em] text-ink">
        Hospitality
      </span>
      {!compact && (
        <span className="hidden text-[11px] leading-none font-medium tracking-[0.14em] text-ink-subtle uppercase sm:inline">
          Care navigation
        </span>
      )}
    </span>
  );
}
