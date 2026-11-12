/**
 * Bulk Apply — one-click alignment of a whole category's generated pages with
 * the approved category blueprint.
 *
 * Three independent layers, each toggleable from the admin UI:
 *   images — niche-accurate, ImageKit-optimised photos (re-uses the batch engine)
 *   text   — ONLY generic structural copy (section titles / subs / CTA labels).
 *            Business name, phone, WhatsApp, email, address and any owner
 *            written body copy are never touched.
 *   style  — section order, layout family, palette + theme from the blueprint.
 *
 * Every page is snapshotted before it is written so a run can be undone.
 */
import { reimageTemplateBatch } from "./bulk-reimage.server";
import { blueprintsFor, pickBlueprint, type Blueprint } from "@/lib/blueprints.server";

type AnyDb = { from: (t: string) => any };

/** Generic, brand-free headings per section type. */
function copyFor(type: string, category: string): { title?: string; sub?: string; cta?: string } {
  const c = category || "business";
  switch (type) {
    case "features":
      return { title: "Why clients choose us", sub: `What makes our ${c} work different.` };
    case "stats":
      return {};
    case "products":
      return { title: "Best sellers", sub: "Handpicked, always in stock." };
    case "menu":
      return { title: "Our menu", sub: "Made fresh, served warm." };
    case "gallery":
      return { title: "Inside our world", sub: "A look at the details." };
    case "portfolio":
      return { title: "Selected work", sub: "Recent projects, start to finish." };
    case "testimonials":
      return { title: "Loved by our clients", sub: "Real words from real customers." };
    case "pricing":
      return { title: "Simple, honest pricing", sub: "Pick the plan that fits." };
    case "team":
      return { title: "The people behind it", sub: "Experienced, friendly, dependable." };
    case "showcase":
      return { title: "What we offer", sub: "Everything you need in one place." };
    case "booking":
      return { title: "Book your slot", sub: "Takes less than a minute.", cta: "Book now" };
    case "faq":
      return { title: "Questions, answered", sub: "The things people ask us most." };
    case "cta":
      return { cta: "Get started" };
    case "contact":
      return { title: "Let's talk", sub: "We reply the same day." };
    default:
      return {};
  }
}

const TEXT_KEYS = ["title", "sub", "cta"] as const;

/** Apply blueprint copy to whitelisted keys only. */
function applyText(sections: any[], category: string) {
  let changed = 0;
  for (const s of sections) {
    const c = copyFor(String(s?.type ?? ""), category);
    for (const k of TEXT_KEYS) {
      const v = (c as any)[k];
      if (v && s[k] !== v) {
        s[k] = v;
        changed += 1;
      }
    }
  }
  return changed;
}

/** Re-order sections to the blueprint order (unknown types keep their place at the end). */
function applyStyle(content: any, bp: Blueprint) {
  const order: string[] = Array.isArray(bp.section_order) ? bp.section_order : [];
  const sections: any[] = Array.isArray(content.sections) ? content.sections : [];
  if (order.length) {
    const rank = new Map(order.map((t, i) => [t, i]));
    sections.sort(
      (a, b) => (rank.get(a?.type) ?? 999) - (rank.get(b?.type) ?? 999),
    );
    content.sections = sections;
  }
  content.brand = content.brand ?? {};
  if (bp.layout) content.brand.layout = bp.layout;
  if (bp.palette?.primary) content.brand.primary = bp.palette.primary;
  if (bp.palette?.secondary) content.brand.secondary = bp.palette.secondary;
  if (bp.palette?.theme) content.brand.theme = bp.palette.theme;
}

export type ApplyOptions = {
  runId: string;
  categoryId?: string | null;
  offset: number;
  limit: number;
  seed: number;
  applyImages: boolean;
  applyText: boolean;
  applyStyle: boolean;
  skipCustomised: boolean;
};

export type ApplyResult = {
  processed: number;
  replaced: number;
  done: boolean;
  lastName?: string;
};

/** One batch of the bulk apply. Call repeatedly until `done`. */
export async function bulkApplyBatch(db: AnyDb, opts: ApplyOptions): Promise<ApplyResult> {
  let q = db
    .from("templates")
    .select("id,name,content_json,category_id")
    .order("created_at", { ascending: true })
    .range(opts.offset, opts.offset + opts.limit - 1);
  if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  const { data: rows, error } = await q;
  if (error) throw new Error(error.message);
  const templates: any[] = rows ?? [];
  if (!templates.length) return { processed: 0, replaced: 0, done: true };

  // Snapshot every page we are about to touch (undo support).
  await db.from("bulk_apply_snapshots").insert(
    templates.map((t) => ({ run_id: opts.runId, template_id: t.id, content: t.content_json ?? {} })),
  );

  // Text/style pass.
  if (opts.applyText || opts.applyStyle) {
    const catIds = Array.from(new Set(templates.map((t) => t.category_id).filter(Boolean)));
    const { data: cats } = await db
      .from("categories")
      .select("id,name,slug")
      .in("id", catIds.length ? catIds : [""]);
    const catById = new Map((cats ?? []).map((c: any) => [c.id, c]));

    for (const t of templates) {
      if (opts.skipCustomised && (t.content_json as any)?.__customised) continue;
      const cat = catById.get(t.category_id) as any;
      const content = JSON.parse(JSON.stringify(t.content_json ?? {}));
      if (!Array.isArray(content.sections)) continue;

      if (opts.applyText) applyText(content.sections, cat?.name ?? "business");
      if (opts.applyStyle && cat?.slug) {
        const list = await blueprintsFor(db, cat.slug);
        const bp = pickBlueprint(list, `${t.id}`);
        if (bp) applyStyle(content, bp);
      }
      const { error: upErr } = await db.from("templates").update({ content_json: content }).eq("id", t.id);
      if (upErr) throw new Error(upErr.message);
    }
  }

  // Image pass (reuses the proven duplicate-guarded engine).
  if (opts.applyImages) {
    const r = await reimageTemplateBatch(db, {
      categoryId: opts.categoryId ?? null,
      offset: opts.offset,
      limit: opts.limit,
      seed: opts.seed,
    });
    return { ...r, done: r.done };
  }

  return {
    processed: templates.length,
    replaced: 0,
    done: templates.length < opts.limit,
    lastName: templates[templates.length - 1]?.name,
  };
}

/** Restore every page touched by a run. */
export async function undoBulkApply(db: AnyDb, runId: string): Promise<number> {
  const { data: snaps } = await db
    .from("bulk_apply_snapshots")
    .select("template_id,content")
    .eq("run_id", runId);
  let restored = 0;
  for (const s of snaps ?? []) {
    const { error } = await db.from("templates").update({ content_json: s.content }).eq("id", s.template_id);
    if (!error) restored += 1;
  }
  await db.from("bulk_apply_snapshots").delete().eq("run_id", runId);
  return restored;
}
