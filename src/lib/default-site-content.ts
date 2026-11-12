import type { SiteContent } from "@/lib/site-renderer/types";

export function defaultSiteContent(name = "Business Website"): SiteContent {
  const brandName = name.replace(/\s+—\s+.*/, "").trim() || "Business Website";
  return {
    archetype: "business",
    brand: {
      name: brandName,
      tagline: "Premium digital presence",
      primary: "#0f766e",
      secondary: "#111827",
      accent: "#f59e0b",
      whatsapp: "+919876543210",
      email: "hello@business.in",
      phone: "+91 98765 43210",
      address: "India",
      currency: "₹",
    },
    sections: [
      {
        type: "hero3d",
        headline: `${brandName} built for real customers`,
        sub: "A polished, mobile-ready website with clear sections, premium visuals, WhatsApp contact and enquiry form.",
        cta: "Get in touch",
        image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1600&q=85&auto=format&fit=crop",
        bullets: ["Fast mobile experience", "WhatsApp enquiry ready", "Editable from dashboard"],
      },
      {
        type: "features",
        title: "Everything customers expect",
        items: [
          { icon: "sparkles", title: "Premium design", desc: "Human-built layout with real imagery, depth, motion and clean spacing." },
          { icon: "zap", title: "Fast updates", desc: "Edit text, colors, images, sections and contact details from the visual editor." },
          { icon: "shield", title: "Business ready", desc: "Public link, contact form, WhatsApp popup and dashboard management included." },
        ],
      },
      {
        type: "gallery",
        title: "Visual showcase",
        images: [
          "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=85&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=85&auto=format&fit=crop",
          "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=85&auto=format&fit=crop",
        ],
      },
      { type: "contact", title: "Say hello", sub: "Send your details and we will reply shortly." },
    ],
  };
}