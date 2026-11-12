# Elementor-Style Click-to-Edit Builder

Elementor Pro khud install nahi ho sakta (wo WordPress-only PHP plugin hai aur uska license bhi allow nahi karta). Isliye hum aapke existing editor ko upgrade karke **Elementor jaisa** experience denge — live site par click karo, side panel me edit karo, turant preview.

## 1. Live canvas + click-to-edit

- Editor screen do parts me: left/right **Inspector panel**, beech me **live site canvas** (asli SiteRenderer, dummy preview nahi).
- Canvas ke har section aur har editable element (heading, paragraph, button, image, badge, price) par hover se blue outline + label.
- Click karte hi Inspector us element ke controls kholega — Elementor ke jaise 3 tabs:
  - **Content** — text, link, button label, image (upload ya URL), list items
  - **Style** — text color, size, weight, alignment, background (color / gradient / image / video), padding, margin, radius, shadow
  - **Advanced** — entry animation, parallax on/off, visibility (desktop/tablet/mobile), custom ID
- Text par double-click = seedha canvas me inline typing (contentEditable), Elementor jaisa.

## 2. Widget library (drag & drop)

- Left me widget list: Hero, Features, Gallery, Portfolio, Products, Pricing, Team, Testimonials, FAQ, CTA, Contact Form, Map, Video, Rail/Carousel, Spacer.
- Widget ko canvas me drag karke drop → us jagah section insert.
- Sections ko drag handle se reorder, duplicate, hide, delete.

## 3. Responsive modes

- Top bar me Desktop / Tablet / Mobile toggle; canvas width uske hisaab se.
- Har style value per-device store hogi (font size, padding, visibility) — mobile par alag look.

## 4. AI assist (har element par)

- Selected element ke Inspector me "AI" button: Rewrite, Shorten, Make premium, Translate (Hindi/English), Generate section content.
- Section-level: "Regenerate this section" (business category ke hisaab se).

## 5. Safety & rules

- **Undo / Redo** history + autosave draft, "Publish" par hi live.
- Crash-proof: har change schema par validate hoga, invalid content chup-chaap sanitize (abhi wale crashes ka root fix).
- Footer ka **"Built with SKTECHLAB"** credit locked — sirf super-admin hata sakta hai; user ke liye wo element non-selectable.
- User sirf apni site edit kar sakta hai (plan lene ke baad); main platform site sirf super-admin.

## Technical notes

- Naya `src/lib/editor/` module: `EditorProvider` (selection + history state), `Inspector` (Content/Style/Advanced tabs), `WidgetLibrary`, `CanvasOverlay` (hover/click hit-boxes).
- SiteRenderer me `data-edit-path` attributes add honge (e.g. `sections.3.headline`) — overlay isi path se element identify aur patch karega. Runtime par ye attributes ignore hote hain, live site par koi asar nahi.
- Section schema (`src/lib/site-renderer/types.ts`) me optional `style` object add hoga: `{ desktop, tablet, mobile }` per-key overrides + `anim`, `hidden`.
- Drag-drop @dnd-kit se (already installed), canvas overlay portal-based taaki 3D transform ke saath align rahe.
- Editor state ek hi source of truth me; save `sites` table ke content JSON me, autosave debounce ke saath.

## Aapke 500MB code ke liye

Chat me itni badi file upload nahi hoti. In me se koi ek karein:
1. **GitHub** par (private bhi chalega) repo push karke link dein — sabse aasan.
2. **Google Drive / Dropbox** public link — main download karke padh lunga.
3. Sirf kaam ke folders (`src`, `templates`, `admin`) ka zip banayein (node_modules, images hata kar — 20-30MB reh jayega) aur chat me attach karein.

Code milte hi main uske templates/admin features ka audit dunga: kya-kya missing hai, kya port ho sakta hai. Ye editor ka kaam usse independent hai, isliye ab shuru kar sakte hain.
