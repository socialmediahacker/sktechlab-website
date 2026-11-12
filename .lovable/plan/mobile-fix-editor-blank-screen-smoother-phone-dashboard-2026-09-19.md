# Mobile fix: editor blank screen + smoother phone dashboard

## Jo test me mila (390px phone width par live check)

- **Admin page (`/admin`)**: 6 second tak screen bilkul khaali (aapke screenshot jaisa), 12 second
  baad content aata hai. Wajah — page khulne se pehle ek saath 12 badi list (categories, plans,
  users, templates, sites, tickets, invoices, gateways…) load hoti hain, aur jab tak sab poori
  nahi hotin tab tak kuch bhi draw nahi hota. Phone par internet thoda slow ho to ye "blank page"
  ban jaata hai.
- **Editor (`/dashboard/sites/.../edit`)**: phone par default tab **Preview** khulta hai, yaani
  seedha bhaari site-preview frame. Site data aane tak sirf "Loading editor…" ek line hoti hai aur
  preview frame apne paint hone tak kaala/khaali dikhta hai — user ko lagta hai page blank aa gaya.
- Dashboard me site/template cards `aspect-[4/3]` full-width hain, isliye phone par thumbnail
  bahut bada dikhta hai aur list scroll karna lamba ho jaata hai.

## Fix 1 — blank screen khatam

- Admin page turant khulega: sirf zaroori data pehle, baaki har tab ka data tab khulne par load
  hoga. Load hote waqt asli layout ka skeleton (halka shimmer) dikhega, khaali safed screen nahi.
- Editor phone par **Edit** tab se khulega (preview ek tap door). Data aane tak editor ka skeleton
  + "Aapki site khul rahi hai…" dikhega.
- Preview frame ke upar tab tak ek loader overlay rahega jab tak site render na ho jaye; 15 second
  me na khule to "Dobara koshish karein" button.
- Agar site load fail ho jaye to khaali screen ki jagah saaf message + Retry.

## Fix 2 — phone par sab kuch slide ho ke aaye

- **Dashboard/Admin options**: abhi accordion upar-niche khulta hai. Naya behaviour — option par tap
  karte hi wo section **side se slide hoke** full-screen panel ki tarah khulega, upar back arrow +
  section ka naam, andar smooth scroll, back karte hi wapas list. Swipe-right se bhi back.
- Panel ke andar heading sticky rahegi, buttons 44px+ touch size, koi horizontal overflow nahi.
- **Editor**: neeche ka Edit / Preview / Settings / Save bar wahi rahega, par tab badalne par
  content slide ho ke aayega; section fields bhi slide-in panel me khulenge, aur Inspector bottom
  sheet drag handle ke saath.
- Motion halki rahegi aur "reduce motion" setting honeepar band.

## Fix 3 — thumbnail chhota aur sahi

- Site/template cards phone par **list row** ban jayenge: left me chhota 96×72 thumbnail (rounded,
  object-cover, lazy, blur placeholder), right me naam + status + actions. Desktop par grid jaisa
  hai waisa hi.
- Thumbnail load na ho to category-wise fallback image, uske baad naam wala colour block — toota
  hua icon kabhi nahi.
- Thumbnail width ke hisaab se chhoti image maangi jayegi (phone par 400px), isse list tez khulegi.

## Technical notes

- `src/routes/_authenticated/admin.tsx`: loader se 12 `ensureQueryData` hataa kar 2-3 core rakhna,
  baaki panels ke andar `useQuery` (tab-level). Route par `pendingComponent` + `pendingMs: 0`.
- `src/components/admin/AdminShell.tsx`: `AdminAccordionNav` ki jagah `AdminMobileStack` —
  list ↔ full-screen slide panel (framer-motion x-slide + `AnimatePresence`), back header, swipe-back.
  `AdminLayout` desktop branch unchanged.
- `src/routes/_authenticated/dashboard.sites.$id.edit.tsx`: initial `pane` = mobile par `"edit"`
  (`useIsMobile`), `isLoading` par skeleton component, iframe `onLoad` se pehle overlay + timeout
  retry, query par `retry: 1` aur error UI.
- `src/routes/_authenticated/dashboard.tsx` + `src/lib/thumb.ts`: mobile list-row card variant,
  `templateThumb(t, 400)`, `aspect-[4/3]` sirf `sm:` se upar.
- Sirf frontend/layout changes — koi backend, data ya business logic change nahi.

## Verify

390px Playwright par: `/admin` pehle 1s me visible content, har section slide panel khulna;
editor pehle paint par Edit panel + skeleton, preview overlay; dashboard list me thumbnail
96px, horizontal overflow 0.
