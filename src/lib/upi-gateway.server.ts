/**
 * UPI email gateway core (FamPay-style auto verification).
 * Server-only: parses bank/UPI payment alert emails and matches them
 * against pending payment intents by unique payable amount / note / UTR.
 */

export type ParsedEmail = {
  from?: string | null;
  subject?: string | null;
  body: string;
  receivedAt?: string | null;
};

export type UpiSettings = {
  id: number;
  enabled: boolean;
  display_name: string;
  upi_id: string | null;
  payee_name: string | null;
  qr_url: string | null;
  instructions: string;
  random_min: number;
  random_max: number;
  unique_amount_enabled: boolean;
  expiry_minutes: number;
  poll_seconds: number;
  auto_verify_enabled: boolean;
  manual_utr_enabled: boolean;
  auto_approve_manual: boolean;
  sender_allowlist: string[];
  webhook_secret: string | null;
  notify_admin: boolean;
};

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function loadUpiSettings(): Promise<UpiSettings> {
  const sb = await db();
  const { data } = await sb.from("upi_gateway_settings").select("*").eq("id", 1).maybeSingle();
  return (data ?? { id: 1 }) as unknown as UpiSettings;
}

/* ---------------- parsers (ported from the WooCommerce plugin) ---------------- */

const AMOUNT_PATTERNS: RegExp[] = [
  /(?:received|credited)[^0-9₹]{0,24}(?:₹|INR|Rs\.?)\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/,
  /INR\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /Rs\.?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
  /amount\s*[:\-]?\s*(?:₹|INR|Rs\.?)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
];

const TXN_PATTERNS: RegExp[] = [
  /Transaction\s*(?:ID|No\.?)\s*[:#]?\s*([A-Za-z0-9\-]{6,40})/i,
  /Txn\s*(?:ID|No\.?)\s*[:#]?\s*([A-Za-z0-9\-]{6,40})/i,
  /UTR\s*(?:No\.?)?\s*[:#]?\s*([A-Za-z0-9\-]{6,40})/i,
  /UPI\s*Ref(?:erence)?\s*(?:No\.?|ID)?\s*[:#]?\s*([A-Za-z0-9\-]{6,40})/i,
  /Ref(?:erence)?\s*(?:No\.?|ID)?\s*[:#]?\s*([A-Za-z0-9\-]{6,40})/i,
];

export function extractAmount(body: string): number {
  for (const re of AMOUNT_PATTERNS) {
    const m = re.exec(body);
    if (m?.[1]) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  return 0;
}

export function extractTxnId(body: string): string {
  for (const re of TXN_PATTERNS) {
    const m = re.exec(body);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

export function extractReference(body: string): string {
  const m = /(?:SKL|ORDER|Order)[-\s:]?([A-Za-z0-9]{4,24})/.exec(body);
  return m?.[1] ? m[1].trim() : "";
}

function senderAllowed(from: string | null | undefined, allow: string[]): boolean {
  if (!allow?.length) return true;
  const f = (from ?? "").toLowerCase();
  return allow.some((a) => a && f.includes(a.toLowerCase().trim()));
}

/* ---------------- unique amount generation ---------------- */

export async function nextPayableAmount(base: number, s: UpiSettings): Promise<number> {
  const rounded = Math.round(base * 100) / 100;
  if (!s.unique_amount_enabled) return rounded;
  const sb = await db();
  // Reserve against every intent that is still matchable (pending, UTR-submitted,
  // or recently expired) so a new unique amount can never collide with an old one.
  const lateCutoff = new Date(Date.now() - LATE_MATCH_HOURS * 3600_000).toISOString();
  const { data } = await sb
    .from("upi_payment_intents")
    .select("payable_amount")
    .in("status", ["pending", "utr_submitted", "expired"])
    .gte("created_at", lateCutoff);
  const taken = new Set((data ?? []).map((r: any) => Number(r.payable_amount).toFixed(2)));
  const min = Math.max(1, Math.round(Number(s.random_min ?? 0.01) * 100));
  const max = Math.min(99, Math.round(Number(s.random_max ?? 0.99) * 100));
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  for (let i = 0; i < 120; i++) {
    const paise = lo + Math.floor(Math.random() * (hi - lo + 1));
    const candidate = Math.floor(rounded) + paise / 100;
    if (!taken.has(candidate.toFixed(2))) return Math.round(candidate * 100) / 100;
  }
  return rounded;
}

export function upiDeepLink(s: UpiSettings, amount: number, note: string) {
  const params = new URLSearchParams({
    pa: s.upi_id ?? "",
    pn: s.payee_name ?? s.display_name ?? "Payment",
    am: amount.toFixed(2),
    cu: "INR",
    tn: note.slice(0, 40),
  });
  return `upi://pay?${params.toString()}`;
}

export function qrImageUrl(link: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=1&data=${encodeURIComponent(link)}`;
}

/* ---------------- marking paid ---------------- */

export async function markIntentPaid(intent: any, opts: { txnId?: string; source: string; amount?: number }) {
  const sb = await db();
  await sb
    .from("upi_payment_intents")
    .update({
      status: "paid",
      matched_txn_id: opts.txnId ?? null,
      matched_source: opts.source,
      matched_at: new Date().toISOString(),
    })
    .eq("id", intent.id)
    .eq("status", intent.status);

  // Propagate to the thing being paid for
  if (intent.purpose === "builder" && intent.reference_id) {
    const snapshot = await (await import("./checkout.server")).builderBreakdown(sb, intent.reference_id);
    if (Math.round(Number(intent.base_amount) * 100) !== Math.round(snapshot.total * 100)) throw new Error("Payment amount differs from locked checkout. Admin reconciliation required.");
    await sb
      .from("builder_sessions")
      .update({
        payment_status: "paid", payment_confirmed_at: new Date().toISOString(),
        payment_method: "upi_email_gateway",
        payment_ref: opts.txnId ?? intent.utr ?? null,
        payment_amount_inr: Number(intent.payable_amount),
      })
      .eq("id", intent.reference_id);
    await (await import("./checkout.server")).activateBuilderShop(sb, intent.reference_id);
    try { await (await import("./domains/provision.server")).fulfillBuilderDomain(sb, intent.reference_id); } catch { /* paid domain is retained for admin reconciliation */ }
  }
}

export async function expireStaleIntents() {
  const sb = await db();
  await sb
    .from("upi_payment_intents")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());
}

/* ---------------- email → intent matching ---------------- */

/** Late bank alerts still count: expired intents stay matchable for this long. */
const LATE_MATCH_HOURS = 48;

export async function processPaymentEmail(
  email: ParsedEmail,
  source = "webhook",
  opts: { dryRun?: boolean } = {},
) {
  const sb = await db();
  const s = await loadUpiSettings();
  const body = `${email.subject ?? ""}\n${email.body ?? ""}`;

  const logEvent = async (status: string, reason: string, extra: Record<string, unknown> = {}) => {
    if (opts.dryRun) return; // test runs never touch the live event log
    await sb.from("upi_email_events").insert({
      source,
      from_email: email.from ?? null,
      subject: (email.subject ?? "").slice(0, 300),
      body: body.slice(0, 8000),
      status,
      reason,
      ...extra,
    } as any);
  };

  if (!s.enabled || !s.auto_verify_enabled) {
    await logEvent("ignored", "Gateway or auto-verification is off");
    return { matched: false, reason: "disabled" };
  }
  if (!senderAllowed(email.from, s.sender_allowlist ?? [])) {
    await logEvent("ignored", "Sender not allowed");
    return { matched: false, reason: "sender_not_allowed" };
  }

  const amount = extractAmount(body);
  const txnId = extractTxnId(body);
  if (amount <= 0) {
    await logEvent("unmatched", "No amount found in email");
    return { matched: false, reason: "no_amount" };
  }

  // Block reuse of the same transaction
  if (txnId) {
    const { data: dup } = await sb.from("upi_email_events").select("id").eq("txn_id", txnId).maybeSingle();
    if (dup) return { matched: false, reason: "duplicate_txn" };
  }

  await expireStaleIntents();

  // Expired intents stay matchable for a while so late bank alerts still land.
  const lateCutoff = new Date(Date.now() - LATE_MATCH_HOURS * 3600_000).toISOString();
  const { data: pending } = await sb
    .from("upi_payment_intents")
    .select("*")
    .in("status", ["pending", "utr_submitted", "expired"])
    .gte("created_at", lateCutoff)
    .order("created_at", { ascending: false })
    .limit(200);


  const rows = (pending ?? []) as any[];
  const cents = (n: number) => Math.round(Number(n) * 100);

  // 1. UTR already submitted by the customer
  let match = txnId
    ? rows.find((r) => r.utr && String(r.utr).toUpperCase() === txnId.toUpperCase())
    : undefined;

  // 2. Reference code in the email note
  if (!match) {
    const ref = extractReference(body);
    if (ref) match = rows.find((r) => String(r.reference_id ?? "").toLowerCase().includes(ref.toLowerCase()));
  }

  // 3. Unique payable amount. If several intents share that amount, prefer the
  //    live one (pending / UTR submitted) over abandoned, expired attempts.
  if (!match) {
    const same = rows.filter((r) => cents(r.payable_amount) === cents(amount));
    if (same.length === 1) match = same[0];
    else if (same.length > 1) {
      const live = same.filter((r) => r.status === "pending" || r.status === "utr_submitted");
      if (live.length === 1) match = live[0];
    }
  }

  // 4. Customer paid the round base amount instead of the odd one (static QR).
  //    Only safe when unique amounts are off — otherwise a round credit could
  //    match an unrelated order. Expired attempts never qualify here.
  if (!match && !s.unique_amount_enabled) {
    const same = rows.filter(
      (r) =>
        cents(r.base_amount) === cents(amount) &&
        (r.status === "pending" || r.status === "utr_submitted"),
    );
    if (same.length === 1) match = same[0];
  }


  if (!match) {
    await logEvent("unmatched", "No pending payment matched this amount", { amount, txn_id: txnId || null });
    return { matched: false, reason: "no_match", amount };
  }

  if (opts.dryRun) {
    return { matched: true, dryRun: true, intentId: match.id as string, amount, txnId };
  }

  await markIntentPaid(match, { txnId: txnId || undefined, source, amount });
  await logEvent("matched", "Payment verified automatically", {
    amount,
    txn_id: txnId || null,
    matched_intent_id: match.id,
  });
  return { matched: true, intentId: match.id as string, amount, txnId };
}
