> Latest upgrade: read **README-DOMAINS-SHOP.md** first. This version includes a required SQL migration, dashboard/shop/domain checkout changes, seven structural template directions and Razorpay policy preparation. It supersedes the earlier setup and validation notes below. Current automated suite: 40 passing tests; full build/live validation remains pending because dependency downloads are blocked in this environment.

# SK Tech Lab — Project Studio upgrade

This ZIP contains the updated React / TanStack Start application source, Supabase integration, existing migrations, eight editable project examples and bundled fallback graphics. It is an application source package, not a PHP/cPanel upload or a complete live database/media backup.

## What's included

- Admin → **Projects & templates**: blank project creation, eight signature starters, validated project JSON import, export, duplicate, category/search/type filters, sorting, cover uploads, metadata editing, premium label, previews and deletion confirmation.
- Starter designs: digital studio, restaurant, beauty salon, architecture/interiors, fitness, clinic, hotel and fashion. They use different palettes, typography and layouts with the existing animated renderer. Starter content contains no invented customer testimonials or business performance claims.
- Customer site administration: live desktop/tablet/mobile preview including unsaved edits, content undo/redo (last 50 edits), project export, logo upload, theme and layout controls, existing sections, enquiry and entitled shop tools.
- User dashboard: refreshed welcome panel, website search/status filters and a compact category/template picker.
- Shared workspace navigation now supports section search on desktop and mobile.
- Imported and manually authored template designs retain their colours, photos and section order through catalogue preview and site creation. Personalisation still updates business copy.
- Missing template visual slots receive category photos. Failed image requests receive bundled category graphics. Other marketing/dashboard images also have a local error fallback. The missing support icon is now bundled.
- Fixed undeclared `framer-motion` imports to use the already declared `motion/react` package.
- Preview "Use" actions now enter the standard builder/account/plan flow. A design chosen in the catalogue is carried into the design step instead of silently disappearing.
- Preview messages require the same origin and parent window. Project creation and metadata updates require authenticated administrator access and write activity records. Existing owner access, payment verification and version-checked site saves remain in use.

## Quick start with your existing project

1. Back up the deployed project and database before replacing source files.
2. Import the updated source into your existing Lovable-connected project, or use the deployment setup already configured for this TanStack application.
3. Keep the existing Supabase database, authentication configuration, server environment variables and storage buckets. Apply the new domain/shop migration described in README-DOMAINS-SHOP.md. The original project-library features below reuse the existing template JSON fields.
4. Sign in using your existing admin account at `/admin-login`, then open `/admin` → **Projects & templates**.
5. Choose **Signature starters**, pick a design, select an existing category and click **Add to catalogue**. Alternatively choose **New project**, or import one of the `projects/*.json` files.
6. Open **Design** to edit sections, branding and photos. Save the template and preview it.
7. A customer selects a template, completes the existing builder/account/plan process, and manages their independent website at `/dashboard/sites/<site-id>`.

Adding a starter is deliberate: the eight supplied files are ready to import, but are not automatically inserted into your live database. Template changes do not overwrite already-created customer site documents.

## Your own prebuilt projects

Create a blank project or start from a signature design. Add and edit supported sections in the template editor, then **Export** its JSON. Import that file to reuse it in the catalogue. Customers can also export their site document from site administration.

Import accepts `sktechlab-project-v1` JSON, raw site documents or objects containing `content_json`, up to 2 MiB and 80 sections. Images should use durable URLs or bundled `/images/...` paths. The included `projects/` examples show the format.

Supported sections: hero, features, statistics, products, menu, gallery, testimonials, pricing, team, showcase, portfolio, booking, FAQ, call to action and contact.

An arbitrary HTML/PHP/React source ZIP or WordPress theme is not automatically editable. Convert its design/content into these sections first. This importer never executes uploaded scripts. The premium switch is a catalogue label; it does not introduce a new billing entitlement.

## Configuration and hosting

Use Node 24 (recommended) and the existing npm lockfile:

```sh
npm ci
npm test
npm run typecheck
npm run build
```

Use `npm run dev` for local development. The existing Vite/Lovable configuration owns the deployment target; keep that configuration when importing back into the same project.

Required Supabase variables include server-side `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, plus the existing `VITE_SUPABASE_URL` and publishable client key used by `src/integrations/supabase/client.ts`. Do not put the service-role key into a `VITE_` variable. Keep the original provider, email, payment and image-upload integrations configured through the existing admin screens and server environment.

For a new database, the migrations describe the application schema, but the existing account records, catalogue data, site content and uploaded media must be exported/migrated separately. This ZIP does not contain a live database dump, users' passwords or your provider dashboard secrets. No shared admin password was added.

## Validation performed

- `npm test`: **40 tests passed in the latest suite**. Covers project round trips, all starters, independent copies, design preservation, invalid/executable document rejection, UTF-8 limits, missing image completion, local fallback paths and existing payment/site-admin rules.
- All 124 `.ts` source files parsed successfully with Node's TypeScript transformation support. This is syntax validation, not a TypeScript type check or TSX compilation.
- All nine bundled SVG files passed XML parsing.
- Full dependency installation was blocked in the editing environment: npm registry access returned HTTP 403. Consequently production build, TypeScript type checking, visual browser verification and authenticated/live database flows were **not completed** here. `npm run build` could not start because Vite was unavailable.
- Real sign-in, uploads, publishing, domain setup and payment capture still require a configured deployment and authorized accounts. Verify them on staging before updating production.
