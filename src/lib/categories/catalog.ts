/**
 * Master category catalogue for the Indian local-business market.
 *
 * One entry describes everything the platform needs about a business type:
 * its design family, the photo pack it borrows images from, its signature
 * services, sub-categories and the words customers actually type when they
 * search for it. Used by:
 *  - the admin "Category Studio" (create categories + generate demos)
 *  - the demo content generator (unique copy per category)
 *  - the builder wizard's smart category search
 */

import { LEGACY_CATALOG } from "./legacy-catalog";

export type OrderFamily =

  | "food"
  | "service"
  | "shop"
  | "visual"
  | "trust"
  | "stay"
  | "wellness"
  | "saas";

export type ShowcaseKind =
  | "rooms"
  | "listings"
  | "projects"
  | "programs"
  | "courses"
  | "services"
  | "packages";

export type BookingMode = "reservation" | "appointment" | "enrollment" | "inquiry" | "booking";

export type CatalogEntry = {
  slug: string;
  name: string;
  icon: string;
  family: OrderFamily;
  /** Photo pack slug this category borrows verified images from. */
  pack: string;
  layouts: string[];
  theme: "light" | "dark";
  /** Palette keys resolved in category-profiles.ts */
  palettes: string[];
  showcase: ShowcaseKind;
  booking: BookingMode;
  /** Signature offerings — become features / showcase / pricing copy. */
  services: string[];
  subs: string[];
  synonyms: string[];
  /** Product-led business (menu / store sections make sense). */
  commerce?: boolean;
};

const e = (x: CatalogEntry): CatalogEntry => x;

/** Categories added on top of the original 55 — Indian market coverage. */
export const CATEGORY_CATALOG: CatalogEntry[] = [
  /* ---------------- Health & medical ---------------- */
  e({ slug: "hospital", name: "Hospital & Multispeciality", icon: "Hospital", family: "trust", pack: "doctor",
    layouts: ["prism", "cinematic"], theme: "light", palettes: ["ocean", "cyan"], showcase: "services", booking: "appointment",
    services: ["24x7 emergency care", "Multispeciality OPD", "Modular operation theatres", "Advanced diagnostics", "Cashless insurance desk", "Ambulance on call"],
    subs: ["Emergency", "Departments", "Health packages"],
    synonyms: ["hospital", "multispeciality", "nursing home", "medical centre", "aspatal"] }),
  e({ slug: "pharmacy", name: "Pharmacy & Medical Store", icon: "Pill", family: "shop", pack: "kirana",
    layouts: ["bento"], theme: "light", palettes: ["emerald", "cyan"], showcase: "services", booking: "inquiry", commerce: true,
    services: ["Genuine branded medicines", "Home delivery in 30 minutes", "Monthly refill reminders", "Ayurvedic & wellness range", "Baby and mother care", "Health devices on rent"],
    subs: ["Medicines", "Wellness", "Devices"],
    synonyms: ["pharmacy", "chemist", "medical store", "davai", "drug store"] }),
  e({ slug: "pathology-lab", name: "Pathology Lab & Diagnostics", icon: "TestTube", family: "trust", pack: "dentist",
    layouts: ["prism"], theme: "light", palettes: ["cyan", "ocean"], showcase: "packages", booking: "appointment",
    services: ["Home sample collection", "NABL-grade reporting", "Full body health packages", "Digital reports in 12 hours", "Thyroid & diabetes profiles", "Corporate health camps"],
    subs: ["Tests", "Packages", "Home collection"],
    synonyms: ["lab", "pathology", "diagnostic", "blood test", "scan centre"] }),
  e({ slug: "physiotherapy", name: "Physiotherapy Clinic", icon: "Activity", family: "wellness", pack: "gym-trainer",
    layouts: ["cinematic", "prism"], theme: "light", palettes: ["cyan", "emerald"], showcase: "programs", booking: "appointment",
    services: ["Sports injury rehab", "Post-surgery recovery", "Back & neck pain therapy", "Home physiotherapy visits", "Dry needling & cupping", "Posture correction plans"],
    subs: ["Conditions", "Home visit", "Packages"],
    synonyms: ["physio", "physiotherapy", "rehab", "pain clinic"] }),
  e({ slug: "ayurveda", name: "Ayurveda & Panchakarma", icon: "Leaf", family: "wellness", pack: "yoga",
    layouts: ["boutique", "cinematic"], theme: "light", palettes: ["emerald", "amber"], showcase: "packages", booking: "appointment",
    services: ["Classical Panchakarma", "Nadi pariksha consultation", "Herbal medicine dispensary", "Weight & lifestyle programs", "Abhyanga & Shirodhara", "Chronic care therapy"],
    subs: ["Therapies", "Consultation", "Medicines"],
    synonyms: ["ayurveda", "ayurvedic", "panchakarma", "vaid", "herbal clinic"] }),
  e({ slug: "veterinary", name: "Veterinary Clinic", icon: "PawPrint", family: "trust", pack: "pet",
    layouts: ["bento", "prism"], theme: "light", palettes: ["emerald", "amber"], showcase: "services", booking: "appointment",
    services: ["Pet vaccination schedules", "Surgery & dental care", "Emergency pet ambulance", "Nutrition counselling", "Grooming & boarding", "Pet travel certificates"],
    subs: ["Treatments", "Vaccination", "Grooming"],
    synonyms: ["vet", "veterinary", "pet doctor", "animal hospital"] }),
  e({ slug: "eye-clinic", name: "Eye Clinic & Optical", icon: "Eye", family: "trust", pack: "dentist",
    layouts: ["prism", "bento"], theme: "light", palettes: ["ocean", "violet"], showcase: "services", booking: "appointment", commerce: true,
    services: ["Cataract & LASIK surgery", "Free eye check-up camps", "Designer frames & lenses", "Contact lens fitting", "Retina & glaucoma care", "Kids vision screening"],
    subs: ["Surgery", "Eyewear", "Check-up"],
    synonyms: ["eye", "optical", "chashma", "spectacles", "lasik", "netra"] }),
  e({ slug: "dietician", name: "Dietician & Nutrition", icon: "Salad", family: "wellness", pack: "yoga",
    layouts: ["boutique", "bento"], theme: "light", palettes: ["lime", "emerald"], showcase: "programs", booking: "appointment",
    services: ["Personalised diet charts", "PCOS & thyroid nutrition", "Diabetes reversal plan", "Weekly progress tracking", "Indian home-food based plans", "Corporate wellness talks"],
    subs: ["Programs", "Consultation", "Results"],
    synonyms: ["dietician", "nutritionist", "diet", "weight loss", "nutrition"] }),

  /* ---------------- Beauty & wellness ---------------- */
  e({ slug: "spa", name: "Spa & Wellness Retreat", icon: "Flower2", family: "wellness", pack: "salon",
    layouts: ["boutique", "cinematic"], theme: "light", palettes: ["emerald", "gold"], showcase: "packages", booking: "appointment",
    services: ["Balinese & Swedish massage", "Couple spa suites", "Aroma steam & sauna", "Body polishing rituals", "Foot reflexology", "Membership packages"],
    subs: ["Therapies", "Couple spa", "Memberships"],
    synonyms: ["spa", "massage", "body spa", "wellness centre", "malish"] }),
  e({ slug: "nail-studio", name: "Nail Studio", icon: "Hand", family: "wellness", pack: "makeup",
    layouts: ["boutique", "neon"], theme: "dark", palettes: ["rose", "violet"], showcase: "packages", booking: "appointment",
    services: ["Gel & acrylic extensions", "Hand-painted nail art", "Russian manicure", "Pedicure spa rituals", "Bridal nail sets", "Nail repair & refill"],
    subs: ["Nail art", "Extensions", "Pedicure"],
    synonyms: ["nail", "manicure", "pedicure", "nail art"] }),
  e({ slug: "skin-clinic", name: "Skin & Hair Clinic", icon: "Sparkles", family: "wellness", pack: "salon",
    layouts: ["prism", "boutique"], theme: "light", palettes: ["rose", "cyan"], showcase: "services", booking: "appointment",
    services: ["Laser hair reduction", "Acne & pigmentation care", "Hair transplant (FUE)", "HydraFacial & peels", "Anti-ageing treatments", "Dermatologist consultation"],
    subs: ["Skin", "Hair", "Laser"],
    synonyms: ["skin", "derma", "dermatologist", "hair transplant", "laser"] }),

  /* ---------------- Food ---------------- */
  e({ slug: "sweet-shop", name: "Sweet Shop & Namkeen", icon: "Candy", family: "food", pack: "cafe",
    layouts: ["boutique", "editorial"], theme: "light", palettes: ["amber", "crimson"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Fresh desi ghee mithai", "Festival gift hampers", "Bulk wedding orders", "Sugar-free range", "Hot namkeen counter", "Pan-India courier"],
    subs: ["Mithai", "Namkeen", "Gift boxes"],
    synonyms: ["sweet", "mithai", "halwai", "namkeen", "bakery sweets"] }),
  e({ slug: "dhaba", name: "Dhaba & Family Restaurant", icon: "UtensilsCrossed", family: "food", pack: "restaurant",
    layouts: ["editorial", "brutal"], theme: "dark", palettes: ["crimson", "amber"], showcase: "services", booking: "reservation", commerce: true,
    services: ["Tandoor fresh rotis", "Highway parking & family cabins", "Pure veg thali", "Late night service", "Party & group bookings", "Takeaway and delivery"],
    subs: ["Menu", "Thali", "Party orders"],
    synonyms: ["dhaba", "family restaurant", "thali", "highway food", "punjabi"] }),
  e({ slug: "cloud-kitchen", name: "Cloud Kitchen", icon: "ChefHat", family: "food", pack: "restaurant",
    layouts: ["bento", "neon"], theme: "dark", palettes: ["crimson", "violet"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["30-minute delivery promise", "Multi-cuisine menus", "Hygiene-first kitchen", "Combo meal boxes", "Corporate lunch subscriptions", "Live order tracking"],
    subs: ["Menu", "Combos", "Subscription"],
    synonyms: ["cloud kitchen", "delivery kitchen", "online food", "tiffin delivery"] }),
  e({ slug: "juice-bar", name: "Juice & Shake Bar", icon: "CupSoda", family: "food", pack: "cafe",
    layouts: ["bento", "boutique"], theme: "light", palettes: ["lime", "amber"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Cold-pressed daily juices", "Protein & gym shakes", "Seasonal fruit bowls", "Detox subscription packs", "No added sugar options", "Gym tie-up plans"],
    subs: ["Juices", "Shakes", "Detox"],
    synonyms: ["juice", "shake", "smoothie", "juice corner"] }),
  e({ slug: "ice-cream", name: "Ice Cream & Dessert Parlour", icon: "IceCream", family: "food", pack: "cafe",
    layouts: ["bento", "boutique"], theme: "light", palettes: ["rose", "cyan"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Handmade gelato", "Sundae & waffle counter", "Party ice-cream tubs", "Live rolled ice cream", "Vegan and low-sugar", "Franchise enquiries"],
    subs: ["Flavours", "Sundaes", "Party packs"],
    synonyms: ["ice cream", "dessert", "gelato", "waffle", "parlour"] }),

  /* ---------------- Shops & retail ---------------- */
  e({ slug: "mobile-shop", name: "Mobile & Gadget Store", icon: "Smartphone", family: "shop", pack: "ecommerce",
    layouts: ["bento", "neon"], theme: "dark", palettes: ["ocean", "violet"], showcase: "services", booking: "inquiry", commerce: true,
    services: ["Latest smartphones in stock", "Exchange & EMI offers", "Genuine accessories", "Screen & battery repair", "Doorstep activation", "Extended warranty plans"],
    subs: ["Phones", "Accessories", "Repair"],
    synonyms: ["mobile", "phone", "smartphone", "gadget", "mobile shop"] }),
  e({ slug: "electronics-store", name: "Electronics & Appliances", icon: "Tv", family: "shop", pack: "ecommerce",
    layouts: ["bento", "prism"], theme: "light", palettes: ["ocean", "slate"], showcase: "services", booking: "inquiry", commerce: true,
    services: ["TV, AC, fridge & washing machine", "Zero-cost EMI", "Same-day installation", "Old appliance exchange", "Brand warranty support", "Bulk institutional supply"],
    subs: ["Appliances", "Offers", "Service"],
    synonyms: ["electronics", "appliance", "tv", "fridge", "ac shop"] }),
  e({ slug: "furniture-store", name: "Furniture Store", icon: "Armchair", family: "shop", pack: "interior",
    layouts: ["editorial", "bento"], theme: "light", palettes: ["clay", "gold"], showcase: "projects", booking: "inquiry", commerce: true,
    services: ["Solid wood collections", "Custom modular furniture", "Sofa & mattress studio", "Free home delivery", "3D room visualisation", "10-year warranty"],
    subs: ["Living", "Bedroom", "Office"],
    synonyms: ["furniture", "sofa", "bed", "wooden", "modular"] }),
  e({ slug: "hardware-store", name: "Hardware & Sanitary", icon: "Hammer", family: "shop", pack: "construction",
    layouts: ["brutal", "bento"], theme: "light", palettes: ["amber", "slate"], showcase: "services", booking: "inquiry", commerce: true,
    services: ["Cement, steel & tiles", "Sanitary & CP fittings", "Paints and hardware", "Site delivery within 24h", "Contractor credit accounts", "Bulk project pricing"],
    subs: ["Building material", "Sanitary", "Tools"],
    synonyms: ["hardware", "sanitary", "cement", "tiles", "building material"] }),
  e({ slug: "gift-shop", name: "Gift & Novelty Shop", icon: "Gift", family: "shop", pack: "boutique",
    layouts: ["bento", "boutique"], theme: "light", palettes: ["rose", "violet"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Personalised photo gifts", "Corporate gifting kits", "Same-day city delivery", "Festival hampers", "Customised mugs & frames", "Gift wrapping included"],
    subs: ["Personalised", "Corporate", "Hampers"],
    synonyms: ["gift", "gifting", "novelty", "hamper", "customised gift"] }),
  e({ slug: "stationery", name: "Stationery & Book Store", icon: "NotebookPen", family: "shop", pack: "education",
    layouts: ["bento", "editorial"], theme: "light", palettes: ["ocean", "amber"], showcase: "services", booking: "inquiry", commerce: true,
    services: ["School & office stationery", "Competitive exam books", "Bulk school supply", "Printing & photocopy", "Art & craft corner", "Doorstep delivery"],
    subs: ["Stationery", "Books", "Printing"],
    synonyms: ["stationery", "book", "copy", "school supply", "photocopy"] }),
  e({ slug: "toy-store", name: "Toy & Kids Store", icon: "ToyBrick", family: "shop", pack: "pet",
    layouts: ["bento", "boutique"], theme: "light", palettes: ["amber", "cyan"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Learning & STEM toys", "Age-wise collections", "Birthday party packs", "Certified safe materials", "Ride-ons & outdoor play", "Gift wrapping free"],
    subs: ["Toys", "Learning", "Party"],
    synonyms: ["toy", "kids", "children store", "baby shop"] }),
  e({ slug: "footwear", name: "Footwear Store", icon: "Footprints", family: "shop", pack: "fashion",
    layouts: ["bento", "noirgold"], theme: "light", palettes: ["clay", "ink"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Sports & running shoes", "Ethnic and formal footwear", "Kids school shoes", "Genuine leather range", "Easy size exchange", "Seasonal end-of-line offers"],
    subs: ["Men", "Women", "Kids"],
    synonyms: ["footwear", "shoes", "chappal", "sandal", "sneaker"] }),
  e({ slug: "optical-store", name: "Optical Store", icon: "Glasses", family: "shop", pack: "fashion",
    layouts: ["bento", "prism"], theme: "light", palettes: ["ocean", "ink"], showcase: "packages", booking: "appointment", commerce: true,
    services: ["Free computerised eye test", "Branded frames & sunglasses", "Blue-cut and progressive lenses", "Contact lens solutions", "One-hour lens fitting", "Kids frames with warranty"],
    subs: ["Frames", "Lenses", "Sunglasses"],
    synonyms: ["optical", "chashma", "sunglasses", "spectacles", "frames"] }),
  e({ slug: "agriculture", name: "Agri & Seeds Store", icon: "Sprout", family: "shop", pack: "kirana",
    layouts: ["bento", "editorial"], theme: "light", palettes: ["lime", "emerald"], showcase: "services", booking: "inquiry", commerce: true,
    services: ["Certified hybrid seeds", "Fertilisers & pesticides", "Drip irrigation setup", "Soil testing support", "Farm equipment on rent", "Crop advisory helpline"],
    subs: ["Seeds", "Equipment", "Advisory"],
    synonyms: ["agriculture", "seeds", "khad", "farm", "kisan", "krishi"] }),

  /* ---------------- Home & local services ---------------- */
  e({ slug: "electrician", name: "Electrician Service", icon: "Zap", family: "service", pack: "cleaning",
    layouts: ["bento", "brutal"], theme: "light", palettes: ["amber", "slate"], showcase: "services", booking: "booking",
    services: ["Same-day fault repair", "Full house wiring", "Inverter & UPS setup", "Fan, light & switch fitting", "MCB and earthing work", "Annual maintenance contracts"],
    subs: ["Repair", "Wiring", "AMC"],
    synonyms: ["electrician", "wiring", "bijli", "electric repair"] }),
  e({ slug: "plumber", name: "Plumbing Service", icon: "Wrench", family: "service", pack: "cleaning",
    layouts: ["bento", "brutal"], theme: "light", palettes: ["ocean", "cyan"], showcase: "services", booking: "booking",
    services: ["Leak detection & repair", "Bathroom fitting installation", "Water tank cleaning", "Motor and pump service", "Drain unclogging", "Emergency 24x7 visits"],
    subs: ["Repair", "Installation", "Emergency"],
    synonyms: ["plumber", "plumbing", "nal", "leakage", "bathroom fitting"] }),
  e({ slug: "carpenter", name: "Carpenter & Woodwork", icon: "Hammer", family: "service", pack: "interior",
    layouts: ["editorial", "brutal"], theme: "light", palettes: ["clay", "amber"], showcase: "projects", booking: "inquiry",
    services: ["Modular kitchen woodwork", "Custom wardrobes", "Door & window repair", "Furniture polishing", "Office cabin interiors", "On-site measurement visit"],
    subs: ["Modular", "Repair", "Custom"],
    synonyms: ["carpenter", "wood", "badhai", "furniture work", "modular kitchen"] }),
  e({ slug: "ac-repair", name: "AC & Appliance Repair", icon: "Fan", family: "service", pack: "cleaning",
    layouts: ["bento", "prism"], theme: "light", palettes: ["cyan", "ocean"], showcase: "services", booking: "booking",
    services: ["AC jet service & gas filling", "Fridge and washing machine repair", "Split AC installation", "Genuine spare parts", "Same-day technician visit", "Yearly service plans"],
    subs: ["AC", "Appliances", "AMC"],
    synonyms: ["ac repair", "ac service", "fridge repair", "washing machine", "cooling"] }),
  e({ slug: "mobile-repair", name: "Mobile Repair Lab", icon: "Smartphone", family: "service", pack: "ecommerce",
    layouts: ["neon", "bento"], theme: "dark", palettes: ["violet", "ocean"], showcase: "services", booking: "booking",
    services: ["Screen replacement in 45 min", "Battery & charging port fix", "Water damage recovery", "Software & data recovery", "Doorstep pickup and drop", "6-month repair warranty"],
    subs: ["Screen", "Battery", "Software"],
    synonyms: ["mobile repair", "phone repair", "screen", "battery", "service centre"] }),
  e({ slug: "laundry", name: "Laundry & Dry Cleaning", icon: "Shirt", family: "service", pack: "cleaning",
    layouts: ["bento", "prism"], theme: "light", palettes: ["cyan", "emerald"], showcase: "packages", booking: "booking", commerce: true,
    services: ["Free pickup and delivery", "Premium dry cleaning", "Steam press subscription", "Shoe & bag cleaning", "Curtain and sofa care", "48-hour turnaround"],
    subs: ["Dry clean", "Wash & fold", "Subscription"],
    synonyms: ["laundry", "dry clean", "dhobi", "ironing", "press"] }),
  e({ slug: "tailor", name: "Tailor & Boutique Stitching", icon: "Scissors", family: "service", pack: "boutique",
    layouts: ["boutique", "editorial"], theme: "light", palettes: ["rose", "gold"], showcase: "packages", booking: "appointment",
    services: ["Bridal lehenga stitching", "Suit & blouse tailoring", "Home measurement visit", "Alteration and fall-pico", "Designer fabric sourcing", "Express festive delivery"],
    subs: ["Ladies", "Gents", "Bridal"],
    synonyms: ["tailor", "darzi", "stitching", "silai", "boutique tailor"] }),
  e({ slug: "pest-control", name: "Pest Control", icon: "Bug", family: "service", pack: "cleaning",
    layouts: ["brutal", "bento"], theme: "light", palettes: ["lime", "slate"], showcase: "services", booking: "booking",
    services: ["Cockroach & ant gel treatment", "Termite pre & post construction", "Bed bug heat treatment", "Mosquito fogging", "Rodent control", "Odourless child-safe chemicals"],
    subs: ["Home", "Commercial", "Termite"],
    synonyms: ["pest", "termite", "cockroach", "pest control", "keeda"] }),
  e({ slug: "cctv-security", name: "CCTV & Security Systems", icon: "Cctv", family: "service", pack: "consulting",
    layouts: ["neon", "brutal"], theme: "dark", palettes: ["slate", "cyan"], showcase: "services", booking: "inquiry",
    services: ["HD & IP camera installation", "Mobile live view setup", "Biometric attendance", "Video door phones", "Fire alarm integration", "AMC and remote support"],
    subs: ["CCTV", "Access control", "AMC"],
    synonyms: ["cctv", "camera", "security", "biometric", "surveillance"] }),
  e({ slug: "solar", name: "Solar Energy Solutions", icon: "Sun", family: "service", pack: "construction",
    layouts: ["prism", "bento"], theme: "light", palettes: ["amber", "emerald"], showcase: "projects", booking: "inquiry",
    services: ["Rooftop solar installation", "Government subsidy paperwork", "Net metering support", "Solar water heaters", "Commercial solar plants", "25-year panel warranty"],
    subs: ["Residential", "Commercial", "Subsidy"],
    synonyms: ["solar", "panel", "renewable", "rooftop solar", "green energy"] }),
  e({ slug: "borewell", name: "Borewell & Water Works", icon: "Droplets", family: "service", pack: "construction",
    layouts: ["brutal"], theme: "light", palettes: ["ocean", "slate"], showcase: "services", booking: "inquiry",
    services: ["Borewell drilling", "Submersible pump fitting", "Water level survey", "Rainwater harvesting", "Pipeline laying", "Emergency repair crew"],
    subs: ["Drilling", "Pumps", "Repair"],
    synonyms: ["borewell", "boring", "water", "submersible", "tubewell"] }),
  e({ slug: "printing-press", name: "Printing Press", icon: "Printer", family: "service", pack: "digital-agency",
    layouts: ["bento", "brutal"], theme: "light", palettes: ["violet", "amber"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["Wedding card printing", "Visiting cards & letterheads", "Flex banners and standees", "Bulk brochure printing", "Custom packaging boxes", "Same-day urgent jobs"],
    subs: ["Cards", "Banners", "Packaging"],
    synonyms: ["printing", "press", "flex", "banner", "visiting card", "chapai"] }),
  e({ slug: "courier", name: "Courier & Logistics", icon: "Truck", family: "service", pack: "packers-movers",
    layouts: ["bento", "brutal"], theme: "light", palettes: ["ocean", "amber"], showcase: "services", booking: "booking",
    services: ["Domestic & international courier", "Doorstep pickup", "Live shipment tracking", "Bulk ecommerce shipping", "Cash on delivery remittance", "Fragile-safe packing"],
    subs: ["Domestic", "International", "Ecommerce"],
    synonyms: ["courier", "logistics", "parcel", "shipping", "delivery service"] }),

  /* ---------------- Automotive & travel ---------------- */
  e({ slug: "car-rental", name: "Car Rental & Taxi", icon: "Car", family: "stay", pack: "travel",
    layouts: ["cinematic", "bento"], theme: "dark", palettes: ["slate", "amber"], showcase: "packages", booking: "booking",
    services: ["Self-drive and chauffeur cars", "Airport pickup & drop", "Outstation packages", "Tempo traveller for groups", "Monthly corporate rentals", "Sanitised, GPS-tracked fleet"],
    subs: ["Self drive", "Outstation", "Corporate"],
    synonyms: ["car rental", "taxi", "cab", "self drive", "gaadi", "tempo traveller"] }),
  e({ slug: "bike-showroom", name: "Bike Showroom", icon: "Bike", family: "shop", pack: "automotive",
    layouts: ["neon", "brutal"], theme: "dark", palettes: ["crimson", "ink"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["New bike & scooter models", "Easy finance in 30 minutes", "Exchange your old bike", "Genuine spares & accessories", "Free first 3 services", "Insurance and RTO desk"],
    subs: ["Bikes", "Scooters", "Service"],
    synonyms: ["bike", "scooter", "two wheeler", "motorcycle", "showroom"] }),
  e({ slug: "car-dealer", name: "Car Showroom & Used Cars", icon: "Car", family: "shop", pack: "automotive",
    layouts: ["cinematic", "bento"], theme: "dark", palettes: ["slate", "gold"], showcase: "listings", booking: "inquiry", commerce: true,
    services: ["Certified pre-owned cars", "New car bookings", "Loan up to 90% on-road", "Free RC transfer support", "200-point inspection", "Exchange best value"],
    subs: ["New cars", "Used cars", "Finance"],
    synonyms: ["car showroom", "used car", "second hand car", "car dealer", "gaadi"] }),
  e({ slug: "car-wash", name: "Car Wash & Detailing", icon: "Droplets", family: "service", pack: "automotive",
    layouts: ["neon", "bento"], theme: "dark", palettes: ["cyan", "ink"], showcase: "packages", booking: "booking",
    services: ["Foam wash & underbody clean", "Ceramic coating", "Interior deep detailing", "Teflon & rubbing polish", "Doorstep car spa", "Monthly wash memberships"],
    subs: ["Wash", "Detailing", "Coating"],
    synonyms: ["car wash", "detailing", "polish", "car spa", "ceramic coating"] }),
  e({ slug: "auto-garage", name: "Auto Garage & Service", icon: "Wrench", family: "service", pack: "automotive",
    layouts: ["brutal", "neon"], theme: "dark", palettes: ["amber", "ink"], showcase: "services", booking: "booking",
    services: ["Periodic car servicing", "Engine & clutch overhaul", "Denting and painting", "Computerised wheel alignment", "Pickup and drop facility", "Insurance claim assistance"],
    subs: ["Service", "Body shop", "Spares"],
    synonyms: ["garage", "car service", "mechanic", "denting", "workshop"] }),
  e({ slug: "tyre-shop", name: "Tyre & Battery Shop", icon: "CircleDot", family: "shop", pack: "automotive",
    layouts: ["brutal", "bento"], theme: "dark", palettes: ["ink", "amber"], showcase: "packages", booking: "inquiry", commerce: true,
    services: ["All brand tyres in stock", "Free nitrogen filling", "Battery with buy-back", "Wheel balancing & alignment", "Roadside puncture help", "Fitment while you wait"],
    subs: ["Tyres", "Batteries", "Alignment"],
    synonyms: ["tyre", "battery", "puncture", "wheel", "alignment"] }),
  e({ slug: "travel-agency", name: "Travel Agency & Ticketing", icon: "Plane", family: "stay", pack: "travel",
    layouts: ["cinematic", "bento"], theme: "light", palettes: ["ocean", "amber"], showcase: "packages", booking: "booking",
    services: ["Flight & train ticketing", "Visa and passport assistance", "Honeymoon packages", "Char Dham & pilgrimage tours", "Hotel booking worldwide", "Group tour management"],
    subs: ["Packages", "Visa", "Ticketing"],
    synonyms: ["travel agency", "tour and travels", "ticket", "visa", "yatra", "holiday"] }),
  e({ slug: "bus-operator", name: "Bus & Tempo Operator", icon: "Bus", family: "stay", pack: "travel",
    layouts: ["bento", "brutal"], theme: "light", palettes: ["amber", "slate"], showcase: "packages", booking: "booking",
    services: ["AC sleeper coaches", "School & staff transport", "Wedding baraat buses", "Pilgrimage group travel", "GPS tracked fleet", "Verified experienced drivers"],
    subs: ["Routes", "Hire", "Fleet"],
    synonyms: ["bus", "tempo", "coach", "transport", "travels bus"] }),

  /* ---------------- Education ---------------- */
  e({ slug: "school", name: "School", icon: "School", family: "trust", pack: "education",
    layouts: ["editorial", "prism"], theme: "light", palettes: ["ocean", "amber"], showcase: "courses", booking: "enrollment",
    services: ["CBSE curriculum", "Smart classrooms", "Sports & music academy", "Safe GPS school transport", "Experienced faculty", "Scholarship programs"],
    subs: ["Admissions", "Academics", "Campus"],
    synonyms: ["school", "vidyalaya", "cbse", "public school", "admission"] }),
  e({ slug: "college", name: "College & Institute", icon: "GraduationCap", family: "trust", pack: "education",
    layouts: ["editorial", "prism"], theme: "light", palettes: ["slate", "ocean"], showcase: "courses", booking: "enrollment",
    services: ["UG & PG programmes", "Placement cell support", "Industry-led curriculum", "Hostel and campus life", "Research laboratories", "Scholarships & aid"],
    subs: ["Courses", "Placements", "Campus"],
    synonyms: ["college", "institute", "university", "degree", "mahavidyalaya"] }),
  e({ slug: "computer-institute", name: "Computer & Skill Institute", icon: "Laptop", family: "trust", pack: "coaching-center",
    layouts: ["prism", "bento"], theme: "light", palettes: ["violet", "cyan"], showcase: "courses", booking: "enrollment",
    services: ["Tally & accounting courses", "Digital marketing training", "Coding & web development", "Government-recognised certificates", "Placement assistance", "Weekend batches"],
    subs: ["Courses", "Certification", "Placement"],
    synonyms: ["computer classes", "institute", "tally", "coding", "typing", "training"] }),
  e({ slug: "dance-academy", name: "Dance & Music Academy", icon: "Music2", family: "visual", pack: "music",
    layouts: ["neon", "cinematic"], theme: "dark", palettes: ["violet", "rose"], showcase: "programs", booking: "enrollment",
    services: ["Bollywood & hip-hop batches", "Classical Kathak & Bharatnatyam", "Wedding choreography", "Vocal and instrument classes", "Annual stage showcase", "Kids summer camps"],
    subs: ["Dance", "Music", "Wedding"],
    synonyms: ["dance", "music class", "choreography", "singing", "academy"] }),
  e({ slug: "sports-academy", name: "Sports Academy", icon: "Trophy", family: "wellness", pack: "gym",
    layouts: ["brutal", "neon"], theme: "dark", palettes: ["lime", "ocean"], showcase: "programs", booking: "enrollment",
    services: ["Cricket & football coaching", "Certified coaches", "Fitness and diet support", "Tournament exposure", "Floodlit turf grounds", "Summer training camps"],
    subs: ["Programs", "Coaches", "Facilities"],
    synonyms: ["sports", "cricket", "football", "academy", "coaching ground", "turf"] }),
  e({ slug: "playschool", name: "Playschool & Daycare", icon: "Baby", family: "trust", pack: "education",
    layouts: ["bento", "boutique"], theme: "light", palettes: ["amber", "cyan"], showcase: "programs", booking: "enrollment",
    services: ["Play-way learning method", "CCTV-secured campus", "Nutritious meal plan", "Trained caregivers", "Daycare till 7 pm", "Parent app updates"],
    subs: ["Programs", "Daycare", "Safety"],
    synonyms: ["playschool", "daycare", "creche", "nursery", "kindergarten", "kids school"] }),
  e({ slug: "library", name: "Library & Study Room", icon: "BookOpen", family: "trust", pack: "education",
    layouts: ["editorial", "bento"], theme: "light", palettes: ["ink", "amber"], showcase: "packages", booking: "booking",
    services: ["AC self-study cabins", "24x7 access plans", "Competitive exam library", "High-speed Wi-Fi", "Locker & cafeteria", "Monthly membership offers"],
    subs: ["Memberships", "Facilities", "Timings"],
    synonyms: ["library", "study room", "reading room", "self study", "pustakalaya"] }),

  /* ---------------- Professional ---------------- */
  e({ slug: "architect", name: "Architect Studio", icon: "Ruler", family: "visual", pack: "interior",
    layouts: ["editorial", "brutal"], theme: "light", palettes: ["ink", "clay"], showcase: "projects", booking: "inquiry",
    services: ["Residential architecture", "3D walkthroughs", "Municipal approval drawings", "Vastu-aligned planning", "Turnkey execution", "Landscape design"],
    subs: ["Residential", "Commercial", "Approvals"],
    synonyms: ["architect", "naksha", "building design", "3d plan", "architecture"] }),
  e({ slug: "insurance-agent", name: "Insurance Advisor", icon: "ShieldCheck", family: "trust", pack: "finance",
    layouts: ["prism", "brutal"], theme: "light", palettes: ["ocean", "emerald"], showcase: "packages", booking: "appointment",
    services: ["Life & term insurance", "Health cover for family", "Motor insurance renewal", "Claim settlement support", "Tax saving plans", "Free policy review"],
    subs: ["Life", "Health", "Motor"],
    synonyms: ["insurance", "policy", "lic", "bima", "term plan", "mediclaim"] }),
  e({ slug: "loan-agent", name: "Loan & Finance Advisor", icon: "Banknote", family: "trust", pack: "finance",
    layouts: ["brutal", "prism"], theme: "light", palettes: ["emerald", "slate"], showcase: "services", booking: "appointment",
    services: ["Home & mortgage loans", "Business and MSME loans", "Personal loan in 48 hours", "Loan against property", "CIBIL improvement guidance", "Balance transfer savings"],
    subs: ["Home loan", "Business", "Personal"],
    synonyms: ["loan", "finance", "mortgage", "karza", "cibil", "emi"] }),
  e({ slug: "property-dealer", name: "Property Dealer", icon: "Building2", family: "stay", pack: "real-estate",
    layouts: ["cinematic", "bento"], theme: "light", palettes: ["slate", "gold"], showcase: "listings", booking: "inquiry",
    services: ["Verified plots & flats", "Rental and lease support", "Site visits arranged free", "Registry & paperwork help", "Investment advisory", "Builder tie-up projects"],
    subs: ["Buy", "Rent", "Plots"],
    synonyms: ["property", "plot", "flat", "makan", "zameen", "broker", "dealer"] }),
  e({ slug: "recruitment", name: "HR & Recruitment", icon: "Users", family: "trust", pack: "consulting",
    layouts: ["prism", "bento"], theme: "light", palettes: ["violet", "slate"], showcase: "services", booking: "inquiry",
    services: ["IT & non-IT hiring", "Bulk staffing drives", "Payroll & compliance", "Executive search", "Background verification", "Contract staffing"],
    subs: ["Employers", "Job seekers", "Payroll"],
    synonyms: ["recruitment", "hr", "hiring", "placement", "staffing", "naukri"] }),
  e({ slug: "it-services", name: "IT Services Company", icon: "Server", family: "saas", pack: "saas",
    layouts: ["prism", "neon"], theme: "dark", palettes: ["ocean", "violet"], showcase: "projects", booking: "inquiry",
    services: ["Custom software development", "Mobile app engineering", "Cloud migration & DevOps", "Managed IT support", "Data & AI solutions", "Dedicated offshore teams"],
    subs: ["Services", "Industries", "Case studies"],
    synonyms: ["it company", "software", "app development", "it services", "tech company"] }),
  e({ slug: "web-design", name: "Web Design Studio", icon: "MonitorSmartphone", family: "saas", pack: "digital-agency",
    layouts: ["neon", "prism"], theme: "dark", palettes: ["violet", "cyan"], showcase: "projects", booking: "inquiry",
    services: ["Business & ecommerce websites", "UI/UX design sprints", "SEO-ready development", "Speed and Core Web Vitals", "Maintenance retainers", "Brand identity design"],
    subs: ["Websites", "Ecommerce", "Branding"],
    synonyms: ["web design", "website banwana", "web development", "ui ux", "web studio"] }),
  e({ slug: "immigration", name: "Immigration & Visa Consultant", icon: "Passport", family: "trust", pack: "consulting",
    layouts: ["prism", "editorial"], theme: "light", palettes: ["ocean", "gold"], showcase: "services", booking: "appointment",
    services: ["Study visa counselling", "PR & work permits", "IELTS/PTE coaching", "Document verification", "Visa interview training", "University admissions"],
    subs: ["Study visa", "PR", "Coaching"],
    synonyms: ["visa", "immigration", "study abroad", "pr", "ielts", "consultant"] }),

  /* ---------------- Events & entertainment ---------------- */
  e({ slug: "banquet-hall", name: "Banquet Hall & Lawn", icon: "PartyPopper", family: "stay", pack: "wedding",
    layouts: ["noirgold", "cinematic"], theme: "dark", palettes: ["gold", "rose"], showcase: "packages", booking: "booking",
    services: ["AC banquet & open lawn", "In-house catering menus", "Valet and ample parking", "Bridal room & green room", "Décor and lighting partners", "Corporate conference setup"],
    subs: ["Venues", "Packages", "Catering"],
    synonyms: ["banquet", "marriage hall", "lawn", "venue", "shadi hall", "garden"] }),
  e({ slug: "dj-sound", name: "DJ & Sound Service", icon: "Disc3", family: "visual", pack: "music",
    layouts: ["neon", "cinematic"], theme: "dark", palettes: ["violet", "crimson"], showcase: "packages", booking: "booking",
    services: ["Wedding & sangeet DJ", "Line array sound systems", "Intelligent lighting & lasers", "LED wall screens", "Live band & dhol", "Corporate event audio"],
    subs: ["Weddings", "Corporate", "Equipment"],
    synonyms: ["dj", "sound", "light", "band", "baja", "music system"] }),
  e({ slug: "tent-house", name: "Tent House & Rentals", icon: "Tent", family: "service", pack: "event-decorator",
    layouts: ["boutique", "bento"], theme: "light", palettes: ["amber", "rose"], showcase: "packages", booking: "booking",
    services: ["Wedding tent & mandap setup", "Chairs, tables and crockery", "Stage and pandal decor", "Cooling and generator rental", "Themed floral decor", "End-to-end event crew"],
    subs: ["Tents", "Furniture", "Decor"],
    synonyms: ["tent house", "tent", "mandap", "shamiyana", "rental", "pandal"] }),
  e({ slug: "photo-studio", name: "Photo Studio & Lab", icon: "Camera", family: "visual", pack: "photography",
    layouts: ["editorial", "boutique"], theme: "dark", palettes: ["ink", "gold"], showcase: "packages", booking: "appointment",
    services: ["Passport & visa photos", "Family and baby shoots", "Photo framing and albums", "Instant digital prints", "Product photography", "Old photo restoration"],
    subs: ["Studio", "Prints", "Albums"],
    synonyms: ["photo studio", "passport photo", "photo lab", "framing", "studio"] }),
  e({ slug: "wedding-planner", name: "Wedding Planner", icon: "HeartHandshake", family: "visual", pack: "wedding",
    layouts: ["boutique", "cinematic"], theme: "light", palettes: ["rose", "gold"], showcase: "packages", booking: "booking",
    services: ["Destination wedding planning", "Venue and vendor management", "Theme decor curation", "Guest hospitality desk", "Budget planning support", "Day-of coordination team"],
    subs: ["Weddings", "Destination", "Decor"],
    synonyms: ["wedding planner", "shadi planner", "event planner", "destination wedding"] }),

  /* ---------------- Community ---------------- */
  e({ slug: "temple", name: "Temple & Trust", icon: "Landmark", family: "trust", pack: "astrologer",
    layouts: ["noirgold", "editorial"], theme: "dark", palettes: ["gold", "amber"], showcase: "services", booking: "booking",
    services: ["Daily aarti timings", "Online pooja booking", "Festival calendar", "Annadaan seva", "Donation and receipts", "Dharamshala stay"],
    subs: ["Darshan", "Seva", "Donate"],
    synonyms: ["temple", "mandir", "trust", "pooja", "dharmik", "ashram"] }),
  e({ slug: "society-rwa", name: "Society & RWA", icon: "Building", family: "trust", pack: "real-estate",
    layouts: ["bento", "prism"], theme: "light", palettes: ["ocean", "emerald"], showcase: "services", booking: "inquiry",
    services: ["Maintenance dues online", "Visitor & gate management", "Complaint tracking", "Notice board and circulars", "Facility booking", "Committee transparency reports"],
    subs: ["Residents", "Facilities", "Notices"],
    synonyms: ["society", "rwa", "apartment", "residents", "association"] }),
];

export const CATALOG_BY_SLUG: Record<string, CatalogEntry> = Object.fromEntries(
  [...LEGACY_CATALOG, ...CATEGORY_CATALOG].map((c) => [c.slug, c]),
);

/** Every catalogued business type (legacy 55 + the Indian-market expansion). */
export const ALL_CATALOG: CatalogEntry[] = Object.values(CATALOG_BY_SLUG);

/**
 * Best-effort entry for a slug that is not catalogued yet: match the closest
 * catalogued category by keyword so unknown slugs still get a real family
 * (food -> menu, shop -> products) instead of a bland service fallback.
 */
export function resolveCatalogEntry(slug: string, name?: string): CatalogEntry | undefined {
  const direct = CATALOG_BY_SLUG[slug];
  if (direct) return direct;
  const q = norm(`${slug.replace(/-/g, " ")} ${name ?? ""}`);
  const words = q.split(" ").filter((w) => w.length > 2);
  let best: { entry: CatalogEntry; score: number } | undefined;
  for (const entry of ALL_CATALOG) {
    const terms = [entry.slug.replace(/-/g, " "), norm(entry.name), ...entry.synonyms.map(norm)];
    let score = 0;
    for (const t of terms) {
      if (!t) continue;
      if (t === q) score += 100;
      else if (q.includes(t) || t.includes(q)) score += 40;
      for (const w of words) {
        if (t === w) score += 25;
        else if (t.includes(w)) score += 10;
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { entry, score };
  }
  return best?.entry;
}


/** Extra search words for the original categories (builder smart search). */
export const LEGACY_SYNONYMS: Record<string, string[]> = {
  restaurant: ["restaurant", "hotel food", "dining", "bhojnalaya", "veg", "non veg"],
  cafe: ["cafe", "coffee", "bakery", "cake", "pastry", "tea stall"],
  catering: ["catering", "tiffin", "caterer", "mess", "food service"],
  kirana: ["kirana", "grocery", "general store", "supermarket", "provision"],
  ecommerce: ["ecommerce", "online store", "shop", "dukan", "online selling"],
  fashion: ["fashion", "clothes", "garment", "kapda", "readymade", "saree"],
  boutique: ["boutique", "designer wear", "lehenga", "ethnic"],
  jewellery: ["jewellery", "gold", "sona", "silver", "jeweller"],
  salon: ["salon", "beauty parlour", "parlour", "hair", "beautician"],
  makeup: ["makeup", "mua", "bridal makeup", "makeover"],
  barber: ["barber", "hair cut", "saloon men", "naai"],
  "mehndi-art": ["mehndi", "henna", "mehandi", "bridal mehndi"],
  tattoo: ["tattoo", "piercing", "ink studio"],
  yoga: ["yoga", "meditation", "dhyan", "pranayam"],
  gym: ["gym", "fitness", "workout", "vyayam"],
  "gym-trainer": ["personal trainer", "fitness coach", "trainer"],
  pet: ["pet", "dog", "cat", "grooming", "pet shop"],
  doctor: ["doctor", "clinic", "physician", "dawakhana", "hospital small"],
  dentist: ["dentist", "dental", "teeth", "danto ka doctor"],
  law: ["lawyer", "advocate", "law firm", "vakil", "legal"],
  finance: ["finance", "investment", "mutual fund", "wealth"],
  "chartered-accountant": ["ca", "chartered accountant", "gst", "income tax", "audit"],
  consulting: ["consultant", "consulting", "advisory", "business consultant"],
  business: ["business", "company", "corporate", "firm", "office"],
  startup: ["startup", "new venture", "founder"],
  saas: ["saas", "software product", "platform", "app"],
  "digital-agency": ["digital agency", "seo", "social media", "ads"],
  "marketing-agency": ["marketing", "advertising", "branding agency", "promotion"],
  construction: ["construction", "builder", "contractor", "civil", "thekedar"],
  interior: ["interior", "interior designer", "home decor", "false ceiling"],
  "real-estate": ["real estate", "property", "builder project", "flats"],
  hotel: ["hotel", "resort", "stay", "rooms", "lodge"],
  "boutique-hotel": ["homestay", "villa", "boutique hotel", "guest house"],
  travel: ["travel", "tour", "trip", "holiday", "tourism"],
  "tour-operator": ["tour operator", "package tour", "yatra", "trekking"],
  wedding: ["wedding", "shadi", "marriage", "event"],
  "photographer-wedding": ["wedding photographer", "candid", "pre wedding"],
  photography: ["photographer", "photography", "shoot", "camera"],
  portfolio: ["portfolio", "personal site", "resume", "cv"],
  freelancer: ["freelancer", "freelance", "designer", "developer"],
  music: ["music", "band", "singer", "orchestra"],
  podcast: ["podcast", "show", "audio", "youtube channel"],
  blog: ["blog", "magazine", "news", "articles"],
  event: ["event", "event management", "organiser", "conference"],
  "event-decorator": ["decorator", "decoration", "balloon", "flower decor"],
  education: ["education", "institute", "academy", "learning"],
  "coaching-center": ["coaching", "classes", "neet", "jee", "competition"],
  tutor: ["tutor", "tuition", "home tuition", "teacher"],
  "driving-school": ["driving school", "driving", "licence", "learner"],
  automotive: ["automotive", "car", "vehicle", "auto"],
  "crane-service": ["crane", "hydra", "lifting", "jcb"],
  "packers-movers": ["packers", "movers", "shifting", "relocation", "saman"],
  cleaning: ["cleaning", "housekeeping", "deep clean", "safai"],
  ngo: ["ngo", "charity", "trust", "foundation", "seva"],
  astrologer: ["astrologer", "pandit", "jyotish", "kundli", "horoscope"],
};

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

/** Words that describe a category (name + slug + synonyms). */
export function categoryTerms(slug: string, name?: string): string[] {
  const cat = CATALOG_BY_SLUG[slug];
  return [
    ...(name ? [name] : []),
    slug.replace(/-/g, " "),
    ...(cat?.name ? [cat.name] : []),
    ...(cat?.synonyms ?? []),
    ...(cat?.subs ?? []),
    ...(LEGACY_SYNONYMS[slug] ?? []),
  ].map(norm);
}

/**
 * Fuzzy match a user's plain-language business description to categories.
 * Returns the best matches (highest score first).
 */
export function matchCategories<T extends { slug: string; name: string }>(
  query: string,
  categories: T[],
  limit = 6,
): T[] {
  const q = norm(query);
  if (!q) return categories.slice(0, limit);
  const words = q.split(" ").filter((w) => w.length > 2);

  const scored = categories.map((c) => {
    const terms = categoryTerms(c.slug, c.name);
    let score = 0;
    for (const t of terms) {
      if (!t) continue;
      if (t === q) score += 100;
      else if (q.includes(t) || t.includes(q)) score += 45;
      for (const w of words) {
        if (t === w) score += 30;
        else if (t.includes(w)) score += 14;
        else if (w.length > 4 && t.startsWith(w.slice(0, 4))) score += 5;
      }
    }
    return { c, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.c);
}
