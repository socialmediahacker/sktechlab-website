/**
 * Category design blueprints.
 *
 * A blueprint is a research-driven "recipe" for what the best real websites in
 * a category look like: section order, layout family, palette, fonts and motion
 * level. We never copy markup or assets — only structural patterns — so the
 * generated sites feel human-designed for that industry.
 */

export type Blueprint = {
  id?: string;
  category_id?: string | null;
  category_slug: string;
  name: string;
  section_order: string[];
  layout: string;
  palette: { primary?: string; secondary?: string; theme?: "light" | "dark" };
  fonts: { heading?: string; body?: string };
  motion: "subtle" | "medium" | "bold" | string;
  hero_style?: string | null;
  notes?: string | null;
  sources?: unknown[];
  is_active?: boolean;
  sort_order?: number;
};

export const SECTION_VOCAB = [
  "hero3d", "features", "stats", "products", "menu", "gallery", "portfolio",
  "testimonials", "pricing", "team", "showcase", "booking", "faq", "cta", "contact",
];

export const LAYOUTS = ["cinematic", "editorial", "bento", "neon", "boutique", "brutal"];

type AnyDb = { from: (t: string) => any };

/** Active blueprints for a category slug/name (most specific first). */
export async function blueprintsFor(db: AnyDb, slugOrName: string): Promise<Blueprint[]> {
  const key = (slugOrName ?? "").toLowerCase().trim();
  if (!key) return [];
  const { data } = await db
    .from("category_blueprints")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  const all: Blueprint[] = (data ?? []) as Blueprint[];
  return all.filter(
    (b) => b.category_slug.toLowerCase() === key || key.includes(b.category_slug.toLowerCase()),
  );
}

/** Deterministically pick one blueprint variant for a session. */
export function pickBlueprint(list: Blueprint[], seed: string): Blueprint | null {
  if (!list.length) return null;
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length] ?? null;
}

/** Prompt fragment describing the blueprint to the design AI. */
export function blueprintPrompt(bp: Blueprint | null): string {
  if (!bp) return "";
  return [
    `\nCATEGORY BLUEPRINT — "${bp.name}" (derived from how leading ${bp.category_slug} websites are structured; follow the STRUCTURE, invent all content and visuals yourself):`,
    `- Section order: ${bp.section_order.join(" → ")}`,
    `- Layout family: ${bp.layout}`,
    bp.hero_style ? `- Hero treatment: ${bp.hero_style}` : "",
    bp.palette?.primary ? `- Palette hint: primary ${bp.palette.primary}, secondary ${bp.palette.secondary ?? "complementary"}, theme ${bp.palette.theme ?? "light"}` : "",
    bp.fonts?.heading ? `- Typography mood: headings like ${bp.fonts.heading}, body like ${bp.fonts.body ?? "a clean grotesk"}` : "",
    `- Motion level: ${bp.motion}`,
    bp.notes ? `- Notes: ${bp.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Ask the AI to research a category and return 2-3 structural blueprints.
 * Structure only — no copying of any specific site's text, images or code.
 */
export async function researchBlueprints(category: { name: string; slug: string }): Promise<Blueprint[]> {
  const { callEditorChat, parseLooseJson } = await import("@/lib/site-editor.server");
  const raw = await callEditorChat(
    [
      {
        role: "system",
        content: `You are a senior web design researcher. For a business category you describe how the WORLD'S BEST websites in that category are structured. Output STRUCTURAL PATTERNS ONLY — never copy any brand's text, images, logos or code.

Return ONLY a JSON array of 3 objects with keys:
name (short label for the direction, e.g. "Warm Bistro Editorial"),
section_order (array of 8-11 items from: ${SECTION_VOCAB.join(", ")}),
layout (one of ${LAYOUTS.join(", ")}),
palette ({ primary hex, secondary hex, theme "light"|"dark" }),
fonts ({ heading, body } — font family names),
motion ("subtle"|"medium"|"bold"),
hero_style (one short phrase, e.g. "full-bleed video with split headline"),
notes (max 30 words on what makes this category's best sites convert).`,
      },
      { role: "user", content: `Category: ${category.name} (slug: ${category.slug})` },
    ],
    "google/gemini-3.6-flash",
    true,
  );
  const parsed = parseLooseJson(raw);
  const arr = Array.isArray(parsed) ? parsed : (parsed as any)?.blueprints;
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 3).map((b: any, i: number) => ({
    category_slug: category.slug,
    name: String(b.name ?? `${category.name} direction ${i + 1}`).slice(0, 80),
    section_order: (Array.isArray(b.section_order) ? b.section_order : [])
      .map((s: any) => String(s))
      .filter((s: string) => SECTION_VOCAB.includes(s))
      .slice(0, 12),
    layout: LAYOUTS.includes(String(b.layout)) ? String(b.layout) : "cinematic",
    palette: {
      primary: b?.palette?.primary ?? "#10b981",
      secondary: b?.palette?.secondary ?? "#0f172a",
      theme: b?.palette?.theme === "dark" ? "dark" : "light",
    },
    fonts: { heading: b?.fonts?.heading ?? "Playfair Display", body: b?.fonts?.body ?? "Inter" },
    motion: ["subtle", "medium", "bold"].includes(String(b.motion)) ? String(b.motion) : "medium",
    hero_style: b.hero_style ? String(b.hero_style).slice(0, 120) : null,
    notes: b.notes ? String(b.notes).slice(0, 240) : null,
    sort_order: i,
  }));
}
