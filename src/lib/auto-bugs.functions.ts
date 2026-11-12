import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public endpoint: browsers auto-report runtime errors here. No auth (visitors hit it too). */
const schema = z.object({
  message: z.string().min(3).max(600),
  page_url: z.string().max(400).default(""),
  kind: z.enum(["error", "rejection", "console", "network"]).default("error"),
  device: z.enum(["mobile", "desktop", "both"]).default("both"),
  context: z.record(z.string(), z.any()).default({}),
});

function fingerprint(message: string, path: string) {
  const norm = message
    .replace(/https?:\/\/[^\s)]+/g, "<url>")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{20,}/gi, "<id>")
    .replace(/\d+/g, "<n>")
    .slice(0, 200)
    .trim()
    .toLowerCase();
  let h = 0;
  const base = `${path}|${norm}`;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return `${Math.abs(h).toString(36)}`;
}

export const reportAutoBug = createServerFn({ method: "POST" })
  .inputValidator((d: Record<string, unknown>) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const path = (() => {
      try {
        return new URL(data.page_url).pathname;
      } catch {
        return data.page_url || "/";
      }
    })();
    const fp = fingerprint(data.message, path);
    const title = `[Auto] ${data.message.slice(0, 120)}`;

    const { data: existing } = await db
      .from("bug_reports")
      .select("id, diagnostics, status, created_at")
      .contains("diagnostics", { fingerprint: fp } as any)
      .limit(1);

    const now = new Date().toISOString();
    if (existing && existing.length) {
      const row = existing[0] as any;
      const diag = { ...(row.diagnostics ?? {}) };
      diag.hits = Number(diag.hits ?? 1) + 1;
      diag.last_seen = now;
      diag.last_page = data.page_url;
      await db
        .from("bug_reports")
        .update({
          diagnostics: diag,
          // a fixed bug that comes back should reopen
          status: row.status === "fixed" ? "new" : row.status,
        })
        .eq("id", row.id);
      return { ok: true, deduped: true };
    }

    const report_text = [
      `Bug: ${data.message}`,
      `Page: ${data.page_url || "(unknown)"}`,
      `Type: auto-detected (${data.kind})`,
      `Device: ${data.device}`,
      `First seen: ${now}`,
      "",
      "Context:",
      JSON.stringify(data.context ?? {}, null, 2).slice(0, 4000),
      "",
      "Expected: no runtime error on this page.",
      "Actual: the error above was thrown in the browser.",
    ].join("\n");

    await db.from("bug_reports").insert({
      title,
      page_url: data.page_url || null,
      expected: "No runtime error on this page.",
      actual: data.message,
      steps: "Auto-detected while a visitor was using the app.",
      device: data.device,
      priority: data.kind === "console" ? "low" : "high",
      attachments: [],
      diagnostics: { ...data.context, fingerprint: fp, source: "auto", kind: data.kind, hits: 1, last_seen: now },
      report_text,
      status: "new",
    } as any);

    return { ok: true, deduped: false };
  });
