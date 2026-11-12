import { useMemo, useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyStorePaymentSettings, saveMyStorePaymentSettings, reviewOrderPayment } from "@/lib/store-payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { MediaUploadButton } from "@/components/media-upload";
import {
  Package, Tag, Ticket, Receipt, Plus, Trash2, Search, X, Save, Download, Upload,
  Copy, Layers, Loader2, AlertTriangle, BarChart3, CreditCard, Users, Boxes, ArrowUpRight, ShoppingBag,
} from "lucide-react";

type Tab = "overview" | "products" | "collections" | "coupons" | "orders" | "payments" | "inventory" | "customers";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || `item-${Date.now()}`;

type Attribute = { name: string; values: string[] };
type Variation = { key: string; sku?: string; price?: number; stock?: number; image?: string; enabled?: boolean };

export function StorePanel({ siteId, productLimit }: { siteId: string; productLimit?: number | null }) {
  const [tab, setTab] = useState<Tab>("overview");
  const tabs = [
    { k: "overview", label: "Overview", Icon: BarChart3, tint: "shop-sales" },
    { k: "products", label: "Products", Icon: Package, tint: "shop-catalogue" },
    { k: "inventory", label: "Inventory", Icon: Boxes, tint: "shop-inventory" },
    { k: "collections", label: "Collections", Icon: Layers, tint: "shop-collections" },
    { k: "coupons", label: "Discounts", Icon: Ticket, tint: "shop-discounts" },
    { k: "orders", label: "Orders", Icon: Receipt, tint: "shop-orders" },
    { k: "customers", label: "Customers", Icon: Users, tint: "shop-customers" },
    { k: "payments", label: "Payments", Icon: CreditCard, tint: "shop-sales" },
  ] as const;
  const current = tabs.find(t => t.k === tab);
  return <section className="shop-workspace min-w-0 text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div><div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><ShoppingBag className="h-4 w-4 text-primary" /> STORE WORKSPACE</div><h2 className="text-2xl font-semibold">{current?.label}</h2></div>
      <Button onClick={() => setTab("products")} className="gap-2"><Plus className="h-4 w-4" />Product catalogue</Button>
    </header>
    <nav aria-label="Shop controls" className="no-scrollbar flex gap-2 overflow-x-auto border-b border-border py-4 [touch-action:pan-x_pan-y]">
      {tabs.map(({ k, label, Icon, tint }) => <Button key={k} variant="ghost" onClick={() => setTab(k)} aria-current={tab === k ? "page" : undefined} className={`shop-nav ${tint} h-auto shrink-0 gap-2 rounded-md px-3 py-2.5 ${tab === k ? "shop-nav-active" : "text-muted-foreground"}`}><span className="shop-nav-icon grid h-7 w-7 place-items-center rounded-md"><Icon className="h-4 w-4" /></span>{label}</Button>)}
    </nav>
    <div key={tab} className="shop-tab-enter py-5">
      {tab === "overview" && <StoreOverview siteId={siteId} onNavigate={setTab} />}
      {tab === "products" && <ProductsTab siteId={siteId} productLimit={productLimit} />}
      {tab === "inventory" && <ProductsTab siteId={siteId} productLimit={productLimit} inventoryOnly />}
      {tab === "collections" && <CollectionsTab siteId={siteId} />}
      {tab === "coupons" && <CouponsTab siteId={siteId} />}
      {tab === "orders" && <OrdersTab siteId={siteId} />}
      {tab === "customers" && <CustomersTab siteId={siteId} />}
      {tab === "payments" && <PaymentsTab siteId={siteId} />}
    </div>
  </section>;
}

/* ================= PRODUCTS ================= */

function ProductsTab({ siteId, productLimit, inventoryOnly = false }: { siteId: string; productLimit?: number | null; inventoryOnly?: boolean }) {
  const [stockFilter, setStockFilter] = useState("all");
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "draft" | "archived">("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["store_products", siteId],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("site_id", siteId).order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = useMemo(
    () =>
      products.filter((p: any) => {
        const okS = status === "all" || (p.status ?? "active") === status;
        const t = `${p.name} ${p.sku ?? ""} ${p.category ?? ""} ${p.brand ?? ""}`.toLowerCase();
        const okStock = stockFilter === "all" || (stockFilter === "out" ? p.stock <= 0 : p.track_inventory && p.stock <= (p.low_stock_threshold ?? 3));
        return okS && okStock && (!q || t.includes(q.toLowerCase()));
      }),
    [products, q, status, stockFilter],
  );

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["store_products", siteId] });
    // Tell the live preview iframe to re-pull products so changes show instantly.
    qc.invalidateQueries({ queryKey: ["store_overview_products", siteId] });
    document.querySelectorAll("iframe").forEach((f) => f.contentWindow?.postMessage({ type: "site:storeChanged" }, "*"));
  };

  const create = useMutation({
    mutationFn: async () => {
      if (productLimit != null && products.length >= productLimit) throw new Error(`Your plan allows up to ${productLimit} products. Upgrade to add more.`);
      const name = "New product";
      const { data, error } = await supabase
        .from("products")
        .insert({ site_id: siteId, name, slug: `${slugify(name)}-${Date.now().toString(36)}`, price_inr: 499, stock: 10, status: "active", is_active: true, images: [] })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => { refresh(); setEditing(p); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulk = async (patch: { status?: string; is_active?: boolean }) => {
    if (!selected.length) return toast.error("Select products first");
    const { error } = await supabase.from("products").update(patch).in("id", selected);
    if (error) return toast.error(error.message);
    toast.success(`${selected.length} products updated`);
    setSelected([]); refresh();
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!confirm(`Delete ${selected.length} products?`)) return;
    const { error } = await supabase.from("products").delete().in("id", selected);
    if (error) return toast.error(error.message);
    setSelected([]); refresh();
  };

  const exportCsv = () => {
    const head = ["name", "sku", "price_inr", "compare_price_inr", "stock", "category", "brand", "status", "images"];
    const csv = [head.join(",")]
      .concat(rows.map((p: any) => head.map((h) => JSON.stringify(h === "images" ? (p.images ?? []).join("|") : (p[h] ?? ""))).join(",")))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "products.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const [head, ...lines] = text.trim().split(/\r?\n/);
    const cols = head.split(",").map((c) => c.replace(/"/g, "").trim());
    const parse = (l: string) => l.match(/("([^"]|"")*"|[^,]*)/g)?.filter((_, i) => i % 2 === 0) ?? [];
    const payload = lines.filter(Boolean).map((l) => {
      const vals = parse(l).map((v) => v.replace(/^"|"$/g, "").replace(/""/g, '"'));
      const o: any = {};
      cols.forEach((c, i) => (o[c] = vals[i] ?? ""));
      return {
        site_id: siteId,
        name: o.name || "Untitled",
        slug: `${slugify(o.name || "item")}-${Math.random().toString(36).slice(2, 6)}`,
        sku: o.sku || null,
        price_inr: Number(o.price_inr) || 0,
        compare_price_inr: o.compare_price_inr ? Number(o.compare_price_inr) : null,
        stock: Number(o.stock) || 0,
        category: o.category || null,
        brand: o.brand || null,
        status: o.status || "active",
        images: o.images ? String(o.images).split("|").filter(Boolean) : [],
      };
    });
    const { error } = await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(`${payload.length} products imported`);
    refresh();
  };

  if (editing) return <ProductForm siteId={siteId} product={editing} onClose={() => { setEditing(null); refresh(); }} />;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products, SKU…" className="h-10 pl-7 text-xs" />
        </div>
        <Button size="sm" className="h-10 shrink-0 gap-1 px-2.5 text-xs" onClick={() => create.mutate()} disabled={create.isPending}>
          <Plus className="h-3.5 w-3.5" /> Add product
        </Button>

      </div>
      {inventoryOnly && <div className="flex flex-wrap gap-2">{[["all", "All inventory"], ["low", "Low stock"], ["out", "Out of stock"]].map(([key, label]) => <Button key={key} size="sm" variant={stockFilter === key ? "secondary" : "outline"} onClick={() => setStockFilter(key)}>{label}</Button>)}</div>}
      {productLimit != null && <div className="flex items-center justify-between text-xs text-muted-foreground"><span>Plan usage</span><span>{products.length} / {productLimit} products</span></div>}

      <div className="flex flex-wrap gap-1 text-xs">
        {(["all", "active", "draft", "archived"] as const).map((s) => (
          <Button variant="ghost" key={s} onClick={() => setStatus(s)}
            className={`rounded-full px-2 py-1 uppercase tracking-wide ${status === s ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"}`}>
            {s}
          </Button>
        ))}
        <Button variant="ghost" onClick={exportCsv} className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
          <Download className="h-3 w-3" /> CSV
        </Button>
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-muted px-2 py-1 text-muted-foreground">
          <Upload className="h-3 w-3" /> Import
          <input type="file" accept=".csv" hidden onChange={(e) => e.target.files?.[0] && importCsv(e.target.files[0])} />
        </label>
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-2 text-xs">
          <span className="mr-auto self-center text-muted-foreground">{selected.length} selected</span>
          <Button variant="ghost" onClick={() => bulk({ status: "active", is_active: true })} className="rounded bg-primary/10 px-2 py-1 text-primary">Activate</Button>
          <Button variant="ghost" onClick={() => bulk({ status: "draft" })} className="rounded bg-muted px-2 py-1">Draft</Button>
          <Button variant="ghost" onClick={bulkDelete} className="rounded bg-destructive/10 px-2 py-1 text-destructive">Delete</Button>
        </div>
      )}

      {isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
      {!isLoading && !rows.length && <p className="text-xs text-muted-foreground">No products yet. Click + to add your first one.</p>}

      <div className="space-y-1">
        {rows.map((p: any) => {
          const low = p.track_inventory && p.stock <= (p.low_stock_threshold ?? 3);
          return (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-muted p-2">
              <input type="checkbox" checked={selected.includes(p.id)}
                onChange={(e) => setSelected((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))}
                className="h-3 w-3" />
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded bg-muted">
                {(p.images as string[])?.[0] && <img src={(p.images as string[])[0]} alt={p.name} className="h-full w-full object-cover" />}
              </div>
              <Button variant="ghost" onClick={() => setEditing(p)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-xs font-semibold text-foreground">{p.name}</div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>₹{p.price_inr}</span>
                  <span className={low ? "text-shop-warning" : ""}>{low && <AlertTriangle className="mr-0.5 inline h-2.5 w-2.5" />}{p.stock} in stock</span>
                  <span className="uppercase">{p.status ?? "active"}</span>
                </div>
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductForm({ siteId, product, onClose }: { siteId: string; product: any; onClose: () => void }) {
  const [p, setP] = useState<any>({ ...product, images: product.images ?? [], attributes: product.attributes ?? [], variants: product.variants ?? [] });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: unknown) => setP((s: any) => ({ ...s, [k]: v }));

  const attributes: Attribute[] = Array.isArray(p.attributes) ? p.attributes : [];
  const variations: Variation[] = Array.isArray(p.variants) ? p.variants : [];

  const generateVariations = () => {
    const lists = attributes.filter((a) => a.name && a.values.length).map((a) => a.values.map((v) => `${a.name}: ${v}`));
    if (!lists.length) return toast.error("Add attributes first (e.g. Size → S, M, L)");
    let combos: string[][] = [[]];
    for (const l of lists) combos = combos.flatMap((c) => l.map((v) => [...c, v]));
    const next = combos.map((c) => {
      const key = c.join(" / ");
      const old = variations.find((v) => v.key === key);
      return old ?? { key, price: Number(p.price_inr), stock: 0, enabled: true };
    });
    set("variants", next);
    toast.success(`${next.length} variations generated`);
  };

  const save = async () => {
    setSaving(true);
    const { id, created_at, updated_at, ...rest } = p;
    const { error } = await supabase
      .from("products")
      .update({ ...rest, slug: p.slug || slugify(p.name), site_id: siteId, is_active: (p.status ?? "active") === "active" })
      .eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Product saved");
    onClose();
  };

  const remove = async () => {
    if (!confirm("Delete this product?")) return;
    await supabase.from("products").delete().eq("id", p.id);
    onClose();
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onClose} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></Button>
        <span className="font-bold uppercase tracking-wide text-muted-foreground">Edit product</span>
        <Button variant="ghost" onClick={remove} className="ml-auto rounded p-1 text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>

      <Field label="Name"><Input className="h-10 text-xs" value={p.name ?? ""} onChange={(e) => set("name", e.target.value)} /></Field>
      <Field label="Description"><Textarea rows={3} className="text-xs" value={p.description ?? ""} onChange={(e) => set("description", e.target.value)} /></Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Price ₹"><Input type="number" className="h-10 text-xs" value={p.price_inr ?? 0} onChange={(e) => set("price_inr", Number(e.target.value))} /></Field>
        <Field label="Compare at ₹"><Input type="number" className="h-10 text-xs" value={p.compare_price_inr ?? ""} onChange={(e) => set("compare_price_inr", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="SKU"><Input className="h-10 text-xs" value={p.sku ?? ""} onChange={(e) => set("sku", e.target.value)} /></Field>
        <Field label="Barcode"><Input className="h-10 text-xs" value={p.barcode ?? ""} onChange={(e) => set("barcode", e.target.value)} /></Field>
        <Field label="Category"><Input className="h-10 text-xs" value={p.category ?? ""} onChange={(e) => set("category", e.target.value)} /></Field>
        <Field label="Brand"><Input className="h-10 text-xs" value={p.brand ?? ""} onChange={(e) => set("brand", e.target.value)} /></Field>
        <Field label="Stock"><Input type="number" className="h-10 text-xs" value={p.stock ?? 0} onChange={(e) => set("stock", Number(e.target.value))} /></Field>
        <Field label="Low stock alert"><Input type="number" className="h-10 text-xs" value={p.low_stock_threshold ?? 3} onChange={(e) => set("low_stock_threshold", Number(e.target.value))} /></Field>
        <Field label="Tax %"><Input type="number" className="h-10 text-xs" value={p.tax_percent ?? 0} onChange={(e) => set("tax_percent", Number(e.target.value))} /></Field>
        <Field label="Weight (g)"><Input type="number" className="h-10 text-xs" value={p.weight_grams ?? ""} onChange={(e) => set("weight_grams", e.target.value ? Number(e.target.value) : null)} /></Field>
        <Field label="Badge"><Input className="h-10 text-xs" placeholder="New / Sale" value={p.badge ?? ""} onChange={(e) => set("badge", e.target.value)} /></Field>
        <Field label="Status">
          <select value={p.status ?? "active"} onChange={(e) => set("status", e.target.value)}
            className="h-10 w-full rounded-md border border-border bg-card px-2 text-xs">
            <option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option>
          </select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <Toggle label="Track inventory" checked={p.track_inventory ?? true} onChange={(v) => set("track_inventory", v)} />
        <Toggle label="Allow backorder" checked={p.allow_backorder ?? false} onChange={(v) => set("allow_backorder", v)} />
        <Toggle label="Featured" checked={p.is_featured ?? false} onChange={(v) => set("is_featured", v)} />
      </div>

      <Field label="Images (upload or one URL per line)">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <MediaUploadButton multiple label="Upload photos" onUploaded={(urls) => set("images", [...(p.images as string[]), ...urls])} />
            {(p.images as string[]).slice(0, 6).map((u, i) => (
              <img key={i} src={u} alt="" className="h-10 w-10 rounded object-cover" />
            ))}
          </div>
          <Textarea rows={3} className="text-xs" value={(p.images as string[]).join("\n")}
            onChange={(e) => set("images", e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} />
        </div>
      </Field>
      <Field label="Video URL (mp4)">
        <div className="flex items-center gap-1">
          <Input className="h-10 text-xs" value={p.video_url ?? ""} onChange={(e) => set("video_url", e.target.value)} />
          <MediaUploadButton label="" accept="video/mp4,video/webm" onUploaded={(u) => { if (u[0]) set("video_url", u[0]); }} />
        </div>
      </Field>

      {/* Attributes + variations */}
      <div className="rounded-lg border border-border p-2">
        <div className="mb-2 flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-bold uppercase tracking-wide text-muted-foreground">Attributes & variations</span>
          <Button variant="ghost" onClick={() => set("attributes", [...attributes, { name: "", values: [] }])} className="ml-auto rounded bg-muted px-2 py-0.5 text-xs">Add</Button>
        </div>
        {attributes.map((a, i) => (
          <div key={i} className="mb-1 grid grid-cols-[1fr_1.6fr_auto] gap-1">
            <Input className="h-9 text-xs" placeholder="Size" value={a.name}
              onChange={(e) => { const n = [...attributes]; n[i] = { ...a, name: e.target.value }; set("attributes", n); }} />
            <Input className="h-9 text-xs" placeholder="S, M, L" value={a.values.join(", ")}
              onChange={(e) => { const n = [...attributes]; n[i] = { ...a, values: e.target.value.split(",").map((v) => v.trim()).filter(Boolean) }; set("attributes", n); }} />
            <Button variant="ghost" onClick={() => set("attributes", attributes.filter((_, x) => x !== i))} className="rounded px-1 text-destructive"><Trash2 className="h-3 w-3" /></Button>
          </div>
        ))}
        <Button variant="ghost" onClick={generateVariations} className="mt-1 w-full rounded bg-muted py-1 text-xs uppercase tracking-wide">Generate variations</Button>
        {variations.length > 0 && (
          <div className="mt-2 space-y-1">
            {variations.map((v, i) => (
              <div key={v.key} className="space-y-1 rounded-md bg-muted p-1.5">
                <div className="flex items-center gap-1"><span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">{v.key}</span><Toggle label="On" checked={v.enabled !== false} onChange={(enabled) => { const n = [...variations]; n[i] = { ...v, enabled }; set("variants", n); }} /><Button variant="ghost" onClick={() => set("variants", variations.filter((_, x) => x !== i))} className="rounded px-1 text-destructive"><Trash2 className="h-3 w-3" /></Button></div>
                <div className="grid grid-cols-3 gap-1">
                <Input className="h-9 text-xs" type="number" placeholder="₹" value={v.price ?? ""}
                  onChange={(e) => { const n = [...variations]; n[i] = { ...v, price: Number(e.target.value) }; set("variants", n); }} />
                <Input className="h-9 text-xs" type="number" placeholder="qty" value={v.stock ?? ""}
                  onChange={(e) => { const n = [...variations]; n[i] = { ...v, stock: Number(e.target.value) }; set("variants", n); }} />
                <Input className="h-9 text-xs" placeholder="SKU" value={v.sku ?? ""} onChange={(e) => { const n = [...variations]; n[i] = { ...v, sku: e.target.value }; set("variants", n); }} />
                </div>
                <Input className="h-9 text-xs" placeholder="Variant image URL" value={v.image ?? ""} onChange={(e) => { const n = [...variations]; n[i] = { ...v, image: e.target.value }; set("variants", n); }} />
              </div>
            ))}
          </div>
        )}
      </div>

      <Field label="SEO title"><Input className="h-10 text-xs" value={p.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></Field>
      <Field label="SEO description"><Textarea rows={2} className="text-xs" value={p.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} /></Field>

      <div className="flex gap-2 pb-6">
        <Button size="sm" className="flex-1" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </Button>
        <Button size="sm" variant="outline" onClick={async () => {
          const { id, created_at, updated_at, ...rest } = p;
          await supabase.from("products").insert({ ...rest, name: `${p.name} copy`, slug: `${slugify(p.name)}-${Date.now().toString(36)}` });
          toast.success("Duplicated"); onClose();
        }}><Copy className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

/* ================= COLLECTIONS ================= */

function StoreOverview({ siteId, onNavigate }: { siteId: string; onNavigate: (tab: Tab) => void }) {
  const { data: products = [], isError: productError } = useQuery({ queryKey: ["store_overview_products", siteId], queryFn: async () => { const { data, error } = await supabase.from("products").select("id, name, stock, low_stock_threshold, track_inventory, status").eq("site_id", siteId); if (error) throw error; return data ?? []; } });
  const { data: orders = [], isError: orderError } = useQuery({ queryKey: ["store_overview_orders", siteId], queryFn: async () => { const { data, error } = await supabase.from("orders").select("id, order_no, buyer_name, total_inr, payment_status, buyer_phone, fulfillment_status, created_at").eq("site_id", siteId).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  const paid = orders.filter(o => o.payment_status === "paid");
  const revenue = paid.reduce((sum, o) => sum + Number(o.total_inr), 0);
  const low = products.filter(p => p.track_inventory && p.stock <= (p.low_stock_threshold ?? 3));
  const customers = new Set(orders.map(o => o.buyer_phone).filter(Boolean)).size;
  const pending = orders.filter(o => o.fulfillment_status === "unfulfilled").length;
  if (productError || orderError) return <p className="text-destructive">Store overview could not load. Please try again.</p>;
  return <div className="space-y-7">
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{[
      { label: "Paid revenue", value: `₹${revenue.toLocaleString("en-IN")}`, Icon: CreditCard, tint: "shop-sales" },
      { label: "Orders", value: String(orders.length), Icon: Receipt, tint: "shop-orders" },
      { label: "Products", value: String(products.length), Icon: Package, tint: "shop-catalogue" },
      { label: "Customers", value: String(customers), Icon: Users, tint: "shop-customers" },
    ].map(({ label, value, Icon, tint }) => <div key={label} className={`shop-metric ${tint} rounded-lg border border-border p-4`}><span className="shop-nav-icon mb-5 grid h-9 w-9 place-items-center rounded-md"><Icon className="h-4 w-4" /></span><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-2xl font-semibold">{value}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <section className="min-w-0"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Recent orders</h3><Button variant="ghost" size="sm" onClick={() => onNavigate("orders")}>View all<ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
        {orders.length ? <div className="divide-y divide-border">{orders.slice(0, 5).map(o => <Button key={o.id} variant="ghost" onClick={() => onNavigate("orders")} className="h-auto w-full justify-between gap-3 rounded-none py-4"><span className="min-w-0 text-left"><span className="block truncate font-medium">#{o.order_no ?? o.id.slice(0, 6)} · {o.buyer_name}</span><span className="text-xs text-muted-foreground">{o.fulfillment_status}</span></span><span className="shrink-0">₹{Number(o.total_inr).toLocaleString("en-IN")}</span></Button>)}</div> : <div className="border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground"><Receipt className="mx-auto mb-3 h-7 w-7" />No orders yet</div>}
      </section>
      <section><h3 className="mb-4 text-lg font-semibold">Needs attention</h3><Button variant="outline" onClick={() => onNavigate("inventory")} className="mb-3 h-auto w-full justify-start gap-3 whitespace-normal p-4"><AlertTriangle className="h-5 w-5 shrink-0 text-shop-warning" /><span className="text-left"><span className="block font-semibold">{low.length} low-stock products</span><span className="text-xs text-muted-foreground">Inventory</span></span></Button><Button variant="outline" onClick={() => onNavigate("orders")} className="h-auto w-full justify-start gap-3 p-4"><Package className="h-5 w-5 text-primary" /><span className="text-left"><span className="block font-semibold">{pending} orders to fulfil</span><span className="text-xs text-muted-foreground">Orders</span></span></Button></section>
    </div>
  </div>;
}

function CustomersTab({ siteId }: { siteId: string }) {
  const [search, setSearch] = useState("");
  const { data: orders = [], isLoading, isError } = useQuery({ queryKey: ["store_customer_orders", siteId], queryFn: async () => { const { data, error } = await supabase.from("orders").select("buyer_name,buyer_phone,buyer_email,total_inr,payment_status,created_at").eq("site_id", siteId).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  const buyers = new Map<string, { name: string; phone: string; email: string; orders: number; spent: number }>();
  for (const o of orders) { const key = o.buyer_phone || o.buyer_email; if (!key) continue; const buyer = buyers.get(key) ?? { name: o.buyer_name, phone: o.buyer_phone, email: o.buyer_email ?? "", orders: 0, spent: 0 }; buyer.orders++; if (o.payment_status === "paid") buyer.spent += Number(o.total_inr); buyers.set(key, buyer); }
  const rows = [...buyers.values()].filter(b => `${b.name} ${b.phone} ${b.email}`.toLowerCase().includes(search.toLowerCase()));
  return <section><div className="relative mb-5"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search customers" className="pl-9" /></div>{isLoading ? <p>Loading customers…</p> : isError ? <p className="text-destructive">Customers could not load.</p> : !rows.length ? <p className="py-8 text-center text-muted-foreground">No customers found</p> : <div className="divide-y divide-border">{rows.map(b => <div key={b.phone || b.email} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="font-semibold">{b.name}</p><p className="break-all text-xs text-muted-foreground">{b.phone} · {b.email}</p></div><div className="text-right text-sm"><p>₹{b.spent.toLocaleString("en-IN")}</p><p className="text-xs text-muted-foreground">{b.orders} orders</p></div></div>)}</div>}</section>;
}

function CollectionsTab({ siteId }: { siteId: string }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["store_collections", siteId],
    queryFn: async () => (await supabase.from("store_collections").select("*").eq("site_id", siteId).order("sort_order")).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["store_collections", siteId] });

  const add = async () => {
    const name = prompt("Collection name")?.trim();
    if (!name) return;
    const { error } = await supabase.from("store_collections").insert({ site_id: siteId, name, slug: slugify(name) });
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-2 text-xs">
      <Button size="sm" className="w-full" onClick={add}><Plus className="h-3.5 w-3.5" /> New collection</Button>
      {rows.map((c: any) => (
        <div key={c.id} className="space-y-1 rounded-lg border border-border p-2">
          <div className="flex items-center gap-2">
            <Input className="h-9 flex-1 text-xs" defaultValue={c.name}
              onBlur={(e) => supabase.from("store_collections").update({ name: e.target.value }).eq("id", c.id).then(refresh)} />
            <Button variant="ghost" onClick={() => supabase.from("store_collections").delete().eq("id", c.id).then(refresh)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <Input className="h-9 text-xs" placeholder="Image URL" defaultValue={c.image ?? ""}
            onBlur={(e) => supabase.from("store_collections").update({ image: e.target.value }).eq("id", c.id).then(refresh)} />
        </div>
      ))}
      {!rows.length && <p className="text-xs text-muted-foreground">Group products into collections like "New arrivals" or "Best sellers".</p>}
    </div>
  );
}

/* ================= COUPONS ================= */

function CouponsTab({ siteId }: { siteId: string }) {
  const qc = useQueryClient();
  const { data: rows = [] } = useQuery({
    queryKey: ["store_coupons", siteId],
    queryFn: async () => (await supabase.from("store_coupons").select("*").eq("site_id", siteId).order("created_at", { ascending: false })).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["store_coupons", siteId] });

  const add = async () => {
    const code = prompt("Coupon code (e.g. SAVE10)")?.trim().toUpperCase();
    if (!code) return;
    const { error } = await supabase.from("store_coupons").insert({ site_id: siteId, code, kind: "percent", value: 10 });
    if (error) return toast.error(error.message);
    refresh();
  };

  return (
    <div className="space-y-2 text-xs">
      <Button size="sm" className="w-full" onClick={add}><Plus className="h-3.5 w-3.5" /> New coupon</Button>
      {rows.map((c: any) => (
        <div key={c.id} className="space-y-1 rounded-lg border border-border p-2">
          <div className="flex items-center gap-2">
            <span className="flex-1 font-mono font-bold text-foreground">{c.code}</span>
            <Button variant="ghost" onClick={() => supabase.from("store_coupons").update({ is_active: !c.is_active }).eq("id", c.id).then(refresh)}
              className={`rounded-full px-2 py-0.5 text-xs ${c.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
              {c.is_active ? "Active" : "Off"}
            </Button>
            <Button variant="ghost" onClick={() => supabase.from("store_coupons").delete().eq("id", c.id).then(refresh)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <select defaultValue={c.kind} onChange={(e) => supabase.from("store_coupons").update({ kind: e.target.value }).eq("id", c.id).then(refresh)}
              className="h-9 rounded-md border border-border bg-card px-1 text-xs">
              <option value="percent">%</option><option value="fixed">₹</option>
            </select>
            <Input className="h-9 text-xs" type="number" defaultValue={c.value}
              onBlur={(e) => supabase.from("store_coupons").update({ value: Number(e.target.value) }).eq("id", c.id).then(refresh)} />
            <Input className="h-9 text-xs" type="number" placeholder="min ₹" defaultValue={c.min_order_inr}
              onBlur={(e) => supabase.from("store_coupons").update({ min_order_inr: Number(e.target.value) }).eq("id", c.id).then(refresh)} />
          </div>
          <p className="text-xs text-muted-foreground">Used {c.used_count} times</p>
        </div>
      ))}
    </div>
  );
}

/* ================= PAYMENTS ================= */

const EMPTY_SETTINGS = {
  cod_enabled: true, cod_min_inr: 0, cod_max_inr: null as number | null, cod_instructions: null as string | null,
  upi_enabled: false, upi_id: null as string | null, upi_name: null as string | null, upi_qr_url: null as string | null, upi_instructions: null as string | null,
  bank_enabled: false, bank_account_name: null as string | null, bank_account_number: null as string | null, bank_ifsc: null as string | null, bank_name: null as string | null, bank_instructions: null as string | null,
  crypto_enabled: false, crypto_wallet_address: null as string | null, crypto_network: null as string | null, crypto_qr_url: null as string | null, crypto_instructions: null as string | null,
  razorpay_enabled: false, razorpay_key_id: null as string | null, razorpay_key_secret: "" as string, razorpay_mode: "test" as "test" | "live",
};

function PaymentsTab({ siteId }: { siteId: string }) {
  const load = useServerFn(getMyStorePaymentSettings);
  const save = useServerFn(saveMyStorePaymentSettings);
  const [form, setForm] = useState<any>(EMPTY_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  const { data } = useQuery({
    queryKey: ["store_pay_settings", siteId],
    queryFn: async () => (await load({ data: { siteId } })) as any,
  });

  if (data && !loaded) {
    setLoaded(true);
    if (data.settings) setForm({ ...EMPTY_SETTINGS, ...data.settings, razorpay_key_secret: "" });
  }

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const txt = (k: string) => (form[k] ?? "") as string;

  const submit = useMutation({
    mutationFn: async () =>
      save({
        data: {
          siteId,
          cod_enabled: !!form.cod_enabled,
          cod_min_inr: Number(form.cod_min_inr || 0),
          cod_max_inr: form.cod_max_inr === null || form.cod_max_inr === "" ? null : Number(form.cod_max_inr),
          cod_instructions: form.cod_instructions || null,
          upi_enabled: !!form.upi_enabled, upi_id: form.upi_id || null, upi_name: form.upi_name || null,
          upi_qr_url: form.upi_qr_url || null, upi_instructions: form.upi_instructions || null,
          bank_enabled: !!form.bank_enabled, bank_account_name: form.bank_account_name || null,
          bank_account_number: form.bank_account_number || null, bank_ifsc: form.bank_ifsc || null,
          bank_name: form.bank_name || null, bank_instructions: form.bank_instructions || null,
          crypto_enabled: !!form.crypto_enabled, crypto_wallet_address: form.crypto_wallet_address || null,
          crypto_network: form.crypto_network || null, crypto_qr_url: form.crypto_qr_url || null,
          crypto_instructions: form.crypto_instructions || null,
          razorpay_enabled: !!form.razorpay_enabled, razorpay_key_id: form.razorpay_key_id || null,
          razorpay_key_secret: form.razorpay_key_secret || null, razorpay_mode: form.razorpay_mode ?? "test",
        },
      }),
    onSuccess: () => toast.success("Payment settings saved"),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 text-xs">
      <p className="text-xs text-muted-foreground">
        Choose how customers pay you. Manual methods ask the buyer for a UTR / reference and a payment screenshot — you accept or reject it in Orders.
      </p>

      <PayCard title="Cash on delivery" enabled={!!form.cod_enabled} onToggle={(v) => set("cod_enabled", v)}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min order ₹"><Input className="h-10" type="number" value={String(form.cod_min_inr ?? 0)} onChange={(e) => set("cod_min_inr", e.target.value)} /></Field>
          <Field label="Max order ₹ (blank = no cap)"><Input className="h-10" type="number" value={form.cod_max_inr ?? ""} onChange={(e) => set("cod_max_inr", e.target.value === "" ? null : e.target.value)} /></Field>
        </div>
        <Field label="Instructions for buyer"><Textarea rows={2} value={txt("cod_instructions")} onChange={(e) => set("cod_instructions", e.target.value)} /></Field>
      </PayCard>

      <PayCard title="UPI / QR" enabled={!!form.upi_enabled} onToggle={(v) => set("upi_enabled", v)}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="UPI ID"><Input className="h-10" placeholder="name@bank" value={txt("upi_id")} onChange={(e) => set("upi_id", e.target.value)} /></Field>
          <Field label="Payee name"><Input className="h-10" value={txt("upi_name")} onChange={(e) => set("upi_name", e.target.value)} /></Field>
        </div>
        <QrField label="UPI QR image" value={txt("upi_qr_url")} onChange={(v) => set("upi_qr_url", v)} />
        <Field label="Instructions"><Textarea rows={2} value={txt("upi_instructions")} onChange={(e) => set("upi_instructions", e.target.value)} /></Field>
      </PayCard>

      <PayCard title="Bank transfer" enabled={!!form.bank_enabled} onToggle={(v) => set("bank_enabled", v)}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Account name"><Input className="h-10" value={txt("bank_account_name")} onChange={(e) => set("bank_account_name", e.target.value)} /></Field>
          <Field label="Account number"><Input className="h-10" value={txt("bank_account_number")} onChange={(e) => set("bank_account_number", e.target.value)} /></Field>
          <Field label="IFSC"><Input className="h-10" value={txt("bank_ifsc")} onChange={(e) => set("bank_ifsc", e.target.value)} /></Field>
          <Field label="Bank"><Input className="h-10" value={txt("bank_name")} onChange={(e) => set("bank_name", e.target.value)} /></Field>
        </div>
        <Field label="Instructions"><Textarea rows={2} value={txt("bank_instructions")} onChange={(e) => set("bank_instructions", e.target.value)} /></Field>
      </PayCard>

      <PayCard title="Crypto" enabled={!!form.crypto_enabled} onToggle={(v) => set("crypto_enabled", v)}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Wallet address"><Input className="h-10" value={txt("crypto_wallet_address")} onChange={(e) => set("crypto_wallet_address", e.target.value)} /></Field>
          <Field label="Network"><Input className="h-10" placeholder="USDT · TRC20" value={txt("crypto_network")} onChange={(e) => set("crypto_network", e.target.value)} /></Field>
        </div>
        <QrField label="Crypto QR image" value={txt("crypto_qr_url")} onChange={(v) => set("crypto_qr_url", v)} />
        <Field label="Instructions"><Textarea rows={2} value={txt("crypto_instructions")} onChange={(e) => set("crypto_instructions", e.target.value)} /></Field>
      </PayCard>

      <PayCard title="Razorpay (your own account)" enabled={!!form.razorpay_enabled} onToggle={(v) => set("razorpay_enabled", v)}>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Key ID"><Input className="h-10" value={txt("razorpay_key_id")} onChange={(e) => set("razorpay_key_id", e.target.value)} /></Field>
          <Field label="Mode">
            <select value={form.razorpay_mode ?? "test"} onChange={(e) => set("razorpay_mode", e.target.value)}
              className="h-10 w-full rounded-md border border-border bg-card px-2 text-xs">
              <option value="test">Test</option><option value="live">Live</option>
            </select>
          </Field>
        </div>
        <Field label="Key secret (leave blank to keep the saved one)">
          <Input className="h-10" type="password" value={form.razorpay_key_secret ?? ""} onChange={(e) => set("razorpay_key_secret", e.target.value)} />
        </Field>
      </PayCard>

      <Button size="sm" className="w-full" disabled={submit.isPending} onClick={() => submit.mutate()}>
        {submit.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Save className="mr-1 h-3 w-3" />} Save payment settings
      </Button>
    </div>
  );
}

function PayCard({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wide text-foreground">{title}</span>
        <Toggle label={enabled ? "On" : "Off"} checked={enabled} onChange={onToggle} />
      </div>
      {enabled && <div className="space-y-2">{children}</div>}
    </div>
  );
}

function QrField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        {value ? <img src={value} alt="" className="h-12 w-12 rounded-md object-cover" /> : null}
        <Input className="h-10 flex-1" placeholder="Image URL" value={value} onChange={(e) => onChange(e.target.value)} />
        <MediaUploadButton label="Upload" onUploaded={(urls) => urls[0] && onChange(urls[0])} />
      </div>
    </Field>
  );
}

/* ================= ORDERS ================= */

function OrdersTab({ siteId }: { siteId: string }) {
  const qc = useQueryClient();
  const review = useServerFn(reviewOrderPayment);
  const [q, setQ] = useState("");
  const [pf, setPf] = useState<"all" | "pending" | "paid" | "cod" | "failed" | "refunded">("all");

  const { data: rows = [] } = useQuery({
    queryKey: ["store_orders", siteId],
    queryFn: async () => (await supabase.from("orders").select("*").eq("site_id", siteId).order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["store_orders", siteId] });

  const revenue = rows.filter((o: any) => o.payment_status === "paid").reduce((s: number, o: any) => s + Number(o.total_inr), 0);
  const awaiting = rows.filter((o: any) => o.payment_status === "pending" && o.gateway_kind !== "cod");

  const list = rows.filter((o: any) => {
    const okP = pf === "all" || o.payment_status === pf;
    const t = `${o.order_no ?? ""} ${o.buyer_name ?? ""} ${o.buyer_phone ?? ""} ${o.payment_reference ?? ""}`.toLowerCase();
    return okP && (!q || t.includes(q.toLowerCase()));
  });

  const decide = async (orderId: string, decision: "accept" | "reject" | "refund") => {
    const reason = decision === "accept" ? undefined : prompt(decision === "refund" ? "Refund note" : "Why is this payment rejected?") ?? undefined;
    try {
      await review({ data: { orderId, decision, ...(reason ? { reason } : {}) } });
      toast.success(decision === "accept" ? "Payment accepted" : decision === "refund" ? "Marked refunded" : "Payment rejected");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update payment");
    }
  };

  return (
    <div className="space-y-2 text-xs">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Orders" value={String(rows.length)} />
        <Stat label="Paid revenue" value={`₹${revenue}`} />
        <Stat label="To verify" value={String(awaiting.length)} />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
          <Input className="h-9 pl-7 text-xs" placeholder="Search order, buyer, UTR" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={pf} onChange={(e) => setPf(e.target.value as any)}
          className="h-9 rounded-md border border-border bg-card px-1 text-xs">
          {["all", "pending", "paid", "cod", "failed", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {!list.length && <p className="text-xs text-muted-foreground">Orders from your storefront will appear here.</p>}

      {list.map((o: any) => (
        <div key={o.id} className="space-y-1.5 rounded-lg border border-border p-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-foreground">#{o.order_no ?? o.id.slice(0, 6)}</span>
            <span className="truncate text-muted-foreground">{o.buyer_name}</span>
            <span className="ml-auto font-semibold text-foreground">₹{o.total_inr}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {o.buyer_phone} · {(o.items as any[])?.length ?? 0} items · {o.gateway_kind} · {new Date(o.created_at).toLocaleDateString()}
          </div>

          {(o.payment_reference || o.payment_proof_url) && (
            <div className="flex items-center gap-2 rounded-md border border-shop-warning bg-shop-warning/10 p-1.5">
              {o.payment_proof_url && (
                <a href={o.payment_proof_url} target="_blank" rel="noreferrer">
                  <img src={o.payment_proof_url} alt="Payment proof" className="h-12 w-12 rounded object-cover" />
                </a>
              )}
              <div className="min-w-0 text-xs text-muted-foreground">
                <div className="font-semibold text-shop-warning">Payment proof submitted</div>
                {o.payment_reference && <div className="truncate">UTR / ref: {o.payment_reference}</div>}
                {o.payment_rejected_reason && <div className="text-destructive">Rejected: {o.payment_rejected_reason}</div>}
              </div>
            </div>
          )}

          {o.payment_status !== "paid" && (
            <div className="grid grid-cols-3 gap-1">
              <Button size="sm" className="h-9 text-xs" onClick={() => decide(o.id, "accept")}>Accept payment</Button>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => decide(o.id, "reject")}>Reject</Button>
              <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => decide(o.id, "refund")}>Refund</Button>
            </div>
          )}
          {o.payment_status === "paid" && (
            <div className="flex items-center gap-2 text-xs text-primary">
              Payment accepted{o.payment_verified_at ? ` · ${new Date(o.payment_verified_at).toLocaleDateString()}` : ""}
              <Button size="sm" variant="outline" className="ml-auto h-6 text-xs" onClick={() => decide(o.id, "refund")}>Refund</Button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1">
            <select defaultValue={o.payment_status} onChange={(e) => supabase.from("orders").update({ payment_status: e.target.value }).eq("id", o.id).then(refresh)}
              className="h-9 rounded-md border border-border bg-card px-1 text-xs">
              {["pending", "paid", "cod", "refunded", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select defaultValue={o.fulfillment_status} onChange={(e) => supabase.from("orders").update({ fulfillment_status: e.target.value }).eq("id", o.id).then(refresh)}
              className="h-9 rounded-md border border-border bg-card px-1 text-xs">
              {["unfulfilled", "packed", "shipped", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="flex gap-1">
            <Input className="h-9 flex-1 text-xs" placeholder="Tracking number" defaultValue={o.tracking_number ?? ""}
              onBlur={(e) => supabase.from("orders").update({ tracking_number: e.target.value }).eq("id", o.id).then(refresh)} />
            <a
              href={`https://wa.me/${String(o.buyer_phone ?? "").replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                `Hi ${o.buyer_name}, update on your order #${o.order_no}: payment ${o.payment_status}, status ${o.fulfillment_status}.`,
              )}`}
              target="_blank" rel="noreferrer"
              className="inline-flex h-7 items-center rounded-md bg-primary/10 px-2 text-xs font-semibold text-primary"
            >
              WhatsApp
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}


/* ================= bits ================= */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
      {label}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted p-2">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}
