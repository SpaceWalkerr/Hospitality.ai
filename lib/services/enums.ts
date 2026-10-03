import * as z from "zod/v4";

/**
 * Tolerant enums for structured output.
 *
 * The SDK's strict-schema transform does not pass `enum` through to the API —
 * it folds the allowed values into the field's description. So the model sees
 * them as guidance, not as a constraint, and will occasionally answer
 * "Single Private A/C Room" where we asked for "Single Private". With a plain
 * `z.enum` that one word fails the parse and takes the whole extraction down
 * with an error the user cannot act on.
 *
 * So these fields are declared as strings carrying the allowed values in their
 * description, and mapped onto the enum afterwards. When a value cannot be
 * matched we fall back to the option that UNDERSTATES cover — telling someone
 * they are entitled to less than they are is recoverable at the hospital desk;
 * telling them they are entitled to more is not.
 */

export function enumField(values: readonly string[], hint = "") {
  const list = values.map((v) => `"${v}"`).join(", ");
  return z
    .string()
    .describe(`${hint ? `${hint} ` : ""}Answer with exactly one of: ${list}.`);
}

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export type Picked<T extends string> = { value: T; exact: boolean };

/**
 * Maps a free-text answer onto an allowed value: exact, then case/punctuation
 * insensitive, then synonyms, then containment, then the conservative fallback.
 */
export function pickEnum<T extends string>(
  raw: string | null | undefined,
  values: readonly T[],
  fallback: T,
  synonyms: Record<string, T> = {},
): Picked<T> {
  if (!raw) return { value: fallback, exact: false };
  if ((values as readonly string[]).includes(raw)) return { value: raw as T, exact: true };

  const s = squash(raw);
  const byShape = values.find((v) => squash(v) === s);
  if (byShape) return { value: byShape, exact: true };

  for (const [needle, target] of Object.entries(synonyms)) {
    const n = squash(needle);
    if (n && s.includes(n)) return { value: target, exact: true };
  }

  const contained = values.find((v) => s.includes(squash(v)) || squash(v).includes(s));
  if (contained && s.length >= 3) return { value: contained, exact: true };

  return { value: fallback, exact: false };
}

/* ---------------- the specific vocabularies ---------------- */

export const ROOM_CATEGORIES = [
  "General Ward",
  "Twin Sharing",
  "Single Private",
  "Deluxe",
  "Suite",
  "ICU",
  "HDU",
] as const;

/** Order matters: the more specific phrase is checked first. */
export const ROOM_SYNONYMS: Record<string, (typeof ROOM_CATEGORIES)[number]> = {
  "semi private": "Twin Sharing",
  "semi-private": "Twin Sharing",
  "twin": "Twin Sharing",
  "shared": "Twin Sharing",
  "double": "Twin Sharing",
  "single": "Single Private",
  "private": "Single Private",
  "deluxe": "Deluxe",
  "suite": "Suite",
  "intensive care": "ICU",
  "high dependency": "HDU",
  "general": "General Ward",
  "ward": "General Ward",
};

export const CAP_MODES = [
  "percent_of_sum_insured_per_day",
  "absolute_per_day",
  "category_capped",
  "no_limit",
] as const;

/**
 * Order matters. "Absolute, not linked to the sum insured" mentions the sum
 * insured, so the absolute phrasings have to be tried before it.
 */
export const CAP_SYNONYMS: Record<string, (typeof CAP_MODES)[number]> = {
  "no limit": "no_limit",
  "unlimited": "no_limit",
  "absolute": "absolute_per_day",
  "fixed": "absolute_per_day",
  "rupee": "absolute_per_day",
  "category": "category_capped",
  "ward": "category_capped",
  "percent": "percent_of_sum_insured_per_day",
  "sum insured": "percent_of_sum_insured_per_day",
};

/**
 * A cap mode the model described in its own words. If nothing matches, infer
 * from the number it gave: a small number is a percentage, a large one is
 * rupees. With no number at all, treat it as category-capped — combined with a
 * General Ward fallback that is the most conservative reading available.
 */
export function pickCapMode(
  raw: string | null | undefined,
  capValue: number | null,
): Picked<(typeof CAP_MODES)[number]> {
  const picked = pickEnum(raw, CAP_MODES, "category_capped", CAP_SYNONYMS);
  if (picked.exact) return picked;
  if (capValue != null && capValue > 0 && capValue <= 100) {
    return { value: "percent_of_sum_insured_per_day", exact: false };
  }
  if (capValue != null && capValue > 100) return { value: "absolute_per_day", exact: false };
  return picked;
}
