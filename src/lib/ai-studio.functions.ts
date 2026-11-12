import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Ask the AI for a set of template changes (nothing is written to demos yet). */
export const adminAiPropose = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { prompt: string; categoryId?: string | null; templateIds?: string[]; limit?: number }) => ({
    prompt: String(input?.prompt ?? "").slice(0, 2000),
    categoryId: input?.categoryId ?? null,
    templateIds: (input?.templateIds ?? []).slice(0, 8),
    limit: input?.limit ?? 3,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { proposeRun } = await import("@/lib/ai-studio.server");
    await assertAdmin(context.supabase, context.userId);
    if (!data.prompt.trim()) throw new Error("Write an instruction first");
    return await proposeRun(supabaseAdmin as any, { ...data, userId: context.userId });
  });

/** Apply a previewed run to the demo templates. */
export const adminAiApply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => ({ runId: String(input?.runId ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyRun } = await import("@/lib/ai-studio.server");
    await assertAdmin(context.supabase, context.userId);
    return await applyRun(supabaseAdmin as any, data.runId);
  });

/** Roll a run back to the stored before-snapshots. */
export const adminAiUndo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => ({ runId: String(input?.runId ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { undoRun } = await import("@/lib/ai-studio.server");
    await assertAdmin(context.supabase, context.userId);
    return await undoRun(supabaseAdmin as any, data.runId);
  });

/** Recent AI Studio runs. */
export const adminAiRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("ai_runs")
      .select("id,prompt,status,created_at,proposals")
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      prompt: r.prompt,
      status: r.status,
      created_at: r.created_at,
      count: Array.isArray(r.proposals) ? r.proposals.length : 0,
    }));
  });
