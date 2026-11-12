# Category-Perfect Images + Category Design Blueprints

## Where things stand (checked just now)

- 463 demo templates across 55 categories. None of them use ImageKit yet — 281 still point at raw Unsplash URLs, and only 220 distinct hero images cover all 463 templates, so several categories share the same photo.
- ImageKit and Pexels integrations are both enabled in admin, and the niche engine (taxonomy, section-aware queries, `reimageContent`) already exists.
- That engine is wired only into the per-site editor button. There is no admin action to re-image templates in bulk, and the `niche_profiles` cache table is empty (0 rows), so every detection is recomputed from scratch.
- Booking form, leads inbox, button actions and the Ctrl+K palette from the last rounds are done and live.

So: the image engine exists, but it was never run across the template library. That is the main gap behind "sab templates ki photos category ke hisab se nahi hain".

## Part 1 — Every template gets true category images

1. Add a **Bulk Image Refresh** panel in the super-admin Integrations/Templates area:
   - Pick a category (or all), then run re-imaging in batches with a live progress counter.
   - For each template: resolve the niche profile, build section-aware queries (hero, gallery, products, team, portfolio, about, cta), and fetch images through ImageKit first, Pexels as fallback, existing Unsplash as last resort.
   - Every image is stored as an ImageKit-transformed URL (auto format, quality, width per slot) so pages load fast and thumbnails stay ultra-HD.
2. **Duplicate guard:** track used image IDs per category run so two templates in the same category never share a hero, and the same photo is not reused more than twice platform-wide.
3. **Cache niche profiles:** persist resolved profiles into the existing `niche_profiles` table, keyed by category/subcategory, so future generations and user sites reuse them instantly instead of re-detecting.
4. New user sites and the "Regenerate images" button in the editor use the exact same path, so a freshly built site is never generic.

## Part 2 — Category design blueprints from real-world research

Your ask: search each category's keywords, look at already-built websites in that niche, and reuse everything except their images, text, names and numbers.

What is safe and actually better: harvest the **structure**, not the site. For each category we research live examples and record a blueprint — section order, hero style, layout family, palette temperature, typography pairing, motion intensity, commerce blocks used. We never copy their markup, CSS, photos or wording, which keeps you clear of copyright while giving templates a real-world feel instead of an AI feel.

1. New `category_blueprints` table: category, blueprint name, section order, layout variant, palette, font pairing, motion level, notes, source references, active flag.
2. **Research runner (admin-triggered):** for a chosen category, the system searches that niche's keywords, reads the top real business sites, and distils 4-6 distinct blueprints per category — for example a restaurant gets "menu-led", "chef story", "reservation-first", "gallery-heavy" variants.
3. Super-admin reviews blueprints in a table: edit, disable, or add their own before anything goes live.
4. The generator picks a blueprint per site (varied by session so two customers in one category never get identical layouts), then fills it with AI copy and category images from Part 1.
5. A "Re-blueprint category" action rebuilds that category's demo set on the new blueprints.

## Rollout order

1. Bulk image refresh + duplicate guard + profile caching (fixes all 463 templates now).
2. `category_blueprints` table and admin review UI.
3. Research runner for blueprints, category by category.
4. Generator switches to blueprint-driven layouts, then regenerate demos per category.

## Technical notes

- Bulk work runs through a server function called in batches from the admin UI (50 templates per request) to stay inside request limits; progress is stored on the run so it can resume.
- Image fetching: ImageKit search API first, Pexels API second, both already keyed in `api_integrations`; URLs written back with ImageKit transform params.
- `category_blueprints` gets standard RLS: read for authenticated, full access for admins via `has_role`, plus the required grants.
- Blueprint research uses the existing AI route (Gemini key, Lovable AI fallback) and stores only structural metadata and reference URLs.
- No template content model changes are needed; blueprints drive section order and layout variant fields that the renderer already supports.

## Not included

- Verbatim cloning of any specific website's design, code, or assets.
