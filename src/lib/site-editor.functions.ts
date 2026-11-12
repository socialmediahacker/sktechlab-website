import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { callEditorChat, parseLooseJson, requireSiteEditAccess, syncSectionProductsToStore } from "@/lib/site-editor.server";
import { MASTER_SYSTEM, MASTER_COPY_SYSTEM } from "@/lib/ai/master-spec";
import { z } from "zod";

const SaveInput = z.object({
  id: z.string().uuid(),
  content_json: z.any(),
  name: z.string().optional(),
  expectedVersion: z.number().int().optional(),
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: current, error: e1 } = await supabase
      .from("sites")
      .select("id, user_id, version, content_json")
      .eq("id", data.id)
      .maybeSingle();
    if (e1) throw new Error(e1.message);
    if (!current) throw new Error("Not found");
    await requireSiteEditAccess(supabase as any, data.id);
    if (data.expectedVersion != null && current.version !== data.expectedVersion) {
      throw new Error("Site was edited elsewhere — reload to see latest.");
    }
    const patch: any = {
      content_json: data.content_json,
      version: (current.version ?? 1) + 1,
    };
    if (!data.content_json?.brand || !Array.isArray(data.content_json.sections)) throw new Error("Invalid site document.");
    const { getUserRoles } = await import("@/lib/admin.server");
    const roles = await getUserRoles(supabase as any, context.userId);
    if (!roles.includes("super_admin")) {
      const oldBrand = (current.content_json as any)?.brand;
      patch.content_json = { ...data.content_json, brand: { ...data.content_json.brand, hide_badge: oldBrand?.hide_badge ?? false } };
    }
    if (data.name) patch.name = data.name;
    const { data: saved, error } = await supabase.from("sites").update(patch).eq("id", data.id).eq("version", current.version).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!saved) throw new Error("Site was edited elsewhere — reload to see latest.");
    // Products written in the design become real catalogue rows automatically.
    let synced = 0;
    try {
      const r = await syncSectionProductsToStore(supabase as any, data.id, data.content_json);
      synced = r.added ?? 0;
    } catch {}
    return { ok: true, version: patch.version, productsAdded: synced };
  });

const RewriteInput = z.object({
  siteId: z.string().uuid(),
  text: z.string().min(1).max(4000),
  intent: z.enum(["punchy", "professional", "friendly", "seo", "shorter", "longer"]).default("punchy"),
  context: z.string().max(400).optional(),
});

export const aiRewriteText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RewriteInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSiteEditAccess(context.supabase as any, data.siteId);
    const sys = `${MASTER_COPY_SYSTEM}\nYou rewrite website copy. Keep meaning. Return ONLY the rewritten text — no quotes, no preamble. Style: ${data.intent}.${data.context ? " Business context: " + data.context : ""}`;
    const out = await callEditorChat(
      [{ role: "system", content: sys }, { role: "user", content: data.text }],
      "google/gemini-3.6-flash",
    );
    return { text: out.trim() || data.text };
  });

/* ------- Chat-to-edit: returns patch ops ------- */

const ChatEditInput = z.object({
  siteId: z.string().uuid(),
  message: z.string().min(1).max(2000),
  content: z.any(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).max(20).default([]),
});

export const aiChatEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatEditInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSiteEditAccess(context.supabase as any, data.siteId);
    const compact = {
      brand: data.content?.brand,
      sections: (data.content?.sections ?? []).map((s: any, i: number) => ({
        i,
        type: s.type,
        headline: s.headline,
        title: s.title,
        sub: s.sub,
        cta: s.cta,
        itemCount: Array.isArray(s.items) ? s.items.length : Array.isArray(s.images) ? s.images.length : Array.isArray(s.plans) ? s.plans.length : undefined,
      })),
    };
    const sys = `${MASTER_SYSTEM}

You edit a website's JSON content. The user asks in Hindi/English/Hinglish for changes.
Return STRICT JSON: {"reply":"<one short line to user>","ops":[<ops>]}.
Ops (choose any that apply, empty array if just chatting):
- {"op":"patchBrand","brand":{...partial brand fields...}}
- {"op":"patchSection","index":N,"patch":{...partial section fields...}}
- {"op":"addSection","section":{type:..., ...full section}}
- {"op":"removeSection","index":N}
- {"op":"reorderSections","order":[indices in new order]}
Section types: hero3d, features, stats, products, menu, gallery, testimonials, pricing, team, showcase, booking, faq, cta, contact.
For features/testimonials/pricing/team/faq/stats/menu/products use "items" (or "plans" for pricing, "images" for gallery).
Brand fields you may patch: name, tagline, logo, primary, secondary, accent, whatsapp, email, phone, address, currency, bg_video (mp4 URL), bg_image, bg_overlay (0-1), theme ("light"|"dark"), layout ("cinematic"|"editorial"|"bento"|"neon"|"boutique"|"brutal").
Commands like "make it futuristic", "add 3D", "cinematic karo", "dark theme" => patchBrand layout/theme/bg_video/colors. Never destroy unrelated sections.
Keep replies < 15 words. Never invent fields. Use real images.unsplash.com / images.pexels.com URLs only when needed.
Current site (compact): ${JSON.stringify(compact)}`;
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: sys },
      ...data.history,
      { role: "user", content: data.message },
    ];
    const raw = await callEditorChat(messages, "google/gemini-3.6-flash", true);
    const parsed: any = parseLooseJson(raw);
    if (!parsed || typeof parsed !== "object") {
      return { reply: raw.slice(0, 200) || "OK", ops: [] };
    }
    return { reply: String(parsed.reply ?? "Done"), ops: Array.isArray(parsed.ops) ? parsed.ops : [] };
  });

/* ------- Image suggest (Pexels → Unsplash fallback) ------- */

const ImgInput = z.object({ siteId: z.string().uuid(), query: z.string().min(1).max(120), count: z.number().int().min(1).max(6).default(3) });

export const aiSuggestImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImgInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSiteEditAccess(context.supabase as any, data.siteId);
    const { searchImageKit, integrationConfig } = await import("@/lib/integrations.server");
    const ik = await integrationConfig("imagekit");
    const endpoint = String((ik.config as any)?.endpoint ?? "").replace(/\/+$/, "");
    const q = Math.round(Number((ik.config as any)?.defaultQuality ?? 80));
    const viaIk = (url: string) =>
      ik.enabled && endpoint && (ik.config as any)?.webProxy !== false
        ? `${endpoint}/${url}?tr=${encodeURIComponent(`w-1600,q-${q},f-auto`)}`
        : url;

    // 1) Own ImageKit media library
    const owned = await searchImageKit(data.query, data.count);
    if (owned.length) return { urls: owned.slice(0, data.count).map((u) => viaIk(u)) };

    // 2) Pexels (if key configured)
    const pex = process.env.PEXELS_API_KEY;
    if (pex) {
      try {
        const r = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(data.query)}&per_page=${data.count}&orientation=landscape`, {
          headers: { Authorization: pex },
        });
        if (r.ok) {
          const j = await r.json();
          const urls = (j.photos ?? []).map((p: any) => p.src?.large2x ?? p.src?.large).filter(Boolean);
          if (urls.length) return { urls: urls.map((u: string) => viaIk(u)) };
        }
      } catch {}
    }

    // 3) Keyless fallback (Flickr-backed, stable, keyword search)
    const seed = Date.now();
    const query = encodeURIComponent(data.query);
    const urls = Array.from({ length: data.count }).map((_, i) =>
      viaIk(`https://loremflickr.com/1600/900/${query}?lock=${seed + i}`)
    );
    return { urls };
  });


/* ------- Full site regenerate ------- */

const RegenInput = z.object({
  siteId: z.string().uuid(),
  brand: z.any(),
  archetype: z.string().max(40).default("business"),
  vibe: z.string().max(200).optional(),
});

export const aiRegenerateSite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegenInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSiteEditAccess(context.supabase as any, data.siteId);
    const sys = `${MASTER_SYSTEM}

You generate a website JSON. Return STRICT JSON only, matching this shape:
{"archetype":"${data.archetype}","brand":{...keep the brand passed in, you MAY set layout/theme/bg_image/bg_overlay...},"sections":[<9-12 sections>]}
Section types allowed: hero3d, features, stats, products, menu, gallery, testimonials, pricing, team, showcase, booking, faq, cta, contact.
Rules:
- hero3d: {type, headline (max 80 chars), sub (max 160), cta, image (real HD unsplash URL matching archetype), bullets?:[3 short]}
- features: {type, title, items:[{icon,title,desc}] × 3-6}
- stats: {type, items:[{k,v}] × 3-4}
- products: {type, title, items:[{id,name,price,compare_at?,image,badge?,category?}] × 4-8}  (use for shop/ecommerce archetypes)
- menu: {type, title, items:[{name,price,desc,image}] × 5-8}  (restaurant/cafe/bakery)
- gallery: {type, title, images:[real HD URLs] × 6-8}
- testimonials: {type, title, items:[{name,role,text,rating:5}] × 3}
- pricing: {type, title, plans:[{name,price,period,features:[...],featured?:true,cta}] × 3}
- team: {type, title, items:[{name,role,image}] × 3-4}
- showcase: {type, kind (rooms|listings|projects|programs|courses|services|packages), title, sub, items:[{title,meta,desc,image,cta}] × 3-8}
- booking: {type, mode (reservation|appointment|enrollment|inquiry|booking), title, sub, cta}
- faq: {type, title, items:[{q,a}] × 4-6}
- cta: {type, headline, sub, cta}
- contact: {type, title, sub}
Choose sections by category logic above (restaurant → menu, shop → products, agency → features+team, etc). Vary section order per generation.
brand.layout must be one of cinematic|editorial|bento|neon|boutique|brutal and must suit the business.
Language: match brand tone. Real, specific, non-cliché copy.${data.vibe ? " Vibe: " + data.vibe : ""}`;
    const user = `Brand: ${JSON.stringify(data.brand)}\nArchetype: ${data.archetype}\nGenerate a fresh, unique variant. Use different images/copy than a typical AI would.`;
    const raw = await callEditorChat(
      [{ role: "system", content: sys }, { role: "user", content: user }],
      "google/gemini-3.1-pro-preview",
      true,
    );
    const parsed: any = parseLooseJson(raw);
    if (!parsed?.sections?.length) throw new Error("AI returned invalid site");
    parsed.brand = { ...data.brand, ...(parsed.brand ?? {}) };
    parsed.archetype = data.archetype;
    return { content: parsed };
  });

/* ------- Niche-aware, section-wise image regeneration ------- */

const ReimageInput = z.object({
  siteId: z.string().uuid(),
  content: z.any(),
  category: z.string().max(80).optional(),
  name: z.string().max(120).optional(),
  description: z.string().max(600).optional(),
  location: z.string().max(80).optional(),
  seed: z.number().int().optional(),
});

/** Swap every stock photo in the design for fresh niche + section-wise images. */
export const aiRegenerateImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReimageInput.parse(input))
  .handler(async ({ data, context }) => {
    await requireSiteEditAccess(context.supabase as any, data.siteId);
    const { reimageContent } = await import("@/lib/images/category-images.server");
    const brand = (data.content?.brand ?? {}) as Record<string, any>;
    const seed = data.seed ?? Math.floor(Date.now() / 1000);
    const { content, replaced, profile } = await reimageContent(
      data.content,
      {
        category: data.category || data.content?.archetype || brand.category || null,
        name: data.name || brand.name || null,
        description: data.description || brand.tagline || null,
        location: data.location || brand.address || null,
      },
      seed,
    );
    return { content, replaced, niche: profile.subcategory, source: profile.source };
  });

const CatImgInput = z.object({
  category: z.string().min(1).max(80),
  name: z.string().max(120).optional(),
  description: z.string().max(600).optional(),
  section: z.string().max(24).optional(),
  count: z.number().int().min(1).max(24).default(12),
  seed: z.number().int().optional(),
});

/** Niche-wise image picker for the editor's image library. */
export const listCategoryImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CatImgInput.parse(input))
  .handler(async ({ data }) => {
    const { nicheProfileFor, sectionImages } = await import("@/lib/images/category-images.server");
    const { sectionKeyFor } = await import("@/lib/images/section-queries");
    const profile = await nicheProfileFor({
      category: data.category,
      name: data.name ?? null,
      description: data.description ?? null,
    });
    const seed = data.seed ?? Math.floor(Date.now() / 1000);
    const urls = await sectionImages(profile, sectionKeyFor(data.section), data.count, seed);
    return { urls, niche: profile.subcategory };
  });

const DetectInputSchema = z.object({
  category: z.string().max(120).optional(),
  name: z.string().max(160).optional(),
  description: z.string().max(600).optional(),
  location: z.string().max(80).optional(),
  withSamples: z.boolean().default(false),
});

/** Admin diagnostic: what does the engine understand from a business? */
export const detectNiche = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DetectInputSchema.parse(input))
  .handler(async ({ data }) => {
    const { nicheProfileFor, sectionImages } = await import("@/lib/images/category-images.server");
    const { allSectionQueries } = await import("@/lib/images/section-queries");
    const profile = await nicheProfileFor({
      category: data.category ?? null,
      name: data.name ?? null,
      description: data.description ?? null,
      location: data.location ?? null,
    });
    const samples = data.withSamples
      ? await sectionImages(profile, "hero", 4, Math.floor(Date.now() / 1000))
      : [];
    return { profile, queries: allSectionQueries(profile), samples };
  });

