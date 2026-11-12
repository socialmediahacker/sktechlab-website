import { DEFAULT_REGISTRAR, domainParts, availability, retailPrice, type RegistrarConfig } from "./rules";

export async function registrarConfig(db: any): Promise<RegistrarConfig> {
  const { data, error } = await db.from("domain_registrar_settings").select("config").eq("id", 1).maybeSingle();
  if (error) throw new Error("Domain service setup is incomplete. Ask the admin to apply the domain migration.");
  return { ...DEFAULT_REGISTRAR, ...(data?.config || {}) };
}
/** Fixed HTTPS destinations only. Do not return/log provider URLs, request bodies or credentials. */
export async function registrarRequest(config: RegistrarConfig, path: string, values: Record<string, string | string[]> = {}, method: "GET" | "POST" = "GET", allowMissingCustomer = false): Promise<any> {
  const user = process.env.RESELLERCLUB_RESELLER_ID, key = process.env.RESELLERCLUB_API_KEY;
  if (!user || !key) throw new Error("Domain registrar credentials are not configured.");
  const params = new URLSearchParams({ "auth-userid": user, "api-key": key });
  for (const [name, value] of Object.entries(values)) for (const item of Array.isArray(value) ? value : [value]) params.append(name, item);
  const host = config.sandbox ? "https://test.httpapi.com" : path === "domains/available" ? "https://domaincheck.httpapi.com" : "https://httpapi.com";
  try {
    const response = await fetch(`${host}/api/${path}.json${method === "GET" ? `?${params}` : ""}`, { method, redirect: "error", signal: AbortSignal.timeout(20000), headers: method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}, ...(method === "POST" ? { body: params.toString() } : {}) });
    if (!response.ok) throw new Error("request");
    const result = await response.json();
    if (allowMissingCustomer && path === "customers/details" && result?.status === "ERROR" && /does not exist|not found|invalid.*username/i.test(String(result.message))) return null;
    if (result?.status === "ERROR" || result?.status === "error" || result?.error || result?.errors) throw new Error("provider");
    return result;
  } catch { throw new Error("Registrar request could not be confirmed. Check API access, IP allowlisting and reseller balance."); }
}
export async function quoteDomain(config: RegistrarConfig, domain: string) {
  if (!config.enabled) throw new Error("Domain buying is currently unavailable. You can connect a domain you already own.");
  const { name, tld } = domainParts(domain);
  const rate = config.rates.find(r => r.enabled && r.tld === tld && r.productKey);
  if (!rate) throw new Error("This extension is not enabled for automated purchase.");
  const response = await registrarRequest(config, "domains/available", { "domain-name": name, tlds: tld });
  const state = availability(response[domain]);
  if (state !== "available") return { available: false as const, state, domain };
  const prices = await registrarRequest(config, "products/reseller-cost-price");
  const price = retailPrice(prices[rate.productKey]?.addnewdomain?.["1"], config, rate.markupInr);
  const renewal = retailPrice(prices[rate.productKey]?.renewdomain?.["1"], config, rate.markupInr);
  return { available: true as const, state, domain, priceInr: price.pricePaise / 100, renewalInr: renewal.pricePaise / 100, costPaise: price.costPaise, sandbox: config.sandbox };
}
