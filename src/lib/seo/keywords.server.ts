/**
 * SEO / AEO / GEO keyword bank.
 *
 * The bundled dataset (10k worldwide website-development keywords, 18 languages,
 * SEO + AEO + GEO intent) is imported into `seo_keywords` once, matched to
 * categories, and then consumed by the blog generator and page metadata.
 */

type AnyDb = { from: (t: string) => any };

export type KeywordRow = { keyword: string; language: string; intent: string; category_slug: string | null };

const STOP = new Set([
  "website", "web", "development", "design", "company", "services", "service", "developer",
  "custom", "ai", "online", "booking", "best", "cheap", "professional", "top", "near", "me",
  "cost", "price", "agency", "builder", "build", "make", "how", "what", "why", "the", "for",
  "and", "with", "your", "a", "an", "of", "in", "to",
]);

/** Words that identify the industry inside a keyword phrase. */
export function keywordTokens(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

/** Match a keyword to the best matching category slug. */
export function matchCategory(
  keyword: string,
  cats: Array<{ slug: string; name: string }>,
): string | null {
  const k = keyword.toLowerCase();
  let best: { slug: string; score: number } | null = null;
  for (const c of cats) {
    const name = c.name.toLowerCase();
    const slugWords = c.slug.toLowerCase().replace(/-/g, " ");
    let score = 0;
    if (k.includes(name)) score = name.length;
    else if (k.includes(slugWords)) score = slugWords.length;
    if (score && (!best || score > best.score)) best = { slug: c.slug, score };
  }
  return best?.slug ?? null;
}

/** Load and normalise the bundled keyword dataset. */
export async function loadSeedKeywords(): Promise<Array<[string, string, string]>> {
  const mod = await import("./keywords-data.json");
  const rows = ((mod as any).default ?? mod) as Array<[string, string, string]>;
  return rows;
}

/** Import (or re-import) the bundled dataset into the bank. Duplicates skipped. */
export async function importSeedKeywords(
  db: AnyDb,
  opts: { offset?: number; limit?: number } = {},
): Promise<{ inserted: number; processed: number; total: number }> {
  const seed = await loadSeedKeywords();
  const offset = opts.offset ?? 0;
  const limit = opts.limit ?? 2000;
  const slice = seed.slice(offset, offset + limit);
  if (!slice.length) return { inserted: 0, processed: seed.length, total: seed.length };

  const { data: cats } = await db.from("categories").select("slug,name");
  const list = (cats ?? []) as Array<{ slug: string; name: string }>;

  const rows = slice.map(([keyword, language, intent]) => ({
    keyword,
    language,
    intent,
    category_slug: matchCategory(keyword, list),
  }));

  const { data, error } = await db
    .from("seo_keywords")
    .upsert(rows, { onConflict: "keyword,language", ignoreDuplicates: true })
    .select("id");

  // Older Postgres unique index is expression-based; fall back to plain insert.
  if (error) {
    let inserted = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { data: part } = await db
        .from("seo_keywords")
        .insert(rows.slice(i, i + 200))
        .select("id");
      inserted += (part ?? []).length;
    }
    return { inserted, processed: offset + slice.length, total: seed.length };
  }

  return { inserted: (data ?? []).length, processed: offset + slice.length, total: seed.length };
}

/**
 * Take the least-used keywords for a category, mixing SEO / AEO / GEO intent,
 * and bump their usage counter so a keyword is not reused across posts.
 */
export async function takeKeywords(
  db: AnyDb,
  opts: { categorySlug?: string | null; language?: string; seo?: number; aeo?: number; geo?: number },
): Promise<{ seo: string[]; aeo: string[]; geo: string[]; ids: string[] }> {
  const lang = opts.language ?? "English";
  const want = { seo: opts.seo ?? 8, aeo: opts.aeo ?? 4, geo: opts.geo ?? 3 };
  const out: any = { seo: [], aeo: [], geo: [], ids: [] as string[] };

  for (const intent of ["seo", "aeo", "geo"] as const) {
    const n = want[intent];
    if (!n) continue;
    const pick = async (slug: string | null) => {
      let q = db
        .from("seo_keywords")
        .select("id,keyword")
        .eq("intent", intent)
        .eq("language", lang)
        .order("used_count", { ascending: true })
        .limit(n * 2);
      q = slug ? q.eq("category_slug", slug) : q.is("category_slug", null);
      const { data } = await q;
      return (data ?? []) as Array<{ id: string; keyword: string }>;
    };
    let rows = opts.categorySlug ? await pick(opts.categorySlug) : [];
    if (rows.length < n) rows = rows.concat(await pick(null));
    const chosen = rows.slice(0, n);
    out[intent] = chosen.map((r) => r.keyword);
    out.ids.push(...chosen.map((r) => r.id));
  }

  // Bump usage so the next post gets fresh keywords.
  for (const id of out.ids) {
    try {
      const { data: cur } = await db.from("seo_keywords").select("used_count").eq("id", id).maybeSingle();
      await db
        .from("seo_keywords")
        .update({ used_count: (cur?.used_count ?? 0) + 1 })
        .eq("id", id);
    } catch {
      /* usage tracking must never break generation */
    }
  }
  return out;
}
