export async function assertSiteAccess(supabase: any, siteId: string) {
  const { data, error } = await supabase.rpc("can_edit_site", { _site_id: siteId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: you do not own this store");
}

export async function assertStorefrontAvailable(sb: any, siteId: string) {
  const { data: site, error } = await sb.from("sites").select("user_id,published,suspended").eq("id", siteId).single();
  if (error || !site?.published || site.suspended) throw new Error("This store is not currently accepting orders.");
  const ent = await (await import("./commerce-entitlement.server")).commerceEntitlement(sb, site.user_id);
  if (!ent.enabled) throw new Error("This store is not currently accepting orders.");
}
