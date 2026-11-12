/**
 * Template DNA engine.
 *
 * Turns a category into N *structurally different* template directions.
 * Every DNA object drives layout, typography, palette, navigation, card
 * corners, spacing rhythm, motion profile and section order — so ten demos
 * of one category read as ten different agency-built websites instead of
 * one template in ten colours.
 *
 * Deterministic: same (category, templateId, index) → same DNA.
 */
import { profileFor } from "./category-profiles";
import { hashSeed } from "./variant";
import type { LayoutKind } from "@/lib/site-renderer/variants";

export type FontKey =
  | "classic"
  | "luxe"
  | "editorial"
  | "grotesk"
  | "geometric"
  | "display"
  | "humanist"
  | "technical"
  | "fashion"
  | "minimal";

export type NavKind = "dock" | "minimal" | "center" | "split" | "bar" | "rail";
export type Density = "tight" | "normal" | "airy";
export type Corner = "sharp" | "soft" | "pill";
export type MotionProfile = "calm" | "cinematic" | "energetic" | "precise";

export type TemplateDNA = {
  category: string;
  /** Human-readable design direction, e.g. "Architectural Editorial". */
  direction: string;
  layout: LayoutKind;
  theme: "light" | "dark";
  primary: string;
  secondary: string;
  accent: string;
  font: FontKey;
  nav: NavKind;
  density: Density;
  corner: Corner;
  motion: MotionProfile;
  /** Section type order used to re-sort a template's sections. */
  order: string[];
};

export const FONT_SYSTEMS: Record<FontKey, { display: string; body: string; label: string }> = {
  classic: { display: '"DM Serif Display", Georgia, serif', body: '"Fira Sans", system-ui, sans-serif', label: "Classic serif" },
  luxe: { display: '"Cormorant Garamond", Georgia, serif', body: '"Inter", system-ui, sans-serif', label: "Luxury serif" },
  editorial: { display: '"Playfair Display", Georgia, serif', body: '"Inter", system-ui, sans-serif', label: "Editorial" },
  grotesk: { display: '"Space Grotesk", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', label: "Modern grotesk" },
  geometric: { display: '"Outfit", system-ui, sans-serif', body: '"Manrope", system-ui, sans-serif', label: "Geometric sans" },
  display: { display: '"Bebas Neue", Impact, sans-serif', body: '"Archivo", system-ui, sans-serif', label: "Bold display" },
  humanist: { display: '"Libre Baskerville", Georgia, serif', body: '"Manrope", system-ui, sans-serif', label: "Humanist" },
  technical: { display: '"JetBrains Mono", ui-monospace, monospace', body: '"Inter", system-ui, sans-serif', label: "Technical" },
  fashion: { display: '"Syne", system-ui, sans-serif', body: '"Manrope", system-ui, sans-serif', label: "Fashion" },
  minimal: { display: '"Sora", system-ui, sans-serif', body: '"Inter", system-ui, sans-serif', label: "Premium minimal" },
};

/** Which typography systems suit which layout family (compatibility matrix). */
const FONTS_FOR: Record<LayoutKind, FontKey[]> = {
  cinematic: ["minimal", "grotesk", "editorial", "geometric"],
  editorial: ["editorial", "humanist", "luxe", "classic"],
  bento: ["geometric", "grotesk", "minimal", "fashion"],
  neon: ["technical", "display", "grotesk", "fashion"],
  boutique: ["luxe", "editorial", "humanist", "classic"],
  brutal: ["display", "technical", "grotesk", "humanist"],
  noirgold: ["luxe", "fashion", "editorial", "minimal"],
  prism: ["minimal", "grotesk", "geometric", "technical"],
};

const NAVS_FOR: Record<LayoutKind, NavKind[]> = {
  cinematic: ["dock", "center", "bar"],
  editorial: ["minimal", "split", "rail"],
  bento: ["bar", "dock", "split"],
  neon: ["bar", "dock", "minimal"],
  boutique: ["center", "minimal", "dock"],
  brutal: ["split", "bar", "minimal"],
  noirgold: ["center", "rail", "dock"],
  prism: ["dock", "bar", "center"],
};

const MOTION_FOR: Record<LayoutKind, MotionProfile[]> = {
  cinematic: ["cinematic", "calm"],
  editorial: ["calm", "cinematic"],
  bento: ["precise", "energetic"],
  neon: ["energetic", "precise"],
  boutique: ["calm", "cinematic"],
  brutal: ["precise", "energetic"],
  noirgold: ["cinematic", "calm"],
  prism: ["precise", "cinematic"],
};

const DIRECTION_NAME: Record<LayoutKind, string[]> = {
  cinematic: ["Cinematic Story", "Fullscreen Feature", "Immersive Scene"],
  editorial: ["Architectural Editorial", "Magazine Layout", "Print Revival"],
  bento: ["Bento Grid", "Modular Commerce", "Card System"],
  neon: ["Futuristic Neon", "Dark Tech", "High Energy"],
  boutique: ["Soft Premium", "Organic Boutique", "Calm Luxury"],
  brutal: ["Swiss Minimal", "Neo Brutalist", "Structured Grid"],
  noirgold: ["Black & Gold", "Luxury Noir", "Couture Dark"],
  prism: ["Glass Prism", "3D Immersive", "Spectral Depth"],
};

const DENSITIES: Density[] = ["normal", "airy", "tight"];
const CORNERS: Corner[] = ["soft", "sharp", "pill"];

const NEIGHBOURS: Record<LayoutKind, LayoutKind[]> = {
  cinematic: ["editorial", "prism", "boutique"],
  editorial: ["cinematic", "boutique", "brutal"],
  bento: ["prism", "boutique", "brutal"],
  neon: ["prism", "brutal", "bento"],
  boutique: ["editorial", "bento", "noirgold"],
  brutal: ["bento", "neon", "editorial"],
  noirgold: ["cinematic", "boutique", "editorial"],
  prism: ["bento", "cinematic", "neon"],
};

/** Expand a category's 1–2 base layouts into a compatible pool of 4–6. */
function layoutPool(base: LayoutKind[]): LayoutKind[] {
  const out: LayoutKind[] = [];
  for (const b of base) if (!out.includes(b)) out.push(b);
  for (const b of base) for (const n of NEIGHBOURS[b] ?? []) if (!out.includes(n)) out.push(n);
  return out.length ? out : ["cinematic"];
}

function shade(hex: string, amount: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1] as string, 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const r = clamp(((n >> 16) & 255) + amount);
  const g = clamp(((n >> 8) & 255) + amount);
  const b = clamp((n & 255) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

function rotate<T>(arr: T[], by: number): T[] {
  if (!arr.length) return arr;
  const k = ((by % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}

/** Build the DNA for one template of a category. */
export function dnaFor(categorySlug: string, templateId: string, index = 0): TemplateDNA {
  const p = profileFor(categorySlug);
  const seed = hashSeed(`${categorySlug}:${templateId}`);
  const pool = layoutPool(p.layouts);
  // Co-prime strides on every axis: siblings never repeat a combination.
  const layout = pool[(index * 3 + (seed % pool.length)) % pool.length] as LayoutKind;
  const fonts = FONTS_FOR[layout];
  const navs = NAVS_FOR[layout];
  const motions = MOTION_FOR[layout];
  const pal = p.palettes[(index + (seed >> 5)) % p.palettes.length]!;
  const step = (index % 5) - 2; // -2..2

  const order = (() => {
    const base = [...p.order];
    if (base.length < 6) return base;
    const head = base[0] as string;
    const mid = base.slice(1, base.length - 2);
    const tail = base.slice(base.length - 2);
    return [head, ...rotate(mid, index % Math.max(mid.length, 1)), ...tail];
  })();

  const theme: "light" | "dark" =
    layout === "neon" || layout === "noirgold" ? "dark" : index % 3 === 2 ? (p.theme === "dark" ? "light" : "dark") : p.theme;

  const names = DIRECTION_NAME[layout];
  return {
    category: categorySlug,
    direction: names[(index + seed) % names.length] as string,
    layout,
    theme,
    primary: shade(pal.primary, step * 10),
    secondary: pal.secondary,
    accent: shade(pal.accent, step * -8),
    font: fonts[(index * 2 + seed) % fonts.length] as FontKey,
    nav: navs[(index + (seed >> 2)) % navs.length] as NavKind,
    density: DENSITIES[(index + (seed >> 7)) % DENSITIES.length] as Density,
    corner: CORNERS[(index * 2 + (seed >> 9)) % CORNERS.length] as Corner,
    motion: motions[(index + (seed >> 4)) % motions.length] as MotionProfile,
    order,
  };
}

/* ------------------------------------------------------------------ */
/* Style fingerprint + uniqueness score                                */
/* ------------------------------------------------------------------ */

export type Fingerprint = {
  layout: string;
  theme: string;
  font: string;
  nav: string;
  corner: string;
  density: string;
  motion: string;
  primary: string;
  sequence: string;
};

export function fingerprintOf(d: TemplateDNA): Fingerprint {
  return {
    layout: d.layout,
    theme: d.theme,
    font: d.font,
    nav: d.nav,
    corner: d.corner,
    density: d.density,
    motion: d.motion,
    primary: d.primary.toLowerCase(),
    sequence: d.order.join(">"),
  };
}

const WEIGHTS: Record<keyof Fingerprint, number> = {
  layout: 26,
  sequence: 18,
  font: 14,
  nav: 12,
  primary: 10,
  corner: 8,
  density: 6,
  motion: 4,
  theme: 2,
};

/** 0–100, where 100 = nothing in common with the compared template. */
export function uniquenessScore(a: Fingerprint, others: Fingerprint[]): number {
  if (!others.length) return 100;
  let worst = 100;
  for (const b of others) {
    let same = 0;
    for (const k of Object.keys(WEIGHTS) as Array<keyof Fingerprint>) {
      if (a[k] === b[k]) same += WEIGHTS[k];
    }
    worst = Math.min(worst, 100 - same);
  }
  return Math.max(0, Math.round(worst));
}

/**
 * Produce `count` DNA objects for a category, rejecting combinations that
 * score too close to one already chosen and nudging the index until they
 * clear the bar (uniqueness >= 60).
 */
export function dnaSetFor(categorySlug: string, ids: string[]): Array<{ id: string; dna: TemplateDNA; score: number }> {
  const chosen: Fingerprint[] = [];
  const out: Array<{ id: string; dna: TemplateDNA; score: number }> = [];
  ids.forEach((id, i) => {
    let best = dnaFor(categorySlug, id, i);
    let bestScore = uniquenessScore(fingerprintOf(best), chosen);
    for (let attempt = 1; attempt <= 12 && bestScore < 70; attempt++) {
      const cand = dnaFor(categorySlug, id, i + attempt * ids.length + attempt);
      const s = uniquenessScore(fingerprintOf(cand), chosen);
      if (s > bestScore) {
        best = cand;
        bestScore = s;
      }
    }
    chosen.push(fingerprintOf(best));
    out.push({ id, dna: best, score: bestScore });
  });
  return out;
}
