import { formatDate } from "@/lib/format";
import type { DataSource } from "@/lib/types";
import { Pill } from "./ui";

/**
 * Where a hospital's figures came from.
 *
 * The demo dataset is invented, and a hospital name with a confident rate next
 * to it reads as fact — so illustrative data says so on every card, and real
 * data says how old it is, because empanelment and tariffs change.
 */
export function SourceLabel({ source }: { source: DataSource }) {
  if (source.kind === "illustrative") {
    return <Pill tone="neutral">Illustrative data</Pill>;
  }
  const from = {
    insurer_network_list: "Insurer network list",
    hospital_provided: "From the hospital",
    government_portal: "Government portal",
  }[source.kind];
  return (
    <Pill tone="neutral">
      {from} · checked {formatDate(source.asOf)}
    </Pill>
  );
}

/** One line above a list when any of it is illustrative. */
export function IllustrativeNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="note" className="mt-3 rounded-[12px] border border-line bg-surface-sunk px-3.5 py-2.5 text-sm text-ink-muted">
      <strong className="font-semibold text-ink">These hospitals are illustrative.</strong>{" "}
      Their names, rates, beds and network status are invented for this preview.
      Don’t use them to choose a real hospital.
    </p>
  );
}
