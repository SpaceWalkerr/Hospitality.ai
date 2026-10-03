"use client";

import Link from "next/link";
import { AI_PROVIDER } from "@/lib/legal";

/**
 * Consent before anyone's own document is read.
 *
 * India's Digital Personal Data Protection Act asks for consent that is
 * informed and given by a clear affirmative act, so this is an unticked box
 * that says plainly where the text goes — including that, in Live mode, it
 * leaves our servers for an AI provider. The server refuses to read a
 * document without it (see lib/legal.ts), so the box cannot be skipped.
 *
 * Draft wording: to be confirmed by a lawyer before launch.
 */
export function Consent({
  checked,
  onChange,
  demo,
  id = "consent",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  demo: boolean;
  id?: string;
}) {
  return (
    <div className="rounded-[12px] border border-line bg-canvas p-3.5">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--color-plum-500)]"
        />
        <span className="text-xs leading-relaxed text-ink-muted">
          I agree that Hospitality may read this document to explain my cover.{" "}
          {demo
            ? "In this preview it is not sent to any AI service."
            : `To read it, the text is sent to our AI provider, ${AI_PROVIDER}.`}{" "}
          Hospitality does not store it, and it is cleared when I close this tab.
          I am the policyholder, or helping them with their permission, and I am
          18 or older.
        </span>
      </label>
      <p className="mt-2 pl-7 text-xs text-ink-subtle">
        <Link href="/privacy" className="underline underline-offset-2 hover:text-accent">
          Privacy notice
        </Link>
        <span aria-hidden="true"> · </span>
        <Link href="/terms" className="underline underline-offset-2 hover:text-accent">
          Terms of use
        </Link>
      </p>
    </div>
  );
}
