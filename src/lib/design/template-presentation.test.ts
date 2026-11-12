import { test } from "node:test";
import assert from "node:assert/strict";
import { templatePresentation } from "./template-presentation";
import type { SiteContent } from "@/lib/site-renderer/types";
const original: SiteContent = { archetype: "restaurant", brand: { name: "Restaurant", primary: "#123456", theme: "dark" }, sections: [{ type: "hero3d", headline: "Restaurant", sub: "Dining", cta: "Book", image: "original.jpg" }] };
test("same-category templates alternate white/light and dark themes", () => {
  assert.deepEqual(Array.from({ length: 7 }, (_, i) => templatePresentation(original, `id-${i}`, i).brand.theme), ["light", "dark", "light", "dark", "light", "dark", "light"]);
});
test("seven siblings have seven different colour palettes and varied layouts", () => {
  const versions = Array.from({ length: 7 }, (_, i) => templatePresentation(original, `id-${i}`, i));
  assert.equal(new Set(versions.map(v => v.brand.primary)).size, 7);
  assert.equal(new Set(versions.map(v => v.brand.layout)).size, 7);
});
test("presentation never mutates saved customer content and is deterministic", () => {
  const before = JSON.stringify(original);
  assert.deepEqual(templatePresentation(original, "id", 2), templatePresentation(original, "id", 2));
  assert.equal(JSON.stringify(original), before);
  assert.equal(original.brand.theme, "dark");
  assert.equal((original.sections[0] as { image: string }).image, "original.jpg");
});
test("every catalogue category supports seven distinct layouts, type systems and directions", async () => {
  const { CATEGORY_CATALOG } = await import("../categories/catalog");
  for (const category of CATEGORY_CATALOG) {
    const versions = Array.from({ length: 7 }, (_, i) => templatePresentation({ ...original, archetype: category.slug }, `${category.slug}-${i}`, i));
    for (const key of ["layout", "font", "direction"] as const) assert.equal(new Set(versions.map(v => v.brand[key])).size, 7, `${category.slug}:${key}`);
    assert.ok(versions.every(v => (v.sections.find(s => s.type === "hero3d") as any)?.image), category.slug);
  }
});
