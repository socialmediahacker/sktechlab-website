import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(ctx: any) {
  const { assertAdmin: check } = await import("@/lib/admin.server");
  await check(ctx.supabase, ctx.userId);
}

export const adminListBugReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data, error } = await db
      .from("bug_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return (data ?? []) as any[];
  });

export const adminCreateBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) =>
    z
      .object({
        title: z.string().min(3).max(160),
        page_url: z.string().max(400).nullable().optional(),
        expected: z.string().max(4000).nullable().optional(),
        actual: z.string().max(4000).nullable().optional(),
        steps: z.string().max(4000).nullable().optional(),
        device: z.enum(["mobile", "desktop", "both"]).default("both"),
        priority: z.enum(["low", "medium", "high"]).default("medium"),
        attachments: z.array(z.string().max(600)).max(10).default([]),
        diagnostics: z.record(z.string(), z.any()).default({}),
        report_text: z.string().max(20000).default(""),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data: row, error } = await db
      .from("bug_reports")
      .insert({ ...(data as any), created_by: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as any;
  });

export const adminUpdateBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "sent", "fixed", "wontfix"]).optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
        admin_note: z.string().max(4000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { id, ...patch } = data as any;
    const { error } = await db.from("bug_reports").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBugReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { error } = await db.from("bug_reports").delete().eq("id", (data as any).id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
