# Better images + Design Studio cleanup + Home demo control in admin

## 1. Fix the image quality problem

The current "category packs" pull from rawpixel-style stock URLs — they carry visible watermarks and are often off-topic (a restaurant menu showing banquet halls, a salon card showing loose brushes). That is why the earlier images felt better.

What changes:

- Rebuild the packs from clean, watermark-free HD photo CDNs (Unsplash/Pexels direct photo URLs), verified at build time for status, content type and minimum 1600px width. No watermark domains allowed.
- Make packs **section-aware** instead of one flat list per category. Each category gets buckets:
  - `hero` (wide, atmospheric), `gallery`, `service`/`menu`/`product` (close-up subject shots), `team`, `about`.
  - Restaurant menu rows get food close-ups, salon service cards get treatment shots, e-commerce product cards get product shots — not generic interiors.
- Apply step matches bucket to section/field: `menu.items[].image`, `products[].images`, `portfolio`, `gallery`, `hero.background`, `thumbnail_url` each draw from the right bucket, with no repeat inside one template.
- Keep a per-template offset so five demos of the same category never look identical.
- Thumbnails always come from the category's `hero` bucket so category cards read correctly.

## 2. Design Studio cleanup

Keep only what works:

- **Keep:** Web Harvest — including "Apply category packs (all)" and per-category apply, made better:
  - live per-category coverage table (images available, applied, last run),
  - "Apply all" runs in batches with progress and a Stop button,
  - per-category preview strip so you can see the pack images before applying,
  - re-run/undo for the last apply.
- **Remove:** Image engine tab, Bulk apply tab, Category blueprints tab (their server code stays unused/deleted where safe, so nothing else breaks).

Design Studio then has a single, clear screen instead of four half-working ones.

## 3. Home page demo control in main admin

New **Home Showcase** admin screen (super-admin only) with two managed lists:

- **Real templates you can preview live** — the live-demo grid.
- **Websites created on SKTECHLAB** — the sliding rows.

For each list you can:

- add a demo (searchable picker by category/name),
- remove a demo,
- reorder (drag),
- set a custom thumbnail (upload, paste URL, or pick from that category's pack),
- toggle visible/hidden.

The home page reads these managed lists instead of the current hardcoded category list, so both sections show exactly what you choose, with correct category-wise thumbnails.

## Technical notes

- `src/lib/images/category-packs.ts` regenerated with bucketed, verified, watermark-free URLs; `apply-packs.server.ts` becomes bucket-aware (section/field → bucket mapping) and also fills `menu`, `products`, `portfolio`, `gallery` arrays.
- New table `home_showcase` (`id`, `slot` = `live_demos` | `created_on`, `template_id`, `thumbnail_url`, `sort_order`, `is_active`) with GRANTs, public `SELECT` for anon, write restricted to admins.
- `featuredTemplatesQuery` / `homeLiveDemosQuery` in `src/lib/queries.ts` read `home_showcase` first, falling back to today's logic when a slot is empty.
- New `src/components/admin/HomeShowcaseAdmin.tsx` + server functions in `src/lib/admin.functions.ts` (admin-verified).
- `DesignStudioAdmin.tsx` reduced to the Web Harvest panel; `WebHarvest.tsx` gains batching, progress, preview strip and undo.
