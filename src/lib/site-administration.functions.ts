import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const saveSiteSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    id: z.string().uuid(), name: z.string().trim().min(2).max(120),
    subdomain: z.string().trim().regex(/^[a-z0-9][a-z0-9-]{1,62}$/).nullable(),
    published: z.boolean(), expectedVersion: z.number().int(),
    seo: z.object({ title: z.string().max(160), description: z.string().max(400), keywords: z.string().max(500) }),
    content_json: z.any(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { requireSiteEditAccess } = await import("@/lib/site-editor.server");
    await requireSiteEditAccess(context.supabase as any, data.id);
    const { data: current, error } = await context.supabase.from("sites")
      .select("content, content_json, version").eq("id", data.id).single();
    if (error) throw new Error("Site settings could not be loaded.");
    if (current.version !== data.expectedVersion) throw new Error("This site changed elsewhere. Reload before saving.");
    const legacy = current.content && typeof current.content === "object" && !Array.isArray(current.content) ? current.content : {};
    if (!data.content_json?.brand || !Array.isArray(data.content_json.sections)) throw new Error("Invalid site document.");
    const { getUserRoles } = await import("@/lib/admin.server");
    const roles = await getUserRoles(context.supabase as any, context.userId);
    const oldBrand = (current.content_json as any)?.brand;
    const document = { ...data.content_json, brand: { ...data.content_json.brand,
      hide_badge: roles.includes("super_admin") ? data.content_json.brand.hide_badge : oldBrand?.hide_badge ?? false } };
    const { data: saved, error: saveError } = await context.supabase.from("sites").update({
      name: data.name, subdomain: data.subdomain, published: data.published,
      content: { ...legacy, seo: data.seo }, content_json: document, version: data.expectedVersion + 1,
    }).eq("id", data.id).eq("version", data.expectedVersion).select("version").maybeSingle();
    if (saveError) throw new Error("Could not save settings. Check that the site URL is available.");
    if (!saved) throw new Error("This site changed elsewhere. Reload before saving.");
    const { syncSectionProductsToStore } = await import("@/lib/site-editor.server");
    try { await syncSectionProductsToStore(context.supabase as any, data.id, document); } catch { /* the document remains saved */ }
    return saved;
  });