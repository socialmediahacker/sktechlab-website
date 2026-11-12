# Book Service instead of View Plans (Digital Marketing & GMB Boost)

## What changes on the home page

In the "Digital Marketing & GMB Boost" section (the two big cards):

- Remove the price lines "Starting ₹9,999/mo" and "Starting ₹4,999/mo".
- Replace the "View plans" buttons with "Book service".
- Clicking "Book service" opens a small popup form instead of going to the plans page.

Nothing else on the home page changes — same design, colours, layout, text and images.

## The booking form

Fields (all in one popup):

- Email (required, validated)
- WhatsApp number (required, 8-15 digits)
- Website URL (optional)
- Description / what you need (required, min 10 characters)

The service name (Digital Marketing or GMB Boost) is attached automatically.
After sending, the user sees a thank-you confirmation and the form closes.

## Where it reaches the admin

Each booking does two things:

1. Saved in the database so it shows in Admin under a new "Service bookings" list
   (service, email, WhatsApp, website, message, date, and a New / Contacted / Closed status).
2. Emailed to the admin address already configured in Site Settings, using the existing
   enquiry email flow, with the sender's email as reply-to.

## Technical notes

- `src/routes/index.tsx`: in the services section (~lines 694-740) drop the two
  `Starting ₹…` spans, swap the two `<Link to="/services/...">` buttons for buttons that
  open a new shared `BookServiceDialog` with `service="digital_marketing" | "gmb_boost"`.
  No other part of the file is touched.
- New `src/components/book-service-dialog.tsx`: shadcn `Dialog` + `Input`/`Textarea`,
  client-side validation, submits through a new server function.
- New `src/lib/service-booking.functions.ts`: `submitServiceBooking` (public POST,
  zod-validated) inserts into `service_bookings` via the admin client and then calls the
  existing `new-enquiry` template through `sendTemplateEmail` to the
  `site_settings.email_admin_recipient` address. Returns only `{ ok: true }`.
- Migration `service_bookings`: `id uuid pk`, `service text`, `email text`, `whatsapp text`,
  `website_url text`, `message text`, `status text default 'new'`, `created_at timestamptz`.
  GRANTs: `SELECT, UPDATE, DELETE` to `authenticated`, `ALL` to `service_role`, no anon
  access. RLS on: admin-only policies using `app_private.has_role(auth.uid(),'admin')`.
  Inserts happen server-side with the admin client, so no public insert policy.
- Admin: a "Service bookings" card inside the existing Tickets/Messages area of
  `src/routes/_authenticated/admin.tsx`, listing rows newest-first with a status selector.
- `/services/digital-marketing` and `/services/gmb-boost` pages stay as they are; only the
  home-page entry points change.
