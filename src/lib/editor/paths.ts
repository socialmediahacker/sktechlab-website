/**
 * Path helpers for the Elementor-style click-to-edit canvas.
 *
 * A "path" identifies one editable value inside a section, e.g.
 *   "0.headline"            → sections[0].headline
 *   "2.items.1.title"       → sections[2].items[1].title
 * The first segment is always the section index so a path is globally unique.
 */

export type Device = "desktop" | "tablet" | "mobile";

export type ElementStyle = {
  color?: string;
  fontSize?: number;      // px
  fontWeight?: number;
  align?: "left" | "center" | "right";
  letterSpacing?: number; // px
  lineHeight?: number;    // unitless
  bg?: string;            // css background (color / gradient)
  padding?: number;       // px
  margin?: number;        // px
  radius?: number;        // px
  shadow?: "none" | "sm" | "md" | "lg" | "glow";
  opacity?: number;       // 0..1
  hidden?: boolean;
  anim?: "none" | "fade" | "up" | "zoom" | "slide";
};

export type StyleMap = Record<string, Partial<Record<Device, ElementStyle>>>;

export const DEVICES: Device[] = ["desktop", "tablet", "mobile"];

/** Merge desktop → tablet → mobile so a device inherits wider-screen values. */
export function resolveStyle(map: StyleMap | undefined, path: string, device: Device): ElementStyle {
  const entry = map?.[path];
  if (!entry) return {};
  const chain: Device[] = device === "mobile" ? ["desktop", "tablet", "mobile"]
    : device === "tablet" ? ["desktop", "tablet"] : ["desktop"];
  return chain.reduce<ElementStyle>((acc, d) => ({ ...acc, ...(entry[d] ?? {}) }), {});
}

const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 2px 8px rgba(0,0,0,.18)",
  md: "0 10px 30px rgba(0,0,0,.25)",
  lg: "0 30px 70px rgba(0,0,0,.35)",
  glow: "0 0 45px rgba(255,255,255,.28)",
};

/** Turn a resolved style into inline CSS text applied to the live DOM node. */
export function styleToCss(s: ElementStyle): Record<string, string> {
  const css: Record<string, string> = {};
  if (s.color) css.color = s.color;
  if (s.fontSize) css.fontSize = `${s.fontSize}px`;
  if (s.fontWeight) css.fontWeight = String(s.fontWeight);
  if (s.align) css.textAlign = s.align;
  if (typeof s.letterSpacing === "number") css.letterSpacing = `${s.letterSpacing}px`;
  if (typeof s.lineHeight === "number") css.lineHeight = String(s.lineHeight);
  if (s.bg) css.background = s.bg;
  if (typeof s.padding === "number") css.padding = `${s.padding}px`;
  if (typeof s.margin === "number") css.margin = `${s.margin}px`;
  if (typeof s.radius === "number") css.borderRadius = `${s.radius}px`;
  if (s.shadow) css.boxShadow = SHADOWS[s.shadow] ?? "none";
  if (typeof s.opacity === "number") css.opacity = String(s.opacity);
  return css;
}

export function deviceFromWidth(w: number): Device {
  if (w < 640) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/* ---------------- value get / set ---------------- */

export function getByPath(root: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key as any]), root);
}

/** Immutably set a value at `path`, cloning only the nodes on the way down. */
export function setByPath<T>(root: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const walk = (node: any, i: number): any => {
    const key: any = Array.isArray(node) ? Number(keys[i]) : keys[i];
    const clone: any = Array.isArray(node) ? [...node] : { ...(node ?? {}) };
    clone[key] = i === keys.length - 1 ? value : walk(node?.[key], i + 1);
    return clone;
  };
  return walk(root, 0);
}

/**
 * Find the path of the first primitive value equal to `needle`.
 * Used to map a clicked DOM node back to the data that produced it.
 */
const norm = (s: string) => s.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim().toLowerCase();
/** Loose form: drop quotes, punctuation and currency decoration the renderer adds. */
const loose = (s: string) => norm(s).replace(/[“”"'’‘`.,:;!?—–\-()₹$€%]/g, "").replace(/\s+/g, " ").trim();

/**
 * Structural fields that must never become click-to-edit targets — editing
 * them would change the section's identity, not its copy.
 */
const SKIP_KEYS = new Set(["type", "id", "kind", "mode", "design", "gallery_mode", "archetype", "slug", "link", "href", "icon"]);

/** Walk every string leaf of a section as `{ path, value }`. */
function stringLeaves(node: any, prefix = ""): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  const walk = (n: any, p: string) => {
    const last = p.split(".").pop() ?? "";
    if (SKIP_KEYS.has(last)) return;
    if (typeof n === "string") { out.push({ path: p, value: n }); return; }
    if (typeof n === "number") { out.push({ path: p, value: String(n) }); return; }
    if (Array.isArray(n)) { n.forEach((c, i) => walk(c, p ? `${p}.${i}` : String(i))); return; }
    if (n && typeof n === "object") for (const [k, v] of Object.entries(n)) walk(v, p ? `${p}.${k}` : k);
  };
  walk(node, prefix);
  return out;
}

/* ---------------- brand-level paths (header / footer / global) ---------------- */

/** Paths beginning with `brand.` edit site-wide fields instead of a section. */
export function isBrandPath(path: string): boolean {
  return path.startsWith("brand.");
}

/** Read any editor path (section path or `brand.*`) off the full site content. */
export function valueAtPath(content: any, path: string): any {
  return isBrandPath(path) ? getByPath(content?.brand, path.slice(6)) : getByPath(content?.sections, path);
}

/** Immutably write any editor path (section path or `brand.*`) on site content. */
export function patchAtPath<T extends { brand: any; sections: any }>(content: T, path: string, value: unknown): T {
  return isBrandPath(path)
    ? { ...content, brand: setByPath(content.brand, path.slice(6), value) }
    : { ...content, sections: setByPath(content.sections, path, value) };
}

/** Editable site-wide fields exposed on the canvas (header/footer). */
export const BRAND_TEXT_KEYS = ["name", "tagline", "phone", "email", "address", "whatsapp"] as const;


export function findPathByValue(node: any, needle: string, prefix = ""): string | null {
  const leaves = stringLeaves(node, prefix);
  const n = norm(needle);
  const exact = leaves.find((l) => norm(l.value) === n);
  if (exact) return exact.path;

  const l1 = loose(needle);
  if (!l1) return null;
  const soft = leaves.find((l) => loose(l.value) === l1);
  if (soft) return soft.path;

  // Renderer decorated the value (quotes, currency, prefix/suffix labels).
  const contained = leaves
    .filter((l) => l.value.length > 3 && l1.includes(loose(l.value)) && loose(l.value).length / l1.length > 0.6)
    .sort((a, b) => b.value.length - a.value.length)[0];
  return contained?.path ?? null;
}


/** True when a path points at an image-ish field. */
export function isImagePath(path: string): boolean {
  const last = path.split(".").pop() ?? "";
  if (/^\d+$/.test(last)) {
    // gallery arrays: "3.images.2"
    const parent = path.split(".").slice(-2)[0] ?? "";
    return /image|photo|gallery|img|slide|banner/i.test(parent);
  }
  return /image|logo|photo|avatar|img|banner|bg_image|bg_video|thumb|cover|src/i.test(last);
}

/** True when a string looks like an image URL / data URI. */
export function looksLikeImageUrl(v: unknown): v is string {
  return typeof v === "string" && (/^data:image\//i.test(v) || /^(https?:)?\/\//.test(v));
}

/** Strip query/hash/protocol so renderer-optimised URLs still match the stored value. */
export function normalizeUrl(u: string): string {
  let v = u.trim();
  // ImageKit web-proxy URLs embed the original URL: strip the endpoint prefix.
  const ik = v.match(/^https?:\/\/ik\.imagekit\.io\/[^/]+\/(.+)$/i);
  if (ik?.[1]) {
    const decoded = decodeURIComponent(ik[1].split("?")[0] ?? "");
    if (/^https?:\/\//i.test(decoded)) v = decoded;
  }
  return v.replace(/^https?:/i, "").split(/[?#]/)[0]!.replace(/\/+$/, "").toLowerCase();
}

/** All image-ish string fields inside a node, as `{ path, value }`. */
export function collectImagePaths(node: any, prefix = ""): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  const walk = (n: any, p: string) => {
    if (typeof n === "string") {
      if (p && (isImagePath(p) || /\.(png|jpe?g|webp|avif|gif)(\?|$)/i.test(n)) && looksLikeImageUrl(n)) {
        out.push({ path: p, value: n });
      } else if (p && isImagePath(p)) {
        out.push({ path: p, value: n });
      }
      return;
    }
    if (Array.isArray(n)) { n.forEach((c, i) => walk(c, p ? `${p}.${i}` : String(i))); return; }
    if (n && typeof n === "object") {
      for (const [k, v] of Object.entries(n)) walk(v, p ? `${p}.${k}` : k);
    }
  };
  walk(node, prefix);
  return out;
}

/**
 * Map a rendered image URL back to the field that produced it.
 * Renderers often append sizing params or proxy the URL, so exact match is not enough.
 */
export function findImagePath(section: any, url: string, prefix = ""): string | null {
  const candidates = collectImagePaths(section, prefix);
  const target = normalizeUrl(url);
  const exact = candidates.find((c) => normalizeUrl(c.value) === target);
  if (exact) return exact.path;
  const file = target.split("/").pop() ?? "";
  if (file.length > 6) {
    const byFile = candidates.find((c) => normalizeUrl(c.value).split("/").pop() === file);
    if (byFile) return byFile.path;
  }
  const partial = candidates.find(
    (c) => c.value && (target.includes(normalizeUrl(c.value)) || normalizeUrl(c.value).includes(target)),
  );
  return partial?.path ?? null;
}

/* ---------------- widget library ---------------- */

export type WidgetDef = { type: string; label: string; make: () => any };

export const WIDGETS: WidgetDef[] = [
  { type: "hero3d", label: "Hero", make: () => ({ type: "hero3d", headline: "A headline that sells", sub: "One sharp sentence about what you do.", cta: "Get started", image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=85" }) },
  { type: "features", label: "Features", make: () => ({ type: "features", title: "Why choose us", items: [{ title: "Quality", desc: "Best-in-class service." }, { title: "Speed", desc: "Fast delivery, every time." }, { title: "Trust", desc: "2000+ happy customers." }] }) },
  { type: "showcase", label: "Services", make: () => ({ type: "showcase", kind: "services", title: "What we offer", sub: "Explore our signature offering.", items: [{ title: "Signature service", meta: "Popular", desc: "Add useful details here.", image: "" }] }) },
  { type: "gallery", label: "Gallery", make: () => ({ type: "gallery", title: "Gallery", images: [] }) },
  { type: "portfolio", label: "Portfolio", make: () => ({ type: "portfolio", title: "Selected work", items: [{ title: "Project one", meta: "2025", desc: "What we delivered.", image: "" }] }) },
  { type: "products", label: "Products", make: () => ({ type: "products", title: "Shop", items: [] }) },
  { type: "pricing", label: "Pricing", make: () => ({ type: "pricing", title: "Pricing", plans: [{ name: "Basic", price: "₹999", features: ["Feature one", "Feature two"] }] }) },
  { type: "stats", label: "Stats", make: () => ({ type: "stats", items: [{ k: "100+", v: "Clients" }, { k: "12", v: "Years" }] }) },
  { type: "team", label: "Team", make: () => ({ type: "team", title: "Our team", items: [{ name: "Name", role: "Role", image: "" }] }) },
  { type: "testimonials", label: "Reviews", make: () => ({ type: "testimonials", title: "What clients say", items: [{ name: "Client", text: "Fantastic work!", rating: 5 }] }) },
  { type: "faq", label: "FAQ", make: () => ({ type: "faq", title: "FAQ", items: [{ q: "Question?", a: "Answer." }] }) },
  { type: "booking", label: "Booking", make: () => ({ type: "booking", mode: "inquiry", title: "Ready to book?", sub: "Pick a time and we will confirm.", cta: "Send inquiry" }) },
  { type: "cta", label: "CTA", make: () => ({ type: "cta", headline: "Ready to start?", cta: "Contact us" }) },
  { type: "contact", label: "Contact", make: () => ({ type: "contact", title: "Get in touch" }) },
];

export function makeWidget(type: string): any | null {
  return WIDGETS.find((w) => w.type === type)?.make() ?? null;
}

/** Footer credit is platform-locked — never selectable by a site owner. */
export const LOCKED_TEXT = /built with sktechlab/i;
