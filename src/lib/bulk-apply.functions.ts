import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Start a Bulk Apply run (images / text / style) over a category. */
export const adminStartBulkApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    categoryId?: string | null;
    applyImages?: boolean;
    applyText?: boolean;
    applyStyle?: boolean;
    skipCustomised?: boolean;
  }) => input ?? {})
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
        mode: "bulk_apply",
        apply_images: data.applyImages !== false,
        apply_text: !!data.applyText,
        apply_style: !!data.applyStyle,
        skip_customised: data.skipCustomised !== false,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "templates.bulk_apply_started",
      entity_type: "bulk_image_run",
      entity_id: run.id,
      details: { total: count ?? 0, categoryId: data.categoryId ?? null },
    });
    return run;
  });

/** Process one batch of a Bulk Apply run. */
export const adminRunBulkApplyBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; limit?: number }) => {
    if (!input?.runId) throw new Error("runId required");
    return { runId: input.runId, limit: Math.min(Math.max(input.limit ?? 4, 1), 10) };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bulkApplyBatch } = await import("@/lib/images/bulk-apply.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: run, error } = await supabaseAdmin
      .from("bulk_image_runs")
      .select("*")
      .eq("id", data.runId)
      .single();
    if (error || !run) throw new Error("Run not found");
    if (run.status !== "running") return { ...run, done: true };

    const r: any = run;
    try {
      const res = await bulkApplyBatch(supabaseAdmin as any, {
        runId: r.id,
        categoryId: r.category_id,
        offset: r.processed,
        limit: data.limit,
        seed: Math.floor(new Date(r.created_at).getTime() / 1000) % 100000,
        applyImages: r.apply_images !== false,
        applyText: !!r.apply_text,
        applyStyle: !!r.apply_style,
        skipCustomised: r.skip_customised !== false,
      });

      const processed = r.processed + res.processed;
      const done = res.done || processed >= (r.total || processed);
      const { data: updated } = await supabaseAdmin
        .from("bulk_image_runs")
        .update({
          processed,
          replaced: r.replaced + res.replaced,
          status: done ? "completed" : "running",
        })
        .eq("id", r.id)
        .select("*")
        .single();

      return { ...(updated ?? r), done, lastName: res.lastName ?? null };
    } catch (e: any) {
      await supabaseAdmin
        .from("bulk_image_runs")
        .update({ status: "failed", error: String(e?.message ?? e) })
        .eq("id", r.id);
      throw new Error(String(e?.message ?? e));
    }
  });

/** Undo a Bulk Apply run — restores every page it touched. */
export const adminUndoBulkApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => {
    if (!input?.runId) throw new Error("runId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { undoBulkApply } = await import("@/lib/images/bulk-apply.server");
    await assertAdmin(context.supabase, context.userId);

    const restored = await undoBulkApply(supabaseAdmin as any, data.runId);
    await supabaseAdmin
      .from("bulk_image_runs")
      .update({ status: "reverted" })
      .eq("id", data.runId);
    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "templates.bulk_apply_undone",
      entity_type: "bulk_image_run",
      entity_id: data.runId,
      details: { restored },
    });
    return { restored };
  });

/** Categories that already have an approved blueprint (bulk apply prerequisite). */
export const adminBulkApplyTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: cats } = await supabaseAdmin.from("categories").select("id,name,slug").order("name");
    const { data: bps } = await supabaseAdmin
      .from("category_blueprints")
      .select("category_id,category_slug")
      .eq("is_active", true);
    const slugs = new Set((bps ?? []).map((b: any) => String(b.category_slug).toLowerCase()));
    const ids = new Set((bps ?? []).map((b: any) => b.category_id).filter(Boolean));
    return (cats ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      hasBlueprint: ids.has(c.id) || slugs.has(String(c.slug).toLowerCase()),
    }));
  });

/** Recent runs, newest first — used for the Undo action. */
export const adminListBulkApplyRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("bulk_image_runs")
      .select("*")
      .eq("mode", "bulk_apply")
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });
