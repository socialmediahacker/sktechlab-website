/**
 * Smart, niche-aware image sourcing for templates.
 *
 * The engine behaves like a visual search planner: it resolves the business's
 * most specific niche (any language, known or unknown), builds a query per
 * page section, and then fetches photos.
 *
 * Order: ImageKit media library (own assets) → Pexels → curated HD pools.
 * Every call is seeded so "Regenerate images" returns a fresh set.
 */
import { searchImageKit, integrationConfig } from "@/lib/integrations.server";
import { hdImages } from "@/lib/site-renderer/hd-images";
import { resolveNiche, type DetectInput } from "./niche-detect.server";
import { queriesFor, sectionKeyFor, type NicheProfile } from "./section-queries";
import type { SectionKey } from "./niche-taxonomy";

/** Stock/placeholder sources that may be replaced. User uploads are kept. */
// This function is used for admin-owned demo templates (not customer sites),
// so every remote photo is refreshable. Previously harvested URLs were not
// matched here, which made the second Bulk Apply appear to do nothing.
const REPLACEABLE = /^https?:\/\//i;

const IMAGE_KEY = /^(image|images|logo|photo|avatar|img|banner|bg_image|thumb|cover|src)$/i;

function rotate<T>(arr: T[], by: number): T[] {
  if (!arr.length) return arr;
  const n = ((by % arr.length) + arr.length) % arr.length;
  return [...arr.slice(n), ...arr.slice(0, n)];
}

async function pexelsImages(query: string, count: number, page: number): Promise<string[]> {
  const key = process.env["PEXELS_API_KEY"];
  if (!key) return [];
  const cfg = await integrationConfig("pexels");
  if (!cfg.enabled) return [];
  try {
    const r = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${count}&page=${page}&orientation=landscape`,
      { headers: { Authorization: key } },
    );
    if (!r.ok) return [];
    const j = (await r.json()) as any;
    return (j.photos ?? []).map((p: any) => p.src?.large2x ?? p.src?.large).filter(Boolean);
  } catch {
    return [];
  }
}

/** Keyless keyword-accurate fallback so niche queries still land on-topic. */
function keylessImages(query: string, count: number, seed: number): string[] {
  const q = encodeURIComponent(query.replace(/\s+/g, ","));
  return Array.from({ length: count }).map(
    (_, i) => `https://loremflickr.com/1600/900/${q}?lock=${Math.abs(seed) + i * 7 + 1}`,
  );
}

/** Fetch `count` photos for one search query. */
async function imagesForQuery(query: string, count: number, seed: number, fallbackCategory: string): Promise<string[]> {
  const out: string[] = [];

  const owned = await searchImageKit(query, Math.max(count * 2, 8));
  out.push(...rotate(owned, seed));

  if (out.length < count) {
    const page = (Math.abs(seed) % 5) + 1;
    out.push(...(await pexelsImages(query, count - out.length, page)));
  }
  if (out.length < count) {
    out.push(...hdImages(fallbackCategory, count - out.length, `${query}-${seed}`));
  }
  return Array.from(new Set(out)).slice(0, count);
}

/**
 * Optional harvested-image bank source. Bulk runs install one so real photos
 * scraped from live category websites are used first (least-used first, so a
 * photo never repeats across the library).
 */
export type BankSource = (section: SectionKey, count: number) => Promise<string[]>;
let BANK: BankSource | null = null;
export function setBankSource(fn: BankSource | null) {
  BANK = fn;
}

/** Photos for one page section of a resolved niche. */
export async function sectionImages(
  profile: NicheProfile,
  section: SectionKey,
  count: number,
  seed = 0,
): Promise<string[]> {
  const out: string[] = [];
  if (BANK) {
    try {
      out.push(...(await BANK(section, count)));
    } catch {
      /* bank empty or unavailable — fall through to the normal sources */
    }
  }
  if (out.length >= count) return out.slice(0, count);

  const queries = rotate(queriesFor(profile, section, Math.max(3, Math.min(count, 5))), seed);
  const perQuery = Math.max(1, Math.ceil((count - out.length) / queries.length));
  for (const q of queries) {
    if (out.length >= count) break;
    out.push(...(await imagesForQuery(q, perQuery, seed + out.length, profile.main)));
  }
  const uniq = Array.from(new Set(out)).slice(0, count);
  while (uniq.length < count && uniq.length) uniq.push(uniq[uniq.length % uniq.length] as string);
  return uniq;
}


/** N niche-wise images for a plain category string (editor image library). */
export async function categoryImages(category: string, count: number, seed = 0): Promise<string[]> {
  const profile = await resolveNiche({ category });
  return sectionImages(profile, "gallery", count, seed);
}

/** Resolve a niche profile from loose business info. */
export async function nicheProfileFor(input: DetectInput): Promise<NicheProfile> {
  return resolveNiche(input);
}

/**
 * Replace every stock image in a site content tree with fresh, section-aware
 * niche photos. User-uploaded images are untouched.
 */
export async function reimageContent<T>(
  content: T,
  categoryOrInput: string | DetectInput,
  seed = 0,
): Promise<{ content: T; replaced: number; profile: NicheProfile }> {
  const input: DetectInput = typeof categoryOrInput === "string" ? { category: categoryOrInput } : categoryOrInput;
  const profile = await resolveNiche(input);

  // 1) Count how many images each section needs.
  const need = new Map<SectionKey, number>();
  const countNode = (node: any, key: string, section: SectionKey) => {
    if (typeof node === "string") {
      if (IMAGE_KEY.test(key) && REPLACEABLE.test(node)) need.set(section, (need.get(section) ?? 0) + 1);
      return;
    }
    if (Array.isArray(node)) return node.forEach((v) => countNode(v, key, section));
    if (node && typeof node === "object") {
      const sec = typeof node.type === "string" ? sectionKeyFor(node.type) : section;
      for (const [k, v] of Object.entries(node)) countNode(v, /^\d+$/.test(k) ? key : k, sec);
    }
  };
  countNode(content, "", "hero");
  const total = Array.from(need.values()).reduce((a, b) => a + b, 0);
  if (!total) return { content, replaced: 0, profile };

  // 2) Fetch a dedicated pool per section.
  const pools = new Map<SectionKey, string[]>();
  for (const [section, n] of need) {
    pools.set(section, await sectionImages(profile, section, Math.max(n, 3), seed));
  }
  const cursor = new Map<SectionKey, number>();

  // 3) Swap.
  const swap = (node: any, key: string, section: SectionKey): any => {
    if (typeof node === "string") {
      if (IMAGE_KEY.test(key) && REPLACEABLE.test(node)) {
        const pool = pools.get(section) ?? [];
        if (!pool.length) return node;
        const i = cursor.get(section) ?? 0;
        cursor.set(section, i + 1);
        return pool[i % pool.length] ?? node;
      }
      return node;
    }
    if (Array.isArray(node)) return node.map((v) => swap(v, key, section));
    if (node && typeof node === "object") {
      const sec = typeof node.type === "string" ? sectionKeyFor(node.type) : section;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) out[k] = swap(v, /^\d+$/.test(k) ? key : k, sec);
      return out;
    }
    return node;
  };

  return { content: swap(content, "", "hero") as T, replaced: total, profile };
}
