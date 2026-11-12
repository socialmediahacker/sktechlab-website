export async function razorpayReady(db: any) {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  const { data } = await db.from("payment_gateways").select("id").eq("kind", "razorpay").eq("is_enabled", true).limit(1).maybeSingle();
  if (!key || !secret || !data) throw new Error("Online payment is unavailable. Contact support.");
  return { key, secret };
}
export async function createPlatformOrder(db: any, amountInr: number, receipt: string) {
  const { key, secret } = await razorpayReady(db);
  const response = await fetch("https://api.razorpay.com/v1/orders", { method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}`, "Content-Type": "application/json" }, body: JSON.stringify({ amount: Math.round(amountInr * 100), currency: "INR", receipt }) });
  if (!response.ok) throw new Error("Could not create a payment order. Please retry.");
  const order = await response.json(); return { orderId: order.id as string, amount: order.amount as number, currency: order.currency as string, keyId: key };
}
export async function verifyPlatformPayment(order: { payment_order_id: string; price_inr: number }, data: { orderId: string; paymentId: string; signature: string }) {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret || data.orderId !== order.payment_order_id) throw new Error("Payment order mismatch.");
  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const digest = createHmac("sha256", secret).update(`${data.orderId}|${data.paymentId}`).digest("hex");
  if (!/^[a-f0-9]{64}$/.test(data.signature) || !timingSafeEqual(Buffer.from(digest), Buffer.from(data.signature))) throw new Error("Payment signature is invalid.");
  await confirmCapturedPayment(order, data.paymentId);
}
export async function confirmCapturedPayment(order: { payment_order_id: string; price_inr: number }, paymentId: string) {
  const key = process.env.RAZORPAY_KEY_ID, secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key || !secret) throw new Error("Payment verification is unavailable.");
  const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, { signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` } });
  if (!response.ok) throw new Error("Payment could not be verified. Retry verification or contact support.");
  const p = await response.json();
  if (p.status !== "captured" || p.order_id !== order.payment_order_id || p.currency !== "INR" || p.amount !== Math.round(Number(order.price_inr) * 100)) throw new Error("Payment is not confirmed for this order.");
}
