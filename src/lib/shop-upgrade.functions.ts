import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
export const checkoutShopUpgrade = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ siteId: z.string().uuid(), termsAccepted: z.boolean().refine(value => value, "Accept the checkout terms first.") }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin: raw } = await import("@/integrations/supabase/client.server"); const sb = raw as any;
    try { await (await import("./store-access.server")).assertSiteAccess(context.supabase, data.siteId); } catch { throw new Error("An active website plan is required before adding a shop. Renew your website in Plan & billing first."); }
    const ent = await (await import("./commerce-entitlement.server")).commerceEntitlement(sb, context.userId);
    if (ent.enabled && ent.reason !== "trial") throw new Error("Your account already has shop access. Refresh the dashboard.");
    const { data: settings } = await sb.from("site_settings").select("ecom_addon_enabled,ecom_addon_price_inr,ecom_addon_billing,ecom_addon_product_limit").eq("id", 1).single();
    if (!settings?.ecom_addon_enabled || Number(settings.ecom_addon_price_inr) <= 0 || Number(settings.ecom_addon_product_limit) <= 0) throw new Error("Shop upgrade is unavailable. Contact support.");
    let { data: order } = await sb.from("shop_upgrade_orders").select("*").eq("user_id", context.userId).in("status", ["awaiting_payment", "paid"]).maybeSingle();
    if (order?.status === "paid") throw new Error("Your payment is confirmed; activation needs a retry. Contact support.");
    if (!order) {
      const result = await sb.from("shop_upgrade_orders").insert({ policy_accepted_at: new Date().toISOString(), policy_version: "2026-11-12", user_id: context.userId, site_id: data.siteId, price_inr: settings.ecom_addon_price_inr, billing: settings.ecom_addon_billing || "monthly", product_limit: settings.ecom_addon_product_limit || 200 }).select("*").single();
      if (result.error) throw new Error("An upgrade checkout already exists. Reload and retry."); order = result.data;
    }
    const { razorpayReady, createPlatformOrder } = await import("./platform-payments.server");
    if (order.payment_order_id) return { id: order.id, orderId: order.payment_order_id, amount: Math.round(Number(order.price_inr) * 100), currency: "INR", keyId: (await razorpayReady(sb)).key };
    const payment = await createPlatformOrder(sb, Number(order.price_inr), order.id);
    const { data: saved, error } = await sb.from("shop_upgrade_orders").update({ payment_order_id: payment.orderId }).eq("id", order.id).is("payment_order_id", null).select("id").maybeSingle();
    if (error || !saved) throw new Error("Checkout changed. Reload to use the saved order.");
    return { id: order.id, ...payment };
  });
export const verifyShopUpgrade = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), orderId: z.string().max(120), paymentId: z.string().max(120), signature: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input)).handler(async ({ data, context }) => {
    const { supabaseAdmin: raw } = await import("@/integrations/supabase/client.server"); const sb = raw as any;
    let { data: order } = await sb.from("shop_upgrade_orders").select("*").eq("id", data.id).eq("user_id", context.userId).single();
    if (!order) throw new Error("Upgrade order unavailable.");
    if (order.status === "active") return { ok: true };
    if (order.status === "awaiting_payment") {
      await (await import("./platform-payments.server")).verifyPlatformPayment(order, data);
      const { data: paid, error } = await sb.from("shop_upgrade_orders").update({ status: "paid", payment_id: data.paymentId, paid_at: new Date().toISOString() }).eq("id", order.id).eq("status", "awaiting_payment").select("*").maybeSingle();
      if (error) throw new Error("Payment confirmed; activation needs reconciliation.");
      order = paid || (await sb.from("shop_upgrade_orders").select("*").eq("id", order.id).single()).data;
    }
    await (await import("./shop-upgrade.server")).activatePaidShopOrder(sb, order.id);
    return { ok: true };
  });
export const adminShopUpgradeOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await (await import("./admin.server")).assertAdmin(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await (supabaseAdmin as any).from("shop_upgrade_orders").select("id,user_id,site_id,price_inr,billing,status,created_at,expires_at").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Apply the domain/shop migration to load upgrade orders."); return data || [];
});
export const adminActivatePaidShopOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input)).handler(async ({ data, context }) => {
  const { assertAdmin, logActivity } = await import("./admin.server"); await assertAdmin(context.supabase, context.userId);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (await import("./shop-upgrade.server")).activatePaidShopOrder(supabaseAdmin, data.id);
  await logActivity(supabaseAdmin, { actor_id: context.userId, action: "shop_upgrade.reconcile", entity_type: "shop_upgrade", entity_id: data.id }); return { ok: true };
});
