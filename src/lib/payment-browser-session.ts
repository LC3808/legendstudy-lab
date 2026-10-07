import { getBrowserAuthClient } from './browser-auth-client';

/** Payment return only: bounded restoration; never retries a payment mutation. */
export async function paymentSessionToken(): Promise<string> {
  const client = getBrowserAuthClient();
  const message = '로그인 상태를 확인할 수 없습니다. 다시 로그인해 주세요. (SESSION_UNAVAILABLE)';
  if (!client) throw new Error(message);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  try {
    return await Promise.race([
      (async () => {
        while (!stopped) {
          const result = await client.auth.getSession();
          if (stopped) throw new Error(message);
          if (result.error) throw new Error(message);
          if (result.data.session) return result.data.session.access_token;
          await new Promise<void>(resolve => setTimeout(resolve, 150));
        }
        throw new Error(message);
      })(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { stopped = true; reject(new Error(message)); }, 3000);
      }),
    ]);
  } catch {
    throw new Error(message);
  } finally {
    stopped = true;
    clearTimeout(timer);
  }
}
