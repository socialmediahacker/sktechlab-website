import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function digits(p: string) {
  const d = p.replace(/\D/g, "");
  return d.length === 10 ? "91" + d : d;
}

function sameSecret(a: string, b: string) {
  const x = createHash("sha256").update(a, "utf8").digest();
  const y = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(x, y);
}

/**
 * Master admin login (phone + password).
 * Verifies against server-only secrets, then hands back a one-time credential
 * pair so the browser can establish a normal Supabase session.
 */
export const masterAdminLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; password: string }) =>
    z.object({ phone: z.string().trim().min(6), password: z.string().min(4) }).parse(d),
  )
  .handler(async ({ data }) => {
    const expectedPhone = digits(process.env["ADMIN_MASTER_PHONE"] ?? "");
    const expectedPass = process.env["ADMIN_MASTER_PASSWORD"] ?? "";
    if (!expectedPhone || !expectedPass) throw new Error("Master admin is not configured");

    const phone = digits(data.phone);
    const ok = sameSecret(phone, expectedPhone) && sameSecret(data.password, expectedPass);
    if (!ok) throw new Error("Invalid credentials");

    const db = await admin();
    const email = `phone-${phone}@sktechlab.local`;
    const password = randomBytes(24).toString("hex");

    // Find (or create) the master account.
    let userId: string | null = null;
    const { data: prof } = await db
      .from("profiles")
      .select("id")
      .eq("whatsapp_number", "+" + phone)
      .maybeSingle();
    if (prof?.id) userId = prof.id;

    if (!userId) {
      const { data: page } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = page?.users?.find((u: any) => u.email === email);
      if (found) userId = found.id;
    }

    if (!userId) {
      const { data: created, error } = await db.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "SK", whatsapp_number: "+" + phone },
      });
      if (error || !created?.user) throw new Error(error?.message ?? "Could not create master admin");
      userId = created.user.id;
    } else {
      const { error: upd } = await db.auth.admin.updateUserById(userId, { password });
      if (upd) throw new Error(upd.message);
    }

    // Guarantee full access on every login.
    for (const role of ["admin", "super_admin"] as const) {
      await db.from("user_roles").upsert({ user_id: userId, role } as any, { onConflict: "user_id,role" });
    }
    await db.from("profiles").update({ full_name: "SK", whatsapp_number: "+" + phone }).eq("id", userId);

    return { email, password };
  });
