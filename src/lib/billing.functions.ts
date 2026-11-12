import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ *
 * Billing / Auto-pay (recurring UPI) + manual payment collection
 *
 * Razorpay keys are optional. Until RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 * are added as secrets, every auto-pay action is recorded in the
 * `subscriptions` table with status "pending_mandate" so nothing is lost —
 * the moment the keys exist, the same flow creates the real mandate.
 * ------------------------------------------------------------------ */

const INTERVALS = ["monthly", "yearly"] as const;

/** Public: which payment methods are switched on right now. */
export const getBillingConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { data: s } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const { data: gateways } = await sb.from("payment_gateways").select("kind, display_name, is_enabled, config").order("sort_order");
  const text = (value: unknown) => typeof value === "string" ? value : null;
  const safeGateways = (gateways ?? []).map(g => {
    const c = g.config && typeof g.config === "object" && !Array.isArray(g.config) ? g.config as Record<string, unknown> : {};
    return { kind: g.kind, label: g.display_name, enabled: g.is_enabled, details: {
      upi_id: text(c.upi_id), payee_name: text(c.payee_name ?? c.upi_name), qr_url: text(c.qr_url),
      bank_name: text(c.bank_name), account_name: text(c.account_name), account_number: text(c.account_number), ifsc: text(c.ifsc),
    } };
  });
  const upi = safeGateways.find(g => ["upi_qr", "manual_upi", "upi"].includes(g.kind));
  const crypto = safeGateways.find(g => g.kind === "crypto");
  const bank = safeGateways.find(g => ["bank", "bank_transfer"].includes(g.kind));
  const razorpay = safeGateways.find(g => g.kind === "razorpay");
  const keysReady = Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]);
  return {
    gateways: safeGateways,
    bank: { enabled: Boolean(bank?.enabled), ...bank?.details },
    razorpayEnabled: Boolean(razorpay?.enabled) && keysReady,
    trialDays: Number((s as any)?.trial_days ?? 5),
    autopayEnabled: Boolean((s as any)?.autopay_enabled) && keysReady,
    autopayRequested: Boolean((s as any)?.autopay_enabled),
    autopayProvider: String((s as any)?.autopay_provider ?? "razorpay"),
    razorpayReady: keysReady,
    razorpayKeyId: keysReady ? String(process.env["RAZORPAY_KEY_ID"]) : null,
    manualUpi: {
      enabled: Boolean(upi?.enabled),
      id: upi?.details.upi_id ?? (s as any)?.manual_upi_id ?? null,
      name: upi?.details.payee_name ?? (s as any)?.manual_upi_name ?? null,
      qr: upi?.details.qr_url ?? (s as any)?.manual_qr_url ?? null,
    },
    crypto: {
      enabled: Boolean(crypto?.enabled),
      address: (s as any)?.crypto_wallet_address ?? null,
      network: (s as any)?.crypto_network ?? null,
      qr: (s as any)?.crypto_qr_url ?? null,
      note: (s as any)?.crypto_payment_note ?? null,
    },
  };
});

/** User starts auto-pay for a plan (mandate created once keys exist). */
export const startAutoPay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        planId: z.string().uuid().optional(),
        planSlug: z.string().max(60).optional(),
        interval: z.enum(INTERVALS).default("monthly"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await sb.from("site_settings").select("*").eq("id", 1).maybeSingle();
    const trialDays = Number((settings as any)?.trial_days ?? 5);

    let plan: any = null;
    if (data.planId) plan = (await sb.from("plans").select("*").eq("id", data.planId).maybeSingle()).data;
    else if (data.planSlug) plan = (await sb.from("plans").select("*").eq("slug", data.planSlug).maybeSingle()).data;
    if (!plan) throw new Error("Plan not found");

    const trialEnds = new Date(Date.now() + trialDays * 86400000);
    const keysReady = Boolean(process.env["RAZORPAY_KEY_ID"] && process.env["RAZORPAY_KEY_SECRET"]);

    const { data: existing } = await sb
      .from("subscriptions")
      .select("id")
      .eq("user_id", context.userId)
      .in("status", ["pending_mandate", "trialing", "active"])
      .maybeSingle();

    const row = {
      user_id: context.userId,
      plan_id: plan.id,
      plan_name: plan.name,
      provider: String((settings as any)?.autopay_provider ?? "razorpay"),
      amount_inr: Number(plan.price_inr ?? 0),
      interval: data.interval,
      status: keysReady ? "trialing" : "pending_mandate",
      trial_ends_at: trialEnds.toISOString(),
      next_charge_at: trialEnds.toISOString(),
    };

    const saved = existing
      ? (await sb.from("subscriptions").update(row).eq("id", existing.id).select("*").maybeSingle()).data
      : (await sb.from("subscriptions").insert(row).select("*").maybeSingle()).data;

    return {
      subscription: saved,
      trialEndsAt: trialEnds.toISOString(),
      mandateReady: keysReady,
      message: keysReady
        ? `Free trial started. Auto-debit begins on ${trialEnds.toDateString()}.`
        : `Free trial started. Auto-pay mandate will be sent once the payment gateway is connected — our team will share a UPI link on WhatsApp.`,
    };
  });

/** Signed-in user: my subscription. */
export const myAutoPay = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  });

/* ------------------------- admin ------------------------- */

export const adminListSubscriptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: subs } = await sb.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(300);
    const ids = Array.from(new Set((subs ?? []).map((s) => s.user_id)));
    const { data: profiles } = ids.length
      ? await sb.from("profiles").select("id, full_name, whatsapp_number, active_plan").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (subs ?? []).map((s) => ({ ...s, profile: byId.get(s.user_id) ?? null }));
  });

/** Admin flips subscription state (activate / pause / cancel / retry). */
export const adminUpdateSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending_mandate", "trialing", "active", "paused", "cancelled", "failed"]).optional(),
        amount_inr: z.number().nonnegative().optional(),
        interval: z.enum(INTERVALS).optional(),
        next_charge_at: z.string().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { id, ...patch } = data;
    const { error } = await sb.from("subscriptions").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(sb as any, { actor_id: context.userId, action: "subscription.update", entity_type: "subscription", entity_id: id, details: patch });
    return { ok: true };
  });

/**
 * Admin records a payment taken manually (UPI / crypto / cash):
 * creates a paid invoice, activates the plan and rolls the next charge date.
 */
export const adminRecordManualPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        planSlug: z.string().max(60).optional(),
        amount: z.number().nonnegative(),
        method: z.enum(["manual_upi", "crypto", "cash", "bank_transfer", "razorpay"]),
        reference: z.string().max(120).optional(),
        months: z.number().int().min(1).max(36).default(1),
        note: z.string().max(500).optional(),
        screenshotUrl: z.string().url().max(500).optional().or(z.literal("")),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin, invoiceTotals, logActivity } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");

    let planName = data.planSlug ?? null;
    let planId: string | null = null;
    if (data.planSlug) {
      const { data: p } = await sb.from("plans").select("id, name, slug").eq("slug", data.planSlug).maybeSingle();
      if (p) {
        planId = p.id;
        planName = p.name;
      }
    }

    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + data.months);
    const { tax, total } = invoiceTotals(data.amount, 0);

    const { data: invoice } = await sb
      .from("invoices")
      .insert({
        user_id: data.userId,
        plan_id: planId,
        plan_name: planName,
        amount_inr: data.amount,
        tax_inr: tax,
        total_inr: total,
        status: "paid",
        gateway_kind: data.method,
        gateway_reference: data.reference ?? null,
        notes: data.note ?? null,
        period_start: start.toISOString(),
        period_end: end.toISOString(),
      })
      .select("*")
      .maybeSingle();

    await sb.from("payment_submissions").insert({
      user_id: data.userId,
      plan_id: planId,
      gateway_kind: data.method,
      amount: data.amount,
      txn_reference: data.reference ?? null,
      screenshot_url: data.screenshotUrl || null,
      payer_note: data.note ?? null,
      status: "approved",
      admin_note: "Recorded manually by admin",
      reviewed_by: context.userId,
      reviewed_at: new Date().toISOString(),
    });

    if (data.planSlug) {
      await sb.from("profiles").update({ active_plan: data.planSlug, plan_tier: data.planSlug }).eq("id", data.userId);
    }

    const { data: sub } = await sb
      .from("subscriptions")
      .select("id")
      .eq("user_id", data.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sub) {
      await sb
        .from("subscriptions")
        .update({
          status: "active",
          last_charge_at: start.toISOString(),
          next_charge_at: end.toISOString(),
          amount_inr: data.amount,
          plan_id: planId,
          plan_name: planName,
        })
        .eq("id", sub.id);
    }

    await logActivity(sb as any, {
      actor_id: context.userId,
      action: "payment.manual_record",
      entity_type: "user",
      entity_id: data.userId,
      details: { amount: data.amount, method: data.method, reference: data.reference ?? null },
    });

    return { ok: true, invoice };
  });

/* ------------------------- user side: pay now ------------------------- */

/** Public: active plans a user can pay for. */
export const listPayablePlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
  const { data } = await sb
    .from("plans")
    .select("id, name, slug, price_inr, duration_days, allowed_gateways, is_active, sort_order")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
});

/** Signed-in user submits a payment (manual UPI / crypto / bank / razorpay ref). */
export const submitMyPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        planId: z.string().uuid().optional(),
        gateway: z.enum(["manual_upi", "crypto", "bank_transfer", "razorpay", "other"]),
        amount: z.number().nonnegative(),
        reference: z.string().max(120).optional(),
        note: z.string().max(500).optional(),
        screenshotUrl: z.string().max(1000).optional().or(z.literal("")),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { error } = await sb.from("payment_submissions").insert({
      user_id: context.userId,
      plan_id: data.planId ?? null,
      gateway_kind: data.gateway,
      amount: data.amount,
      txn_reference: data.reference ?? null,
      screenshot_url: data.screenshotUrl || null,
      payer_note: data.note ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Signed-in user: my payment submissions. */
export const myPaymentSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("payment_submissions")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    return data ?? [];
  });

/* ------------------------------------------------------------------ *
 * "+Shop" e-commerce add-on — price set by the master admin, requested
 * by customers during the builder flow after choosing a domain.
 * ------------------------------------------------------------------ */

/** Admin: users who requested or already have the +Shop add-on. */
export const adminListShopAddons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data } = await sb
      .from("profiles")
      .select("id, full_name, whatsapp_number, active_plan, ecom_addon, ecom_addon_status")
      .neq("ecom_addon_status", "none")
      .order("ecom_addon_status", { ascending: true })
      .limit(300);
    return data ?? [];
  });

/** Admin: activate or revoke the +Shop add-on for a user. */
export const adminSetShopAddon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(i))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { error } = await sb
      .from("profiles")
      .update({ ecom_addon: data.active, ecom_addon_status: data.active ? "active" : "cancelled", ecom_addon_expires_at: null, shop_product_limit: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    await logActivity(sb as any, {
      actor_id: context.userId,
      action: data.active ? "shop_addon.activate" : "shop_addon.revoke",
      entity_type: "profile",
      entity_id: data.userId,
      details: {},
    });
    return { ok: true };
  });
