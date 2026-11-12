import { registrarRequest, registrarConfig, quoteDomain } from "./registrar.server";
import { domainPaymentConfirmed, canRegister } from "./rules";

export async function reconcileDomain(db: any, order: any) {
  const config = await registrarConfig(db);
  if (!config.enabled || config.sandbox !== order.sandbox || !order.registrar_customer_id) return;
  const details = await registrarRequest(config, "domains/details-by-name", { "domain-name": order.domain, options: "OrderDetails" });
  if (String(details.customerid) !== String(order.registrar_customer_id) || details.domainname?.toLowerCase() !== order.domain) throw new Error("Registrar ownership mismatch. Admin review required.");
  if (details.currentstatus !== "Active" || !(details.entityid || details.orderid)) return;
  const expiry = Number(details.endtime) > 0 ? new Date(Number(details.endtime) * 1000).toISOString() : null;
  const { error } = await db.from("domain_orders").update({ status: "registered", registrar_order_id: String(details.entityid || details.orderid), expires_at: expiry, status_message: "Registered. Complete registrar email verification; DNS connection is checked separately.", updated_at: new Date().toISOString() }).eq("id", order.id).in("status", ["registering", "needs_review"]);
  if (error) throw new Error("Registrar completed the order; local status needs reconciliation.");
  if (order.site_id) await linkDomainRequest(db, order);
}
export async function linkDomainRequest(db: any, order: any) {
  if (!order.site_id) return;
  const { data: existing } = await db.from("domain_requests").select("id").eq("site_id", order.site_id).eq("domain", order.domain).limit(1).maybeSingle();
  if (!existing) await db.from("domain_requests").insert({ user_id: order.user_id, site_id: order.site_id, domain: order.domain, kind: "buy", status: "pending", builder_session_id: order.session_id || null, is_primary: false, is_paid_suggestion: true });
}
export async function provisionDomain(db: any, id: string, force = false) {
  const { data: order } = await db.from("domain_orders").select("*").eq("id", id).single();
  if (!order || !canRegister(order.status, !!order.payment_id || !!order.session_id)) return;
  const config = await registrarConfig(db);
  if (!config.enabled || (!config.autoRegister && !force) || config.sandbox || order.sandbox) return;
  if (config.nameservers.length < 2) throw new Error("Registrar nameservers need configuration.");
  const { data: claim, error } = await db.from("domain_orders").update({ status: "registering", status_message: "Registration requested; checking registrar confirmation.", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "paid").select("id").maybeSingle();
  if (error || !claim) return;
  try {
    const live = await quoteDomain(config, order.domain);
    if (!live.available || live.costPaise > Number(order.cost_paise)) {
      await db.from("domain_orders").update({ status: "refund_required", status_message: "Domain availability or registrar cost changed after payment. Contact support for resolution/refund." }).eq("id", id); return;
    }
    const r = order.registrant;
    const { createHash } = await import("node:crypto");
    const registrantHash = createHash("sha256").update(JSON.stringify(r)).digest("hex");
    let { data: contact } = await db.from("domain_registrar_contacts").select("*").eq("user_id", order.user_id).eq("sandbox", false).maybeSingle();
    if (!contact || contact.registrant_hash !== registrantHash) {
      const params = { name: r.fullName, company: r.company || "N/A", "address-line-1": r.address, city: r.city, state: r.state, country: r.country, zipcode: r.postalCode, "phone-cc": r.countryCode, phone: r.phone };
      let customer: any;
      // If lookup fails, stop for reconciliation rather than treating a network error as "not found".
      const lookup = await registrarRequest(config, "customers/details", { username: r.email }, "GET", true);
      if (lookup?.customerid) {
        if (lookup.resellerid && String(lookup.resellerid) !== String(process.env.RESELLERCLUB_RESELLER_ID)) throw new Error("Registrar customer ownership needs review.");
        customer = lookup.customerid;
      }
      else {
        const { randomBytes } = await import("node:crypto");
        customer = await registrarRequest(config, "customers/v2/signup", { ...params, username: r.email, passwd: `Sk1!${randomBytes(6).toString("hex")}`, "lang-pref": "en", "accept-policy": "true" }, "POST");
      }
      if (!/^\d+$/.test(String(customer))) throw new Error("Registrar customer creation needs review.");
      const contactId = await registrarRequest(config, "contacts/add", { ...params, email: r.email, "customer-id": String(customer), type: "Contact" }, "POST");
      if (!/^\d+$/.test(String(contactId))) throw new Error("Registrar contact creation needs review.");
      contact = { user_id: order.user_id, sandbox: false, customer_id: String(customer), contact_id: String(contactId), registrant_hash: registrantHash };
      const { error: saveError } = await db.from("domain_registrar_contacts").upsert(contact);
      if (saveError) throw new Error("Registrar contact could not be saved.");
    }
    order.registrar_customer_id = contact.customer_id;
    const { error: saveError } = await db.from("domain_orders").update({ registrar_customer_id: contact.customer_id, registrar_contact_id: contact.contact_id }).eq("id", id);
    if (saveError) throw new Error("Could not save registrar reference.");
    const result = await registrarRequest(config, "domains/register", { "domain-name": order.domain, years: "1", ns: config.nameservers, "customer-id": contact.customer_id, "reg-contact-id": contact.contact_id, "admin-contact-id": contact.contact_id, "tech-contact-id": contact.contact_id, "billing-contact-id": contact.contact_id, "invoice-option": "NoInvoice", "purchase-privacy": "false" }, "POST");
    if (result.entityid) await db.from("domain_orders").update({ registrar_order_id: String(result.entityid) }).eq("id", id);
    await reconcileDomain(db, order);
    await db.from("domain_orders").update({ status: "needs_review", status_message: "Registration is pending registrar confirmation. Recheck status; do not pay again." }).eq("id", id).eq("status", "registering");
  } catch {
    await db.from("domain_orders").update({ status: "needs_review", status_message: "Registrar outcome needs review. Recheck the existing order before any further purchase.", updated_at: new Date().toISOString() }).eq("id", id).eq("status", "registering");
  }
}
export async function fulfillBuilderDomain(db: any, sessionId: string, attemptRegistration = true) {
  const { data: s } = await db.from("builder_sessions").select("*").eq("id", sessionId).single();
  if (!s?.user_id || !domainPaymentConfirmed(s.payment_status) || !s.checkout_breakdown?.domain) return;
  const { data: existing } = await db.from("domain_orders").select("id").eq("session_id", sessionId).maybeSingle();
  if (existing) { if (s.created_site_id) { await db.from("domain_orders").update({ site_id: s.created_site_id }).eq("id", existing.id); const { data: o } = await db.from("domain_orders").select("*").eq("id", existing.id).single(); if (o?.status === "registered") await linkDomainRequest(db, o); } if (attemptRegistration) await provisionDomain(db, existing.id); return; }
  const { data: q } = await db.from("domain_quotes").select("*").eq("id", s.checkout_breakdown.domain.quoteId).eq("session_id", sessionId).single();
  if (!q || !s.domain_registrant?.email) throw new Error("Paid domain order needs contact review.");
  const { data: o, error } = await db.from("domain_orders").insert({ quote_id: q.id, session_id: sessionId, user_id: s.user_id, site_id: s.created_site_id, domain: q.domain, price_inr: q.price_inr, renewal_inr: q.renewal_inr, cost_paise: q.cost_paise, sandbox: q.sandbox, status: "paid", registrant: s.domain_registrant, agreement_url: s.domain_registrant.agreementUrl, payment_id: s.payment_ref || "admin-verified" }).select("id").single();
  if (error) throw new Error("Payment confirmed; domain order needs admin reconciliation.");
  if (attemptRegistration) await provisionDomain(db, o.id);
}
