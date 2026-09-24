"use client";

import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { ButtonLink, ErrorState } from "@/components/ui";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell>
      <div className="mx-auto max-w-xl px-4 py-20 sm:px-6">
        <ErrorState
          title="This screen hit a problem"
          message="Something went wrong while drawing this page. Your policy and choices are still saved in this tab — trying again usually works."
          onRetry={reset}
          secondary={
            <ButtonLink href="/" variant="secondary" size="sm">
              Go to the start
            </ButtonLink>
          }
        />
      </div>
    </AppShell>
  );
}
