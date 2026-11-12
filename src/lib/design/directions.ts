import type { Brand } from "@/lib/site-renderer/types";

/** Seven structural directions, shared by catalogue cards, preview and new sites. */
export const TEMPLATE_DIRECTIONS: { layout: NonNullable<Brand["layout"]>; label: string; font: string; nav: NonNullable<Brand["nav"]> }[] = [
  { layout: "editorial", label: "Editorial / split story", font: "editorial", nav: "minimal" },
  { layout: "noirgold", label: "Noir / luxury atelier", font: "luxe", nav: "center" },
  { layout: "bento", label: "Bento / modular studio", font: "geometric", nav: "bar" },
  { layout: "cinematic", label: "Cinema / immersive story", font: "grotesk", nav: "dock" },
  { layout: "boutique", label: "Boutique / organic collection", font: "humanist", nav: "center" },
  { layout: "neon", label: "Future / high energy", font: "technical", nav: "split" },
  { layout: "brutal", label: "Swiss / bold grid", font: "display", nav: "minimal" },
];
export function directionFor(index: number) {
  return TEMPLATE_DIRECTIONS[((Math.trunc(index) % 7) + 7) % 7]!;
}
