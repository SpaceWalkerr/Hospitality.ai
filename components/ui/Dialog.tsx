"use client";

import { useEffect, useRef, useState } from "react";
import { Close } from "./Icons";

/**
 * Modal surfaces: a centred Modal and a responsive Sheet (bottom sheet on
 * phones, right-hand side panel from 640px).
 *
 * Both handle the parts that are easy to forget: focus moves into the dialog
 * on open, Tab is trapped inside it, Escape closes it, focus returns to
 * whatever opened it, and the page behind stops scrolling. They stay mounted
 * through the exit transition so closing animates too.
 */

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function useDialog(open: boolean, onClose: () => void) {
  const panel = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    const t = setTimeout(() => setMounted(false), 280);
    return () => clearTimeout(t);
  }, [open]);

  // Runs once the panel is actually in the DOM: on first open the dialog
  // mounts one render after `open` flips, so keying on `open` alone would
  // look for focus targets that don't exist yet.
  useEffect(() => {
    if (!open || !mounted) return;
    const opener = document.activeElement as HTMLElement | null;
    const raf = requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>("[data-autofocus]") ??
        panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel.current)?.focus({ preventScroll: true });
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (n) => n.offsetParent !== null,
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      opener?.focus?.({ preventScroll: true });
    };
  }, [open, mounted]);

  return { panel, mounted };
}

function Backdrop({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      aria-hidden="true"
      className="absolute inset-0 bg-[#0d0a10]/40 backdrop-blur-[3px] transition-opacity duration-300"
      style={{ opacity: shown ? 1 : 0 }}
    />
  );
}

export function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  const { panel, mounted } = useDialog(open, onClose);
  const [shown, setShown] = useState(false);

  // One frame at the closed position before sliding in, so opening animates.
  useEffect(() => {
    if (!mounted) return;
    const r = requestAnimationFrame(() => setShown(open));
    return () => cancelAnimationFrame(r);
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50" style={{ pointerEvents: open ? "auto" : "none" }}>
      <Backdrop shown={shown} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`absolute right-0 bottom-0 flex max-h-[88dvh] w-full flex-col rounded-t-[22px] bg-surface shadow-[var(--shadow-sheet)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none sm:top-0 sm:h-full sm:max-h-none sm:w-[min(540px,92vw)] sm:rounded-none sm:rounded-l-[22px] ${
          shown ? "translate-x-0 translate-y-0" : "translate-y-[102%] sm:translate-x-[102%] sm:translate-y-0"
        }`}
      >
        <span className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line-strong sm:hidden" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { panel, mounted } = useDialog(open, onClose);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!mounted) return;
    const r = requestAnimationFrame(() => setShown(open));
    return () => cancelAnimationFrame(r);
  }, [open, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6" style={{ pointerEvents: open ? "auto" : "none" }}>
      <Backdrop shown={shown} onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        className={`relative w-full max-w-md rounded-[22px] border border-line bg-surface p-5 shadow-[var(--shadow-lg)] transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus:outline-none sm:p-6 ${
          shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.98] opacity-0"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="modal-title" className="font-display text-2xl text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mt-1 -mr-1 flex size-9 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            <Close />
          </button>
        </div>
        {description && <p className="mt-2 text-base text-ink-muted">{description}</p>}
        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
