import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  service: z.enum(["digital_marketing", "gmb_boost"]),
  email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().min(8).max(20),
  websiteUrl: z.string().trim().max(300).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

const LABEL: Record<string, string> = {
  digital_marketing: "Digital Marketing",
  gmb_boost: "GMB Boost",
};

/**
 * Public endpoint: stores a service booking request and notifies the admin.
 * Never returns any stored data.
 */
export const submitServiceBooking = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendTemplateEmail } = await import("./email-templates/send-email");

    const serviceLabel = LABEL[data.service] ?? data.service;
    const website = data.websiteUrl || "";

    await supabaseAdmin.from("service_bookings").insert({
      service: data.service,
      email: data.email,
      whatsapp: data.whatsapp,
      website_url: website || null,
      message: data.message,
    });

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

    if (adminTo) {
      try {
        await sendTemplateEmail("new-enquiry", adminTo, {
          templateData: {
            name: `${serviceLabel} booking`,
            email: data.email,
            phone: data.whatsapp,
            message: `${data.message}${website ? `\n\nWebsite: ${website}` : ""}`,
            source: `Home page — ${serviceLabel}`,
            siteName: "SKTECHLAB",
          },
          replyTo: data.email,
        });
      } catch {
        // email failure must not lose the booking
      }
    }

    return { ok: true as const };
  });
