/**
 * Deterministic per-template variation inside a category's design family.
 * Same input → same output, so demos stay stable between runs.
 */
import { profileFor } from "./category-profiles";

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export type TemplateVariant = {
  layout: string;
  theme: "light" | "dark";
  primary: string;
  secondary: string;
  accent: string;
  /** Section order used to re-sort the template's sections. */
  order: string[];
};

/** Shift a hex colour's lightness a little so sibling demos differ subtly. */
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

/** Broadens a small family pool so siblings never repeat the same layout. */
const NEIGHBOURS: Record<string, string[]> = {
  cinematic: ["editorial", "prism"],
  editorial: ["cinematic", "boutique"],
  bento: ["prism", "boutique"],
  neon: ["prism", "brutal"],
  boutique: ["editorial", "bento"],
  brutal: ["bento", "neon"],
  noirgold: ["cinematic", "boutique"],
  prism: ["bento", "cinematic"],
};

function layoutPool(base: string[]): string[] {
  const out = [...base];
  for (const b of base) for (const n of NEIGHBOURS[b] ?? []) if (!out.includes(n)) out.push(n);
  return out.slice(0, 4);
}

export function variantFor(categorySlug: string, templateId: string, index = 0): TemplateVariant {
  const p = profileFor(categorySlug);
  const seed = hashSeed(`${categorySlug}:${templateId}`);
  // `index` drives the rotation so demos inside one category are guaranteed
  // to differ in layout, palette and section order (not just by luck of hash).
  const pool = layoutPool(p.layouts);
  const layout = pool[(index + (seed % pool.length)) % pool.length] as string;
  const pal = p.palettes[(index + (seed >> 3)) % p.palettes.length]!;
  const step = (index % 3) - 1; // -1 | 0 | 1
  const order = [...p.order];
  // rotate the middle content sections for extra variety
  const rot = index % 3;
  if (order.length > 5 && rot) {
    const mid = order.slice(1, 4);
    for (let r = 0; r < rot; r++) mid.push(mid.shift() as string);
    order.splice(1, 3, ...mid);
  }
  return {
    layout,
    theme: index % 4 === 3 ? (p.theme === "dark" ? "light" : "dark") : p.theme,
    primary: shade(pal.primary, step * 12),
    secondary: pal.secondary,
    accent: shade(pal.accent, step * 10),
    order,
  };
}

/** Re-order a section array using the variant order (unknown types keep position at the end). */
export function orderSections<T extends { type?: string }>(sections: T[], order: string[]): T[] {
  const rank = (t?: string) => {
    const i = order.indexOf(String(t));
    return i === -1 ? order.length + 1 : i;
  };
  return [...sections]
    .map((s, i) => ({ s, i }))
    .sort((a, b) => rank(a.s?.type) - rank(b.s?.type) || a.i - b.i)
    .map((x) => x.s);
}
