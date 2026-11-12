import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Slot = "demo" | "showcase";

/** Everything the Home showcase admin needs: current slots + a searchable pool. */
export const adminHomeShowcase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { search?: string; categoryId?: string | null } | undefined) => ({
    search: String(input?.search ?? "").slice(0, 80),
    categoryId: input?.categoryId ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    const cols =
      "id,name,thumbnail_url,accent_color,sort_order,home_slot,is_editable_demo,category_id,categories(name,slug)";

    const { data: slotted } = await supabaseAdmin
      .from("templates")
      .select(cols)
      .not("home_slot", "is", null)
      .order("sort_order")
      .order("id");

    let q = supabaseAdmin.from("templates").select(cols).is("home_slot", null);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.search.trim()) q = q.ilike("name", `%${data.search.trim()}%`);
    const { data: pool } = await q.order("sort_order").order("id").limit(60);

    const { data: categories } = await supabaseAdmin
      .from("categories")
      .select("id,name,slug")
      .order("name");

    return {
      demos: ((slotted ?? []) as any[]).filter((t) => t.home_slot === "demo"),
      showcase: ((slotted ?? []) as any[]).filter((t) => t.home_slot === "showcase"),
      pool: (pool ?? []) as any[],
      categories: (categories ?? []) as any[],
    };
  });

/** Add a template to a home slot, or remove it (slot = null). */
export const adminSetHomeSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; slot: Slot | null }) => ({
    id: String(input.id),
    slot: input.slot === "demo" || input.slot === "showcase" ? input.slot : null,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("templates")
      .update({ home_slot: data.slot })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Replace the thumbnail shown on the home page card. */
export const adminSetHomeThumb = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; url: string }) => ({
    id: String(input.id),
    url: String(input.url ?? "").trim().slice(0, 800),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    if (data.url && !/^https?:\/\//i.test(data.url)) throw new Error("Thumbnail must be a full https URL");
    const { error } = await supabaseAdmin
      .from("templates")
      .update({ thumbnail_url: data.url || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Persist the display order of one slot. */
export const adminReorderHomeSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => ({ ids: (input.ids ?? []).map(String).slice(0, 50) }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    for (let i = 0; i < data.ids.length; i++) {
      await supabaseAdmin.from("templates").update({ sort_order: i }).eq("id", data.ids[i]!);
    }
    return { ok: true };
  });
