import type { SiteContent } from "@/lib/site-renderer/types";

export const PROJECT_FORMAT = "sktechlab-project-v1";
export const MAX_PROJECT_BYTES = 2 * 1024 * 1024;
const SECTION_TYPES = new Set(["hero3d", "features", "stats", "products", "menu", "gallery", "testimonials", "pricing", "team", "showcase", "portfolio", "booking", "faq", "cta", "contact"]);
const ARRAY_FIELDS: Record<string, string> = { features: "items", stats: "items", products: "items", menu: "items", gallery: "images", testimonials: "items", pricing: "plans", team: "items", showcase: "items", portfolio: "items", faq: "items" };

/** JSON documents only: never execute imported HTML, JavaScript or styles. */
export function parseProject(input: unknown): SiteContent {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Choose an SK Tech Lab project JSON file.");
  const envelope = input as Record<string, unknown>;
  if (envelope.format && envelope.format !== PROJECT_FORMAT) throw new Error("Unsupported project format.");
  const value = (envelope.content ?? envelope.content_json ?? input) as Record<string, any>;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid project document.");
  if (new TextEncoder().encode(JSON.stringify(value)).byteLength > MAX_PROJECT_BYTES) throw new Error("Project must be under 2 MB.");
  if (!value.brand || typeof value.brand !== "object" || Array.isArray(value.brand) || typeof value.brand.name !== "string" || !value.brand.name.trim()) throw new Error("Project needs a business name.");
  if (!/^#[0-9a-f]{6}$/i.test(value.brand.primary ?? "")) throw new Error("Primary colour must be a six-digit hex colour.");
  if (!Array.isArray(value.sections) || !value.sections.length || value.sections.length > 80) throw new Error("Project needs between 1 and 80 sections.");
  const validateTree = (node: any, depth = 0) => {
    if (depth > 18) throw new Error("Project is too deeply nested.");
    if (typeof node === "string" && (/<\s*\/?\s*(script|iframe|object|embed)\b/i.test(node) || /(?:javascript|vbscript)\s*:|data\s*:\s*text\/html/i.test(node))) throw new Error("Executable code is not supported in editable projects.");
    if (node && typeof node === "object") {
      for (const [key, val] of Object.entries(node)) {
        if (["__proto__", "prototype", "constructor", "dangerouslySetInnerHTML"].includes(key)) throw new Error("Unsafe project property.");
        validateTree(val, depth + 1);
      }
    }
  };
  validateTree(value);
  value.sections.forEach((section: any, i: number) => {
    const invalid = (message: string) => { throw new Error(`Section ${i + 1}: ${message}`); };
    if (!section || !SECTION_TYPES.has(section.type)) invalid("unsupported section type.");
    const field = ARRAY_FIELDS[section.type];
    if (field && (!Array.isArray(section[field]) || section[field].length > 120)) invalid(`${field} must be an array with at most 120 items.`);
    const required: Record<string, string[]> = { hero3d: ["headline", "sub", "cta", "image"], features: ["title"], showcase: ["title", "kind"], booking: ["title", "mode", "cta"], cta: ["headline", "cta"] };
    for (const key of required[section.type] ?? []) if (typeof section[key] !== "string") invalid(`${key} must be text.`);
    if (section.type === "gallery" && section.images.some((v: any) => typeof v !== "string")) invalid("gallery images must be URLs.");
    for (const item of field && field !== "images" ? section[field] : []) {
      if (!item || typeof item !== "object" || Array.isArray(item)) invalid("items must be objects.");
      const keys: Record<string, string[]> = { features: ["title", "desc"], stats: ["k", "v"], products: ["id", "name", "image"], menu: ["name"], testimonials: ["name", "text"], pricing: ["name", "price"], team: ["name", "role", "image"], showcase: ["title"], portfolio: ["title"], faq: ["q", "a"] };
      for (const key of keys[section.type] ?? []) if (typeof item[key] !== "string") invalid(`${key} must be text.`);
      if (["products", "menu"].includes(section.type) && (typeof item.price !== "number" || !Number.isFinite(item.price) || item.price < 0)) invalid("item price must be a positive number or zero.");
      if (section.type === "pricing" && (!Array.isArray(item.features) || item.features.some((v: any) => typeof v !== "string"))) invalid("plan features must be text entries.");
    }
  });
  const assertText = (node: Record<string, any>, keys: string[], label: string) => {
    for (const key of keys) if (node[key] != null && typeof node[key] !== "string") throw new Error(`${label}: ${key} must be text.`);
  };
  assertText(value.brand, ["name", "tagline", "logo", "primary", "secondary", "accent", "whatsapp", "email", "phone", "address", "currency", "bg_video", "bg_image", "bg_mobile_image", "bg_color", "bg_gradient", "layout", "font", "nav", "density", "corner", "motion", "direction", "theme"], "Brand");
  if (value.brand.name.length > 120) throw new Error("Business name must be under 120 characters.");
  for (const key of ["bg_overlay", "bg_opacity"]) if (value.brand[key] != null && (typeof value.brand[key] !== "number" || value.brand[key] < 0 || value.brand[key] > 1)) throw new Error(`${key} must be between 0 and 1.`);
  if (value.brand.socials != null) {
    if (typeof value.brand.socials !== "object" || Array.isArray(value.brand.socials)) throw new Error("Social links must be an object.");
    assertText(value.brand.socials, ["instagram", "facebook", "twitter", "x", "linkedin", "youtube"], "Social links");
  }
  const enums: Record<string, string[]> = { theme: ["light", "dark"], layout: ["cinematic", "editorial", "bento", "neon", "boutique", "brutal", "noirgold", "prism"], nav: ["dock", "minimal", "center", "split", "bar", "rail"], density: ["tight", "normal", "airy"], corner: ["sharp", "soft", "pill"], motion: ["calm", "cinematic", "energetic", "precise"] };
  for (const [key, options] of Object.entries(enums)) if (value.brand[key] != null && !options.includes(value.brand[key])) throw new Error(`Unsupported ${key} option.`);
  for (const section of value.sections) {
    assertText(section, ["headline", "sub", "title", "cta", "image", "link", "kind", "mode", "design"], "Section");
    if (section.bullets != null && (!Array.isArray(section.bullets) || section.bullets.some((v: any) => typeof v !== "string"))) throw new Error("Hero bullets must be text entries.");
    if (section.type === "showcase" && !["rooms", "listings", "projects", "programs", "courses", "services", "packages"].includes(section.kind)) throw new Error("Unsupported showcase kind.");
    if (section.type === "booking" && !["reservation", "appointment", "enrollment", "inquiry", "booking"].includes(section.mode)) throw new Error("Unsupported booking mode.");
    for (const item of section.items ?? section.plans ?? []) {
      assertText(item, ["id", "name", "title", "desc", "text", "role", "image", "avatar", "badge", "category", "meta", "year", "link", "cta", "period", "icon", "q", "a", "k", "v"], "Section item");
      if (item.tags != null && (!Array.isArray(item.tags) || item.tags.some((v: any) => typeof v !== "string"))) throw new Error("Project tags must be text entries.");
      if (item.rating != null && (typeof item.rating !== "number" || item.rating < 0 || item.rating > 5)) throw new Error("Ratings must be between 0 and 5.");
    }
  }
  // Imported designs keep the author's colours, imagery and section order.
  return { ...structuredClone(value), archetype: typeof value.archetype === "string" ? value.archetype : "business", presentation: "preserve" } as SiteContent;
}

export function projectEnvelope(content: SiteContent, name = content.brand.name) {
  return { format: PROJECT_FORMAT, name, exportedAt: new Date().toISOString(), content };
}

export function downloadProject(content: SiteContent, name?: string) {
  const blob = new Blob([JSON.stringify(projectEnvelope(content, name), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${(name || content.brand.name).replace(/[^a-z0-9-]/gi, "-").toLowerCase()}-project.json`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
