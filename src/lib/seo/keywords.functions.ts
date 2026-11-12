import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Keyword bank stats + a page of keywords for the admin panel. */
export const adminListKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { q?: string; intent?: string; language?: string; category?: string; limit?: number } | undefined) => ({
    q: input?.q ?? "",
    intent: input?.intent ?? "",
    language: input?.language ?? "",
    category: input?.category ?? "",
    limit: Math.min(Math.max(input?.limit ?? 60, 1), 200),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("seo_keywords")
      .select("id,keyword,language,intent,category_slug,used_count", { count: "exact" })
      .order("used_count", { ascending: true })
      .limit(data.limit);
    if (data.q) q = q.ilike("keyword", `%${data.q}%`);
    if (data.intent) q = q.eq("intent", data.intent);
    if (data.language) q = q.eq("language", data.language);
    if (data.category) q = q.eq("category_slug", data.category);
    const { data: rows, count } = await q;
    return { rows: rows ?? [], total: count ?? 0 };
  });

/** Import the bundled 10k keyword dataset, chunk by chunk. */
export const adminImportKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { offset?: number; limit?: number } | undefined) => ({
    offset: Math.max(input?.offset ?? 0, 0),
    limit: Math.min(Math.max(input?.limit ?? 1500, 100), 3000),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { importSeedKeywords } = await import("@/lib/seo/keywords.server");
    await assertAdmin(context.supabase, context.userId);
    const res = await importSeedKeywords(supabaseAdmin as any, data);
    return { ...res, done: res.processed >= res.total };
  });

/** Add one keyword by hand. */
export const adminAddKeyword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { keyword: string; intent?: string; language?: string; category_slug?: string }) => {
    if (!input?.keyword?.trim()) throw new Error("keyword required");
    return {
      keyword: input.keyword.trim().slice(0, 160),
      intent: ["seo", "aeo", "geo"].includes(input.intent ?? "") ? input.intent! : "seo",
      language: input.language || "English",
      category_slug: input.category_slug || null,
    };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await supabaseAdmin.from("seo_keywords").insert(data as any).select("*").single();
    if (error) throw new Error(error.message);
    return row;
  });

export const adminDeleteKeyword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("seo_keywords").delete().eq("id", data.id);
    return { ok: true };
  });

/** Keywords for a category — used by page metadata (public, cached read). */
export const categoryKeywords = createServerFn({ method: "GET" })
  .inputValidator((input: { slug: string }) => ({ slug: String(input?.slug ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    if (!data.slug) return { seo: [] as string[], aeo: [] as string[], geo: [] as string[] };
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input: any, init: any) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: rows } = await supabase
      .from("seo_keywords")
      .select("keyword,intent")
      .eq("category_slug", data.slug)
      .limit(40);
    const out = { seo: [] as string[], aeo: [] as string[], geo: [] as string[] };
    for (const r of rows ?? []) {
      const bucket = (out as any)[(r as any).intent];
      if (Array.isArray(bucket) && bucket.length < 12) bucket.push((r as any).keyword);
    }
    return out;
  });
