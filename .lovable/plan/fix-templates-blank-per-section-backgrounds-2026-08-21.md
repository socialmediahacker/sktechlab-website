# Fix "templates blank" + per-section backgrounds

## What I found (checked live)

Templates database me sahi hain — 877 demos, thumbnails 0 missing, category pages
(`/categories/salon`, `/categories/car-rental`, `/categories/mehndi-art`) sab load ho rahe hain
aur home page ke dono strips bhi bhare hue hain.

Problem demo page kholne par hai. `/preview/<id>` open karke scroll karne par sections DOM me
maujood hain (features, services, portfolio, contact…) lekin screen par sirf khaali dark/blank
patti dikhti hai — content paint hi nahi hota. Wajah section wrapper ka scroll animation hai
(`ScrollScene` in `src/lib/site-renderer/motion.tsx`): wo scroll progress se `opacity` ko 0 se
shuru karke end par 0.55 par le jaata hai aur saath me bade 3D transforms (`y`, `scale`,
`rotateX/rotateY`, `preserve-3d`) lagata hai. Tall sections (portfolio ~3300px, services ~1580px)
me progress der se badhta hai, isliye poora section screen par hote hue bhi invisible/khiska hua
rehta hai — yahi "sab gayab" hai. Hit-test me viewport center par section element milta hi nahi.

## Fix 1 — content kabhi gayab na ho

- `ScrollScene` ko safe banana: entry par ek short fade/rise reveal (once, `viewport margin` ke
  saath), uske baad opacity permanently 1 — scroll ke saath sirf halka parallax/scale (max ±20px,
  scale 0.99–1.02). Exit-fade (0.55) hata dena.
- Tall sections (viewport se lambi) ke liye transform bilkul off — sirf reveal.
- `PinnedScene` aur `ScrollDrift` par bhi wahi rule: transform sirf visual polish, content hamesha
  visible.
- `prefers-reduced-motion` aur mobile (lite motion) par pehle jaisa simple reveal.
- Verify: 3 alag layouts (editorial, bento, neon) ke demos ko browser me scroll karke screenshot —
  har section ka text/photo visible hona chahiye, koi 900px+ blank gap nahi.

Saath me chhote bugs jo isi pass me theek honge:
- Editorial hero ke neeche ka bada khaali gap kam karna.
- Stats section me `0+` / `0.k` dikh raha hai (CountUp value parse) — sahi numbers dikhenge.

## Fix 2 — background sirf ek jagah nahi, har section ka apna

Abhi ek hi site-wide background video/image poore page ke peeche fixed lagta hai. Naya system:

- Har section ka apna optional background: video, image, solid colour, gradient — apne overlay
  aur visibility (opacity) ke saath. Site-wide background bhi rahega, section wala uske upar
  override karega.
- Editor me: section select karo → "Background" tab (Simple Mode aur advanced editor dono me) →
  upload/URL/generate, colour, gradient, overlay slider, visibility slider, remove.
- Demo generator har category ke demos me background media alag-alag sections par baantega
  (hero, showcase, booking/CTA, gallery) — ek hi jagah sab nahi, taki page me alag-alag
  backgrounds dikhein.
- Purani sites bina kisi change ke waise hi render hongi (sab fields optional).

## Technical notes

- `src/lib/site-renderer/motion.tsx`: `ScrollScene` rewrite (reveal-first, opacity floor 1,
  tall-section bypass); `PinnedScene`/`ScrollDrift` clamp.
- `src/lib/site-renderer/types.ts`: `Section` par optional
  `bg?: { video?, image?, color?, gradient?, overlay?, opacity? }`.
- `src/lib/site-renderer/SiteRenderer.tsx`: har section wrapper me `SectionBackdrop` render
  (existing `CinematicBackdrop` ko non-fixed mode me reuse).
- `src/components/editor/BackgroundPanel.tsx`: brand + section dono modes support kare;
  `SectionForm.tsx` / `SimpleMode.tsx` me per-section Background block.
- `src/lib/design/demo-content.ts`: background media ko multiple sections par distribute karna,
  phir sab demos ka ek rebuild pass.
