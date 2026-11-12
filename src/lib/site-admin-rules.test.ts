import { describe, test } from "node:test";
import assert from "node:assert/strict";
const expect = (actual: unknown) => ({ toEqual: (expected: unknown) => assert.deepEqual(actual, expected) });
import { siteAdminContent, moveSiteSection } from "./site-admin-content";
import { enabledBuilderMethods } from "./payment-methods";
import { builderPaymentConfirmed } from "./builder-payment-rules";

test("manual proof submission does not activate a paid website plan", () => {
  assert.equal(builderPaymentConfirmed("submitted"), false);
});
test("admin verified and provider paid payments activate the website plan", () => {
  assert.equal(builderPaymentConfirmed("verified"), true);
  assert.equal(builderPaymentConfirmed("paid"), true);
});

describe("site administration", () => {
  const live = { archetype: "restaurant", brand: { name: "Cafe", primary: "blue" }, sections: [{ type: "contact" as const, title: "Contact" }, { type: "gallery" as const, images: ["cafe.jpg"] }] };
  test("preserves live template sections instead of old editor data", () => {
    expect(siteAdminContent({ content_json: live, content: { sections: [] } })).toEqual(live);
  });
  test("reordering retains every section and brand", () => {
    const result = moveSiteSection(live, 0, 1);
    expect(result.sections).toEqual([live.sections[1], live.sections[0]]);
    expect(result.brand).toEqual(live.brand);
  });
});

describe("admin payment switches", () => {
  test("disabled Razorpay cannot appear at checkout", () => {
    expect(enabledBuilderMethods([{ kind: "razorpay", label: "Razorpay", enabled: false }, { kind: "upi_qr", label: "Manual", enabled: true }], false)).toEqual(["manual_upi"]);
  });
  test("enabled Razorpay and disabled manual route to Razorpay", () => {
    expect(enabledBuilderMethods([{ kind: "razorpay", label: "Razorpay", enabled: true }, { kind: "upi_qr", label: "UPI", enabled: false }], false)).toEqual(["razorpay"]);
  });
  test("all methods off does not invent bank transfer", () => {
    expect(enabledBuilderMethods([], false)).toEqual([]);
  });
});