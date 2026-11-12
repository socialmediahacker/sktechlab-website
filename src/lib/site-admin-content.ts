import type { SiteContent } from "@/lib/site-renderer/types";

/** Prefer the live renderer's document; never replace it with legacy defaults. */
export function siteAdminContent(site: { content_json?: unknown; content?: unknown }): SiteContent | null {
  for (const candidate of [site.content_json, site.content]) {
    if (!candidate || typeof candidate !== "object") continue;
    const c = candidate as Partial<SiteContent>;
    if (c.brand && typeof c.brand.name === "string" && Array.isArray(c.sections)) {
      return { ...c, archetype: c.archetype || "business" } as SiteContent;
    }
  }
  return null;
}

/** Both site-admin and retained legacy links preserve the same document. */
export function moveSiteSection(content: SiteContent, index: number, direction: -1 | 1): SiteContent {
  const target = index + direction;
  const current = content.sections[index];
  const other = content.sections[target];
  if (!current || !other) return content;
  const sections = [...content.sections];
  sections[index] = other;
  sections[target] = current;
  return { ...content, sections };
}