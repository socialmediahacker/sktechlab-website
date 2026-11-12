/**
 * AI blog post generator.
 *
 * Each post is built from the SEO/AEO/GEO keyword bank for one category:
 * keyword-rich title + meta, 500–1200 words of markdown, an AEO answer block,
 * FAQ entries for rich results, and category photos from the harvested bank.
 */

type AnyDb = { from: (t: string) => any };

export const BRAND_CTA =
  "Ready to launch? Get your website build with [hyper sktechlab.com](https://sktechlab.com) — AI-built, SEO-ready and live in minutes.";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function countWords(md: string): number {
  return md.replace(/[#*_`>\[\]()-]/g, " ").split(/\s+/).filter(Boolean).length;
}

async function uniqueSlug(db: AnyDb, base: string): Promise<string> {
  let slug = base || `post-${Date.now()}`;
  for (let i = 0; i < 6; i++) {
    const { data } = await db.from("blog_posts").select("id").eq("slug", slug).maybeSingle();
    if (!data) return slug;
    slug = `${base}-${Math.floor(Math.random() * 9000 + 1000)}`;
  }
  return `${base}-${Date.now()}`;
}

/** Category photos for the post (harvest bank first, then category engine). */
async function postImages(db: AnyDb, categorySlug: string, count: number): Promise<string[]> {
  const urls: string[] = [];
  try {
    const { bankImages } = await import("@/lib/images/harvest.server");
    const rows = await bankImages(db, { categorySlug, section: "hero", count, maxUses: 1 });
    urls.push(...rows.map((r) => r.url));
    if (rows.length) {
      const { markUsed } = await import("@/lib/images/harvest.server");
      await markUsed(db, rows.map((r) => r.id), `blog:${categorySlug}:${Date.now()}`);
    }
  } catch {
    /* bank optional */
  }
  if (urls.length < count) {
    try {
      const { categoryImages } = await import("@/lib/images/category-images.server");
      const more = await categoryImages(categorySlug || "business", count - urls.length, Date.now() % 97);
      urls.push(...more);
    } catch {
      /* stock optional */
    }
  }
  const { ikUrl } = await import("@/lib/images/imagekit");
  return urls.slice(0, count).map((u) => ikUrl(u, { w: 1600 }));
}

export type GeneratedPost = {
  title: string;
  slug: string;
  meta_title: string;
  meta_description: string;
  excerpt: string;
  body: string;
  answer_block: string;
  faq: Array<{ q: string; a: string }>;
  keywords: string[];
  hero_image: string | null;
  gallery: string[];
  word_count: number;
};

export async function generatePost(
  db: AnyDb,
  opts: {
    category: { id: string | null; name: string; slug: string };
    language?: string;
    minWords?: number;
    maxWords?: number;
  },
): Promise<GeneratedPost> {
  const { callEditorChat, parseLooseJson } = await import("@/lib/site-editor.server");
  const { takeKeywords } = await import("@/lib/seo/keywords.server");

  const language = opts.language ?? "English";
  const minWords = opts.minWords ?? 500;
  const maxWords = opts.maxWords ?? 1200;
  const kw = await takeKeywords(db, { categorySlug: opts.category.slug, language });
  const primary = kw.seo[0] ?? `${opts.category.name} website development`;

  const raw = await callEditorChat(
    [
      {
        role: "system",
        content: `You are a senior SEO + AEO + GEO content strategist writing for SKTECHLAB (sktechlab.com), an AI website builder.
Write ONE original, genuinely useful article. Return ONLY JSON with keys:
title (<=65 chars, contains the primary keyword),
meta_title (<=60 chars), meta_description (<=155 chars, action oriented),
excerpt (<=180 chars),
answer_block (40-60 words: a direct, quotable answer for AI search engines),
body (markdown, ${minWords}-${maxWords} words, H2/H3 sections, one short table or bullet list, no H1, natural keyword usage, no invented statistics, no fake testimonials),
faq (4-6 objects { q, a } with concise 30-50 word answers),
keywords (array of the keywords you actually used).
End the body with this exact call to action line: "${BRAND_CTA}"`,
      },
      {
        role: "user",
        content: `Language: ${language}
Industry / category: ${opts.category.name}
Primary keyword: ${primary}
Other SEO keywords: ${kw.seo.slice(1).join(", ") || "none"}
Answer-engine (AEO) questions to cover: ${kw.aeo.join(" | ") || "none"}
AI-search (GEO) angles to weave in: ${kw.geo.join(" | ") || "none"}`,
      },
    ],
    "google/gemini-3.6-flash",
    true,
  );

  const parsed = (parseLooseJson(raw) ?? {}) as any;
  const title = String(parsed.title ?? `${opts.category.name} website development guide`).slice(0, 90);
  let body = String(parsed.body ?? "").trim();
  if (!body || countWords(body) < 150) throw new Error("AI returned an empty article");
  if (!body.includes("sktechlab.com")) body += `\n\n${BRAND_CTA}`;

  const images = await postImages(db, opts.category.slug, 3);
  const keywords = Array.from(
    new Set([...(Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : []), ...kw.seo, ...kw.aeo, ...kw.geo]),
  ).slice(0, 25);

  return {
    title,
    slug: await uniqueSlug(db, slugify(title)),
    meta_title: String(parsed.meta_title ?? title).slice(0, 70),
    meta_description: String(parsed.meta_description ?? "").slice(0, 165),
    excerpt: String(parsed.excerpt ?? "").slice(0, 200),
    body,
    answer_block: String(parsed.answer_block ?? "").slice(0, 600),
    faq: (Array.isArray(parsed.faq) ? parsed.faq : [])
      .filter((f: any) => f?.q && f?.a)
      .slice(0, 8)
      .map((f: any) => ({ q: String(f.q).slice(0, 180), a: String(f.a).slice(0, 600) })),
    keywords,
    hero_image: images[0] ?? null,
    gallery: images.slice(1),
    word_count: countWords(body),
  };
}
