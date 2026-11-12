import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Start a bulk re-image run over the template library (admin only). */
export const adminStartImageRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null }) => input ?? {})
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    let countQ = supabaseAdmin.from("templates").select("id", { count: "exact", head: true });
    if (data.categoryId) countQ = countQ.eq("category_id", data.categoryId);
    const { count } = await countQ;

    const { data: run, error } = await supabaseAdmin
      .from("bulk_image_runs")
      .insert({
        scope: data.categoryId ? "category" : "all",
        category_id: data.categoryId ?? null,
        total: count ?? 0,
        status: "running",
        started_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "templates.reimage_started",
      entity_type: "bulk_image_run",
      entity_id: run.id,
      details: { total: count ?? 0, categoryId: data.categoryId ?? null },
    });
    return run;
  });

/** Process one batch of a run. The UI calls this in a loop until `done`. */
export const adminRunImageBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; limit?: number }) => {
    if (!input?.runId) throw new Error("runId required");
    return { runId: input.runId, limit: Math.min(Math.max(input.limit ?? 4, 1), 10) };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { reimageTemplateBatch } = await import("@/lib/images/bulk-reimage.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: run, error } = await supabaseAdmin
      .from("bulk_image_runs")
      .select("*")
      .eq("id", data.runId)
      .single();
    if (error || !run) throw new Error("Run not found");
    if (run.status !== "running") return { ...run, done: true };

    try {
      const res = await reimageTemplateBatch(supabaseAdmin as any, {
        categoryId: run.category_id,
        offset: run.processed,
        limit: data.limit,
        seed: Math.floor(new Date(run.created_at).getTime() / 1000) % 100000,
      });

      const processed = run.processed + res.processed;
      const done = res.done || processed >= (run.total || processed);
      const { data: updated } = await supabaseAdmin
        .from("bulk_image_runs")
        .update({
          processed,
          replaced: run.replaced + res.replaced,
          status: done ? "completed" : "running",
        })
        .eq("id", run.id)
        .select("*")
        .single();

      return { ...(updated ?? run), done, lastName: res.lastName ?? null };
    } catch (e: any) {
      await supabaseAdmin
        .from("bulk_image_runs")
        .update({ status: "failed", error: String(e?.message ?? e) })
        .eq("id", run.id);
      throw new Error(String(e?.message ?? e));
    }
  });

/** Latest runs for the admin dashboard. */
export const adminListImageRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("bulk_image_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });

/** Stop a running job. */
export const adminCancelImageRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => {
    if (!input?.runId) throw new Error("runId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("bulk_image_runs").update({ status: "cancelled" }).eq("id", data.runId);
    return { ok: true };
  });

/** Image-health report: duplicates and un-optimised photos per category. */
export const adminImageAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: cats } = await supabaseAdmin.from("categories").select("id,name").order("name");
    const { data: tpls } = await supabaseAdmin.from("templates").select("id,category_id,content_json");

    const byCat = new Map<string, { total: number; urls: string[] }>();
    for (const t of tpls ?? []) {
      const bucket = byCat.get(t.category_id) ?? { total: 0, urls: [] };
      bucket.total += 1;
      const urls = JSON.stringify(t.content_json ?? {}).match(/https?:\/\/[^"'\s)]+/g) ?? [];
      bucket.urls.push(...urls.map((u) => u.split("?")[0] as string));
      byCat.set(t.category_id, bucket);
    }

    return (cats ?? []).map((c) => {
      const b = byCat.get(c.id) ?? { total: 0, urls: [] };
      const unique = new Set(b.urls).size;
      const optimised = b.urls.filter((u) => u.includes("ik.imagekit.io")).length;
      return {
        id: c.id,
        name: c.name,
        templates: b.total,
        images: b.urls.length,
        unique,
        duplicates: b.urls.length - unique,
        optimisedPct: b.urls.length ? Math.round((optimised / b.urls.length) * 100) : 0,
      };
    });
  });
