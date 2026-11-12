# Bug Fixer (Admin)

Admin ke liye ek naya "Bug Fixer" section, jisme aap bug likh sako, app usko ek ready-made report bana de, aur ek click me copy karke Lovable chat me paste kar sako. Har bug app me save bhi hoga with status.

## Admin me kya milega

Nayi tab: **Bug Fixer** (Tickets ke paas).

1. **Naya bug report form**
   - Title (chhota naam)
   - Kaha aa raha hai: page/URL (ya "abhi wale page" ka auto-fill)
   - Kya hona chahiye tha / kya ho raha hai
   - Steps (1, 2, 3...)
   - Kis device par: mobile / desktop / dono
   - Kitna zaroori: low / medium / high
   - Screenshot ya file attach (optional, existing upload system se)

2. **Auto-collected details** (form ke sath apne aap jud jayenge)
   - Browser + device info
   - Screen size
   - Last ke browser console errors (app me pehle se capture hote hain jitne mil jayein)
   - Time aur logged-in admin

3. **Copy-ready report**
   - Form bharte hi ek clean text block ban jata hai (title, steps, expected vs actual, device, errors, links)
   - **Copy report** button — ek click me clipboard par
   - **Copy short version** — chhota version
   - Screenshot link bhi report ke andar aa jata hai

4. **Bug list**
   - Sabhi bugs table me: title, priority, status, date
   - Status: New → Sent to Lovable → Fixed → Won't fix
   - Row kholke pura report dekho, dobara copy karo, ya delete karo
   - Filter by status/priority

## Credits ke baare me

App ke andar bug save karna aur report banana bilkul free hai — isme koi AI nahi chalti, isliye koi credit nahi katega. Credit sirf tab lagta hai jab Lovable chat me kaam karwaya jata hai (ye Lovable ka apna billing hai, app ise control nahi kar sakti). Isliye ye tool report ko itna saaf aur poora banata hai ki Lovable ko ek hi baar me fix karna pade — bar-bar samjhane wale rounds bachte hain.

Agar aap chahein to baad me ek optional "AI se report sudhaaro" button bhi add kar sakte hain, par default me wo band rahega taki kuch bhi extra kharch na ho.

## Technical notes

- Migration: `bug_reports` table — `id`, `title`, `page_url`, `expected`, `actual`, `steps`, `device`, `priority`, `status`, `attachments jsonb`, `diagnostics jsonb`, `report_text`, `created_by`, `created_at`, `updated_at`. GRANTs (`authenticated`, `service_role`), RLS enabled, policies `app_private.has_role(auth.uid(), 'admin')` for select/insert/update/delete. `update_updated_at_column()` trigger.
- `src/lib/bug-reports.functions.ts`: `adminListBugReports`, `adminCreateBugReport`, `adminUpdateBugReport` (status/priority/notes), `adminDeleteBugReport` — sab `assertAdmin` (`@/lib/admin.server`) ke through, existing admin functions jaisa pattern.
- `src/components/admin/BugFixerAdmin.tsx`: form + list, `MediaUploadButton` for screenshots, report text client side banega (pure string template, koi AI call nahi), `navigator.clipboard.writeText` for copy.
- `ADMIN_TABS` me `{ value: "bugs", label: "Bug Fixer", module: "tickets", Icon: Bug, Panel: BugFixerAdmin }` Tickets ke baad.
- Diagnostics: `navigator.userAgent`, viewport, aur window par jo recent console errors buffer milte hain (ek chhota global error listener add hoga jo last 20 errors rakhega, memory me).
