import { useEffect } from "react";
import { localImageFallback } from "@/lib/projects/images";

/** Covers marketing / dashboard images; specialised template handlers retain their own chains. */
export function ResilientImages() {
  useEffect(() => {
    const fallback = (image: HTMLImageElement) => {
      if (image.dataset.templateImage || image.closest("[data-layout]") || image.dataset.fallbackApplied) return;
      image.dataset.fallbackApplied = "1";
      image.removeAttribute("srcset");
      image.src = localImageFallback(image.alt || "business");
    };
    const onError = (event: Event) => { if (event.target instanceof HTMLImageElement) fallback(event.target); };
    document.addEventListener("error", onError, true);
    document.querySelectorAll<HTMLImageElement>("img").forEach(image => {
      if (image.complete && (!image.naturalWidth || !image.getAttribute("src"))) fallback(image);
    });
    return () => document.removeEventListener("error", onError, true);
  }, []);
  return null;
}
