import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { confirmCapturedPayment } from "./platform-payments.server";
export function validWebhookSignature(body: string, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(createHmac("sha256", secret).update(body).digest("hex")), Buffer.from(signature));
}
export function validWorkerToken(value: string, secret: string) {
  if (!value || !secret) return false;
  return timingSafeEqual(createHash("sha256").update(value).digest(), createHash("sha256").update(secret).digest());
}
export async function processCapturedWebhook(sb: any, payload: any) {
  if (payload.event !== "payment.captured") return { ignored: true };
  const p = payload.payload?.payment?.entity;
  if (!p || !/^pay_[A-Za-z0-9]+$/.test(p.id || "") || !/^order_[A-Za-z0-9]+$/.test(p.order_id || "") || p.status !== "captured") throw new Error("Invalid payment event.");
  const { data: domain } = await sb.from("domain_orders").select("*").eq("payment_order_id", p.order_id).maybeSingle();
  if (domain) {
    await confirmCapturedPayment(domain, p.id);
    if (domain.status === "awaiting_payment") {
      const { error } = await sb.from("domain_orders").update({ status: "paid", payment_id: p.id }).eq("id", domain.id).eq("status", "awaiting_payment");
      if (error) {
        await sb.from("domain_orders").update({ status: "refund_required", payment_id: p.id, status_message: "Payment confirmed but a conflicting domain order needs review/refund." }).eq("id", domain.id).eq("status", "awaiting_payment");
      }
    }
    return { accepted: true, queued: true };
  }
  const { data: shop } = await sb.from("shop_upgrade_orders").select("*").eq("payment_order_id", p.order_id).maybeSingle();
  if (shop) {
    await confirmCapturedPayment(shop, p.id);
    if (shop.status === "awaiting_payment") {
      const { error } = await sb.from("shop_upgrade_orders").update({ status: "paid", payment_id: p.id, paid_at: new Date().toISOString() }).eq("id", shop.id).eq("status", "awaiting_payment");
      if (error) throw new Error("Could not record shop payment.");
    }
    await (await import("./shop-upgrade.server")).activatePaidShopOrder(sb, shop.id);
    return { accepted: true };
  }
  let { data: builder } = await sb.from("builder_sessions").select("*").eq("payment_method", "razorpay").eq("payment_ref", p.order_id).maybeSingle();
  if (!builder) builder = (await sb.from("builder_sessions").select("*").eq("payment_method", "razorpay").eq("payment_ref", p.id).maybeSingle()).data;
  if (!builder) return { ignored: true };
  await confirmCapturedPayment({ payment_order_id: p.order_id, price_inr: Number(builder.payment_amount_inr) }, p.id);
  if (!["paid", "verified"].includes(builder.payment_status)) {
    const { error } = await sb.from("builder_sessions").update({ payment_status: "paid", payment_ref: p.id, payment_confirmed_at: new Date().toISOString(), current_step: "success" }).eq("id", builder.id).eq("payment_ref", p.order_id);
    if (error) throw new Error("Could not save builder payment.");
  }
  await (await import("./checkout.server")).activateBuilderShop(sb, builder.id);
  await (await import("./domains/provision.server")).fulfillBuilderDomain(sb, builder.id, false);
  return { accepted: true, queued: true };
}
export async function processDomainQueue(sb: any) {
  const config = await (await import("./domains/registrar.server")).registrarConfig(sb);
  if (!config.enabled || !config.autoRegister || config.sandbox) return { processed: 0, paused: true };
  const { data, error } = await sb.from("domain_orders").select("id").eq("status", "paid").order("created_at").limit(1);
  if (error) throw new Error("Could not load domain queue.");
  for (const row of data || []) await (await import("./domains/provision.server")).provisionDomain(sb, row.id);
  return { processed: (data || []).length };
}
