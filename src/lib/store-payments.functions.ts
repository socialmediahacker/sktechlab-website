import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export type StorePaymentMethod = {
  kind: "cod" | "upi" | "bank" | "crypto" | "razorpay";
  label: string;
  instructions: string | null;
  /** manual methods only */
  details: Record<string, string | null>;
  qr: string | null;
  requiresProof: boolean;
  minInr?: number;
  maxInr?: number | null;
};

/* ---------------- public: which methods can a buyer use ---------------- */

export const getStorePaymentMethods = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ siteId: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ methods: StorePaymentMethod[] }> => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: s } = await sb
      .from("store_payment_settings")
      .select("*")
      .eq("site_id", data.siteId)
      .maybeSingle();

    const methods: StorePaymentMethod[] = [];
    if (!s) {
      methods.push({ kind: "cod", label: "Cash on delivery", instructions: null, details: {}, qr: null, requiresProof: false, minInr: 0, maxInr: null });
      return { methods };
    }
    if (s.cod_enabled) {
      methods.push({
        kind: "cod",
        label: "Cash on delivery",
        instructions: s.cod_instructions ?? null,
        details: {},
        qr: null,
        requiresProof: false,
        minInr: Number(s.cod_min_inr ?? 0),
        maxInr: s.cod_max_inr == null ? null : Number(s.cod_max_inr),
      });
    }
    if (s.upi_enabled && s.upi_id) {
      methods.push({
        kind: "upi",
        label: "UPI / QR",
        instructions: s.upi_instructions ?? null,
        details: { "UPI ID": s.upi_id, "Payee": s.upi_name ?? null },
        qr: s.upi_qr_url ?? null,
        requiresProof: true,
      });
    }
    if (s.bank_enabled && s.bank_account_number) {
      methods.push({
        kind: "bank",
        label: "Bank transfer",
        instructions: s.bank_instructions ?? null,
        details: {
          "Account name": s.bank_account_name ?? null,
          "Account number": s.bank_account_number,
          "IFSC": s.bank_ifsc ?? null,
          "Bank": s.bank_name ?? null,
        },
        qr: null,
        requiresProof: true,
      });
    }
    if (s.crypto_enabled && s.crypto_wallet_address) {
      methods.push({
        kind: "crypto",
        label: "Crypto",
        instructions: s.crypto_instructions ?? null,
        details: { "Wallet": s.crypto_wallet_address, "Network": s.crypto_network ?? null },
        qr: s.crypto_qr_url ?? null,
        requiresProof: true,
      });
    }
    if (s.razorpay_enabled && s.razorpay_key_id) {
      methods.push({
        kind: "razorpay",
        label: "Card / Netbanking (Razorpay)",
        instructions: null,
        details: {},
        qr: null,
        requiresProof: true,
      });
    }
    if (!methods.length) {
      methods.push({ kind: "cod", label: "Cash on delivery", instructions: null, details: {}, qr: null, requiresProof: false, minInr: 0, maxInr: null });
    }
    return { methods };
  });

/* ---------------- owner: read + save settings ---------------- */

export const getMyStorePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ siteId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/store-access.server");
    await assertSiteAccess(context.supabase, data.siteId);
    const { data: row } = await context.supabase
      .from("store_payment_settings")
      .select("*")
      .eq("site_id", data.siteId)
      .maybeSingle();
    return { settings: row ?? null };
  });

const SettingsInput = z.object({
  siteId: z.string().uuid(),
  cod_enabled: z.boolean(),
  cod_min_inr: z.number().min(0).max(1_000_000),
  cod_max_inr: z.number().min(0).max(10_000_000).nullable(),
  cod_instructions: z.string().max(500).nullable(),
  upi_enabled: z.boolean(),
  upi_id: z.string().max(120).nullable(),
  upi_name: z.string().max(120).nullable(),
  upi_qr_url: z.string().max(2000).nullable(),
  upi_instructions: z.string().max(500).nullable(),
  bank_enabled: z.boolean(),
  bank_account_name: z.string().max(120).nullable(),
  bank_account_number: z.string().max(60).nullable(),
  bank_ifsc: z.string().max(30).nullable(),
  bank_name: z.string().max(120).nullable(),
  bank_instructions: z.string().max(500).nullable(),
  crypto_enabled: z.boolean(),
  crypto_wallet_address: z.string().max(200).nullable(),
  crypto_network: z.string().max(60).nullable(),
  crypto_qr_url: z.string().max(2000).nullable(),
  crypto_instructions: z.string().max(500).nullable(),
  razorpay_enabled: z.boolean(),
  razorpay_key_id: z.string().max(120).nullable(),
  razorpay_key_secret: z.string().max(200).nullable(),
  razorpay_mode: z.enum(["test", "live"]),
});

export const saveMyStorePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => SettingsInput.parse(i))
  .handler(async ({ data, context }) => {
    const { assertSiteAccess } = await import("@/lib/store-access.server");
    await assertSiteAccess(context.supabase, data.siteId);
    const { siteId, razorpay_key_secret, ...rest } = data;
    const patch: Record<string, unknown> = { site_id: siteId, ...rest };
    // Empty secret means "keep the existing one".
    if (razorpay_key_secret) patch['razorpay_key_secret'] = razorpay_key_secret;

    const { error } = await context.supabase
      .from("store_payment_settings")
      .upsert(patch as never, { onConflict: "site_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------- buyer: submit payment proof ---------------- */

const ProofInput = z.object({
  orderId: z.string().uuid(),
  reference: z.string().trim().max(120).optional(),
  /** data:image/...;base64,xxxx — max ~3 MB */
  proof: z.string().max(4_500_000).optional(),
});

export const submitOrderPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ProofInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");

    const { data: order } = await sb
      .from("orders")
      .select("id, site_id, payment_status")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.payment_status === "paid") return { ok: true, proofUrl: null };

    let proofUrl: string | null = null;
    if (data.proof?.startsWith("data:")) {
      const match = /^data:([^;]+);base64,(.+)$/.exec(data.proof);
      if (!match) throw new Error("Invalid image");
      const mime = match[1]!;
      if (!mime.startsWith("image/")) throw new Error("Only images are allowed");
      const bytes = Buffer.from(match[2]!, "base64");
      if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("Image must be under 3 MB");
      const ext = mime.split("/")[1]?.replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `order-proofs/${order.site_id}/${order.id}-${Date.now()}.${ext}`;
      const up = await sb.storage.from("site-media").upload(path, bytes, { contentType: mime, upsert: true });
      if (up.error) throw new Error(up.error.message);
      const signed = await sb.storage.from("site-media").createSignedUrl(path, TEN_YEARS);
      proofUrl = signed.data?.signedUrl ?? null;
    }

    const patch: Record<string, unknown> = { payment_status: "pending" };
    if (data.reference) patch['payment_reference'] = data.reference;
    if (proofUrl) patch['payment_proof_url'] = proofUrl;
    const { error } = await sb.from("orders").update(patch as never).eq("id", order.id);
    if (error) throw new Error(error.message);
    return { ok: true, proofUrl };
  });

/* ---------------- owner: accept / reject a payment ---------------- */

const ReviewInput = z.object({
  orderId: z.string().uuid(),
  decision: z.enum(["accept", "reject", "refund"]),
  reason: z.string().max(300).optional(),
});

export const reviewOrderPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReviewInput.parse(i))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, site_id, total_inr")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");
    const { assertSiteAccess } = await import("@/lib/store-access.server");
    await assertSiteAccess(context.supabase, order.site_id);

    const patch: Record<string, unknown> =
      data.decision === "accept"
        ? {
            payment_status: "paid",
            status: "processing",
            payment_verified_at: new Date().toISOString(),
            payment_verified_by: context.userId,
            payment_rejected_reason: null,
          }
        : data.decision === "refund"
          ? { payment_status: "refunded", status: "refunded", payment_rejected_reason: data.reason ?? null }
          : { payment_status: "failed", payment_rejected_reason: data.reason ?? "Payment could not be verified" };

    const { error } = await context.supabase.from("orders").update(patch as never).eq("id", order.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
