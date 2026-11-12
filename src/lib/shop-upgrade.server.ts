import { shopExpiry } from "./commerce-rules";
export async function activatePaidShopOrder(sb: any, id: string) {
  const { data: order } = await sb.from("shop_upgrade_orders").select("*").eq("id", id).single();
  if (order?.status === "active") return;
  if (!order || order.status !== "paid" || !order.payment_id || !order.paid_at) throw new Error("A verified paid shop order is required.");
  const expiry = shopExpiry(order.billing, new Date(order.paid_at));
  const { error } = await sb.from("profiles").update({ ecom_addon: true, ecom_addon_status: "active", ecom_addon_expires_at: expiry, shop_product_limit: order.product_limit }).eq("id", order.user_id);
  if (error) throw new Error("Payment confirmed; contact support to activate your shop.");
  const { error: finishError } = await sb.from("shop_upgrade_orders").update({ status: "active", activated_at: new Date().toISOString(), expires_at: expiry }).eq("id", order.id).eq("status", "paid");
  if (finishError) throw new Error("Shop access is active; the order status needs reconciliation.");
}
