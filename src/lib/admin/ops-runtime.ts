/**
 * Release-authority runtime state for the 수리논술 (Math) product line.
 *
 * This is a release-process fact, not a database fact, which is why it is not
 * read from the API. The two are deliberately kept apart on screen:
 *
 *   - the database read reports DEPLOYMENT — whether the Math schema is present
 *     and complete (see `admin_math_operations`), and
 *   - this constant reports the SWITCH — whether the shipped runtime is serving
 *     students.
 *
 * A partially deployed schema and a switched-off runtime are different
 * situations and an operator has to be able to tell them apart.
 *
 * SOURCE OF TRUTH for these two booleans is the ADMIN-P0-C release note:
 * Math has an approved release candidate, and its Production runtime is off.
 * When either changes, this file changes with it; nothing else in the console
 * should carry a second copy of this claim.
 */
export const MATH_RUNTIME = {
  /** A release candidate exists and is approved. */
  rcReady: true,
  /** The Production runtime switch, which is off. */
  runtimeEnabled: false,
} as const;

/** "RC READY / RUNTIME OFF" — the two facts as one operator-facing line. */
export function mathRuntimeLabel(): string {
  const rc = MATH_RUNTIME.rcReady ? "RC READY" : "RC NONE";
  const runtime = MATH_RUNTIME.runtimeEnabled ? "RUNTIME ON" : "RUNTIME OFF";
  return `${rc} / ${runtime}`;
}