import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  source: z.string().trim().max(80).optional().or(z.literal("")),
  siteName: z.string().trim().max(120).optional().or(z.literal("")),
});

/**
 * Public endpoint: sends an enquiry notification to the configured admin
 * address and an auto-reply to the visitor. Never returns any stored data.
 */
export const notifyEnquiry = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let adminTo = "";
    try {
      const { data: row } = await supabaseAdmin
        .from("site_settings")
        .select("email_admin_recipient")
        .eq("id", 1)
        .maybeSingle();
      adminTo = ((row as any)?.email_admin_recipient ?? "").trim();
    } catch {
      adminTo = "";
    }

    const payload = {
      name: data.name,
      email: data.email || "",
      phone: data.phone || "",
      message: data.message || "",
      source: data.source || "Website",
      siteName: data.siteName || "SKTECHLAB",
    };

    const results = { admin: false, customer: false };

    if (adminTo) {
      try {
        const r = await sendTemplateEmail("new-enquiry", adminTo, {
          templateData: payload,
          replyTo: data.email || undefined,
        });
        results.admin = r.sent;
      } catch {
        results.admin = false;
      }
    }

    if (data.email) {
      try {
        const r = await sendTemplateEmail("enquiry-received", data.email, {
          templateData: { name: data.name, message: data.message || "", siteName: payload.siteName },
        });
        results.customer = r.sent;
      } catch {
        results.customer = false;
      }
    }

    return results;
  });
