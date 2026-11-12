# Category-wise images + content, hand-built and applied to every template

Live harvest/API pipelines bharosemand nahi hain, isliye main khud har category ke liye verified photo pack aur handwritten copy pack bana kar sabhi templates aur blogs par apply karunga.

## Current state (checked)

- 55 categories, 463 templates, 961 bank images (651 CDN par), 99 blog posts.
- Sirf 33 categories me koi image hai; 22 categories (portfolio, startup, hotel, travel, freelancer, ngo, law, podcast, wedding, salon, fashion, kirana, gym-trainer, event, ecommerce, education, finance, marketing-agency, photography, crane-service, packers-movers, tour-operator) me **zero** — inke templates ko sahi photo mil hi nahi sakti.

## 1. Curated image packs (no runtime API)

Naya file `src/lib/images/category-packs.ts`: har category ke liye 12-16 hand-picked HD photo URLs, section-wise (hero, gallery, showcase/portfolio, team, detail, product/food).

- Pehle existing CDN bank photos (651) use honge, phir verified free HD stock URLs se gap bharunga.
- Har URL ko ship karne se pehle HTTP-check karunga (200 + image content-type + width >= 1200); fail hone wale URL replace honge.
- Har category minimum 12 photos — koi category khali nahi.
- Delivery ImageKit transform ke through (fast + resized).

## 2. Handwritten copy packs

Naya file `src/lib/content/category-copy.ts`: har category ke liye industry ki apni bhasha me likha content — hero headline/subline/CTA, 6 services ya features, 3-4 showcase items, 3 testimonials, 5 FAQ, about + contact blurb. Dentist page appointments/treatments ki baat karega, cafe page menu/seating ki — generic AI boilerplate nahi.

Ek category ke andar har template apna rotated slice leta hai (index ke hisaab se), isliye 5-8 demos ek doosre se alag padhte aur dikhte hain, par topic same rehta hai.

## 3. One-pass apply

`src/lib/images/apply-packs.server.ts` + admin-only server function:
- har template ke content me image fields ko us category+section ke pack photo se replace karega,
- hero/features/showcase/testimonials/FAQ text ko category copy slice se replace karega,
- brand name, colors, layout, section order intact rahenge,
- `thumbnail_url` category hero se refresh hoga taaki category listing sahi dikhe.

Batches me chalega, progress dikhega, purana content snapshot save hoga (undo possible). Sirf admin demo templates par — customer sites untouched.

## 4. Blogs

Wahi packs se 99 blog posts ke hero + gallery images category-wise set honge, aur category page thumbnails bhi. Ek blog ki photo doosri blog me repeat na ho iske liye rotation.

## Admin UI

Design Studio me do buttons: **"Apply category packs (all)"** aur per-category apply, saath me coverage list aur last-run undo.

## Technical notes

- Naye files: `src/lib/images/category-packs.ts`, `src/lib/content/category-copy.ts`, `src/lib/images/apply-packs.server.ts`; server functions `src/lib/harvest.functions.ts` me; UI `src/components/admin/WebHarvest.tsx` / Design Studio me.
- Packs static data hain, isliye result Pexels/harvest/ImageKit uptime par depend nahi karega; purana harvest engine optional refresher ke roop me bana rahega.
- Apply idempotent hai — dobara chalane par duplicate ya bigaad nahi hoga.
