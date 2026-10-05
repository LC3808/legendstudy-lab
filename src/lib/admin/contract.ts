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

// --- ADMIN-P0-B: payment operations read ------------------------------------

export type AdminPaymentOrder = {
  orderId: string;
  subjectId: string | null;
  sku: string;
  amount: number;
  quantity: number;
  currency: string;
  mode: string;
  state: string;
  grantState: string;
  provider: string;
  paidAt: string | null;
  createdAt: string;
  creditExpiresAt: string | null;
  reconciliationRequired: boolean;
  refundable: boolean;
};

export type AdminPaymentPage = {
  asOf: string;
  installed: boolean;
  runtimeState: string;
  runtimeLabel: string;
  mode: string;
  total: AdminCount;
  limit: number;
  offset: number;
  orders: AdminPaymentOrder[] | null;
};

export function parsePaymentPage(raw: unknown): AdminPaymentPage {
  const root = envelope(raw, "payment");
  return {
    asOf: str(root.as_of, "payment.as_of"),
    installed: bool(root.installed, "payment.installed"),
    runtimeState: str(root.runtime_state, "payment.runtime_state"),
    runtimeLabel: str(root.runtime_label, "payment.runtime_label"),
    mode: str(root.mode, "payment.mode"),
    total: numOrNull(root.total, "payment.total"),
    limit: num(root.limit, "payment.limit"),
    offset: num(root.offset, "payment.offset"),
    orders:
      root.orders === null || root.orders === undefined
        ? null
        : arr(root.orders, "payment.orders").map((entry, index) => {
            const row = record(entry, `orders[${index}]`);
            return {
              orderId: str(row.order_id, `orders[${index}].order_id`),
              subjectId: strOrNull(row.subject_id, `orders[${index}].subject_id`),
              sku: str(row.sku, `orders[${index}].sku`),
              amount: num(row.amount, `orders[${index}].amount`),
              quantity: num(row.quantity, `orders[${index}].quantity`),
              currency: str(row.currency, `orders[${index}].currency`),
              mode: str(row.mode, `orders[${index}].mode`),
              state: str(row.state, `orders[${index}].state`),
              grantState: str(row.grant_state, `orders[${index}].grant_state`),
              provider: str(row.provider, `orders[${index}].provider`),
              paidAt: strOrNull(row.paid_at, `orders[${index}].paid_at`),
              createdAt: str(row.created_at, `orders[${index}].created_at`),
              creditExpiresAt: strOrNull(
                row.credit_expires_at,
                `orders[${index}].credit_expires_at`,
              ),
              reconciliationRequired: bool(
                row.reconciliation_required,
                `orders[${index}].reconciliation_required`,
              ),
              refundable: bool(row.refundable, `orders[${index}].refundable`),
            };
          }),
  };
}

// --- ADMIN-P0-B: 1:1 inquiry -------------------------------------------------

export const INQUIRY_CATEGORIES = [
  "account",
  "material",
  "essay_humanities",
  "essay_math",
  "credit",
  "payment",
  "deletion",
  "technical",
  "other",
] as const;

export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

export const INQUIRY_STATUSES = ["RECEIVED", "IN_PROGRESS", "ANSWERED", "CLOSED"] as const;

export type InquiryStatus = (typeof INQUIRY_STATUSES)[number];

export type InquiryRow = {
  inquiryId: string;
  status: string;
  category: string;
  title: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  preview: string;
};

export type AdminInquiryPage = {
  asOf: string;
  total: number;
  open: number;
  limit: number;
  offset: number;
  items: InquiryRow[];
};

export type AdminInquiryReply = {
  replyId: string;
  authorId: string;
  body: string;
  createdAt: string;
  delivery: string;
  attempts: number;
};

export type AdminInquiryDetail = {
  asOf: string;
  inquiry: {
    inquiryId: string;
    category: string;
    title: string;
    body: string;
    status: string;
    submittedAt: string;
    updatedAt: string;
    answeredAt: string | null;
    closedAt: string | null;
  };
  member: {
    accountId: string;
    gradeLevel: string | null;
    accountState: string | null;
    spendable: number | null;
  };
  replies: AdminInquiryReply[];
  statusEvents: { fromStatus: string | null; toStatus: string; actorKind: string; createdAt: string }[];
  related: { essayEvaluations: AdminCount; paymentOrders: AdminCount };
};

export type AdminSupportMetrics = {
  open: number;
  newToday: number;
  inProgress: number;
  answered: number;
  closed: number;
  oldestOpenId: string | null;
  oldestOpenAt: string | null;
  firstResponseSeconds: AdminCount;
  failedDeliveries: number;
};

function inquiryRow(value: unknown, path: string): InquiryRow {
  const row = record(value, path);
  return {
    inquiryId: str(row.inquiry_id, `${path}.inquiry_id`),
    status: str(row.status, `${path}.status`),
    category: str(row.category, `${path}.category`),
    title: str(row.title, `${path}.title`),
    userId: str(row.user_id, `${path}.user_id`),
    createdAt: str(row.created_at, `${path}.created_at`),
    updatedAt: str(row.updated_at, `${path}.updated_at`),
    replyCount: num(row.reply_count, `${path}.reply_count`),
    preview: str(row.preview, `${path}.preview`),
  };
}

export function parseInquiryPage(raw: unknown): AdminInquiryPage {
  const root = envelope(raw, "inquiry");
  return {
    asOf: str(root.as_of, "inquiry.as_of"),
    total: num(root.total, "inquiry.total"),
    open: num(root.open, "inquiry.open"),
    limit: num(root.limit, "inquiry.limit"),
    offset: num(root.offset, "inquiry.offset"),
    items: arr(root.items, "inquiry.items").map((entry, index) =>
      inquiryRow(entry, `items[${index}]`),
    ),
  };
}

export function parseInquiryDetail(raw: unknown): AdminInquiryDetail {
  const root = envelope(raw, "inquiryDetail");
  const inquiry = record(root.inquiry, "inquiryDetail.inquiry");
  const member = record(root.member, "inquiryDetail.member");
  const related = record(root.related, "inquiryDetail.related");
  return {
    asOf: str(root.as_of, "inquiryDetail.as_of"),
    inquiry: {
      inquiryId: str(inquiry.inquiry_id, "inquiry.inquiry_id"),
      category: str(inquiry.category, "inquiry.category"),
      title: str(inquiry.title, "inquiry.title"),
      body: str(inquiry.body, "inquiry.body"),
      status: str(inquiry.status, "inquiry.status"),
      submittedAt: str(inquiry.submitted_at, "inquiry.submitted_at"),
      updatedAt: str(inquiry.updated_at, "inquiry.updated_at"),
      answeredAt: strOrNull(inquiry.answered_at, "inquiry.answered_at"),
      closedAt: strOrNull(inquiry.closed_at, "inquiry.closed_at"),
    },
    member: {
      accountId: str(member.account_id, "member.account_id"),
      gradeLevel: strOrNull(member.grade_level, "member.grade_level"),
      accountState: strOrNull(member.account_state, "member.account_state"),
      spendable: numOrNull(member.spendable, "member.spendable"),
    },
    replies: arr(root.replies, "inquiryDetail.replies").map((entry, index) => {
      const row = record(entry, `replies[${index}]`);
      return {
        replyId: str(row.reply_id, `replies[${index}].reply_id`),
        authorId: str(row.author_id, `replies[${index}].author_id`),
        body: str(row.body, `replies[${index}].body`),
        createdAt: str(row.created_at, `replies[${index}].created_at`),
        delivery: str(row.delivery, `replies[${index}].delivery`),
        attempts: num(row.attempts, `replies[${index}].attempts`),
      };
    }),
    statusEvents: arr(root.status_events, "inquiryDetail.status_events").map((entry, index) => {
      const row = record(entry, `status_events[${index}]`);
      return {
        fromStatus: strOrNull(row.from_status, `status_events[${index}].from_status`),
        toStatus: str(row.to_status, `status_events[${index}].to_status`),
        actorKind: str(row.actor_kind, `status_events[${index}].actor_kind`),
        createdAt: str(row.created_at, `status_events[${index}].created_at`),
      };
    }),
    related: {
      essayEvaluations: numOrNull(related.essay_evaluations, "related.essay_evaluations"),
      paymentOrders: numOrNull(related.payment_orders, "related.payment_orders"),
    },
  };
}

export function parseSupportMetrics(raw: unknown): AdminSupportMetrics {
  const root = record(raw, "support");
  return {
    open: num(root.open, "support.open"),
    newToday: num(root.new_today, "support.new_today"),
    inProgress: num(root.in_progress, "support.in_progress"),
    answered: num(root.answered, "support.answered"),
    closed: num(root.closed, "support.closed"),
    oldestOpenId: strOrNull(root.oldest_open_id, "support.oldest_open_id"),
    oldestOpenAt: strOrNull(root.oldest_open_at, "support.oldest_open_at"),
    firstResponseSeconds: numOrNull(root.first_response_seconds, "support.first_response_seconds"),
    failedDeliveries: num(root.failed_deliveries, "support.failed_deliveries"),
  };
}

// --- ADMIN-P0-B: member-facing inquiry --------------------------------------

export type MyInquiryRow = {
  inquiryId: string;
  category: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  answered: boolean;
};

export function parseMyInquiries(raw: unknown): MyInquiryRow[] {
  const root = record(raw, "myInquiries");
  if (root.dto_version !== "inquiry-v1") bad("myInquiries.dto_version");
  return arr(root.items, "myInquiries.items").map((entry, index) => {
    const row = record(entry, `items[${index}]`);
    return {
      inquiryId: str(row.inquiry_id, `items[${index}].inquiry_id`),
      category: str(row.category, `items[${index}].category`),
      title: str(row.title, `items[${index}].title`),
      status: str(row.status, `items[${index}].status`),
      createdAt: str(row.created_at, `items[${index}].created_at`),
      updatedAt: str(row.updated_at, `items[${index}].updated_at`),
      answered: bool(row.answered, `items[${index}].answered`),
    };
  });
}
