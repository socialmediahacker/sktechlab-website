# Image Bank upload + category images + blog images/links

## Aaj ki asli halat (checked)

- Image Bank me **781 photos** hain, lekin ye sab **doosri websites ke direct links** hain — hamare server/ImageKit par upload nahi hote. Bahut saari site hotlink block karti hain, isliye template/blog me lagne par photo blank aati hai. Bank me manual **Upload** button bhi nahi hai.
- 55 categories me se **32 categories ke paas bank me 0 image** hai (event, salon, education, wedding, travel, law, hotel, ecommerce...). Isliye "sabhi category ki images" set nahi ho pa rahi.
- Sabhi **99 blog posts** ka hero image `loremflickr` ka generic photo hai — category-wise bank image nahi lagi.
- `/blog` aur `/blog/<slug>` page kaam kar rahe hain aur cards link hain, lekin **home page par blog section hi nahi hai**, isliye blog kahin se click nahi hota (sirf header/footer link).

## Kya banega

### 1. Image Bank — asli upload (fix)
- Har banked image ko server side fetch karke **ImageKit par upload** kiya jayega (private key already secret me hai), aur row me CDN url save hoga (`cdn_url`, `uploaded_at`). Uske baad templates/blogs hamesha apne CDN se serve honge — hotlink block ka issue khatam.
- Web Harvest me naya button: **"Upload bank to CDN"** — batch-wise progress ke sath, jo bhi image abhi tak upload nahi hui unhe uthata hai. Jo image fetch na ho ya chhoti/toot-i ho, wo auto `blocked` ho jayegi.
- Naya **"Upload photos"** button: admin apne computer se images choose karke seedha bank me daal sake (category + section chunkar). Ye ImageKit par jaati hain aur turant use ke liye ready.
- Harvest ke waqt bhi nayi images auto upload hongi.

### 2. Sabhi categories ki images
- **"Fill empty categories"** action: jin categories ka bank khaali hai un sab ke liye PDF reference sites + keyword discovery se sites nikaal kar harvest chalega, jab tak har category me kam se kam ~40 usable photos na ho jayein.
- Jahan asli site se photos na mil paayein, wahan niche-accurate stock (Pexels/curated HD) se gap bhara jayega — aur wo bhi CDN par upload hoke bank me hi aayegi, taki har category ke paas apna pool ho.
- Bank bharne ke baad **Bulk Apply (images)** har category par chalega taki templates ki photos category-wise aur non-repeating ho jayein.

### 3. Blogs me category-wise images
- Naya admin action **"Fix blog images"**: har published post ko uske `category_slug` ke bank se naya **hero + 2-3 inline photos** milengi (least-used first, repeat nahi), aur body me photos sahi jagah insert hongi.
- Blog generator me bhi ab loremflickr fallback hata kar bank/category engine pehle rahegi.

### 4. Blog clickable
- Home page par naya **Blog section** (latest 6 posts, category-wise chips) — har card `/blog/$slug` par jayega, plus "View all articles" button.
- Blog list aur post cards par pura card clickable + hover state; post page par next/related posts ke clickable cards.

## Technical notes

- Migration: `harvested_images` me `cdn_url text`, `uploaded_at timestamptz`, `upload_error text`; index `(cdn_url is null)` filter ke liye. Blog posts me gallery already hai.
- `src/lib/images/imagekit.server.ts` (naya): `uploadToImageKit(buffer|url, folder)` — ImageKit `/api/v1/files/upload` private-key auth ke sath, size/format validation.
- `src/lib/harvest.functions.ts`: `adminUploadBankBatch`, `adminUploadFiles`, `adminFillEmptyCategories` server fns (super-admin guard, batch-wise taki timeout na ho).
- `harvest.server.ts` -> `bankImages()` ab `coalesce(cdn_url, url)` return karega, aur jo upload fail hui unhe skip karega.
- `generate.server.ts` + naya `adminFixBlogImages` batch fn bank se hero/gallery set karega aur `markUsed` update karega.
- `src/components/admin/WebHarvest.tsx`: upload progress bar, file-picker, "Fill empty categories", per-category bank count table.
- Home page blog section: `src/routes/index.tsx` me `listPublicPosts` query + card grid (Link to `/blog/$slug`).
