import { testPreviewAccess, type PreviewEnv } from '../cloudflare/test-preview-access';
export const onRequest = (context: { request: Request; env: PreviewEnv; next: () => Promise<Response> }) =>
  testPreviewAccess(context.request, context.env, () => context.next());
