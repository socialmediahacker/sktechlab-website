import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { parseProject } from "@/lib/projects/document";

const optionalUrl = z.union([z.literal(""), z.string().regex(/^\/(?!\/)/), z.string().url().refine(v => /^https?:\/\//i.test(v), "Use an HTTP or HTTPS URL.")]).optional();
const metadata = z.object({ name: z.string().trim().min(2).max(120), categoryId: z.string().uuid(), description: z.string().max(1000).default(""), thumbnail: optionalUrl, demoUrl: optionalUrl, premium: z.boolean().default(false) });

export const adminImportProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => metadata.extend({ document: z.unknown() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const roles = await assertAdmin(context.supabase as any, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const content = parseProject(data.document);
    if (!roles.includes("super_admin")) content.brand.hide_badge = false;
    const { data: category, error: ce } = await db.from("categories").select("id").eq("id", data.categoryId).maybeSingle();
    if (ce || !category) throw new Error("Choose an existing category.");
    const hero = content.sections.find(s => s.type === "hero3d");
    const { data: row, error } = await db.from("templates").insert({
      name: data.name, category_id: data.categoryId, description: data.description, demo_url: data.demoUrl || null,
      content_json: content as any, sections: content.sections as any, archetype: content.archetype,
      accent_color: content.brand.primary, is_editable_demo: true, is_premium: data.premium,
      thumbnail_url: data.thumbnail || (hero?.type === "hero3d" ? hero.image : null), sort_order: 0,
    }).select("id").single();
    if (error) throw new Error("Project could not be added. Check your category and database configuration.");
    await logActivity(db as any, { actor_id: context.userId, action: "project.import", entity_type: "template", entity_id: row.id, details: { name: data.name } });
    return row;
  });

export const adminUpdateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => metadata.extend({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase as any, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await db.from("templates").update({ name: data.name, category_id: data.categoryId, description: data.description, demo_url: data.demoUrl || null, thumbnail_url: data.thumbnail || null, is_premium: data.premium }).eq("id", data.id).select("id").maybeSingle();
    if (error || !row) throw new Error("Project could not be updated. Reload and try again.");
    await logActivity(db as any, { actor_id: context.userId, action: "project.update", entity_type: "template", entity_id: data.id });
    return { ok: true };
  });
