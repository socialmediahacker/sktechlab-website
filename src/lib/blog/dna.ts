/**
 * Blog DNA engine.
 *
 * Mirrors the template DNA idea (src/lib/design/dna.ts) for the publishing side:
 * a category + slug deterministically resolve to a full editorial identity —
 * homepage layout, article structure, cover type, typography, palette, card
 * system, sidebar logic, motion level and image art direction — plus a
 * fingerprint and a uniqueness score so two blogs never feel alike.
 */

export type BlogLayout =
  | "editorial-magazine"
  | "masonry-magazine"
  | "minimal-reading"
  | "cinematic"
  | "card-modern"
  | "bento-editorial"
  | "split-screen"
  | "horizontal-story"
  | "newspaper"
  | "luxury-magazine"
  | "image-first"
  | "typography-first"
  | "dark-editorial"
  | "featured-fullscreen"
  | "timeline-news"
  | "category-dashboard"
  | "visual-discovery"
  | "modern-journal";

export type CoverType =
  | "fullscreen"
  | "split"
  | "centered"
  | "floating"
  | "editorial"
  | "typography"
  | "collage"
  | "asymmetric"
  | "parallax"
  | "magazine";

export type ArticleStructure =
  | "editorial"
  | "longform"
  | "tutorial"
  | "case-study"
  | "recipe"
  | "property"
  | "listicle"
  | "visual-story";

export type BlogFont =
  | "magazine"
  | "luxe"
  | "editorial"
  | "geometric"
  | "humanist"
  | "technical"
  | "display"
  | "classic";

export type MotionLevel = "minimal" | "moderate" | "immersive" | "experimental";
export type CardSystem = "cover" | "frame" | "bare" | "tile" | "ticket" | "polaroid";
export type SidebarKind = "none" | "trending" | "popular" | "market" | "recipes" | "guides" | "toc";

export type BlogDNA = {
  category: string;
  direction: string;
  layout: BlogLayout;
  theme: "light" | "dark";
  palette: { primary: string; accent: string; surface: string };
  font: BlogFont;
  cover: CoverType;
  structure: ArticleStructure;
  card: CardSystem;
  sidebar: SidebarKind;
  motion: MotionLevel;
  imageStyle: string;
  articleWidth: "narrow" | "regular" | "wide";
  fingerprint: string;
  score: number;
};

export const BLOG_FONTS: Record<BlogFont, { head: string; body: string }> = {
  magazine: { head: "'Playfair Display', serif", body: "'Inter', sans-serif" },
  luxe: { head: "'Cormorant Garamond', serif", body: "'Manrope', sans-serif" },
  editorial: { head: "'Libre Baskerville', serif", body: "'Fira Sans', sans-serif" },
  geometric: { head: "'Syne', sans-serif", body: "'Outfit', sans-serif" },
  humanist: { head: "'Sora', sans-serif", body: "'Inter', sans-serif" },
  technical: { head: "'Space Grotesk', sans-serif", body: "'JetBrains Mono', monospace" },
  display: { head: "'Bebas Neue', sans-serif", body: "'Archivo', sans-serif" },
  classic: { head: "'DM Serif Display', serif", body: "'Fira Sans', sans-serif" },
};

type Profile = {
  direction: string[];
  layouts: BlogLayout[];
  fonts: BlogFont[];
  covers: CoverType[];
  structures: ArticleStructure[];
  cards: CardSystem[];
  sidebar: SidebarKind[];
  motion: MotionLevel[];
  palettes: Array<{ primary: string; accent: string; surface: string }>;
  imageStyle: string[];
  themeBias: number; // 0..1 chance of dark
};

const BASE: Profile = {
  direction: ["Modern Journal", "Clean Editorial", "Contemporary Review"],
  layouts: ["card-modern", "modern-journal", "minimal-reading", "bento-editorial", "editorial-magazine"],
  fonts: ["humanist", "geometric", "editorial", "classic"],
  covers: ["editorial", "centered", "split", "floating"],
  structures: ["editorial", "longform", "listicle"],
  cards: ["cover", "frame", "tile"],
  sidebar: ["trending", "popular", "none"],
  motion: ["moderate", "minimal"],
  palettes: [
    { primary: "#1f2937", accent: "#6366f1", surface: "#f8fafc" },
    { primary: "#0f172a", accent: "#0ea5e9", surface: "#ffffff" },
    { primary: "#111827", accent: "#f97316", surface: "#fafaf9" },
  ],
  imageStyle: ["clean editorial photography", "natural light lifestyle photography"],
  themeBias: 0.25,
};

/** Category families — a slug maps to the family whose keyword it contains. */
const FAMILIES: Array<{ keys: string[]; profile: Partial<Profile> }> = [
  {
    keys: ["restaurant", "cafe", "food", "bakery", "cloud-kitchen", "catering", "sweet", "dhaba", "pizza", "juice"],
    profile: {
      direction: ["Food Journal", "Chef Magazine", "Recipe Editorial", "Culinary Stories", "Dark Food Magazine", "Farm-to-Table Journal"],
      layouts: ["cinematic", "image-first", "masonry-magazine", "editorial-magazine", "visual-discovery", "dark-editorial"],
      fonts: ["magazine", "luxe", "classic", "editorial"],
      covers: ["fullscreen", "parallax", "magazine", "collage"],
      structures: ["recipe", "editorial", "visual-story", "listicle"],
      cards: ["cover", "polaroid", "frame"],
      sidebar: ["recipes", "popular"],
      motion: ["immersive", "moderate"],
      palettes: [
        { primary: "#2b1508", accent: "#e0761c", surface: "#fdf6ec" },
        { primary: "#14110f", accent: "#c2410c", surface: "#faf5f0" },
        { primary: "#1b2a1b", accent: "#65a30d", surface: "#f6f8f0" },
      ],
      imageStyle: ["cinematic food photography, shallow depth, warm light", "overhead rustic table styling, natural light"],
      themeBias: 0.4,
    },
  },
  {
    keys: ["salon", "beauty", "spa", "makeup", "hair", "nail", "bridal", "wellness"],
    profile: {
      direction: ["Beauty Editorial", "Luxury Salon Journal", "Bridal Magazine", "Minimal Beauty Diary", "Trend Report"],
      layouts: ["luxury-magazine", "editorial-magazine", "image-first", "split-screen", "masonry-magazine"],
      fonts: ["luxe", "magazine", "classic"],
      covers: ["split", "editorial", "floating", "magazine"],
      structures: ["editorial", "listicle", "visual-story"],
      cards: ["cover", "bare", "frame"],
      sidebar: ["trending", "guides"],
      motion: ["immersive", "moderate"],
      palettes: [
        { primary: "#2a1620", accent: "#d4a373", surface: "#fdf7f4" },
        { primary: "#1b1b1f", accent: "#e879a6", surface: "#fff7fa" },
      ],
      imageStyle: ["fashion portrait photography, soft studio light", "editorial beauty close-up, clean background"],
      themeBias: 0.3,
    },
  },
  {
    keys: ["real-estate", "property", "builder", "interior", "architect", "construction"],
    profile: {
      direction: ["Architectural Editorial", "Market Insight Journal", "Property Guide", "Neighborhood Stories"],
      layouts: ["editorial-magazine", "split-screen", "category-dashboard", "bento-editorial", "newspaper"],
      fonts: ["editorial", "geometric", "humanist"],
      covers: ["split", "asymmetric", "parallax", "editorial"],
      structures: ["property", "longform", "case-study"],
      cards: ["frame", "tile", "ticket"],
      sidebar: ["market", "guides"],
      motion: ["moderate", "minimal"],
      palettes: [
        { primary: "#0f172a", accent: "#0f766e", surface: "#f5f7f8" },
        { primary: "#1c1917", accent: "#b45309", surface: "#faf9f7" },
      ],
      imageStyle: ["architectural photography, wide angle, clean lines", "interior photography, natural daylight"],
      themeBias: 0.2,
    },
  },
  {
    keys: ["saas", "software", "tech", "it", "app", "ai", "digital", "startup", "web"],
    profile: {
      direction: ["Tech Journal", "Engineering Blog", "AI Magazine", "Product News", "Developer Hub", "Interactive Knowledge Hub"],
      layouts: ["modern-journal", "bento-editorial", "category-dashboard", "timeline-news", "dark-editorial", "minimal-reading"],
      fonts: ["technical", "geometric", "humanist"],
      covers: ["centered", "typography", "floating", "asymmetric"],
      structures: ["tutorial", "case-study", "longform", "listicle"],
      cards: ["tile", "bare", "ticket"],
      sidebar: ["toc", "popular"],
      motion: ["experimental", "moderate"],
      palettes: [
        { primary: "#0b1020", accent: "#22d3ee", surface: "#f4f7ff" },
        { primary: "#111827", accent: "#8b5cf6", surface: "#ffffff" },
      ],
      imageStyle: ["abstract technology visual, gradient light, 3d render", "product screenshot styled on gradient backdrop"],
      themeBias: 0.55,
    },
  },
  {
    keys: ["fashion", "boutique", "clothing", "jewel", "designer", "textile", "saree"],
    profile: {
      direction: ["Fashion Magazine", "Luxury Editorial", "Minimal Lookbook", "Dark Runway", "Street Style", "Experimental Typography"],
      layouts: ["luxury-magazine", "horizontal-story", "typography-first", "image-first", "featured-fullscreen", "masonry-magazine"],
      fonts: ["display", "magazine", "luxe", "geometric"],
      covers: ["fullscreen", "typography", "collage", "asymmetric", "magazine"],
      structures: ["visual-story", "editorial", "listicle"],
      cards: ["bare", "cover", "polaroid"],
      sidebar: ["trending", "none"],
      motion: ["experimental", "immersive"],
      palettes: [
        { primary: "#000000", accent: "#f43f5e", surface: "#ffffff" },
        { primary: "#1a1a1a", accent: "#d6b370", surface: "#f7f4ef" },
      ],
      imageStyle: ["full-bleed fashion editorial photography", "runway style photography, high contrast"],
      themeBias: 0.5,
    },
  },
  {
    keys: ["finance", "bank", "insurance", "loan", "invest", "account", "tax", "ca"],
    profile: {
      direction: ["Market Explainer", "Financial Education Journal", "Analyst Report", "Money Guide"],
      layouts: ["newspaper", "minimal-reading", "category-dashboard", "timeline-news"],
      fonts: ["editorial", "humanist", "classic"],
      covers: ["centered", "editorial", "typography"],
      structures: ["longform", "case-study", "listicle"],
      cards: ["ticket", "frame", "bare"],
      sidebar: ["market", "popular"],
      motion: ["minimal", "moderate"],
      palettes: [
        { primary: "#0b2545", accent: "#1d9a6c", surface: "#f7f9fb" },
        { primary: "#111827", accent: "#2563eb", surface: "#ffffff" },
      ],
      imageStyle: ["clean data visualisation, muted palette", "professional office photography, restrained tone"],
      themeBias: 0.1,
    },
  },
  {
    keys: ["law", "advocate", "legal", "consult", "chartered", "corporate"],
    profile: {
      direction: ["Legal Review", "Practice Journal", "Case Notes", "Advisory Digest"],
      layouts: ["newspaper", "minimal-reading", "editorial-magazine"],
      fonts: ["classic", "editorial"],
      covers: ["typography", "centered", "editorial"],
      structures: ["longform", "case-study"],
      cards: ["bare", "ticket"],
      sidebar: ["toc", "guides"],
      motion: ["minimal"],
      palettes: [
        { primary: "#1c2b39", accent: "#8a6a3b", surface: "#f8f7f4" },
        { primary: "#0f172a", accent: "#475569", surface: "#ffffff" },
      ],
      imageStyle: ["restrained documentary photography, muted tone"],
      themeBias: 0.08,
    },
  },
  {
    keys: ["doctor", "clinic", "hospital", "dental", "health", "pharma", "diagnostic", "yoga", "fitness", "gym"],
    profile: {
      direction: ["Health Journal", "Clinic Notes", "Wellness Editorial", "Patient Guide"],
      layouts: ["minimal-reading", "card-modern", "category-dashboard", "modern-journal"],
      fonts: ["humanist", "geometric", "editorial"],
      covers: ["centered", "split", "floating"],
      structures: ["longform", "tutorial", "listicle"],
      cards: ["frame", "tile"],
      sidebar: ["guides", "popular"],
      motion: ["minimal", "moderate"],
      palettes: [
        { primary: "#0b3b3c", accent: "#14b8a6", surface: "#f4fbfa" },
        { primary: "#132a4a", accent: "#3b82f6", surface: "#f7fafe" },
      ],
      imageStyle: ["clean clinical photography, bright and calm", "wellness lifestyle photography, soft light"],
      themeBias: 0.1,
    },
  },
  {
    keys: ["travel", "hotel", "resort", "tour", "taxi", "event", "wedding", "photograph"],
    profile: {
      direction: ["Destination Journal", "Immersive Story Hub", "Travel Magazine", "Visual Diary"],
      layouts: ["featured-fullscreen", "horizontal-story", "cinematic", "visual-discovery", "masonry-magazine"],
      fonts: ["magazine", "display", "luxe"],
      covers: ["fullscreen", "parallax", "collage", "magazine"],
      structures: ["visual-story", "editorial", "listicle"],
      cards: ["cover", "polaroid", "bare"],
      sidebar: ["trending", "guides"],
      motion: ["immersive", "experimental"],
      palettes: [
        { primary: "#0e2a3a", accent: "#f59e0b", surface: "#fbf8f2" },
        { primary: "#102a26", accent: "#10b981", surface: "#f4fbf7" },
      ],
      imageStyle: ["wide landscape travel photography, golden hour", "immersive destination photography"],
      themeBias: 0.35,
    },
  },
  {
    keys: ["school", "college", "coaching", "academy", "education", "course", "training", "library"],
    profile: {
      direction: ["Learning Journal", "Campus Magazine", "Study Guide Hub", "Knowledge Base"],
      layouts: ["category-dashboard", "card-modern", "minimal-reading", "timeline-news"],
      fonts: ["humanist", "editorial", "geometric"],
      covers: ["centered", "split", "editorial"],
      structures: ["tutorial", "longform", "listicle"],
      cards: ["tile", "frame"],
      sidebar: ["toc", "guides"],
      motion: ["moderate", "minimal"],
      palettes: [
        { primary: "#14213d", accent: "#fca311", surface: "#fbfaf6" },
        { primary: "#1e293b", accent: "#6366f1", surface: "#f8fafc" },
      ],
      imageStyle: ["bright campus photography", "clean study-desk flat lay"],
      themeBias: 0.12,
    },
  },
  {
    keys: ["shop", "store", "ecommerce", "grocery", "electronic", "furniture", "mobile", "retail", "market"],
    profile: {
      direction: ["Product Journal", "Buying Guide Hub", "Retail Magazine", "Visual Discovery"],
      layouts: ["visual-discovery", "card-modern", "masonry-magazine", "bento-editorial"],
      fonts: ["geometric", "humanist", "display"],
      covers: ["split", "floating", "collage"],
      structures: ["listicle", "editorial", "longform"],
      cards: ["tile", "cover", "ticket"],
      sidebar: ["popular", "trending"],
      motion: ["moderate", "immersive"],
      palettes: [
        { primary: "#111827", accent: "#ef4444", surface: "#ffffff" },
        { primary: "#0f172a", accent: "#f59e0b", surface: "#fffaf3" },
      ],
      imageStyle: ["clean product photography on seamless backdrop", "lifestyle product-in-use photography"],
      themeBias: 0.2,
    },
  },
];

function profileFor(slug: string): Profile {
  const s = (slug || "").toLowerCase();
  const hit = FAMILIES.find((f) => f.keys.some((k) => s.includes(k)));
  return hit ? { ...BASE, ...hit.profile } : BASE;
}

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const pick = <T,>(arr: readonly T[], seed: number, offset = 0): T => arr[(seed + offset) % arr.length]!;

/** Deterministic blog identity for a category + key (post slug or design index). */
export function blogDnaFor(categorySlug: string | null | undefined, key: string, index = 0): BlogDNA {
  const cat = (categorySlug || "general").toLowerCase();
  const p = profileFor(cat);
  const seed = hash(`${cat}::${key}::${index}`);
  const theme: "light" | "dark" = (seed % 100) / 100 < p.themeBias ? "dark" : "light";
  const widths: BlogDNA["articleWidth"][] = ["narrow", "regular", "wide"];

  const dna: BlogDNA = {
    category: cat,
    direction: pick(p.direction, seed, 1),
    layout: pick(p.layouts, seed, 2),
    theme,
    palette: pick(p.palettes, seed, 3),
    font: pick(p.fonts, seed, 5),
    cover: pick(p.covers, seed, 7),
    structure: pick(p.structures, seed, 11),
    card: pick(p.cards, seed, 13),
    sidebar: pick(p.sidebar, seed, 17),
    motion: pick(p.motion, seed, 19),
    imageStyle: pick(p.imageStyle, seed, 23),
    articleWidth: pick(widths, seed, 29),
    fingerprint: "",
    score: 0,
  };
  dna.fingerprint = fingerprintOf(dna);
  return dna;
}

export function fingerprintOf(d: BlogDNA): string {
  return [d.layout, d.cover, d.structure, d.font, d.card, d.sidebar, d.motion, d.theme, d.palette.accent, d.articleWidth].join("|");
}

const WEIGHTS: Array<[keyof BlogDNA | "accent", number]> = [
  ["layout", 22],
  ["cover", 16],
  ["structure", 14],
  ["font", 12],
  ["card", 10],
  ["sidebar", 8],
  ["motion", 7],
  ["theme", 5],
  ["accent", 4],
  ["articleWidth", 2],
];

function valueOf(d: BlogDNA, k: keyof BlogDNA | "accent"): string {
  return k === "accent" ? d.palette.accent : String(d[k as keyof BlogDNA]);
}

/** 0–100: how different this design is from the ones already generated. */
export function uniquenessScore(d: BlogDNA, others: BlogDNA[]): number {
  if (!others.length) return 100;
  const worst = Math.min(
    ...others.map((o) =>
      WEIGHTS.reduce((sum, [k, w]) => sum + (valueOf(d, k) === valueOf(o, k) ? 0 : w), 0),
    ),
  );
  return Math.round(worst);
}

/** A set of genuinely different blog designs for one category. */
export function blogDnaSetFor(categorySlug: string, count: number): BlogDNA[] {
  const out: BlogDNA[] = [];
  for (let i = 0; i < count; i++) {
    let best = blogDnaFor(categorySlug, `design-${i}`, i);
    let bestScore = uniquenessScore(best, out);
    for (let attempt = 1; attempt < 24 && bestScore < 75; attempt++) {
      const candidate = blogDnaFor(categorySlug, `design-${i}`, i + attempt * 7);
      const s = uniquenessScore(candidate, out);
      if (s > bestScore) {
        best = candidate;
        bestScore = s;
      }
    }
    best.score = bestScore;
    out.push(best);
  }
  return out;
}

/** Image-generation prompt for an article, in the blog's art direction. */
export function imagePromptFor(dna: BlogDNA, title: string, subject = ""): string {
  return [
    subject || title,
    `for a ${dna.category.replace(/-/g, " ")} publication`,
    dna.imageStyle,
    `${dna.direction} editorial art direction`,
    dna.theme === "dark" ? "moody low-key lighting" : "bright natural lighting",
    "16:9, photorealistic, no text, no watermark, no logos",
  ].join(", ");
}
