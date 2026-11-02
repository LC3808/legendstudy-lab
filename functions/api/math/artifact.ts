import { serverTransport, publicMathLeaves, type MathEnvironment } from "../../../src/lib/math-release/server/transport";
import { boundedBody, mediaSignature, requestToken, sha256, storagePath } from "../../../src/lib/math-release/server/request";

/** Owner-authenticated original bytes; no signed/public URL or provider invocation. */
export async function onRequestPost({ request, env }: { request: Request; env: MathEnvironment }) {
  const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  try {
    const token = requestToken(request, env);
    const body = JSON.parse(new TextDecoder().decode(await boundedBody(request, 1024)));
    if (!body || Object.keys(body).join() !== "artifact_id" ||
      typeof body.artifact_id !== "string" || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(body.artifact_id)) throw Error("INVALID_REQUEST");
    const t = serverTransport(env), released = publicMathLeaves(env);
    const subject = await t.subject(token, released.length > 0);
    if (!env.MATH_EXTRACTION_WORKER_JWT) throw Error("CONFIGURATION_REQUIRED");
    // Existing RPC checks active account + artifact's attempt owner before describing storage.
    const row = await t.rpcRaw("math_artifact_storage", {
      p_subject: subject, p_artifact: body.artifact_id, p_action: "describe",
    }, env.MATH_EXTRACTION_WORKER_JWT);
    if (released.length) {
      const owned = await t.rpc(token).rpc("math_input", { dto_version: "math-input-v1", action: "read_input", payload: { attempt_id: row.attempt_id } }) as { result?: { attempt?: { leaf_id?: string } } };
      if (!released.includes(owned.result?.attempt?.leaf_id ?? "")) throw Error("UNAVAILABLE");
    }
    if (row.storage_state !== "PRESENT" || row.bucket !== "math-private" ||
      !Number.isInteger(row.byte_size) || row.byte_size < 1 || row.byte_size > 20971520 ||
      !["image/png", "image/jpeg", "image/webp"].includes(row.media_type) ||
      !/^[0-9a-f]{64}$/.test(row.content_sha256 ?? "")) throw Error("UNAVAILABLE");
    const stored = await t.request(`/storage/v1/object/authenticated/${storagePath(row.bucket, row.object_key)}`, env.MATH_EXTRACTION_WORKER_JWT);
    if (!stored.ok) throw Error("UNAVAILABLE");
    const bytes = await boundedBody(stored, row.byte_size);
    if (bytes.length !== row.byte_size || !mediaSignature(bytes, row.media_type) || await sha256(bytes) !== row.content_sha256) throw Error("UNAVAILABLE");
    return new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { ...headers, "Content-Type": row.media_type } });
  } catch {
    return Response.json({ code: "ARTIFACT_UNAVAILABLE" }, { status: 404, headers });
  }
}
