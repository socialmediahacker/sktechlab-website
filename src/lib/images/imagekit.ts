/**
 * ImageKit delivery layer.
 *
 * Every image URL in the templates goes through `ikUrl()`. When the ImageKit
 * integration is enabled (main admin → Integrations), URLs are rewritten to the
 * ImageKit endpoint with `tr=` transformations (auto format, HD, right width).
 * When disabled, the original URL is returned untouched.
 */

export type ImageKitConfig = {
  enabled: boolean;
  endpoint: string;
  publicKey: string;
  webProxy: boolean;
  forceAll: boolean;
  defaultQuality: number;
  defaultFormat: string;
  uploadFolder: string;
};

const DEFAULT_CONFIG: ImageKitConfig = {
  enabled: true,
  endpoint: "https://ik.imagekit.io/yevm9inmx",
  publicKey: "public_5uRmEXX0ZH7b1GDhRbTfdo/uUNM=",
  // Remote-image proxying needs an "external origin" configured in the ImageKit
  // dashboard; until then remote URLs are left untouched (uploads still use IK).
  webProxy: false,
  forceAll: false,
  defaultQuality: 80,
  defaultFormat: "auto",
  uploadFolder: "sktechlab",
};

let CONFIG: ImageKitConfig = { ...DEFAULT_CONFIG };

export function getImageKitConfig(): ImageKitConfig {
  return CONFIG;
}

/** Called once at app start with the DB-stored integration row. */
export function setImageKitConfig(partial: Partial<ImageKitConfig> & { enabled?: boolean }) {
  CONFIG = { ...DEFAULT_CONFIG, ...CONFIG, ...partial };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem("ik_cfg", JSON.stringify(CONFIG));
    } catch {}
  }
}

/** Restore last-known config synchronously (browser only) so first paint is right. */
export function hydrateImageKitConfig() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem("ik_cfg");
    if (raw) CONFIG = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {}
}

function trString(opts: { w?: number; h?: number; q?: number; focus?: boolean }) {
  const cfg = CONFIG;
  const parts: string[] = [];
  if (opts.w) parts.push(`w-${Math.round(opts.w)}`);
  if (opts.h) parts.push(`h-${Math.round(opts.h)}`);
  if (opts.w && opts.h) parts.push("c-maintain_ratio", "fo-auto");
  parts.push(`q-${Math.round(opts.q ?? cfg.defaultQuality)}`);
  parts.push(`f-${cfg.defaultFormat || "auto"}`);
  return parts.join(",");
}

const SKIP = /^(data:|blob:)/i;

/**
 * Rewrite any image URL to be served (and optimised) through ImageKit.
 * - URLs already on the ImageKit endpoint get their `tr` query set.
 * - Remote URLs use the ImageKit web-proxy form: `<endpoint>/<full-url>?tr=...`
 */
export function ikUrl(src?: string | null, opts: { w?: number; h?: number; q?: number } = {}): string {
  const url = (src ?? "").trim();
  if (!url) return "";
  const cfg = CONFIG;
  if (!cfg.enabled || !cfg.endpoint) return url;
  if (SKIP.test(url) || url.startsWith("/")) return url;

  const tr = trString(opts);
  const endpoint = cfg.endpoint.replace(/\/+$/, "");

  if (url.startsWith(endpoint)) {
    const [base, query = ""] = url.split("?");
    const params = new URLSearchParams(query);
    params.set("tr", tr);
    return `${base}?${params.toString()}`;
  }

  if (/^https?:\/\//i.test(url)) {
    if (!cfg.webProxy || !cfg.forceAll) return url;
    // Web-proxy form: the source URL (with its own query) must be encoded.
    return `${endpoint}/${encodeURIComponent(url)}?tr=${encodeURIComponent(tr)}`;
  }

  // Relative path inside the ImageKit media library.
  return `${endpoint}/${url.replace(/^\/+/, "")}?tr=${encodeURIComponent(tr)}`;
}

/** Convenience for srcSet-free responsive usage. */
export function ikSrcSet(src?: string | null, widths: number[] = [640, 1024, 1600]) {
  if (!src) return undefined;
  return widths.map((w) => `${ikUrl(src, { w })} ${w}w`).join(", ");
}

const IMAGE_KEY = /(image|images|logo|photo|avatar|img|banner|bg_image|thumb|cover|src)$/i;

/**
 * Deep-rewrite every image-ish string in a site content tree so all templates
 * serve their photos through ImageKit. Videos and non-URL values pass through.
 */
export function optimizeContentImages<T>(node: T, key = ""): T {
  if (typeof node === "string") {
    if (IMAGE_KEY.test(key) && /^https?:\/\//i.test(node)) return ikUrl(node, { w: 1600 }) as unknown as T;
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((v) => optimizeContentImages(v, key)) as unknown as T;
  }
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      out[k] = optimizeContentImages(v, /^\d+$/.test(k) ? key : k);
    }
    return out as T;
  }
  return node;
}
