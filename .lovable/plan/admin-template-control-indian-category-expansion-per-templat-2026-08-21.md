# Admin Template Control + Indian Category Expansion + Per-Template Uniqueness

## 1. Main admin can edit any template like a real website editor

- Admin → Templates me har template par **Edit** button jo poora visual editor kholega (wahi editor jo user ki site ke liye hai: sections, drag-drop reorder, inline text, images, background, AI rewrite, Simple Mode).
- Editor template ke `content_json` par kaam karega, live preview ke saath, Save/Undo aur "Duplicate as new template".
- Sirf super-admin; user templates ko edit nahi kar sakta (existing rule intact).

## 2. Categories: add / generate / delete from admin

- Categories tab me: add, rename, delete, sort, icon, subcategories (already partly hai) + naya **"Generate demos"** action: category chuno → 5-8 demo templates AI se bane, har ek alag layout/palette/sections ke saath.
- Bulk: "Fill missing categories" — jis category me 5 se kam demo hain unke liye auto-generate.

## 3. Missing Indian categories + subcategories

Abhi 55 categories hain. Ye add honge (missing wale), har ek ke liye design profile + photo pack + 5-8 demos:

Car rental, Bike/scooty rental, Taxi service, Tours & travels agency, Spa & massage, Beauty parlour, Nail studio, Mehndi artist (aur bhi demos), Clinic/hospital, Pathology lab, Pharmacy/medical store, Physiotherapy, Dental clinic (hai), Veterinary, Grocery/supermarket, Mobile shop, Electronics shop, Furniture store, Hardware/sanitary, Paint shop, Sweet shop/bakery, Tiffin service, Cloud kitchen, Garment/saree shop, Footwear shop, Optical store, Gift shop, Toy shop, Book/stationery shop, Flower shop, Nursery/plants, Solar installer, AC/appliance repair, Mobile repair, Computer repair, Electrician, Plumber, Carpenter, Painter/contractor, Borewell, Tent house, DJ & sound, Banquet hall, Marriage bureau, Astrology (hai), Pandit/puja service, Security agency, Manpower/placement, Courier & logistics, Transport/tempo, Car wash & detailing, Insurance agent, Loan/DSA agent, Tax & GST consultant, Real estate broker (hai), PG/hostel, Playschool/daycare, School, Computer institute, Dance/music academy, Sports academy, Cricket turf, Gaming zone, Photo studio, Printing press, Sign board maker, Ad agency, Web/IT services, Cyber cafe, Laundry & dry clean, Home cleaning (hai), Pest control, Interior contractor (hai), Modular kitchen, Architect, Property management.

Har category ke saath 2-5 subcategories (jaise Car rental → self-drive, with driver, outstation, wedding cars).

## 4. Smart category search in builder

Site banate waqt user simple word likhe ("mehndi", "car", "doctor", "kirana", "spa") — turant **saari matched categories aur subcategories** dikhengi (Hindi + English + local synonyms, fuzzy match), aur user select karke aage badhega. Match nahi mila to closest suggestions.

## 5. Har template ka design alag (abhi same lag rahe hain)

Confirmed problem: zyadatar category me sabhi templates ka layout ek hi hai aur sirf 3-5 hero images poore category me repeat ho rahi hain.

Fix:
- Per-template design variant engine ko strengthen: ek category ke andar har template ko alag **layout family, palette, hero style, section order, typography, motion** milega (round-robin, sirf hash nahi).
- Images: category pack ko slot-wise rotate karke har template ko alag set milega, taki ek hi photo do demos me na aaye.
- Content: signature services/menu/pricing text har category ke hisaab se real industry wording (car rental ke liye "Self-drive, Outstation, Airport transfer" wagairah), generic copy hataya jayega.
- Backfill run: sabhi (naye + purane) templates par apply, admin me "Re-diversify category" button bhi.

## 6. Background controls (user side) complete

Editor ke Background panel me:
- Video: upload, URL, AI/library se generate-pick, delete
- Visibility/opacity slider (video + image dono ke liye), overlay strength
- Background color, gradient, mobile fallback image
- Live preview turant, per-section background override bhi.

## 7. Admin AI "fix anything"

AI Studio me site-manager mode: prompt likho ("doctor category ke demos me hero image blur hai, theek karo", "sab travel demos me booking section add karo") → AI proposal → preview diff → Apply → Undo. Isi se naye templates, category content aur bug fixes bhi ho sakenge.

## 8. Bug sweep

- Template preview/live links, blog images, missing thumbnails, image 404s, empty sections — ek pass me check aur fix.

## Technical notes

- `categories`/`subcategories` me naye rows migration se; har naye slug ke liye `src/lib/design/category-profiles.ts` aur `src/lib/images/category-packs.ts` me entry.
- Admin template editor: existing editor components (`SectionForm`, `WidgetLibrary`, `BackgroundPanel`, `SimpleMode`) ko ek `TemplateEditor` route me reuse, source = `templates.content_json` (server fn admin-guarded).
- Diversity: `src/lib/design/variant.ts` me index-based rotation + `apply-profiles.server.ts` backfill update; image assignment `apply-packs.server.ts` me per-template offset.
- Category search: naya synonym map (`src/lib/categories/synonyms.ts`) + fuzzy scorer, `src/routes/start.tsx` step 1 me live results.
- Generation: `ai-studio.server.ts` ko category-batch mode dena; runs `ai_runs` me log + undo snapshots.
