"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle, Close, Info, Alert } from "./Icons";

/**
 * Toasts: instant, low-stakes confirmation that an action landed.
 *
 * One polite live region, newest at the bottom, at most three on screen.
 * An action (usually "Undo") extends the timeout so there is time to reach
 * it. Never used for anything the reader must not miss — those are inline.
 */

type Tone = "success" | "info" | "error";
type ToastInput = {
  title: string;
  description?: string;
  tone?: Tone;
  action?: { label: string; onClick: () => void };
  duration?: number;
};
type ToastItem = ToastInput & { id: number };

const Ctx = createContext<((t: ToastInput) => void) | null>(null);

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((xs) => xs.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: ToastInput) => {
      const id = ++seq.current;
      setItems((xs) => [...xs.slice(-2), { ...t, id }]);
      const ms = t.duration ?? (t.action ? 7000 : 3800);
      timers.current.set(id, setTimeout(() => dismiss(id), ms));
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((t) => (
          <Toast key={t.id} item={t} onClose={() => dismiss(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  );
}

const TONE: Record<Tone, { Icon: typeof Info; color: string }> = {
  success: { Icon: CheckCircle, color: "text-sage-500" },
  info: { Icon: Info, color: "text-plum-400" },
  error: { Icon: Alert, color: "text-clay-500" },
};

function Toast({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const { Icon, color } = TONE[item.tone ?? "success"];
  return (
    <div className="animate-toast pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border border-line bg-surface/95 py-3 pr-2 pl-4 shadow-[var(--shadow-lg)] backdrop-blur-md">
      <Icon className={`mt-0.5 size-[18px] shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 text-xs text-ink-muted">{item.description}</p>
        )}
      </div>
      {item.action && (
        <button
          type="button"
          onClick={() => {
            item.action!.onClick();
            onClose();
          }}
          className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft"
        >
          {item.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunk hover:text-ink"
      >
        <Close className="size-3.5" />
      </button>
    </div>
  );
}
