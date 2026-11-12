import { localImageFallback } from "@/lib/projects/images";
// Template covers prefer supplied images, then category photos, screenshots and a bundled illustration.
import { categoryThumb } from "@/lib/category-thumb";
import { ikUrl } from "@/lib/images/imagekit";

export type ThumbInput = {
  demo_url?: string | null;
  thumbnail_url?: string | null;
  accent_color?: string | null;
  name?: string | null;
  category?: string | null;
  category_slug?: string | null;
  categories?: { slug?: string | null; name?: string | null } | null;
};


function categoryKey(t: ThumbInput): string | null {
  const raw =
    t?.category_slug ??
    t?.categories?.slug ??
    t?.categories?.name ??
    (typeof t?.category === "string" ? t.category : null);
  if (!raw) return null;
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Ordered list of image sources to try for one template (first = best). */
export function thumbChain(t: ThumbInput, w = 800): string[] {
  const out: string[] = [];
  if (t?.thumbnail_url && /^(https?:\/\/|\/(?!\/))/.test(t.thumbnail_url) && !/vq\.pe\/(thumb|owner)\//.test(t.thumbnail_url)) {
    out.push(ikUrl(t.thumbnail_url, { w }));
  }
  const key = categoryKey(t);
  const photo = key ? categoryThumb(key, t?.name ?? undefined) : null;
  // On phones the screenshot service is slow/unreliable — prefer the HD photo there.
  const shot = t?.demo_url ? `https://s.wordpress.com/mshots/v1/${encodeURIComponent(t.demo_url)}?w=${w}` : null;
  if (photo) out.push(photo);
  if (shot) out.push(shot);
  out.push(localImageFallback(key || t?.name || "business"));
  return out;
}

export function templateThumb(t: ThumbInput, w = 800) {
  return thumbChain(t, w)[0] as string;
}

