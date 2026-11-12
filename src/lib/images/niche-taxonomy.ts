/**
 * Niche taxonomy for the smart image engine.
 *
 * This is a FAST PATH, not a hard list. Anything that doesn't match here is
 * resolved by the AI niche resolver (`niche-detect.server.ts`). Every entry
 * carries:
 *  - `terms`   : match tokens (English + Hindi/Devanagari + romanised + other langs)
 *  - `keywords`: visual concepts used to build image search queries
 *  - `style`   : mood words that make results look human-shot, not stocky
 *  - `sections`: optional per-section overrides (hero/about/services/gallery/cta)
 */

export type SectionKey =
  | "hero"
  | "about"
  | "services"
  | "gallery"
  | "portfolio"
  | "products"
  | "team"
  | "testimonials"
  | "cta"
  | "contact"
  | "blog";

export type Niche = {
  id: string;
  label: string;
  group: string;
  terms: string[];
  keywords: string[];
  style?: string[];
  sections?: Partial<Record<SectionKey, string[]>>;
};

/** Generic section intents, used when a niche has no override. */
export const SECTION_INTENT: Record<SectionKey, string[]> = {
  hero: ["wide establishing shot", "signature scene"],
  about: ["people at work", "behind the scenes", "owner portrait"],
  services: ["service in progress", "close up detail"],
  gallery: ["detail shot", "interior", "finished work"],
  portfolio: ["finished project", "showcase detail"],
  products: ["product on clean background", "product close up"],
  team: ["team portrait", "staff at work"],
  testimonials: ["happy customer portrait", "smiling client"],
  cta: ["inviting scene", "welcoming entrance"],
  contact: ["reception desk", "storefront exterior"],
  blog: ["editorial flat lay", "lifestyle scene"],
};

const G = {
  beauty: ["elegant", "warm light", "editorial"],
  food: ["appetising", "natural light", "rustic"],
  wedding: ["romantic", "golden hour", "candid"],
  fashion: ["editorial", "studio light", "modern"],
  health: ["clean", "bright", "professional"],
  fitness: ["energetic", "dramatic light", "action"],
  realestate: ["architectural", "daylight", "luxury"],
  services: ["corporate", "clean", "professional"],
  education: ["bright", "candid", "campus"],
  creative: ["cinematic", "moody", "artistic"],
  travel: ["scenic", "golden hour", "wide"],
  auto: ["dynamic", "showroom light", "detailed"],
  retail: ["clean background", "lifestyle", "vibrant"],
  home: ["practical", "on site", "daylight"],
  pets: ["playful", "warm", "candid"],
  agri: ["natural", "sunlight", "earthy"],
  community: ["documentary", "warm", "candid"],
  personal: ["portrait", "natural light", "authentic"],
  entertainment: ["neon", "stage light", "dynamic"],
  finance: ["modern office", "clean", "trustworthy"],
  content: ["editorial", "flat lay", "minimal"],
  niche: ["craft", "workshop", "detail"],
};

function n(
  id: string,
  label: string,
  group: keyof typeof G,
  terms: string[],
  keywords: string[],
  sections?: Partial<Record<SectionKey, string[]>>,
): Niche {
  return { id, label, group, terms: [id.replace(/-/g, " "), label.toLowerCase(), ...terms], keywords, style: G[group], sections };
}

export const NICHES: Niche[] = [
  /* ---------------- Beauty & personal care ---------------- */
  n("mehndi-artist", "Bridal Mehndi Artist", "beauty",
    ["mehndi", "mehandi", "mehendi", "henna", "heena", "मेहंदी", "मेहन्दी", "मेहंदी पार्लर", "hina", "bridal mehndi", "mehndi parlour", "mehndi salon"],
    ["bridal mehndi artist", "henna hands", "mehndi design", "arabic henna", "indian wedding henna"],
    {
      hero: ["bridal mehndi artist applying henna"],
      about: ["henna artist applying mehndi close up"],
      services: ["bridal mehndi design", "arabic mehndi design", "traditional henna pattern"],
      gallery: ["bridal henna hands", "mehndi wedding design", "henna close up detail"],
      cta: ["indian bride mehndi wedding"],
    }),
  n("beauty-salon", "Beauty Salon", "beauty", ["salon", "parlour", "parlor", "ब्यूटी", "सैलून", "belleza", "salon de beaute", "kuaför"], ["beauty salon interior", "hair styling", "salon treatment"]),
  n("hair-salon", "Hair Salon", "beauty", ["hair", "hairdresser", "hair studio", "बाल"], ["hair salon", "hair styling", "haircut"]),
  n("barber-shop", "Barber Shop", "beauty", ["barber", "men salon", "mens salon", "नाई"], ["barber shop", "beard trim", "classic barber chair"]),
  n("makeup-artist", "Makeup Artist", "beauty", ["makeup", "make up", "bridal makeup", "मेकअप", "maquillaje"], ["makeup artist at work", "bridal makeup", "beauty close up"]),
  n("nail-salon", "Nail Salon", "beauty", ["nail", "nails", "nail art", "manicure", "pedicure"], ["nail art", "manicure close up", "nail salon"]),
  n("spa", "Spa & Wellness", "beauty", ["spa", "massage", "wellness", "ayurvedic spa", "स्पा", "मसाज"], ["luxury spa interior", "massage treatment", "spa candles stones"],
    {
      hero: ["luxury spa interior"],
      about: ["spa therapist treatment"],
      services: ["massage treatment", "facial spa", "wellness therapy"],
      gallery: ["spa room", "relaxation treatment", "spa products"],
    }),
  n("tattoo-studio", "Tattoo Studio", "beauty", ["tattoo", "piercing", "टैटू"], ["tattoo studio", "tattoo artist working", "tattoo close up"]),
  n("skin-clinic", "Skin & Derma Clinic", "health", ["skin", "derma", "dermatology", "त्वचा"], ["dermatology clinic", "skin treatment", "facial care"]),
  n("eyelash-studio", "Lash & Brow Studio", "beauty", ["eyelash", "lash", "brow", "eyebrow"], ["eyelash extensions", "brow shaping", "beauty close up"]),
  n("bridal-studio", "Bridal Studio", "wedding", ["bridal studio", "dulhan", "दुल्हन"], ["indian bride portrait", "bridal styling", "bridal jewellery"]),

  /* ---------------- Food ---------------- */
  n("restaurant", "Restaurant", "food", ["restaurant", "dhaba", "diner", "रेस्टोरेंट", "restorante", "ristorante", "レストラン"], ["restaurant interior", "plated dish", "chef cooking"]),
  n("cafe", "Cafe & Coffee Shop", "food", ["cafe", "coffee", "कैफे", "कॉफ़ी", "kahve", "cafetería"], ["coffee shop interior", "latte art", "barista"]),
  n("bakery", "Bakery & Cake Shop", "food", ["bakery", "cake", "pastry", "बेकरी", "केक", "panadería", "boulangerie"], ["bakery display", "fresh bread", "decorated cake"]),
  n("sweet-shop", "Sweet Shop", "food", ["mithai", "sweet", "मिठाई", "halwai"], ["indian sweets mithai", "sweet shop counter", "laddu barfi"]),
  n("fast-food", "Fast Food", "food", ["fast food", "burger", "pizza", "fries", "बर्गर", "पिज़्ज़ा"], ["burger close up", "pizza wood oven", "fast food counter"]),
  n("street-food", "Street Food", "food", ["street food", "chaat", "food truck", "चाट", "ठेला"], ["indian street food stall", "food truck", "street vendor cooking"]),
  n("biryani", "Biryani & Indian Restaurant", "food", ["biryani", "indian restaurant", "बिरयानी", "tandoor", "curry"], ["biryani plate", "indian thali", "tandoor kitchen"]),
  n("juice-bar", "Juice & Tea Bar", "food", ["juice", "tea", "chai", "चाय", "smoothie", "boba"], ["fresh juice glasses", "chai tea cup", "smoothie bar"]),
  n("ice-cream", "Ice Cream & Dessert", "food", ["ice cream", "dessert", "gelato", "आइसक्रीम"], ["ice cream cone", "dessert plating", "gelato display"]),
  n("catering", "Catering & Cloud Kitchen", "food", ["catering", "cloud kitchen", "tiffin", "टिफ़िन"], ["catering buffet", "commercial kitchen", "banquet food spread"]),

  /* ---------------- Wedding & events ---------------- */
  n("wedding-planner", "Wedding Planner", "wedding", ["wedding", "shaadi", "shadi", "marriage", "शादी", "विवाह", "boda", "mariage"], ["indian wedding decor", "wedding ceremony", "wedding stage"]),
  n("wedding-photography", "Wedding Photographer", "creative", ["wedding photographer", "wedding photography", "candid photography"], ["wedding couple portrait", "candid wedding moment", "wedding photographer at work"]),
  n("event-planner", "Event Management", "wedding", ["event", "event planner", "birthday", "party", "इवेंट"], ["event stage setup", "party decoration", "corporate event"]),
  n("decoration", "Decoration Service", "wedding", ["decoration", "decor", "flower decoration", "सजावट"], ["floral decoration", "stage decor", "mandap decoration"]),
  n("banquet-hall", "Banquet / Wedding Venue", "wedding", ["banquet", "marriage hall", "venue", "lawn", "बैंक्वेट"], ["banquet hall interior", "wedding venue", "decorated hall"]),
  n("dj-service", "DJ & Music Band", "entertainment", ["dj", "band", "orchestra", "डीजे"], ["dj console lights", "live band stage", "concert crowd"]),

  /* ---------------- Fashion ---------------- */
  n("boutique", "Boutique / Clothing Store", "fashion", ["boutique", "clothing", "kapde", "कपड़े", "बुटीक", "ropa", "moda"], ["boutique interior", "clothing rack", "fashion model"]),
  n("saree-shop", "Saree & Ethnic Wear", "fashion", ["saree", "sari", "lehenga", "ethnic", "साड़ी", "लहंगा", "kurta"], ["saree display store", "lehenga bridal wear", "indian ethnic fashion"]),
  n("jewellery", "Jewellery Store", "fashion", ["jewellery", "jewelry", "gold", "diamond", "ज्वेलरी", "सोना", "joyería"], ["gold jewellery close up", "jewellery store display", "diamond ring macro"]),
  n("footwear", "Shoe & Bag Store", "fashion", ["shoe", "footwear", "sneaker", "handbag", "जूते"], ["sneaker product shot", "shoe store display", "leather handbag"]),
  n("tailor", "Tailor & Custom Clothing", "fashion", ["tailor", "darzi", "stitching", "embroidery", "दर्जी", "सिलाई"], ["tailor sewing", "fabric close up", "embroidery detail"]),

  /* ---------------- Health ---------------- */
  n("clinic", "Clinic / Doctor", "health", ["clinic", "doctor", "physician", "क्लिनिक", "डॉक्टर", "médico", "arzt"], ["doctor consultation", "modern clinic interior", "medical care"]),
  n("dental", "Dental Clinic", "health", ["dental", "dentist", "teeth", "दंत", "दांत"], ["dental clinic chair", "dentist treating patient", "smile close up"]),
  n("hospital", "Hospital / Diagnostic", "health", ["hospital", "diagnostic", "lab", "pathology", "अस्पताल"], ["hospital corridor", "medical laboratory", "diagnostic equipment"]),
  n("pharmacy", "Pharmacy / Medical Store", "health", ["pharmacy", "chemist", "medical store", "दवा"], ["pharmacy shelves", "pharmacist counter", "medicine close up"]),
  n("physiotherapy", "Physiotherapy", "health", ["physio", "physiotherapy", "chiropractor", "rehab"], ["physiotherapy session", "rehab exercise", "therapist treating patient"]),
  n("ayurveda", "Ayurveda & Homeopathy", "health", ["ayurveda", "ayurvedic", "homeopathy", "आयुर्वेद", "panchakarma"], ["ayurvedic herbs", "ayurveda therapy", "herbal medicine"]),
  n("veterinary", "Veterinary Clinic", "pets", ["veterinary", "vet", "pet hospital", "पशु"], ["veterinarian with dog", "vet clinic", "pet checkup"]),
  n("nutritionist", "Nutritionist / Dietitian", "health", ["nutrition", "dietitian", "diet", "पोषण"], ["healthy meal bowl", "nutritionist consultation", "fresh vegetables"]),

  /* ---------------- Fitness ---------------- */
  n("gym", "Gym & Fitness Center", "fitness", ["gym", "fitness", "workout", "जिम", "gimnasio"], ["gym interior weights", "athlete training", "dumbbell close up"]),
  n("yoga", "Yoga Studio", "fitness", ["yoga", "meditation", "योग", "ध्यान"], ["yoga studio", "yoga pose sunrise", "meditation calm"]),
  n("dance-studio", "Dance Studio", "fitness", ["dance", "zumba", "kathak", "नृत्य", "डांस"], ["dance studio practice", "dancer motion", "dance class"]),
  n("martial-arts", "Martial Arts", "fitness", ["karate", "taekwondo", "boxing", "mma", "kickboxing"], ["martial arts training", "boxing gloves", "dojo class"]),
  n("sports-academy", "Sports Academy", "fitness", ["cricket", "football", "badminton", "tennis", "swimming", "academy"], ["sports academy training", "cricket practice nets", "stadium field"]),

  /* ---------------- Real estate & construction ---------------- */
  n("real-estate", "Real Estate", "realestate", ["real estate", "property", "realtor", "plot", "प्रॉपर्टी", "जमीन", "inmobiliaria"], ["luxury modern house", "apartment building", "property viewing"],
    {
      hero: ["luxury modern house exterior"],
      about: ["real estate agent with clients"],
      services: ["property consultation", "house viewing keys"],
      gallery: ["modern living room", "luxury bedroom", "modern kitchen", "villa exterior"],
    }),
  n("construction", "Construction & Builder", "realestate", ["construction", "builder", "contractor", "निर्माण", "ठेकेदार"], ["construction site", "engineer blueprint", "building under construction"]),
  n("architecture", "Architecture Studio", "realestate", ["architect", "architecture", "वास्तुकार"], ["architectural model", "modern building facade", "architect drawing"]),
  n("interior-design", "Interior Designer", "realestate", ["interior", "interior design", "इंटीरियर", "décoration"], ["modern living room interior", "designer kitchen", "interior detail"]),
  n("furniture", "Furniture & Home Decor", "retail", ["furniture", "sofa", "फर्नीचर", "muebles"], ["furniture showroom", "designer sofa", "home decor styling"]),
  n("landscaping", "Landscaping & Garden", "agri", ["landscaping", "garden", "lawn", "बागवानी"], ["landscaped garden", "gardener working", "green lawn design"]),

  /* ---------------- Professional services ---------------- */
  n("law-firm", "Lawyer / Law Firm", "services", ["lawyer", "advocate", "law", "legal", "वकील", "abogado", "avocat"], ["law office", "lawyer at desk", "legal books gavel"]),
  n("accounting", "CA / Accounting / Tax", "finance", ["accountant", "chartered accountant", "tax", "gst", "audit", "सीए"], ["accountant working", "financial documents", "calculator spreadsheet"]),
  n("consulting", "Business Consulting", "services", ["consultant", "consulting", "advisory", "सलाहकार"], ["business meeting", "consultant presenting", "modern office"]),
  n("marketing-agency", "Marketing / SEO Agency", "services", ["marketing", "seo", "digital marketing", "ads", "social media agency", "मार्केटिंग"], ["marketing team meeting", "analytics dashboard", "creative agency office"]),
  n("it-company", "IT / Software Company", "services", ["it company", "software", "web development", "app development", "saas", "cybersecurity", "cloud"], ["developers coding", "modern tech office", "server room"]),
  n("hr-recruitment", "HR & Recruitment", "services", ["hr", "recruitment", "staffing", "placement", "भर्ती"], ["job interview", "office handshake", "team hiring"]),
  n("insurance", "Insurance Agency", "finance", ["insurance", "policy", "बीमा", "seguros"], ["insurance consultation", "family protection", "signing policy"]),

  /* ---------------- Education ---------------- */
  n("school", "School / College", "education", ["school", "college", "university", "स्कूल", "विद्यालय", "escuela", "école"], ["school classroom", "students campus", "children studying"]),
  n("coaching", "Coaching / Tuition Center", "education", ["coaching", "tuition", "institute", "कोचिंग", "ट्यूशन"], ["coaching class students", "teacher whiteboard", "students studying"]),
  n("online-course", "Online Course / E-learning", "education", ["online course", "e-learning", "elearning", "lms", "training"], ["online learning laptop", "student with headphones", "video course setup"]),
  n("coding-academy", "Coding / Computer Institute", "education", ["coding", "computer institute", "programming bootcamp"], ["coding class", "students at computers", "code on screen"]),
  n("language-school", "Language / IELTS Institute", "education", ["language school", "ielts", "spoken english", "अंग्रेजी"], ["language class", "students speaking", "study books"]),
  n("music-school", "Music / Art School", "education", ["music school", "art school", "guitar class", "संगीत"], ["music lesson", "art class painting", "student practising"]),
  n("driving-school", "Driving School", "auto", ["driving school", "driving", "ड्राइविंग"], ["driving lesson car", "learner driver", "steering wheel close up"]),

  /* ---------------- Creative & media ---------------- */
  n("photography", "Photography Studio", "creative", ["photographer", "photography", "photo studio", "फोटोग्राफी", "fotografía"], ["photographer with camera", "photo studio lighting", "camera close up"]),
  n("videography", "Video / Film Production", "creative", ["videographer", "video production", "film", "cinematography"], ["film crew shooting", "cinema camera rig", "production set lights"]),
  n("music-studio", "Recording / Podcast Studio", "creative", ["recording studio", "podcast", "music studio"], ["recording studio microphone", "mixing console", "podcast setup"]),
  n("design-studio", "Graphic / UI Designer", "creative", ["graphic designer", "ui ux", "illustrator", "branding studio"], ["designer workspace", "design mockups", "creative desk flat lay"]),
  n("animation", "Animation / 3D Studio", "creative", ["animation", "3d artist", "motion designer", "vfx"], ["3d render workspace", "animation studio", "motion graphics screen"]),
  n("art-gallery", "Artist / Art Gallery", "creative", ["artist", "painting", "art gallery", "कला"], ["art gallery wall", "artist painting", "art studio"]),

  /* ---------------- Travel ---------------- */
  n("hotel", "Hotel / Resort", "travel", ["hotel", "resort", "guest house", "homestay", "होटल", "hôtel"], ["luxury hotel room", "resort pool", "hotel lobby"]),
  n("travel-agency", "Travel Agency / Tours", "travel", ["travel", "tour", "trip", "holiday", "यात्रा", "टूर", "viaje"], ["scenic travel destination", "travellers exploring", "mountain landscape"]),
  n("adventure", "Adventure & Trekking", "travel", ["trekking", "camping", "safari", "adventure", "rafting"], ["trekking mountain trail", "camping tent night", "safari jeep"]),
  n("car-rental", "Car / Bike Rental & Taxi", "auto", ["car rental", "taxi", "cab", "bike rental", "टैक्सी"], ["rental car keys", "taxi city street", "scooter rental"]),

  /* ---------------- Automotive ---------------- */
  n("car-dealer", "Car Dealer / Showroom", "auto", ["car dealer", "showroom", "used car", "कार"], ["car showroom", "luxury car detail", "car keys handover"]),
  n("auto-workshop", "Auto Workshop / Service", "auto", ["car repair", "garage", "workshop", "mechanic", "गैराज"], ["mechanic repairing car", "auto workshop", "engine close up"]),
  n("car-wash", "Car Wash & Detailing", "auto", ["car wash", "detailing", "polish"], ["car wash foam", "car detailing polish", "shiny clean car"]),
  n("ev", "EV Dealer / Charging", "auto", ["ev", "electric vehicle", "charging station"], ["electric car charging", "ev charging station", "modern electric vehicle"]),

  /* ---------------- Retail & ecommerce ---------------- */
  n("ecommerce", "Online Store / E-commerce", "retail", ["ecommerce", "e-commerce", "online store", "shop", "store", "दुकान", "tienda"], ["ecommerce product flat lay", "packing orders", "online shopping"]),
  n("electronics", "Electronics / Mobile Store", "retail", ["electronics", "mobile", "gadget", "laptop", "इलेक्ट्रॉनिक्स"], ["electronics store display", "smartphone product shot", "gadgets flat lay"]),
  n("grocery", "Grocery / Supermarket", "retail", ["grocery", "kirana", "supermarket", "किराना"], ["grocery store aisle", "fresh produce", "supermarket shelves"]),
  n("cosmetics-store", "Cosmetics & Beauty Products", "retail", ["cosmetics", "beauty products", "skincare store"], ["cosmetics product flat lay", "skincare bottles", "beauty store shelf"]),
  n("gift-shop", "Gift & Handicraft Shop", "niche", ["gift", "handicraft", "handmade", "उपहार", "hastkala"], ["handmade craft products", "gift shop display", "artisan workshop"]),
  n("florist", "Florist / Flower Shop", "niche", ["florist", "flower", "फूल", "floristería"], ["flower shop bouquet", "florist arranging flowers", "fresh flowers close up"]),
  n("book-store", "Book & Stationery Store", "retail", ["book store", "stationery", "किताब"], ["bookstore shelves", "stationery flat lay", "reading corner"]),
  n("pet-shop", "Pet Shop & Grooming", "pets", ["pet", "pet shop", "grooming", "dog", "cat", "पालतू"], ["pet grooming dog", "pet shop", "happy dog portrait"]),

  /* ---------------- Home & local services ---------------- */
  n("cleaning", "Cleaning Service", "home", ["cleaning", "housekeeping", "deep cleaning", "सफाई"], ["cleaning service worker", "sparkling clean home", "cleaning supplies"]),
  n("pest-control", "Pest Control", "home", ["pest control", "termite", "कीट"], ["pest control technician", "spraying service", "clean protected home"]),
  n("laundry", "Laundry & Dry Cleaning", "home", ["laundry", "dry clean", "धुलाई"], ["laundry service", "folded clean clothes", "dry cleaning rack"]),
  n("movers", "Movers & Packers", "home", ["movers", "packers", "shifting", "relocation"], ["movers loading boxes", "packing cartons", "moving truck"]),
  n("electrician", "Electrician / Plumber / AC Repair", "home", ["electrician", "plumber", "ac repair", "appliance repair", "carpenter", "बिजली", "प्लंबर"], ["technician repairing", "plumber at work", "tools close up"]),
  n("solar", "Solar & Water Solutions", "home", ["solar", "water purifier", "ro", "सोलर"], ["solar panels rooftop", "solar installation", "clean water technology"]),
  n("security-service", "Security Service", "services", ["security", "guard", "cctv", "सुरक्षा"], ["security guard duty", "cctv camera", "control room monitors"]),

  /* ---------------- Agriculture ---------------- */
  n("farm", "Farm / Agriculture", "agri", ["farm", "agriculture", "kheti", "खेती", "किसान", "dairy", "poultry", "organic farm"], ["farm field sunrise", "farmer working", "fresh harvest crops"]),
  n("nursery", "Plant Nursery", "agri", ["nursery", "plants", "pौधे", "पौधा", "horticulture"], ["plant nursery greenhouse", "potted plants", "gardener with plants"]),

  /* ---------------- Community ---------------- */
  n("temple", "Temple / Religious Place", "community", ["temple", "mandir", "mosque", "church", "gurudwara", "मंदिर", "मस्जिद"], ["temple architecture", "prayer ceremony", "religious festival"]),
  n("ngo", "NGO / Charity", "community", ["ngo", "charity", "foundation", "trust", "समाज सेवा"], ["volunteers helping", "community outreach", "charity donation"]),
  n("meditation-center", "Spiritual / Meditation Center", "community", ["meditation center", "spiritual", "ashram", "ध्यान केंद्र"], ["meditation hall", "peaceful spiritual space", "candles serenity"]),

  /* ---------------- Personal ---------------- */
  n("portfolio", "Personal Portfolio", "personal", ["portfolio", "resume", "cv", "freelancer", "personal brand"], ["creative workspace", "professional portrait", "desk flat lay"]),
  n("influencer", "Influencer / Content Creator", "personal", ["influencer", "youtuber", "blogger", "creator", "streamer"], ["content creator filming", "ring light setup", "social media workspace"]),
  n("coach", "Coach / Speaker", "personal", ["life coach", "speaker", "mentor", "trainer"], ["speaker on stage", "coaching session", "audience workshop"]),
  n("author", "Author / Writer", "personal", ["author", "writer", "poet", "लेखक"], ["writer desk typewriter", "stack of books", "author portrait"]),

  /* ---------------- Entertainment ---------------- */
  n("gaming", "Gaming / Esports", "entertainment", ["gaming", "esports", "game studio", "गेमिंग"], ["gaming setup neon", "esports arena", "controller close up"]),
  n("cinema", "Theatre / Cinema / Production", "entertainment", ["cinema", "theatre", "production house", "film studio"], ["cinema hall", "theatre stage lights", "film production set"]),

  /* ---------------- Finance ---------------- */
  n("fintech", "Fintech / Banking", "finance", ["bank", "fintech", "loan", "mortgage", "payment", "बैंक", "लोन"], ["fintech app screen", "modern bank interior", "financial planning"]),
  n("trading", "Trading / Investment / Crypto", "finance", ["trading", "investment", "stock", "crypto", "mutual fund", "निवेश"], ["trading charts screens", "stock market data", "crypto concept"]),
  n("startup", "Startup / SaaS", "services", ["startup", "saas", "platform", "b2b"], ["startup team working", "saas dashboard laptop", "modern coworking"]),

  /* ---------------- Blogs & content ---------------- */
  n("blog", "Blog / Magazine / News", "content", ["blog", "magazine", "news", "editorial", "ब्लॉग"], ["editorial desk flat lay", "newspaper reading", "writing on laptop"]),
  n("food-blog", "Food Blog", "food", ["food blog", "recipe", "रेसिपी"], ["food flat lay overhead", "recipe cooking hands", "ingredients styling"]),
  n("travel-blog", "Travel Blog", "travel", ["travel blog", "travelogue"], ["traveller with map", "scenic viewpoint", "passport and camera"]),

  /* ---------------- Special / niche ---------------- */
  n("printing", "Printing / Signage", "niche", ["printing", "printing press", "flex", "signage", "screen printing", "छपाई"], ["printing press machine", "large format printer", "signage workshop"]),
  n("logistics", "Courier / Logistics / Warehouse", "services", ["courier", "logistics", "warehouse", "transport", "shipping"], ["warehouse shelves", "delivery van", "logistics worker scanning"]),
  n("manufacturing", "Manufacturing / Factory", "niche", ["manufacturing", "factory", "industrial", "export", "import"], ["factory production line", "industrial machinery", "workers in factory"]),
  n("packaging", "Packaging Business", "niche", ["packaging", "boxes", "labels"], ["packaging boxes design", "product packaging flat lay", "packing line"]),
  n("candle-soap", "Candle / Soap / Perfume", "niche", ["candle", "soap", "perfume", "fragrance", "मोमबत्ती"], ["handmade candles", "artisan soap bars", "perfume bottle macro"]),
  n("resin-art", "Resin / Handmade Craft", "niche", ["resin", "epoxy", "handmade furniture", "craft studio"], ["resin art table", "epoxy pour close up", "artisan workshop craft"]),
  n("funeral", "Funeral Services", "community", ["funeral", "memorial", "अंतिम संस्कार"], ["memorial flowers", "peaceful chapel", "candle remembrance"]),
  n("directory", "Directory / Marketplace / Classifieds", "services", ["directory", "marketplace", "classifieds", "listing site"], ["city business street", "marketplace app screen", "people browsing listings"]),
];

/** Group-level fallback when only a broad category is known. */
export const GROUP_FALLBACK: Record<string, string[]> = {
  beauty: ["beauty salon interior", "beauty treatment close up"],
  food: ["restaurant interior", "plated food"],
  wedding: ["wedding decor", "wedding celebration"],
  fashion: ["fashion boutique", "clothing detail"],
  health: ["modern clinic", "healthcare professional"],
  fitness: ["gym training", "fitness workout"],
  realestate: ["modern house", "interior architecture"],
  services: ["modern office team", "professional meeting"],
  education: ["classroom students", "learning together"],
  creative: ["creative studio", "artist at work"],
  travel: ["scenic destination", "travel landscape"],
  auto: ["car detail shot", "automotive workshop"],
  retail: ["retail store shelves", "product flat lay"],
  home: ["home service technician", "clean modern home"],
  pets: ["happy pet portrait", "pet care"],
  agri: ["farm field", "fresh produce"],
  community: ["community gathering", "volunteers"],
  personal: ["professional portrait", "creative desk"],
  entertainment: ["stage lights", "performance crowd"],
  finance: ["financial charts", "modern office desk"],
  content: ["editorial flat lay", "writing desk"],
  niche: ["artisan workshop", "craft detail"],
};
