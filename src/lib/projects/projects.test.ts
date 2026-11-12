import { test } from "node:test";
import assert from "node:assert/strict";
import { parseProject, projectEnvelope } from "./document";
import { STARTER_PROJECTS } from "./starters";
import { templatePresentation } from "../design/template-presentation";
import { personalizeTemplateContent } from "../category-site.server";
import { withProjectImages, localImageFallback } from "./images";
import { thumbChain } from "../thumb";
import { ikUrl } from "../images/imagekit";

const original = STARTER_PROJECTS[0].content;
test("all eight starters import, export and keep their exact authored designs", () => {
  assert.equal(STARTER_PROJECTS.length, 8);
  for (const starter of STARTER_PROJECTS) {
    const parsed = parseProject(projectEnvelope(starter.content));
    assert.deepEqual(parsed, starter.content);
    assert.deepEqual(templatePresentation(parsed, "different-id", 5), starter.content);
  }
});
test("each customer receives a fully independent document", () => {
  const copy = parseProject(original);
  copy.brand.name = "Customer's business";
  copy.sections.splice(0, 1);
  assert.notEqual(copy.brand.name, original.brand.name);
  assert.equal(original.sections.length, 7);
});
test("personalisation preserves section content, imagery, order and palette of imported projects", () => {
  for (const starter of STARTER_PROJECTS) {
    const source = starter.content;
    const result = personalizeTemplateContent(source, { name: "My business", category: starter.category, ai: { primary_color: "#ffffff", layout: "neon", theme: "dark" } })!;
    assert.equal(result.brand.name, "My business");
    assert.equal(result.brand.primary, source.brand.primary);
    assert.equal(result.brand.layout, source.brand.layout);
    assert.equal(result.brand.theme, source.brand.theme);
    assert.deepEqual(result.sections.map(s => s.type), source.sections.map(s => s.type));
    assert.deepEqual(result.sections.slice(1), source.sections.slice(1));
  }
});
test("invalid sections and malformed nested content are rejected before rendering", () => {
  for (const sections of [[], [{ type: "unknown" }], [{ type: "gallery", images: [42] }], [{ type: "features", title: "Hi", items: [null] }], [{ type: "pricing", plans: [{ name: "Basic", price: "100", features: "bad" }] }]]) {
    assert.throws(() => parseProject({ ...original, sections }));
  }
});
test("executable project content and unsafe object keys are rejected", () => {
  for (const tagline of ["<script>alert(1)</script>", "javascript:alert(1)", "data:text/html,<h1>x</h1>", "<iframe src=x>"]) {
    assert.throws(() => parseProject({ ...original, brand: { ...original.brand, tagline } }));
  }
  assert.throws(() => parseProject(JSON.parse('{"brand":{"name":"Hi","primary":"#123456","__proto__":{}},"sections":[{"type":"contact"}]}')));
});
test("unsupported formats and oversized documents are rejected", () => {
  assert.throws(() => parseProject({ format: "future-format", content: original }));
  assert.throws(() => parseProject({ ...original, brand: { ...original.brand, tagline: "x".repeat(2 * 1024 * 1024) } }));
});
test("render-time image completion does not alter a saved customer's source", () => {
  const blank = { ...original, sections: [{ type: "hero3d" as const, headline: "Hi", sub: "", cta: "Contact", image: "" }, { type: "gallery" as const, images: [] }] };
  const result = withProjectImages(blank);
  assert.ok((result.sections[0] as any).image.startsWith("https://"));
  assert.equal((result.sections[1] as any).images.length, 3);
  assert.equal(blank.sections[0].image, "");
  assert.deepEqual(blank.sections[1].images, []);
});
test("image failures always end at a bundled asset, and local assets bypass ImageKit", () => {
  const chain = thumbChain({ name: "Restaurant", category_slug: "restaurant" });
  assert.equal(chain.at(-1), "/images/fallback-dining.svg");
  assert.equal(ikUrl("/images/fallback-dining.svg"), "/images/fallback-dining.svg");
  assert.equal(localImageFallback("dentist-clinic"), "/images/fallback-care.svg");
});
test("malformed optional fields cannot crash a project preview", () => {
  for (const brand of [{ tagline: {} }, { theme: "invalid" }, { bg_overlay: 2 }, { socials: "bad" }, { layout: "missing-layout" }]) {
    assert.throws(() => parseProject({ ...original, brand: { ...original.brand, ...brand } }));
  }
  assert.throws(() => parseProject({ ...original, sections: [{ type: "hero3d", headline: "Hi", sub: "", cta: "Contact", image: "", bullets: 42 }] }));
});
test("size limit uses actual UTF-8 bytes, including multilingual content", () => {
  assert.throws(() => parseProject({ ...original, brand: { ...original.brand, tagline: "ह".repeat(750000) } }));
});

test("failed site image retries stop at bundled artwork and restart for a newly edited image", async () => {
  const { recoverSiteImage } = await import("./image-recovery");
  const image = { src: "https://broken.example/photo.jpg", getAttribute() { return this.src; }, removeAttribute() {} };
  recoverSiteImage(image as unknown as HTMLImageElement, "restaurant");
  assert.match(image.src, /unsplash/);
  recoverSiteImage(image as unknown as HTMLImageElement, "restaurant");
  assert.equal(image.src, "/images/fallback-dining.svg");
  recoverSiteImage(image as unknown as HTMLImageElement, "restaurant");
  assert.equal(image.src, "/images/fallback-dining.svg");
  image.src = "https://new.example/new-photo.jpg";
  recoverSiteImage(image as unknown as HTMLImageElement, "restaurant");
  assert.match(image.src, /unsplash/);
});
