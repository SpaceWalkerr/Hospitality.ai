import { ArchField } from "./Ornament";
import { Check, Doc, Spark } from "./ui/Icons";

/**
 * The hero visual: the product answering the question people actually ask at
 * the admission desk, framed by the arch. Every figure is real output from the
 * bundled Meridian sample (clause 1.2, the ₹5,000 cap, the top-ranked
 * hospital), so the preview never promises something the app doesn't do.
 */
export function HeroPreview() {
  return (
    <figure
      className="relative mx-auto w-full max-w-[520px] select-none"
      aria-label="Example: Hospitality answers whether a private room is covered, citing clause 1.2 of the policy, and shows the best-matched hospital."
    >
      <div aria-hidden="true" className="pointer-events-none absolute -inset-x-10 -top-10 bottom-6 text-plum-300">
        <ArchField className="h-full w-full" />
      </div>
      <div
        aria-hidden="true"
        className="absolute top-1/4 left-1/2 size-[70%] -translate-x-1/2 rounded-full opacity-60 blur-[70px]"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--color-glow) 45%, transparent), transparent 70%)" }}
      />

      <div aria-hidden="true" className="relative pt-10 pb-14 sm:pt-14">
        {/* Floating: sum insured */}
        <div className="animate-float absolute top-0 right-0 z-10 rounded-2xl border border-line bg-surface/95 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur sm:-right-4">
          <div className="label">Sum insured</div>
          <div className="figure mt-1 text-xl text-ink">₹5,00,000</div>
        </div>

        {/* The answer */}
        <div className="card-verdict relative mx-2 p-5 sm:mx-6 sm:p-6">
          <div className="label flex items-center gap-2 !text-plum-400">
            <Spark /> You asked
          </div>
          <p className="mt-2 font-display text-xl text-ink sm:text-2xl">
            Can we take a private room?
          </p>
          <div className="mt-4 h-px bg-line" />
          <p className="mt-4 text-sm text-ink-muted sm:text-base">
            Yes — up to <span className="figure text-ink">₹5,000</span> a day.
            Go above that and this policy pays less on{" "}
            <em className="font-display text-ink not-italic sm:italic">every</em>{" "}
            other charge too, not just the room.
          </p>

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-ink-muted">Single Private at Kaveri</span>
              <span className="figure text-ink">₹11,500/day</span>
            </div>
            <div className="relative mt-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-surface-sunk">
                <div className="h-full w-[39%] rounded-full bg-viz-good" />
                <span className="w-[2px] bg-surface" />
                <div
                  className="h-full w-[50%] rounded-full bg-viz-bad"
                  style={{ backgroundImage: "repeating-linear-gradient(115deg, rgba(255,255,255,.3) 0 3px, transparent 3px 7px)" }}
                />
              </div>
              <span className="absolute -top-[3px] bottom-[-3px] left-[39%] w-[2px] rounded-full bg-ink/70" />
            </div>
          </div>

          <div className="mt-4 inline-flex min-h-7 items-center gap-1.5 rounded-full border border-plum-200 bg-plum-50 px-2.5 text-label font-medium text-plum-600">
            <Doc /> Clause 1.2
            <span className="mx-0.5 h-3 w-px bg-plum-200" />
            <Check className="size-3 text-sage-600" /> Verified in source
          </div>
        </div>

        {/* Floating: best match */}
        <div className="animate-float absolute bottom-0 left-0 z-10 flex items-center gap-3 rounded-2xl border border-line bg-surface/95 py-3 pr-4 pl-3 shadow-[var(--shadow-md)] backdrop-blur [animation-delay:-3s] sm:-left-4">
          <span className="figure grid size-9 place-items-center rounded-full bg-accent text-sm text-accent-fg">
            01
          </span>
          <div>
            <div className="text-xs font-medium text-ink">Sanjeevani Multispeciality</div>
            <div className="text-label text-ink-subtle">
              In network · you pay <span className="figure text-sage-700">₹9,800</span>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
