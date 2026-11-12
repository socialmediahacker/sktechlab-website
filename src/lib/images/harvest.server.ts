/**
 * Web Image Harvest.
 *
 * Given a set of keywords (or a pasted list of URLs) we discover real business
 * websites, fetch each page, and pull out every large photo it hosts. The
 * photos land in the `harvested_images` bank with a category, a guessed page
 * section and a content hash so nothing is ever stored — or used — twice.
 *
 * Only images are taken. No text, no brand data, no contact details.
 */
import { createHash } from "crypto";

type AnyDb = { from: (t: string) => any };

/* ------------------------------------------------------------------ utils */

const DENY =
  /(logo|icon|favicon|sprite|avatar|placeholder|spacer|pixel|blank|badge|button|arrow|flag|payment|visa|mastercard|whatsapp|facebook|instagram|twitter|youtube|loader|spinner|thumb-?nail|captcha|ads?[-_/])/i;

const BAD_EXT = /\.(svg|gif|ico|bmp|tiff?)(\?|$)/i;
const OK_EXT = /\.(jpe?g|png|webp|avif)(\?|$)/i;

/** Big-ish sizes commonly encoded in filenames, e.g. `hero-1920x1080.jpg`. */
const SIZE_IN_NAME = /(\d{3,4})\s*[xX×]\s*(\d{3,4})/;

export function normaliseUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw.trim(), base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

export function hashOf(url: string): string {
  // Hash the path + filename (query stripped) so the same asset served with
  // different cache-busting params is stored once.
  let key = url;
  try {
    const u = new URL(url);
    key = `${u.hostname}${u.pathname}`.toLowerCase();
  } catch {}
  return createHash("sha1").update(key).digest("hex");
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Guess the page section an image belongs to from its alt text / filename. */
export function sectionGuess(hint: string): string {
  const t = hint.toLowerCase();
  if (/(hero|banner|slider|cover|header|masthead)/.test(t)) return "hero";
  if (/(about|story|who-?we|interior|studio)/.test(t)) return "about";
  if (/(gallery|photo|album|work-?\d|portfolio)/.test(t)) return "gallery";
  if (/(product|shop|item|menu|dish|catalog)/.test(t)) return "products";
  if (/(team|staff|doctor|chef|stylist|founder|profile)/.test(t)) return "team";
  if (/(testimonial|review|client|customer)/.test(t)) return "testimonials";
  if (/(service|feature|treatment|package|offer)/.test(t)) return "services";
  if (/(contact|map|location|store-?front)/.test(t)) return "contact";
  if (/(blog|news|article|post)/.test(t)) return "blog";
  return "gallery";
}

export type HarvestedImage = {
  url: string;
  hash: string;
  source_url: string;
  source_domain: string;
  width: number | null;
  height: number | null;
  section_key: string;
  quality_score: number;
};

/* --------------------------------------------------------------- scraping */

function pickFromSrcset(srcset: string): { url: string; w: number | null } | null {
  const parts = srcset
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const [u, d] = p.split(/\s+/);
      const w = d && /^\d+w$/.test(d) ? Number(d.slice(0, -1)) : null;
      return { url: u ?? "", w };
    })
    .filter((p) => p.url);
  if (!parts.length) return null;
  parts.sort((a, b) => (b.w ?? 0) - (a.w ?? 0));
  return parts[0] as { url: string; w: number | null };
}

/** Extract every candidate photo from one page's HTML. */
export function extractImages(html: string, pageUrl: string): HarvestedImage[] {
  const out = new Map<string, HarvestedImage>();
  const domain = domainOf(pageUrl);

  const push = (raw: string, hint: string, w: number | null, h: number | null, bonus = 0) => {
    const url = normaliseUrl(raw, pageUrl);
    if (!url) return;
    if (BAD_EXT.test(url)) return;
    if (/^data:/i.test(raw)) return;
    if (DENY.test(url) || DENY.test(hint)) return;

    let width = w;
    let height = h;
    const m = url.match(SIZE_IN_NAME);
    if (!width && m) {
      width = Number(m[1]);
      height = Number(m[2]);
    }
    // Reject anything we know is small.
    if (width && width < 700) return;
    if (height && height < 400) return;
    if (!OK_EXT.test(url) && !/\/(wp-content|uploads|images|img|media|assets|cdn)\//i.test(url)) return;

    const hash = hashOf(url);
    if (out.has(hash)) return;
    const score =
      (width ? Math.min(40, Math.round(width / 60)) : 12) +
      (/(hero|banner|slider|cover)/i.test(`${url} ${hint}`) ? 15 : 0) +
      (/(wp-content|uploads|media)/i.test(url) ? 10 : 0) +
      bonus;
    out.set(hash, {
      url,
      hash,
      source_url: pageUrl,
      source_domain: domain,
      width: width ?? null,
      height: height ?? null,
      section_key: sectionGuess(`${hint} ${url}`),
      quality_score: score,
    });
  };

  // <img> tags (src, data-src, srcset, width/height, alt)
  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const attr = (name: string) =>
      tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i"))?.[1] ?? "";
    const alt = attr("alt");
    const w = Number(attr("width")) || null;
    const h = Number(attr("height")) || null;
    const set = attr("srcset") || attr("data-srcset");
    if (set) {
      const best = pickFromSrcset(set);
      if (best) push(best.url, alt, best.w ?? w, h);
    }
    const src = attr("data-src") || attr("data-lazy-src") || attr("data-original") || attr("src");
    if (src) push(src, alt, w, h);
  }

  // <source srcset> inside <picture>
  for (const tag of html.match(/<source\b[^>]*>/gi) ?? []) {
    const set = tag.match(/srcset\s*=\s*["']([^"']+)["']/i)?.[1];
    if (set) {
      const best = pickFromSrcset(set);
      if (best) push(best.url, "", best.w, null);
    }
  }

  // CSS background-image
  for (const m of html.matchAll(/background(?:-image)?\s*:\s*url\((['"]?)([^'")]+)\1\)/gi)) {
    push(m[2] ?? "", "background hero", null, null, 5);
  }

  // og:image / twitter:image — usually the best shot on the page
  for (const m of html.matchAll(
    /<meta[^>]+(?:property|name)\s*=\s*["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]*>/gi,
  )) {
    const c = m[0].match(/content\s*=\s*["']([^"']+)["']/i)?.[1];
    if (c) push(c, "hero cover", null, null, 20);
  }

  return Array.from(out.values());
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SkTechLabBot/1.0; +https://sktechlab.com/bot) AppleWebKit/537.36 Chrome/122 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") ?? "";
    if (!ct.includes("html")) return null;
    return (await r.text()).slice(0, 1_500_000);
  } catch {
    return null;
  }
}

/** Harvest one website (home page + a couple of obvious inner pages). */
export async function harvestSite(url: string, deep = true): Promise<HarvestedImage[]> {
  const pages = [url];
  const html = await fetchHtml(url);
  if (!html) return [];
  const found = extractImages(html, url);

  if (deep) {
    const inner = new Set<string>();
    for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
      const href = normaliseUrl(m[1] ?? "", url);
      if (!href || domainOf(href) !== domainOf(url)) continue;
      if (/\/(gallery|portfolio|about|services?|products?|menu|shop|work)\b/i.test(href)) inner.add(href);
      if (inner.size >= 3) break;
    }
    for (const p of inner) {
      if (pages.includes(p)) continue;
      pages.push(p);
      const h = await fetchHtml(p);
      if (h) found.push(...extractImages(h, p));
    }
  }

  const uniq = new Map<string, HarvestedImage>();
  for (const i of found) if (!uniq.has(i.hash)) uniq.set(i.hash, i);
  return Array.from(uniq.values()).sort((a, b) => b.quality_score - a.quality_score).slice(0, 60);
}

/* -------------------------------------------------------------- discovery */

/** Find candidate websites for a keyword set (keyless, DuckDuckGo HTML). */
export async function discoverSites(keywords: string, limit = 12): Promise<string[]> {
  const q = encodeURIComponent(`${keywords} website`);
  const seen = new Set<string>();
  const out: string[] = [];
  try {
    const r = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; SkTechLabBot/1.0) AppleWebKit/537.36 Chrome/122 Safari/537.36",
      },
    });
    if (!r.ok) return [];
    const html = await r.text();
    for (const m of html.matchAll(/uddg=([^"&]+)/g)) {
      const raw = decodeURIComponent(m[1] ?? "");
      const d = domainOf(raw);
      if (!d || seen.has(d)) continue;
      if (/(duckduckgo|google|facebook|instagram|youtube|linkedin|pinterest|wikipedia|justdial|indiamart|amazon|flipkart|yelp|tripadvisor|zomato|swiggy)\./i.test(d))
        continue;
      seen.add(d);
      out.push(`https://${d}/`);
      if (out.length >= limit) break;
    }
  } catch {
    return out;
  }
  return out;
}

/* -------------------------------------------------------------- bank i/o */

/** Save a batch of harvested images, skipping anything already banked. */
export async function saveToBank(
  db: AnyDb,
  images: HarvestedImage[],
  meta: { categoryId: string | null; categorySlug: string },
): Promise<number> {
  if (!images.length) return 0;
  const rows = images.map((i) => ({
    ...i,
    category_id: meta.categoryId,
    category_slug: meta.categorySlug,
  }));
  const { data, error } = await db
    .from("harvested_images")
    .upsert(rows, { onConflict: "hash", ignoreDuplicates: true })
    .select("id");
  if (error) return 0;
  return (data ?? []).length;
}

/**
 * Pick the least-used, unblocked bank images for a category + section.
 * `maxUses` caps how often one photo may appear across the whole library.
 */
export async function bankImages(
  db: AnyDb,
  opts: { categorySlug?: string | null; section: string; count: number; maxUses?: number },
): Promise<Array<{ id: string; url: string }>> {
  const maxUses = opts.maxUses ?? 2;
  const pick = async (section: string | null, slug: string | null) => {
    let q = db
      .from("harvested_images")
      .select("id,url,cdn_url,used_count")
      .eq("blocked", false)
      .lt("used_count", maxUses)
      .order("used_count", { ascending: true })
      .order("quality_score", { ascending: false })
      .limit(opts.count * 3);
    if (slug) q = q.eq("category_slug", slug);
    if (section) q = q.eq("section_key", section);
    const { data } = await q;
    return (data ?? []) as Array<{ id: string; url: string; cdn_url: string | null }>;
  };

  const slug = opts.categorySlug ?? null;
  let rows = await pick(opts.section, slug);
  if (rows.length < opts.count) rows = rows.concat(await pick(null, slug));
  // Never borrow another category's photos. Cross-category fallback was the
  // reason unrelated templates and blog posts ended up showing the same image.
  if (!slug && rows.length < opts.count) rows = rows.concat(await pick(opts.section, null));

  const seen = new Set<string>();
  const out: Array<{ id: string; url: string }> = [];
  for (const r of rows) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push({ id: r.id, url: r.cdn_url || r.url });
    if (out.length >= opts.count) break;
  }
  return out;
}


/** Mark bank images as used by a template (keeps the no-repeat ledger honest). */
export async function markUsed(db: AnyDb, ids: string[], templateId?: string) {
  for (const id of ids) {
    const { data } = await db
      .from("harvested_images")
      .select("used_count,used_in")
      .eq("id", id)
      .single();
    const usedIn = Array.isArray(data?.used_in) ? (data!.used_in as string[]) : [];
    if (templateId && !usedIn.includes(templateId)) usedIn.push(templateId);
    await db
      .from("harvested_images")
      .update({ used_count: (data?.used_count ?? 0) + 1, used_in: usedIn })
      .eq("id", id);
  }
}
