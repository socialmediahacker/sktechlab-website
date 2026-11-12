export function makeSiteSlug(input: string, suffix = Date.now().toString(36).slice(-5)) {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "site"}-${suffix}`;
}