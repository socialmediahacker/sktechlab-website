import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ---------- public storefront read ---------- */

export const fetchStoreProducts = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ siteId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    try { await (await import("./store-access.server")).assertStorefrontAvailable(sb, data.siteId); } catch { return { products: [], collections: [] }; }
    const [{ data: products }, { data: collections }] = await Promise.all([
      sb.from("products").select("*").eq("site_id", data.siteId).eq("status", "active").eq("is_active", true).order("sort_order"),
      sb.from("store_collections").select("*").eq("site_id", data.siteId).eq("is_active", true).order("sort_order"),
    ]);
    return { products: products ?? [], collections: collections ?? [] };
  });

/* ---------- coupon ---------- */

const CouponInput = z.object({
  siteId: z.string().uuid(),
  code: z.string().min(1).max(40),
  subtotal: z.number().nonnegative(),
});

export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CouponInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    const { data: c } = await sb
      .from("store_coupons")
      .select("*")
      .eq("site_id", data.siteId)
      .ilike("code", data.code.trim())
      .maybeSingle();
    if (!c || !c.is_active) return { ok: false as const, message: "Invalid code" };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { ok: false as const, message: "Code expired" };
    if (c.usage_limit != null && c.used_count >= c.usage_limit) return { ok: false as const, message: "Code fully used" };
    if (data.subtotal < Number(c.min_order_inr)) {
      return { ok: false as const, message: `Minimum order ₹${c.min_order_inr}` };
    }
    const discount =
      c.kind === "fixed" ? Math.min(Number(c.value), data.subtotal) : Math.round((data.subtotal * Number(c.value)) / 100);
    return { ok: true as const, code: c.code, discount, kind: c.kind, value: Number(c.value) };
  });

/* ---------- place order (server computes prices) ---------- */

const OrderInput = z.object({
  siteId: z.string().uuid(),
  items: z.array(z.object({ productId: z.string().uuid(), qty: z.number().int().min(1).max(99), variant: z.string().max(120).optional() })).min(1).max(50),
  buyer: z.object({
    name: z.string().min(1).max(80),
    phone: z.string().min(6).max(20),
    email: z.string().email().max(120).optional().or(z.literal("")),
    address: z.string().max(400).optional(),
    city: z.string().max(80).optional(),
    pincode: z.string().max(12).optional(),
    note: z.string().max(400).optional(),
  }),
  coupon: z.string().max(40).optional(),
  gateway: z.enum(["cod", "upi", "bank", "crypto", "razorpay", "manual"]).default("cod"),
});

export const placeStoreOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => OrderInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    await (await import("./store-access.server")).assertStorefrontAvailable(sb, data.siteId);
    // Only gateways the store owner enabled are accepted.
    const { data: pay } = await sb
      .from("store_payment_settings")
      .select("cod_enabled, upi_enabled, upi_id, bank_enabled, bank_account_number, crypto_enabled, crypto_wallet_address, razorpay_enabled, razorpay_key_id")
      .eq("site_id", data.siteId)
      .maybeSingle();
    const allowed = new Set<string>();
    if (!pay) allowed.add("cod");
    else {
      if (pay.cod_enabled) allowed.add("cod");
      if (pay.upi_enabled && pay.upi_id) allowed.add("upi");
      if (pay.bank_enabled && pay.bank_account_number) allowed.add("bank");
      if (pay.crypto_enabled && pay.crypto_wallet_address) allowed.add("crypto");
      if (pay.razorpay_enabled && pay.razorpay_key_id) allowed.add("razorpay");
      if (!allowed.size) allowed.add("cod");
    }
    if (!allowed.has(data.gateway)) throw new Error("That payment method is not available for this store");

    const ids = data.items.map((i) => i.productId);
    const { data: rows, error } = await sb.from("products").select("*").eq("site_id", data.siteId).in("id", ids);
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("Products unavailable");

    let subtotal = 0;
    let tax = 0;
    const items = data.items.map((line) => {
      const p = rows.find((r) => r.id === line.productId);
      if (!p) throw new Error("A product in your cart is no longer available");
      const variants: any[] = Array.isArray(p.variants) ? (p.variants as any[]) : [];
      const selectedVariant: any | undefined = line.variant ? variants.find((v) => v.key === line.variant && v.enabled !== false) : undefined;
      if (variants.length && !selectedVariant) throw new Error(`${p.name} — select an available option`);
      const availableStock = selectedVariant && typeof selectedVariant.stock === "number" ? Number(selectedVariant.stock) : Number(p.stock);
      if (p.track_inventory && !p.allow_backorder && availableStock < line.qty) {
        throw new Error(`${p.name}${line.variant ? ` (${line.variant})` : ""} — only ${availableStock} left in stock`);
      }
      const price = selectedVariant?.price != null ? Number(selectedVariant.price) : Number(p.price_inr);
      subtotal += price * line.qty;
      tax += Math.round((price * line.qty * Number(p.tax_percent ?? 0)) / 100);
      return { product_id: p.id, name: p.name, sku: selectedVariant?.sku ?? p.sku ?? null, price, qty: line.qty, variant: line.variant ?? null, image: selectedVariant?.image || (p.images as any)?.[0] || null };
    });

    let discount = 0;
    let couponCode: string | null = null;
    if (data.coupon) {
      const { data: c } = await sb.from("store_coupons").select("*").eq("site_id", data.siteId).ilike("code", data.coupon.trim()).maybeSingle();
      if (c && c.is_active && subtotal >= Number(c.min_order_inr) && (c.usage_limit == null || c.used_count < c.usage_limit)) {
        discount = c.kind === "fixed" ? Math.min(Number(c.value), subtotal) : Math.round((subtotal * Number(c.value)) / 100);
        couponCode = c.code;
        await sb.from("store_coupons").update({ used_count: c.used_count + 1 }).eq("id", c.id);
      }
    }

    const total = Math.max(0, subtotal + tax - discount);
    const { data: order, error: oe } = await sb
      .from("orders")
      .insert({
        site_id: data.siteId,
        buyer_name: data.buyer.name,
        buyer_phone: data.buyer.phone,
        buyer_email: data.buyer.email || null,
        shipping_address: {
          address: data.buyer.address ?? "",
          city: data.buyer.city ?? "",
          pincode: data.buyer.pincode ?? "",
        },
        customer_note: data.buyer.note ?? null,
        items,
        subtotal_inr: subtotal,
        tax_inr: tax,
        discount_inr: discount,
        total_inr: total,
        coupon_code: couponCode,
        gateway_kind: data.gateway,
        status: "pending",
        payment_status: data.gateway === "cod" ? "cod" : "pending",
      })
      .select("id, order_no, total_inr")
      .single();
    if (oe) throw new Error(oe.message);

    // decrement stock
    for (const line of data.items) {
      const p = rows.find((r) => r.id === line.productId);
      if (p?.track_inventory) {
        const variants: any[] = Array.isArray(p.variants) ? (p.variants as any[]) : [];
        if (line.variant && variants.length) {
          const next = variants.map((v: any) => v.key === line.variant ? { ...v, stock: Math.max(0, Number(v.stock ?? 0) - line.qty) } : v);
          await sb.from("products").update({ variants: next, stock: Math.max(0, Number(p.stock) - line.qty) }).eq("id", p.id);
        } else {
          await sb.from("products").update({ stock: Math.max(0, Number(p.stock) - line.qty) }).eq("id", p.id);
        }
      }
    }

    return { orderId: order.id, orderNo: order.order_no, total };
  });
