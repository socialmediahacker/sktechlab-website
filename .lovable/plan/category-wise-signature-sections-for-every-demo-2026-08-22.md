# Category-wise signature sections for every demo

## Problem (verified)

Demos only get a Products section when the category is marked `commerce`, and a Menu section when its family is `food`. Those flags live in the category catalogue, which currently covers only 72 newer Indian categories.

The 55 original categories — including `restaurant`, `cafe`, `catering`, `ecommerce`, `fashion`, `jewellery`, `kirana`, `boutique`, `hotel`, `salon`, `gym`, `doctor`, `real-estate` — have **no catalogue entry**, so they fall back to a generic "service" profile. Database check confirms it:

- `restaurant` (7 demos), `cafe` (6), `catering` (7): 0 menu sections, 0 product sections
- `ecommerce` (6), `fashion` (7), `jewellery` (7), `kirana` (7), `boutique` (7): 0 product sections
- Only catalogued food/shop slugs (`dhaba`, `sweet-shop`, `juice-bar`, `ice-cream`, `cloud-kitchen`, `mobile-shop`, `footwear`, …) currently show menu/products correctly

## What will change

1. **Catalogue completion** — add proper entries for all missing legacy categories (family, showcase kind, booking mode, `commerce` flag, signature services, sub-categories, synonyms). Restaurants/cafes/bakeries become `food`; stores become `shop` + `commerce`; hotels/resorts `stay`; clinics/schools `trust`; salon/spa/gym `wellness`; photo/design `visual`.

2. **Smarter fallback** — any slug still not in the catalogue is inferred from its name/synonyms (keywords like shop, store, mart, restaurant, cafe, clinic, academy, hotel) instead of silently becoming a generic service page.

3. **Signature-section rules per family** in the demo builder, so each demo always carries the sections its business type needs:
   - shop / commerce: Products grid (price, compare-at price, badges, category chips) + a collections-style showcase
   - food: Menu with dish price, description, photo and tags, plus a "Today's highlights / Chef's specials" strip and timings-and-delivery stats
   - stay: Rooms/packages showcase with rates and amenities
   - trust (clinics, schools, finance, legal): Doctors/faculty team block, programmes or treatments showcase, credentials stats
   - wellness: Membership/pricing plans and class-schedule style showcase
   - visual: Portfolio with project details
   - service: Packages/pricing plus a process/steps block
   Existing generic sections (features, gallery, testimonials, booking, FAQ, contact, CTA) stay, and the per-index design variation is preserved so demos in one category still differ from each other.

4. **Regenerate demos** — rebuild the content of all generated demo templates with the corrected profiles (category photo buckets already handle imagery). User-created sites are untouched.

## Technical notes

- `src/lib/categories/catalog.ts`: add the missing entries, keep the existing `CatalogEntry` shape, extend `CATALOG_BY_SLUG` fallback with a keyword-inference helper.
- `src/lib/design/demo-content.ts`: replace the two ad-hoc `if (entry.commerce)` / `if (family === "food")` splices with a family-driven section blueprint table; menu items gain tags and a highlights block built from the same catalogue services.
- All new sections use section types already supported by `src/lib/site-renderer/types.ts` and `SiteRenderer.tsx` (`products`, `menu`, `showcase`, `pricing`, `team`, `portfolio`), so no renderer changes are needed for the data itself; only minor menu-highlight styling if required.
- Regeneration runs through the existing Category Studio bulk generate path (`src/lib/catalog.functions.ts` → `buildDemoContent`), scoped to demo templates.
