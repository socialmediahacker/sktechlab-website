/**
 * Category → design profile map.
 *
 * Each business category gets a fixed visual family (layout, theme, palette,
 * hero style, section order). A deterministic per-template variant then shifts
 * hero kind, accent shade and section order inside the family so the 5–7 demos
 * of one category never look identical.
 */
import type { LayoutKind } from "@/lib/site-renderer/variants";
import { CATALOG_BY_SLUG, type OrderFamily } from "@/lib/categories/catalog";

export type DesignProfile = {
  layouts: LayoutKind[];
  theme: "light" | "dark";
  palettes: Array<{ primary: string; secondary: string; accent: string }>;
  /** Preferred section order (types that exist in the template get sorted by this). */
  order: string[];
};

const P = {
  gold: { primary: "#c8a45c", secondary: "#171310", accent: "#f0dcae" },
  ink: { primary: "#111827", secondary: "#374151", accent: "#9ca3af" },
  crimson: { primary: "#b91c1c", secondary: "#1c0f0f", accent: "#f59e0b" },
  emerald: { primary: "#047857", secondary: "#052e26", accent: "#6ee7b7" },
  ocean: { primary: "#0369a1", secondary: "#082f49", accent: "#38bdf8" },
  violet: { primary: "#6d28d9", secondary: "#1e1b4b", accent: "#c4b5fd" },
  rose: { primary: "#be185d", secondary: "#2a0d1c", accent: "#fbcfe8" },
  amber: { primary: "#b45309", secondary: "#231407", accent: "#fcd34d" },
  slate: { primary: "#0f172a", secondary: "#334155", accent: "#94a3b8" },
  lime: { primary: "#4d7c0f", secondary: "#1a2e05", accent: "#bef264" },
  cyan: { primary: "#0e7490", secondary: "#083344", accent: "#67e8f9" },
  clay: { primary: "#9a3412", secondary: "#2b1206", accent: "#fdba74" },
};

const ORDER = {
  food: ["hero3d", "menu", "gallery", "features", "testimonials", "booking", "faq", "contact", "cta"],
  service: ["hero3d", "features", "showcase", "gallery", "stats", "testimonials", "pricing", "booking", "faq", "contact", "cta"],
  shop: ["hero3d", "products", "features", "gallery", "testimonials", "faq", "contact", "cta"],
  visual: ["hero3d", "gallery", "portfolio", "showcase", "features", "testimonials", "booking", "contact", "cta"],
  trust: ["hero3d", "features", "stats", "showcase", "team", "testimonials", "pricing", "faq", "contact", "cta"],
  stay: ["hero3d", "showcase", "gallery", "features", "testimonials", "booking", "faq", "contact", "cta"],
  wellness: ["hero3d", "features", "showcase", "gallery", "pricing", "team", "testimonials", "booking", "contact", "cta"],
  saas: ["hero3d", "features", "stats", "showcase", "pricing", "testimonials", "faq", "contact", "cta"],
};

const PROFILES: Record<string, DesignProfile> = {
  restaurant: { layouts: ["editorial", "cinematic"], theme: "dark", palettes: [P.crimson, P.amber], order: ORDER.food },
  cafe: { layouts: ["boutique", "editorial"], theme: "light", palettes: [P.clay, P.amber], order: ORDER.food },
  catering: { layouts: ["editorial", "boutique"], theme: "dark", palettes: [P.amber, P.crimson], order: ORDER.food },
  kirana: { layouts: ["bento"], theme: "light", palettes: [P.lime, P.emerald], order: ORDER.shop },
  ecommerce: { layouts: ["bento", "prism"], theme: "light", palettes: [P.violet, P.ocean], order: ORDER.shop },
  fashion: { layouts: ["noirgold", "bento"], theme: "dark", palettes: [P.rose, P.gold], order: ORDER.shop },
  boutique: { layouts: ["noirgold", "boutique"], theme: "dark", palettes: [P.gold, P.rose], order: ORDER.shop },
  jewellery: { layouts: ["noirgold"], theme: "dark", palettes: [P.gold, P.amber], order: ORDER.shop },
  salon: { layouts: ["boutique", "noirgold"], theme: "light", palettes: [P.rose, P.gold], order: ORDER.wellness },
  makeup: { layouts: ["boutique", "noirgold"], theme: "dark", palettes: [P.rose, P.violet], order: ORDER.wellness },
  barber: { layouts: ["brutal", "neon"], theme: "dark", palettes: [P.ink, P.amber], order: ORDER.wellness },
  "mehndi-art": { layouts: ["boutique"], theme: "light", palettes: [P.clay, P.amber], order: ORDER.visual },
  tattoo: { layouts: ["neon", "brutal"], theme: "dark", palettes: [P.ink, P.violet], order: ORDER.visual },
  spa: { layouts: ["boutique"], theme: "light", palettes: [P.emerald, P.cyan], order: ORDER.wellness },
  yoga: { layouts: ["boutique", "cinematic"], theme: "light", palettes: [P.emerald, P.lime], order: ORDER.wellness },
  gym: { layouts: ["brutal", "neon"], theme: "dark", palettes: [P.lime, P.ink], order: ORDER.wellness },
  "gym-trainer": { layouts: ["neon", "brutal"], theme: "dark", palettes: [P.lime, P.crimson], order: ORDER.wellness },
  pet: { layouts: ["bento", "boutique"], theme: "light", palettes: [P.amber, P.emerald], order: ORDER.service },
  doctor: { layouts: ["cinematic", "prism"], theme: "light", palettes: [P.ocean, P.cyan], order: ORDER.trust },
  dentist: { layouts: ["prism", "cinematic"], theme: "light", palettes: [P.cyan, P.ocean], order: ORDER.trust },
  law: { layouts: ["brutal", "editorial"], theme: "light", palettes: [P.ink, P.gold], order: ORDER.trust },
  finance: { layouts: ["brutal", "prism"], theme: "light", palettes: [P.slate, P.emerald], order: ORDER.trust },
  "chartered-accountant": { layouts: ["brutal"], theme: "light", palettes: [P.slate, P.ocean], order: ORDER.trust },
  consulting: { layouts: ["prism", "brutal"], theme: "light", palettes: [P.slate, P.violet], order: ORDER.trust },
  business: { layouts: ["prism", "cinematic"], theme: "light", palettes: [P.ocean, P.slate], order: ORDER.trust },
  startup: { layouts: ["prism", "neon"], theme: "dark", palettes: [P.violet, P.cyan], order: ORDER.saas },
  saas: { layouts: ["prism"], theme: "dark", palettes: [P.violet, P.ocean], order: ORDER.saas },
  "digital-agency": { layouts: ["neon", "prism"], theme: "dark", palettes: [P.violet, P.crimson], order: ORDER.saas },
  "marketing-agency": { layouts: ["neon", "bento"], theme: "dark", palettes: [P.crimson, P.violet], order: ORDER.saas },
  construction: { layouts: ["brutal"], theme: "light", palettes: [P.amber, P.slate], order: ORDER.service },
  interior: { layouts: ["editorial", "boutique"], theme: "light", palettes: [P.clay, P.gold], order: ORDER.visual },
  "real-estate": { layouts: ["cinematic", "editorial"], theme: "light", palettes: [P.slate, P.gold], order: ORDER.stay },
  hotel: { layouts: ["cinematic", "noirgold"], theme: "dark", palettes: [P.gold, P.emerald], order: ORDER.stay },
  "boutique-hotel": { layouts: ["noirgold", "cinematic"], theme: "dark", palettes: [P.gold, P.clay], order: ORDER.stay },
  travel: { layouts: ["cinematic", "bento"], theme: "light", palettes: [P.ocean, P.amber], order: ORDER.stay },
  "tour-operator": { layouts: ["cinematic"], theme: "light", palettes: [P.cyan, P.amber], order: ORDER.stay },
  wedding: { layouts: ["boutique", "editorial"], theme: "light", palettes: [P.rose, P.gold], order: ORDER.visual },
  "photographer-wedding": { layouts: ["editorial", "boutique"], theme: "dark", palettes: [P.rose, P.ink], order: ORDER.visual },
  photography: { layouts: ["editorial", "cinematic"], theme: "dark", palettes: [P.ink, P.gold], order: ORDER.visual },
  portfolio: { layouts: ["prism", "editorial"], theme: "dark", palettes: [P.violet, P.ink], order: ORDER.visual },
  freelancer: { layouts: ["prism", "bento"], theme: "light", palettes: [P.violet, P.cyan], order: ORDER.visual },
  music: { layouts: ["neon", "cinematic"], theme: "dark", palettes: [P.violet, P.crimson], order: ORDER.visual },
  podcast: { layouts: ["neon", "prism"], theme: "dark", palettes: [P.violet, P.amber], order: ORDER.visual },
  blog: { layouts: ["editorial"], theme: "light", palettes: [P.ink, P.ocean], order: ORDER.visual },
  event: { layouts: ["cinematic", "neon"], theme: "dark", palettes: [P.violet, P.gold], order: ORDER.visual },
  "event-decorator": { layouts: ["boutique", "cinematic"], theme: "light", palettes: [P.rose, P.gold], order: ORDER.visual },
  education: { layouts: ["bento", "prism"], theme: "light", palettes: [P.ocean, P.amber], order: ORDER.trust },
  "coaching-center": { layouts: ["bento"], theme: "light", palettes: [P.ocean, P.crimson], order: ORDER.trust },
  tutor: { layouts: ["bento", "boutique"], theme: "light", palettes: [P.emerald, P.ocean], order: ORDER.trust },
  "driving-school": { layouts: ["bento", "brutal"], theme: "light", palettes: [P.amber, P.slate], order: ORDER.service },
  automotive: { layouts: ["neon", "brutal"], theme: "dark", palettes: [P.crimson, P.slate], order: ORDER.service },
  "crane-service": { layouts: ["brutal"], theme: "light", palettes: [P.amber, P.ink], order: ORDER.service },
  "packers-movers": { layouts: ["bento", "brutal"], theme: "light", palettes: [P.ocean, P.amber], order: ORDER.service },
  cleaning: { layouts: ["bento", "prism"], theme: "light", palettes: [P.cyan, P.emerald], order: ORDER.service },
  ngo: { layouts: ["editorial", "bento"], theme: "light", palettes: [P.emerald, P.amber], order: ORDER.trust },
  astrologer: { layouts: ["noirgold", "cinematic"], theme: "dark", palettes: [P.violet, P.gold], order: ORDER.wellness },
};

const FALLBACK: DesignProfile = {
  layouts: ["cinematic", "prism"],
  theme: "light",
  palettes: [P.ocean, P.slate],
  order: ORDER.service,
};

/** Palette keys used by the category catalogue. */
const PALETTE_BY_KEY: Record<string, { primary: string; secondary: string; accent: string }> = P;

/** Build a profile for a catalogue category that has no hand-tuned entry. */
function catalogProfile(slug: string): DesignProfile | null {
  const c = CATALOG_BY_SLUG[slug];
  if (!c) return null;
  const palettes = c.palettes.map((k) => PALETTE_BY_KEY[k]).filter(Boolean) as DesignProfile["palettes"];
  return {
    layouts: (c.layouts.length ? c.layouts : ["cinematic"]) as LayoutKind[],
    theme: c.theme,
    palettes: palettes.length ? palettes : [P.ocean, P.slate],
    order: ORDER[c.family as OrderFamily] ?? ORDER.service,
  };
}

export function profileFor(slug: string): DesignProfile {
  return PROFILES[slug] ?? catalogProfile(slug) ?? FALLBACK;
}

export const PROFILE_SLUGS = Object.keys(PROFILES);
