/**
 * Deterministic demo builder.
 *
 * Turns a catalogue category into a complete, category-specific demo website:
 * real Indian-business copy, signature services from the catalogue, verified
 * category photos, and a per-index design variant so the 5–7 demos of one
 * category never share layout, palette, section order or content.
 */
import type { Section, SiteContent } from "@/lib/site-renderer/types";
import { bucketImages } from "@/lib/images/category-packs";
import { variantFor, orderSections, hashSeed } from "./variant";
import { resolveCatalogEntry, type CatalogEntry } from "@/lib/categories/catalog";

const CITIES = ["Jaipur", "Indore", "Pune", "Lucknow", "Surat", "Nagpur", "Kochi", "Bhopal"];
// Generic, brand-neutral descriptors — no invented business names.
const SUFFIX = ["Studio", "House", "Hub", "Point", "Care", "Works", "Collective", "Junction"];

export function demoName(entry: { name: string }, index: number): string {
  const s = SUFFIX[index % SUFFIX.length];
  const short = entry.name.split(/[&,]/)[0]!.trim();
  return `${short} ${s}`;
}


const ICONS = ["sparkles", "shield", "zap", "star", "heart", "award"];

function faqFor(entry: CatalogEntry, city: string) {
  return [
    { q: `Do you serve all areas of ${city}?`, a: `Yes. Our team covers ${city} and nearby areas, and we confirm timing on WhatsApp before every visit.` },
    { q: "How do I get a price estimate?", a: "Share your requirement on the enquiry form or WhatsApp — you get a clear, itemised quote the same day with no hidden charges." },
    { q: "Can I book on WhatsApp?", a: "Absolutely. Tap the WhatsApp button anywhere on this site and our team replies within a few minutes during working hours." },
    { q: `What makes your ${entry.name.toLowerCase()} different?`, a: `${entry.services[0]} and ${entry.services[1]?.toLowerCase() ?? "personal attention"} — with trained staff and honest pricing that regular customers keep coming back for.` },
  ];
}

/** Build one complete demo site for a category. */
export function buildDemoContent(
  categorySlug: string,
  categoryName: string,
  index: number,
  seedId = `${categorySlug}-${index}`,
): SiteContent {
  const entry: CatalogEntry =
    resolveCatalogEntry(categorySlug, categoryName) ??
    ({
      slug: categorySlug,
      name: categoryName,
      icon: "LayoutGrid",
      family: "service",
      pack: categorySlug,
      layouts: ["cinematic"],
      theme: "light",
      palettes: ["ocean"],
      showcase: "services",
      booking: "inquiry",
      services: [
        "Trusted local experience",
        "Transparent pricing",
        "Doorstep service",
        "Verified professionals",
        "Same-day response",
        "After-service support",
      ],
      subs: [],
      synonyms: [],
    } as CatalogEntry);


  const v = variantFor(categorySlug, seedId, index);
  const seed = hashSeed(seedId) + index;
  const city = CITIES[seed % CITIES.length]!;
  const name = demoName(entry, index);

  const hero = bucketImages(categorySlug, "hero", 3, index * 3);
  const gallery = bucketImages(categorySlug, "gallery", 6, index * 2 + 1);
  const service = bucketImages(categorySlug, "service", 6, index * 2);
  const product = bucketImages(categorySlug, "product", 6, index + 2);
  const team = bucketImages(categorySlug, "team", 3, index);

  const svc = [...entry.services];
  // rotate services so each demo leads with a different promise
  for (let i = 0; i < index % svc.length; i++) svc.push(svc.shift() as string);

  const sections: Section[] = [
    {
      type: "hero3d",
      headline: `${name} — ${svc[0]}`,
      sub: `${entry.name} in ${city}. ${svc[1]} and ${svc[2]?.toLowerCase()} with a team locals actually recommend.`,
      cta: entry.booking === "reservation" ? "Book a table" : entry.booking === "appointment" ? "Book appointment" : "Get a quote",
      image: hero[0] ?? "",
      bullets: svc.slice(0, 3),
      link: "whatsapp",
    },
    {
      type: "features",
      title: `Why ${city} chooses us`,
      sub: `Everything a ${entry.name.toLowerCase()} customer expects, done properly.`,
      items: svc.slice(0, 4).map((s, i) => ({
        icon: ICONS[(index + i) % ICONS.length]!,
        title: s,
        desc: `${s} handled end to end by our own trained team — no middlemen, no surprise charges, and clear updates on WhatsApp.`,
      })),
    },
    {
      type: "showcase",
      kind: entry.showcase,
      title: entry.family === "shop" ? "Popular with our customers" : "Our signature work",
      sub: `Hand-picked ${entry.name.toLowerCase()} offerings from our ${city} team.`,
      items: svc.slice(0, 4).map((s, i) => ({
        title: s,
        meta: i === 0 ? "Most booked" : `${(i + 2) * 3}+ this month`,
        desc: `${s} — delivered with premium materials, careful finishing and a written service promise.`,
        image: service[i] ?? gallery[i] ?? "",
        cta: "Enquire",
        link: "whatsapp",
      })),
    },
    { type: "stats", items: [
      { k: `${8 + (seed % 14)}+`, v: "Years serving locally" },
      { k: `${2 + (seed % 9)}.${seed % 10}k`, v: "Happy customers" },
      { k: "4.8★", v: "Average Google rating" },
      { k: "< 15 min", v: "WhatsApp response time" },
    ] },
    { type: "gallery", title: "Inside our world", images: gallery.filter(Boolean) },
    {
      type: "testimonials",
      title: "What customers say",
      items: [
        { name: "Rahul Mehta", role: `${city}`, rating: 5, text: `Genuinely professional. ${svc[0]} was exactly as promised and the team kept me updated on WhatsApp the whole time.`, avatar: team[0] ?? "" },
        { name: "Priya Sharma", role: `${city}`, rating: 5, text: `Fair pricing and no pushy selling. I have already recommended ${name} to two of my neighbours.`, avatar: team[1] ?? "" },
        { name: "Imran Qureshi", role: `${city}`, rating: 4, text: `Booked in the morning, work finished the same day. Quality was much better than the last place I tried.`, avatar: team[2] ?? "" },
      ],
    },
    {
      type: "booking",
      mode: entry.booking,
      title: entry.booking === "reservation" ? "Reserve your table" : entry.booking === "enrollment" ? "Book your seat" : "Book a visit",
      sub: "Pick a time that suits you — we confirm on WhatsApp within minutes.",
      cta: "Book now",
      link: "whatsapp",
    },
    { type: "faq", title: "Questions people ask", items: faqFor(entry, city) },
    { type: "contact", title: "Talk to us", sub: `Call, WhatsApp or send an enquiry — the ${name} team replies fast.` },
    { type: "cta", headline: `Ready when you are, ${city}`, sub: `${svc[0]} starts with one message.`, cta: "Message on WhatsApp", link: "whatsapp" },
  ];

  /* ---- signature sections, driven by the business family ---- */

  const wantsProducts = entry.family === "shop" || (entry.commerce === true && entry.family !== "food");
  const wantsMenu = entry.family === "food";
  const wantsPortfolio = entry.family === "visual";
  const wantsPricing = ["wellness", "trust", "stay", "service", "saas"].includes(entry.family);

  if (wantsProducts) {
    sections.splice(3, 0, {
      type: "products",
      title: "Best sellers",
      items: svc.slice(0, 4).map((s, i) => ({
        id: `p${i + 1}`,
        name: s,
        price: 499 + ((seed + i * 7) % 12) * 250,
        compare_at: 999 + ((seed + i * 5) % 14) * 300,
        image: product[i] ?? gallery[i] ?? "",
        badge: i === 0 ? "Bestseller" : i === 1 ? "New" : undefined,
        category: entry.subs[i % Math.max(entry.subs.length, 1)] ?? entry.name,
      })),
    } as Section);
  }

  if (wantsMenu) {
    sections.splice(2, 0, {
      type: "menu",
      title: "From our kitchen",
      items: svc.slice(0, 6).map((s, i) => ({
        name: s,
        price: 120 + ((seed + i * 11) % 9) * 60,
        desc: "Made fresh to order with ingredients we buy every morning.",
        image: product[i] ?? gallery[i] ?? "",
        tag: i === 0 ? "Chef's pick" : i === 1 ? "Bestseller" : undefined,
      })),
    } as Section);
    // "Today's highlights" strip so food pages always lead with their dishes
    sections.splice(2, 0, {
      type: "showcase",
      kind: "packages",
      title: "Today's highlights",
      sub: `Most-ordered plates at our ${city} kitchen this week.`,
      items: svc.slice(0, 3).map((s, i) => ({
        title: s,
        meta: i === 0 ? "Chef's pick" : `₹${120 + ((seed + i * 7) % 9) * 60} onwards`,
        desc: "Cooked to order, packed hot and delivered fast.",
        image: product[i + 1] ?? gallery[i] ?? "",
        cta: "Order on WhatsApp",
        link: "whatsapp",
      })),
    } as Section);
  }

  if (wantsPortfolio) {
    sections.splice(3, 0, {
      type: "portfolio",
      title: "Selected work",
      sub: "A small window into recent projects.",
      design: index % 3 === 0 ? "editorial" : index % 3 === 1 ? "mosaic" : "index",
      items: gallery.slice(0, 5).map((img, i) => ({
        title: svc[i % svc.length] as string,
        meta: city,
        year: String(2023 + (i % 3)),
        desc: "Shot, styled and delivered by our in-house team.",
        image: img,
        tags: [entry.name, city],
      })),
    } as Section);
  }

  if (wantsPricing) {
    const base = 999 + (seed % 8) * 500;
    sections.splice(4, 0, {
      type: "pricing",
      title: entry.booking === "enrollment" ? "Batches & fees" : "Simple, honest pricing",
      sub: "No hidden charges — what you see is what you pay.",
      plans: [
        { name: "Starter", price: `₹${base}`, period: entry.booking === "enrollment" ? "/month" : "", features: svc.slice(0, 3), cta: "Enquire", link: "whatsapp" },
        { name: "Popular", price: `₹${base * 2}`, period: entry.booking === "enrollment" ? "/month" : "", features: svc.slice(0, 5), featured: true, cta: "Book now", link: "whatsapp" },
        { name: "Premium", price: `₹${base * 4}`, period: entry.booking === "enrollment" ? "/month" : "", features: svc.slice(0, 6), cta: "Talk to us", link: "whatsapp" },
      ],
    } as Section);
  }

  if (entry.family === "trust" || entry.family === "wellness") {
    sections.splice(5, 0, {
      type: "team",
      title: "Meet the team",
      items: [
        { name: "Dr. Anjali Verma", role: `Lead — ${entry.name}`, image: team[0] ?? "" },
        { name: "Rohit Kulkarni", role: "Senior specialist", image: team[1] ?? "" },
        { name: "Sneha Nair", role: "Care coordinator", image: team[2] ?? "" },
      ],
    } as Section);
  }


  const content: SiteContent = {
    archetype: categorySlug,
    brand: {
      name,
      tagline: `${entry.name} in ${city}`,
      primary: v.primary,
      secondary: v.secondary,
      accent: v.accent,
      theme: v.theme,
      layout: v.layout as SiteContent["brand"]["layout"],
      whatsapp: "+919876543210",
      email: `hello@${categorySlug.replace(/-/g, "")}.in`,
      phone: "+91 98765 43210",
      address: `${city}, India`,
      currency: "₹",
      bg_image: hero[1] ?? hero[0] ?? "",
      bg_overlay: 0.55,
      socials: { instagram: "https://instagram.com", facebook: "https://facebook.com" },
    },
    sections: orderSections(sections, v.order),
  };
  return content;
}
