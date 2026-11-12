export type DomainRate = { tld: string; productKey: string; markupInr: number; enabled: boolean };
export type RegistrarConfig = { enabled: boolean; sandbox: boolean; autoRegister: boolean; costCurrency: "INR" | "USD"; costToInr: number; taxPercent: number; agreementUrl: string; nameservers: string[]; rates: DomainRate[] };
export const DEFAULT_REGISTRAR: RegistrarConfig = { enabled: false, sandbox: true, autoRegister: false, costCurrency: "INR", costToInr: 1, taxPercent: 0, agreementUrl: "", nameservers: [], rates: [{ tld: "com", productKey: "domcno", markupInr: 150, enabled: true }, { tld: "in", productKey: "", markupInr: 100, enabled: false }, { tld: "co.in", productKey: "", markupInr: 100, enabled: false }] };
export function normalizeDomain(input: string): string {
  const value = input.trim().toLowerCase().replace(/\.$/, "");
  if (value.length > 253 || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.(?:com|net|org|in|co\.in)$/.test(value) || value.startsWith("xn--")) throw new Error("Enter a domain such as yourbusiness.com or yourbusiness.in, without https, paths or spaces.");
  return value;
}
export function domainParts(domain: string) { const [name, ...parts] = normalizeDomain(domain).split("."); return { name, tld: parts.join(".") }; }
export function availability(row: any): "available" | "taken" | "unknown" | "premium" {
  if (!row || typeof row !== "object") return "unknown";
  if ([true, "true", 1, "1"].includes(row.isPremium ?? row.ispremium ?? row.premium)) return "premium";
  if (row.status === "available") return "available";
  return ["regthroughus", "regthroughothers"].includes(row.status) ? "taken" : "unknown";
}
export function retailPrice(cost: unknown, config: RegistrarConfig, markup: number) {
  const n = Number(cost);
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(config.costToInr) || config.costToInr <= 0 || config.taxPercent < 0 || markup < 0) throw new Error("Registrar pricing is unavailable.");
  const costPaise = Math.ceil(n * config.costToInr * 100);
  const subtotal = costPaise + Math.round(markup * 100);
  return { costPaise, pricePaise: subtotal + Math.round(subtotal * config.taxPercent / 100) };
}
export function domainPaymentConfirmed(status: string) { return status === "paid" || status === "verified"; }
export function canRegister(status: string, paid: boolean) { return status === "paid" && paid; }
export function publicDomainOrder(row: any) { return { id: row.id, domain: row.domain, status: row.status, priceInr: Number(row.price_inr), renewalInr: Number(row.renewal_inr), siteId: row.site_id, createdAt: row.created_at, message: row.status_message, expiresAt: row.expires_at }; }
