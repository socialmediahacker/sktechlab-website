/**
 * Deterministic, bucket-aware pack apply.
 *
 * Walks admin demo templates (and blog posts) and swaps every remote image URL
 * for a pre-verified photo from that row's category pack. The bucket is chosen
 * from the surrounding section / field name, so menu rows get dish close-ups,
 * team cards get people, heroes get wide atmospheric shots — never a random mix.
 * No live search API is involved, so the result is stable and repeatable.
 */
import { bucketImages, categoryPack, type PackBucket } from "./category-packs";

type AnyDb = { from: (t: string) => any };

const IMAGE_KEY = /^(image|images|logo|photo|avatar|img|banner|bg_image|thumb|cover|src|hero_image|background|backgroundImage|poster)$/i;
const REMOTE = /^https?:\/\//i;

/** Map a key / section-type hint to the pack bucket that suits it. */
function bucketFor(hint: string): PackBucket {
  const h = hint.toLowerCase();
  if (/team|staff|member|author|avatar|testimonial|review/.test(h)) return "team";
  if (/menu|dish|product|item|store|shop|price|package|plan/.test(h)) return "product";
  if (/service|feature|treatment|process|step|offer/.test(h)) return "service";
  if (/gallery|portfolio|work|project|showcase|slide|album/.test(h)) return "gallery";
  if (/hero|banner|cover|background|backdrop|cta|about|contact/.test(h)) return "hero";
  return "gallery";
}

type Pools = Record<PackBucket, { urls: string[]; i: number }>;

function makePools(slug: string, seed: number): Pools {
  const pack = categoryPack(slug);
  const out = {} as Pools;
  (Object.keys(pack) as PackBucket[]).forEach((b, bi) => {
    out[b] = { urls: bucketImages(slug, b, pack[b].length || 4, seed + bi), i: 0 };
  });
  return out;
}

function nextUrl(pools: Pools, bucket: PackBucket, used: Set<string>): string | null {
  const order: PackBucket[] = [bucket, "gallery", "hero", "service", "product", "team"];
  for (const b of order) {
    const p = pools[b];
    if (!p?.urls.length) continue;
    for (let n = 0; n < p.urls.length; n++) {
      const url = p.urls[(p.i + n) % p.urls.length] as string;
      if (!used.has(url)) {
        p.i = (p.i + n + 1) % p.urls.length;
        used.add(url);
        return url;
      }
    }
  }
  // everything used at least once — allow repeats from the requested bucket
  const p = pools[bucket] ?? pools.hero;
  if (!p?.urls.length) return null;
  const url = p.urls[p.i % p.urls.length] as string;
  p.i += 1;
  return url;
}

function walk<T>(
  node: T,
  pools: Pools,
  used: Set<string>,
  counter: { i: number },
  key: string,
  hint: string,
): T {
  if (typeof node === "string") {
    if (IMAGE_KEY.test(key) && REMOTE.test(node)) {
      const url = nextUrl(pools, bucketFor(`${hint} ${key}`), used);
      if (url) {
        counter.i += 1;
        return url as unknown as T;
      }
    }
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((v) => walk(v, pools, used, counter, key, hint)) as unknown as T;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    const localHint =
      typeof obj["type"] === "string"
        ? `${hint} ${obj["type"]}`
        : typeof obj["section"] === "string"
          ? `${hint} ${obj["section"]}`
          : hint;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const nextKey = /^\d+$/.test(k) ? key : k;
      const nextHint = /^\d+$/.test(k) ? localHint : `${localHint} ${k}`;
      out[k] = walk(v, pools, used, counter, nextKey, nextHint);
    }
    return out as unknown as T;
  }
  return node;
}

/** Apply the curated pack to every template of one category. */
export async function applyPacksToCategory(
  db: AnyDb,
  category: { id: string; slug: string },
): Promise<{ templates: number; images: number }> {
  const { data: rows } = await db
    .from("templates")
    .select("id,sections,content_json,thumbnail_url")
    .eq("category_id", category.id);
  const list = (rows ?? []) as any[];
  let images = 0;

  for (let idx = 0; idx < list.length; idx++) {
    const t = list[idx];
    const pools = makePools(category.slug, idx * 2);
    if (!pools.hero.urls.length) continue;
    const used = new Set<string>();
    const counter = { i: 0 };
    const sections = t.sections ? walk(t.sections, pools, used, counter, "", "") : t.sections;
    const content = t.content_json ? walk(t.content_json, pools, used, counter, "", "") : t.content_json;
    images += counter.i;
    // thumbnail always reads from the hero bucket so category cards look right
    const thumb = bucketImages(category.slug, "hero", 1, idx)[0] ?? t.thumbnail_url;
    await db
      .from("templates")
      .update({ sections, content_json: content, thumbnail_url: thumb })
      .eq("id", t.id);
  }
  return { templates: list.length, images };
}

/** Apply the curated pack to blog posts of one category (hero + gallery). */
export async function applyPacksToBlogs(
  db: AnyDb,
  category: { id: string; slug: string },
): Promise<number> {
  const { data: rows } = await db.from("blog_posts").select("id").eq("category_id", category.id);
  const list = (rows ?? []) as any[];
  for (let idx = 0; idx < list.length; idx++) {
    const hero = bucketImages(category.slug, "hero", 1, idx + 1)[0];
    const gallery = bucketImages(category.slug, "gallery", 2, idx * 2);
    if (!hero) continue;
    await db.from("blog_posts").update({ hero_image: hero, gallery }).eq("id", list[idx].id);
  }
  return list.length;
}
