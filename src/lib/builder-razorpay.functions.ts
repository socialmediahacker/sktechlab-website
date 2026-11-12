import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const createBuilderRazorpayOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const key = process.env["RAZORPAY_KEY_ID"];
    const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!key || !secret) throw new Error("Razorpay is not configured yet. Contact support.");
    const { data: gateway } = await db.from("payment_gateways").select("id").eq("kind", "razorpay").eq("is_enabled", true).limit(1).maybeSingle();
    if (!gateway) throw new Error("Razorpay is disabled.");
    const { data: session } = await db.from("builder_sessions").select("*").eq("id", data.sessionId).single();
    if (!session || session.user_id !== context.userId) throw new Error("This setup belongs to another account.");
    if (["paid", "verified"].includes(session.payment_status)) throw new Error("This order is already paid.");
    const { data: plan } = await db.from("service_plans").select("price_inr").eq("id", session.selected_plan_id ?? "").single();
    if (!plan || plan.price_inr <= 0) throw new Error("Choose a paid website plan.");
    const breakdown = await (await import("./checkout.server")).builderBreakdown(db, session.id, true);
    const amount = Math.round(breakdown.total * 100);
    if (session.payment_method === "razorpay" && session.payment_ref?.startsWith("order_")) return { orderId: session.payment_ref, amount: Math.round(session.payment_amount_inr * 100), currency: "INR", keyId: key };
    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST", signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount, currency: "INR", receipt: session.id, notes: { builder_session_id: session.id } }),
    });
    if (!response.ok) throw new Error("Could not start Razorpay checkout. Please retry.");
    const order = await response.json() as { id: string; amount: number; currency: string };
    let save = db.from("builder_sessions").update({ payment_method: "razorpay", payment_ref: order.id, payment_amount_inr: amount / 100 }).eq("id", session.id);
    save = session.payment_ref ? save.eq("payment_ref", session.payment_ref) : save.is("payment_ref", null);
    const { data: saved, error } = await save.select("id").maybeSingle();
    if (error || !saved) throw new Error("Checkout changed. Reload before paying to use the saved order.");
    return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: key };
  });

export const verifyBuilderRazorpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid(), orderId: z.string().max(120), paymentId: z.string().max(120), signature: z.string().regex(/^[a-f0-9]{64}$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const key = process.env["RAZORPAY_KEY_ID"]; const secret = process.env["RAZORPAY_KEY_SECRET"];
    if (!key || !secret) throw new Error("Razorpay is unavailable.");
    const { data: session } = await db.from("builder_sessions").select("user_id, payment_ref, payment_amount_inr, payment_status").eq("id", data.sessionId).single();
    if (session?.user_id === context.userId && session.payment_status === "paid" && session.payment_ref === data.paymentId) return { ok: true };
    if (!session || session.user_id !== context.userId || session.payment_ref !== data.orderId) throw new Error("Payment order mismatch.");
    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const expected = createHmac("sha256", secret).update(`${data.orderId}|${data.paymentId}`).digest("hex");
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(data.signature))) throw new Error("Payment verification failed.");
    const response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(data.paymentId)}`, { signal: AbortSignal.timeout(15000), headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` } });
    if (!response.ok) throw new Error("Could not verify payment. Please retry.");
    const payment = await response.json() as { status: string; order_id: string; amount: number; currency: string };
    if (payment.status !== "captured" || payment.order_id !== data.orderId || payment.currency !== "INR" || payment.amount !== Math.round(session.payment_amount_inr * 100)) throw new Error("Payment is not yet confirmed. Please contact support.");
    const { error } = await db.from("builder_sessions").update({ payment_status: "paid", payment_confirmed_at: new Date().toISOString(), payment_ref: data.paymentId, current_step: "success" }).eq("id", data.sessionId);
    if (error) throw new Error("Could not record your verified payment.");
    await (await import("./checkout.server")).activateBuilderShop(db, data.sessionId);
    try { await (await import("./domains/provision.server")).fulfillBuilderDomain(db, data.sessionId); } catch { /* payment remains verified; admin can reconcile provisioning */ }
    return { ok: true };
  });