import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Create every missing catalogue category (with sub-categories). */
export const adminSyncCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { CATEGORY_CATALOG } = await import("@/lib/categories/catalog");
    await assertAdmin(context.supabase, context.userId);

    const { data: existing } = await supabaseAdmin.from("categories").select("id,slug");
    const have = new Map((existing ?? []).map((c: any) => [c.slug as string, c.id as string]));
    let created = 0;
    let subs = 0;
    let sort = (existing ?? []).length + 1;

    for (const c of CATEGORY_CATALOG) {
      let id = have.get(c.slug);
      if (!id) {
        const { data, error } = await supabaseAdmin
          .from("categories")
          .insert({ slug: c.slug, name: c.name, icon: c.icon, description: c.services.slice(0, 3).join(" · "), sort_order: sort++ })
          .select("id")
          .single();
        if (error) continue;
        id = data.id as string;
        created += 1;
      }
      const { data: cur } = await supabaseAdmin.from("subcategories").select("slug").eq("category_id", id);
      const hs = new Set((cur ?? []).map((s: any) => s.slug));
      const rows = c.subs
        .map((s, i) => ({ category_id: id!, slug: `${c.slug}-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 60), name: s, sort_order: i + 1 }))
        .filter((r) => !hs.has(r.slug));
      if (rows.length) {
        const { error } = await supabaseAdmin.from("subcategories").insert(rows);
        if (!error) subs += rows.length;
      }
    }
    return { created, subs, total: CATEGORY_CATALOG.length };
  });

/**
 * Generate fresh demo templates for a category (or top every category up to
 * `count`). Content, images and design come from the catalogue, so each demo
 * is category-specific and visually distinct from its siblings.
 */
export const adminGenerateDemos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null; count?: number; rebuild?: boolean } | undefined) => ({
    categoryId: input?.categoryId ?? null,
    count: Math.min(Math.max(Number(input?.count ?? 7), 1), 12),
    rebuild: Boolean(input?.rebuild),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildDemoContent, demoName } = await import("@/lib/design/demo-content");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin.from("categories").select("id,slug,name");
    if (data.categoryId) q = q.eq("id", data.categoryId);
    const { data: cats } = await q;
    const list = (cats ?? []) as Array<{ id: string; slug: string; name: string }>;

    let created = 0;
    let rebuilt = 0;
    for (const c of list) {
      const { data: rows } = await supabaseAdmin
        .from("templates")
        .select("id,content_json,is_editable_demo")
        .eq("category_id", c.id)
        .order("sort_order", { ascending: true });
      const existing = (rows ?? []) as Array<{ id: string; content_json?: any; is_editable_demo?: boolean }>;

      if (data.rebuild) {
        for (let i = 0; i < existing.length; i++) {
          if (!existing[i]!.is_editable_demo || existing[i]!.content_json?.presentation === "preserve") continue;
          const content = buildDemoContent(c.slug, c.name, i, existing[i]!.id);
          await supabaseAdmin
            .from("templates")
            .update({
              content_json: content as any,
              sections: content.sections as any,
              name: demoName({ name: c.name }, i),
              thumbnail_url: ((content.sections as any[]).find((s: any) => s?.image)?.image as string) ?? content.brand.bg_image ?? null,
              archetype: c.slug,
              is_editable_demo: true,
            })
            .eq("id", existing[i]!.id);
          rebuilt += 1;
        }
      }

      const need = Math.max(data.count - existing.length, 0);
      for (let i = 0; i < need; i++) {
        const idx = existing.length + i;
        const id = crypto.randomUUID();
        const content = buildDemoContent(c.slug, c.name, idx, id);
        const { error } = await supabaseAdmin.from("templates").insert({
          id,
          category_id: c.id,
          name: demoName({ name: c.name }, idx),
          description: content.brand.tagline ?? null,
          accent_color: content.brand.primary,
          archetype: c.slug,
          content_json: content as any,
          sections: content.sections as any,
          thumbnail_url: ((content.sections as any[]).find((s: any) => s?.image)?.image as string) ?? content.brand.bg_image ?? null,
          is_editable_demo: true,
          sort_order: idx + 1,
        } as any);
        if (!error) created += 1;
      }
    }
    return { categories: list.length, created, rebuilt };
  });

/** Delete a category with its sub-categories and demo templates. */
export const adminDeleteCategoryDeep = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId: string }) => ({ categoryId: String(input?.categoryId ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    if (!data.categoryId) throw new Error("Category is required");
    await supabaseAdmin.from("templates").delete().eq("category_id", data.categoryId);
    await supabaseAdmin.from("subcategories").delete().eq("category_id", data.categoryId);
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.categoryId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Load one demo template for the admin template editor. */
export const adminTemplateGet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input?.id ?? "") }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("templates")
      .select("id,name,category_id,content_json,sections,thumbnail_url,categories(name,slug)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Template not found");
    return row as any;
  });

/** Save the admin's edits back to the demo template. */
export const adminTemplateSave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; content: unknown; name?: string }) => ({
    id: String(input?.id ?? ""),
    content: input?.content,
    name: input?.name ? String(input.name).slice(0, 120) : undefined,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const roles = await assertAdmin(context.supabase, context.userId);
    const content = { ...(data.content as any), presentation: "preserve" };
    if (!content?.brand || !Array.isArray(content?.sections)) throw new Error("Invalid site content");
    if (!roles.includes("super_admin")) content.brand = { ...content.brand, hide_badge: false };
    const patch: any = {
      content_json: content,
      sections: content.sections,
      thumbnail_url: content.sections.find((s: any) => s?.image)?.image ?? content.brand.bg_image ?? null,
      accent_color: content.brand.primary ?? null,
    };
    if (data.name) patch["name"] = data.name;
    const { error } = await supabaseAdmin.from("templates").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
