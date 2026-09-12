/**
 * The arch motif.
 *
 * The wordmark is a portico — a doorway you are welcomed through — and the
 * same arch is the only decorative form in the product. Reusing one shape
 * everywhere is what makes a two-colour palette read as an identity rather
 * than as a theme.
 */

/** A drawn arch, used as the hero's backdrop. */
export function ArchField({ className = "" }: { className?: string }) {
  const arcs = [0, 1, 2, 3, 4, 5];
  return (
    <svg
      viewBox="0 0 420 300"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {arcs.map((i) => {
        const inset = i * 30;
        const w = 420 - inset * 2;
        const r = w / 2;
        const top = 300 - r;
        return (
          <path
            key={i}
            d={`M ${inset} 300 L ${inset} ${top} A ${r} ${r} 0 0 1 ${420 - inset} ${top} L ${420 - inset} 300`}
            stroke="currentColor"
            strokeWidth={i === 0 ? 1.6 : 1}
            strokeLinecap="round"
            opacity={0.55 - i * 0.075}
            className="animate-draw"
            style={{
              ["--len" as string]: 1400,
              animationDelay: `${140 + i * 130}ms`,
            }}
          />
        );
      })}
    </svg>
  );
}

/** Section divider: a hairline interrupted by a small arch. */
export function ArchRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line" />
      <svg viewBox="0 0 28 16" fill="none" className="h-4 w-7 text-plum-300">
        <path
          d="M2 15V9a12 12 0 0 1 24 0v6"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line" />
    </div>
  );
}

/** The soft, slowly drifting washes behind the hero. */
export function AmbientWash() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="drift-a absolute -top-[28%] -left-[12%] size-[62vw] rounded-full opacity-55 blur-[90px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(139,102,153,0.30), rgba(139,102,153,0) 68%)",
        }}
      />
      <div
        className="drift-b absolute -top-[16%] -right-[16%] size-[52vw] rounded-full opacity-50 blur-[90px]"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(196,132,74,0.26), rgba(196,132,74,0) 68%)",
        }}
      />
      <div
        className="drift-a absolute top-[38%] left-[34%] size-[40vw] rounded-full opacity-40 blur-[100px]"
        style={{
          animationDelay: "-8s",
          background:
            "radial-gradient(circle at 50% 50%, rgba(94,140,106,0.22), rgba(94,140,106,0) 70%)",
        }}
      />
    </div>
  );
}
