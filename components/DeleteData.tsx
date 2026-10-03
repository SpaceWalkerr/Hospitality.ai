"use client";

import { useEffect, useState } from "react";
import { Button, Modal, useToast } from "./ui";
import { stopPersisting } from "@/lib/store";

/**
 * Delete my data.
 *
 * Hospitality keeps nothing on its servers, so "your data" is whatever this
 * browser holds: the session (document text, the reading of it, case details)
 * in sessionStorage, and the theme preference in localStorage. This removes
 * every key the app wrote and reloads, so no copy survives in memory either.
 *
 * Unlike "Start over" there is deliberately no Undo — a deletion you can take
 * back is not a deletion.
 */

const PREFIX = "hospitality.";

function wipe() {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i);
        if (k?.startsWith(PREFIX)) keys.push(k);
      }
      keys.forEach((k) => store.removeItem(k));
    } catch {
      /* storage blocked: nothing was saved there in the first place */
    }
  }
}

export function DeleteDataButton({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-6 items-center text-sm text-ink-muted transition-colors hover:text-accent ${className}`}
      >
        Delete my data
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your data from this browser?"
        description="This removes the policy you added, our reading of it, your hospital choices and your theme setting. It can’t be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                // Stop the page re-saving first, or an answer still streaming
                // in could write the session back after the wipe.
                stopPersisting();
                wipe();
                // A full reload, not a route change: nothing may survive in memory.
                window.location.replace("/?deleted=1");
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Hospitality does not keep your document on its servers, so this is
          the only copy there is.
        </p>
      </Modal>
    </>
  );
}

/** Confirms a deletion after the reload, then tidies the address bar. */
export function DeletedNotice() {
  const toast = useToast();
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("deleted") !== "1") return;
    toast({
      title: "Your data was deleted",
      description: "Nothing from your session remains in this browser.",
      tone: "success",
    });
    url.searchParams.delete("deleted");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [toast]);
  return null;
}
