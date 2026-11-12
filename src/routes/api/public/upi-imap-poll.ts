import { createFileRoute } from "@tanstack/react-router";

/**
 * Cron/manual trigger for the auto payment inbox reader.
 * GET|POST /api/public/upi-imap-poll?token=<webhook secret>
 */
async function run(request: Request) {
  const { loadUpiSettings } = await import("@/lib/upi-gateway.server");
  const settings: any = await loadUpiSettings();
  const secret = settings?.webhook_secret;
  if (!secret) return new Response("Gateway not configured", { status: 503 });

  const url = new URL(request.url);
  const provided =
    url.searchParams.get("token") ??
    request.headers.get("x-upi-webhook-secret") ??
    (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (provided !== secret) return new Response("Invalid webhook secret", { status: 401 });

  const { pollUpiInbox } = await import("@/lib/upi-imap.server");
  const result = await pollUpiInbox({ force: true });
  return new Response(JSON.stringify(result), {
    status: result.ok ? 200 : 502,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/upi-imap-poll")({
  server: {
    handlers: {
      GET: async ({ request }) => run(request),
      POST: async ({ request }) => run(request),
    },
  },
});
