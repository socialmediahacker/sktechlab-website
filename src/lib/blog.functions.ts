import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ public */

async function publicClient() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, {
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
}

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  excerpt: string | null;
  body: string;
  answer_block: string | null;
  faq: Array<{ q: string; a: string }>;
  gallery: string[];
  hero_image: string | null;
  category_slug: string | null;
  keywords: string[];
  published_at: string | null;
  word_count: number;
};

/** Published posts for /blog (optionally filtered by category or search). */
export const listPublicPosts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ category: z.string().max(80).optional(), q: z.string().max(80).optional(), limit: z.number().optional() })
      .partial()
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    let q = supabase
      .from("blog_posts")
      .select("id,slug,title,excerpt,hero_image,category_slug,published_at,word_count")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(Math.min(data.limit ?? 60, 100));
    if (data.category) q = q.eq("category_slug", data.category);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows } = await q;
    return (rows ?? []) as Array<Partial<PublicPost>>;
  });

/** One published post by slug. */
export const getPublicPost = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: row } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (!row) return null;
    const { data: related } = await supabase
      .from("blog_posts")
      .select("slug,title,hero_image,excerpt")
      .eq("status", "published")
      .eq("category_slug", (row as any).category_slug ?? "")
      .neq("slug", data.slug)
      .limit(3);
    return { post: row as unknown as PublicPost, related: related ?? [] };
  });

/* ---------------------------------------------------------------- comments */

export type PublicComment = {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
};

/** Approved comments for one post. */
export const listPostComments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ postId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { data: rows } = await supabase
      .from("blog_comments_public")
      .select("id,author_name,body,created_at")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: false })
      .limit(100);
    return (rows ?? []) as PublicComment[];
  });

/** Visitor submits a comment — always stored as pending until an admin approves. */
export const submitPostComment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        postId: z.string().uuid(),
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().email().max(160).optional().or(z.literal("")),
        body: z.string().trim().min(4).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const supabase = await publicClient();
    const { error } = await supabase.from("blog_comments").insert({
      post_id: data.postId,
      author_name: data.name,
      author_email: data.email || null,
      body: data.body,
      status: "pending",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListComments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; limit?: number } | undefined) => ({
    status: input?.status ?? "pending",
    limit: Math.min(Math.max(input?.limit ?? 100, 1), 300),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("blog_comments")
      .select("id,post_id,author_name,author_email,body,status,created_at,blog_posts(title,slug)")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { count: pending } = await supabaseAdmin
      .from("blog_comments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return { rows: rows ?? [], pending: pending ?? 0 };
  });

export const adminCommentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; action: "approve" | "reject" | "delete" }) => {
    if (!input?.ids?.length) throw new Error("Select at least one comment");
    return { ids: input.ids.slice(0, 200), action: input.action };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    if (data.action === "delete") {
      await supabaseAdmin.from("blog_comments").delete().in("id", data.ids);
    } else {
      await supabaseAdmin
        .from("blog_comments")
        .update({
          status: data.action === "approve" ? "approved" : "rejected",
          approved_at: data.action === "approve" ? new Date().toISOString() : null,
        } as any)
        .in("id", data.ids);
    }
    return { ok: true, count: data.ids.length };
  });

/* ------------------------------------------------------------------- admin */

export const adminListPosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { status?: string; category?: string; q?: string; limit?: number } | undefined) => ({
    status: input?.status ?? "",
    category: input?.category ?? "",
    q: input?.q ?? "",
    limit: Math.min(Math.max(input?.limit ?? 50, 1), 200),
  }))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    let q = supabaseAdmin
      .from("blog_posts")
      .select("id,slug,title,status,category_slug,word_count,hero_image,published_at,created_at,views", {
        count: "exact",
      })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) q = q.eq("status", data.status);
    if (data.category) q = q.eq("category_slug", data.category);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: rows, count } = await q;

    const { data: cats } = await supabaseAdmin.from("categories").select("id,name,slug").order("name").limit(500);
    return { rows: rows ?? [], total: count ?? 0, categories: cats ?? [] };
  });

export const adminGetPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data: row } = await supabaseAdmin.from("blog_posts").select("*").eq("id", data.id).maybeSingle();
    return row;
  });

export const adminSavePost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Record<string, any>) => input ?? {})
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { slugify, countWords } = await import("@/lib/blog/generate.server");
    await assertAdmin(context.supabase, context.userId);

    const payload: Record<string, any> = { ...data, updated_at: new Date().toISOString() };
    if (!payload.slug && payload.title) payload.slug = slugify(String(payload.title));
    if (payload.body) payload.word_count = countWords(String(payload.body));
    if (payload.status === "published" && !payload.published_at) payload.published_at = new Date().toISOString();
    if (!payload.id) delete payload.id;
    if (!payload.created_by) payload.created_by = context.userId;

    const { data: row, error } = await supabaseAdmin.from("blog_posts").upsert(payload as any).select("*").single();
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "blog.saved",
      entity_type: "blog_post",
      entity_id: row.id,
      details: { title: row.title, status: row.status },
    });
    return row;
  });

export const adminPostAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[]; action: "publish" | "unpublish" | "delete" | "duplicate" }) => {
    if (!input?.ids?.length) throw new Error("Select at least one post");
    return { ids: input.ids.slice(0, 200), action: input.action };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    if (data.action === "delete") {
      await supabaseAdmin.from("blog_posts").delete().in("id", data.ids);
      return { ok: true, count: data.ids.length };
    }
    if (data.action === "duplicate") {
      const { data: rows } = await supabaseAdmin.from("blog_posts").select("*").in("id", data.ids);
      const copies = (rows ?? []).map((r: any) => {
        const { id, created_at, updated_at, views, ...rest } = r;
        return {
          ...rest,
          slug: `${r.slug}-copy-${Math.floor(Math.random() * 9000 + 1000)}`,
          title: `${r.title} (copy)`,
          status: "draft",
          published_at: null,
        };
      });
      if (!copies.length) return { ok: true, count: 0 };
      const { data: ins } = await supabaseAdmin.from("blog_posts").insert(copies as any).select("id");
      return { ok: true, count: (ins ?? []).length };
    }
    const publish = data.action === "publish";
    await supabaseAdmin
      .from("blog_posts")
      .update({
        status: publish ? "published" : "draft",
        published_at: publish ? new Date().toISOString() : null,
      } as any)
      .in("id", data.ids);
    return { ok: true, count: data.ids.length };
  });

/* ------------------------------------------------------------ bulk generate */

export const adminStartBlogRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      categoryIds?: string[];
      perCategory?: number;
      minWords?: number;
      maxWords?: number;
      language?: string;
    }) => ({
      categoryIds: (input?.categoryIds ?? []).slice(0, 500),
      perCategory: Math.min(Math.max(input?.perCategory ?? 1, 1), 10),
      minWords: Math.min(Math.max(input?.minWords ?? 500, 300), 1500),
      maxWords: Math.min(Math.max(input?.maxWords ?? 1200, 500), 2500),
      language: input?.language || "English",
    }),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);

    let ids = data.categoryIds;
    if (!ids.length) {
      const { data: cats } = await supabaseAdmin.from("categories").select("id").limit(1000);
      ids = (cats ?? []).map((c: any) => c.id);
    }
    if (!ids.length) throw new Error("No categories found");

    const { data: run, error } = await supabaseAdmin
      .from("blog_runs")
      .insert({
        scope: data.categoryIds.length ? "selected" : "all",
        category_ids: ids,
        per_category: data.perCategory,
        min_words: data.minWords,
        max_words: data.maxWords,
        language: data.language,
        total: ids.length * data.perCategory,
        status: "running",
        started_by: context.userId,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return run;
  });

/** Generate the next post(s) of a run. Batch-wise so nothing times out. */
export const adminBlogRunBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string; limit?: number }) => {
    if (!input?.runId) throw new Error("runId required");
    return { runId: input.runId, limit: Math.min(Math.max(input.limit ?? 1, 1), 3) };
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { generatePost } = await import("@/lib/blog/generate.server");
    await assertAdmin(context.supabase, context.userId);

    const { data: run } = await supabaseAdmin.from("blog_runs").select("*").eq("id", data.runId).maybeSingle();
    if (!run) throw new Error("Run not found");
    const r: any = run;
    if (r.status !== "running") return { ...r, done: true };

    const ids: string[] = Array.isArray(r.category_ids) ? r.category_ids : [];
    const errors: any[] = Array.isArray(r.errors) ? r.errors : [];
    let processed = r.processed as number;
    let created = r.created_count as number;
    let lastTitle = "";

    for (let n = 0; n < data.limit && processed < r.total; n++) {
      const catIndex = Math.floor(processed / r.per_category);
      const catId = ids[catIndex];
      processed++;
      if (!catId) continue;
      try {
        const { data: cat } = await supabaseAdmin
          .from("categories")
          .select("id,name,slug")
          .eq("id", catId)
          .maybeSingle();
        if (!cat) continue;
        const post = await generatePost(supabaseAdmin as any, {
          category: { id: cat.id, name: cat.name, slug: cat.slug },
          language: r.language,
          minWords: r.min_words,
          maxWords: r.max_words,
        });
        const { error } = await supabaseAdmin.from("blog_posts").insert({
          ...post,
          faq: post.faq,
          gallery: post.gallery,
          category_id: cat.id,
          category_slug: cat.slug,
          language: r.language,
          status: "published",
          published_at: new Date().toISOString(),
          created_by: context.userId,
        } as any);
        if (error) throw new Error(error.message);
        created++;
        lastTitle = post.title;
      } catch (e: any) {
        errors.push({ category: catId, error: String(e?.message ?? e).slice(0, 200) });
      }
    }

    const done = processed >= r.total;
    const { data: updated } = await supabaseAdmin
      .from("blog_runs")
      .update({
        processed,
        created_count: created,
        errors: errors.slice(-50),
        status: done ? "done" : "running",
      } as any)
      .eq("id", r.id)
      .select("*")
      .single();
    return { ...(updated as any), done, lastTitle };
  });

export const adminStopBlogRun = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { runId: string }) => {
    if (!input?.runId) throw new Error("runId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    await supabaseAdmin.from("blog_runs").update({ status: "stopped" } as any).eq("id", data.runId);
    return { ok: true };
  });

export const adminListBlogRuns = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase, context.userId);
    const { data } = await supabaseAdmin
      .from("blog_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });
