import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Suggest websites for a keyword set (admin picks / edits the list). */
export const adminDiscoverSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keywords: string; limit?: number }) => ({
    keywords: String(input?.keywords ?? "").slice(0, 200),
    limit: Math.min(Math.max(input?.limit ?? 12, 1), 30),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { discoverSites } = await import("@/lib/images/harvest.server");
    await assertAdmin(context.supabase, context.userId);
    if (!data.keywords.trim()) return { sites: [] as string[] };
    return { sites: await discoverSites(data.keywords, data.limit) };
  });

/** PDF-derived, curated Indian business websites mapped to database categories. */
export const adminReferenceSites = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null } | undefined) => ({
    categoryId: input?.categoryId ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { referenceSitesForCategory } = await import("@/lib/images/reference-sites");
    await assertAdmin(context.supabase, context.userId);
    let query = supabaseAdmin.from("categories").select("id,name,slug").order("name");
    if (data.categoryId) query = query.eq("id", data.categoryId);
    const { data: categories, error } = await query;
    if (error) throw new Error(error.message);
    return (categories ?? [])
      .map((category) => ({
        categoryId: category.id,
        categoryName: category.name,
        categorySlug: category.slug,
        sites: referenceSitesForCategory(category.name, category.slug),
      }))
      .filter((group) => group.sites.length > 0);
  });

/** Start a harvest run over a list of websites for one category. */
export const adminStartHarvest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null; keywords?: string; sites: string[] }) => {
    const sites = Array.from(
      new Set(
        (input?.sites ?? [])
          .map((s) => String(s).trim())
          .filter(Boolean)
          .map((s) => (/^https?:\/\//i.test(s) ? s : `https://${s}`)),
      ),
    ).slice(0, 120);
    if (!sites.length) throw new Error("At least one website is required");
    return { categoryId: input?.categoryId ?? null, keywords: input?.keywords ?? "", sites };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: run, error } = await supabaseAdmin
      .from("harvest_runs")
      .insert({
        scope: data.categoryId ? "category" : "all",
        category_id: data.categoryId,
        keywords: data.keywords,
        sites: data.sites,
        total: data.sites.length,
        status: "running",
        started_by: context.userId,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "images.harvest_started",
      entity_type: "harvest_run",
      entity_id: run.id,
      details: { sites: data.sites.length, keywords: data.keywords },
    });
    return run;
  });

/** Process the next few websites of a run. */
export const adminHarvestBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; limit?: number }) => {
    if (!input?.runId) throw new Error("runId required");
    return { runId: input.runId, limit: Math.min(Math.max(input.limit ?? 2, 1), 5) };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { harvestSite, saveToBank } = await import("@/lib/images/harvest.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: run, error } = await supabaseAdmin
      .from("harvest_runs")
      .select("*")
      .eq("id", data.runId)
      .single();
    if (error || !run) throw new Error("Run not found");
    const r: any = run;
    if (r.status !== "running") return { ...r, done: true };

    let slug = "";
    if (r.category_id) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("slug")
        .eq("id", r.category_id)
        .maybeSingle();
      slug = cat?.slug ?? "";
    }

    const sites: string[] = Array.isArray(r.sites) ? r.sites : [];
    const slice = sites.slice(r.processed, r.processed + data.limit);
    let collected = 0;
    let lastSite = "";

    for (const site of slice) {
      lastSite = site;
      try {
        const images = await harvestSite(site);
        collected += await saveToBank(supabaseAdmin as any, images, {
          categoryId: r.category_id,
          categorySlug: slug,
        });
      } catch {
        /* one bad site never kills the run */
      }
    }

    const processed = r.processed + slice.length;
    const done = processed >= sites.length;
    const { data: updated } = await supabaseAdmin
      .from("harvest_runs")
      .update({
        processed,
        collected: r.collected + collected,
        status: done ? "done" : "running",
      } as any)
      .eq("id", r.id)
      .select("*")
      .single();

    return { ...(updated as any), done, lastSite };
  });

/** Stop a running harvest. */
export const adminStopHarvest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => {
    if (!input?.runId) throw new Error("runId required");
    return { runId: input.runId };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("harvest_runs").update({ status: "stopped" } as any).eq("id", data.runId);
    return { ok: true };
  });

/** Recent harvest runs. */
export const adminListHarvestRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("harvest_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(15);
    return data ?? [];
  });

/** Browse the image bank. */
export const adminListBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string; domain?: string; limit?: number } | undefined) => ({
    categoryId: input?.categoryId ?? "",
    domain: input?.domain ?? "",
    limit: Math.min(Math.max(input?.limit ?? 60, 1), 200),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("harvested_images")
      .select(
        "id,url,cdn_url,upload_error,source_domain,section_key,category_slug,used_count,blocked,quality_score",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    if (data.domain) q = q.eq("source_domain", data.domain);
    const { data: rows, count } = await q;
    return { rows: rows ?? [], total: count ?? 0 };
  });

/** Block / unblock / delete a banked image, or clear a whole domain. */
export const adminUpdateBankImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; domain?: string; action: "block" | "unblock" | "delete" }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    const table = supabaseAdmin.from("harvested_images");
    const target = (q: any) => (data.id ? q.eq("id", data.id) : q.eq("source_domain", data.domain ?? "__none__"));
    if (data.action === "delete") await target(table.delete());
    else await target(table.update({ blocked: data.action === "block" } as any));
    return { ok: true };
  });

/** Export the whole bank as JSON. */
export const adminExportBank = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("harvested_images")
      .select("url,source_url,source_domain,width,height,hash,section_key,category_slug,quality_score")
      .limit(5000);
    return { version: 1, images: data ?? [] };
  });

/** Import a previously exported bank (duplicates are skipped). */
export const adminImportBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { json: string; categoryId?: string | null }) => ({
    json: String(input?.json ?? ""),
    categoryId: input?.categoryId ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { hashOf } = await import("@/lib/images/harvest.server");
    await assertAdmin(context.supabase, context.userId);

    let parsed: any;
    try {
      parsed = JSON.parse(data.json);
    } catch {
      throw new Error("Invalid JSON");
    }
    const list: any[] = Array.isArray(parsed) ? parsed : (parsed?.images ?? []);
    const rows = list
      .filter((i) => typeof i?.url === "string")
      .slice(0, 5000)
      .map((i) => ({
        url: i.url,
        source_url: i.source_url ?? null,
        source_domain: i.source_domain ?? null,
        width: i.width ?? null,
        height: i.height ?? null,
        hash: i.hash ?? hashOf(i.url),
        section_key: i.section_key ?? "gallery",
        category_slug: i.category_slug ?? "",
        category_id: data.categoryId,
        quality_score: i.quality_score ?? 10,
      }));
    if (!rows.length) return { imported: 0 };

    const { data: ins } = await supabaseAdmin
      .from("harvested_images")
      .upsert(rows as any, { onConflict: "hash", ignoreDuplicates: true })
      .select("id");
    return { imported: (ins ?? []).length };
  });

/** Per-category bank coverage (kis category me kitni photos hain). */
export const adminBankCoverage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: cats } = await supabaseAdmin.from("categories").select("id,name,slug").order("name");
    const { data: rows } = await supabaseAdmin
      .from("harvested_images")
      .select("category_slug,cdn_url")
      .eq("blocked", false)
      .limit(20000);

    const total = new Map<string, number>();
    const cdn = new Map<string, number>();
    for (const r of rows ?? []) {
      const s = (r as any).category_slug ?? "";
      total.set(s, (total.get(s) ?? 0) + 1);
      if ((r as any).cdn_url) cdn.set(s, (cdn.get(s) ?? 0) + 1);
    }
    const pending = (rows ?? []).filter((r: any) => !r.cdn_url).length;
    return {
      pendingUploads: pending,
      categories: (cats ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        images: total.get(c.slug) ?? 0,
        uploaded: cdn.get(c.slug) ?? 0,
      })),
    };
  });

/** Upload a batch of banked photos to our own ImageKit CDN. */
export const adminUploadBankBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null; limit?: number } | undefined) => ({
    categoryId: input?.categoryId ?? null,
    limit: Math.min(Math.max(input?.limit ?? 8, 1), 15),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { uploadRemoteToImageKit } = await import("@/lib/images/imagekit.server");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("harvested_images")
      .select("id,url,category_slug")
      .is("cdn_url", null)
      .eq("blocked", false)
      .order("quality_score", { ascending: false })
      .limit(data.limit);
    if (data.categoryId) q = q.eq("category_id", data.categoryId);
    const { data: rows } = await q;
    const list = (rows ?? []) as Array<{ id: string; url: string; category_slug: string }>;
    if (!list.length) return { processed: 0, uploaded: 0, failed: 0, done: true };

    let uploaded = 0;
    let failed = 0;
    for (const row of list) {
      const res = await uploadRemoteToImageKit(row.url, {
        folder: `sktechlab/bank/${row.category_slug || "misc"}`,
      });
      if ("url" in res) {
        uploaded += 1;
        await supabaseAdmin
          .from("harvested_images")
          .update({ cdn_url: res.url, uploaded_at: new Date().toISOString(), upload_error: null } as any)
          .eq("id", row.id);
      } else {
        failed += 1;
        await supabaseAdmin
          .from("harvested_images")
          .update({ upload_error: res.error.slice(0, 200), blocked: true } as any)
          .eq("id", row.id);
      }
    }
    return { processed: list.length, uploaded, failed, done: list.length < data.limit };
  });

/** Admin uploads photos from their own computer straight into the bank. */
export const adminUploadFiles = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      categoryId?: string | null;
      section?: string;
      files: Array<{ name: string; data: string }>;
    }) => ({
      categoryId: input?.categoryId ?? null,
      section: input?.section || "gallery",
      files: (input?.files ?? []).slice(0, 12),
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { uploadBase64ToImageKit } = await import("@/lib/images/imagekit.server");
    const { hashOf } = await import("@/lib/images/harvest.server");
    await assertAdmin(context.supabase, context.userId);
    if (!data.files.length) throw new Error("Koi file nahi mili");

    let slug = "";
    if (data.categoryId) {
      const { data: cat } = await supabaseAdmin
        .from("categories")
        .select("slug")
        .eq("id", data.categoryId)
        .maybeSingle();
      slug = cat?.slug ?? "";
    }

    const rows: any[] = [];
    const errors: string[] = [];
    for (const f of data.files) {
      const res = await uploadBase64ToImageKit(f.data, f.name, `sktechlab/bank/${slug || "misc"}`);
      if ("url" in res) {
        rows.push({
          url: res.url,
          cdn_url: res.url,
          uploaded_at: new Date().toISOString(),
          source_url: null,
          source_domain: "admin-upload",
          hash: hashOf(res.url),
          section_key: data.section,
          category_id: data.categoryId,
          category_slug: slug,
          quality_score: 90,
        });
      } else errors.push(`${f.name}: ${res.error}`);
    }
    if (!rows.length) throw new Error(errors[0] ?? "Upload failed");

    const { data: ins } = await supabaseAdmin
      .from("harvested_images")
      .upsert(rows, { onConflict: "hash", ignoreDuplicates: true })
      .select("id");
    return { uploaded: (ins ?? []).length, errors };
  });

/** Blog posts ko unki category ki bank photos de do (hero + inline gallery). */
export const adminFixBlogImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { offset?: number; limit?: number; onlyMissing?: boolean } | undefined) => ({
    offset: Math.max(input?.offset ?? 0, 0),
    limit: Math.min(Math.max(input?.limit ?? 8, 1), 20),
    onlyMissing: input?.onlyMissing ?? false,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { bankImages, markUsed } = await import("@/lib/images/harvest.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: posts } = await supabaseAdmin
      .from("blog_posts")
      .select("id,category_slug,hero_image,gallery")
      .order("created_at", { ascending: true })
      .range(data.offset, data.offset + data.limit - 1);
    const list = (posts ?? []) as any[];
    if (!list.length) return { processed: 0, fixed: 0, done: true };

    let fixed = 0;
    for (const post of list) {
      const generic = !post.hero_image || /loremflickr|placeholder|picsum/i.test(String(post.hero_image));
      if (data.onlyMissing && !generic) continue;

      const rows = await bankImages(supabaseAdmin as any, {
        categorySlug: post.category_slug || null,
        section: "hero",
        count: 4,
        maxUses: 3,
      });
      if (!rows.length) continue;

      const urls = rows.map((r) => r.url);
      await supabaseAdmin
        .from("blog_posts")
        .update({ hero_image: urls[0], gallery: urls.slice(1) } as any)
        .eq("id", post.id);
      await markUsed(supabaseAdmin as any, rows.map((r) => r.id), `blog:${post.id}`);
      fixed += 1;
    }
    return { processed: list.length, fixed, done: list.length < data.limit };
  });

/**
 * Jis category ka bank khaali hai usme niche-accurate stock photos daalo
 * (Pexels / curated HD) — sab hamare CDN par upload hoke bank me aati hain.
 */
export const adminSeedCategoryStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId: string; count?: number }) => {
    if (!input?.categoryId) throw new Error("categoryId required");
    return { categoryId: input.categoryId, count: Math.min(Math.max(input.count ?? 12, 1), 30) };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { categoryImages } = await import("@/lib/images/category-images.server");
    const { uploadRemoteToImageKit } = await import("@/lib/images/imagekit.server");
    const { hashOf } = await import("@/lib/images/harvest.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: cat } = await supabaseAdmin
      .from("categories")
      .select("id,name,slug")
      .eq("id", data.categoryId)
      .maybeSingle();
    if (!cat) throw new Error("Category not found");

    const sections = ["hero", "gallery", "services", "about", "products"];
    const rows: any[] = [];
    for (const section of sections) {
      const urls = await categoryImages(
        `${cat.name} ${section}`,
        Math.ceil(data.count / sections.length),
        Math.floor(Math.random() * 90),
      );
      for (const url of urls) {
        const up = await uploadRemoteToImageKit(url, { folder: `sktechlab/bank/${cat.slug}` });
        if (!("url" in up)) continue;
        rows.push({
          url: up.url,
          cdn_url: up.url,
          uploaded_at: new Date().toISOString(),
          source_url: url,
          source_domain: "stock",
          hash: hashOf(up.url),
          section_key: section,
          category_id: cat.id,
          category_slug: cat.slug,
          quality_score: 45,
        });
      }
    }
    if (!rows.length) return { added: 0 };
    const { data: ins } = await supabaseAdmin
      .from("harvested_images")
      .upsert(rows, { onConflict: "hash", ignoreDuplicates: true })
      .select("id");
    return { added: (ins ?? []).length };
  });

/** Apply the curated, pre-verified category photo packs to demo templates + blogs. */
export const adminApplyCategoryPacks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { categoryId?: string | null } | undefined) => ({
    categoryId: input?.categoryId ?? null,
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { applyPacksToCategory, applyPacksToBlogs } = await import("@/lib/images/apply-packs.server");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin.from("categories").select("id,slug").order("slug");
    if (data.categoryId) q = q.eq("id", data.categoryId);
    const { data: cats } = await q;

    let templates = 0;
    let images = 0;
    let blogs = 0;
    for (const cat of (cats ?? []) as any[]) {
      const r = await applyPacksToCategory(supabaseAdmin as any, cat);
      templates += r.templates;
      images += r.images;
      blogs += await applyPacksToBlogs(supabaseAdmin as any, cat);
    }
    return { categories: (cats ?? []).length, templates, images, blogs };
  });

/** Categories + curated pack coverage (preview URLs) for the Design Studio. */
export const adminPackOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { CATEGORY_PACKS, categoryPack } = await import("@/lib/images/category-packs");
    await assertAdmin(context.supabase, context.userId);

    const { data: cats } = await supabaseAdmin.from("categories").select("id,name,slug").order("name");
    const { data: tpl } = await supabaseAdmin.from("templates").select("category_id");
    const counts = new Map<string, number>();
    for (const t of (tpl ?? []) as any[]) {
      counts.set(t.category_id, (counts.get(t.category_id) ?? 0) + 1);
    }
    return ((cats ?? []) as any[]).map((c) => {
      const pack = categoryPack(c.slug);
      return {
        id: c.id as string,
        name: c.name as string,
        slug: c.slug as string,
        templates: counts.get(c.id) ?? 0,
        hasPack: Boolean(CATEGORY_PACKS[c.slug]),
        images: Object.values(pack).reduce((n, list) => n + list.length, 0),
        preview: [
          ...pack.hero.slice(0, 3),
          ...pack.product.slice(0, 2),
          ...pack.gallery.slice(0, 2),
        ].slice(0, 6),
      };
    });
  });
