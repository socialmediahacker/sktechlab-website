/**
 * Builds section-aware image search queries from a resolved niche profile.
 *
 * industry + niche + business type + location + style + services + section
 * → one highly specific search string per image slot.
 */
import { SECTION_INTENT, type SectionKey } from "./niche-taxonomy";

export type NicheProfile = {
  /** Broad industry group, e.g. "beauty" */
  main: string;
  /** Most specific detected niche, e.g. "bridal mehndi artist" */
  subcategory: string;
  businessType: string;
  industry: string;
  services: string[];
  styleWords: string[];
  keywords: string[];
  location?: string;
  language?: string;
  /** Ready-made per-section queries (from taxonomy or the AI resolver). */
  sectionQueries?: Partial<Record<SectionKey, string[]>>;
  source: "taxonomy" | "ai" | "fallback";
  confidence: number;
};

export const SECTION_KEYS: SectionKey[] = [
  "hero", "about", "services", "gallery", "portfolio", "products",
  "team", "testimonials", "cta", "contact", "blog",
];

/** Map a site section type to a section key. */
export function sectionKeyFor(type?: string): SectionKey {
  const t = (type ?? "").toLowerCase();
  if (t.includes("hero")) return "hero";
  if (t.includes("gallery")) return "gallery";
  if (t.includes("portfolio")) return "portfolio";
  if (t.includes("product") || t.includes("menu") || t.includes("store")) return "products";
  if (t.includes("team")) return "team";
  if (t.includes("testimonial") || t.includes("review")) return "testimonials";
  if (t.includes("feature") || t.includes("service") || t.includes("showcase") || t.includes("pricing")) return "services";
  if (t.includes("cta") || t.includes("booking")) return "cta";
  if (t.includes("contact")) return "contact";
  if (t.includes("blog") || t.includes("faq")) return "blog";
  return "about";
}

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** N distinct, highly specific queries for one section. */
export function queriesFor(profile: NicheProfile, section: SectionKey, count = 4): string[] {
  const base = clean(profile.subcategory || profile.businessType || profile.industry || "business");
  const style = (profile.styleWords ?? []).slice(0, 2).join(" ");
  const loc = profile.location ? ` ${profile.location}` : "";

  const explicit = profile.sectionQueries?.[section] ?? [];
  const intents = SECTION_INTENT[section] ?? [];
  const pool: string[] = [];

  for (const q of explicit) pool.push(clean(`${q}${loc}`));
  for (const kw of profile.keywords ?? []) {
    const intent = intents[0] ?? "";
    pool.push(clean(`${kw} ${intent}`));
  }
  for (const svc of (profile.services ?? []).slice(0, 4)) pool.push(clean(`${base} ${svc}`));
  for (const intent of intents) pool.push(clean(`${base} ${intent} ${style}`));
  pool.push(clean(`${style} ${base}${loc}`));
  pool.push(clean(`${base} ${profile.industry}`));

  const uniq: string[] = [];
  for (const q of pool) {
    const v = q.toLowerCase();
    if (v && !uniq.includes(v)) uniq.push(v);
    if (uniq.length >= count) break;
  }
  while (uniq.length < count) uniq.push(base);
  return uniq;
}

/** All section queries at once — used by the admin "test detection" panel. */
export function allSectionQueries(profile: NicheProfile): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const key of SECTION_KEYS) out[key] = queriesFor(profile, key, 3);
  return out;
}
