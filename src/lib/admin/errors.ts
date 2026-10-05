/**
 * Admin console error taxonomy.
 *
 * These are consumer states, not database facts. The UI switches on `kind`, and
 * the states must never collapse into one another: an empty list is not an
 * authorization failure, and an uninstalled backend is not a network error.
 *
 * Authorization is enforced by the database. Everything here is how the console
 * *describes* that outcome.
 */
export type AdminErrorKind =
  | "UNAUTHENTICATED"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "INVALID_REQUEST"
  | "NOT_INSTALLED"
  | "NETWORK"
  | "MALFORMED_RESPONSE"
  | "UNKNOWN";

/** Carries only a stable `kind` and a short, non-sensitive message. */
export class AdminError extends Error {
  readonly kind: AdminErrorKind;

  constructor(kind: AdminErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "AdminError";
    this.kind = kind;
    Object.setPrototypeOf(this, AdminError.prototype);
  }
}

export function isAdminError(value: unknown): value is AdminError {
  return value instanceof AdminError;
}

export function adminErrorKind(value: unknown): AdminErrorKind {
  return isAdminError(value) ? value.kind : "UNKNOWN";
}

type RpcErrorLike = { code?: string | null; message?: string | null };

/**
 * The canonical functions raise:
 *   PT401 OPERATOR_REQUIRED / AUTH_REQUIRED   not an operator, or no session
 *   PT404 MEMBER_NOT_FOUND                    account id does not resolve
 *   PT422 INVALID_*                           rejected request argument
 * PGRST202 / "does not exist" means the read migration is not applied yet,
 * which is reported distinctly from a request failure so an operator is not told
 * to retry something that cannot succeed.
 */
export function mapRpcError(error: RpcErrorLike | null | undefined): AdminError {
  const code = error?.code ?? "";
  const raw = typeof error?.message === "string" ? error.message : "";
  const lower = raw.toLowerCase();

  if (code === "PT401") return new AdminError("UNAUTHORIZED", "operator access required");
  if (code === "PT403") return new AdminError("UNAUTHORIZED", "operator access required");
  if (code === "42501") return new AdminError("UNAUTHORIZED", "operator access required");
  if (code === "PT404" || code === "P0002" || code === "PGRST116") {
    return new AdminError("NOT_FOUND", "member not found");
  }
  if (code === "PT422" || code === "22004" || code === "22P02") {
    return new AdminError("INVALID_REQUEST", "invalid request argument");
  }
  if (code === "PGRST202" || code === "42883" || /could not find the function|does not exist/.test(lower)) {
    return new AdminError("NOT_INSTALLED", "admin read boundary is not installed");
  }
  if (/jwt|unauthor|not authenticated|permission denied/.test(lower)) {
    return new AdminError("UNAUTHORIZED", "operator access required");
  }
  if (/fetch|network|timeout|connection|failed to send/.test(lower)) {
    return new AdminError("NETWORK", "network request failed");
  }
  return new AdminError("UNKNOWN", "request failed");
}

/** Operator-facing copy for each state. Never leaks a raw provider message. */
export function adminErrorCopy(kind: AdminErrorKind): { title: string; body: string } {
  switch (kind) {
    case "UNAUTHENTICATED":
      return {
        title: "로그인이 필요합니다",
        body: "운영 콘솔은 로그인한 운영자만 사용할 수 있습니다.",
      };
    case "UNAUTHORIZED":
      return {
        title: "운영자 권한이 없습니다",
        body: "이 계정은 운영 관리자 목록에 없습니다. 필요하면 운영 담당자에게 권한을 요청하세요.",
      };
    case "NOT_INSTALLED":
      return {
        title: "운영 조회 기능이 아직 연결되지 않았습니다",
        body: "조회용 데이터베이스 함수가 이 환경에 적용되지 않았습니다. 적용 후 다시 시도하세요.",
      };
    case "NOT_FOUND":
      return { title: "대상을 찾을 수 없습니다", body: "검색 조건을 다시 확인하세요." };
    case "INVALID_REQUEST":
      return { title: "검색 조건을 확인하세요", body: "이메일 또는 계정 ID를 정확히 입력하세요." };
    case "NETWORK":
      return { title: "연결이 원활하지 않습니다", body: "잠시 후 다시 시도하세요." };
    default:
      return { title: "조회하지 못했습니다", body: "잠시 후 다시 시도하세요." };
  }
}

/**
 * A short operator-facing sentence for a failed write.
 *
 * The console never surfaces a raw provider or Postgres message, so this maps
 * the failure to the same bounded copy the read panels use.
 */
export function describeError(error: unknown): string {
  const copy = adminErrorCopy(adminErrorKind(error));
  return `${copy.title}. ${copy.body}`;
}
