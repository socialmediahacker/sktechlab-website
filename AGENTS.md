<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Customer site administration edits the renderer's `content_json` through authenticated, version-checked saves; legacy editor URLs redirect to it to prevent split-document edits.
- Payment gateway switches are projected through an explicit public allowlist; never return gateway configuration wholesale because it can contain credentials.
- Keep existing plan IDs when renaming website tiers so active orders and subscriptions retain their references.
- Site administration reuses owner accounts and the existing change-request queue; do not introduce shared site passwords or duplicate account systems.
- Builder session reads and writes require a hashed browser capability in an HttpOnly cookie; bind ownership before payment and derive payable amounts server-side to prevent session theft and amount tampering.
- Razorpay checkout is confirmed only after signature, provider capture status, order ID, currency and amount verification; never accept a client payment ID as proof.
- Site administration saves content and settings in one version-checked write to avoid partial document saves.
- Manual builder payment reviews use the existing session's plan and submission references; activate only after authenticated admin approval to preserve plan ownership.
- The legacy visual editor lives only at /admin/sites/$id/editor and is gated to admin/super_admin; customers use site admin, whose shop tab appears only with the commerce entitlement.
- Catalogue previews and new-site creation share deterministic template presentation; never apply catalogue restyling to existing saved customer documents.
- Shop workspace colours are locally scoped semantic tokens; reuse existing shop mutations and entitlement checks for all workspace views.
