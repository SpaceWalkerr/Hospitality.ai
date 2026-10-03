import type { Hospital, Insurer, Locality } from "@/lib/types";
import dataset from "./dataset.json";

/**
 * The hospital network.
 *
 * The bundled data is illustrative: fictional Bengaluru facilities whose rates,
 * packages and empanelment are sized against publicly discussed ranges, so the
 * matching engine produces trade-offs that behave like real ones. Every record
 * says so in its `source`, and the UI labels it. Real data replaces it through
 * the spreadsheets in data/hospitals/ — see data/hospitals/README.md.
 *
 * Callers go through listHospitals()/getHospital(), so a database can replace
 * the JSON later without touching them.
 */

export const LOCALITIES: Locality[] = [
  { id: "jayanagar", label: "Jayanagar", coords: { lat: 12.925, lng: 77.5938 } },
  { id: "whitefield", label: "Whitefield", coords: { lat: 12.9698, lng: 77.75 } },
  { id: "hebbal", label: "Hebbal", coords: { lat: 13.0358, lng: 77.597 } },
  { id: "koramangala", label: "Koramangala", coords: { lat: 12.9352, lng: 77.6245 } },
  { id: "rajajinagar", label: "Rajajinagar", coords: { lat: 12.9916, lng: 77.5526 } },
];

/** Insurer ids used as keys in `Hospital.empanelment`. */

/**
 * Generated from the spreadsheets in data/hospitals/ by
 * `npm run data:import`, which validates every row first. Edit the CSVs,
 * never this JSON; CI fails if the two disagree.
 */
const DATASET = dataset as unknown as { insurers: Insurer[]; hospitals: Hospital[] };
const HOSPITALS: Hospital[] = DATASET.hospitals;

/** Insurers the dataset knows about, and the words that identify them. */
export function listInsurers(): Insurer[] {
  return DATASET.insurers;
}

/** Presets that seed the case context — condition, likely specialty, typical stay. */
export const CONDITION_PRESETS = [
  { id: "cardiac", label: "Chest pain / suspected cardiac event", specialty: "Cardiology", days: 4, procedure: "Angioplasty (single stent)", urgency: "emergency" as const, fallbackCost: 250000 },
  { id: "appendix", label: "Acute abdominal pain / appendicitis", specialty: "General Surgery", days: 3, procedure: "Appendectomy (laparoscopic)", urgency: "emergency" as const, fallbackCost: 70000 },
  { id: "stroke", label: "Sudden weakness / suspected stroke", specialty: "Neurology", days: 6, procedure: "Stroke thrombolysis + ICU", urgency: "emergency" as const, fallbackCost: 260000 },
  { id: "knee", label: "Planned knee replacement", specialty: "Orthopaedics", days: 5, procedure: "Knee replacement (unilateral)", urgency: "planned" as const, fallbackCost: 300000 },
  { id: "delivery", label: "Planned caesarean delivery", specialty: "Obstetrics", days: 4, procedure: "Caesarean delivery", urgency: "planned" as const, fallbackCost: 80000 },
  { id: "cataract", label: "Planned cataract surgery", specialty: "Ophthalmology", days: 1, procedure: "Cataract surgery (phaco + IOL)", urgency: "planned" as const, fallbackCost: 30000 },
];

/** Repository seam — swap for a DB query later without changing callers. */
export function listHospitals(): Hospital[] {
  return HOSPITALS;
}

export function getHospital(id: string): Hospital | undefined {
  return HOSPITALS.find((h) => h.id === id);
}

export function getLocality(id: string): Locality {
  return LOCALITIES.find((l) => l.id === id) ?? LOCALITIES[0];
}
