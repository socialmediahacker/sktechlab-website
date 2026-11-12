import { createFileRoute } from "@tanstack/react-router";

/**
 * Inbound payment-alert email webhook.
 * Forward bank / UPI payment alert mails here (Gmail filter -> forwarder,
 * Cloudflare Email Routing, Zapier, Make, n8n ...).
 *
 * POST /api/public/upi-email?token=<webhook secret>
 * body: { from, subject, text | body | html }
 */
export const Route = createFileRoute("/api/public/upi-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { loadUpiSettings, processPaymentEmail } = await import("@/lib/upi-gateway.server");
        const settings = await loadUpiSettings();
        const secret = settings.webhook_secret;
        if (!secret) return new Response("Gateway webhook not configured", { status: 503 });

        const url = new URL(request.url);
        const provided =
          url.searchParams.get("token") ??
          request.headers.get("x-upi-webhook-secret") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (provided !== secret) return new Response("Invalid webhook secret", { status: 401 });

        let payload: any = {};
        const ctype = request.headers.get("content-type") ?? "";
        try {
          if (ctype.includes("application/json")) {
            payload = await request.json();
          } else {
            const form = await request.formData();
            payload = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
          }
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }

        const body = String(payload.text ?? payload.body ?? payload.plain ?? payload.html ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/&nbsp;/g, " ");
        if (!body.trim()) return new Response("Empty email body", { status: 400 });

        const result = await processPaymentEmail(
          {
            from: String(payload.from ?? payload.sender ?? ""),
            subject: String(payload.subject ?? ""),
            body,
          },
          "webhook",
        );

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
