export type Brand = {
  name: string;
  tagline?: string;
  logo?: string;
  primary: string;
  secondary?: string;
  accent?: string;
  whatsapp?: string;
  email?: string;
  phone?: string;
  address?: string;
  currency?: string;
  /** Optional site-wide 3D-feel background video (mp4 URL). Autoplays muted, looped. */
  bg_video?: string;
  /** Optional site-wide background image (HD). Used as poster / fallback. */
  bg_image?: string;
  /** 0–1 background overlay strength for readability. Default 0.55. */
  bg_overlay?: number;
  /** 0–1 visibility of the background video / image layer. Default 1. */
  bg_opacity?: number;
  /** Solid background colour (hex) under any media. */
  bg_color?: string;
  /** CSS gradient used as the background layer. */
  bg_gradient?: string;
  /** Still image used instead of the video on phones. */
  bg_mobile_image?: string;
  /** Layout variant */
  layout?: "cinematic" | "editorial" | "bento" | "neon" | "boutique" | "brutal" | "noirgold" | "prism";
  /** Social handles / profile URLs */
  socials?: { instagram?: string; facebook?: string; twitter?: string; x?: string; linkedin?: string; youtube?: string };
  /** Typography system key from the template DNA (see design/dna.ts). */
  font?: string;
  /** Navigation style from the template DNA. */
  nav?: "dock" | "minimal" | "center" | "split" | "bar" | "rail";
  /** Spacing rhythm from the template DNA. */
  density?: "tight" | "normal" | "airy";
  /** Corner language from the template DNA. */
  corner?: "sharp" | "soft" | "pill";
  /** Motion personality from the template DNA. */
  motion?: "calm" | "cinematic" | "energetic" | "precise";
  /** Human-readable design direction label, e.g. "Architectural Editorial". */
  direction?: string;
  /** Theme override */
  theme?: "light" | "dark";
  /** Only the SKTECHLAB super-admin can hide the "Built with SKTECHLAB" footer credit. */
  hide_badge?: boolean;
};


export type Product = {
  id: string;
  name: string;
  price: number;
  compare_at?: number;
  image: string;
  badge?: string;
  category?: string;
};

export type MenuItem = { name: string; price: number; desc?: string; image?: string; tag?: string };

export type Testimonial = { name: string; role?: string; text: string; rating?: number; avatar?: string };

export type PricingPlan = { name: string; price: string; period?: string; features: string[]; featured?: boolean; cta?: string; link?: string };

export type Feature = { icon?: string; title: string; desc: string };

export type ShowcaseItem = {
  title: string;
  meta?: string;
  desc?: string;
  image?: string;
  cta?: string;
  link?: string;
};

export type ButtonLink = { link?: string };

export type Section =
  | { type: "hero3d"; headline: string; sub: string; cta: string; image: string; bullets?: string[]; link?: string }
  | { type: "features"; title: string; sub?: string; items: Feature[] }
  | { type: "stats"; items: { k: string; v: string }[] }
  | { type: "products"; title?: string; items: Product[] }
  | { type: "menu"; title?: string; items: MenuItem[] }
  | { type: "gallery"; title?: string; images: string[] }
  | { type: "testimonials"; title?: string; items: Testimonial[] }
  | { type: "pricing"; title?: string; sub?: string; plans: PricingPlan[] }
  | { type: "team"; title?: string; items: { name: string; role: string; image: string }[] }
  | { type: "showcase"; kind: "rooms" | "listings" | "projects" | "programs" | "courses" | "services" | "packages"; title: string; sub?: string; items: ShowcaseItem[] }
  | {
      type: "portfolio";
      title?: string;
      sub?: string;
      design?: "editorial" | "mosaic" | "index";
      items: { title: string; meta?: string; year?: string; desc?: string; image?: string; tags?: string[]; link?: string }[];
    }
  | { type: "booking"; mode: "reservation" | "appointment" | "enrollment" | "inquiry" | "booking"; title: string; sub?: string; cta: string; link?: string }
  | { type: "faq"; title?: string; items: { q: string; a: string }[] }
  | { type: "cta"; headline: string; sub?: string; cta: string; link?: string }
  | { type: "contact"; title?: string; sub?: string };

export type SiteContent = {
  /** Preserve hand-designed / imported projects during preview and creation. */
  presentation?: "preserve";
  archetype: string;
  brand: Brand;
  sections: Section[];
  /**
   * Elementor-style per-element style overrides, keyed by data path
   * (e.g. "0.headline") with per-device values. Optional — sites without
   * it render exactly as before.
   */
  styles?: import("@/lib/editor/paths").StyleMap;
};

