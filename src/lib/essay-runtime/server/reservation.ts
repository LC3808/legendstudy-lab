import { boundedBody } from '../../math-release/server/request';

/** A confirmed, rolled-back PostgREST reservation rejection, never a dispatch error. */
export class ReservationRejected extends Error {
  constructor(readonly status: 402 | 422) { super(status === 402 ? 'INSUFFICIENT_CREDIT' : 'INVALID_EVALUATION_REQUEST'); }
}
export async function requestEssayReservation(
  request: (path: string, token: string, init: RequestInit) => Promise<Response>,
  token: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const response = await request('/rest/v1/rpc/essay_request_evaluation', token, {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(args),
  });
  const body: unknown = JSON.parse(new TextDecoder().decode(await boundedBody(response, 4096)));
  if (!response.ok) {
    // Require the SQL error code as well as HTTP status. Proxy/worker errors and
    // malformed responses remain unknown; never assume Credit was released.
    if ((response.status === 402 || response.status === 422) && body && typeof body === 'object' &&
        'code' in body && body.code === `PT${response.status}`) throw new ReservationRejected(response.status);
    throw Error('RESERVATION_STATUS_UNKNOWN');
  }
  return body;
}
