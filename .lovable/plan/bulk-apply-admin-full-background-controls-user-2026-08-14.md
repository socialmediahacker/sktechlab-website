# Bulk Apply (admin) + full background controls (user)

Two parts: a one-click admin action that pushes category-accurate images and allowed text/style onto every generated page of a category, and a complete background editor (video / image / colour) for site owners.

## Part 1 — Admin "Bulk Apply"

In Admin → Design Studio, next to the existing image engine, add a single **Bulk Apply to category** action.

What one click does, per template in the chosen category (or all categories):

1. Images — replaces every photo with niche-accurate, ImageKit-optimised imagery (reuses the existing batch re-image engine, duplicate guard included).
2. Allowed text — only generic, non-identifying copy from the category blueprint: section titles, sub-headings, CTA labels, feature/benefit phrasing. Business name, phone, WhatsApp, email, address and any owner-written text are never touched.
3. Allowed style — section order, layout family, palette, fonts and motion from the approved `category_blueprints` row for that category.

Controls on the card:
- Category picker (or "All categories").
- Three toggles: Images / Text / Style — so you can apply only what you want.
- "Skip pages already customised" toggle (protects sites the owner has edited).
- Live progress bar, per-batch counter, Stop button, and a result summary — same run/resume mechanics as the current image runs.
- Safety: a snapshot of each page's content is stored before it is overwritten, and an **Undo last bulk apply** button restores the whole run.

Only categories that have an approved blueprint can be applied; the picker marks the rest as "needs research first".

## Part 2 — Background controls for the user

Backgrounds are currently URL fields tucked into one tab. Make them a proper **Background** panel available in both the full editor and Simple Mode, per site and per section:

- Video: upload your own (mp4/webm), pick from a built-in HD cinematic library, paste a URL, preview inline, or Remove.
- Image: upload, pick from the category HD library, regenerate with AI, paste URL, preview, or Remove.
- Colour: solid colour picker plus preset gradients, usable on its own or under the media.
- Overlay strength slider and a light/dark tint switch for text readability.
- Mobile toggle: "Use image instead of video on phones" (saves data, keeps it smooth).
- Every control has a clear Remove/Reset so a background can be deleted, not just replaced.

## Technical notes

- Server: new `adminBulkApply` / `adminBulkApplyBatch` / `adminUndoBulkApply` server functions in `src/lib/images.functions.ts` (or a sibling `bulk-apply.functions.ts`), admin-gated with `assertAdmin`, driven batch-by-batch from the UI like the current image run.
- Reuses `reimageTemplateBatch` for images and `category_blueprints` for structure/copy; adds a text/style merge helper that only writes whitelisted keys.
- Migration: extend `bulk_image_runs` with `mode`, `apply_text`, `apply_style` and a `snapshot` jsonb column (or a `bulk_apply_snapshots` table) for undo; GRANTs included.
- Renderer: extend `Brand` with `bg_color`, `bg_gradient`, `bg_mobile_image`; `backdrop.tsx` renders colour/gradient layer under media and swaps to image on small screens.
- Editor: new `BackgroundPanel` component reused by `dashboard.sites.$id.edit.tsx`, `SimpleMode.tsx` and `ElementInspector.tsx` (section-level background).
