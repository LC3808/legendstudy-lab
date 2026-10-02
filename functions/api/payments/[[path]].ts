import { payment, type Env } from '../../../cloudflare/payments';
export const onRequest = ({ request, env }: { request: Request; env: Env }) => payment(request, env);
