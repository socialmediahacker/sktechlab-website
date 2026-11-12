import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ShoppingBag, TrendingUp, TrendingDown, Users, Package, Receipt, AlertTriangle, Download, Search, Store, IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatGrid } from "@/components/admin/AdminShell";
import { StorePanel } from "@/components/store/StorePanel";
import { platformCommerceOverview, adminUpdateOrder } from "@/lib/commerce.functions";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const RANGES = [
  { k: "7", label: "7 days" },
  { k: "30", label: "30 days" },
  { k: "90", label: "90 days" },
  { k: "365", label: "12 months" },
] as const;

const PIE_COLORS = ["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#f87171"];

type View = "analytics" | "orders" | "customers" | "inventory" | "stores";

export function CommerceCommandCenter({ sites }: { sites: any[] }) {
  const [days, setDays] = useState<string>("30");
  const [siteId, setSiteId] = useState<string>("");
  const [view, setView] = useState<View>("analytics");
  const overviewFn = useServerFn(platformCommerceOverview);

  const { data, isLoading } = useQuery({
    queryKey: ["platform_commerce", days, siteId],
    queryFn: () =>
      overviewFn({
        data: {
          from: new Date(Date.now() - Number(days) * 86400000).toISOString(),
          to: new Date().toISOString(),
          siteId: siteId || null,
        },
      }),
    staleTime: 60_000,
  });

  const k = data?.kpis;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="glass flex flex-wrap items-end gap-3 rounded-2xl p-4">
        <div>
          <Label className="text-xs">Period</Label>
          <div className="mt-1 flex gap-1 rounded-xl bg-muted/40 p-1">
            {RANGES.map((r) => (
              <button
                key={r.k}
                onClick={() => setDays(r.k)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${days === r.k ? "bg-background shadow-card" : "text-muted-foreground hover:text-foreground"}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="min-w-56">
          <Label className="text-xs">Store</Label>
          <select
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All stores (platform)</option>
            {sites.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-1 rounded-xl bg-muted/40 p-1">
          {(["analytics", "orders", "customers", "inventory", "stores"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${view === v ? "bg-background shadow-card" : "text-muted-foreground hover:text-foreground"}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Loading commerce data…</div>}

      {k && (
        <>
          <StatGrid
            stats={[
              { label: "Gross revenue", prefix: "₹", value: Math.round(k.grossRevenue), hint: k.revenueDelta == null ? "vs previous period" : `${k.revenueDelta >= 0 ? "+" : ""}${k.revenueDelta}% vs previous`, Icon: IndianRupee },
              { label: "Orders", value: k.orders, hint: `${k.paidOrders} paid · AOV ${inr(k.aov)}`, Icon: Receipt },
              { label: "Customers", value: k.customers, hint: `${k.returningCustomers} returning · ${k.newCustomers} new`, Icon: Users },
              { label: "Inventory value", prefix: "₹", value: Math.round(k.inventoryValue), hint: `${k.lowStock} low · ${k.outOfStock} out of stock`, Icon: Package },
            ]}
          />

          {view === "analytics" && <AnalyticsView data={data} />}
          {view === "orders" && <OrdersView orders={data.recentOrders} />}
          {view === "customers" && <CustomersView customers={data.customers} />}
          {view === "inventory" && <InventoryView rows={data.lowStockProducts} kpis={k} />}
          {view === "stores" && <StoresView sites={sites} topStores={data.topStores} />}
        </>
      )}
    </div>
  );
}

/* ------------------------------- analytics ------------------------------- */

function AnalyticsView({ data }: { data: any }) {
  const gateway = Object.entries(data.gateways ?? {}).map(([name, value]) => ({ name, value: Number(value) }));
  const status = Object.entries(data.statusCounts ?? {}).map(([name, value]) => ({ name, value: Number(value) }));
  const delta = data.kpis.revenueDelta;

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-brand-glow" />
          <h3 className="text-sm font-bold">Revenue & orders</h3>
          {delta != null && (
            <span className={`ml-auto flex items-center gap-1 text-xs font-bold ${delta >= 0 ? "text-emerald-500" : "text-destructive"}`}>
              {delta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />} {delta}%
            </span>
          )}
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.series}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} fontSize={11} />
              <YAxis fontSize={11} width={54} tickFormatter={(v: number) => `₹${v > 999 ? `${Math.round(v / 1000)}k` : v}`} />
              <Tooltip formatter={(v: any, n: any) => (n === "revenue" ? inr(Number(v)) : v)} />
              <Area type="monotone" dataKey="revenue" stroke="#38bdf8" fill="url(#rev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass rounded-2xl p-4 lg:col-span-2">
          <h3 className="mb-3 text-sm font-bold">Top selling products</h3>
          {data.topProducts.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" fontSize={11} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={11} />
                  <Tooltip formatter={(v: any) => inr(Number(v))} />
                  <Bar dataKey="revenue" fill="#a78bfa" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No paid orders in this period yet.</p>
          )}
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold">Payment mix</h3>
          {gateway.length ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={gateway} dataKey="value" nameKey="name" innerRadius={45} outerRadius={78} paddingAngle={3}>
                    {gateway.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No orders yet.</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {status.map((s) => (
              <span key={s.name} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold capitalize">{s.name}: {s.value}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- orders -------------------------------- */

const ORDER_STATUS = ["pending", "processing", "packed", "shipped", "delivered", "completed", "cancelled", "refunded", "returned"] as const;
const PAY_STATUS = ["pending", "paid", "cod", "failed", "refunded", "partially_refunded"] as const;

function OrdersView({ orders }: { orders: any[] }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const updateFn = useServerFn(adminUpdateOrder);

  const update = useMutation({
    mutationFn: (input: any) => updateFn({ data: input }),
    onSuccess: () => { toast.success("Order updated"); qc.invalidateQueries({ queryKey: ["platform_commerce"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(
    () =>
      orders.filter((o) => {
        const okS = status === "all" || o.status === status;
        const t = `${o.order_no} ${o.buyer_name} ${o.buyer_phone} ${o.site}`.toLowerCase();
        return okS && (!q || t.includes(q.toLowerCase()));
      }),
    [orders, q, status],
  );

  const exportCsv = () => {
    const head = ["order_no", "store", "customer", "phone", "total", "status", "payment", "fulfillment", "date"];
    const body = rows.map((o) => [o.order_no, o.site, o.buyer_name, o.buyer_phone, o.total_inr, o.status, o.payment_status, o.fulfillment_status, o.created_at]);
    const csv = [head, ...body].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `orders-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, customer, phone…" className="pl-8" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">All statuses</option>
          {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-3.5 w-3.5" /> CSV</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-2">Order</th><th className="p-2">Store</th><th className="p-2">Customer</th><th className="p-2">Total</th><th className="p-2">Payment</th><th className="p-2">Status</th><th className="p-2">Date</th></tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-border/50">
                <td className="p-2 font-semibold">#{o.order_no}</td>
                <td className="p-2 text-xs text-muted-foreground">{o.site}</td>
                <td className="p-2">
                  <div className="font-medium">{o.buyer_name}</div>
                  <a className="text-xs text-brand-glow hover:underline" href={`https://wa.me/${String(o.buyer_phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{o.buyer_phone}</a>
                </td>
                <td className="p-2 font-semibold">{inr(o.total_inr)}</td>
                <td className="p-2">
                  <select
                    value={o.payment_status}
                    onChange={(e) => update.mutate({ orderId: o.id, paymentStatus: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {PAY_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2">
                  <select
                    value={o.status}
                    onChange={(e) => update.mutate({ orderId: o.id, status: e.target.value })}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {ORDER_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="p-6 text-center text-sm text-muted-foreground">No orders match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------- customers ------------------------------- */

function CustomersView({ customers }: { customers: any[] }) {
  const [q, setQ] = useState("");
  const rows = customers.filter((c) => !q || `${c.name} ${c.phone} ${c.email ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="glass rounded-2xl p-4">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search customers…" className="pl-8" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((c) => (
          <div key={c.key} className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{c.name}</div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.orders > 1 ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                {c.orders > 1 ? "Returning" : "New"}
              </span>
            </div>
            <a className="text-xs text-brand-glow hover:underline" href={`https://wa.me/${String(c.phone).replace(/\D/g, "")}`} target="_blank" rel="noreferrer">{c.phone}</a>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.orders} orders</span>
              <span className="font-semibold text-foreground">{inr(c.spent)}</span>
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">Last order {new Date(c.last).toLocaleDateString()}</div>
          </div>
        ))}
        {!rows.length && <p className="text-sm text-muted-foreground">No customers in this period.</p>}
      </div>
    </div>
  );
}

/* ------------------------------- inventory ------------------------------- */

function InventoryView({ rows, kpis }: { rows: any[]; kpis: any }) {
  return (
    <div className="space-y-4">
      <div className="glass flex flex-wrap gap-4 rounded-2xl p-4 text-sm">
        <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> {kpis.lowStock} low stock</div>
        <div className="flex items-center gap-2"><Package className="h-4 w-4 text-destructive" /> {kpis.outOfStock} out of stock</div>
        <div className="ml-auto font-semibold">Stock value {inr(kpis.inventoryValue)}</div>
      </div>
      <div className="glass overflow-x-auto rounded-2xl p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="p-2">Product</th><th className="p-2">Store</th><th className="p-2">Stock</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t border-border/50">
                <td className="p-2 font-medium">{p.name}</td>
                <td className="p-2 text-xs text-muted-foreground">{p.site}</td>
                <td className="p-2 font-semibold text-amber-500">{p.stock}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">Inventory looks healthy.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* --------------------------------- stores -------------------------------- */

function StoresView({ sites, topStores }: { sites: any[]; topStores: any[] }) {
  const [siteId, setSiteId] = useState<string>(sites[0]?.id ?? "");
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold"><Store className="h-4 w-4 text-brand-glow" /> Revenue by store</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
          {topStores.map((s) => (
            <div key={s.id} className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <div className="truncate text-sm font-semibold">{s.name}</div>
              <div className="text-lg font-bold text-brand-glow">{inr(s.revenue)}</div>
            </div>
          ))}
          {!topStores.length && <p className="text-xs text-muted-foreground">No store revenue yet.</p>}
        </div>
      </div>
      <div className="glass flex flex-wrap items-center gap-3 rounded-2xl p-4">
        <div>
          <Label className="text-xs">Manage a store</Label>
          <p className="text-xs text-muted-foreground">Full product, variant, inventory, collection, coupon and order access.</p>
        </div>
        <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="ml-auto h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm">
          {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {siteId && (
        <div className="h-[720px] overflow-hidden rounded-2xl border border-border bg-neutral-950 text-neutral-100">
          <StorePanel siteId={siteId} />
        </div>
      )}
    </div>
  );
}

export { ShoppingBag };
