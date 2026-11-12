import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ------------------------------------------------------------------ *
 * Commerce entitlement — which plan unlocks the e-commerce console.
 * ------------------------------------------------------------------ */

export const getMyCommerceEntitlement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    return (await import("./commerce-entitlement.server")).commerceEntitlement(sb, context.userId);
  });

/* ------------------------------------------------------------------ *
 * Platform-wide commerce analytics for the master admin.
 * ------------------------------------------------------------------ */

const RangeInput = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  siteId: z.string().uuid().nullish(),
});

type OrderRow = {
  id: string;
  order_no: number;
  site_id: string;
  buyer_name: string;
  buyer_phone: string;
  buyer_email: string | null;
  total_inr: number;
  subtotal_inr: number;
  tax_inr: number;
  discount_inr: number;
  shipping_inr: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  gateway_kind: string;
  coupon_code: string | null;
  items: any;
  created_at: string;
};

const dayKey = (iso: string) => iso.slice(0, 10);

export const platformCommerceOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => RangeInput.parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { assertStaff } = await import("@/lib/admin.server");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    await assertStaff(context.supabase, context.userId);

    const to = data.to ? new Date(data.to) : new Date();
    const from = data.from ? new Date(data.from) : new Date(to.getTime() - 29 * 86400000);
    const span = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000));
    const prevFrom = new Date(from.getTime() - span * 86400000);

    let ordersQ = sb
      .from("orders")
      .select(
        "id, order_no, site_id, buyer_name, buyer_phone, buyer_email, total_inr, subtotal_inr, tax_inr, discount_inr, shipping_inr, status, payment_status, fulfillment_status, gateway_kind, coupon_code, items, created_at",
      )
      .gte("created_at", prevFrom.toISOString())
      .lte("created_at", to.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    if (data.siteId) ordersQ = ordersQ.eq("site_id", data.siteId);

    const [{ data: ordersRaw }, { data: products }, { data: sites }] = await Promise.all([
      ordersQ,
      sb.from("products").select("id, site_id, name, price_inr, stock, low_stock_threshold, track_inventory, status"),
      sb.from("sites").select("id, name, subdomain, user_id"),
    ]);

    const all = (ordersRaw ?? []) as unknown as OrderRow[];
    const inRange = all.filter((o) => new Date(o.created_at) >= from);
    const prev = all.filter((o) => new Date(o.created_at) < from);

    const money = (rows: OrderRow[]) => rows.reduce((s, o) => s + Number(o.total_inr || 0), 0);
    const paidOf = (rows: OrderRow[]) => rows.filter((o) => o.payment_status === "paid" || o.payment_status === "cod");

    const paid = paidOf(inRange);
    const prevPaid = paidOf(prev);

    const byStatus = (rows: OrderRow[]) =>
      rows.reduce<Record<string, number>>((acc, o) => {
        const k = String(o.status || "pending");
        acc[k] = (acc[k] ?? 0) + 1;
        return acc;
      }, {});

    // Timeseries (revenue + orders per day)
    const seriesMap = new Map<string, { day: string; revenue: number; orders: number }>();
    for (let t = from.getTime(); t <= to.getTime(); t += 86400000) {
      const k = new Date(t).toISOString().slice(0, 10);
      seriesMap.set(k, { day: k, revenue: 0, orders: 0 });
    }
    for (const o of inRange) {
      const k = dayKey(o.created_at);
      const row = seriesMap.get(k);
      if (!row) continue;
      row.orders += 1;
      if (o.payment_status === "paid" || o.payment_status === "cod") row.revenue += Number(o.total_inr || 0);
    }

    // Product performance from order line items
    const prodMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of paid) {
      const lines: any[] = Array.isArray(o.items) ? o.items : [];
      for (const l of lines) {
        const key = String(l.product_id ?? l.name ?? "unknown");
        const cur = prodMap.get(key) ?? { name: String(l.name ?? "Item"), qty: 0, revenue: 0 };
        cur.qty += Number(l.qty ?? 1);
        cur.revenue += Number(l.price ?? 0) * Number(l.qty ?? 1);
        prodMap.set(key, cur);
      }
    }
    const topProducts = [...prodMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    // Customers
    const custMap = new Map<string, { key: string; name: string; phone: string; email: string | null; orders: number; spent: number; last: string }>();
    for (const o of inRange) {
      const key = String(o.buyer_phone || o.buyer_email || o.id);
      const cur =
        custMap.get(key) ?? { key, name: o.buyer_name, phone: o.buyer_phone, email: o.buyer_email, orders: 0, spent: 0, last: o.created_at };
      cur.orders += 1;
      cur.spent += Number(o.total_inr || 0);
      if (o.created_at > cur.last) cur.last = o.created_at;
      custMap.set(key, cur);
    }
    const customers = [...custMap.values()].sort((a, b) => b.spent - a.spent);
    const returning = customers.filter((c) => c.orders > 1).length;

    // Payment / gateway mix
    const gateways = inRange.reduce<Record<string, number>>((acc, o) => {
      const k = String(o.gateway_kind || "other");
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});

    // Inventory
    const prodRows = (products ?? []) as any[];
    const scoped = data.siteId ? prodRows.filter((p) => p.site_id === data.siteId) : prodRows;
    const lowStock = scoped.filter((p) => p.track_inventory && Number(p.stock) > 0 && Number(p.stock) <= Number(p.low_stock_threshold ?? 3));
    const outOfStock = scoped.filter((p) => p.track_inventory && Number(p.stock) <= 0);
    const inventoryValue = scoped.reduce((s, p) => s + Number(p.price_inr || 0) * Math.max(0, Number(p.stock || 0)), 0);

    const siteMap = Object.fromEntries((sites ?? []).map((s: any) => [s.id, s]));
    const storeRevenue = new Map<string, number>();
    for (const o of paid) storeRevenue.set(o.site_id, (storeRevenue.get(o.site_id) ?? 0) + Number(o.total_inr || 0));
    const topStores = [...storeRevenue.entries()]
      .map(([id, revenue]) => ({ id, name: siteMap[id]?.name ?? "Store", revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    const grossRevenue = money(paid);
    const prevRevenue = money(prevPaid);

    return {
      range: { from: from.toISOString(), to: to.toISOString(), days: span },
      kpis: {
        grossRevenue,
        netRevenue: paid.reduce((s, o) => s + Number(o.total_inr || 0) - Number(o.tax_inr || 0), 0),
        tax: paid.reduce((s, o) => s + Number(o.tax_inr || 0), 0),
        shipping: paid.reduce((s, o) => s + Number(o.shipping_inr || 0), 0),
        discounts: inRange.reduce((s, o) => s + Number(o.discount_inr || 0), 0),
        orders: inRange.length,
        paidOrders: paid.length,
        aov: paid.length ? Math.round(grossRevenue / paid.length) : 0,
        customers: customers.length,
        returningCustomers: returning,
        newCustomers: customers.length - returning,
        inventoryValue,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        revenueDelta: prevRevenue ? Math.round(((grossRevenue - prevRevenue) / prevRevenue) * 100) : null,
        ordersDelta: prev.length ? Math.round(((inRange.length - prev.length) / prev.length) * 100) : null,
      },
      statusCounts: byStatus(inRange),
      gateways,
      series: [...seriesMap.values()],
      topProducts,
      topStores,
      customers: customers.slice(0, 100),
      lowStockProducts: lowStock.slice(0, 50).map((p) => ({ id: p.id, name: p.name, stock: p.stock, site: siteMap[p.site_id]?.name ?? "—" })),
      recentOrders: inRange.slice(0, 200).map((o) => ({
        id: o.id,
        order_no: o.order_no,
        site: siteMap[o.site_id]?.name ?? "—",
        site_id: o.site_id,
        buyer_name: o.buyer_name,
        buyer_phone: o.buyer_phone,
        total_inr: Number(o.total_inr),
        status: o.status,
        payment_status: o.payment_status,
        fulfillment_status: o.fulfillment_status,
        gateway_kind: o.gateway_kind,
        created_at: o.created_at,
        item_count: Array.isArray(o.items) ? o.items.length : 0,
      })),
    };
  });

/* ------------------------------------------------------------------ *
 * Order workflow actions (admin / staff).
 * ------------------------------------------------------------------ */

const OrderPatch = z.object({
  orderId: z.string().uuid(),
  status: z.enum(["pending", "processing", "packed", "shipped", "delivered", "completed", "cancelled", "refunded", "returned"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "cod", "failed", "refunded", "partially_refunded"]).optional(),
  fulfillmentStatus: z.enum(["unfulfilled", "processing", "packed", "shipped", "delivered", "returned"]).optional(),
  trackingNumber: z.string().max(80).nullish(),
  courier: z.string().max(80).nullish(),
  adminNote: z.string().max(1000).nullish(),
});

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => OrderPatch.parse(i))
  .handler(async ({ data, context }) => {
    const { assertStaff, logActivity } = await import("@/lib/admin.server");
    const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
    await assertStaff(context.supabase, context.userId);

    const patch: Record<string, any> = {};
    if (data.status) patch.status = data.status;
    if (data.paymentStatus) patch.payment_status = data.paymentStatus;
    if (data.fulfillmentStatus) patch.fulfillment_status = data.fulfillmentStatus;
    if (data.trackingNumber !== undefined) patch.tracking_number = data.trackingNumber;
    if (data.courier !== undefined) patch.courier = data.courier;
    if (data.adminNote !== undefined) patch.admin_note = data.adminNote;
    if (!Object.keys(patch).length) return { ok: true };

    const { error } = await sb.from("orders").update(patch as any).eq("id", data.orderId);
    if (error) throw new Error(error.message);

    await logActivity(sb, {
      actor_id: context.userId,
      action: "order.updated",
      entity_type: "order",
      entity_id: data.orderId,
      details: patch,
    });
    return { ok: true };
  });
