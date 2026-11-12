import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/platform-payments")({
  server: { handlers: { POST: async ({ request }) => {
    const { validWebhookSignature, validWorkerToken, processCapturedWebhook, processDomainQueue } = await import("@/lib/platform-webhook.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const respond = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { "Content-Type": "application/json" } });
    const workerToken = request.headers.get("x-domain-worker-secret") || "";
    if (workerToken) {
      if (!validWorkerToken(workerToken, process.env.DOMAIN_WORKER_SECRET || "")) return respond({ error: "Invalid worker credentials" }, 401);
      try { return respond(await processDomainQueue(supabaseAdmin)); } catch { return respond({ error: "Domain queue needs review" }, 503); }
    }
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return respond({ error: "Webhook is not configured" }, 503);
    if (Number(request.headers.get("content-length") || 0) > 131072) return respond({ error: "Payload too large" }, 413);
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > 131072) return respond({ error: "Payload too large" }, 413);
    if (!validWebhookSignature(body, request.headers.get("x-razorpay-signature") || "", secret)) return respond({ error: "Invalid webhook signature" }, 401);
    try { return respond(await processCapturedWebhook(supabaseAdmin, JSON.parse(body))); }
    catch { return respond({ error: "Payment reconciliation needs retry" }, 503); }
  } } },
});
