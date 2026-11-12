import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(ctx: any) {
  const { assertAdmin: check } = await import("@/lib/admin.server");
  await check(ctx.supabase, ctx.userId);
}

/* -------------------- public / customer -------------------- */

export const getUpiGatewayConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { loadUpiSettings } = await import("./upi-gateway.server");
  const s = await loadUpiSettings();
  return {
    enabled: Boolean(s.enabled && s.upi_id),
    displayName: s.display_name ?? "UPI (FamPay)",
    instructions: s.instructions ?? "",
    payeeName: s.payee_name ?? null,
    upiId: s.enabled ? (s.upi_id ?? null) : null,
    qrUrl: s.qr_url ?? null,
    expiryMinutes: Number(s.expiry_minutes ?? 15),
    pollSeconds: Number(s.poll_seconds ?? 5),
    manualUtrEnabled: s.manual_utr_enabled !== false,
    autoVerify: s.auto_verify_enabled !== false,
  };
});

export const createUpiIntent = createServerFn({ method: "POST" })
  .inputValidator((d: {
    purpose?: string; referenceId?: string; amount: number; note?: string;
    customerName?: string; customerPhone?: string;
  }) =>
    z.object({
      purpose: z.enum(["builder", "plan", "store_order", "custom"]).default("builder"),
      referenceId: z.string().max(120).optional(),
      amount: z.number().positive().max(1_000_000),
      note: z.string().max(200).optional(),
      customerName: z.string().max(120).optional(),
      customerPhone: z.string().max(20).optional(),
    }).parse(d))
  .handler(async ({ data }) => {
    const mod = await import("./upi-gateway.server");
    const s = await mod.loadUpiSettings();
    if (!s.enabled || !s.upi_id) throw new Error("UPI gateway is not enabled");
    await mod.expireStaleIntents();

    const db = await admin();

    if (data.purpose === "builder") {
      if (!data.referenceId) throw new Error("Website setup reference is required.");
      await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.referenceId);
      const { data: session } = await db.from("builder_sessions").select("selected_plan_id, wants_ecommerce, ecom_addon_price_inr, user_id").eq("id", data.referenceId).single();
      if (!session?.user_id) throw new Error("Set up your site-admin account first.");
      const { data: plan } = await db.from("service_plans").select("price_inr").eq("id", session.selected_plan_id ?? "").single();
      if (!plan || plan.price_inr <= 0) throw new Error("Choose a paid Website Plan.");
      data.amount = (await (await import("./checkout.server")).builderBreakdown(db, data.referenceId, true)).total;
    }

    // Reuse a live intent for the same reference + amount
    if (data.referenceId) {
      const { data: live } = await db
        .from("upi_payment_intents")
        .select("*")
        .eq("reference_id", data.referenceId)
        .in("status", ["pending", "utr_submitted", "paid"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (live && (live as any).status === "paid") {
        return shape(live as any, s, mod);
      }
      if (live && Math.round(Number((live as any).base_amount) * 100) === Math.round(data.amount * 100)) {
        return shape(live as any, s, mod);
      }
    }

    const payable = await mod.nextPayableAmount(data.amount, s);
    const expires = new Date(Date.now() + Number(s.expiry_minutes ?? 15) * 60_000).toISOString();
    const { data: row, error } = await db
      .from("upi_payment_intents")
      .insert({
        purpose: data.purpose,
        reference_id: data.referenceId ?? null,
        base_amount: data.amount,
        payable_amount: payable,
        note: data.note ?? null,
        upi_id: s.upi_id,
        customer_name: data.customerName ?? null,
        customer_phone: data.customerPhone ?? null,
        expires_at: expires,
      } as any)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return shape(row as any, s, mod);
  });

function shape(row: any, s: any, mod: typeof import("./upi-gateway.server")) {
  const note = `SKL-${String(row.id).slice(0, 8).toUpperCase()}`;
  const link = mod.upiDeepLink(s, Number(row.payable_amount), note);
  return {
    id: row.id as string,
    status: row.status as string,
    baseAmount: Number(row.base_amount),
    payableAmount: Number(row.payable_amount),
    upiId: s.upi_id as string,
    payeeName: (s.payee_name ?? s.display_name) as string,
    note,
    upiLink: link,
    // When each payment needs a unique amount, the QR MUST carry that amount,
    // so a static admin-uploaded QR can only be used if unique amounts are off.
    qrUrl: s.unique_amount_enabled === false
      ? ((s.qr_url as string | null) || mod.qrImageUrl(link))
      : mod.qrImageUrl(link),
    expiresAt: row.expires_at as string,
    instructions: (s.instructions ?? "") as string,
    pollSeconds: Number(s.poll_seconds ?? 5),
    manualUtrEnabled: s.manual_utr_enabled !== false,
  };
}

export const getUpiIntentStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { intentId: string }) => z.object({ intentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { expireStaleIntents } = await import("./upi-gateway.server");
    await expireStaleIntents();
    const db = await admin();
    const cols = "id, status, payable_amount, matched_txn_id, expires_at, utr";
    let { data: row } = await db
      .from("upi_payment_intents")
      .select(cols)
      .eq("id", data.intentId)
      .maybeSingle();
    if (!row) throw new Error("Payment not found");

    // Auto inbox check (FamPay/bank alert mails) while the customer waits.
    if (["pending", "utr_submitted", "expired"].includes((row as any).status)) {
      try {
        const { pollUpiInbox } = await import("./upi-imap.server");
        const res = await pollUpiInbox();
        if (res.ok && res.matched > 0) {
          const { data: fresh } = await db.from("upi_payment_intents").select(cols).eq("id", data.intentId).maybeSingle();
          if (fresh) row = fresh;
        }
      } catch { /* inbox problems never break status polling */ }
    }

    return {
      id: (row as any).id as string,
      status: (row as any).status as string,
      payableAmount: Number((row as any).payable_amount),
      txnId: ((row as any).matched_txn_id ?? (row as any).utr ?? null) as string | null,
      expiresAt: (row as any).expires_at as string,
    };
  });

export const submitUpiUtr = createServerFn({ method: "POST" })
  .inputValidator((d: { intentId: string; utr: string }) =>
    z.object({ intentId: z.string().uuid(), utr: z.string().trim().min(4).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const mod = await import("./upi-gateway.server");
    const s = await mod.loadUpiSettings();
    if (s.manual_utr_enabled === false) throw new Error("Manual UTR submission is disabled");
    const db = await admin();
    const { data: row } = await db.from("upi_payment_intents").select("*").eq("id", data.intentId).maybeSingle();
    if (!row) throw new Error("Payment not found");
    if ((row as any).status === "paid") return { status: "paid" };

    await db
      .from("upi_payment_intents")
      .update({ utr: data.utr.trim(), status: "utr_submitted" })
      .eq("id", data.intentId);

    if (s.auto_approve_manual) {
      await mod.markIntentPaid({ ...(row as any), status: "utr_submitted", utr: data.utr.trim() }, {
        txnId: data.utr.trim(),
        source: "manual_utr",
      });
      return { status: "paid" };
    }
    return { status: "utr_submitted" };
  });

/* -------------------- admin -------------------- */

export const adminGetUpiGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data } = await db.from("upi_gateway_settings").select("*").eq("id", 1).maybeSingle();
    const row: any = { ...(data ?? {}) };
    row.imap_app_password_set = Boolean(row.imap_app_password);
    row.imap_app_password = ""; // never send the app password back to the browser
    return row as any;
  });

export const adminSaveUpiGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: Record<string, unknown>) =>
    z.object({
      enabled: z.boolean(),
      display_name: z.string().max(80),
      upi_id: z.string().max(120).nullable().optional(),
      payee_name: z.string().max(120).nullable().optional(),
      qr_url: z.string().max(1000).nullable().optional(),
      instructions: z.string().max(1000),
      random_min: z.number().min(0).max(0.99),
      random_max: z.number().min(0.01).max(0.99),
      unique_amount_enabled: z.boolean(),
      expiry_minutes: z.number().int().min(1).max(1440),
      poll_seconds: z.number().int().min(2).max(120),
      auto_verify_enabled: z.boolean(),
      manual_utr_enabled: z.boolean(),
      auto_approve_manual: z.boolean(),
      sender_allowlist: z.array(z.string().max(160)).max(20),
      notify_admin: z.boolean(),
      imap_enabled: z.boolean().optional(),
      imap_host: z.string().max(160).optional(),
      imap_port: z.number().int().min(1).max(65535).optional(),
      imap_email: z.string().max(200).nullable().optional(),
      imap_app_password: z.string().max(200).optional(),
      imap_folder: z.string().max(120).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    const patch: Record<string, unknown> = { ...data };
    // Empty password field = keep the saved one
    if (!String(patch["imap_app_password"] ?? "").trim()) delete patch["imap_app_password"];
    else patch["imap_app_password"] = String(patch["imap_app_password"]).replace(/\s+/g, "");
    const { error } = await db.from("upi_gateway_settings").update(patch as any).eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: check the payment inbox login (Gmail address + app password). */
export const adminTestUpiImap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data } = await db.from("upi_gateway_settings").select("*").eq("id", 1).maybeSingle();
    const s: any = data ?? {};
    if (!s.imap_email || !s.imap_app_password) {
      return { ok: false, error: "Pehle email aur app password save kijiye." };
    }
    const { testUpiInbox } = await import("./upi-imap.server");
    return await testUpiInbox({
      host: String(s.imap_host || "imap.gmail.com"),
      port: Number(s.imap_port || 993),
      email: String(s.imap_email),
      password: String(s.imap_app_password),
      folder: String(s.imap_folder || "INBOX"),
    });
  });

/** Admin: read the payment inbox right now and match any new payments. */
export const adminPollUpiImap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { pollUpiInbox } = await import("./upi-imap.server");
    return await pollUpiInbox({ force: true, maxMessages: 25 });
  });


export const adminRotateUpiWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const secret = [...crypto.getRandomValues(new Uint8Array(24))]
      .map((b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await db.from("upi_gateway_settings").update({ webhook_secret: secret }).eq("id", 1);
    if (error) throw new Error(error.message);
    return { secret };
  });

export const adminGetUpiWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data } = await db.from("upi_gateway_settings").select("webhook_secret").eq("id", 1).maybeSingle();
    return { secret: ((data as any)?.webhook_secret ?? null) as string | null };
  });

export const adminListUpiIntents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { status?: string } | undefined) =>
    z.object({ status: z.string().max(30).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const db = await admin();
    let q = db.from("upi_payment_intents").select("*").order("created_at", { ascending: false }).limit(100);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return (rows ?? []) as any[];
  });

export const adminListUpiEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const db = await admin();
    const { data } = await db
      .from("upi_email_events")
      .select("id, source, from_email, subject, amount, txn_id, status, reason, matched_intent_id, created_at")
      .order("created_at", { ascending: false })
      .limit(80);
    return (data ?? []) as any[];
  });

export const adminSetUpiIntentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { intentId: string; action: "approve" | "reject"; note?: string }) =>
    z.object({
      intentId: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      note: z.string().max(300).optional(),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const mod = await import("./upi-gateway.server");
    const db = await admin();
    const { data: row } = await db.from("upi_payment_intents").select("*").eq("id", data.intentId).maybeSingle();
    if (!row) throw new Error("Payment not found");
    if (data.action === "approve") {
      await mod.markIntentPaid(row as any, { txnId: (row as any).utr ?? undefined, source: "admin" });
      await db.from("upi_payment_intents").update({ admin_note: data.note ?? null }).eq("id", data.intentId);
    } else {
      await db
        .from("upi_payment_intents")
        .update({ status: "failed", admin_note: data.note ?? null })
        .eq("id", data.intentId);
    }
    return { ok: true };
  });

/** Admin test: feed a sample payment email through the parser + matcher. */
export const adminTestUpiEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { from?: string; subject?: string; body: string }) =>
    z.object({
      from: z.string().max(160).optional(),
      subject: z.string().max(300).optional(),
      body: z.string().min(3).max(20000),
    }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { processPaymentEmail, extractAmount, extractTxnId } = await import("./upi-gateway.server");
    const parsed = {
      amount: extractAmount(`${data.subject ?? ""}\n${data.body}`),
      txnId: extractTxnId(`${data.subject ?? ""}\n${data.body}`),
    };
    // Dry run: never mark a real customer payment as paid from the admin tester.
    const result = await processPaymentEmail(
      { from: data.from ?? null, subject: data.subject ?? null, body: data.body },
      "admin_test",
      { dryRun: true },
    );
    return { parsed, result };
  });
