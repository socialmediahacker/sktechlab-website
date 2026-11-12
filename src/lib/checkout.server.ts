import { cartTotal, shopExpiry } from "./commerce-rules";
import { domainPaymentConfirmed } from "./domains/rules";

export async function assertCartEditable(db: any, id: string) {
  const { data: session, error } = await db.from("builder_sessions").select("checkout_locked_at,payment_status").eq("id", id).single();
  if (error || !session) throw new Error("Checkout migration is required before accepting new orders.");
  if (session.checkout_locked_at || ["submitted", "paid", "verified"].includes(session.payment_status)) throw new Error("This checkout is locked to its payment. Start a new setup to change the order.");
}
export async function builderBreakdown(db: any, id: string, lock = false): Promise<any> {
  const { data: s, error } = await db.from("builder_sessions").select("*").eq("id", id).single();
  if (error || !s) throw new Error("Checkout could not be loaded.");
  if (s.checkout_breakdown) return s.checkout_breakdown;
  const { data: plan } = await db.from("service_plans").select("id,name,price_inr,billing,ecom_product_limit").eq("id", s.selected_plan_id).single();
  if (!plan || Number(plan.price_inr) <= 0) throw new Error("Choose an available paid website plan.");
  let addonPrice = s.wants_ecommerce && !Number(plan.ecom_product_limit) ? Number(s.ecom_addon_price_inr ?? 0) : 0;
  if (s.user_id && addonPrice) {
    const ent = await (await import("./commerce-entitlement.server")).commerceEntitlement(db, s.user_id);
    if (ent.enabled && ent.reason !== "trial") addonPrice = 0;
  }
  let domain: any = null;
  if (["buy_with_us", "paid_suggested"].includes(s.domain_type)) {
    if (lock) { const config = await (await import("./domains/registrar.server")).registrarConfig(db); if (!config.enabled || config.sandbox) throw new Error("Domain buying is currently paused. Review your domain option before payment."); }
    const { data: q } = await db.from("domain_quotes").select("*").eq("id", s.domain_quote_id).eq("session_id", id).single();
    if (!q || q.domain !== s.selected_domain || Date.parse(q.expires_at) <= Date.now()) throw new Error("Domain quote expired. Return to the domain step and check availability again.");
    if (q.sandbox) throw new Error("Test domain quotes cannot be charged. Choose a free subdomain or connect your own domain.");
    if (lock && !s.domain_registrant?.acceptedAt) throw new Error("Add the domain owner's contact details and accept the registrar agreement first.");
    domain = { quoteId: q.id, domain: q.domain, price: Number(q.price_inr), renewal: Number(q.renewal_inr), years: 1 };
  }
  const result = { plan: { id: plan.id, name: plan.name, price: Number(plan.price_inr), billing: plan.billing }, addon: addonPrice ? { label: "Online Shop (+Shop)", price: addonPrice, billing: s.ecom_addon_billing || "monthly", productLimit: Number(s.ecom_addon_product_limit || 200) } : null, domain, total: cartTotal(Number(plan.price_inr), addonPrice, domain?.price || 0) };
  if (lock) {
    const { data: saved, error: e } = await db.from("builder_sessions").update({ checkout_breakdown: result, checkout_locked_at: new Date().toISOString() }).eq("id", id).is("checkout_locked_at", null).select("checkout_breakdown").maybeSingle();
    if (e) throw new Error("Could not lock checkout totals.");
    if (!saved) { const { data: current } = await db.from("builder_sessions").select("checkout_breakdown").eq("id", id).single(); if (!current?.checkout_breakdown) throw new Error("Checkout changed. Reload before paying."); return current.checkout_breakdown; }
  }
  return result;
}
export async function activateBuilderShop(db: any, id: string) {
  const { data: s } = await db.from("builder_sessions").select("*").eq("id", id).single();
  if (!s?.user_id || !s.wants_ecommerce || !domainPaymentConfirmed(s.payment_status) || s.shop_activated_at) return;
  // A paid add-on must have been included in the verified checkout.
  if (s.checkout_breakdown && !s.checkout_breakdown.addon) return;
  const { data: profile } = await db.from("profiles").select("ecom_addon_expires_at").eq("id", s.user_id).single();
  const expiry = shopExpiry(s.ecom_addon_billing || "monthly", new Date(s.payment_confirmed_at || new Date().toISOString()));
  const until = !expiry ? null : profile?.ecom_addon_expires_at && Date.parse(profile.ecom_addon_expires_at) > Date.parse(expiry) ? profile.ecom_addon_expires_at : expiry;
  const { error } = await db.from("profiles").update({ ecom_addon: true, ecom_addon_status: "active", ecom_addon_expires_at: until, shop_product_limit: Number(s.checkout_breakdown?.addon?.productLimit || s.ecom_addon_product_limit || 200) }).eq("id", s.user_id);
  if (error) throw new Error("Payment confirmed. Shop activation needs a retry.");
  await db.from("builder_sessions").update({ shop_activated_at: new Date().toISOString() }).eq("id", id);
}
