/**
 * Layout skins.
 *
 * A category's layout kind (editorial, bento, neon, boutique, brutal,
 * noirgold, prism, cinematic) decides not just the hero but the chrome and
 * the *structure* of every section below it: heading style, card treatment,
 * alignment, and which structural variant each section renders.
 *
 * This is what stops every demo from looking like the same glass-card page.
 */
import type { LayoutKind } from "./variants";

export type Skin = {
  kind: LayoutKind;
  /** vertical rhythm */
  pad: string;
  container: string;
  /** typography */
  h1: string;
  h2: string;
  h3: string;
  body: string;
  eyebrow: string;
  align: "center" | "left";
  /** shapes */
  radius: string;
  radiusSm: string;
  ctaShape: string;
  /** structural variants */
  features: "grid" | "bento" | "rows" | "split" | "boxes";
  showcase: "cards" | "rows" | "frames" | "mosaic";
  reviews: "marquee" | "grid" | "quote";
  stats: "row" | "tiles" | "band";
  ctaBlock: "card" | "band" | "split";
  faq: "cards" | "rules";
  /** should alternating sections use the tinted surface? */
  alt: boolean;
  /** decorative accents */
  rule: boolean;
};

const BASE: Skin = {
  kind: "cinematic",
  pad: "py-16 sm:py-24 md:py-32",
  container: "max-w-7xl",
  h1: "font-display text-5xl font-black tracking-tight md:text-7xl",
  h2: "font-display text-4xl font-black tracking-tight md:text-5xl",
  h3: "font-display text-xl font-bold",
  body: "text-base leading-relaxed",
  eyebrow: "text-[11px] font-bold uppercase tracking-[0.24em]",
  align: "center",
  radius: "rounded-3xl",
  radiusSm: "rounded-2xl",
  ctaShape: "rounded-full",
  features: "split",
  showcase: "cards",
  reviews: "marquee",
  stats: "row",
  ctaBlock: "card",
  faq: "cards",
  alt: true,
  rule: false,
};

const SKINS: Record<LayoutKind, Partial<Skin>> = {
  cinematic: {},
  editorial: {
    pad: "py-16 sm:py-24 md:py-28",
    container: "max-w-6xl",
    h2: "font-serif text-4xl italic leading-[1.05] tracking-tight md:text-6xl",
    h3: "font-serif text-2xl italic",
    body: "font-serif text-[17px] leading-relaxed",
    eyebrow: "text-[10px] uppercase tracking-[0.4em]",
    align: "left",
    radius: "rounded-none",
    radiusSm: "rounded-none",
    ctaShape: "rounded-none",
    features: "rows",
    showcase: "rows",
    reviews: "quote",
    stats: "band",
    ctaBlock: "band",
    faq: "rules",
    rule: true,
    alt: false,
  },
  bento: {
    pad: "py-14 sm:py-20 md:py-28",
    h2: "font-display text-4xl font-black tracking-tight md:text-5xl",
    radius: "rounded-[28px]",
    radiusSm: "rounded-2xl",
    align: "left",
    features: "bento",
    showcase: "mosaic",
    reviews: "grid",
    stats: "tiles",
    ctaBlock: "card",
  },
  neon: {
    pad: "py-16 sm:py-24 md:py-32",
    h2: "font-display text-4xl font-black uppercase tracking-tight md:text-6xl",
    h3: "font-display text-lg font-black uppercase tracking-wide",
    eyebrow: "font-mono text-[10px] uppercase tracking-[0.35em]",
    body: "font-mono text-sm leading-relaxed",
    radius: "rounded-xl",
    radiusSm: "rounded-lg",
    ctaShape: "rounded-md",
    align: "center",
    features: "boxes",
    showcase: "frames",
    reviews: "marquee",
    stats: "band",
    ctaBlock: "band",
    faq: "rules",
  },
  boutique: {
    pad: "py-20 sm:py-28 md:py-36",
    container: "max-w-6xl",
    h2: "font-serif text-4xl leading-tight tracking-tight md:text-6xl",
    h3: "font-serif text-2xl",
    body: "text-[17px] leading-loose",
    eyebrow: "text-[11px] tracking-[0.35em] uppercase",
    radius: "rounded-[36px]",
    radiusSm: "rounded-3xl",
    align: "center",
    features: "split",
    showcase: "rows",
    reviews: "quote",
    stats: "row",
    ctaBlock: "split",
    faq: "rules",
  },
  brutal: {
    pad: "py-14 sm:py-20 md:py-28",
    h2: "font-display text-4xl font-black uppercase leading-[0.95] tracking-tight md:text-6xl",
    h3: "font-display text-lg font-black uppercase",
    eyebrow: "text-[10px] font-black uppercase tracking-[0.3em]",
    radius: "rounded-none",
    radiusSm: "rounded-none",
    ctaShape: "rounded-none",
    align: "left",
    features: "boxes",
    showcase: "rows",
    reviews: "grid",
    stats: "tiles",
    ctaBlock: "band",
    faq: "rules",
    rule: true,
  },
  noirgold: {
    pad: "py-20 sm:py-28 md:py-36",
    container: "max-w-6xl",
    h2: "font-serif text-4xl tracking-tight md:text-6xl",
    h3: "font-serif text-xl",
    eyebrow: "text-[10px] uppercase tracking-[0.45em]",
    radius: "rounded-[22px]",
    radiusSm: "rounded-2xl",
    align: "center",
    features: "grid",
    showcase: "frames",
    reviews: "quote",
    stats: "band",
    ctaBlock: "split",
    faq: "rules",
    rule: true,
  },
  prism: {
    pad: "py-16 sm:py-24 md:py-32",
    radius: "rounded-[32px]",
    align: "center",
    features: "grid",
    showcase: "cards",
    reviews: "grid",
    stats: "tiles",
    ctaBlock: "card",
  },
};

export type SkinOptions = {
  /** vertical rhythm override coming from the template DNA */
  density?: "tight" | "normal" | "airy";
  /** card / CTA corner language coming from the template DNA */
  corner?: "sharp" | "soft" | "pill";
};

const PADS = {
  tight: "py-12 sm:py-16 md:py-20",
  normal: "py-16 sm:py-24 md:py-32",
  airy: "py-24 sm:py-32 md:py-44",
};

const CORNERS = {
  sharp: { radius: "rounded-none", radiusSm: "rounded-none", ctaShape: "rounded-none" },
  soft: { radius: "rounded-3xl", radiusSm: "rounded-2xl", ctaShape: "rounded-xl" },
  pill: { radius: "rounded-[36px]", radiusSm: "rounded-3xl", ctaShape: "rounded-full" },
};

export function skinFor(layout: LayoutKind, opts: SkinOptions = {}): Skin {
  const skin: Skin = { ...BASE, kind: layout, ...(SKINS[layout] ?? {}) };
  if (opts.density) skin.pad = PADS[opts.density];
  if (opts.corner) Object.assign(skin, CORNERS[opts.corner]);
  return skin;
}

type Tokens = { isDark: boolean; glass: string; border: string; surface: string; surface2: string; bg: string };

/** Card chrome for the current skin — glass, hairline, hard border or gold frame. */
export function cardCls(skin: Skin, t: Tokens, accent?: string): string {
  switch (skin.kind) {
    case "editorial":
      return `border-t ${t.border} ${skin.radius} bg-transparent`;
    case "brutal":
      return `border-2 ${t.isDark ? "border-white/70" : "border-neutral-900"} ${skin.radius} ${t.isDark ? "bg-white/[0.03]" : "bg-white"} shadow-[6px_6px_0_0_currentColor]`;
    case "neon":
      return `${skin.radius} border ${t.isDark ? "border-white/15" : "border-neutral-300"} ${t.isDark ? "bg-white/[0.03]" : "bg-neutral-50"} backdrop-blur`;
    case "noirgold":
      return `${skin.radius} border ${t.isDark ? "border-white/15" : "border-neutral-300"} ${t.isDark ? "bg-white/[0.03]" : "bg-white"}`;
    case "boutique":
      return `${skin.radius} ${t.isDark ? "bg-white/[0.04]" : "bg-white"} border ${t.border} shadow-[0_24px_70px_-40px_rgba(0,0,0,0.35)]`;
    case "bento":
      return `${skin.radius} ${t.surface} border ${t.border} shadow-[0_20px_60px_-30px_rgba(0,0,0,0.25)]`;
    default:
      return `${skin.radius} ${t.glass}`;
  }
}

/** Section background: alternate tints only for skins that want them. */
export function sectionBg(skin: Skin, t: Tokens, tinted: boolean): string {
  if (!skin.alt) return t.bg;
  return tinted ? t.surface2 : t.bg;
}
