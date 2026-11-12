# Mobile-first user dashboard + editor (section-wise)

Goal: phone par user dashboard aur editor ek app ki tarah chalein — sab kuch upar se niche **section-wise** khule, side-scrolling tabs aur tang panels na hon.

## 1. Dashboard: section-wise accordion on mobile

Abhi mobile par nav ek horizontal scroll strip hai (`AdminSideNav`) — options chhup jaate hain aur content ek hi lambi tab me aata hai.

Naya behaviour (sirf < lg screens par; desktop bilkul same rahega):

```text
Overview            ▾   <- tap: khulta hai, andar content
My websites         ▸
E-commerce          ▸
New from template   ▸
Domains             ▸
Plan & billing      ▸
Service orders      ▸
Support             ▸
Profile             ▸
```

- Har row: colour tile icon + label + chevron, full width, 48px+ touch target.
- Tap karte hi wahi section inline expand hota hai (smooth open/close), baaki band ho jaate hain; page us row par scroll ho jaata hai.
- Desktop par purana sidebar + right panel layout jaisa hai waisa hi.

## 2. Dashboard content ko phone par fix karna

- Hero: avatar + naam ek line me truncate, plan badge aur Sign out chhote pill me — overflow nahi.
- Stat cards 2-column hi rahenge, numbers chhote font par.
- Andar ke sab `md:grid-cols-3/4` blocks (domains, billing, plans, store, orders, support forms) phone par single column, inputs full width.
- Tables/rows jinme fixed columns hain (invoices, orders, payment history) phone par card-style stacked ho jayenge, horizontal scroll ke bajaye.
- Sticky top par current section ka naam + "Back to menu" button, taaki lambi list se bahar aana aasan ho.

## 3. Editor (site builder) mobile

- Top bar phone par do rows: pehli row Back + site name, doosri row compact icon actions (undo/redo, AI, regenerate, settings, Save). Abhi sab ek row me dabe hue hain.
- Simple Mode hi phone ka default — step strip upar, section list neeche, har section **accordion** ki tarah inline khulega (list → fields ke liye alag jump nahi).
- Section ke fields open hone par preview iframe us section par auto-scroll (already hai) + "Preview" tab par jump karne ka chhota button.
- Inspector (click-to-edit) phone par bottom sheet ki tarah — drag handle, 85vh tak, andar scroll, Done button.
- Bottom bar: Edit / Preview / Inspect + hamesha visible **Save** — safe-area padding ke saath, taaki iPhone home bar na kaate.
- Preview frame phone par full width, device-size selector (desktop/tablet/mobile) chhote icons me.
- Store panel aur widget library phone par single column, grid 5-col header ko scrollable pills me badla jayega.

## Technical notes

- `src/components/admin/AdminShell.tsx`: `AdminLayout` me naya mobile branch — `useIsMobile()` ke basis par accordion render, desktop par current grid. `AdminSideNav` desktop-only ho jayega; mobile ke liye naya `AdminAccordionNav` jo `items` + per-item children leta hai.
- `src/routes/_authenticated/dashboard.tsx`: NAV items ke saath unka panel ek map me bind hoga (`{ value: node }`), taaki accordion aur desktop dono ek hi source se render karen. Baaki logic/queries unchanged.
- Sub-components (`DomainRequests`, `MyBillingCard`, `PayGateways`, `ServiceOrders`, `SupportTickets`, `ProfileSettings`, `StoreAdminTab`) me sirf class-level responsive fixes: `grid-cols-*` → `grid-cols-1 sm:…`, fixed-width inputs → `w-full`, row grids → stacked cards on mobile.
- `src/routes/_authenticated/dashboard.sites.$id.edit.tsx`: header ko `flex-wrap`/two-row par, bottom bar me Save + safe-area, inspector aside ko mobile par fixed bottom sheet.
- `src/components/editor/SimpleMode.tsx`: section list ko accordion me badalna (`editing` state se inline expand), quick actions row wahi rahegi.
- Koi backend/DB change nahi; sirf frontend layout.

## Verify

390px viewport par Playwright se: dashboard ke har section ko khol kar horizontal overflow 0 check, editor me Simple Mode accordion + inspector sheet + Save button reachable confirm.
