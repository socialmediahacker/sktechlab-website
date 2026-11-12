/**
 * Button action model — no dead buttons.
 *
 * Any CTA can carry an optional `link` string next to its label:
 *   ""                → default (site contact section)
 *   "#services"       → in-page anchor
 *   "page:about"      → another site page
 *   "https://…"       → external URL (opens in a new tab)
 *   "tel:+9198…"      → phone dial
 *   "mailto:a@b.com"  → email
 *   "wa:9887193936"   → WhatsApp chat (falls back to the brand number)
 *   "whatsapp"        → brand WhatsApp
 *   "phone" | "email" → brand phone / email
 *   "booking" | "contact" | "shop" | "cart" | "checkout" → known site sections
 */

export type BrandLike = {
  whatsapp?: string;
  phone?: string;
  email?: string;
};

const SECTION_ANCHORS: Record<string, string> = {
  contact: "#contact",
  booking: "#booking",
  shop: "#shop",
  products: "#shop",
  cart: "#cart",
  checkout: "#checkout",
  gallery: "#gallery",
  pricing: "#pricing",
  services: "#services",
  faq: "#faq",
  team: "#team",
};

const digits = (v: string) => v.replace(/\D/g, "");

/** Resolve a stored link into a real href. Always returns something clickable. */
export function resolveHref(link: unknown, brand: BrandLike = {}, fallback = "#contact"): string {
  const raw = typeof link === "string" ? link.trim() : "";
  if (!raw) return fallback;

  if (/^(https?:)?\/\//i.test(raw)) return raw;
  if (/^(tel:|mailto:|sms:|#|\/)/i.test(raw)) return raw;

  const lower = raw.toLowerCase();

  if (lower.startsWith("wa:")) {
    const n = digits(raw.slice(3)) || digits(brand.whatsapp ?? "");
    return n ? `https://wa.me/${n}` : fallback;
  }
  if (lower === "whatsapp") {
    const n = digits(brand.whatsapp ?? "");
    return n ? `https://wa.me/${n}` : fallback;
  }
  if (lower === "phone") return brand.phone ? `tel:${brand.phone}` : fallback;
  if (lower === "email") return brand.email ? `mailto:${brand.email}` : fallback;
  if (lower.startsWith("page:")) {
    const slug = raw.slice(5).replace(/^\/+/, "").trim();
    return slug ? `#${slug}` : fallback;
  }
  if (SECTION_ANCHORS[lower]) return SECTION_ANCHORS[lower]!;

  // Bare domain typed by the owner ("example.com/pricing").
  if (/^[\w-]+\.[a-z]{2,}([/?#].*)?$/i.test(raw)) return `https://${raw}`;

  return `#${raw.replace(/^#/, "")}`;
}

/** True when the resolved href should open in a new tab. */
export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

/** Options shown in the editor's "Button action" picker. */
export const LINK_PRESETS: Array<{ value: string; label: string }> = [
  { value: "", label: "Contact section (default)" },
  { value: "booking", label: "Booking section" },
  { value: "shop", label: "Shop / products" },
  { value: "checkout", label: "Checkout" },
  { value: "pricing", label: "Pricing" },
  { value: "gallery", label: "Gallery" },
  { value: "whatsapp", label: "WhatsApp chat" },
  { value: "phone", label: "Call phone" },
  { value: "email", label: "Send email" },
  { value: "custom", label: "Custom URL / anchor…" },
];
