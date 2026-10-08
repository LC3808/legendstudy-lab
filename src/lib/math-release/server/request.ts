import type { MathEnvironment } from "./transport";
export function requestToken(request: Request, env: MathEnvironment): string {
  if (env.MATH_ENABLED !== "true" || !env.MATH_ORIGIN || request.headers.get("origin") !== env.MATH_ORIGIN) throw Error("ACCESS_DENIED");
  const token = request.headers.get("authorization")?.match(/^Bearer ([^\s]+)$/)?.[1];
  if (!token) throw Error("LOGIN_REQUIRED"); return token;
}
export async function boundedBody(response: Request | Response, limit: number): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > limit || !response.body) throw Error("BODY_BOUND");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let length = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break;
    length += value.length; if (length > limit) throw Error("BODY_BOUND"); chunks.push(value); }
  } catch { await reader.cancel(); throw Error("BODY_BOUND"); }
  finally { reader.releaseLock(); }
  const result = new Uint8Array(length); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; } return result;
}
export const storagePath = (bucket: string, key: string) => `${encodeURIComponent(bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
export async function sha256(bytes: Uint8Array) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>))).map(n => n.toString(16).padStart(2,"0")).join("");
}
export function mediaSignature(bytes: Uint8Array, type: string): boolean {
  const start = new TextDecoder().decode(bytes.slice(0,12));
  return type === "application/pdf" ? start.startsWith("%PDF-") : type === "image/png" ? bytes.slice(0,8).join() === "137,80,78,71,13,10,26,10" :
    type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : type === "image/webp" ? start.startsWith("RIFF") && start.slice(8) === "WEBP" : false;
}
