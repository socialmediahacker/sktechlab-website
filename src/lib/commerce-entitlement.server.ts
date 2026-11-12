import { addonActive } from "./commerce-rules";
export async function commerceEntitlement(sb: any, userId: string) {
  const [{ data: roles, error: re }, { data: profile, error: pe }, { data: settings }] = await Promise.all([
    sb.from("user_roles").select("role").eq("user_id", userId),
    sb.from("profiles").select("active_plan,plan_tier,plan,trial_ends_at,ecom_addon,ecom_addon_status,ecom_addon_expires_at,shop_product_limit").eq("id", userId).maybeSingle(),
    sb.from("site_settings").select("ecom_addon_product_limit").eq("id", 1).maybeSingle(),
  ]);
  if (re || pe) throw new Error("Shop access could not be checked. Reload or contact support.");
  if ((roles || []).some((r: any) => ["admin", "super_admin"].includes(r.role))) return { enabled: true, productLimit: null, plan: "admin", reason: "admin", expiresAt: null };
  if (addonActive(profile)) return { enabled: true, productLimit: Number(profile.shop_product_limit ?? settings?.ecom_addon_product_limit ?? 200), plan: "Shop add-on", reason: "addon", expiresAt: profile.ecom_addon_expires_at };
  const { data: orders, error: oe } = await sb.from("service_orders").select("service_plans(name,ecom_product_limit)").eq("user_id", userId).eq("status", "active");
  if (oe) throw new Error("Shop plan configuration needs an administrator check.");
  const included = (orders || []).map((o: any) => o.service_plans).filter((p: any) => Number(p?.ecom_product_limit) > 0).sort((a: any, b: any) => Number(b.ecom_product_limit) - Number(a.ecom_product_limit))[0];
  if (included) return { enabled: true, productLimit: Number(included.ecom_product_limit), plan: included.name, reason: "included", expiresAt: null };
  const current = String(profile?.active_plan || profile?.plan_tier || profile?.plan || "trial");
  // Retain existing legacy plan entitlements without confusing service-plan IDs with slugs.
  const { data: bySlug } = await sb.from("plans").select("name,ecom_product_limit").eq("slug", current).maybeSingle();
  const legacy = bySlug || (await sb.from("plans").select("name,ecom_product_limit").eq("name", current).maybeSingle()).data;
  if (Number(legacy?.ecom_product_limit) > 0) return { enabled: true, productLimit: Number(legacy.ecom_product_limit), plan: legacy.name, reason: "included", expiresAt: null };
  if (current === "trial" && profile?.trial_ends_at && Date.parse(profile.trial_ends_at) > Date.now()) return { enabled: true, productLimit: 20, plan: "Trial", reason: "trial", expiresAt: profile.trial_ends_at };
  return { enabled: false, productLimit: 0, plan: current, reason: profile?.ecom_addon_status === "requested" ? "pending" : profile?.ecom_addon_expires_at && Date.parse(profile.ecom_addon_expires_at) <= Date.now() ? "expired" : "upgrade", expiresAt: profile?.ecom_addon_expires_at || null };
}
