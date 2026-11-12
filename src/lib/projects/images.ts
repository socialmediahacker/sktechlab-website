import type { SiteContent } from "@/lib/site-renderer/types";
import { hdImages } from "@/lib/site-renderer/hd-images";

export function localImageFallback(category = "business") {
  const aliases: [RegExp, string][] = [[/restaurant|food|cafe|bakery/, "dining"], [/salon|beauty|spa|bridal/, "beauty"], [/gym|fitness|yoga|sport/, "fitness"], [/clinic|health|doctor|dental/, "care"], [/hotel|travel|resort|tour/, "stay"], [/fashion|cloth|boutique|jewel/, "fashion"], [/interior|architect|property|estate/, "spaces"]];
  const match = aliases.find(([pattern]) => pattern.test(category.toLowerCase()));
  return `/images/fallback-${match?.[1] || "business"}.svg`;
}

/** Fill missing visual slots at render time without rewriting saved customer data. */
export function withProjectImages(content: SiteContent): SiteContent {
  const photos = hdImages(content.archetype, 8, content.brand.name);
  const pick = (index: number) => photos[index % photos.length] || localImageFallback(content.archetype);
  return { ...content, sections: content.sections.map((s, i) => {
    if (s.type === "hero3d") return { ...s, image: s.image || pick(i) };
    if (s.type === "gallery") return { ...s, images: s.images?.length ? s.images.map((image, j) => image || pick(i + j)) : [pick(i), pick(i + 1), pick(i + 2)] };
    if (["products", "menu", "showcase", "portfolio", "team"].includes(s.type) && "items" in s) return { ...s, items: s.items.map((item, j) => ({ ...item, image: (item as { image?: string }).image || pick(i + j) })) };
    return s;
  }) as SiteContent["sections"] };
}
