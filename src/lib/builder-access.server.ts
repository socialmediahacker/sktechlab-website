import { getCookie, setCookie } from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";

export function newBuilderAccess() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

export function setBuilderAccess(sessionId: string, token: string) {
  setCookie(`sk_builder_${sessionId}`, token, { httpOnly: true, sameSite: "lax", secure: process.env["NODE_ENV"] === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function assertBuilderAccess(db: any, sessionId: string) {
  const token = getCookie(`sk_builder_${sessionId}`);
  if (!token) throw new Error("This setup session is unavailable. Please start a new website.");
  const hash = createHash("sha256").update(token).digest("hex");
  const { data, error } = await db.from("builder_sessions").select("id").eq("id", sessionId).eq("access_token_hash", hash).maybeSingle();
  if (error || !data) throw new Error("This setup session is unavailable. Please start a new website.");
}