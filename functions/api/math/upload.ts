import { serverTransport, type MathEnvironment } from "../../../src/lib/math-release/server/transport";
import { boundedBody, mediaSignature, requestToken, sha256, storagePath } from "../../../src/lib/math-release/server/request";
export async function onRequestPost({ request, env }: { request: Request; env: MathEnvironment }) {
  let phase = "authenticate";
  try {
    const token = requestToken(request, env), t = serverTransport(env), subject = await t.subject(token);
    if (!env.MATH_EXTRACTION_WORKER_JWT) throw Error("CONFIGURATION_REQUIRED");
    phase = "multipart";
    const bytes = await boundedBody(request, 20971520 + 65536);
    const form = await new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { "Content-Type": request.headers.get("Content-Type") ?? "" } }).formData();
    const artifact = form.get("artifact_id"), file = form.get("file");
    if (typeof artifact !== "string" || !(file instanceof File) || file.size < 1 || file.size > 20971520 || [...form.keys()].some(k => !["artifact_id","file"].includes(k))) throw Error("INVALID_UPLOAD");
    const args = { p_subject: subject, p_artifact: artifact };
    phase = "describe";
    const row = await t.rpcRaw("math_artifact_storage", { ...args, p_action: "describe" }, env.MATH_EXTRACTION_WORKER_JWT);
    const content = new Uint8Array(await file.arrayBuffer()), digest = await sha256(content);
    if (row.byte_size !== file.size || row.media_type !== file.type || !mediaSignature(content,file.type) || (row.content_sha256 && row.content_sha256 !== digest)) throw Error("INVALID_UPLOAD");
    const path = storagePath(row.bucket, row.object_key);
    phase = "storage_upload";
    const uploaded = await t.request(`/storage/v1/object/${path}`, token, { method: "POST", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: content });
    // An interrupted prior upload may already exist; trust only a complete byte re-read.
    if (!uploaded.ok && ![400,409].includes(uploaded.status)) throw Error("UPLOAD_FAILED");
    phase = "storage_read";
    const read = await t.request(`/storage/v1/object/authenticated/${path}`, env.MATH_EXTRACTION_WORKER_JWT);
    if (!read.ok) throw Error("UPLOAD_UNVERIFIED");
    const stored = await boundedBody(read, 20971520);
    if (stored.byteLength !== file.size || await sha256(stored) !== digest) throw Error("UPLOAD_UNVERIFIED");
    phase = "storage_admit";
    await t.rpcRaw("math_artifact_storage", { ...args, p_action: "admit", p_size: stored.byteLength, p_sha256: digest }, env.MATH_EXTRACTION_WORKER_JWT);
    return Response.json({ artifact_id: artifact, status: "PRESENT" }, { headers: { "Cache-Control": "no-store" } });
  } catch { console.warn("MATH_UPLOAD_FAILURE", { phase }); return Response.json({ code: "UPLOAD_UNAVAILABLE" }, { status: 409, headers: { "Cache-Control": "no-store" } }); }
}
