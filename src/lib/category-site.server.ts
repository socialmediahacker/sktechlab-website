import type { Section, SiteContent } from "@/lib/site-renderer/types";

type CategoryPreset = {
  kind: "rooms" | "listings" | "projects" | "programs" | "courses" | "services" | "packages";
  booking: "reservation" | "appointment" | "enrollment" | "inquiry" | "booking";
  title: string;
};

function presetFor(category: string): CategoryPreset | null {
  const value = category.toLowerCase();
  if (/hotel|travel|resort|tour/.test(value)) return { kind: "rooms", booking: "booking", title: "Stay your way" };
  if (/real estate|property|construction/.test(value)) return { kind: "listings", booking: "inquiry", title: "Featured properties" };
  if (/interior|architect|agency|marketing|saas/.test(value)) return { kind: "projects", booking: "inquiry", title: "Selected work" };
  if (/gym|fitness|yoga/.test(value)) return { kind: "programs", booking: "appointment", title: "Programs built around you" };
  if (/clinic|doctor|health|dental/.test(value)) return { kind: "services", booking: "appointment", title: "Care you can count on" };
  if (/education|school|coaching|course|academy/.test(value)) return { kind: "courses", booking: "enrollment", title: "Choose your learning path" };
  if (/photo|creative|wedding|salon|spa/.test(value)) return { kind: "packages", booking: "booking", title: "Signature packages" };
  if (/restaurant|cafe|bakery|food/.test(value)) return { kind: "services", booking: "reservation", title: "A table worth gathering around" };
  return null;
}

export function personalizeTemplateContent(
  original: unknown,
  business: { name: string; category?: string | null; description?: string | null; ai?: Record<string, unknown> | null },
): SiteContent | null {
  if (!original || typeof original !== "object") return null;
  const source = structuredClone(original) as SiteContent;
  if (!source.brand || !Array.isArray(source.sections)) return null;

  const category = business.category?.trim() || source.archetype || "business";
  const ai = business.ai ?? {};
  source.archetype = category.toLowerCase();
  source.brand = {
    ...source.brand,
    name: business.name,
    tagline: String(ai.tagline ?? business.description ?? source.brand.tagline ?? "").slice(0, 160),
    primary: String(source.presentation === "preserve" ? source.brand.primary : ai.primary_color ?? source.brand.primary),
    secondary: String(source.presentation === "preserve" ? source.brand.secondary ?? source.brand.primary : ai.secondary_color ?? source.brand.secondary ?? source.brand.primary),
    theme: source.presentation === "preserve" ? source.brand.theme : ai.theme === "light" || ai.theme === "dark" ? ai.theme : source.brand.theme,
    layout: source.presentation === "preserve" ? source.brand.layout : ["cinematic", "editorial", "bento", "neon", "boutique", "brutal"].includes(String(ai.layout))
      ? ai.layout as SiteContent["brand"]["layout"]
      : source.brand.layout,
  };

  source.sections = source.sections.map((section) => {
    if (section.type !== "hero3d") return section;
    return {
      ...section,
      headline: String(ai.headline ?? `${business.name}, made memorable`).slice(0, 80),
      sub: String(ai.about ?? business.description ?? section.sub).slice(0, 180),
      cta: String(ai.cta ?? section.cta),
    };
  });

  if (source.presentation === "preserve") return source;
  const preset = presetFor(category);
  if (!preset) return source;
  const withoutGeneric = source.sections.filter((section) => section.type !== "showcase" && section.type !== "booking");
  const insertAt = Math.min(3, withoutGeneric.length);
  const showcase: Section = {
    type: "showcase",
    kind: preset.kind,
    title: preset.title,
    sub: business.description || `Explore what makes ${business.name} different.`,
    items: [
      { title: "Signature choice", meta: "Most loved", desc: "Tailored details, transparent value and a polished experience." },
      { title: "Flexible option", meta: "Made for you", desc: "A practical choice that adapts to your needs and schedule." },
      { title: "Premium experience", meta: "Complete", desc: "Our highest-touch option with thoughtful service from start to finish." },
    ],
  };
  const booking: Section = {
    type: "booking",
    mode: preset.booking,
    title: preset.booking === "reservation" ? "Reserve your table" : preset.booking === "appointment" ? "Book an appointment" : preset.booking === "enrollment" ? "Start your enrollment" : "Ready to get started?",
    sub: "Share your preferred date and details. Our team will confirm everything with you.",
    cta: preset.booking === "reservation" ? "Reserve now" : preset.booking === "appointment" ? "Book a slot" : preset.booking === "enrollment" ? "Enroll now" : "Send inquiry",
  };
  source.sections = [...withoutGeneric.slice(0, insertAt), showcase, ...withoutGeneric.slice(insertAt), booking];
  return source;
}