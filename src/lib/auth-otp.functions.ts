import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomInt, randomBytes } from "node:crypto";

// ---------- helpers ----------
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
function hash(c: string) {
  return createHash("sha256").update(c).digest("hex");
}
function normalizePhone(p: string) {
  const d = p.replace(/\D/g, "");
  // default country: India (91). Accept 10-digit local or already-prefixed.
  return d.length === 10 ? "91" + d : d;
}
function syntheticEmail(phone: string) {
  return `phone-${phone}@sktechlab.local`;
}
async function getSettings() {
  const db = await admin();
  const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  return (data ?? {}) as any;
}

// ---------- providers ----------
async function sendViaWhatsAppCloud(phone: string, code: string) {
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId) return { sent: false, reason: "not_configured" as const };
  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: phone,
        type: "text",
        text: { body: `Your SKTECHLAB verification code is ${code}. Valid for 10 minutes. Do not share it.` },
      }),
    });
    if (!res.ok) {
      console.error("WhatsApp Cloud error:", res.status, await res.text());
      return { sent: false, reason: "provider_error" as const };
    }
    return { sent: true, reason: "ok" as const };
  } catch (e) {
    console.error("WhatsApp Cloud exception:", e);
    return { sent: false, reason: "provider_error" as const };
  }
}

async function sendViaTwilio(phone: string, code: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !tok || !from) return { sent: false, reason: "not_configured" as const };
  try {
    const body = new URLSearchParams({
      To: `whatsapp:+${phone}`,
      From: from.startsWith("whatsapp:") ? from : `whatsapp:${from}`,
      Body: `Your SKTECHLAB verification code is ${code}. Valid 10 min.`,
    });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) return { sent: false, reason: "provider_error" as const };
    return { sent: true, reason: "ok" as const };
  } catch {
    return { sent: false, reason: "provider_error" as const };
  }
}

async function sendViaMsg91(phone: string, code: string) {
  const key = process.env.MSG91_AUTH_KEY;
  const tid = process.env.MSG91_TEMPLATE_ID;
  if (!key || !tid) return { sent: false, reason: "not_configured" as const };
  try {
    const res = await fetch(
      `https://control.msg91.com/api/v5/otp?template_id=${tid}&mobile=${phone}&authkey=${key}&otp=${code}`,
    );
    if (!res.ok) return { sent: false, reason: "provider_error" as const };
    return { sent: true, reason: "ok" as const };
  } catch {
    return { sent: false, reason: "provider_error" as const };
  }
}

async function dispatch(provider: string, phone: string, code: string) {
  if (provider === "whatsapp_cloud") return sendViaWhatsAppCloud(phone, code);
  if (provider === "twilio") return sendViaTwilio(phone, code);
  if (provider === "msg91") return sendViaMsg91(phone, code);
  return { sent: false, reason: "not_configured" as const };
}

// ---------- SEND ----------
export const sendLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) =>
    z.object({ phone: z.string().trim().min(6).max(20) }).parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const phone = normalizePhone(data.phone);
    if (phone.length < 10) throw new Error("Enter a valid phone number");
    const settings = await getSettings();

    // rate limits: 1/min, 5/hour
    const since1m = new Date(Date.now() - 60_000).toISOString();
    const since1h = new Date(Date.now() - 3_600_000).toISOString();
    const { count: c1 } = await db
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gt("created_at", since1m);
    if ((c1 ?? 0) > 0) throw new Error("Please wait 60 seconds before requesting a new code.");
    const { count: c2 } = await db
      .from("otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", phone)
      .gt("created_at", since1h);
    if ((c2 ?? 0) >= 5) throw new Error("Too many requests. Try again after an hour.");

    const code = String(randomInt(100000, 999999));
    const provider = (settings.otp_provider as string) ?? "whatsapp_cloud";
    let result = await dispatch(provider, phone, code);

    if (!result.sent && settings.sms_fallback_enabled && provider !== "msg91") {
      result = await sendViaMsg91(phone, code);
    }

    await db.from("otp_codes").insert({
      phone,
      whatsapp: phone,
      code_hash: hash(code),
      sent_via: result.sent ? provider : "demo",
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });

    if (!result.sent) {
      // Demo mode — surface OTP so admin can still log in before configuring provider.
      console.log(`[OTP DEMO] +${phone} → ${code}`);
      return { sent: true, demo: true, code, provider };
    }
    return { sent: true, demo: false, provider };
  });

// ---------- VERIFY ----------
export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; code: string; name?: string; loginOnly?: boolean }) =>
    z
      .object({
        phone: z.string().trim(),
        code: z.string().trim().length(6),
        name: z.string().trim().max(120).optional(),
        loginOnly: z.boolean().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const phone = normalizePhone(data.phone);

    const { data: rows } = await db
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("consumed", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    if (!rows || rows.length === 0) throw new Error("Code expired. Request a new one.");

    const given = hash(data.code.trim());
    const row = rows.find((r: any) => r.code_hash === given);
    if (!row) {
      const latest = rows[0];
      if (latest.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
      await db.from("otp_codes").update({ attempts: latest.attempts + 1 }).eq("id", latest.id);
      throw new Error("Wrong code. Please re-check the 6 digits or resend.");
    }
    await db.from("otp_codes").update({ consumed: true }).eq("id", row.id);


    const email = syntheticEmail(phone);
    const password = randomBytes(24).toString("hex");

    // Look up existing user by whatsapp_number on profiles (preferred), else by synthetic email.
    let userId: string | null = null;
    const { data: prof } = await db
      .from("profiles")
      .select("id")
      .eq("whatsapp_number", "+" + phone)
      .maybeSingle();
    if (prof?.id) userId = prof.id;

    if (!userId && data.loginOnly) {
      // Sign-in only surface (/auth): never create a new account here.
      const { data: page } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = page?.users?.find((u: any) => u.email === email);
      if (!found) throw new Error("ACCOUNT_NOT_FOUND");
      userId = found.id;
    }

    if (!userId) {
      // Try to create; if email exists, look them up.
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          whatsapp_number: "+" + phone,
          full_name: data.name ?? "",
        },
      });
      if (created?.user) {
        userId = created.user.id;
      } else if (error) {
        // Email exists → fetch id
        const { data: existingByEmail } = await db
          .from("profiles")
          .select("id")
          .limit(1);
        // Fallback: use auth admin listUsers (small scale acceptable).
        const { data: page } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
        const found = page?.users?.find((u: any) => u.email === email);
        if (!found) throw error;
        userId = found.id;
        void existingByEmail;
      }
    }
    if (!userId) throw new Error("Could not sign you in. Try again.");

    // Keep profile phone / name fresh.
    const patch: any = { whatsapp_number: "+" + phone };
    if (data.name) patch.full_name = data.name;
    await db.from("profiles").update(patch).eq("id", userId);

    // Preferred: mint a one-time link so we never touch a password the user set themselves.
    const { data: userRow } = await db.auth.admin.getUserById(userId);
    const loginEmail = userRow?.user?.email ?? email;
    try {
      const { data: link, error: linkErr } = await db.auth.admin.generateLink({
        type: "magiclink",
        email: loginEmail,
      });
      const tokenHash = (link as any)?.properties?.hashed_token;
      if (!linkErr && tokenHash) {
        return { email: loginEmail, tokenHash, password: null as string | null };
      }
    } catch (e) {
      console.error("generateLink failed, falling back to password rotation", e);
    }

    // Fallback: rotate password so client can sign in immediately.
    const { error: updErr } = await db.auth.admin.updateUserById(userId, { password });
    if (updErr) throw updErr;
    return { email: loginEmail, password, tokenHash: null as string | null };
  });

// ---------- CREATE ACCOUNT (builder final step, email + password) ----------
export const createBuilderAccount = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; email: string; password: string; name?: string; whatsapp?: string }) =>
    z
      .object({
        sessionId: z.string().uuid(),
        email: z.string().trim().email(),
        password: z.string().min(6).max(72),
        name: z.string().trim().max(120).optional(),
        whatsapp: z.string().trim().max(20).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    await (await import("@/lib/builder-access.server")).assertBuilderAccess(db, data.sessionId);
    const { data: session } = await db.from("builder_sessions").select("whatsapp_verified, user_id").eq("id", data.sessionId).single();
    if (!session?.whatsapp_verified || session.user_id) throw new Error("Verify your website setup first, or sign in to your existing account.");
    const email = data.email.toLowerCase();

    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true, // no confirmation mail needed — account works immediately
      user_metadata: {
        full_name: data.name ?? "",
        whatsapp_number: data.whatsapp ?? null,
      },
    });

    if (error || !created?.user) {
      const msg = String(error?.message ?? "");
      if (/already|registered|exists/i.test(msg)) {
        throw new Error("This email already has an account. Sign in with your password instead.");
      }
      throw new Error(msg || "Could not create your account. Try again.");
    }

    const patch: any = {};
    if (data.name) patch.full_name = data.name;
    if (data.whatsapp) patch.whatsapp_number = data.whatsapp;
    if (Object.keys(patch).length) await db.from("profiles").update(patch).eq("id", created.user.id);

    return { ok: true, email };
  });

// ---------- SET / RESET PASSWORD AFTER OTP ----------
export const setPasswordAfterOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; code: string; password: string }) =>
    z
      .object({
        phone: z.string().trim(),
        code: z.string().trim().length(6),
        password: z.string().min(6).max(72),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const phone = normalizePhone(data.phone);
    const { data: rows } = await db
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(5);
    const given = hash(data.code.trim());
    const row = rows?.find((r: any) => r.code_hash === given);
    if (!row) throw new Error("Wrong or expired code.");

    const { data: prof } = await db
      .from("profiles")
      .select("id")
      .eq("whatsapp_number", "+" + phone)
      .maybeSingle();
    if (!prof?.id) throw new Error("No account found for this number.");

    const { error } = await db.auth.admin.updateUserById(prof.id, { password: data.password });
    if (error) throw error;
    const { data: userRow } = await db.auth.admin.getUserById(prof.id);
    return { email: userRow?.user?.email ?? syntheticEmail(phone) };
  });
