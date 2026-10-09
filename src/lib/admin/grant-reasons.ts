/**
 * Canonical Credit grant origin/reason pairs.
 *
 * Mirrors the allowlist enforced inside `public.essay_admin_grant`. It lives in
 * a plain module so both the browser form and the Cloudflare finance boundary
 * read one definition; the database remains the authority and refuses anything
 * outside this set.
 */
export const CREDIT_GRANT_REASONS: Record<string, readonly string[]> = {
  admin_grant: ["test_account", "manual_support"],
  promotion: ["operational_promotion"],
  compensation: ["customer_compensation"],
  b2b_program: ["program_allocation"],
};

export const CREDIT_GRANT_MAX_QUANTITY = 100;
