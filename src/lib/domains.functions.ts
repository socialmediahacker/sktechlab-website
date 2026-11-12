import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizeDomain, DEFAULT_REGISTRAR, publicDomainOrder } from "./domains/rules";
const id = z.string().uuid();
export const registrantInput = z.object({ fullName: z.string().trim().min(2).max(120), company: z.string().trim().max(120).default(""), address: z.string().trim().min(5).max(64), city: z.string().trim().min(2).max(64), state: z.string().trim().min(2).max(64), country: z.literal("IN").default("IN"), postalCode: z.string().regex(/^[1-9][0-9]{5}$/), countryCode: z.literal("91").default("91"), phone: z.string().regex(/^[6-9][0-9]{9}$/), accepted: z.boolean().refine(value => value, "Accept the checkout terms first.") });
const scopeInput = z.object({ sessionId: id.optional(), siteId: id.optional() }).refine(d => Boolean(d.sessionId) !== Boolean(d.siteId), "Choose one website setup or existing site.");
async function db() { return (await import("@/integrations/supabase/client.server")).supabaseAdmin as any; }
async function checkScope(sb: any, scope: { sessionId?: string; siteId?: string }) {
  if (scope.sessionId) {
    await (await import("./builder-access.server")).assertBuilderAccess(sb, scope.sessionId);
    const { data } = await sb.from("builder_sessions").select("whatsapp_verified").eq("id", scope.sessionId).single();
    if (!data?.whatsapp_verified) throw new Error("Verify your WhatsApp before checking domain availability.");
    return { session_id: scope.sessionId, user_id: null, site_id: null };
  }
  const { supabase: auth, userId } = await (await import("./domain-scope.server")).domainUser();
  await (await import("./store-access.server")).assertSiteAccess(auth, scope.siteId!);
  return { session_id: null, user_id: userId, site_id: scope.siteId };
}
export const domainServiceInfo = createServerFn({ method: "GET" }).handler(async () => {
  try { const c = await (await import("./domains/registrar.server")).registrarConfig(await db()); return { enabled: c.enabled, sandbox: c.sandbox, agreementUrl: c.agreementUrl, tlds: c.rates.filter(r => r.enabled && r.productKey).map(r => r.tld) }; }
  catch { return { enabled: false, sandbox: true, agreementUrl: "", tlds: [] as string[] }; }
});
export const searchDomain = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ domain: z.string().max(253), scope: scopeInput }).parse(input))
  .handler(async ({ data }) => {
    const sb = await db(), scope = await checkScope(sb, data.scope), domain = normalizeDomain(data.domain);
    const key = scope.session_id || scope.user_id;
    const { count, error: rateError } = await sb.from("domain_search_events").select("id", { count: "exact", head: true }).eq("scope", key).gte("created_at", new Date(Date.now() - 60000).toISOString());
    if (rateError) throw new Error("Domain service migration is required.");
    if ((count || 0) >= 8) throw new Error("Please wait a minute before searching again.");
    const { error: insertError } = await sb.from("domain_search_events").insert({ scope: key });
    if (insertError) throw new Error("Domain search is temporarily unavailable.");
    const { registrarConfig, quoteDomain } = await import("./domains/registrar.server");
    const config = await registrarConfig(sb), result = await quoteDomain(config, domain);
    if (!result.available) return result;
    const { data: quote, error } = await sb.from("domain_quotes").insert({ ...scope, domain, price_inr: result.priceInr, renewal_inr: result.renewalInr, cost_paise: result.costPaise, sandbox: config.sandbox }).select("id,expires_at").single();
    if (error) throw new Error("Could not save a domain quote. Please retry.");
    return { available: true as const, domain, quoteId: quote.id as string, expiresAt: quote.expires_at as string, priceInr: result.priceInr, renewalInr: result.renewalInr, sandbox: config.sandbox };
  });
export const saveBuilderRegistrant = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: id, registrant: registrantInput }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = await db(); await (await import("./builder-access.server")).assertBuilderAccess(sb, data.sessionId);
    await (await import("./checkout.server")).assertCartEditable(sb, data.sessionId);
    const { data: session } = await sb.from("builder_sessions").select("user_id").eq("id", data.sessionId).single();
    if (session?.user_id !== context.userId) throw new Error("This checkout belongs to another account.");
    const value = await contactWithEmail(sb, context.userId, data.registrant);
    const { error } = await sb.from("builder_sessions").update({ domain_registrant: value }).eq("id", data.sessionId);
    if (error) throw new Error("Could not save domain-owner details.");
    return { ok: true };
  });
async function contactWithEmail(sb: any, userId: string, registrant: z.infer<typeof registrantInput>) {
  const { data } = await sb.auth.admin.getUserById(userId);
  if (!data?.user?.email || !data.user.email_confirmed_at) throw new Error("Verify your account email before buying a domain.");
  const c = await (await import("./domains/registrar.server")).registrarConfig(sb);
  if (!c.enabled || c.sandbox || !c.agreementUrl) throw new Error("Live domain registration is not ready.");
  return { ...registrant, email: data.user.email, agreementUrl: c.agreementUrl, acceptedAt: new Date().toISOString() };
}
export const myDomainOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = await db(); const { data, error } = await sb.from("domain_orders").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Domain orders could not be loaded. Check the domain migration."); return (data || []).map(publicDomainOrder);
});
export const createDomainCheckout = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ quoteId: id, siteId: id, termsAccepted: z.boolean().refine(value => value, "Accept the checkout terms first."), registrant: registrantInput }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = await db(); await (await import("./store-access.server")).assertSiteAccess(context.supabase, data.siteId);
    const contact = await contactWithEmail(sb, context.userId, data.registrant);
    const { data: q } = await sb.from("domain_quotes").select("*").eq("id", data.quoteId).eq("user_id", context.userId).eq("site_id", data.siteId).single();
    if (!q || q.sandbox) throw new Error("Domain quote expired. Check availability again.");
    let { data: order } = await sb.from("domain_orders").select("*").eq("user_id", context.userId).eq("site_id", data.siteId).eq("domain", q.domain).eq("status", "awaiting_payment").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!order) {
      if (Date.parse(q.expires_at) < Date.now()) throw new Error("Domain quote expired. Check availability again.");
      const result = await sb.from("domain_orders").insert({ policy_accepted_at: new Date().toISOString(), policy_version: "2026-11-12", quote_id: q.id, user_id: context.userId, site_id: data.siteId, domain: q.domain, price_inr: q.price_inr, renewal_inr: q.renewal_inr, cost_paise: q.cost_paise, sandbox: false, registrant: contact, agreement_url: contact.agreementUrl }).select("*").single();
      if (result.error) throw new Error("Could not create domain order. Check your existing orders before paying again."); order = result.data;
    }
    if (order.status !== "awaiting_payment") throw new Error("This order is already paid or processing. Refresh your domain orders.");
    if (order.payment_order_id) return { id: order.id, orderId: order.payment_order_id, amount: Math.round(Number(order.price_inr) * 100), currency: "INR", keyId: (await (await import("./platform-payments.server")).razorpayReady(sb)).key };
    const payment = await (await import("./platform-payments.server")).createPlatformOrder(sb, Number(order.price_inr), order.id);
    const { data: saved, error } = await sb.from("domain_orders").update({ payment_order_id: payment.orderId }).eq("id", order.id).is("payment_order_id", null).select("id").maybeSingle();
    if (error || !saved) throw new Error("Checkout changed. Reload to use the saved payment order.");
    return { id: order.id, ...payment };
  });
const proofInput = z.object({ id, orderId: z.string().max(120), paymentId: z.string().max(120), signature: z.string().regex(/^[a-f0-9]{64}$/) });
export const verifyDomainCheckout = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => proofInput.parse(input)).handler(async ({ data, context }) => {
    const sb = await db(); const { data: order } = await sb.from("domain_orders").select("*").eq("id", data.id).eq("user_id", context.userId).single();
    if (!order) throw new Error("Order not found.");
    if (order.status === "awaiting_payment") {
      await (await import("./platform-payments.server")).verifyPlatformPayment(order, data);
      const { error } = await sb.from("domain_orders").update({ status: "paid", payment_id: data.paymentId }).eq("id", order.id).eq("status", "awaiting_payment");
      if (error) {
        await sb.from("domain_orders").update({ status: "refund_required", payment_id: data.paymentId, status_message: "Payment confirmed but this domain has a conflicting purchase. Contact support for reconciliation/refund." }).eq("id", order.id).eq("status", "awaiting_payment");
        throw new Error("Payment confirmed; contact support to reconcile this order. Do not pay again.");
      }
    }
    await (await import("./domains/provision.server")).provisionDomain(sb, order.id);
    return { ok: true };
  });
const configInput = z.object({ enabled: z.boolean(), sandbox: z.boolean(), autoRegister: z.boolean(), costCurrency: z.enum(["INR", "USD"]), costToInr: z.number().positive().max(1000), taxPercent: z.number().min(0).max(40), agreementUrl: z.union([z.literal(""), z.string().url().startsWith("https://")]), nameservers: z.array(z.string().regex(/^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i)).max(6), rates: z.array(z.object({ tld: z.enum(["com", "net", "org", "in", "co.in"]), productKey: z.string().regex(/^[a-z0-9_-]*$/), markupInr: z.number().min(0).max(50000), enabled: z.boolean() })).max(5) });
export const adminDomainService = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await (await import("./admin.server")).assertAdmin(context.supabase, context.userId);
  const sb = await db(), { registrarConfig } = await import("./domains/registrar.server");
  const config = await registrarConfig(sb);
  const { data: orders } = await sb.from("domain_orders").select("id,domain,status,price_inr,renewal_inr,registrar_order_id,user_id,status_message,created_at,site_id,session_id").order("created_at", { ascending: false }).limit(100);
  const { data: pendingSetups } = await sb.from("builder_sessions").select("id,business_name,payment_status,domain_quote_id,wants_ecommerce,shop_activated_at").in("payment_status", ["paid", "verified"]).or("domain_quote_id.not.is.null,and(wants_ecommerce.eq.true,shop_activated_at.is.null)").order("updated_at", { ascending: false }).limit(30);
  return { config, orders: orders || [], pendingSetups: (pendingSetups || []).filter((s: any) => (s.wants_ecommerce && !s.shop_activated_at) || (s.domain_quote_id && !(orders || []).some((o: any) => o.session_id === s.id && o.status === "registered"))), credentialsReady: !!(process.env.RESELLERCLUB_RESELLER_ID && process.env.RESELLERCLUB_API_KEY) };
});
export const saveDomainService = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => configInput.parse(input)).handler(async ({ data, context }) => {
  const { assertAdmin, logActivity } = await import("./admin.server"); await assertAdmin(context.supabase, context.userId);
  if (data.enabled && (!data.agreementUrl || data.nameservers.length < 2)) throw new Error("Add the registrar agreement URL and at least two real nameservers first.");
  if (data.costCurrency === "INR" && data.costToInr !== 1) throw new Error("INR registrar accounts must use an exchange rate of 1.");
  if (data.rates.some(r => r.enabled && !r.productKey)) throw new Error("Map each enabled extension to the registrar product key first.");
  if (new Set(data.rates.map(r => r.tld)).size !== data.rates.length) throw new Error("Each domain extension can appear only once.");
  const sb = await db(); const { error } = await sb.from("domain_registrar_settings").upsert({ id: 1, config: data, updated_at: new Date().toISOString() });
  if (error) throw new Error("Could not save registrar settings.");
  await logActivity(sb, { actor_id: context.userId, action: "domain.registrar.configure", entity_type: "domain_registrar", details: { enabled: data.enabled, sandbox: data.sandbox } }); return { ok: true };
});
export const adminDomainAction = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id, action: z.enum(["register", "recheck"]) }).parse(input)).handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("./admin.server"); await assertAdmin(context.supabase, context.userId); const sb = await db();
    const { provisionDomain, reconcileDomain } = await import("./domains/provision.server");
    const { data: order } = await sb.from("domain_orders").select("*").eq("id", data.id).single(); if (!order) throw new Error("Order unavailable.");
    if (data.action === "register") await provisionDomain(sb, data.id, true);
    else if (["registering", "needs_review"].includes(order.status)) await reconcileDomain(sb, order);
    await logActivity(sb, { actor_id: context.userId, action: `domain.${data.action}`, entity_type: "domain_order", entity_id: data.id }); return { ok: true };
  });
export const testDomainRegistrar = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  await (await import("./admin.server")).assertAdmin(context.supabase, context.userId);
  const sb = await db(), { registrarConfig, registrarRequest } = await import("./domains/registrar.server");
  const c = await registrarConfig(sb), prices = await registrarRequest(c, "products/reseller-cost-price");
  return { products: Object.entries(prices).filter(([, value]: any) => value?.addnewdomain?.["1"]).map(([key, value]: any) => ({ key, registration: Number(value.addnewdomain["1"]), renewal: Number(value.renewdomain?.["1"] || 0) })) };
});
export const syncPaidBuilderExtras = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ sessionId: id }).parse(input)).handler(async ({ data, context }) => {
  await (await import("./admin.server")).assertAdmin(context.supabase, context.userId); const sb = await db();
  await (await import("./checkout.server")).activateBuilderShop(sb, data.sessionId);
  await (await import("./domains/provision.server")).fulfillBuilderDomain(sb, data.sessionId); return { ok: true };
});
export const selectedBuilderDomain = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ sessionId: id }).parse(input)).handler(async ({ data }) => {
  const sb = await db(); await (await import("./builder-access.server")).assertBuilderAccess(sb, data.sessionId);
  const { data: session } = await sb.from("builder_sessions").select("domain_quote_id").eq("id", data.sessionId).single();
  if (!session?.domain_quote_id) return null;
  const { data: q } = await sb.from("domain_quotes").select("domain,price_inr,renewal_inr,expires_at").eq("id", session.domain_quote_id).eq("session_id", data.sessionId).maybeSingle();
  return q ? { domain: q.domain, price: Number(q.price_inr), renewal: Number(q.renewal_inr), expiresAt: q.expires_at } : null;
});
