import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Apply category design profiles (layout, palette, section order) to demos. */
export const adminApplyDesignProfiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null } | undefined) => ({
    categoryId: input?.categoryId ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyProfilesToCategory, applyProfilesEverywhere } = await import(
      "@/lib/design/apply-profiles.server"
    );
    await assertAdmin(context.supabase, context.userId);

    if (!data.categoryId) return await applyProfilesEverywhere(supabaseAdmin as any);

    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id,slug")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (!cat) throw new Error("Category not found");
    const r = await applyProfilesToCategory(supabaseAdmin as any, cat as any);
    return { categories: 1, templates: r.templates };
  });
