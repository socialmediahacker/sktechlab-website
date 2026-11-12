# Blog fix + per-category design variety + AI site manager in admin + cinematic template upgrade

## 1. Blog article page opens blank / shows the list (confirmed bug)

`src/routes/blog.tsx` is the parent of `/blog/$slug`, but its component renders the blog listing and never renders `<Outlet />`. So clicking an article keeps showing the listing page — the article body is never mounted (verified: `/blog/<slug>` returns the listing markup with a correct article `<title>`).

Fix:
- Move the current listing UI into a new `src/routes/blog.index.tsx` (`/blog`).
- `src/routes/blog.tsx` becomes a thin layout that only returns `<Outlet />`.
- Article page keeps its own head/meta and Article + FAQ JSON-LD.
- Verify: article HTML contains the post body, hero image, FAQ and related links.

## 2. Every category looks the same — make design category-specific

Today 182 of 463 demos have no layout set, so they fall back to one default look, and the rest share only 6 layouts with the same section order.

Changes:
- **Category → design profile map**: each of the 55 categories gets a fixed profile — layout family, section order, colour tone, type pairing, image bucket emphasis, and hero style. Restaurant = dark cinematic + menu-first; salon = boutique warm + booking-first; ecommerce = bento + product grid first; law/finance = editorial sober; gym = brutal high-contrast; travel = full-bleed gallery-first, etc.
- **Per-template variant within a category**: a deterministic seed per template picks a different hero variant, section order shuffle (within allowed rules), accent shade and gallery style, so the 5–7 demos in one category are visibly different from each other.
- **Backfill run** applies profiles to all 463 demos (layout, palette, section order, hero kind) and re-runs the bucketed photo packs so images match the new sections.

## 3. Main admin: AI site manager

New **AI Studio** tab in main admin (super-admin only):
- Chat-style instruction box over all sites/templates: "make 5 new bakery demos", "refresh all salon heroes", "add a services page to every dentist demo".
- Actions the AI can run: create new templates for a category (learning structure and tone from existing top demos), edit an existing template's sections/copy, generate a new service page, rewrite copy, re-apply images.
- Every run shows a **preview diff** (before/after per template) with Apply / Discard, and is recorded in an `ai_runs` table so a run can be undone.
- Bulk selection: pick a category or specific templates before running.

## 4. Template beauty pass — cinematic feel

Applied inside the renderer so all demos benefit at once:
- **Entrance reveal**: staggered mask-reveal for headings, images and cards on first view.
- **Smooth loader**: brand-tinted page loader with a progress sweep, then a curtain reveal into the hero.
- **Hover effects**: image zoom + tilt on cards, magnetic buttons, underline sweeps, spotlight follow on grids.
- **3D motion**: scroll-linked depth parallax on hero and gallery layers, subtle perspective tilt on product/menu cards.
- **Micro-interactions**: button press springs, toast-free inline feedback, animated counters for stats, sticky header shrink, scroll progress bar.
- **Cinematic scroll**: pinned "detail preview" scroll sections per category (dish close-ups for restaurants, treatment shots for salons, room shots for hotels) using the category image buckets.
- Reduced-motion and mobile "lite motion" paths are respected so phones stay fast.

## Technical notes

- `src/routes/blog.tsx` → layout with `<Outlet />`; new `src/routes/blog.index.tsx` holds the listing + its head meta.
- New `src/lib/design/category-profiles.ts` (profile map) and `src/lib/design/variant.ts` (seeded per-template variation); `variants.tsx` `stylePack`/`renderHero` read from these.
- New server function `applyDesignProfiles` in a `*.functions.ts` wrapper + `*.server.ts` implementation, callable per category or for all, reusing the existing pack-apply pipeline.
- New `src/components/admin/AiStudio.tsx` + `src/lib/ai-studio.functions.ts` using the Lovable AI gateway; new `ai_runs` table (id, scope, prompt, diff jsonb, status, created_by) with GRANTs and admin-only RLS.
- Motion upgrades extend `src/lib/site-renderer/motion.tsx` (new `MaskReveal`, `Spotlight`, `Magnetic`, `PinnedScene`, `CountUp`) and are wired through `SiteRenderer.tsx`, `gallery.tsx`, `store.tsx`, `portfolio.tsx`.
