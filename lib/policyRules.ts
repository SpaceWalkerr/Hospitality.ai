/**
 * Pure policy rules shared by the matching engine (server) and the screens
 * that explain its results (browser). No imports, so it is safe in either.
 */

/**
 * A co-payment that applies only above a certain age is left out of the
 * estimate and surfaced as a condition instead — quietly charging a 38-year-old
 * a senior-citizen co-pay would make every number wrong.
 *
 * The wording has to actually restrict it. "regardless of age" mentions age but
 * imposes no condition, and treating that as conditional understates what the
 * patient owes, which is the more damaging direction to be wrong in.
 */
export function coPayIsConditional(appliesTo: string): boolean {
  const t = appliesTo.toLowerCase();
  if (/senior citizen/.test(t)) return true;
  const namesAnAgeThreshold = /\b(5[5-9]|6\d|7\d|8\d)\b/.test(t);
  if (!namesAnAgeThreshold) return false;
  return !/\b(regardless|irrespective)\b/.test(t);
}
