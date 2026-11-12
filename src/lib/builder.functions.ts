import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt } from "node:crypto";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";



// ---------- helpers ----------
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

async function getSettings() {
  const db = await admin();
  const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return (data ?? {}) as any;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 24) || "site";
}

// ---------- Step 1: start session ----------
export const startBuilderSession = createServerFn({ method: "POST" })
  .inputValidator((d: { name: string; category?: string; categorySlug?: string; description?: string; sessionId?: string }) =>
    z
      .object({
        name: z.string().trim().min(2).max(120),
        category: z.string().max(120).optional(),
        categorySlug: z.string().max(160).optional(),
        description: z.string().max(2000).optional(),
        sessionId: z.string().uuid().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const { newBuilderAccess, setBuilderAccess, assertBuilderAccess } = await import("@/lib/builder-access.server");
    const access = newBuilderAccess();
    const patch = {
      business_name: data.name,
      business_category: data.category ?? null,
      category_slug: data.categorySlug ?? null,
      description: data.description ?? null,
      current_step: "verify",
    };
    if (data.sessionId) {
      await assertBuilderAccess(db, data.sessionId);
      const { data: updated, error } = await db
        .from("builder_sessions")
        .update(patch)
        .eq("id", data.sessionId)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (updated) return { sessionId: updated.id };
    }
    const { data: row, error } = await db.from("builder_sessions").insert({ ...patch, access_token_hash: access.hash }).select().single();
    if (error) throw error;
    setBuilderAccess(row.id, access.token);
    return { sessionId: row.id };
  });


// ---------- Step 2: OTP ----------
export const sendWhatsappOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; whatsapp: string }) =>
    z.object({ sessionId: z.string().uuid(), whatsapp: z.string().trim().min(6).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const settings = await getSettings();
    const code = String(randomInt(100000, 999999));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await db.from("otp_codes").insert({
      whatsapp: data.whatsapp,
      code_hash: hashCode(code),
      expires_at: expires,
    });
    await db.from("builder_sessions").update({ whatsapp: data.whatsapp }).eq("id", data.sessionId);

    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;
    if (settings.whatsapp_otp_enabled && sid && token && from) {
      try {
        const body = new URLSearchParams({
          To: `whatsapp:${data.whatsapp.startsWith("+") ? data.whatsapp : "+" + data.whatsapp}`,
          From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
          Body: `Your SKTECHLAB verification code is ${code}. Valid for 10 minutes.`,
        });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body,
        });
        if (!res.ok) console.error("Twilio error:", await res.text());
        return { sent: true, demo: false };
      } catch (e) {
        console.error("Twilio send failed:", e);
      }
    }
    // Demo fallback: return code so UI can show it
    console.log(`[BUILDER OTP DEMO] ${data.whatsapp} → ${code}`);
    return { sent: true, demo: true, code };
  });

export const verifyWhatsappOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; whatsapp: string; code: string }) =>
    z
      .object({
        sessionId: z.string().uuid(),
        whatsapp: z.string().trim(),
        code: z.string().trim().length(6),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: rows } = await db
      .from("otp_codes")
      .select("*")
      .eq("whatsapp", data.whatsapp)
      .eq("consumed", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);
    const row = rows?.[0];
    if (!row) throw new Error("OTP expired. Please request a new one.");
    if (row.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
    if (row.code_hash !== hashCode(data.code)) {
      await db.from("otp_codes").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("Wrong code");
    }
    await db.from("otp_codes").update({ consumed: true }).eq("id", row.id);
    await db
      .from("builder_sessions")
      .update({ whatsapp_verified: true, current_step: "generating" })
      .eq("id", data.sessionId);
    return { verified: true };
  });

// ---------- Step 3: generate designs ----------
export const generateDesigns = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: session } = await db.from("builder_sessions").select("*").eq("id", data.sessionId).maybeSingle();
    if (!session) throw new Error("Session not found");

    // 1. category-aware template match
    const cat = (session.business_category ?? "").toLowerCase().trim();
    const q = `${cat} ${session.description ?? ""} ${session.business_name}`.toLowerCase();
    const STOP = new Set(["the", "and", "for", "with", "our", "your", "business", "company", "shop", "store", "best"]);
    const words = Array.from(new Set(q.split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))).slice(0, 10);

    // Smart category resolution — user's words ("gaadi rental", "davai shop")
    // are matched to real categories through the catalogue synonyms.
    const { matchCategories } = await import("@/lib/categories/catalog");
    const { data: catRows } = await db.from("categories").select("id,slug,name");
    const matched = matchCategories(`${cat} ${session.description ?? ""}`, (catRows ?? []) as any[], 3);
    const matchedSlugs = new Set(matched.map((m: any) => String(m.slug)));

    // The customer picks a real category in step 1, so that pick wins outright.
    const chosenSlug = String((session as any).category_slug ?? "").toLowerCase().trim();
    const chosen = (catRows ?? []).find(
      (c: any) => String(c.slug).toLowerCase() === chosenSlug || String(c.name).toLowerCase() === cat,
    ) as any;

    const { data: allTemplates } = await db
      .from("templates")
      .select("id, name, description, thumbnail_url, demo_url, accent_color, is_editable_demo, content_json, archetype, category_id, categories(name, slug)")
      .order("id")
      .limit(1000);

    const pool = (allTemplates ?? []) as any[];

    // exact / partial category match first
    const catMatch = (t: any) => {
      const slug = String(t.categories?.slug ?? "").toLowerCase();
      const name = String(t.categories?.name ?? "").toLowerCase();
      if (chosen && t.category_id === chosen.id) return 100;
      if (!cat) return 0;
      if (!slug && !name) return 0;
      if (slug === cat || name === cat) return 24;
      if (matchedSlugs.has(slug)) return 18;
      if (cat.includes(slug) || (slug && slug.includes(cat.replace(/\s+/g, "-")))) return 14;
      if (name && (cat.includes(name) || name.includes(cat))) return 12;
      return 0;
    };

    // stable-but-varied shuffle seeded on the session id
    let seed = 0;
    for (const ch of String(session.id)) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
    const jitter = (i: number) => (((seed + i * 7919) % 97) / 97) * 3;

    const scored = pool
      .map((t: any, i: number) => {
        const hay = `${t.name} ${t.description ?? ""} ${t.categories?.name ?? ""} ${t.archetype ?? ""}`.toLowerCase();
        const kw = words.reduce((s, w) => (hay.includes(w) ? s + 1 : s), 0);
        const score = catMatch(t) + kw + (t.is_editable_demo ? 4 : 0) + (t.content_json ? 2 : 0) + jitter(i);
        return { t, score };
      })
      .sort((a, b) => b.score - a.score);

    // Tier 1: the exact category the customer selected.
    const exactPicked = chosen ? scored.filter((s) => s.t.category_id === chosen.id) : [];

    // Tier 2: sibling categories from the same business family (a salon customer
    // sees spa/beauty designs, never a car workshop) — used only to top up.
    const { resolveCatalogEntry } = await import("@/lib/categories/catalog");
    const chosenEntry = chosen ? resolveCatalogEntry(String(chosen.slug), String(chosen.name)) : undefined;
    const family = chosenEntry?.family;
    const familyCatIds = new Set(
      (catRows ?? [])
        .filter((c: any) => {
          if (!family || (chosen && c.id === chosen.id)) return false;
          const e = resolveCatalogEntry(String(c.slug), String(c.name));
          return e?.family === family;
        })
        .map((c: any) => c.id),
    );
    const familyPicked = scored.filter((s) => familyCatIds.has(s.t.category_id));

    // Tier 3: anything the words/synonyms matched.
    const strong = scored.filter((s) => catMatch(s.t) > 0 && s.t.category_id !== chosen?.id);

    const seenId = new Set<string>();
    const ordered = [...exactPicked, ...familyPicked, ...strong, ...(exactPicked.length || strong.length ? [] : scored)]
      .filter((s) => (seenId.has(s.t.id) ? false : (seenId.add(s.t.id), true)))
      .map((s) => s.t);

    const picked: any[] = [];
    const seenArch = new Set<string>();
    for (const t of ordered) {
      // diversify by visual design, not by category, so a customer sees
      // several different-looking demos from their own industry
      const a = `${t.content_json?.brand?.layout ?? t.archetype ?? ""}:${t.content_json?.brand?.theme ?? ""}`;
      if (seenArch.has(a)) continue;
      seenArch.add(a);
      picked.push(t);
      if (picked.length === 7) break;
    }
    for (const t of ordered) {
      if (picked.length >= 7) break;
      if (!picked.find((p) => p.id === t.id)) picked.push(t);
    }

    if (picked.length < 7 && !exactPicked.length) {
      // Only pad with unrelated designs when the category itself has no demos.
      const filler = pool.filter((t: any) => !picked.find((p) => p.id === t.id)).slice(0, 7 - picked.length);
      picked.push(...filler);
    }




    for (const template of picked) {
      template.presentationIndex = pool.filter(t => t.category_id === template.category_id).sort((a, b) => a.id.localeCompare(b.id)).findIndex(t => t.id === template.id);
    }

    // 2. AI content (Gemini key first, Lovable AI fallback — see site-editor.server)
    const settings = await getSettings();

    // Category design blueprint — structural recipe from category research.
    const { blueprintsFor, pickBlueprint, blueprintPrompt } = await import("@/lib/blueprints.server");
    const bpList = await blueprintsFor(db as any, cat).catch(() => []);
    const blueprint = pickBlueprint(bpList, String(session.id));

    let ai: {
      headline?: string; tagline?: string; about?: string; primary_color?: string;
      secondary_color?: string; theme?: string; layout?: string; cta?: string; sections?: string[];
    } = {};
    if (settings.ai_generation_enabled !== false) {
      try {
        const { callEditorChat, parseLooseJson } = await import("@/lib/site-editor.server");
        const { MASTER_SYSTEM } = await import("@/lib/ai/master-spec");
        const raw = await callEditorChat(
          [
            {
              role: "system",
              content: `${MASTER_SYSTEM}${blueprintPrompt(blueprint)}

Return ONLY a compact JSON object (no markdown) with keys:
headline (max 8 words), tagline (max 14 words), about (max 45 words), cta (2-3 words, action specific),
primary_color (hex), secondary_color (hex), theme ("light"|"dark"),
layout (one of cinematic|editorial|bento|neon|boutique|brutal that suits this business),
sections (array of 8-10 section type names from: hero3d, features, stats, products, menu, gallery, portfolio, testimonials, pricing, team, showcase, booking, faq, cta, contact — chosen by the category logic).`,
            },
            {
              role: "user",
              content: `Business: ${session.business_name}\nCategory: ${session.business_category ?? "general"}\nDescription: ${session.description ?? ""}`,
            },
          ],
          "google/gemini-3.6-flash",
          true,
        );
        ai = (parseLooseJson(raw) as typeof ai) ?? {};
      } catch (e) {
        console.error("AI copy fallback:", e);
      }
    }
    if (!ai.headline) ai.headline = `Welcome to ${session.business_name}`;
    if (!ai.tagline) ai.tagline = session.description?.slice(0, 100) ?? "Grow your business online";
    if (!ai.about) ai.about = `${session.business_name} — trusted ${session.business_category ?? "service"} in your city.`;
    // Blueprint fills anything the AI skipped so category structure always applies.
    if (blueprint) {
      if (!ai.sections?.length && blueprint.section_order.length) ai.sections = blueprint.section_order;
      if (!ai.layout) ai.layout = blueprint.layout;
      if (!ai.theme) ai.theme = blueprint.palette?.theme ?? "light";
      if (!ai.primary_color) ai.primary_color = blueprint.palette?.primary;
      if (!ai.secondary_color) ai.secondary_color = blueprint.palette?.secondary;
      (ai as any).blueprint = { id: blueprint.id, name: blueprint.name, motion: blueprint.motion, fonts: blueprint.fonts };
    }
    if (!ai.primary_color) ai.primary_color = "#10b981";


    await db
      .from("builder_sessions")
      .update({
        candidate_template_ids: picked.map((p: any) => p.id),
        ai_generated_content: ai,
        current_step: "design",
      })
      .eq("id", data.sessionId);

    return { templates: picked, ai };
  });

// ---------- Step 4: select design ----------
export const selectDesign = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; templateId: string }) =>
    z.object({ sessionId: z.string().uuid(), templateId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: template, error: templateError } = await db.from("templates").select("id").eq("id", data.templateId).maybeSingle();
    if (templateError || !template) throw new Error("This design is no longer available. Choose another project.");
    const { error } = await db
      .from("builder_sessions")
      .update({ selected_template_id: data.templateId, current_step: "domain" })
      .eq("id", data.sessionId);
    if (error) throw new Error("Could not select this design. Please try again.");
    return { ok: true };
  });

// ---------- Step 5: domain ----------
export const getDomainSuggestions = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const settings = await getSettings();
    const { data: rootRows } = await db
      .from("domain_roots")
      .select("root, nameservers, a_record")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    const roots = (rootRows ?? []).map((r: any) => r.root as string);
    if (!roots.length) roots.push(settings.free_subdomain_root ?? "sktechlab.site");

    const { data: session } = await db.from("builder_sessions").select("business_name").eq("id", data.sessionId).maybeSingle();
    const base = slugify(session?.business_name ?? "site");

    // one primary suggestion per root + variants on the first root
    const free: string[] = [];
    for (const r of roots) free.push(`${base}.${r}`);
    const first = roots[0];
    free.push(`${base}-in.${first}`, `${base}site.${first}`);

    // drop already-taken subdomains
    const { data: taken } = await db.from("sites").select("subdomain").not("subdomain", "is", null);
    const used = new Set((taken ?? []).map((s: any) => String(s.subdomain).toLowerCase()));
    const available = free.filter((d) => !used.has(d.split(".")[0]!.toLowerCase()));

    return { free: available, paid: [], roots: rootRows ?? [] };

  });

export const selectDomain = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; domain: string; type: "free_subdomain" | "paid_suggested" | "byo_nameserver" | "buy_with_us"; quoteId?: string }) =>
    z
      .object({
        sessionId: z.string().uuid(),
        quoteId: z.string().uuid().optional(),
        domain: z.string().trim().min(3).max(200),
        type: z.enum(["free_subdomain", "paid_suggested", "byo_nameserver", "buy_with_us"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    await (await import("./checkout.server")).assertCartEditable(db, data.sessionId);
    let domain = data.domain.trim().toLowerCase(), quoteId: string | null = null;
    if (data.type === "free_subdomain") {
      const { data: rootRows } = await db.from("domain_roots").select("root").eq("is_active", true);
      const roots = rootRows?.length ? rootRows.map(r => r.root) : [(await getSettings()).free_subdomain_root || "sktechlab.site"];
      const root = roots.find(r => domain.endsWith(`.${r}`));
      const sub = root ? domain.slice(0, -(root.length + 1)) : "";
      if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(sub) || ["www", "admin", "api", "mail", "dashboard"].includes(sub)) throw new Error("Choose an available platform subdomain.");
      const { data: clash } = await db.from("sites").select("id").eq("subdomain", sub).maybeSingle();
      if (clash) throw new Error("That subdomain is already taken — pick another.");
    } else if (data.type !== "byo_nameserver") {
      domain = (await import("./domains/rules")).normalizeDomain(domain);
      const { data: quote } = await (db as any).from("domain_quotes").select("*").eq("id", data.quoteId || "00000000-0000-0000-0000-000000000000").eq("session_id", data.sessionId).maybeSingle();
      if (!quote || quote.domain !== domain || quote.sandbox || Date.parse(quote.expires_at) <= Date.now()) throw new Error("Check live availability and select a current domain quote first.");
      quoteId = quote.id;
    } else if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/.test(domain) || domain.includes("..")) throw new Error("Enter your owned domain without https or a path.");
    const { error } = await db.from("builder_sessions").update({ selected_domain: domain, domain_type: data.type, domain_quote_id: quoteId, domain_registrant: null, current_step: "shop" }).eq("id", data.sessionId);
    if (error) throw new Error("Could not select your domain.");
    return { ok: true };
  });

// ---------- Step 5: +Shop e-commerce add-on ----------
/** Public read of the add-on offer configured by the master admin. */
export const getEcomAddonOffer = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getSettings();
  return {
    enabled: s.ecom_addon_enabled !== false && Number(s.ecom_addon_price_inr ?? 999) > 0 && Number(s.ecom_addon_product_limit ?? 200) > 0,
    price: Number(s.ecom_addon_price_inr ?? 999),
    billing: String(s.ecom_addon_billing ?? "monthly"),
    label: String(s.ecom_addon_label ?? "Online Shop (+Shop)"),
    desc:
      s.ecom_addon_desc ??
      "Sell products online: catalogue, cart, checkout, orders, coupons, payments and shipping — all managed from your dashboard.",
    productLimit: Number(s.ecom_addon_product_limit ?? 200),
  };
});

/** Store the customer's +Shop choice on the session (price locked at selection time). */
export const selectShopAddon = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; wants: boolean }) =>
    z.object({ sessionId: z.string().uuid(), wants: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    await (await import("./checkout.server")).assertCartEditable(db, data.sessionId);
    const s = await getSettings();
    if (data.wants && (s.ecom_addon_enabled === false || Number(s.ecom_addon_price_inr ?? 999) <= 0)) throw new Error("Shop upgrade is unavailable.");
    const { error } = await db
      .from("builder_sessions")
      .update({
        wants_ecommerce: data.wants,
        ecom_addon_billing: String(s.ecom_addon_billing || "monthly"),
        ecom_addon_product_limit: Number(s.ecom_addon_product_limit || 200),
        ecom_addon_price_inr: data.wants ? Number(s.ecom_addon_price_inr ?? 999) : null,
        current_step: "plan",
      })
      .eq("id", data.sessionId);
    if (error) throw new Error("Could not save shop choice.");
    return { ok: true };
  });



// ---------- Step 6: plan ----------
export const selectPlan = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; planId: string }) =>
    z.object({ sessionId: z.string().uuid(), planId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    await (await import("./checkout.server")).assertCartEditable(db, data.sessionId);
    const { data: plan } = await db.from("service_plans").select("id, price_inr, service_type, ecom_product_limit").eq("id", data.planId).maybeSingle();
    if (!plan || plan.service_type !== "site_subscription" || plan.price_inr <= 0) throw new Error("Choose an available paid Website Plan.");
    await db
      .from("builder_sessions")
      .update({ selected_plan_id: data.planId, current_step: "account", ...(Number(plan.ecom_product_limit) > 0 ? { wants_ecommerce: false, ecom_addon_price_inr: null } : {}) })
      .eq("id", data.sessionId);
    return { ok: true };
  });

// ---------- Step 7: payment ----------
export const requestManualInvoice = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    await db
      .from("builder_sessions")
      .update({ current_step: "payment" })
      .eq("id", data.sessionId);
    return { ok: true };
  });

/** Full order summary for the builder payment page (works before sign-up). */
export const getBuilderOrder = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: s } = await db
      .from("builder_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!s) throw new Error("Session not found");

    let plan: { id: string; name: string; price: number; billing: string } | null = null;
    if (s.selected_plan_id) {
      const { data: p } = await db
        .from("service_plans")
        .select("id, name, price_inr, billing")
        .eq("id", s.selected_plan_id)
        .maybeSingle();
      if (p) plan = { id: p.id, name: p.name, price: Number(p.price_inr), billing: String(p.billing) };
    }

    let template: string | null = null;
    if (s.selected_template_id) {
      const { data: t } = await db
        .from("templates")
        .select("name")
        .eq("id", s.selected_template_id)
        .maybeSingle();
      template = t?.name ?? null;
    }

    const breakdown = await (await import("./checkout.server")).builderBreakdown(db, data.sessionId);
    const settings = await getSettings();
    const addonPrice = s.wants_ecommerce
      ? Number(s.ecom_addon_price_inr ?? settings.ecom_addon_price_inr ?? 999)
      : 0;
    const addonLabel = String(settings.ecom_addon_label ?? "Online Shop (+Shop)");

    return {
      businessName: s.business_name as string,
      category: (s.business_category as string | null) ?? null,
      template,
      domain: (s.selected_domain as string | null) ?? null,
      domainType: (s.domain_type as string | null) ?? null,
      plan: breakdown.plan,
      domainCharge: breakdown.domain,
      registrantSaved: !!s.domain_registrant,
      checkoutLocked: !!s.checkout_locked_at,
      addon: breakdown.addon ? { ...breakdown.addon, label: addonLabel } : null,
      total: breakdown.total,
      paymentStatus: String(s.payment_status ?? "pending"),
    };
  });

/** Customer submits their payment details from the builder (pre-signup safe). */
export const submitBuilderPayment = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      sessionId: string;
      gateway: string;
      amount: number;
      reference?: string;
      note?: string;
      screenshotUrl?: string;
    }) =>
      z
        .object({
          sessionId: z.string().uuid(),
          gateway: z.enum(["manual_upi", "crypto", "bank_transfer", "razorpay", "other"]),
          amount: z.number().nonnegative(),
          reference: z.string().max(120).optional(),
          note: z.string().max(500).optional(),
          screenshotUrl: z.string().max(1000).optional(),
        })
        .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: session } = await db.from("builder_sessions").select("selected_plan_id, wants_ecommerce, ecom_addon_price_inr, user_id, payment_status").eq("id", data.sessionId).single();
    if (!session?.user_id) throw new Error("Set up your site-admin account first.");
    const { data: plan } = await db.from("service_plans").select("price_inr").eq("id", session.selected_plan_id ?? "").single();
    if (!plan || plan.price_inr <= 0) throw new Error("Choose a paid Website Plan first.");
    if (data.gateway === "razorpay") throw new Error("Razorpay payments require secure checkout verification.");
    const { data: gateways } = await db.from("payment_gateways").select("kind, is_enabled");
    const { gatewayKind } = await import("@/lib/payment-methods");
    if (!(gateways ?? []).some(g => g.is_enabled && gatewayKind(g.kind) === data.gateway)) throw new Error("This payment method is currently disabled. Reload payment options.");
    if (!data.reference?.trim() && !data.screenshotUrl?.trim()) throw new Error("Add your payment reference or proof.");
    if (["paid", "verified", "submitted"].includes(session.payment_status)) throw new Error("This payment is already recorded. Refresh checkout.");
    const total = (await (await import("./checkout.server")).builderBreakdown(db, data.sessionId, true)).total;
    const { error } = await db
      .from("builder_sessions")
      .update({
        payment_status: "submitted",
        payment_method: data.gateway,
        payment_ref: data.reference ?? null,
        payment_amount_inr: total,
        payment_proof_url: data.screenshotUrl || null,
        payment_note: data.note ?? null,
        current_step: "success",
      })
      .eq("id", data.sessionId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const bindBuilderAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: session } = await db.from("builder_sessions").select("user_id, whatsapp_verified").eq("id", data.sessionId).single();
    if (!session?.whatsapp_verified) throw new Error("Verify your WhatsApp first.");
    if (session.user_id && session.user_id !== context.userId) throw new Error("This website setup belongs to another account.");
    const { error } = await db.from("builder_sessions").update({ user_id: context.userId, current_step: "payment" }).eq("id", data.sessionId);
    if (error) throw new Error("Could not save your site-admin account.");
    return { ok: true };
  });

// ---------- Finalize: attach to user, create site ----------
export const finalizeBuilderSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) =>
    z.object({ sessionId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: session, error: se } = await db
      .from("builder_sessions")
      .select("*")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (se || !session) throw se ?? new Error("Session not found");
    if (session.user_id !== userId) throw new Error("This setup belongs to another account. Sign in with your site-admin account.");
    if (session.created_site_id) {
      await (await import("./checkout.server")).activateBuilderShop(db, session.id);
      try { await (await import("./domains/provision.server")).fulfillBuilderDomain(db, session.id); } catch { /* retained for admin reconciliation */ }
      return { siteId: session.created_site_id };
    }
    if (!session.whatsapp_verified) throw new Error("Verify your WhatsApp number first.");
    if (!["submitted", "paid", "verified"].includes(session.payment_status)) throw new Error("Complete the payment step first.");
    if (!session.selected_template_id) throw new Error("Pick a template first");

    const { data: claimed, error: claimError } = await db.from("builder_sessions")
      .update({ current_step: "creating" }).eq("id", session.id)
      .neq("current_step", "creating").is("created_site_id", null).select("id").maybeSingle();
    if (claimError || !claimed) throw new Error("Website creation is already running. Retry in a moment.");

    // Update whatsapp on profile
    if (session.whatsapp) {
      await db.from("profiles").update({ whatsapp_number: session.whatsapp }).eq("id", userId);
    }

    // Create site
    const subdomain =
      session.domain_type === "free_subdomain" && session.selected_domain
        ? session.selected_domain.split(".")[0]
        : null;

    // Copy template's content_json (editable demo) if present
    const { data: tpl } = await db
      .from("templates")
      .select("id, category_id, content_json")
      .eq("id", session.selected_template_id)
      .maybeSingle();

    const { personalizeTemplateContent } = await import("@/lib/category-site.server");
    let templateContent = tpl?.content_json;
    if (tpl && templateContent) {
      const { data: siblings } = await db.from("templates").select("id").eq("category_id", tpl.category_id).order("id");
      const index = siblings?.findIndex(t => t.id === tpl.id) ?? -1;
      const { templatePresentation } = await import("@/lib/design/template-presentation");
      templateContent = templatePresentation(templateContent as any, tpl.id, index >= 0 ? index : undefined) as any;
    }
    let personalizedContent = personalizeTemplateContent(templateContent, {
      name: session.business_name,
      category: session.business_category,
      description: session.description,
      ai: session.ai_generated_content as Record<string, unknown> | null,
    });

    // Smart niche-aware photos: every stock image is replaced by a section-
    // specific photo for this exact business (any language / any niche).
    if (personalizedContent && templateContent?.presentation !== "preserve") {
      try {
        const { reimageContent } = await import("@/lib/images/category-images.server");
        const r = await reimageContent(
          personalizedContent,
          {
            category: session.business_category,
            name: session.business_name,
            description: session.description,
          },
          Math.floor(Date.now() / 1000),
        );
        personalizedContent = r.content;
      } catch {
        // keep template images if sourcing fails
      }
    }


    const { data: site, error: siteErr } = await db
      .from("sites")
      .insert({
        user_id: userId,
        template_id: session.selected_template_id,
        name: session.business_name,
        subdomain,
        content: session.ai_generated_content ?? {},
        content_json: personalizedContent,
      })
      .select()
      .single();
    if (siteErr) {
      await db.from("builder_sessions").update({ current_step: "success" }).eq("id", session.id);
      throw siteErr;
    }


    // Attach session
    await db
      .from("builder_sessions")
      .update({
        user_id: userId,
        created_site_id: site.id,
        completed: true,
        current_step: "success",
      })
      .eq("id", data.sessionId);

    // Domain record: free subdomain auto-connects, everything else goes to the admin queue
    if (session.selected_domain && session.domain_type) {
      const isFree = session.domain_type === "free_subdomain";
      const kind =
        session.domain_type === "free_subdomain" ? "free"
        : session.domain_type === "buy_with_us" || session.domain_type === "paid_suggested" ? "buy"
        : "nameserver";

      let record: { record_type?: string; record_name?: string; record_value?: string } = {};
      if (!isFree) {
        const { data: root } = await db
          .from("domain_roots")
          .select("nameservers, a_record")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .limit(1)
          .maybeSingle();
        record = {
          record_type: kind === "nameserver" ? "NS" : "A",
          record_name: "@",
          record_value:
            kind === "nameserver"
              ? ((root?.nameservers as string[] | null) ?? ["ns1.sktechlab.com", "ns2.sktechlab.com"]).join(", ")
              : (root?.a_record ?? "185.158.133.1"),
        };
      }

      await db.from("domain_requests").insert({
        user_id: userId,
        site_id: site.id,
        domain: session.selected_domain,
        kind,
        is_paid_suggestion: kind === "buy",
        builder_session_id: session.id,
        status: isFree ? "connected" : "pending",
        is_primary: true,
        verified_at: isFree ? new Date().toISOString() : null,
        ...record,
      });

      if (isFree && ["paid", "verified"].includes(session.payment_status)) {
        await db.from("sites").update({ published: true }).eq("id", site.id);
      }
    }


    // +Shop add-on: record the request so the master admin can activate it
    if (session.selected_plan_id) {
      const { data: plan } = await db.from("service_plans").select("tier").eq("id", session.selected_plan_id).single();
      const { builderPaymentConfirmed } = await import("@/lib/builder-payment-rules");
      const paid = builderPaymentConfirmed(session.payment_status);
      const { data: existing } = await db.from("service_orders").select("id").eq("notes", `Builder payment: ${session.id}`).maybeSingle();
      if (!existing) await db.from("service_orders").insert({ user_id: userId, plan_id: session.selected_plan_id, status: paid ? "active" : "pending", notes: `Builder payment: ${session.id}` });
      if (paid && plan) await db.from("profiles").update({ active_plan: plan.tier, plan_tier: plan.tier }).eq("id", userId);
    }
    if (session.wants_ecommerce && !["paid", "verified"].includes(session.payment_status)) {
      await db
        .from("profiles")
        .update({ ecom_addon_status: "requested" })
        .eq("id", userId).eq("ecom_addon", false);
    }

    await (await import("./checkout.server")).activateBuilderShop(db, session.id);
    try { await (await import("./domains/provision.server")).fulfillBuilderDomain(db, session.id); } catch { /* paid order can be reconciled from registrar admin */ }

    // Payment submitted during the builder → create the admin-reviewable record
    if (session.payment_status === "submitted" && !session.payment_submission_id) {
      let planName = "";
      if (session.selected_plan_id) {
        const { data: sp } = await db
          .from("service_plans")
          .select("name")
          .eq("id", session.selected_plan_id)
          .maybeSingle();
        planName = sp?.name ?? "";
      }
      const noteParts = [
        planName ? `Plan: ${planName}` : "",
        session.wants_ecommerce ? "+Shop add-on" : "",
        `Site: ${session.business_name}`,
        session.payment_note ?? "",
      ].filter(Boolean);
      const { data: sub } = await db
        .from("payment_submissions")
        .insert({
          user_id: userId,
          plan_id: null, // builder plans live in service_plans; details go in the note
          gateway_kind: session.payment_method ?? "other",
          amount: Number(session.payment_amount_inr ?? 0),
          txn_reference: session.payment_ref ?? null,
          screenshot_url: session.payment_proof_url ?? null,
          payer_note: noteParts.join(" · ").slice(0, 500),
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (sub?.id) {
        await db.from("builder_sessions").update({ payment_submission_id: sub.id }).eq("id", session.id);
      }
    }

    return { siteId: site.id };

  });

// ---------- Read session (public: pre-auth wizard needs it) ----------
export const getBuilderSession = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: session } = await db.from("builder_sessions").select("*").eq("id", data.sessionId).maybeSingle();
    if (!session) throw new Error("Session not found");
    const { access_token_hash: _private, ...safe } = session;
    return safe;
  });
