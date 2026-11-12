import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Assign or remove a role for a user. Super-admin only for role changes. */
export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; role: string; enabled: boolean }) => {
    const allowed = ["super_admin", "admin", "staff", "support", "user"];
    if (!input.userId) throw new Error("userId required");
    if (!allowed.includes(input.role)) throw new Error("Invalid role");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertSuperAdmin(context.supabase, context.userId);

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: data.userId, role: data.role as any }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", data.role as any);
      if (error) throw new Error(error.message);
    }

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: data.enabled ? "role.granted" : "role.revoked",
      entity_type: "user",
      entity_id: data.userId,
      details: { role: data.role },
    });
    return { ok: true };
  });

/** Toggle a permission for a role. */
export const adminToggleRolePermission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: string; permissionId: string; enabled: boolean }) => {
    if (!input.role || !input.permissionId) throw new Error("role and permissionId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertSuperAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertSuperAdmin(context.supabase, context.userId);
    if (data.role === "super_admin") throw new Error("Super admin permissions cannot be changed");

    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("role_permissions")
        .upsert({ role: data.role as any, permission_id: data.permissionId }, { onConflict: "role,permission_id" });
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("role_permissions")
        .delete()
        .eq("role", data.role as any)
        .eq("permission_id", data.permissionId);
      if (error) throw new Error(error.message);
    }

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "permission.updated",
      entity_type: "role",
      entity_id: data.role,
      details: { permissionId: data.permissionId, enabled: data.enabled },
    });
    return { ok: true };
  });

/** Read-only snapshot of a user (safe alternative to session hijacking). */
export const adminUserSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string }) => {
    if (!input.userId) throw new Error("userId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "users", "impersonate");

    const [profile, sites, invoices, domains, tickets, roles] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", data.userId).maybeSingle(),
      supabaseAdmin.from("sites").select("id,name,subdomain,published,updated_at").eq("user_id", data.userId),
      supabaseAdmin.from("invoices").select("*").eq("user_id", data.userId).order("created_at", { ascending: false }).limit(20),
      supabaseAdmin.from("domain_requests").select("*").eq("user_id", data.userId),
      supabaseAdmin.from("support_tickets").select("id,subject,status,created_at").eq("user_id", data.userId).limit(20),
      supabaseAdmin.from("user_roles").select("role").eq("user_id", data.userId),
    ]);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "user.viewed_as",
      entity_type: "user",
      entity_id: data.userId,
    });

    return {
      profile: profile.data ?? null,
      sites: sites.data ?? [],
      invoices: invoices.data ?? [],
      domains: domains.data ?? [],
      tickets: tickets.data ?? [],
      roles: (roles.data ?? []).map((r: any) => String(r.role)),
    };
  });

/** Prepare DNS instructions for a custom domain request. */
export const adminPrepareDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string }) => {
    if (!input.requestId) throw new Error("requestId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, normalizeDomain, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "domains", "manage");

    const { data: req, error } = await supabaseAdmin
      .from("domain_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Domain request not found");

    const domain = normalizeDomain(String(req.domain));
    const token = `sktechlab-verify=${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const patch = {
      domain,
      verification_token: token,
      record_type: "A",
      record_name: domain,
      record_value: "185.158.133.1",
      status: "verifying",
      last_checked_at: null,
    };
    const { error: e2 } = await supabaseAdmin.from("domain_requests").update(patch).eq("id", data.requestId);
    if (e2) throw new Error(e2.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "domain.prepared",
      entity_type: "domain_request",
      entity_id: data.requestId,
      details: { domain },
    });
    return { ...patch, txtName: `_sktechlab.${domain}`, txtValue: token };
  });

/** Live DNS verification of a custom domain. */
export const adminVerifyDomain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { requestId: string }) => {
    if (!input.requestId) throw new Error("requestId required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, dnsLookup, normalizeDomain, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "domains", "manage");

    const { data: req, error } = await supabaseAdmin
      .from("domain_requests")
      .select("*")
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Domain request not found");

    const domain = normalizeDomain(String(req.domain));
    const expectedIp = String(req.record_value || "185.158.133.1");
    const token = req.verification_token ? String(req.verification_token) : null;

    let aRecords: string[] = [];
    let txtRecords: string[] = [];
    let failure: string | null = null;
    try {
      [aRecords, txtRecords] = await Promise.all([
        dnsLookup(domain, "A"),
        dnsLookup(`_sktechlab.${domain}`, "TXT"),
      ]);
    } catch (err) {
      failure = err instanceof Error ? err.message : "DNS lookup failed";
    }

    const aOk = aRecords.includes(expectedIp.toLowerCase());
    const txtOk = !token || txtRecords.some((t) => t === token.toLowerCase());
    const verified = !failure && aOk && txtOk;

    const now = new Date().toISOString();
    await supabaseAdmin
      .from("domain_requests")
      .update({
        last_checked_at: now,
        status: verified ? "completed" : "verifying",
        ...(verified ? { verified_at: now } : {}),
      })
      .eq("id", data.requestId);


    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: verified ? "domain.verified" : "domain.verify_failed",
      entity_type: "domain_request",
      entity_id: data.requestId,
      details: { domain, aRecords, txtRecords },
    });

    return { verified, aOk, txtOk, aRecords, txtRecords, error: failure };
  });

/** Create an invoice for a user (manual or after payment approval). */
export const adminCreateInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    userId: string;
    planId?: string | null;
    planName?: string | null;
    amount: number;
    taxPercent?: number;
    status?: string;
    gstin?: string | null;
    notes?: string | null;
    months?: number;
  }) => {
    if (!input.userId) throw new Error("userId required");
    if (!(input.amount >= 0)) throw new Error("Invalid amount");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, invoiceTotals, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "invoices", "manage");

    const { tax, total } = invoiceTotals(data.amount, data.taxPercent ?? 0);
    const start = new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + (data.months ?? 12));

    const { data: row, error } = await supabaseAdmin
      .from("invoices")
      .insert({
        user_id: data.userId,
        plan_id: data.planId ?? null,
        plan_name: data.planName ?? null,
        amount_inr: data.amount,
        tax_inr: tax,
        total_inr: total,
        status: data.status ?? "paid",
        period_start: start.toISOString(),
        period_end: end.toISOString(),
        gstin: data.gstin ?? null,
        notes: data.notes ?? null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "invoice.created",
      entity_type: "invoice",
      entity_id: row.id,
      details: { userId: data.userId, total },
    });
    return row;
  });

/** Create or update a message template. */
export const adminSaveMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    id?: string | null;
    key: string;
    channel: string;
    name: string;
    subject?: string | null;
    body: string;
    isEnabled: boolean;
  }) => {
    if (!input.key || !input.body) throw new Error("key and body required");
    if (!["whatsapp", "sms", "email"].includes(input.channel)) throw new Error("Invalid channel");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "templates_msg", "manage");

    const payload = {
      key: data.key,
      channel: data.channel,
      name: data.name,
      subject: data.subject ?? null,
      body: data.body,
      is_enabled: data.isEnabled,
    };
    const { data: row, error } = data.id
      ? await supabaseAdmin.from("message_templates").update(payload).eq("id", data.id).select("*").single()
      : await supabaseAdmin.from("message_templates").upsert(payload, { onConflict: "key,channel" }).select("*").single();
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "message_template.saved",
      entity_type: "message_template",
      entity_id: row.id,
      details: { key: data.key, channel: data.channel },
    });
    return row;
  });

export const adminDeleteMessageTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "templates_msg", "manage");
    const { error } = await supabaseAdmin.from("message_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "message_template.deleted",
      entity_type: "message_template",
      entity_id: data.id,
    });
    return { ok: true };
  });

/** Render a template with sample variables and record a delivery log entry. */
export const adminPreviewMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { templateId: string; recipient: string; vars?: Record<string, string> }) => {
    if (!input.templateId) throw new Error("templateId required");
    if (!input.recipient || input.recipient.length > 200) throw new Error("Valid recipient required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, renderTemplate } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "templates_msg", "manage");

    const { data: tpl, error } = await supabaseAdmin
      .from("message_templates")
      .select("*")
      .eq("id", data.templateId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!tpl) throw new Error("Template not found");

    const vars = { name: "Demo User", plan: "Business", otp: "123456", domain: "example.com", ...(data.vars ?? {}) };
    const body = renderTemplate(String(tpl.body), vars);
    const subject = tpl.subject ? renderTemplate(String(tpl.subject), vars) : null;

    await supabaseAdmin.from("message_logs").insert({
      channel: String(tpl.channel),
      template_key: String(tpl.key),
      recipient: data.recipient,
      subject,
      body_preview: body.slice(0, 400),
      status: "preview",
    });

    return { subject, body, channel: String(tpl.channel) };
  });

/**
 * Activate a plan for a user: updates the profile, auto-creates an invoice and
 * queues the "plan_purchased" notification from the saved message template.
 */
export const adminActivateUserPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { userId: string; plan: string; months?: number; amount?: number | null }) => {
    if (!input.userId) throw new Error("userId required");
    if (typeof input.plan !== "string") throw new Error("plan required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { assertPermission, invoiceTotals, renderTemplate, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertPermission(context.supabase, context.userId, "users", "manage");

    const plan = data.plan.trim();
    const months = data.months ?? 12;

    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ active_plan: plan || null, plan_tier: plan || "trial" })
      .eq("id", data.userId);
    if (pErr) throw new Error(pErr.message);

    let invoice: any = null;
    if (plan) {
      let amount = data.amount ?? null;
      let planName = plan;
      if (amount == null) {
        const { data: match } = await supabaseAdmin
          .from("plans")
          .select("name, slug, price_inr")
          .or(`slug.eq.${plan},name.eq.${plan}`)
          .maybeSingle();
        if (match) {
          amount = Number(match.price_inr);
          planName = String(match.name);
        }
      }
      if (amount != null) {
        const { tax, total } = invoiceTotals(amount, 0);
        const start = new Date();
        const end = new Date(start);
        end.setMonth(end.getMonth() + months);
        const { data: row } = await supabaseAdmin
          .from("invoices")
          .insert({
            user_id: data.userId,
            plan_name: planName,
            amount_inr: amount,
            tax_inr: tax,
            total_inr: total,
            status: "paid",
            period_start: start.toISOString(),
            period_end: end.toISOString(),
          })
          .select("*")
          .maybeSingle();
        invoice = row ?? null;
      }
    }

    // Queue the plan notification when a template exists and is enabled.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, whatsapp_number")
      .eq("id", data.userId)
      .maybeSingle();
    const { data: tpl } = await supabaseAdmin
      .from("message_templates")
      .select("*")
      .eq("key", "plan_purchased")
      .eq("is_enabled", true)
      .maybeSingle();
    if (tpl && profile?.whatsapp_number) {
      const vars = { name: String(profile.full_name || "there"), plan: plan || "trial" };
      await supabaseAdmin.from("message_logs").insert({
        channel: String(tpl.channel),
        template_key: "plan_purchased",
        recipient: String(profile.whatsapp_number),
        subject: tpl.subject ? renderTemplate(String(tpl.subject), vars) : null,
        body_preview: renderTemplate(String(tpl.body), vars).slice(0, 400),
        status: "queued",
      });
    }

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "plan.activated",
      entity_type: "user",
      entity_id: data.userId,
      details: { plan, months, invoiceId: invoice?.id ?? null },
    });

    return { ok: true, invoice };
  });

