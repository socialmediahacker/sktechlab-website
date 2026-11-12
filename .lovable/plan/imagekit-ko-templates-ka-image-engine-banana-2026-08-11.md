# ImageKit ko templates ka image engine banana

Aim: saare templates ki images ImageKit se serve hon (fast, HD, auto-format), regenerate/AI-suggest se images badal jayein, aur poora control Main Admin ke ek naye "Integrations / API" tab se ho.

## Security pehle

Aapne chat me private key paste ki hai. Wo key ab public consider hoti hai — ImageKit dashboard se **roll (rotate)** kar dijiye, aur naya private key main secure secret form ke through save karvaunga (`IMAGEKIT_PRIVATE_KEY`). Public key aur URL-endpoint (`https://ik.imagekit.io/yevm9inmx`) secret nahi hain, wo DB settings me store honge.

## Main Admin: naya "Integrations / API" tab

Admin panel me ek naya tab (module: `settings`, sirf super-admin/permission wale ko):

- Provider cards: **ImageKit** (image CDN + media library), plus placeholders jo pehle se use ho rahe hain (Pexels fallback, AI/Gemini, Voice) — har card par: Enable/Disable toggle, config fields, aur "Test connection" button.
- ImageKit card fields: URL endpoint, public key, default transformation (width/quality/format), web-proxy on/off, "sab templates par force karo" toggle.
- Private key kabhi UI me show nahi hogi — sirf "Configured / Not configured" status.
- Test connection: server par `GET https://api.imagekit.io/v1/files?limit=1` Basic Auth ke saath; result (ok / error message) admin ko dikhega.
- Fallback order settings: ImageKit → Pexels → Unsplash pool → picsum.

## Templates me images kaise badlengi

- Ek naya helper `src/lib/images/imagekit.ts`:
  - `ikUrl(src, {w,h,q})` — agar ImageKit enabled hai to har image URL ko ImageKit ke through pass karta hai (uploaded files direct path se, external URLs web-proxy se), aur `tr=w-…,q-…,f-auto` lagata hai; disabled ho to original URL as-is.
  - Settings ek baar load hoke client par cache hongi (public settings endpoint), taki har image par call na ho.
- `hd-images.ts` ke `hdImage` / `hdImages` isi helper se guzrenge, isliye hero, gallery, portfolio, blog, about, contact, product, rail — sab jagah automatically ImageKit se serve hongi (in sab files me pehle se yehi helpers use ho rahe hain).
- Category-wise pools waise ke waise rahenge; sirf delivery layer badlega, design nahi.

## Regenerate / AI image suggest

- `aiSuggestImage` (server fn) me ImageKit ko pehla source banayenge: ImageKit search API (`/v1/files` with `searchQuery` on tags/name) se aapki apni media library ke matching HD images; kuch na mile to Pexels, phir keyless fallback — sabhi results ImageKit transformation ke saath.
- Site regenerate aur "change image" button me seed rotate hoga taki har baar alag image mile.

## Upload ImageKit par

- `MediaUploadButton` / `uploadMedia` me option: agar ImageKit enabled hai to upload ImageKit ke `/api/v1/files/upload` par jayega (server fn se signed upload token banega, private key server par hi rahegi), folder `sites/<siteId>/`; warna current storage flow chalega.
- Admin aur user dashboard me jahan-jahan sirf image URL field hai wahan upload button pehle se hai — wo automatically naye backend par chala jayega.

## Technical details

- New table `api_integrations` (id, provider unique, enabled bool, config jsonb, updated_at) + GRANTs; read-only public view sirf non-secret fields ke liye (anon SELECT on enabled + config ka safe subset), write sirf super-admin RLS ke through.
- New server fns in `src/lib/integrations.functions.ts`: `listIntegrations`, `saveIntegration` (admin-only), `testIntegration`, `getPublicImageConfig` (anon), `imagekitAuthParams` (signed upload token, auth required).
- Secret: `IMAGEKIT_PRIVATE_KEY` (rotate ke baad) secure form se add hoga; public key + endpoint DB config me.
- Admin UI: `src/components/admin/IntegrationsAdmin.tsx`, `ADMIN_TABS` me register.
- Koi visual/layout change nahi — sirf image source, admin tab, aur upload path.
