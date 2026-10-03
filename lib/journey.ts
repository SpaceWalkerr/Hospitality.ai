import type { JourneyStage } from "@/lib/types";

/**
 * The four stages of a stay, and how they are labelled. Shared by the journey
 * copilot (server) and the stage tracker (browser), so it imports nothing but
 * types.
 */

export const STAGES: JourneyStage[] = [
  "admission",
  "investigation",
  "procedure",
  "recovery",
];

export const STAGE_META: Record<
  JourneyStage,
  { label: string; caption: string; blurb: string }
> = {
  admission: {
    label: "Admission",
    caption: "Getting a bed",
    blurb:
      "Pre-authorisation, room choice and the paperwork the insurance desk will ask for.",
  },
  investigation: {
    label: "Investigation",
    caption: "Tests and diagnosis",
    blurb:
      "Which investigations sit inside the claim, and which are billed separately.",
  },
  procedure: {
    label: "Procedure",
    caption: "Treatment and surgery",
    blurb:
      "Implants, consumables and enhancement requests — where estimates move the most.",
  },
  recovery: {
    label: "Recovery",
    caption: "Discharge and claim",
    blurb:
      "Final bill scrutiny, discharge summary, and the window for post-hospitalisation costs.",
  },
};
