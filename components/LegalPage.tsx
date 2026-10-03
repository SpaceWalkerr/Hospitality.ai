import Link from "next/link";
import { AppShell } from "./AppShell";
import { LEGAL_UPDATED } from "@/lib/legal";

/**
 * Layout for the privacy notice and terms.
 *
 * Both are drafts until a lawyer has reviewed them, and the page says so at the
 * top rather than in small print: a reader deciding whether to upload a health
 * document deserves to know how settled these promises are.
 */
export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: React.ReactNode;
  sections: { id: string; heading: string; body: React.ReactNode }[];
}) {
  return (
    <AppShell>
      <article className="mx-auto max-w-[760px] px-4 pt-10 pb-20 sm:px-6 lg:pt-14">
        <div className="label text-accent">{eyebrow}</div>
        <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-subtle">Last updated {LEGAL_UPDATED}</p>

        <div
          role="note"
          className="mt-6 rounded-[12px] border border-ochre-300/60 bg-ochre-50 p-4 text-sm text-ochre-700"
        >
          <strong className="font-semibold">Draft, under legal review.</strong>{" "}
          This describes how Hospitality works today, accurately, but it has not
          yet been reviewed by a lawyer and may change before launch.
        </div>

        <div className="mt-8 text-base leading-[1.75] text-ink-muted">{intro}</div>

        <nav aria-label="On this page" className="mt-8 rounded-[14px] border border-line bg-surface p-5">
          <h2 className="label font-sans">On this page</h2>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {sections.map((s, i) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-ink-muted hover:text-accent">
                  <span className="figure mr-2 font-normal text-ink-subtle">{i + 1}.</span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="mt-12 scroll-mt-28">
            <h2 className="font-display text-2xl text-ink">
              <span className="figure mr-2 text-lg text-ink-subtle">{i + 1}.</span>
              {s.heading}
            </h2>
            <div className="legal-prose mt-4 space-y-4 text-base leading-[1.75] text-ink-muted">
              {s.body}
            </div>
          </section>
        ))}

        <p className="mt-16 border-t border-line pt-6 text-sm text-ink-subtle">
          See also: <Link href="/privacy" className="underline underline-offset-2 hover:text-accent">Privacy notice</Link>
          {" · "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-accent">Terms of use</Link>
          {" · "}
          <Link href="/#boundaries" className="underline underline-offset-2 hover:text-accent">What Hospitality will never do</Link>
        </p>
      </article>
    </AppShell>
  );
}
