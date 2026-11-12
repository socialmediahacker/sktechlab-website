import { hdImage } from "@/lib/site-renderer/hd-images";
import { ikUrl } from "@/lib/images/imagekit";
import { CATALOG_BY_SLUG } from "@/lib/categories/catalog";
import { categoryPack } from "@/lib/images/category-packs";
import { hashSeed } from "@/lib/design/variant";
// Curated stable HD Unsplash photo IDs per category slug.
// source.unsplash.com is deprecated; using direct images.unsplash.com URLs.
const PHOTOS: Record<string, string> = {
  restaurant: "photo-1517248135467-4c7edcad34c4",
  cafe: "photo-1445116572660-236099ec97a0",
  bakery: "photo-1509440159596-0249088772ff",
  gym: "photo-1534438327276-14e5300c3a48",
  fitness: "photo-1517836357463-d25dfeac3438",
  yoga: "photo-1518611012118-696072aa579a",
  salon: "photo-1560066984-138dadb4c035",
  spa: "photo-1544161515-4ab6ce6db874",
  clinic: "photo-1519494026892-80bbd2d6fd0d",
  hospital: "photo-1586773860418-d37222d8fce3",
  dental: "photo-1606811971618-4486d14f3f99",
  doctor: "photo-1631217868264-e5b90bb7e133",
  "doctor-clinic": "photo-1631217868264-e5b90bb7e133",
  fashion: "photo-1490481651871-ab68de25d43d",
  jewellery: "photo-1515562141207-7a88fb7ce338",
  jewelry: "photo-1515562141207-7a88fb7ce338",
  electronics: "photo-1550009158-9ebf69173e03",
  mobile: "photo-1512499617640-c74ae3a79d37",
  grocery: "photo-1542838132-92c53300491e",
  bookstore: "photo-1521587760476-6c12a4b040da",
  furniture: "photo-1555041469-a586c61ea9bc",
  hotel: "photo-1566073771259-6a8506099945",
  travel: "photo-1476514525535-07fb3b4ae5f1",
  photography: "photo-1502920917128-1aa500764cbd",
  portfolio: "photo-1499750310107-5fef28a66643",
  agency: "photo-1497366216548-37526070297c",
  business: "photo-1497366811353-6870744d04b2",
  law: "photo-1589829545856-d10d557cf95f",
  realestate: "photo-1560518883-ce09059eeffa",
  "real-estate": "photo-1560518883-ce09059eeffa",
  construction: "photo-1541888946425-d81bb19240f5",
  interior: "photo-1618221195710-dd6b41faaea6",
  event: "photo-1519741497674-611481863552",
  wedding: "photo-1519741497674-611481863552",
  "wedding-events": "photo-1519741497674-611481863552",
  mehndi: "photo-1595397551090-1d3f38ee8a56",
  music: "photo-1511671782779-c97d3d27a1d4",
  school: "photo-1580582932707-520aed937b7b",
  education: "photo-1503676260728-1c00da094a0b",
  coaching: "photo-1522202176988-66273c2fd55f",
  college: "photo-1541339907198-e08756dedf3f",
  church: "photo-1445445290350-c1b0143b1665",
  temple: "photo-1524492412937-b28074a5d7da",
  ngo: "photo-1488521787991-ed7bbaae773c",
  automotive: "photo-1503376780353-7e6692767b70",
  bike: "photo-1558981806-ec527fa84c39",
  pet: "photo-1450778869180-41d0601e046e",
  florist: "photo-1487530811176-3780de880c2d",
  ecommerce: "photo-1607082348824-0a96f2a4b9da",
  "e-commerce": "photo-1607082348824-0a96f2a4b9da",
  shop: "photo-1607082348824-0a96f2a4b9da",
  saas: "photo-1551288049-bebda4e38f71",
  app: "photo-1512941937669-90a1b58e7e9c",
  blog: "photo-1499750310107-5fef28a66643",
  marketing: "photo-1533750349088-cd871a92f312",
  "marketing-agency": "photo-1533750349088-cd871a92f312",
};

const FALLBACK = "photo-1497366811353-6870744d04b2"; // generic business

export function categoryThumb(slug: string, name?: string): string {
  const key = (slug ?? "").trim().toLowerCase().replace(/\s+/g, "-");
  const aliases: Record<string, string> = { "gym-trainer": "gym", dentist: "dental", "doctor-clinic": "doctor", "kirana": "grocery", "mehndi-art": "mehndi", "coaching-center": "coaching" };
  const pack = CATALOG_BY_SLUG[key]?.pack;
  if (name) {
    return hdImage(key, name, 1200);
  }
  const id = PHOTOS[key] ?? PHOTOS[aliases[key] ?? ""] ?? PHOTOS[aliases[pack ?? ""] ?? pack ?? ""] ?? FALLBACK;
  return ikUrl(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1200&q=80`, { w: 1200 });
}
