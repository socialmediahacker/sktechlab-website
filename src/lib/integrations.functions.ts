import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Public: read all integration rows (config holds only non-secret values). */
export const listIntegrations = createServerFn({ method: "GET" }).handler(async () => {
  const { readIntegrations } = await import("@/lib/integrations.server");
  return readIntegrations();
});

const SaveInput = z.object({
  provider: z.string().min(2).max(40),
  label: z.string().max(120).optional(),
  enabled: z.boolean(),
  config: z.record(z.string(), z.any()).default({}),
});

/** Admin only: create/update an integration row. */
export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(context.supabase as any, context.userId);

    const { error } = await supabaseAdmin
      .from("api_integrations")
      .upsert(
        {
          provider: data.provider,
          label: data.label ?? data.provider,
          enabled: data.enabled,
          config: data.config as any,
        },
        { onConflict: "provider" },
      );
    if (error) throw new Error(error.message);

    await logActivity(supabaseAdmin, {
      actor_id: context.userId,
      action: "integration.saved",
      entity_type: "integration",
      entity_id: data.provider,
      details: { enabled: data.enabled },
    });
    return { ok: true };
  });

/** Admin only: live check that the stored keys work. */
export const testIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ provider: z.string().max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase as any, context.userId);

    if (data.provider === "imagekit") {
      const key = process.env["IMAGEKIT_PRIVATE_KEY"];
      if (!key) return { ok: false, message: "IMAGEKIT_PRIVATE_KEY not configured" };
      try {
        const r = await fetch("https://api.imagekit.io/v1/files?limit=1", {
          headers: { Authorization: `Basic ${btoa(`${key}:`)}` },
        });
        const body = await r.text();
        if (!r.ok) return { ok: false, message: `HTTP ${r.status}: ${body.slice(0, 200)}` };
        const list = JSON.parse(body || "[]");
        return { ok: true, message: `Connected. Media library reachable (${Array.isArray(list) ? list.length : 0} sample file).` };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Request failed" };
      }
    }

    if (data.provider === "pexels") {
      const key = process.env["PEXELS_API_KEY"];
      if (!key) return { ok: false, message: "PEXELS_API_KEY not configured (keyless fallback will be used)" };
      const r = await fetch("https://api.pexels.com/v1/search?query=office&per_page=1", { headers: { Authorization: key } });
      return { ok: r.ok, message: r.ok ? "Connected." : `HTTP ${r.status}` };
    }

    if (data.provider === "smart_images") {
      const { resolveNiche } = await import("@/lib/images/niche-detect.server");
      const p = await resolveNiche({ category: "मेहंदी पार्लर" });
      return { ok: true, message: `Niche engine OK — detected "${p.subcategory}" (${p.source}).` };
    }

    if (data.provider === "gemini") {

      const key = process.env["GEMINI_API_KEY"] || process.env["LOVABLE_API_KEY"];
      return { ok: !!key, message: key ? "AI key configured." : "No AI key configured" };
    }

    return { ok: false, message: "Unknown provider" };
  });

/** Signed upload params for direct browser → ImageKit uploads. */
export const imagekitAuthParams = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { signImageKitToken, integrationConfig } = await import("@/lib/integrations.server");
    const cfg = await integrationConfig("imagekit");
    if (!cfg.enabled) throw new Error("ImageKit is disabled");
    const privateKey = process.env["IMAGEKIT_PRIVATE_KEY"];
    if (!privateKey) throw new Error("ImageKit private key not configured");
    const signed = signImageKitToken(privateKey);
    return {
      ...signed,
      publicKey: (cfg.config as any)?.publicKey ?? process.env["IMAGEKIT_PUBLIC_KEY"] ?? "",
      folder: (cfg.config as any)?.uploadFolder ?? "sktechlab",
      endpoint: (cfg.config as any)?.endpoint ?? process.env["IMAGEKIT_URL_ENDPOINT"] ?? "",
    };
  });

/** Search the ImageKit media library (used by the editor image picker). */
export const imagekitSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ query: z.string().max(120).default(""), limit: z.number().int().min(1).max(30).default(12) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { searchImageKit } = await import("@/lib/integrations.server");
    return { urls: await searchImageKit(data.query, data.limit) };
  });
