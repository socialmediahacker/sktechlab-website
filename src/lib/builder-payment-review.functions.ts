import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listBuilderPaymentReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await (await import("@/lib/admin.server")).assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data, error } = await db.from("builder_sessions")
      .select("id, business_name, payment_amount_inr, payment_method, payment_ref, payment_proof_url, selected_plan_id, created_site_id")
      .eq("payment_status", "submitted").order("updated_at", { ascending: false }).limit(100);
    if (error) throw new Error("Could not load payment reviews.");
    return data ?? [];
  });

export const reviewBuilderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ sessionId: z.string().uuid(), approve: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await (await import("@/lib/admin.server")).assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: session } = await db.from("builder_sessions").select("*").eq("id", data.sessionId).single();
    if (!session?.user_id || !session.selected_plan_id || session.payment_status !== "submitted") throw new Error("This payment is no longer awaiting review.");
    const { data: plan } = await db.from("service_plans").select("id, tier").eq("id", session.selected_plan_id).single();
    if (!plan) throw new Error("Selected plan is unavailable.");
    if (data.approve) {
      const { data: existing } = await db.from("service_orders").select("id").eq("notes", `Builder payment: ${session.id}`).maybeSingle();
      if (existing) {
        const { error } = await db.from("service_orders").update({ status: "active" }).eq("id", existing.id);
        if (error) throw new Error("Could not activate this order.");
      } else {
        const { error } = await db.from("service_orders").insert({ user_id: session.user_id, plan_id: plan.id, status: "active", notes: `Builder payment: ${session.id}` });
        if (error) throw new Error("Could not create this order.");
      }
      const { error } = await db.from("profiles").update({ active_plan: plan.tier, plan_tier: plan.tier }).eq("id", session.user_id);
      if (error) throw new Error("Could not activate the website plan. Retry approval.");
    }
    const { data: saved, error } = await db.from("builder_sessions").update({ payment_status: data.approve ? "verified" : "rejected", ...(data.approve ? { payment_confirmed_at: new Date().toISOString() } : {}), current_step: data.approve ? "success" : "payment" })
      .eq("id", session.id).eq("payment_status", "submitted").select("id").maybeSingle();
    if (error || !saved) throw new Error("Payment review changed. Reload and try again.");
    if (session.payment_submission_id) await db.from("payment_submissions").update({ status: data.approve ? "approved" : "rejected", reviewed_by: context.userId, reviewed_at: new Date().toISOString() }).eq("id", session.payment_submission_id);
    if (data.approve && session.created_site_id && session.domain_type === "free_subdomain") await db.from("sites").update({ published: true }).eq("id", session.created_site_id);
    if (data.approve) {
      await (await import("./checkout.server")).activateBuilderShop(db, session.id);
      try { await (await import("./domains/provision.server")).fulfillBuilderDomain(db, session.id); } catch { /* payment remains verified; domain admin can reconcile */ }
    }
    return { ok: true };
  });