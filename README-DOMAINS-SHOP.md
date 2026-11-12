# SKTECHLAB — dashboards, templates, shop checkout and domains

## Read this before enabling payments

This is a source upgrade for the existing TanStack Start / Supabase app. It has not been deployed to your live account. No registrar purchase, live payment, refund or DNS change was made while preparing it. Existing website design documents are not rewritten by a catalogue upgrade.

1. Back up your source, database and uploaded media. Keep your existing Supabase project, storage and authentication settings.
2. Apply the new migration **supabase/migrations/20261112080000_domain_shop_checkout.sql** after the project's existing migrations. It adds the private checkout/domain tables, entitlement expiry and product-limit controls. New paid domain/shop functionality needs this migration; do not enable payment before applying it. Run it against a staging database first.
3. Install with the existing lockfile on Node 24: `npm ci`, `npm test`, `npm run typecheck`, `npm run build`. Deploy the generated server as supported by the existing project's deployment configuration. This is a server application: uploading source to Hostinger `public_html` alone is insufficient. Use a Hostinger plan that runs the required Node server, or a VPS; retain the existing domain and design.
4. Configure business identity and payment secrets below, then test the checkout, webhook, access expiry and permissions on staging before going live.

## What changed

- User dashboard: clearer workspace navigation, accessible shop upgrade entry, full-height shop controls, domain workspace, template previews and independent loading states.
- Admin: operational overview, readable shared navigation, registrar settings, pricing and switches, domain order/reconciliation tools, paid shop activation/recovery and a Razorpay preparation panel under Billing.
- Shop purchase: server-priced orders, verified captured payment, automatic paid activation, explicit billing period, expiry, purchased product-limit snapshots, pending-payment handling and retry verification. A shop included with a website plan or an existing paid add-on is not charged twice. The add-on follows the app's existing account-wide entitlement model; an active website plan is required to manage a shop. A standalone shop purchase does not renew an expired website plan.
- Builder checkout: plan + optional shop + one-year domain are shown together and frozen server-side when checkout begins. Domain renewals are separate and estimated. Session ownership and hashed browser capability remain required. A locked checkout cannot silently switch its paid items.
- Payment recovery: authenticated raw-body Razorpay webhook, exact order/amount/currency/capture checks, replay-safe state transitions and a private domain worker. A browser callback alone is never payment proof.
- Templates: 7 distinct layout/type directions per catalogue category: editorial split, noir luxury, modular bento, cinematic, organic boutique, neon and Swiss grid. 69 built-in category definitions support these directions. These are seven reusable layout families with category-specific content, rather than 483 separately hand-authored renderer files. Catalogue cards use lightweight composition illustrations; open Live demo for the rendered website. Preview and new-site creation use the same stable sibling order. Imported/authored `presentation: preserve` projects keep their document styles.
- Images: missing slots filled at render time; a failed optimiser can retry the original image host, then a category photo and bundled category artwork. These bundled fallbacks work without a third-party image service. External photos remain external URLs; the package does not claim every remote stock image is permanently available or downloaded. Replace essential brand photography with your own uploaded assets before launch.
- Motion: depth/tilt and cinematic layouts reuse the app's existing motion system, with lightweight behaviour on phones and reduced-motion handling. “6D” describes the depth styling; it is not a separate display technology.

## Category templates

Open **Admin → Category Studio**. Sync missing catalogue categories, then choose **7** designs per category and generate missing demos. Existing categories with 6 demos receive an additional demo; this is deliberate admin operation against your database, not an action already performed on the live site. Preview styling works on existing generated demos after deploying this source. Rebuild generated demos only if you want fresh category copy/images; preserved authored projects and external demos are skipped. Existing customer sites retain their independently saved documents.

Use Projects & templates to import/export native project JSON, add your own prebuilt projects and edit their sections. Arbitrary WordPress/PHP/source ZIPs are not automatically convertible into editable native templates.

## Business identity and policy pages

Set these public build variables with actual verified information, then rebuild. They contain public business details, never payment secrets:

- `VITE_BUSINESS_LEGAL_NAME`: name matching your Razorpay/KYC records.
- `VITE_BUSINESS_ADDRESS`: full actual business address, including postal code.
- `VITE_BUSINESS_SUPPORT_EMAIL`: monitored support email. Default `support@sktechlab.com` must be verified by you.
- `VITE_BUSINESS_PHONE`: monitored business phone. The provided +91 98871 93936 is the default.

No address or registration/GST number has been invented. Until an address is configured, the website says that it awaits verification and the admin preparation panel flags it. Fill it before submitting your live website for review.

Policy links: `/about`, `/contact`, `/pricing`, `/terms-and-conditions`, `/privacy-policy`, `/refund-policy`, `/delivery-policy`. Shop/domain checkouts require policy consent; new standalone orders record the policy version/time. Registrar consent is recorded with the registrant details. Policies distinguish digital delivery, domain registration, DNS, first-year fees, separate renewal, failed delivery and refunds. Confirm that the stated support/refund/delivery timelines match your actual operations before publishing. These pages prepare the site for review; they do not certify legal compliance or guarantee Razorpay approval.

## Razorpay integration

Server secrets (never put these in `VITE_*`, client storage, uploaded JSON or chat):

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `DOMAIN_WORKER_SECRET`: a long random independent secret for your scheduler, not an API key.

Use test keys first. Enable the Razorpay gateway in the existing Admin Payments gateway list; the display preference alone does not enable an unconfigured gateway. Live keys require the applicable Razorpay account activation/review. Submit the live website, matching business information, policy links and any invoice or test-account details requested by your dashboard. Never describe SKTECHLAB as Razorpay's agent or imply guaranteed approval.

Create an HTTPS Razorpay webhook for **payment.captured** at:

`https://YOUR-DOMAIN/api/public/platform-payments`

Set its secret to `RAZORPAY_WEBHOOK_SECRET`. The endpoint validates the exact request body and signature, then confirms the capture using Razorpay's API. It does not perform domain purchases inside the webhook. Use webhook retries; changing the webhook secret while old deliveries are retrying needs an operational plan. Refunds and disputes remain merchant support operations in the Razorpay dashboard; a `refund_required` domain status does not itself issue a refund.

Shop and domain checkouts buy one billing period, without a subscription/mandate. Adding API keys or enabling an auto-pay setting cannot authorise a debit. Any existing recurring flow still needs a customer-authorised mandate, provider confirmation and appropriate subscription setup. Do not infer recurring activation from the presence of keys.

## Domain provider: ResellerClub HTTP API

Hostinger's domain-store UI is not the API used here. The implementation integrates **ResellerClub's official reseller HTTP API**. You need your own reseller account, enabled products/API access, required agreements, API IP allowlist and a funded balance. Domain registration costs money; it is not a free API purchase service.

Server secrets:

- `RESELLERCLUB_RESELLER_ID`
- `RESELLERCLUB_API_KEY`

In **Admin → Domain sales & DNS**:

1. Keep **Domain sales off**, **Sandbox on**, **Automatic registration off** until configured. Sandbox quotes cannot be paid, and this source intentionally never registers sandbox orders.
2. Use Test connection/prices to inspect your provider product keys. Configure each TLD's correct key: `.com` normally uses `domcno`; other products must match the API response for your own account. `.in` and `.co.in` are not sold until an admin sets their correct mapping and enables them.
3. Confirm the registrar account's pricing currency. Set the cost-to-INR multiplier explicitly (1 for INR), markup and any applicable tax with your accountant. The search fetches real one-year registration and renewal costs, and computes INR retail prices in paise. This is not a claim to create a GST invoice.
4. Add the correct registration agreement URL and at least two real authoritative nameservers. These must serve the purchased domain's DNS zone. Do not use example/random nameservers.
5. Complete staging checks, then switch to live mode, enable sales, and enable automatic registration only when ready to pay registrar charges from your reseller balance.

Supported automation: normal ASCII, non-premium `.com`, `.net`, `.org`, `.in`, `.co.in`, 1-year registration, Indian registrant details with a verified account email. Premium names, IDNs, transfers and automatic renewals need separate workflows and are not sold as normal available names.

Search results are live checks, not reservations. Quotes last 15 minutes. The server binds them to the builder capability or authenticated website owner. On paid provisioning it rechecks availability and registrar cost. Unavailable domains or cost increases go to refund/review; unclear registrar responses go to `needs_review`, with no automatic repeat purchase. An active registrar order for the expected domain/customer is required before showing Registered. Registrar verification emails still need the customer's attention.

The registrar receives the owner's accurate name, address, phone and verified email. Provider credentials, full registrar contact data and request URLs are not returned in public configuration/order lists. Configure your provider/DNS/hosting log retention appropriately because provider API authentication is sent according to its documented API protocol.

## Automatic domain queue

On your hosting scheduler/cron, POST every minute to:

`https://YOUR-DOMAIN/api/public/platform-payments`

with header `x-domain-worker-secret: YOUR_DOMAIN_WORKER_SECRET`. Store this value in a private scheduler setting; do not embed it in public files or browser code. The route processes one paid domain per invocation. Allow enough server execution time for provider requests. Increase scheduling capacity deliberately if your sales volume grows.

Turning off domain sales or automatic registration pauses new provider purchases. In-flight external operations cannot be undone by a switch. Use Admin's paid registration action for an intentional one-off paid order, or Recheck for an uncertain existing registration. Never create a second purchase to fix a timeout. If a process stopped before storing a customer/order reference, inspect the reseller portal before deciding on recovery.

Registration creates a pending DNS connection request for the website; it does not automatically create a DNS zone, add all hosting records or mark the domain connected. Configure DNS and use the existing verification tools separately. Domain renewals and refund execution are manual operations in this version.

## Validation completed and remaining

`npm test`: **40 tests passed** in this editing environment. Coverage includes native project validation/design preservation, seven structural directions across all 69 categories, image fallback paths, integer-paise totals, expired/foreign quotes, frozen totals, paid shop rules, included-shop duplicate prevention, month-end expiry, captured payment proof, webhook signature/body tampering and replay, registrar ownership checks, cost changes and no repeat registration after an uncertain result. Provider responses are mocked; no live purchase was sent.

Dependency installation was blocked by HTTP 403 from the npm registry. Therefore production build, full TypeScript checking, browser visual/mobile QA, migration execution against PostgreSQL, authenticated end-to-end flows, live Razorpay events and live registrar purchases were **not verified** here. Complete those in staging before taking live payments. A passing unit suite does not establish those checks.

Primary references used for implementation/setup:
- https://razorpay.com/terms/
- https://github.com/razorpay/markdown-docs/blob/master/payments/dashboard/account-settings/business-website-details.md
- https://razorpay.com/docs/webhooks/validate-test/
- https://manage.resellerclub.com/kb/answer/753 (authentication/IP allowlisting)
- https://manage.resellerclub.com/kb/answer/764 (availability)
- https://manage.resellerclub.com/kb/answer/1029 (reseller costs)
- https://manage.resellerclub.com/kb/answer/804 (customer signup)
- https://manage.resellerclub.com/kb/answer/790 (contact creation)
- https://manage.resellerclub.com/kb/answer/752 (registration)
