/** Reserved first-path segments that belong to SKTECHLAB itself (not a customer site). */
const RESERVED = [
  "categories",
  "pricing",
  "services",
  "auth",
  "dashboard",
  "admin",
  "admin-login",
  "start",
  "reset-password",
  "blog",
  "templates",
  "api",
  "mcp",
  "sitemap.xml",
];

/** True when the path renders a customer's own website (published slug or preview). */
export function isCustomerSiteRoute(path: string) {
  if (path.startsWith("/s/") || path.startsWith("/preview/")) return true;
  const parts = path.split("/").filter(Boolean);
  return parts.length === 1 && !RESERVED.includes(parts[0]!);
}

/** True when SKTECHLAB app chrome (mobile tab bar) must stay hidden. */
export function hideAppChrome(path: string) {
  if (/^\/(admin|admin-login|dashboard\/sites|template-editor|preview|s\/)/.test(path)) return true;
  return isCustomerSiteRoute(path);
}
