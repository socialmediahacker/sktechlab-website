import type { SupabaseClient } from "@supabase/supabase-js";

export type AnyClient = SupabaseClient<any, any, any>;

/** Roles that may open the admin panel at all. */
export const ADMIN_ROLES = ["admin", "super_admin"] as const;
export const STAFF_ROLES = ["admin", "super_admin", "staff", "support"] as const;

export async function getUserRoles(supabase: AnyClient, userId: string): Promise<string[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => String(r.role));
}

export async function assertStaff(supabase: AnyClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (!roles.some((r) => (STAFF_ROLES as readonly string[]).includes(r))) {
    throw new Error("Forbidden: staff access required");
  }
  return roles;
}

export async function assertAdmin(supabase: AnyClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (!roles.some((r) => (ADMIN_ROLES as readonly string[]).includes(r))) {
    throw new Error("Forbidden: admin access required");
  }
  return roles;
}

export async function assertSuperAdmin(supabase: AnyClient, userId: string) {
  const roles = await getUserRoles(supabase, userId);
  if (!roles.includes("super_admin")) throw new Error("Forbidden: super admin access required");
  return roles;
}

/** Permission check that respects the role -> permission matrix. */
export async function assertPermission(
  supabase: AnyClient,
  userId: string,
  module: string,
  action: string,
) {
  const roles = await getUserRoles(supabase, userId);
  if (roles.includes("super_admin")) return roles;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: perms, error } = await supabaseAdmin
    .from("role_permissions")
    .select("permissions!inner(module, action)")
    .in("role", roles as any)
    .eq("permissions.module", module)
    .eq("permissions.action", action)
    .limit(1);
  if (error) throw new Error(error.message);
  if (!perms?.length) throw new Error(`Forbidden: missing permission ${module}.${action}`);
  return roles;

}

export async function logActivity(
  admin: AnyClient,
  entry: {
    actor_id?: string | null;
    actor_label?: string | null;
    action: string;
    entity_type?: string | null;
    entity_id?: string | null;
    details?: Record<string, unknown>;
    ip_address?: string | null;
  },
) {
  try {
    await admin.from("activity_logs").insert({
      actor_id: entry.actor_id ?? null,
      actor_label: entry.actor_label ?? null,
      action: entry.action,
      entity_type: entry.entity_type ?? null,
      entity_id: entry.entity_id ?? null,
      details: entry.details ?? {},
      ip_address: entry.ip_address ?? null,
    });
  } catch {
    /* logging must never break the action */
  }
}

/** DNS-over-HTTPS lookup (Cloudflare) — works in the edge runtime. */
export async function dnsLookup(name: string, type: "A" | "CNAME" | "TXT") {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const json: any = await res.json();
  return ((json?.Answer ?? []) as any[])
    .map((a) => String(a.data ?? "").replace(/^"|"$/g, "").replace(/\.$/, "").toLowerCase())
    .filter(Boolean);
}

export function normalizeDomain(input: string) {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
}

export function renderTemplate(body: string, vars: Record<string, string | number | null | undefined>) {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, key: string) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function invoiceTotals(amount: number, taxPercent: number) {
  const tax = Math.round(((amount * taxPercent) / 100) * 100) / 100;
  return { tax, total: Math.round((amount + tax) * 100) / 100 };
}
