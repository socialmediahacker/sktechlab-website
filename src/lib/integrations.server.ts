import { createHmac, randomUUID } from "crypto";

export type IntegrationRow = {
  provider: string;
  label: string;
  enabled: boolean;
  config: Record<string, any>;
};

/** Config keys that are safe to hand to the browser (never secrets). */
const SAFE_CONFIG_KEYS = new Set([
  "publicKey", "endpoint", "urlEndpoint", "uploadFolder", "folder", "model", "provider", "region",
]);

function stripSecrets(config: Record<string, any> | null | undefined) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(config ?? {})) if (SAFE_CONFIG_KEYS.has(k)) out[k] = v;
  return out;
}

/** Non-secret integration metadata. Secrets stay server-side. */
export async function readIntegrations(): Promise<IntegrationRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("api_integrations")
    .select("provider,label,enabled,config")
    .order("provider");
  return ((data ?? []) as IntegrationRow[]).map((r) => ({ ...r, config: stripSecrets(r.config) }));
}


export async function integrationConfig(provider: string): Promise<IntegrationRow> {
  const rows = await readIntegrations();
  return (
    rows.find((r) => r.provider === provider) ?? { provider, label: provider, enabled: false, config: {} }
  );
}

/** ImageKit client-side upload signature (HMAC-SHA1 of token + expire). */
export function signImageKitToken(privateKey: string) {
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;
  const signature = createHmac("sha1", privateKey).update(token + expire).digest("hex");
  return { token, expire, signature };
}

/** Search the ImageKit media library and return delivery URLs. */
export async function searchImageKit(query: string, limit = 12): Promise<string[]> {
  const key = process.env["IMAGEKIT_PRIVATE_KEY"];
  if (!key) return [];
  const cfg = await integrationConfig("imagekit");
  if (!cfg.enabled) return [];
  const params = new URLSearchParams({ limit: String(limit), fileType: "image" });
  if (query.trim()) params.set("searchQuery", `name : "${query.trim().replace(/"/g, "")}"`);
  try {
    const r = await fetch(`https://api.imagekit.io/v1/files?${params.toString()}`, {
      headers: { Authorization: `Basic ${btoa(`${key}:`)}` },
    });
    if (!r.ok) return [];
    const files = (await r.json()) as Array<{ url?: string }>;
    return (files ?? []).map((f) => f.url).filter((u): u is string => !!u);
  } catch {
    return [];
  }
}
