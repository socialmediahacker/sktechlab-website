# Pro-Level Admin System (Businesso-style feature parity)

## Pehle ek zaroori baat

Aapka MEGA file download ho gaya, lekin wo **"Businesso – Business Website Builder SaaS" ka nulled (pirated) CodeCanyon product** hai. Uska code, templates ya admin panel copy karke aapke app me daalna copyright violation hai — main wo nahi karunga aur archive ko extract nahi kiya gaya.

Iske badle: wahi **features** aapke apne SKTECHLAB code me, apne code se banaye jayenge. Aapka maujooda editor **nahi badla jayega** — sirf improve hoga.

## Abhi kya hai

Admin (`/admin`) me ye tabs already hain: Users, Sites, Tickets, Domains, Custom Dev, Categories, Templates, Plans, Commerce, Payments, Reviews, SEO/GEO, Site Settings. Roles system `user_roles` + `has_role()` par chal raha hai, par sirf `admin` / `user` — granular permissions nahi hain.

## Kya banega (aapki 4 priorities)

### 1. Roles & Permissions
- Nayi roles: `super_admin`, `admin`, `staff`, `support`, `user`.
- Permission matrix (module x action) — admin UI se checkbox se assign.
- Staff admins bana sakein; har staff ko sirf allowed tabs dikhein.
- User impersonation ("Login as user") — sirf super_admin, har impersonation activity log me.
- Activity log: kaun, kab, kya badla.

### 2. Domains System
- Free subdomain: availability check + reserve + instant live `/s/<name>`.
- Custom domain request: user domain add kare → CNAME/A record instructions dikhein → verify button DNS check kare → status (pending / verifying / active / failed).
- Admin: saare domains ek list me, manual approve/reject, primary domain set.

### 3. Plans & Billing
- Plan limits enforce: sites count, pages, products, storage, AI credits.
- Limit cross hone par clear upgrade prompt (silent fail nahi).
- Upgrade / downgrade / renewal + expiry reminders.
- Invoices: number, date, amount, GST field, download.
- Admin: kisi bhi user ka plan manually assign / extend / cancel.

### 4. Mail / SMS / WhatsApp Templates
- Admin se editable templates (OTP, welcome, plan purchase, plan expiry, domain approved, order placed).
- Variables ({{name}}, {{plan}}, {{otp}}) ke saath preview aur test-send.
- Har channel (WhatsApp / SMS / Email) alag enable/disable.
- Delivery log: kya bheja, kis ko, success/fail.

### 5. Editor (sirf improvement, rewrite nahi)
Maujooda click-to-edit editor waisa hi rahega. Sirf:
- Crash-safety (invalid content par fallback, autosave).
- Undo/redo history reliability.
- Save/publish status clear indicator.
Koi naya editor engine nahi banaya jayega.

## Technical notes

- DB: `permissions`, `role_permissions`, `activity_logs`, `invoices`, `message_templates`, `message_logs` tables; `app_role` enum extend; `domain_requests` me verification fields. Har table par GRANT + RLS.
- Server functions (`createServerFn`) me role check — UI-only gating nahi.
- Impersonation short-lived aur logged; super_admin only.
- Admin UI maujooda tabs pattern par hi extend hoga (nayi tabs: Roles, Activity, Templates, Invoices).

## Order of work

1. Roles & permissions (DB + admin UI + server-side enforcement)
2. Plans, limits, invoices
3. Domains flow (subdomain + custom domain verify)
4. Message templates + logs
5. Editor stability polish
