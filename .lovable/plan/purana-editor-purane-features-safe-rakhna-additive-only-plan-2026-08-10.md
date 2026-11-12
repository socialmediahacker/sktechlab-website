# Purana editor + purane features safe rakhna (additive-only plan)

Aage ka saara admin kaam **additive** hoga. Jo abhi kaam kar raha hai use rewrite nahi karunga — sirf naye tabs/panels add honge.

## Kya bilkul nahi chhedunga (freeze list)

- `dashboard.sites.$id.edit.tsx` (1099 lines) — purana visual/click-to-edit editor, undo/redo, responsive toggles
- `preview.live.tsx` (322 lines) — live preview canvas + inline edit bridge
- Editor ke supporting files: `ElementInspector`, `WidgetLibrary`, `paths.ts`, media upload
- Poora site renderer: `SiteRenderer.tsx`, variants, store, rail, portfolio, pages, backdrop, depth6d
- User dashboard (`dashboard.tsx`) ke sabhi maujuda cards/flows

In files me sirf tabhi haath lagega jab aap khud koi bug/feature bolein — tab bhi targeted fix, full rewrite nahi.

## Main admin ke purane 13 tabs bhi waise ke waise

Users, Sites, Tickets, Domains, Custom Dev, Categories, Templates, Plans, Commerce, Payments, Reviews, SEO/GEO, Site Settings — inka code (`admin.tsx` ke andar ke components) as-is rahega. Naye 4 tabs (Roles & Access, Invoices, Mail/SMS, Activity) alag files me hain (`src/components/admin/*`), isliye purane tabs par koi asar nahi.

## Bacha hua kaam (sirf add karna hai)

1. **Domains tab me verification UI jodna** — maujuda Domains table ke andar do naye buttons: "DNS instructions" (token + A/CNAME record dikhaye) aur "Verify now" (DNS check chala kar status update kare). Table ka purana approve/reject flow same rahega.
2. **User dashboard me Invoices/Billing card** — naya card jodna jisme user apne invoices, plan validity aur expiry dikhe. Baaki dashboard untouched.
3. **Permission-based tab visibility** — staff/support login par sirf allowed tabs dikhein; super admin ko sab. Yeh sirf `TabsTrigger` ke around conditional hai, tab ka andar ka code nahi badlega.
4. **Plan expiry + notification hooks** — plan purchase/approve hone par invoice auto-ban jaye aur Mail/SMS template se message log ho. Purana payment approve flow wahi rahega, bas uske end me hook lagega.

## Technical note

Naya kaam sirf in jagahon par: `src/components/admin/*` (naye files), `admin.tsx` me chhote insert points (tab list + Domains action buttons), `dashboard.tsx` me ek naya card, aur `admin.functions.ts` (already bana hua). Koi bhi purani file rewrite nahi hogi.
