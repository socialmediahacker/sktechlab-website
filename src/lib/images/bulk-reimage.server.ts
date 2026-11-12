/**
 * Bulk, category-accurate re-imaging of the demo template library.
 *
 * For every template we resolve its niche (category + subcategory + name),
 * fetch section-aware photos, and write them back through ImageKit so the
 * whole library serves optimised, on-topic imagery.
 *
 * A duplicate guard keeps the hero of every template in one category unique
 * and stops any single photo appearing more than twice in that category.
 */
import { reimageContent, setBankSource } from "./category-images.server";
import { bankImages, markUsed } from "./harvest.server";

import { optimizeContentImages, setImageKitConfig } from "./imagekit";
import { integrationConfig } from "@/lib/integrations.server";

type AnyDb = { from: (t: string) => any };

const URL_RE = /https?:\/\/[^"'\s)]+/g;

function collectUrls(node: unknown, out: Set<string>) {
  if (typeof node === "string") {
    for (const m of node.match(URL_RE) ?? []) out.add(m.split("?")[0] as string);
    return;
  }
  if (Array.isArray(node)) return node.forEach((v) => collectUrls(v, out));
  if (node && typeof node === "object") Object.values(node).forEach((v) => collectUrls(v, out));
}

function countUses(node: unknown, tally: Map<string, number>) {
  const seen = new Set<string>();
  collectUrls(node, seen);
  for (const u of seen) tally.set(u, (tally.get(u) ?? 0) + 1);
}

/** Load the stored ImageKit integration into the delivery layer (server side). */
export async function primeImageKit() {
  try {
    const cfg = await integrationConfig("imagekit");
    setImageKitConfig({
      enabled: cfg.enabled !== false,
      ...(cfg.config as any),
    });
  } catch {
    /* keep defaults */
  }
}

export type BatchResult = {
  processed: number;
  replaced: number;
  done: boolean;
  lastName?: string;
};

/**
 * Re-image up to `limit` templates that still need it, starting at `offset`.
 * Called repeatedly by the admin UI so long libraries never hit a timeout.
 */
export async function reimageTemplateBatch(
  db: AnyDb,
  opts: { categoryId?: string | null; offset: number; limit: number; seed: number },
): Promise<BatchResult> {
  await primeImageKit();

  let q = db
    .from("templates")
    .select("id,name,description,archetype,content_json,category_id,subcategory_id")
    .order("created_at", { ascending: true })
    .range(opts.offset, opts.offset + opts.limit - 1);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);

  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const templates: any[] = rows ?? [];
  if (!templates.length) return { processed: 0, replaced: 0, done: true };

  // Category + subcategory labels for niche resolution.
  const catIds = Array.from(new Set(templates.map((t) => t.category_id).filter(Boolean)));
  const subIds = Array.from(new Set(templates.map((t) => t.subcategory_id).filter(Boolean)));
  const { data: cats } = await db.from("categories").select("id,name,slug").in("id", catIds.length ? catIds : [""]);
  const { data: subs } = subIds.length
    ? await db.from("subcategories").select("id,name").in("id", subIds)
    : { data: [] as any[] };
  const catById = new Map((cats ?? []).map((c: any) => [c.id, c]));
  const subById = new Map((subs ?? []).map((s: any) => [s.id, s]));

  // Duplicate guard: what is already in use inside each touched category.
  const usage = new Map<string, Map<string, number>>();
  for (const cid of catIds) {
    const { data: siblings } = await db.from("templates").select("content_json").eq("category_id", cid);
    const tally = new Map<string, number>();
    for (const s of siblings ?? []) countUses(s.content_json, tally);
    usage.set(cid, tally);
  }

  let processed = 0;
  let replaced = 0;
  let lastName: string | undefined;

  for (const [i, t] of templates.entries()) {
    const cat = catById.get(t.category_id) as any;
    const sub = subById.get(t.subcategory_id) as any;
    const tally = usage.get(t.category_id) ?? new Map<string, number>();

    // Harvested bank first: real photos from live category websites, least-used
    // first, so nothing repeats across the library.
    const usedBankIds: string[] = [];
    setBankSource(async (section, count) => {
      const picks = await bankImages(db, {
        categorySlug: cat?.slug ?? null,
        section,
        count,
        maxUses: 1,
      });
      const fresh = picks.filter((p) => (tally.get(p.url.split("?")[0] as string) ?? 0) === 0);
      const chosen = (fresh.length ? fresh : picks).slice(0, count);
      usedBankIds.push(...chosen.map((c) => c.id));
      return chosen.map((c) => c.url);
    });

    let best: { content: any; replaced: number; dupes: number } | null = null;

    // Up to 3 attempts with different seeds; keep the least-duplicated result.
    for (let attempt = 0; attempt < 3; attempt++) {
      const seed = opts.seed + opts.offset + i * 17 + attempt * 101;
      const r = await reimageContent(
        t.content_json ?? {},
        {
          name: t.name ?? null,
          category: [cat?.name, sub?.name].filter(Boolean).join(" ") || "business",
          description: [t.description, t.archetype].filter(Boolean).join(" ") || null,
        },
        seed,
      );

      const fresh = new Set<string>();
      collectUrls(r.content, fresh);
      let dupes = 0;
      for (const u of fresh) dupes += Math.max(0, (tally.get(u) ?? 0));

      if (!best || dupes < best.dupes) best = { content: r.content, replaced: r.replaced, dupes };
      if (dupes === 0) break;
    }

    setBankSource(null);
    if (usedBankIds.length) {
      await markUsed(db, Array.from(new Set(usedBankIds)), t.id);
    }


    if (!best) continue;

    const optimised = optimizeContentImages(best.content);
    const { error: upErr } = await db
      .from("templates")
      .update({ content_json: optimised })
      .eq("id", t.id);
    if (upErr) throw new Error(upErr.message);

    countUses(optimised, tally);
    usage.set(t.category_id, tally);

    processed += 1;
    replaced += best.replaced;
    lastName = t.name;
  }

  return { processed, replaced, done: templates.length < opts.limit, lastName };
}
