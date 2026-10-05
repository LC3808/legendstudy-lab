import { AdminError } from "./errors";

/**
 * Canonical `admin-v1` read contract.
 *
 * Every parser is fail-closed: anything that does not match the published shape
 * raises MALFORMED_RESPONSE rather than rendering a partial or invented figure.
 * Counts that the database reports as JSON null mean "the owning subsystem is
 * not installed" and are preserved as null all the way to the UI — they are
 * never coerced to 0.
 */
export const ADMIN_DTO_VERSION = "admin-v1";

export type AdminCount = number | null;

export type AdminDistribution = { key: string; count: number };

export type AdminDashboard = {
  asOf: string;
  members: {
    total: number;
    newToday: number;
    new7d: number;
    new30d: number;
    active30d: number;
  };
  profile: {
    gradeDistribution: AdminDistribution[];
    schoolDistribution: AdminDistribution[];
  };
  essay: {
    submissions: number;
    evaluationRequests: number;
    evaluationCompleted: number;
    evaluationFailed: number;
    rewrites: number;
    reevaluations: number;
  };
  math: {
    installed: boolean;
    runtimeState: string;
    runtimeLabel: string;
    attempts: AdminCount;
    evaluations: AdminCount;
  };
  credit: {
    spendable: number;
    expiring30d: number;
    grantedTotal: number;
    consumedTotal: number;
    availableByOrigin: Record<string, number>;
  };
  payment: {
    installed: boolean;
    runtimeState: string;
    runtimeLabel: string;
    orders: AdminCount;
  };
};

export type AdminMemberSummary = {
  accountId: string;
  email: string | null;
  createdAt: string;
  displayName: string | null;
  gradeLevel: string | null;
  schoolCode: string | null;
  accountState: string;
  spendable: number;
};

export type AdminSearchPage = {
  query: string;
  limit: number;
  offset: number;
  items: AdminMemberSummary[];
};

export type AdminDeletion = {
  requestId: string;
  state: string;
  phase: string;
  requestedAt: string | null;
  scheduledDeletionAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
};

export type AdminMemberDetail = {
  member: {
    accountId: string;
    email: string | null;
    createdAt: string;
    displayName: string | null;
    gradeLevel: string | null;
    schoolCode: string | null;
    schoolOfficeCode: string | null;
  };
  account: { state: string; deletion: AdminDeletion | null };
  usage: {
    study: {
      sessionsTotal: number;
      sessions30d: number;
      activeSecondsTotal: number;
      lastStartedAt: string | null;
    };
    essay: {
      attempts: number;
      submitted: number;
      evaluations: number;
      lastSubmittedAt: string | null;
    };
    math: {
      installed: boolean;
      runtimeState: string;
      attempts: AdminCount;
      evaluations: AdminCount;
    };
    mock: { attempts: number; lastSubmittedAt: string | null };
    library: { bookmarks: number; recentViews: number; lastViewedAt: string | null };
  };
};

export type AdminCreditSummary = {
  spendable: number;
  paid: number;
  free: number;
  other: number;
  reserved: number;
  nextExpiry: string | null;
};

export type AdminCreditGrant = {
  grantId: string;
  origin: string;
  createdAt: string;
  expiresAt: string | null;
  granted: number;
  balance: number;
  reserved: number;
  available: number;
  expired: boolean;
};

export type AdminCreditTransaction = {
  transactionId: string;
  grantId: string | null;
  transactionType: string;
  balanceDelta: number;
  reservedDelta: number;
  reasonCode: string | null;
  actorKind: string | null;
  reversalOf: string | null;
  createdAt: string;
};

export type AdminCredit = {
  accountId: string;
  summary: AdminCreditSummary | null;
  page: { limit: number; offset: number; grantsTotal: number; transactionsTotal: number };
  grants: AdminCreditGrant[];
  transactions: AdminCreditTransaction[];
};

// --- fail-closed primitives --------------------------------------------------

function bad(path: string): never {
  throw new AdminError("MALFORMED_RESPONSE", `malformed admin response at ${path}`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) bad(path);
  return value as Record<string, unknown>;
}

function str(value: unknown, path: string): string {
  if (typeof value !== "string") bad(path);
  return value;
}

function strOrNull(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null;
  return str(value, path);
}

function num(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) bad(path);
  return value;
}

function numOrNull(value: unknown, path: string): AdminCount {
  if (value === null || value === undefined) return null;
  return num(value, path);
}

function bool(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") bad(path);
  return value;
}

function arr(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) bad(path);
  return value;
}

function envelope(raw: unknown, path: string): Record<string, unknown> {
  const root = record(raw, path);
  if (root.dto_version !== ADMIN_DTO_VERSION) bad(`${path}.dto_version`);
  return root;
}

function distribution(value: unknown, path: string, keyField: string): AdminDistribution[] {
  return arr(value, path).map((entry, index) => {
    const row = record(entry, `${path}[${index}]`);
    return {
      key: str(row[keyField], `${path}[${index}].${keyField}`),
      count: num(row.count, `${path}[${index}].count`),
    };
  });
}

function originMap(value: unknown, path: string): Record<string, number> {
  const raw = record(value, path);
  const out: Record<string, number> = {};
  for (const [key, entry] of Object.entries(raw)) out[key] = num(entry, `${path}.${key}`);
  return out;
}

// --- parsers -----------------------------------------------------------------

export function parseDashboard(raw: unknown): AdminDashboard {
  const root = envelope(raw, "dashboard");
  const members = record(root.members, "dashboard.members");
  const profile = record(root.profile, "dashboard.profile");
  const essay = record(root.essay, "dashboard.essay");
  const math = record(root.math, "dashboard.math");
  const credit = record(root.credit, "dashboard.credit");
  const payment = record(root.payment, "dashboard.payment");
  return {
    asOf: str(root.as_of, "dashboard.as_of"),
    members: {
      total: num(members.total, "members.total"),
      newToday: num(members.new_today, "members.new_today"),
      new7d: num(members.new_7d, "members.new_7d"),
      new30d: num(members.new_30d, "members.new_30d"),
      active30d: num(members.active_30d, "members.active_30d"),
    },
    profile: {
      gradeDistribution: distribution(profile.grade_distribution, "profile.grade_distribution", "key"),
      schoolDistribution: distribution(
        profile.school_distribution,
        "profile.school_distribution",
        "school_code",
      ),
    },
    essay: {
      submissions: num(essay.submissions, "essay.submissions"),
      evaluationRequests: num(essay.evaluation_requests, "essay.evaluation_requests"),
      evaluationCompleted: num(essay.evaluation_completed, "essay.evaluation_completed"),
      evaluationFailed: num(essay.evaluation_failed, "essay.evaluation_failed"),
      rewrites: num(essay.rewrites, "essay.rewrites"),
      reevaluations: num(essay.reevaluations, "essay.reevaluations"),
    },
    math: {
      installed: bool(math.installed, "math.installed"),
      runtimeState: str(math.runtime_state, "math.runtime_state"),
      runtimeLabel: str(math.runtime_label, "math.runtime_label"),
      attempts: numOrNull(math.attempts, "math.attempts"),
      evaluations: numOrNull(math.evaluations, "math.evaluations"),
    },
    credit: {
      spendable: num(credit.spendable, "credit.spendable"),
      expiring30d: num(credit.expiring_30d, "credit.expiring_30d"),
      grantedTotal: num(credit.granted_total, "credit.granted_total"),
      consumedTotal: num(credit.consumed_total, "credit.consumed_total"),
      availableByOrigin: originMap(credit.available_by_origin, "credit.available_by_origin"),
    },
    payment: {
      installed: bool(payment.installed, "payment.installed"),
      runtimeState: str(payment.runtime_state, "payment.runtime_state"),
      runtimeLabel: str(payment.runtime_label, "payment.runtime_label"),
      orders: numOrNull(payment.orders, "payment.orders"),
    },
  };
}

function memberSummary(value: unknown, path: string): AdminMemberSummary {
  const row = record(value, path);
  return {
    accountId: str(row.account_id, `${path}.account_id`),
    email: strOrNull(row.email, `${path}.email`),
    createdAt: str(row.created_at, `${path}.created_at`),
    displayName: strOrNull(row.display_name, `${path}.display_name`),
    gradeLevel: strOrNull(row.grade_level, `${path}.grade_level`),
    schoolCode: strOrNull(row.school_code, `${path}.school_code`),
    accountState: str(row.account_state, `${path}.account_state`),
    spendable: num(row.spendable, `${path}.spendable`),
  };
}

export function parseSearchPage(raw: unknown): AdminSearchPage {
  const root = envelope(raw, "search");
  return {
    query: str(root.query, "search.query"),
    limit: num(root.limit, "search.limit"),
    offset: num(root.offset, "search.offset"),
    items: arr(root.items, "search.items").map((item, index) =>
      memberSummary(item, `search.items[${index}]`),
    ),
  };
}

export function parseMemberDetail(raw: unknown): AdminMemberDetail {
  const root = envelope(raw, "detail");
  const member = record(root.member, "detail.member");
  const account = record(root.account, "detail.account");
  const usage = record(root.usage, "detail.usage");
  const study = record(usage.study, "usage.study");
  const essay = record(usage.essay, "usage.essay");
  const math = record(usage.math, "usage.math");
  const mock = record(usage.mock, "usage.mock");
  const library = record(usage.library, "usage.library");

  let deletion: AdminDeletion | null = null;
  if (account.deletion !== null && account.deletion !== undefined) {
    const row = record(account.deletion, "account.deletion");
    deletion = {
      requestId: str(row.request_id, "deletion.request_id"),
      state: str(row.state, "deletion.state"),
      phase: str(row.phase, "deletion.phase"),
      requestedAt: strOrNull(row.requested_at, "deletion.requested_at"),
      scheduledDeletionAt: strOrNull(row.scheduled_deletion_at, "deletion.scheduled_deletion_at"),
      cancelledAt: strOrNull(row.cancelled_at, "deletion.cancelled_at"),
      completedAt: strOrNull(row.completed_at, "deletion.completed_at"),
    };
  }

  return {
    member: {
      accountId: str(member.account_id, "member.account_id"),
      email: strOrNull(member.email, "member.email"),
      createdAt: str(member.created_at, "member.created_at"),
      displayName: strOrNull(member.display_name, "member.display_name"),
      gradeLevel: strOrNull(member.grade_level, "member.grade_level"),
      schoolCode: strOrNull(member.school_code, "member.school_code"),
      schoolOfficeCode: strOrNull(member.school_office_code, "member.school_office_code"),
    },
    account: { state: str(account.state, "account.state"), deletion },
    usage: {
      study: {
        sessionsTotal: num(study.sessions_total, "study.sessions_total"),
        sessions30d: num(study.sessions_30d, "study.sessions_30d"),
        activeSecondsTotal: num(study.active_seconds_total, "study.active_seconds_total"),
        lastStartedAt: strOrNull(study.last_started_at, "study.last_started_at"),
      },
      essay: {
        attempts: num(essay.attempts, "essay.attempts"),
        submitted: num(essay.submitted, "essay.submitted"),
        evaluations: num(essay.evaluations, "essay.evaluations"),
        lastSubmittedAt: strOrNull(essay.last_submitted_at, "essay.last_submitted_at"),
      },
      math: {
        installed: bool(math.installed, "math.installed"),
        runtimeState: str(math.runtime_state, "math.runtime_state"),
        attempts: numOrNull(math.attempts, "math.attempts"),
        evaluations: numOrNull(math.evaluations, "math.evaluations"),
      },
      mock: {
        attempts: num(mock.attempts, "mock.attempts"),
        lastSubmittedAt: strOrNull(mock.last_submitted_at, "mock.last_submitted_at"),
      },
      library: {
        bookmarks: num(library.bookmarks, "library.bookmarks"),
        recentViews: num(library.recent_views, "library.recent_views"),
        lastViewedAt: strOrNull(library.last_viewed_at, "library.last_viewed_at"),
      },
    },
  };
}

export function parseCredit(raw: unknown): AdminCredit {
  const root = envelope(raw, "credit");
  const page = record(root.page, "credit.page");

  let summary: AdminCreditSummary | null = null;
  if (root.summary !== null && root.summary !== undefined) {
    const row = record(root.summary, "credit.summary");
    summary = {
      spendable: num(row.spendable, "summary.spendable"),
      paid: num(row.paid, "summary.paid"),
      free: num(row.free, "summary.free"),
      other: num(row.other, "summary.other"),
      reserved: num(row.reserved, "summary.reserved"),
      nextExpiry: strOrNull(row.next_expiry, "summary.next_expiry"),
    };
  }

  return {
    accountId: str(root.account_id, "credit.account_id"),
    summary,
    page: {
      limit: num(page.limit, "page.limit"),
      offset: num(page.offset, "page.offset"),
      grantsTotal: num(page.grants_total, "page.grants_total"),
      transactionsTotal: num(page.transactions_total, "page.transactions_total"),
    },
    grants: arr(root.grants, "credit.grants").map((entry, index) => {
      const row = record(entry, `grants[${index}]`);
      return {
        grantId: str(row.grant_id, `grants[${index}].grant_id`),
        origin: str(row.origin, `grants[${index}].origin`),
        createdAt: str(row.created_at, `grants[${index}].created_at`),
        expiresAt: strOrNull(row.expires_at, `grants[${index}].expires_at`),
        granted: num(row.granted, `grants[${index}].granted`),
        balance: num(row.balance, `grants[${index}].balance`),
        reserved: num(row.reserved, `grants[${index}].reserved`),
        available: num(row.available, `grants[${index}].available`),
        expired: bool(row.expired, `grants[${index}].expired`),
      };
    }),
    transactions: arr(root.transactions, "credit.transactions").map((entry, index) => {
      const row = record(entry, `transactions[${index}]`);
      return {
        transactionId: str(row.transaction_id, `transactions[${index}].transaction_id`),
        grantId: strOrNull(row.grant_id, `transactions[${index}].grant_id`),
        transactionType: str(row.transaction_type, `transactions[${index}].transaction_type`),
        balanceDelta: num(row.balance_delta, `transactions[${index}].balance_delta`),
        reservedDelta: num(row.reserved_delta, `transactions[${index}].reserved_delta`),
        reasonCode: strOrNull(row.reason_code, `transactions[${index}].reason_code`),
        actorKind: strOrNull(row.actor_kind, `transactions[${index}].actor_kind`),
        reversalOf: strOrNull(row.reversal_of, `transactions[${index}].reversal_of`),
        createdAt: str(row.created_at, `transactions[${index}].created_at`),
      };
    }),
  };
}
