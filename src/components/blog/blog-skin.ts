import type { BlogDNA, CardSystem } from "@/lib/blog/dna";
import { BLOG_FONTS } from "@/lib/blog/dna";

/** CSS variables + surface classes derived from a blog's DNA. */
export function blogStyle(dna: BlogDNA): React.CSSProperties {
  const f = BLOG_FONTS[dna.font];
  return {
    ["--blog-head" as string]: f.head,
    ["--blog-body" as string]: f.body,
    ["--blog-ink" as string]: dna.theme === "dark" ? "#f5f5f7" : dna.palette.primary,
    ["--blog-accent" as string]: dna.palette.accent,
    ["--blog-surface" as string]: dna.theme === "dark" ? "#0b0b0f" : dna.palette.surface,
    ["--blog-muted" as string]: dna.theme === "dark" ? "rgba(255,255,255,.62)" : "rgba(15,23,42,.62)",
    ["--blog-line" as string]: dna.theme === "dark" ? "rgba(255,255,255,.14)" : "rgba(15,23,42,.12)",
    backgroundColor: "var(--blog-surface)",
    color: "var(--blog-ink)",
    fontFamily: "var(--blog-body)",
  } as React.CSSProperties;
}

export const cardClass: Record<CardSystem, string> = {
  cover: "group overflow-hidden rounded-2xl shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
  frame: "group overflow-hidden rounded-none border-2 transition hover:shadow-lg",
  bare: "group transition hover:opacity-80",
  tile: "group overflow-hidden rounded-xl border transition hover:-translate-y-0.5 hover:shadow-md",
  ticket: "group overflow-hidden rounded-lg border-l-4 bg-white/60 pl-3 transition hover:shadow-md",
  polaroid: "group overflow-hidden rounded-md border bg-white p-2 pb-5 shadow-md transition hover:rotate-[-1deg]",
};

export const imageRatio: Record<CardSystem, string> = {
  cover: "aspect-[4/3]",
  frame: "aspect-[3/2]",
  bare: "aspect-[4/5]",
  tile: "aspect-[16/10]",
  ticket: "aspect-[16/9]",
  polaroid: "aspect-square",
};

/** Grid structure per homepage layout — the actual structure changes, not just colour. */
export function gridClass(layout: BlogDNA["layout"]): string {
  switch (layout) {
    case "masonry-magazine":
      return "columns-1 gap-6 sm:columns-2 lg:columns-3 [&>*]:mb-6 [&>*]:break-inside-avoid";
    case "minimal-reading":
      return "flex flex-col divide-y";
    case "newspaper":
      return "grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-4";
    case "timeline-news":
      return "flex flex-col gap-6 border-l pl-6";
    case "horizontal-story":
      return "flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [&>*]:w-[80%] [&>*]:shrink-0 [&>*]:snap-start sm:[&>*]:w-[46%] lg:[&>*]:w-[32%]";
    case "bento-editorial":
      return "grid auto-rows-[minmax(160px,auto)] gap-5 sm:grid-cols-2 lg:grid-cols-3 [&>*:first-child]:sm:col-span-2 [&>*:first-child]:lg:row-span-2";
    case "split-screen":
      return "grid gap-8 md:grid-cols-2";
    case "typography-first":
      return "flex flex-col gap-10";
    case "luxury-magazine":
      return "grid gap-10 sm:grid-cols-2";
    case "image-first":
    case "visual-discovery":
      return "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
    case "category-dashboard":
      return "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";
    case "featured-fullscreen":
    case "cinematic":
      return "grid gap-8 sm:grid-cols-2 lg:grid-cols-3";
    default:
      return "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";
  }
}

/** Should the layout show a big lead story above the grid? */
export function hasLeadStory(layout: BlogDNA["layout"]): boolean {
  return [
    "editorial-magazine",
    "cinematic",
    "featured-fullscreen",
    "luxury-magazine",
    "newspaper",
    "dark-editorial",
    "split-screen",
  ].includes(layout);
}

export const sidebarTitle: Record<BlogDNA["sidebar"], string> = {
  none: "",
  trending: "Trending now",
  popular: "Most read",
  market: "Market updates",
  recipes: "Popular recipes",
  guides: "Essential guides",
  toc: "Browse topics",
};
