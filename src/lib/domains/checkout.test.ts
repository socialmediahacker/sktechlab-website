import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { normalizeDomain, domainParts, availability, retailPrice, DEFAULT_REGISTRAR, canRegister } from "./rules";
import { addonActive, shopExpiry, cartTotal } from "../commerce-rules";
import { builderBreakdown } from "../checkout.server";
import { quoteDomain } from "./registrar.server";
import { verifyPlatformPayment } from "../platform-payments.server";
import { provisionDomain } from "./provision.server";

// A small in-memory query double for checkout/provisioning state transitions. No provider calls are sent.
class MemoryDb {
  tables: Record<string, any[]>;
  constructor(tables: Record<string, any[]>) { this.tables = tables; }
  from(table: string): any {
    const db = this; let operation = "read", patch: any, limit = Infinity; const predicates: ((row: any) => boolean)[] = [];
    const query: any = {
      select: () => query, eq: (key: string, value: any) => { predicates.push(r => r[key] === value); return query; },
      is: (key: string, value: any) => { predicates.push(r => (r[key] ?? null) === value); return query; },
      in: (key: string, values: any[]) => { predicates.push(r => values.includes(r[key])); return query; },
      limit: (n: number) => { limit = n; return query; }, order: () => query,
      update: (value: any) => { operation = "update"; patch = value; return query; },
      insert: (value: any) => { operation = "insert"; patch = value; return query; }, upsert: (value: any) => { operation = "insert"; patch = value; return query; },
      single: async () => execute(true), maybeSingle: async () => execute(true),
      then: (resolve: any, reject: any) => Promise.resolve(execute(false)).then(resolve, reject),
    };
    const execute = (one: boolean) => {
      const rows = db.tables[table] ||= [];
      let results = rows.filter(r => predicates.every(predicate => predicate(r))).slice(0, limit);
      if (operation === "update") results.forEach(r => Object.assign(r, patch));
      if (operation === "insert") { const row = { id: `new-${rows.length}`, ...patch }; rows.push(row); results = [row]; }
      return { data: one ? results[0] || null : results, error: null };
    };
    return query;
  }
}
const config = { ...DEFAULT_REGISTRAR, enabled: true, sandbox: false, autoRegister: true, nameservers: ["ns1.example.com", "ns2.example.com"], agreementUrl: "https://example.com/agreement", rates: [{ tld: "com", productKey: "domcno", markupInr: 10, enabled: true }] };
function mockProvider(t: any, handler: (url: string, init: any) => any) {
  process.env.RESELLERCLUB_RESELLER_ID = "1"; process.env.RESELLERCLUB_API_KEY = "test-key-never-sent";
  t.mock.method(globalThis, "fetch", async (url: any, init: any) => ({ ok: true, json: async () => handler(String(url), init) }));
}

test("only normalized supported registration names are accepted", () => {
  assert.equal(normalizeDomain(" My-Shop.COM. "), "my-shop.com");
  assert.deepEqual(domainParts("shop.co.in"), { name: "shop", tld: "co.in" });
  for (const bad of ["https://shop.com", "shop.com/a", "x..com", "-name.com", "name-.in", "xn--name.com", "127.0.0.1", "name.com:80", "name.uk"]) assert.throws(() => normalizeDomain(bad));
});
test("uncertain and premium registrar responses are never sold as available", () => {
  assert.equal(availability({ status: "available" }), "available");
  assert.equal(availability({ status: "unknown" }), "unknown");
  assert.equal(availability({ status: "regthroughus" }), "taken");
  assert.equal(availability({ status: "available", isPremium: "true" }), "premium");
});
test("domain pricing uses integer paise with explicit margin, exchange rate and tax", () => {
  assert.deepEqual(retailPrice("100", { ...config, taxPercent: 18 }, 10), { costPaise: 10000, pricePaise: 12980 });
  assert.equal(retailPrice(10, { ...config, costToInr: 85 }, 50).pricePaise, 90000);
  for (const value of [undefined, "bad", -1, 0]) assert.throws(() => retailPrice(value, config, 0));
  assert.equal(cartTotal(299, 999, 129.8), 1427.8);
});
test("shop trial, pending, revoked and expired states do not become paid access", () => {
  const future = new Date(Date.now() + 86400000).toISOString(), past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(addonActive({ ecom_addon: false, ecom_addon_status: "active" }), false);
  for (const status of ["requested", "cancelled", "expired", "paused"]) assert.equal(addonActive({ ecom_addon: true, ecom_addon_status: status }), false);
  assert.equal(addonActive({ ecom_addon: true, ecom_addon_status: "active", ecom_addon_expires_at: past }), false);
  assert.equal(addonActive({ ecom_addon: true, ecom_addon_status: "active", ecom_addon_expires_at: future }), true);
});
test("shop renewal periods clamp correctly at month ends", () => {
  assert.equal(shopExpiry("monthly", new Date("2028-01-31T12:00:00Z")), "2028-02-29T12:00:00.000Z");
  assert.equal(shopExpiry("yearly", new Date("2028-02-29T12:00:00Z")), "2029-02-28T12:00:00.000Z");
  assert.equal(shopExpiry("one_time"), null);
});
test("checkout charges plan + shop + domain once, then keeps the frozen total", async () => {
  const db = new MemoryDb({ builder_sessions: [{ id: "s", selected_plan_id: "p", wants_ecommerce: true, ecom_addon_price_inr: 999, domain_type: "buy_with_us", selected_domain: "shop.com", domain_quote_id: "q", domain_registrant: { acceptedAt: "today" } }], service_plans: [{ id: "p", name: "Silver", price_inr: 299, billing: "monthly", ecom_product_limit: 0 }], domain_quotes: [{ id: "q", session_id: "s", domain: "shop.com", price_inr: 110, renewal_inr: 130, sandbox: false, expires_at: new Date(Date.now() + 10000).toISOString() }], domain_registrar_settings: [{ id: 1, config }] });
  const result = await builderBreakdown(db, "s", true);
  assert.equal(result.total, 1408);
  db.tables.service_plans[0].price_inr = 9999; db.tables.domain_quotes[0].price_inr = 9999;
  assert.equal((await builderBreakdown(db, "s", true)).total, 1408);
});
test("checkout refuses another browser session's quote and expired quotes", async () => {
  const q: any = { id: "q", session_id: "other", domain: "shop.com", sandbox: false, expires_at: new Date(Date.now() + 10000).toISOString() };
  const db = new MemoryDb({ builder_sessions: [{ id: "s", selected_plan_id: "p", domain_type: "buy_with_us", selected_domain: "shop.com", domain_quote_id: "q" }], service_plans: [{ id: "p", price_inr: 299 }], domain_quotes: [q] });
  await assert.rejects(builderBreakdown(db, "s")); q.session_id = "s"; q.expires_at = "2000-01-01";
  await assert.rejects(builderBreakdown(db, "s"));
});
test("a plan with included shop access is not charged a second shop addon", async () => {
  const db = new MemoryDb({ builder_sessions: [{ id: "s", selected_plan_id: "p", wants_ecommerce: true, ecom_addon_price_inr: 999 }], service_plans: [{ id: "p", name: "Shop plan", price_inr: 499, ecom_product_limit: 200 }] });
  const result = await builderBreakdown(db, "s"); assert.equal(result.total, 499); assert.equal(result.addon, null);
});
test("domain search uses the configured provider and real pricing response", async t => {
  mockProvider(t, url => url.includes("available") ? { "shop.com": { status: "available" } } : { domcno: { addnewdomain: { "1": "100" }, renewdomain: { "1": "120" } } });
  const result = await quoteDomain(config, "shop.com"); assert.equal(result.available, true); if (result.available) { assert.equal(result.priceInr, 110); assert.equal(result.renewalInr, 130); }
});
test("payment verification requires a captured payment for exact merchant order, currency and amount", async t => {
  process.env.RAZORPAY_KEY_ID = "test-id"; process.env.RAZORPAY_KEY_SECRET = "test-secret";
  const proof = { orderId: "order_1", paymentId: "pay_1", signature: createHmac("sha256", "test-secret").update("order_1|pay_1").digest("hex") };
  const payload: any = { status: "captured", order_id: "order_1", amount: 11000, currency: "INR" };
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => payload }));
  await verifyPlatformPayment({ payment_order_id: "order_1", price_inr: 110 }, proof);
  payload.status = "authorized"; await assert.rejects(verifyPlatformPayment({ payment_order_id: "order_1", price_inr: 110 }, proof));
  payload.status = "captured"; payload.amount = 100; await assert.rejects(verifyPlatformPayment({ payment_order_id: "order_1", price_inr: 110 }, proof));
});
test("unpaid domains never reach registration, even with a supplied payment ID", async () => {
  assert.equal(canRegister("awaiting_payment", true), false);
  const db = new MemoryDb({ domain_orders: [{ id: "o", status: "awaiting_payment", payment_id: "invented" }] });
  await provisionDomain(db, "o"); assert.equal(db.tables.domain_orders[0].status, "awaiting_payment");
});
test("ambiguous registrar results are retained for review and never auto-purchased twice", async t => {
  let registrations = 0;
  const r = { fullName: "A Person", email: "person@example.com" };
  const registrantHash = createHash("sha256").update(JSON.stringify(r)).digest("hex");
  mockProvider(t, (url, init) => { if (url.includes("available")) return { "shop.com": { status: "available" } }; if (url.includes("reseller-cost-price")) return { domcno: { addnewdomain: { "1": 100 }, renewdomain: { "1": 120 } } }; if (url.includes("register.json")) registrations++; throw new Error("network timeout"); });
  const db = new MemoryDb({ domain_orders: [{ id: "o", status: "paid", payment_id: "pay_1", user_id: "u", domain: "shop.com", cost_paise: 10000, sandbox: false, registrant: r }], domain_registrar_contacts: [{ user_id: "u", sandbox: false, customer_id: "1", contact_id: "2", registrant_hash: registrantHash }], domain_registrar_settings: [{ id: 1, config }] });
  await provisionDomain(db, "o"); assert.equal(db.tables.domain_orders[0].status, "needs_review");
  await provisionDomain(db, "o"); assert.equal(registrations, 1);
});
test("registration is confirmed only after an active registrar order for the right customer", async t => {
  let registrations = 0;
  const r = { fullName: "A Person", email: "person@example.com" };
  const registrantHash = createHash("sha256").update(JSON.stringify(r)).digest("hex");
  mockProvider(t, url => {
    if (url.includes("available")) return { "shop.com": { status: "available" } };
    if (url.includes("reseller-cost-price")) return { domcno: { addnewdomain: { "1": 100 }, renewdomain: { "1": 120 } } };
    if (url.includes("register.json")) { registrations++; return { entityid: 12, actionstatus: "Success" }; }
    if (url.includes("details-by-name")) return { domainname: "shop.com", customerid: "1", currentstatus: "Active", entityid: 12, endtime: 1900000000 };
    throw new Error("Unexpected provider call");
  });
  const db = new MemoryDb({ domain_orders: [{ id: "o", status: "paid", payment_id: "pay_1", user_id: "u", domain: "shop.com", cost_paise: 10000, sandbox: false, registrant: r }], domain_registrar_contacts: [{ user_id: "u", sandbox: false, customer_id: "1", contact_id: "2", registrant_hash: registrantHash }], domain_registrar_settings: [{ id: 1, config }] });
  await provisionDomain(db, "o"); assert.equal(db.tables.domain_orders[0].status, "registered");
  await provisionDomain(db, "o"); assert.equal(registrations, 1);
});
test("registrar cost increases after payment produce a refund/review path without purchase", async t => {
  let registrations = 0;
  mockProvider(t, url => {
    if (url.includes("available")) return { "shop.com": { status: "available" } };
    if (url.includes("reseller-cost-price")) return { domcno: { addnewdomain: { "1": 500 }, renewdomain: { "1": 500 } } };
    registrations++; throw new Error("A registration must not be attempted");
  });
  const db = new MemoryDb({ domain_orders: [{ id: "o", status: "paid", payment_id: "pay", domain: "shop.com", cost_paise: 10000, sandbox: false }], domain_registrar_settings: [{ id: 1, config }] });
  await provisionDomain(db, "o"); assert.equal(db.tables.domain_orders[0].status, "refund_required"); assert.equal(registrations, 0);
});
test("disabled and sandbox registrar settings never initiate registration", async t => {
  t.mock.method(globalThis, "fetch", async () => { throw new Error("Provider should not be called"); });
  for (const settings of [{ ...config, enabled: false }, { ...config, sandbox: true }]) {
    const db = new MemoryDb({ domain_orders: [{ id: "o", status: "paid", payment_id: "pay", sandbox: false }], domain_registrar_settings: [{ id: 1, config: settings }] });
    await provisionDomain(db, "o"); assert.equal(db.tables.domain_orders[0].status, "paid");
  }
});

test("webhooks require exact raw body and valid signature; worker requires a nonempty secret", async () => {
  const { validWebhookSignature, validWorkerToken } = await import("../platform-webhook.server");
  const body = JSON.stringify({ event: "payment.captured" }), sig = createHmac("sha256", "secret").update(body).digest("hex");
  assert.equal(validWebhookSignature(body, sig, "secret"), true);
  assert.equal(validWebhookSignature(body + " ", sig, "secret"), false);
  assert.equal(validWebhookSignature(body, sig, "other"), false);
  assert.equal(validWebhookSignature(body, "bad", "secret"), false);
  assert.equal(validWorkerToken("", ""), false);
  assert.equal(validWorkerToken("worker", "worker"), true);
  assert.equal(validWorkerToken("wrong", "worker"), false);
});
test("captured domain webhook replay never duplicates an order or purchases a domain", async t => {
  const { processCapturedWebhook } = await import("../platform-webhook.server");
  process.env.RAZORPAY_KEY_ID = "test-id"; process.env.RAZORPAY_KEY_SECRET = "test-secret";
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ status: "captured", order_id: "order_1", amount: 11000, currency: "INR" }) }));
  const db = new MemoryDb({ domain_orders: [{ id: "d", payment_order_id: "order_1", status: "awaiting_payment", price_inr: 110 }] });
  const event = { event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1", status: "captured" } } } };
  await processCapturedWebhook(db, event); await processCapturedWebhook(db, event);
  assert.equal(db.tables.domain_orders.length, 1);
  assert.equal(db.tables.domain_orders[0].status, "paid");
  assert.equal(db.tables.domain_orders[0].payment_id, "pay_1");
  assert.deepEqual(await processCapturedWebhook(db, { event: "payment.authorized" }), { ignored: true });
});
test("wrong capture amount leaves domain checkout unpaid", async t => {
  const { processCapturedWebhook } = await import("../platform-webhook.server");
  process.env.RAZORPAY_KEY_ID = "test-id"; process.env.RAZORPAY_KEY_SECRET = "test-secret";
  t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ status: "captured", order_id: "order_1", amount: 100, currency: "INR" }) }));
  const db = new MemoryDb({ domain_orders: [{ id: "d", payment_order_id: "order_1", status: "awaiting_payment", price_inr: 110 }] });
  await assert.rejects(processCapturedWebhook(db, { event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1", status: "captured" } } } }));
  assert.equal(db.tables.domain_orders[0].status, "awaiting_payment");
});
