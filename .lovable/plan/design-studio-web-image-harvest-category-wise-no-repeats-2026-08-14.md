# Design Studio: Web Image Harvest (category-wise, no repeats)

Ek naya system jo har category ke keywords se **real websites** dhoondhta hai, unki HD images nikaalta hai, ek image bank me save karta hai, aur phir un images ko us category ke demo templates par lagata hai — bina repeat ke. Ek saath 55+ websites ka data import/export bhi ho sakta hai.

## Kaise chalega (admin ke liye)

Design Studio me ek nayi tab: **Web Harvest**.

1. **Category chuno** (ya "All categories").
2. **Keywords** auto-bhar jaate hain (category naam + niche words), admin edit kar sakta hai.
3. **Find websites** — keywords se top business websites ki list aati hai (har site ka domain + title). Admin checkbox se sites approve/remove kar sakta hai, ya apni URL list **paste** kar sakta hai (ek line = ek site, 55+ sites ek saath chalengi).
4. **Harvest** — har site se images nikaali jaati hain: sirf badi HD photos (chhoti icons, logos, sprites, tracking pixels, base64 auto-skip). Live progress + Stop.
5. Saari images **Image Bank** me save hoti hain: category, source domain, width/height, section guess (hero / gallery / about / product), aur ek content-hash.
6. **Apply to templates** — existing Bulk Apply engine isi bank se images uthata hai. Text, business name, phone, WhatsApp, email kabhi nahi chhue jaate — sirf photos.

Bank ko **Export (JSON)** aur **Import (JSON)** kar sakte ho, taki ek project ka harvested data doosri jagah reuse ho jaye.

## Repeat control

- Har image ka **hash + normalised URL** unique index — same photo bank me dobara save nahi hogi.
- Har image par `used_count` aur `used_in` (template ids). Apply karte waqt engine hamesha sabse kam use hui image pehle uthata hai.
- **Ek category ke andar zero repeat** (hero images to poore project me unique), aur ek image poore project me max 2 baar — ye limit admin slider se badal sakti hai.
- Bank khatam ho jaye to hi fallback: Pexels → Openverse/Wikimedia (keyless) → curated HD pool.

## Source ke baare me

Google ko seedha scrape karna allowed nahi hai, isliye:
- **Website discovery + image extraction** Firecrawl connector se hoga (search + scrape). Ye Google-quality results deta hai aur legally sahi tarika hai. Connect card chat me aayega.
- Agar Firecrawl connect na ho, to **manual URL paste** wala mode phir bhi poori tarah kaam karega, aur keyless sources (Pexels/Openverse/Wikimedia) fallback rahenge.
- Harvested images sirf **demo/placeholder** hain — jaise aapne kaha, real user apni photos khud lagayega. Bank me har image ke saath source URL store hoga, aur admin kisi bhi image/domain ko block kar sakta hai.

## Technical notes

- Nayi table `harvested_images`: `id, category_id, category_slug, url, source_url, source_domain, width, height, hash, section_key, quality_score, blocked, used_count, used_in jsonb, created_at`; unique index `(hash)` aur `(url)`. Admin-only RLS (`has_role(auth.uid(),'admin')`) + GRANTs.
- Nayi table `harvest_runs`: run scope, keywords, sites list, counts, status, error — progress/undo ke liye (`bulk_image_runs` jaisa pattern).
- `src/lib/images/harvest.server.ts`: `discoverSites(keywords)`, `harvestSite(url)` (Firecrawl `scrape` → `links`/html se `<img>`, `srcset`, og:image, CSS `background-image`), filter (min 800px, aspect sanity, deny-list: logo/icon/sprite/avatar/placeholder/svg), `sectionGuess()` alt/filename se.
- `src/lib/harvest.functions.ts`: `startHarvest`, `harvestBatch`, `stopHarvest`, `listBank`, `blockImage`, `exportBank`, `importBank` — sab super-admin guard ke saath, batch-wise taaki timeout na ho.
- `src/lib/images/category-images.server.ts` me bank ko **sabse pehli source** banaya jayega (ImageKit owned se pehle bhi optional), `pickLeastUsed()` ledger ke saath; final URL hamesha ImageKit se optimise hoke serve hogi.
- `bulk-apply.server.ts` bank-aware hoga aur apply hone par `used_count` / `used_in` update karega; existing Undo snapshots waise hi kaam karenge.
- `DesignStudioAdmin.tsx` me **Web Harvest** tab: keywords box, discovered/pasted sites list, progress bar, bank gallery (filter by category/domain, block button), repeat-limit slider, Export/Import buttons.
