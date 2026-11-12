import { hdImage } from "@/lib/site-renderer/hd-images";
import { localImageFallback } from "./images";
const attempts = new WeakMap<HTMLImageElement, { assigned: string; sources: string[] }>();
/** Retry the original CDN when an optimiser fails, then category photo and bundled art. */
export function recoverSiteImage(image: HTMLImageElement, category = "business") {
  let state = attempts.get(image);
  if (!state || image.src !== state.assigned) {
    const source = image.getAttribute("src") || "";
    const nested = source.match(/\/(https?:\/\/.+)$/)?.[1];
    const candidates = [nested, hdImage(category, source, 1200), localImageFallback(category)].filter(Boolean) as string[];
    state = { assigned: image.src, sources: [...new Set(candidates)].filter(s => s !== source) };
    attempts.set(image, state);
  }
  const next = state.sources.shift();
  if (!next) return;
  image.removeAttribute("srcset");
  image.src = next;
  state.assigned = image.src;
}
