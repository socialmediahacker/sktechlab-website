import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** All blueprints grouped for the admin table. */
export const adminListBlueprints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const [{ data: rows }, { data: cats }] = await Promise.all([
      supabaseAdmin.from("category_blueprints").select("*").order("category_slug").order("sort_order"),
      supabaseAdmin.from("categories").select("id,name,slug").order("name"),
    ]);
    return { blueprints: rows ?? [], categories: cats ?? [] };
  });

/** Research + store blueprints for one category (AI, structure only). */
export const adminResearchBlueprints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId: string; replace?: boolean }) => {
    if (!input?.categoryId) throw new Error("categoryId required");
    return { categoryId: input.categoryId, replace: input.replace !== false };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { researchBlueprints } = await import("@/lib/blueprints.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id,name,slug")
      .eq("id", data.categoryId)
      .single();
    if (!cat) throw new Error("Category not found");

    const found = await researchBlueprints({ name: cat.name, slug: cat.slug });
    if (!found.length) throw new Error("AI returned no blueprints — try again");

    if (data.replace) {
      await supabaseAdmin.from("category_blueprints").delete().eq("category_id", cat.id);
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("category_blueprints")
      .insert(found.map((b) => ({ ...b, category_id: cat.id, category_slug: cat.slug })) as any)
      .select("*");
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "blueprints.researched",
      entity_type: "category",
      entity_id: cat.id,
      details: { count: inserted?.length ?? 0 },
    });
    return inserted ?? [];
  });

/** Create or update a blueprint by hand. */
export const adminSaveBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, any>) => {
    if (!input?.category_slug) throw new Error("category_slug required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("category_blueprints")
      .upsert(data as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** Remove a blueprint. */
export const adminDeleteBlueprint = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("category_blueprints").delete().eq("id", data.id);
    return { ok: true };
  });
