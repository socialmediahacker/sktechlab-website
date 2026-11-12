# User Admin me Payments + Order/Payment Accept (E-commerce)

Abhi user dashboard ke Store panel me sirf Products, Collections, Coupons, Orders hain aur storefront checkout hard-coded **Cash on Delivery** hai. Main admin jaisa payment setup user ke apne store ke liye nahi hai. Ye plan wahi capability store owner ko deta hai.

## Kya banega

### 1. Store me naya "Payments" tab
Har site (store) ke liye owner apne payment methods configure karega:
- **Cash on Delivery** — on/off, min/max order value
- **Manual UPI** — UPI ID, payee name, QR image (upload ya URL)
- **Bank transfer** — account name, number, IFSC, bank
- **Crypto** — wallet address, network, QR image (upload)
- **Razorpay** — key id + key secret (owner ka apna account), test/live toggle
- Har method ke liye enable/disable, display name, buyer ke liye instructions text

Sab jagah image ke liye upload button (QR ke liye), sirf URL field nahi.

### 2. Storefront checkout me ye methods dikhenge
- Checkout par sirf wahi methods jo owner ne enable kiye
- Manual (UPI/bank/crypto) chunne par: QR + details dikhengi, buyer **UTR / transaction reference** aur **payment screenshot upload** karega
- Order `payment_status = pending` ke saath banega aur proof order par save hoga
- COD pehle jaisa kaam karega
- Razorpay configured ho to online checkout, warna wo option hidden

### 3. Orders tab me payment accept/reject
- Har order par payment proof (screenshot + UTR) dikhe
- **Accept payment** → paid, **Reject** → failed + reason
- Partial/refund mark, admin note
- Filters: payment status, fulfillment status, date; search buyer/order no
- Payments summary: pending verification count, paid revenue, method-wise breakdown
- Buyer ko WhatsApp par order/payment update bhejne ka quick button

### 4. Access rules
- Ye sab tabhi dikhega jab user ka **e-commerce plan active** ho (existing entitlement check reuse)
- Owner sirf apni site ke settings/orders dekh sake; main admin ke paas full access rahega

## Technical

- Nayi table `public.store_payment_settings` (site_id unique, per-method JSON config, enabled flags) + GRANT + RLS: owner (site ka user) read/write, `anon` ko sirf safe public columns (UPI id, payee, QR, instructions) — secrets (Razorpay secret) kabhi client ko nahi jayenge, wo sirf server function me padhe jayenge.
- `orders` me payment proof fields: `payment_reference`, `payment_proof_url`, `payment_verified_at`, `payment_rejected_reason` (migration).
- Server functions: `getStorePaymentMethods` (public, safe fields only), `saveStorePaymentSettings` (owner auth), `submitOrderPaymentProof` (public, order id + proof), `ownerReviewOrderPayment` (owner/staff auth, accept/reject).
- `placeStoreOrder` me `gateway` validation ab site ke enabled methods ke against hoga (abhi fixed enum hai).
- UI: `src/components/store/StorePanel.tsx` me naya `PaymentsTab`, `OrdersTab` upgrade; checkout `src/lib/site-renderer/store.tsx` me method selector + proof upload. Mobile-first cards, existing accordion/style pattern hi use hoga.

## Order of work

1. Migration (settings table + order proof columns)
2. Server functions + entitlement/ownership checks
3. Store panel: Payments tab
4. Store panel: Orders tab payment review
5. Storefront checkout: method selection + proof upload
