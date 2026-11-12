export function shopExpiry(billing: string, now = new Date()) {
  if (billing === "one_time") return null;
  const result = new Date(now);
  const months: Record<string, number> = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 };
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + (months[billing] ?? 1));
  const end = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, end));
  return result.toISOString();
}
export function addonActive(profile: any, now = Date.now()) {
  if (!profile?.ecom_addon || ["cancelled", "expired", "requested", "paused"].includes(profile.ecom_addon_status)) return false;
  return !profile.ecom_addon_expires_at || Date.parse(profile.ecom_addon_expires_at) > now;
}
export function cartTotal(plan: number, addon: number, domain: number) {
  const amounts = [plan, addon, domain].map(value => { if (!Number.isFinite(value) || value < 0) throw new Error("Invalid checkout amount."); return Math.round(value * 100); });
  return amounts.reduce((total, amount) => total + amount, 0) / 100;
}
