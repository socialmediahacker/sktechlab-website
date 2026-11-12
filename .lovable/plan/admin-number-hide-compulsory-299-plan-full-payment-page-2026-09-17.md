# Admin number hide + compulsory ₹299 plan + full payment page

## 1. Admin login page se number hatana

`/admin-login` par abhi input ke andar example ke taur par asli admin number dikh raha hai. Use hata kar neutral text ("Enter admin ID") kar denge. Label bhi "Admin ID" rahega, koi hint number nahi.

## 2. Site banane ke plan step me ₹299 compulsory plan

Abhi builder ke plan step me teen plan aate hain aur pehla ₹0 (Free) hai, isliye koi bhi bina paise ke aage nikal jata hai.

Badlav:
- Ek base plan **₹299 / month** (Website Essential) banayenge jo har site ke liye compulsory hai — plan step par ye default select rahega aur ₹0 wala Free plan hata denge (deactivate).
- Upar ke plans (Pro / Business) optional upgrade ke roop me dikhte rahenge; user base ya koi upgrade chun sakta hai, par kuch na kuch chunna zaroori hai.
- Continue tabhi chalega jab plan select ho (abhi bhi hai) — aur ab koi free option na hone ki wajah se hamesha paid hoga.

## 3. Admin se plan price change + naye plans add

Admin → Plans tab me site-subscription plans ki list, price, name, tier, features, sort order aur active/inactive edit ho sakenge, aur "Add plan" se naye plan jodne ka option milega. Base (compulsory) plan ko mark karne ke liye ek "Base plan" toggle hoga — builder wahi plan default/compulsory dikhayega, aur uski price admin jab chahe badal de (₹299 → kuch bhi).

## 4. Payment page par poora total + details

Payment step abhi sirf "free trial start" button dikhata hai. Usko asli payment page banayenge:

- **Order summary**: business name, chuna hua design/template, domain (free subdomain ya custom), plan ka naam + price, Shop add-on liya hai to uski price, aur **Total** (plan + shop add-on).
- **Payment methods**: jo admin ne on kiye hain wahi — UPI / QR, bank transfer, crypto, Razorpay link. UPI ID / QR / wallet address copy karne ke buttons.
- **Proof**: transaction/UTR reference + screenshot upload.
- Submit karte hi payment record ban jayega (admin ke Payments tab me "pending" aayega) aur user **Done** screen par chala jayega — site create/finalize wahi hoga jaise abhi hai; admin approve karte hi plan active ho jayega.

## 5. "Site create" hamesha naye se shuru

Dashboard / home ke "Create site" par har baar ek nayi builder session banegi (purani adhuri session resume nahi hogi), yani flow pehle step (business details) se dobara shuru hoga.

## Technical notes

- `src/routes/admin-login.tsx`: placeholder text hatana.
- Migration: `service_plans` (site_subscription) me Free plan `sort_order`/active off, ₹299 base plan insert, aur ek `is_base` (ya `entitlements.base = true`) flag add — builder isse default/compulsory plan uthayega.
- `src/routes/start.tsx` `PlanStep`: base plan auto-select, free plan filter, total calculation same rahega.
- `src/routes/start.tsx` `PaymentStep`: naya summary + gateway UI, `getBillingConfig` / `submitMyPayment` (already `src/lib/billing.functions.ts` me hain) reuse karenge; `requestManualInvoice` ko order ke saath call karenge taki session `payment_status` set ho.
- Admin Plans tab (`admin.tsx`) me base-plan toggle + add/edit form extend.
- Builder entry points par nayi session force (existing `sessionId` localStorage/query resume clear).
