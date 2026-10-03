/**
 * Shared constants for consent and the legal pages.
 *
 * Plain values only — imported by both the browser and the API routes, so the
 * server can refuse to read someone's own document unless the request carries
 * consent to the current wording. Bump CONSENT_VERSION whenever the consent
 * text changes in substance; older consents then stop being accepted.
 */

export const CONSENT_VERSION = "2026-10-03";

/** The day the privacy notice and terms were last changed. */
export const LEGAL_UPDATED = "3 October 2026";

/** Who reads the document in Live mode. Named in the consent and the notice. */
export const AI_PROVIDER = "Anthropic";

/**
 * Where privacy requests and grievances go. The Digital Personal Data
 * Protection Act requires this to be published. Set it before launch:
 *
 *   NEXT_PUBLIC_PRIVACY_EMAIL=privacy@yourdomain.in
 */
export const PRIVACY_EMAIL = process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? null;

/** How long the rate limiter keeps a client's IP-keyed counter, at most. */
export const RATE_LIMIT_IP_RETENTION = "20 minutes";
