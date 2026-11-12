import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EmailTypeKey = "welcome" | "site-published" | "new-enquiry" | "enquiry-received";

export const EMAIL_TYPES: { key: EmailTypeKey; label: string; note: string }[] = [
  { key: "welcome", label: "Welcome email", note: "Naya user signup karte hi bheja jaata hai." },
  { key: "site-published", label: "Site published", note: "User ki website live hone par." },
  { key: "new-enquiry", label: "New enquiry (aapko)", note: "Home page / demo site ke contact form se aayi enquiry." },
  { key: "enquiry-received", label: "Enquiry auto-reply", note: "Customer ko 'humein message mil gaya' reply." },
];


/** Send a test email of one template to the given address (admin only). */
export const adminSendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { template: string; to: string }) => input)
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const to = (data.to ?? "").trim();
    if (!to || !to.includes("@")) throw new Error("Valid email address required");
    try {
      const res = await sendTemplateEmail(data.template, to, {
        templateData: { name: "Test", siteName: "Test website", siteUrl: "https://sktechlab.com" },
        idempotencyKey: `test-${data.template}-${Date.now()}`,
      });
      if (res.sent) return { ok: true, message: `Test email sent to ${to}` };
      return { ok: false, message: `Not sent: ${res.reason}` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Send failed" };
    }
  });
