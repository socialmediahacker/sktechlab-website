# Smart niche-aware image engine (AI visual search, not category lookup)

Goal: har business — chhota, local, niche, personal, ya bilkul naya — ke liye system khud samajh le ki asal me kya hai, aur us hisaab se section-wise sahi images laaye. Sab kuch ImageKit ke through serve/optimize hoga.

## Kya banega

**1. Niche taxonomy (broad list, but not a hard limit)**
- Ek naya file me ~20 top-level groups aur unke sub-niches (beauty/salon/mehndi/bridal-mehndi, food, wedding, fashion, health, fitness, real estate, professional services, education, creative, travel, automotive, retail, home services, pets, agriculture, community, personal, entertainment, finance, blogs, niche businesses).
- Har niche ke saath: visual keywords, style words (luxury, traditional, modern), aur section-wise query templates.
- Ye sirf fast-path hai; match na ho to AI resolver chalega (neeche).

**2. Multi-language + fuzzy detection**
- Business name + category + description se detect: Hindi/Devanagari, Spanish, French, German, Arabic, Portuguese, Italian, Japanese, Korean, Chinese, Russian, Indonesian, Turkish, Dutch, Polish, Vietnamese, Thai — plus romanized Hindi ("mehndi parlour", "mithai").
- Alias map (e.g. मेहंदी/henna/mehandi → bridal mehndi artist) + token scoring, taaki "Shabnam Mehndi Parlour, Jaipur" → `bridal mehndi artist` nikle, sirf `beauty` nahi.

**3. AI niche resolver (unknown categories)**
- Agar confidence kam ho ya category list me na ho, to Lovable AI (Gemini/GPT) se ek chhota structured call: input = business name + category + description + location; output = `{ main, subcategory, businessType, industry, services[], styleWords[], sectionQueries{} }`.
- Example: "Custom Resin Art Table Business" → resin art, epoxy furniture, artisan workshop, interior decor.
- Result `niche_profiles` table me cache hoga (key = normalized input hash), taaki dobara AI call na lage. AI fail ho to taxonomy/heuristic fallback.

**4. Section-aware queries**
- Har section (hero, about, services, gallery, portfolio, products, team, testimonials, cta, contact, blog) ke liye alag query banegi:
  `businessType + subcategory + section intent + style + location`.
- Bridal mehndi → hero: "bridal mehndi artist", gallery: "bridal henna hands close up", cta: "bride mehndi wedding".
- Spa/real-estate/restaurant etc. ke liye wahi engine, taxonomy se section intents.

**5. Sourcing chain (ImageKit first)**
- Order: ImageKit media library (tags/name search, apni HD assets) → Pexels (agar enabled) → curated HD pool.
- Sab URLs `ikUrl()` se guzrenge (auto format, width, quality) — delivery hamesha ImageKit se.
- Seeded rotation: har "Regenerate images" par alag set, same niche ke andar.

**6. Kahan lagega**
- Site build (builder) — pehli baar hi niche-correct images.
- Editor ka "Images" regenerate button aur inspector ka image-suggest — ab niche + section ke hisaab se.
- Category/demo thumbnails.
- User-uploaded images kabhi replace nahi hongi.

**7. Main Admin control**
- Integrations tab me ek "Smart Images" card: AI resolver on/off, model choice, default style words, fallback order, aur ek "Test detection" box — business name daalo, detected niche + section queries + sample images dikh jayen.

## Technical details

- Naye files: `src/lib/images/niche-taxonomy.ts` (data), `src/lib/images/niche-detect.server.ts` (lang normalize + scoring + AI resolver + cache), `src/lib/images/section-queries.ts`.
- `src/lib/images/category-images.server.ts` refactor: `categoryImages(category, count, seed)` ke saath naya `sectionImages(profile, section, count, seed)`; `reimageContent` ab section ke hisaab se pool chunega (walker ko section context milega, sirf flat pool nahi).
- Server fns `src/lib/site-editor.functions.ts` me: `aiRegenerateImages` niche profile use karega; naya `detectNiche` (admin test ke liye).
- Migration: `niche_profiles` (input_hash unique, profile jsonb, created_at) + GRANTs; read service/authenticated, write server-side only.
- AI call Lovable AI Gateway se (`LOVABLE_API_KEY`), server-only, chhota schema, failure par silent fallback.
- Koi visual/layout change nahi — sirf image sourcing intelligence.
