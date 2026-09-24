"use client";

import { Button } from "./Button";
import { Refresh } from "./Icons";

/**
 * Empty and error states. Both always offer a way forward — a screen that
 * only says "nothing here" is a dead end for someone already under stress.
 */

function ArchGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden="true" className={className}>
      <path d="M6 46V26a26 26 0 0 1 52 0v20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".45" />
      <path d="M17 46V29a15 15 0 0 1 30 0v17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
      <path d="M27 46V35a5 5 0 0 1 10 0v11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({
  title,
  body,
  action,
  compact = false,
}: {
  title: string;
  body?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center text-center ${
        compact ? "px-4 py-6" : "card-quiet border-dashed px-6 py-12"
      }`}
    >
      <ArchGlyph className="h-10 w-14 text-plum-400" />
      <h3 className="mt-4 font-display text-xl text-ink">{title}</h3>
      {body && <p className="mt-1.5 max-w-sm text-base text-ink-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Something didn’t go through",
  message,
  onRetry,
  secondary,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
  secondary?: React.ReactNode;
}) {
  return (
    <div role="alert" className="card border-clay-300/70 p-5 sm:p-6">
      <div className="flex items-start gap-3.5">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-clay-100 text-clay-600">
          <svg viewBox="0 0 20 20" className="size-5" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a.9.9 0 01.9.9v4.2a.9.9 0 11-1.8 0V6.9A.9.9 0 0110 6zm0 8.6a1.05 1.05 0 110-2.1 1.05 1.05 0 010 2.1z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-xl text-ink">{title}</h3>
          <p className="mt-1 text-base text-ink-muted">{message}</p>
          {(onRetry || secondary) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {onRetry && (
                <Button onClick={onRetry} size="sm">
                  <Refresh className="size-3.5" /> Try again
                </Button>
              )}
              {secondary}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
