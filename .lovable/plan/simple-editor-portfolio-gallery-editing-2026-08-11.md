# Simple Editor + Portfolio & Gallery editing

Goal: user apne site ko bina confusion ke edit kar sake — har section ka apna simple card, uska snapshot/preview, aur step-by-step options. Portfolio aur Gallery bhi poori tarah editable.

## 1. Portfolio & Gallery ko editable banana

- Portfolio items (title, meta/year, description, tags, image) ab click-to-edit se select honge. Har item ke liye inspector me: image upload/replace, text fields, aur item **Add / Duplicate / Delete / Move up-down**.
- Gallery: images array ke liye ek proper manager — multiple image upload, drag to reorder, delete, caption edit. Khali gallery me bhi "Add images" ka clear button.
- Renderer side pe portfolio/gallery ke text aur image nodes ko editable path milega (abhi ye nodes tag nahi ho rahe, isliye click kaam nahi karta).

## 2. Simple Mode editor (default for users)

Editor me do modes:

- **Simple (default)** — guided, mobile-friendly.
- **Advanced** — abhi wala click-to-edit canvas + inspector, jaisa hai waisa hi rahega.

Simple mode ka layout:

```text
Step 1  Brand      logo, name, phone, email, socials
Step 2  Sections   [snapshot] Hero        Edit >
                   [snapshot] Services    Edit >
                   [snapshot] Gallery     Edit >
                   [snapshot] Portfolio   Edit >
                   ...          + Add section
Step 3  Theme      colour, font, dark/light
Step 4  Pages      about / contact / policy toggles
Step 5  Publish
```

- Har section row me uska **live snapshot thumbnail** (preview iframe se capture kiya gaya chhota visual) + section ka naam + short hint ("Ye aapke top banner ka text hai").
- "Edit >" tap karte hi ek focused panel khulta hai jisme sirf usi section ke fields hote hain, plain labels ke saath (Heading, Sub text, Button text, Image), har field ke saath chhota example hint.
- Panel ke andar image fields pe direct upload button, list items pe Add/Delete/Reorder.
- Section row pe hi quick actions: show/hide, move up/down, duplicate, delete.
- Section select karte hi preview us section pe auto-scroll hota hai, taaki user ko turant dikhe kya badal raha hai.

## 3. Mobile-friendly

- Simple mode mobile pe full-screen sheets me chalega: list → section → fields, back button ke saath.
- Bottom bar: Preview / Save / Publish — hamesha reachable.
- Preview aur editing panel mobile pe tabs ki tarah switch honge (side-by-side nahi).

## Technical notes

- `src/lib/site-renderer/portfolio.tsx` aur `gallery.tsx` me text/image nodes ko renderer-level `data-*` hints milenge taaki `preview.live.tsx` ka tagger unhe reliably map kare; `paths.ts` me array-item helpers (add/remove/move) add honge.
- Naye components: `src/components/editor/SimpleMode.tsx` (step list), `SectionCard.tsx` (snapshot + actions), `SectionForm.tsx` (schema-driven fields), `ListEditor.tsx` (array items).
- Field schema per section type ek jagah define hogi (`src/lib/editor/section-schema.ts`) — isse har section ke simple fields, labels, hints aur image slots aate hain.
- Snapshot: preview iframe ke section bounding box se scaled-down visual (html2canvas nahi — CSS transform based live mini-render), taaki koi extra heavy dependency na aaye.
- `dashboard.sites.$id.edit.tsx` me mode toggle; saving, autosave queue, undo — sab existing logic reuse hoga, koi backend change nahi.
