import { directionFor } from "./directions";
import { hdImages } from "@/lib/site-renderer/hd-images";
import { dnaFor } from "./dna";
import { hashSeed, orderSections } from "./variant";
import { bucketImages } from "@/lib/images/category-packs";
import type { SiteContent } from "@/lib/site-renderer/types";

const PALETTES = [
  { primary: "#047857", secondary: "#062c27", accent: "#e9b949" },
  { primary: "#be185d", secondary: "#301425", accent: "#38bdf8" },
  { primary: "#0369a1", secondary: "#102d40", accent: "#f97316" },
  { primary: "#6d28d9", secondary: "#231a38", accent: "#b5d541" },
  { primary: "#b91c1c", secondary: "#341919", accent: "#2dd4bf" },
  { primary: "#0e7490", secondary: "#13313b", accent: "#fb7185" },
  { primary: "#4d7c0f", secondary: "#26341b", accent: "#e879a0" },
];


/** Render-only catalogue styling, also copied once when a NEW site is created. */
export function templatePresentation(content: SiteContent, id: string, siblingIndex = hashSeed(id) % 12): SiteContent {
  if (content.presentation === "preserve") return structuredClone(content);
  const category = content.archetype || "business";
  const dna = dnaFor(category, category, siblingIndex);
  const direction = directionFor(siblingIndex);
  const theme = (siblingIndex % 7) % 2 === 0 ? "light" : "dark";
  const palette = PALETTES[siblingIndex % PALETTES.length] ?? PALETTES[0];
  const hero = hdImages(category, 6, category)[siblingIndex % 6];
  const gallery = hdImages(category, 6, `${category}:gallery:${siblingIndex}`);
  const services = hdImages(category, 6, `${category}:service:${siblingIndex}`);
  const products = bucketImages(category, "product", 6, siblingIndex);
  const sections = content.sections.map(section => {
    if (section.type === "hero3d") return { ...section, image: hero || section.image };
    if (section.type === "gallery") return { ...section, images: gallery.length ? gallery : section.images };
    if (section.type === "showcase") return { ...section, items: section.items.map((item, i) => ({ ...item, image: services[i] || item.image })) };
    if (section.type === "products" || section.type === "menu") return { ...section, items: section.items.map((item, i) => ({ ...item, image: products[i] || item.image })) };
    return section;
  }) as SiteContent["sections"];
  return {
    ...content,
    brand: {
      ...content.brand, ...palette, theme,
      layout: direction.layout,
      font: direction.font, nav: direction.nav, density: dna.density, corner: dna.corner, motion: dna.motion,
      direction: `${theme === "light" ? "Daylight" : "After dark"} / ${direction.label}`,
      bg_image: undefined, bg_mobile_image: undefined, bg_video: undefined, bg_gradient: undefined, bg_color: undefined,
    },
    sections: orderSections(sections, dna.order),
  };
}