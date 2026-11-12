/**
 * Backfill: give every demo template its own Template DNA — layout, theme,
 * palette, typography system, navigation style, corner language, spacing
 * rhythm, motion profile and section order — with a uniqueness check so
 * siblings in one category never come out as the same page recoloured.
 */
import { orderSections } from "./variant";
import { dnaSetFor, fingerprintOf } from "./dna";

type AnyDb = { from: (t: string) => any };

export async function applyProfilesToCategory(
  db: AnyDb,
  category: { id: string; slug: string },
): Promise<{ templates: number; avgScore: number }> {
  const { data: rows } = await db
    .from("templates")
    .select("id,content_json,sections")
    .eq("category_id", category.id)
    .order("sort_order", { ascending: true });
  const list = (rows ?? []) as any[];
  if (!list.length) return { templates: 0, avgScore: 100 };

  const set = dnaSetFor(category.slug, list.map((t) => String(t.id)));
  let total = 0;

  for (let i = 0; i < list.length; i++) {
    const t = list[i];
    const { dna, score } = set[i]!;
    total += score;
    const content = (t.content_json ?? {}) as any;
    const brand = { ...(content.brand ?? {}) };
    brand.layout = dna.layout;
    brand.theme = dna.theme;
    brand.primary = dna.primary;
    brand.secondary = dna.secondary;
    brand.accent = dna.accent;
    brand.font = dna.font;
    brand.nav = dna.nav;
    brand.density = dna.density;
    brand.corner = dna.corner;
    brand.motion = dna.motion;
    brand.direction = dna.direction;

    const secs = Array.isArray(content.sections) ? orderSections(content.sections, dna.order) : content.sections;
    const patch: Record<string, unknown> = {
      content_json: {
        ...content,
        brand,
        sections: secs,
        dna: { ...dna, fingerprint: fingerprintOf(dna), uniqueness: score, version: 2 },
      },
    };
    if (Array.isArray(t.sections)) patch["sections"] = orderSections(t.sections, dna.order);
    if (dna.accent) patch["accent_color"] = dna.primary;

    await db.from("templates").update(patch).eq("id", t.id);
  }
  return { templates: list.length, avgScore: Math.round(total / list.length) };
}

export async function applyProfilesEverywhere(db: AnyDb): Promise<{ categories: number; templates: number; avgScore: number }> {
  const { data: cats } = await db.from("categories").select("id,slug");
  const list = (cats ?? []) as Array<{ id: string; slug: string }>;
  let templates = 0;
  let weighted = 0;
  for (const c of list) {
    const r = await applyProfilesToCategory(db, c);
    templates += r.templates;
    weighted += r.avgScore * r.templates;
  }
  return { categories: list.length, templates, avgScore: templates ? Math.round(weighted / templates) : 100 };
}
