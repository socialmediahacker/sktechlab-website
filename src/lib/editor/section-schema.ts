/**
 * Plain-language field schema used by the Simple (guided) editor.
 * Each section type maps to a few friendly fields plus an optional
 * repeatable list, so a non-technical owner never sees raw JSON.
 */

export type FieldKind = "text" | "textarea" | "image" | "number";

export type SimpleField = {
  key: string;
  label: string;
  hint?: string;
  kind: FieldKind;
  placeholder?: string;
};

export type ListSchema = {
  /** property on the section holding the array */
  key: string;
  /** singular label, e.g. "Photo" */
  label: string;
  /** true when the array holds plain image URL strings */
  images?: boolean;
  fields?: SimpleField[];
  blank: () => any;
};

export type SectionSchema = {
  label: string;
  hint: string;
  fields: SimpleField[];
  list?: ListSchema;
};

const T = (key: string, label: string, hint?: string, placeholder?: string): SimpleField =>
  ({ key, label, hint, kind: "text", placeholder });
const A = (key: string, label: string, hint?: string): SimpleField =>
  ({ key, label, hint, kind: "textarea" });
const I = (key: string, label: string, hint?: string): SimpleField =>
  ({ key, label, hint, kind: "image" });

const TITLE = T("title", "Section heading", "Bada heading jo is section ke upar dikhta hai.");
const SUB = A("sub", "Short description", "Ek-do line ka intro (optional).");

export const SECTION_SCHEMAS: Record<string, SectionSchema> = {
  hero3d: {
    label: "Top banner",
    hint: "Sabse upar wala bada banner — pehli nazar yahi padti hai.",
    fields: [
      A("headline", "Main headline", "Aap kya karte hain, ek line me."),
      A("sub", "Sub text", "Thoda detail — 1 ya 2 line."),
      T("cta", "Button text", "Jaise: Get in touch, Book now."),
      I("image", "Banner image", "Chaudi (landscape) HD photo best lagti hai."),
    ],
  },
  features: {
    label: "Features",
    hint: "Aapki khoobiyan — 3 se 6 points.",
    fields: [TITLE, SUB],
    list: {
      key: "items", label: "Feature",
      fields: [T("title", "Feature name"), A("desc", "One-line detail")],
      blank: () => ({ title: "New feature", desc: "Short detail here." }),
    },
  },
  showcase: {
    label: "Services",
    hint: "Aapki services / offerings ki list.",
    fields: [TITLE, SUB],
    list: {
      key: "items", label: "Service",
      fields: [T("title", "Service name"), T("meta", "Tag / price", "Jaise: Popular, ₹999"), A("desc", "Detail"), I("image", "Photo")],
      blank: () => ({ title: "New service", meta: "", desc: "What this includes.", image: "" }),
    },
  },
  gallery: {
    label: "Photo gallery",
    hint: "Photos jo sliding gallery me dikhengi.",
    fields: [TITLE, SUB],
    list: {
      key: "images", label: "Photo", images: true,
      blank: () => "",
    },
  },
  portfolio: {
    label: "Portfolio / work",
    hint: "Aapke kaam ke examples, photo aur detail ke saath.",
    fields: [TITLE, SUB],
    list: {
      key: "items", label: "Project",
      fields: [
        T("title", "Project name"),
        T("meta", "Category", "Jaise: Branding, Wedding shoot"),
        T("year", "Year"),
        A("desc", "What you delivered"),
        I("image", "Project photo"),
      ],
      blank: () => ({ title: "New project", meta: "Project", year: "", desc: "What you delivered.", image: "" }),
    },
  },
  products: {
    label: "Products",
    hint: "Store ke products jo site par dikhenge.",
    fields: [TITLE, SUB],
    list: {
      key: "items", label: "Product",
      fields: [T("name", "Product name"), { key: "price", label: "Price (₹)", kind: "number" }, A("desc", "Detail"), I("image", "Product photo")],
      blank: () => ({ id: crypto.randomUUID(), name: "New product", price: 0, desc: "", image: "" }),
    },
  },
  pricing: {
    label: "Pricing",
    hint: "Plans aur unke rate.",
    fields: [TITLE, SUB],
    list: {
      key: "plans", label: "Plan",
      fields: [T("name", "Plan name"), T("price", "Price", "Jaise: ₹1,999 / month")],
      blank: () => ({ name: "New plan", price: "₹999", features: ["Feature one"] }),
    },
  },
  stats: {
    label: "Numbers",
    hint: "Bade numbers jo bharosa banate hain.",
    fields: [TITLE],
    list: {
      key: "items", label: "Number",
      fields: [T("k", "Number", "Jaise: 500+"), T("v", "Label", "Jaise: Happy clients")],
      blank: () => ({ k: "100+", v: "Clients" }),
    },
  },
  team: {
    label: "Team",
    hint: "Aapki team ke log.",
    fields: [TITLE, SUB],
    list: {
      key: "items", label: "Member",
      fields: [T("name", "Name"), T("role", "Role"), I("image", "Photo")],
      blank: () => ({ name: "New member", role: "Role", image: "" }),
    },
  },
  testimonials: {
    label: "Reviews",
    hint: "Customers ke reviews.",
    fields: [TITLE, SUB],
    list: {
      key: "items", label: "Review",
      fields: [T("name", "Customer name"), A("text", "Review"), { key: "rating", label: "Rating (1-5)", kind: "number" }, I("image", "Photo")],
      blank: () => ({ name: "Customer", text: "Great experience!", rating: 5 }),
    },
  },
  faq: {
    label: "FAQ",
    hint: "Common sawaal aur jawaab.",
    fields: [TITLE],
    list: {
      key: "items", label: "Question",
      fields: [T("q", "Question"), A("a", "Answer")],
      blank: () => ({ q: "New question?", a: "Answer here." }),
    },
  },
  booking: {
    label: "Booking",
    hint: "Appointment / inquiry form.",
    fields: [TITLE, SUB, T("cta", "Button text")],
  },
  cta: {
    label: "Call to action",
    hint: "Aakhri push — customer ko action lene ke liye.",
    fields: [A("headline", "Headline"), A("sub", "Sub text"), T("cta", "Button text")],
  },
  contact: {
    label: "Contact",
    hint: "Contact form. Phone/email Brand step se aate hain.",
    fields: [TITLE, SUB],
  },
};

export const FALLBACK_SCHEMA: SectionSchema = {
  label: "Section",
  hint: "Is section ke text aur photos yahan badlein.",
  fields: [TITLE, SUB],
};

export function schemaFor(type: string): SectionSchema {
  return SECTION_SCHEMAS[type] ?? FALLBACK_SCHEMA;
}

/** Best-effort preview image for a section card thumbnail. */
export function sectionThumb(section: any): string | null {
  if (!section || typeof section !== "object") return null;
  const direct = [section.image, section.bg_image, section.cover].find((v) => typeof v === "string" && v);
  if (direct) return direct as string;
  if (Array.isArray(section.images)) {
    const first = section.images.find((v: unknown) => typeof v === "string" && v);
    if (first) return first as string;
  }
  for (const arr of [section.items, section.plans]) {
    if (Array.isArray(arr)) {
      const hit = arr.find((it: any) => it && typeof it.image === "string" && it.image);
      if (hit) return hit.image as string;
    }
  }
  return null;
}
