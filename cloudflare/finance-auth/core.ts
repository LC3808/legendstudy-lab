/** Server-only renewal state machine. One named Durable Object owns this state. */
export const TTL = 7 * 24 * 3600;
export const RENEW_BEFORE = TTL / 5;
export const MIN_VALIDITY = 60;
export type Credential = { token: string; issued: number; expires: number; fingerprint: string };
export type State = { active?: Credential; previous?: Credential; rejected?: string; lastSuccess?: number; lastFailure?: number; lastError?: string; failures: number; retryAt: number; checkedAt?: number; probedAt?: number };
export type Status = { healthy: boolean; automatic: true; expiresAt: number | null; remainingSeconds: number; lastSuccess: number | null; lastFailure: number | null; lastError: string | null; retryAt: number; checkedAt: number | null; warning: boolean };
export interface Store { load(): Promise<State | undefined>; save(state: State): Promise<void>; alarm(at: number): Promise<void> }
export interface Dependencies { now(): number; issue(): Promise<Credential>; probe(token: string): Promise<void>; alert(status: Status): void }
export class Renewal {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private store: Store, private deps: Dependencies) {}
  run(rejected?: string, statusOnly = false): Promise<{ credential?: Credential; status: Status }> {
    const work = this.queue.then(() => this.perform(rejected, statusOnly));
    this.queue = work.catch(() => undefined);
    return work;
  }
  private async perform(rejected: string | undefined, statusOnly: boolean) {
    const s: State = await this.store.load() ?? { failures: 0, retryAt: 0 };
    const now = this.deps.now();
    if (rejected && rejected === s.active?.fingerprint) { s.rejected = rejected; s.lastFailure = now; s.lastError = 'JWT_REJECTED'; }
    const valid = () => !!s.active && s.active.expires > this.deps.now() + MIN_VALIDITY && s.active.fingerprint !== s.rejected;
    // Periodic read-only health check also detects revoked keys before purchases.
    if (statusOnly && valid() && now - (s.probedAt ?? 0) >= 900) {
      try { await this.deps.probe(s.active!.token); s.probedAt = now; }
      catch (e) {
        const code = e instanceof Error ? e.message : '';
        s.lastFailure = now; s.lastError = ['PROBE_401','PROBE_403','PROBE_PGRST303','PROBE_UNAVAILABLE','PROBE_REJECTED'].includes(code) ? code : 'PROBE_UNAVAILABLE';
        if (['PROBE_401','PROBE_403','PROBE_PGRST303'].includes(code)) s.rejected = s.active!.fingerprint;
        // Keep a good unexpired credential on a transient network failure.
        s.failures = Math.max(1,s.failures); s.retryAt = Math.max(s.retryAt,now+60);
      }
    }
    const due = s.failures > 0 || !valid() || s.active!.expires - now <= RENEW_BEFORE;
    // Persist a wakeup BEFORE any signing/network work; a crash cannot lose retries.
    await this.store.alarm((now + 60) * 1000);
    if (due && now >= s.retryAt) {
      try {
        const next = await this.deps.issue();
        if (next.issued > now + 60 || next.expires - next.issued !== TTL || next.expires <= now + RENEW_BEFORE || next.fingerprint === s.rejected) throw Error('CANDIDATE_INVALID');
        await this.deps.probe(next.token);
        s.previous = s.active; s.active = next; s.rejected = undefined;
        s.lastSuccess = this.deps.now(); s.probedAt = s.lastSuccess; s.failures = 0; s.retryAt = 0;
      } catch (e) {
        s.lastFailure = this.deps.now(); s.failures += 1;
        const code = e instanceof Error ? e.message : '';
        s.lastError = ['SIGNER_INVALID','CANDIDATE_INVALID','PROBE_401','PROBE_403','PROBE_PGRST303','PROBE_UNAVAILABLE','PROBE_REJECTED'].includes(code) ? code : 'RENEWAL_FAILED';
        s.retryAt = this.deps.now() + [60,300,900,3600][Math.min(s.failures - 1,3)];
      }
    }
    s.checkedAt = this.deps.now();
    // save is atomic; failure never releases an unpersisted new token.
    await this.store.save(s);
    const status: Status = { healthy: valid(), automatic: true, expiresAt: s.active?.expires ?? null, remainingSeconds: Math.max(0,(s.active?.expires ?? 0)-this.deps.now()), lastSuccess:s.lastSuccess??null,lastFailure:s.lastFailure??null,lastError:s.lastError??null,retryAt:s.retryAt,checkedAt:s.checkedAt,warning:!valid()||s.failures>0||(s.active?.expires??0)-this.deps.now()<86400 };
    await this.store.alarm((s.failures ? s.retryAt : this.deps.now()+3600)*1000);
    if (status.warning) this.deps.alert(status);
    return { ...(!statusOnly && valid() ? {credential:s.active} : {}), status };
  }
}
