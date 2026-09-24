"use client";

import Link from "next/link";
import { forwardRef } from "react";

/**
 * One button, five intents, three sizes.
 *
 * primary   the single thing this view wants you to do (one per view)
 * secondary a real alternative
 * ghost     low-emphasis, inline
 * soft      tinted accent: selected states, "choose this"
 * danger    destructive
 *
 * Disabled keeps its colour at reduced opacity rather than turning grey, so
 * the label stays readable. Loading keeps the width steady and announces
 * itself via aria-busy.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "soft" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45";

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-[var(--shadow-glow)] hover:bg-accent-hover hover:shadow-[0_14px_34px_-12px_color-mix(in_oklab,var(--color-accent)_70%,transparent)]",
  secondary:
    "border border-line-strong bg-surface text-ink shadow-[var(--shadow-xs)] hover:border-plum-300 hover:bg-plum-50",
  ghost: "text-ink-muted hover:bg-surface-sunk hover:text-ink",
  soft: "bg-accent-soft text-accent hover:bg-plum-200/70",
  danger: "bg-clay-500 text-white hover:bg-clay-600 dark:text-canvas",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-6 text-base",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = "",
) {
  return `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`;
}

type Common = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  className?: string;
};

export const Button = forwardRef<
  HTMLButtonElement,
  Common & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function Button(
  { variant = "primary", size = "md", loading = false, className = "", children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner />}
      <span className={`inline-flex items-center gap-2 ${loading ? "opacity-80" : ""}`}>
        {children}
      </span>
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={`${className} animate-spin`} fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
