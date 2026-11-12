# SEO/AEO/GEO Keywords + Blog Engine, Harvest & Blueprint Fixes

Aapki PDF (10,000 keywords — 18 languages, SEO 6,000 / AEO 2,000 / GEO 2,000, 100+ industries) ko platform ka keyword bank banayenge, usse har category ka blog auto-generate hoga, aur templates ki SEO meta bhi usi bank se aayegi. Saath me Web Harvest aur Blueprints ke "all categories" bugs fix honge.

## 1. Keyword bank

- PDF se saare keywords parse karke ek `seo_keywords` table me import: `keyword, language, intent (seo|aeo|geo), category_slug (auto-matched), used_count`.
- Category matching keyword text se (salon, spa, doctor, ecommerce, fashion…) — jo match na ho wo `general` bucket me.
- Admin me **SEO Keywords** panel: search, filter (category / intent / language), add-delete, aur "re-import" button.

## 2. Templates me SEO/AEO/GEO

- Har category page, template preview page aur generated user site ke `head()` me: unique meta title, meta description, keywords, canonical, og/twitter tags, `og:type`.
- Category-wise JSON-LD: `LocalBusiness`/`Service` + `FAQPage` (AEO ke liye 4-6 short Q&A) + `BreadcrumbList`.
- GEO/AI-search: har page par ek short "answer block" (40-60 word direct answer) taaki AI engines ise cite kar saken.

## 3. Blog engine (main site)

- Naya `blog_posts` table: `slug, title, meta_title, meta_description, excerpt, body (markdown), category_id/slug, keywords[], hero_image, gallery, faq jsonb, status (draft|published), published_at, views`.
- Public routes: `/blog` (grid + category filter + search) aur `/blog/$slug` (article, hero image, FAQ accordion, related posts, CTA).
- Home page par **Latest from the blog** section (3-6 cards) — baaki home waisa hi rahega.
- `sitemap.xml` me saare published blogs, `robots.txt` update.
- Har post ke andar automatic: keyword-rich H1/H2s, internal links, aur fixed CTA line — "website build with **hyper sktechlab.com**" (anchor `https://sktechlab.com`), footer me bhi.

## 4. Auto-generate blogs (admin)

Admin → naya **Blog** tab:
- **Generate**: category chuno (ya *All categories*), posts-per-category count, word range (500–1200), language, intent mix (SEO/AEO/GEO). Run batch-wise chalta hai progress bar + Stop ke saath (harvest jaisa pattern), taaki timeout na ho.
- Har post AI (Gemini) se banega: keyword bank se un-used keywords uthata hai, unhe title/meta/H2/FAQ me distribute karta hai, aur use hue keywords ka `used_count` badhata hai — repeat nahi.
- Images: pehle harvested image bank (category-wise), fir ImageKit optimise; koi bank image na ho to fallback stock.
- **Manage**: list with filters, edit (title/meta/body/keywords/image/status), delete, duplicate (copy-paste), bulk publish/unpublish, JSON export/import.

## 5. Web Harvest fixes

- **All categories** option: ab run ek category-queue chalata hai (har category ke apne keywords + sites), na ki blank slug.
- Category card/row par click karne se wo category select ho, keywords auto-fill hon, aur "Find websites" turant chale — abhi click no-op hai.
- Discovery reliability: DuckDuckGo ke alawa Mojeek/Bing HTML fallback aur (agar Firecrawl connected ho) Firecrawl search; koi source fail ho to next try, aur UI me asli error message dikhega (silent empty list nahi).
- Batch handler me per-site error ab run ke `errors` field me log hoga, aur "0 images" wale domains highlight honge.

## 6. Blueprint fixes

- Blueprints tab me **All categories** bulk research: ek-ek category batch me chalti hai, progress + Stop, already-researched skip.
- Category dropdown me saari categories (paged fetch, ab truncate nahi), aur "needs research" filter.

## Technical notes

- PDF parse ek build-time script se hoga; output chunked SQL seed migration + `src/lib/seo/keyword-map.ts` (category matcher).
- Tables: `seo_keywords`, `blog_posts`, `blog_runs` — teeno par GRANTs + RLS (public ko sirf `published` blogs ka SELECT, baaki admin-only via `has_role`).
- Server fns: `src/lib/blog.functions.ts` (list/save/delete/duplicate/bulk), `src/lib/blog/generate.server.ts` (AI post builder), `src/lib/seo/keywords.functions.ts`.
- Blog meta har leaf route ke `head()` me (title/description/og/twitter/canonical + Article & FAQPage JSON-LD).
- Harvest changes `src/lib/images/harvest.server.ts` (multi-engine discovery) aur `src/lib/harvest.functions.ts` (category queue) me; UI `WebHarvest.tsx`.
