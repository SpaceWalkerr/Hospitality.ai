"use client";

import { AppShell } from "@/components/AppShell";
import { ButtonLink, EmptyState } from "@/components/ui";

export default function NotFound() {
  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <EmptyState
          title="This page isn’t here"
          body="The link may be old, or the address mistyped. Your session is safe — nothing has been lost."
          action={<ButtonLink href="/">Back to the start</ButtonLink>}
        />
      </div>
    </AppShell>
  );
}
