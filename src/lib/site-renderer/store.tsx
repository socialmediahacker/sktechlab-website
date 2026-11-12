import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart, X, Plus, Minus, Search, Check, Loader2, Star, Heart, UserRound, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { fetchStoreProducts, validateCoupon, placeStoreOrder } from "@/lib/store.functions";
import { getStorePaymentMethods, submitOrderPaymentProof, type StorePaymentMethod } from "@/lib/store-payments.functions";
import { categoryThumb } from "@/lib/category-thumb";

export type StoreItem = {
  id: string;
  name: string;
  price: number;
  compare_at?: number | null;
  image: string;
  badge?: string | null;
  category?: string | null;
  stock?: number;
  description?: string | null;
  live?: boolean;
  images?: string[];
  brand?: string | null;
  sku?: string | null;
  attributes?: Array<{ name: string; values: string[] }>;
  variants?: Array<{ key: string; sku?: string; price?: number; stock?: number; image?: string; enabled?: boolean }>;
};

type Line = { item: StoreItem; qty: number; variant?: string };

/**
 * Shopify-style storefront: live products from the store manager when the site
 * has them, otherwise the design's demo items. Cart drawer, coupon, checkout.
 */
export function StoreSection({ s, brand, t, siteId }: any) {
  const cur = brand.currency ?? "₹";
  const demo: StoreItem[] = (s.items ?? []).map((p: any) => ({ ...p, id: String(p.id ?? p.name) }));
  const [live, setLive] = useState<StoreItem[] | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [lines, setLines] = useState<Line[]>([]);
  const [drawer, setDrawer] = useState(false);
  const [quick, setQuick] = useState<StoreItem | null>(null);
  const [sort, setSort] = useState("featured");
  const [wishlist, setWishlist] = useState<string[]>([]);
  const categoryRailRef = useRef<HTMLDivElement | null>(null);
  const categoryRailPaused = useRef(false);

  const loadProducts = useServerFn(fetchStoreProducts);
  const [nonce, setNonce] = useState(0);

  // The visual editor's Store panel posts this after any product change.
  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.data && typeof e.data === "object" && e.data.type === "site:storeChanged") setNonce((n) => n + 1);
    };
    window.addEventListener("message", on);
    return () => window.removeEventListener("message", on);
  }, []);

  useEffect(() => {
    if (!siteId) return;
    let alive = true;
    loadProducts({ data: { siteId } })
      .then((r: any) => {
        if (!alive) return;
        if (!r?.products?.length) { setLive(null); return; }
        setLive(
          r.products.map((p: any) => ({
            id: p.id,
            name: p.name,
            price: Number(p.price_inr),
            compare_at: p.compare_price_inr ? Number(p.compare_price_inr) : null,
            image: (p.images ?? [])[0] ?? demo[0]?.image ?? "",
            images: p.images ?? [], brand: p.brand, sku: p.sku,
            attributes: p.attributes ?? [], variants: p.variants ?? [],
            badge: p.badge,
            category: p.category,
            stock: p.stock,
            description: p.description,
            live: true,
          })),
        );
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [siteId, nonce]);

  useEffect(() => {
    try { setWishlist(JSON.parse(localStorage.getItem(`store-wishlist-${siteId ?? "demo"}`) ?? "[]")); } catch { setWishlist([]); }
    try { setLines(JSON.parse(localStorage.getItem(`store-cart-${siteId ?? "demo"}`) ?? "[]")); } catch { setLines([]); }
  }, [siteId]);

  useEffect(() => {
    localStorage.setItem(`store-cart-${siteId ?? "demo"}`, JSON.stringify(lines));
  }, [lines, siteId]);

  const toggleWishlist = (id: string) => {
    setWishlist((current) => {
      const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
      localStorage.setItem(`store-wishlist-${siteId ?? "demo"}`, JSON.stringify(next));
      return next;
    });
  };

  const items = live ?? demo;
  const cats = useMemo(
    () => ["all", ...Array.from(new Set(items.map((i) => i.category).filter(Boolean) as string[]))],
    [items],
  );
  const railCats = cats.length > 1 ? [...cats, ...cats] : cats;

  useEffect(() => {
    const rail = categoryRailRef.current;
    if (!rail || cats.length <= 1) return;
    let frame = 0;
    let previous = performance.now();

    const move = (now: number) => {
      const elapsed = Math.min(now - previous, 40);
      previous = now;
      if (!categoryRailPaused.current) {
        rail.scrollLeft += elapsed * 0.025;
        const loopAt = rail.scrollWidth / 2;
        if (rail.scrollLeft >= loopAt) rail.scrollLeft -= loopAt;
      }
      frame = requestAnimationFrame(move);
    };

    frame = requestAnimationFrame(move);
    return () => cancelAnimationFrame(frame);
  }, [cats.length]);
  const shown = items
    .filter((i) => (cat === "all" || i.category === cat) && (!q || `${i.name} ${i.brand ?? ""} ${i.category ?? ""}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : sort === "name" ? a.name.localeCompare(b.name) : 0);

  const add = (item: StoreItem, qty = 1, variant?: string) => {
    if (item.variants?.some((v) => v.enabled !== false) && !variant) { setQuick(item); return; }
    const selected = variant ? item.variants?.find((v) => v.key === variant) : undefined;
    const cartItem = selected ? { ...item, price: selected.price ?? item.price, image: selected.image || item.image, stock: selected.stock ?? item.stock } : item;
    setLines((ls) => {
      const found = ls.find((l) => l.item.id === item.id && l.variant === variant);
      return found
        ? ls.map((l) => (l.item.id === item.id && l.variant === variant ? { ...l, qty: l.qty + qty } : l))
        : [...ls, { item: cartItem, qty, variant }];
    });
    setDrawer(true);
    toast.success(`${item.name} added to cart`);
  };
  const setQty = (id: string, variant: string | undefined, qty: number) =>
    setLines((ls) => (qty <= 0 ? ls.filter((l) => !(l.item.id === id && l.variant === variant)) : ls.map((l) => (l.item.id === id && l.variant === variant ? { ...l, qty } : l))));

  const count = lines.reduce((n, l) => n + l.qty, 0);
  const subtotal = lines.reduce((n, l) => n + l.item.price * l.qty, 0);

  // Auto-mounted store (no products section in the design yet) with nothing to sell: render nothing.
  if (!items.length) return null;

  return (
    <section id="products" className={`relative py-14 sm:py-20 md:py-32 ${t.bg}`}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: brand.primary }}>Shop</span>
            <h2 className={`mt-3 font-display text-4xl font-black tracking-tight md:text-5xl ${t.heading}`}>{s.title ?? "Featured products"}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className={`relative hidden items-center rounded-full px-3 sm:flex ${t.glass}`}>
              <Search className={`h-3.5 w-3.5 ${t.subtle}`} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search"
                className={`w-32 bg-transparent px-2 py-2 text-sm outline-none ${t.heading}`} />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products" className={`h-10 rounded-full px-3 text-xs outline-none ${t.glass} ${t.heading}`}>
              <option value="featured">Featured</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="name">Name A–Z</option>
            </select>
            <a href="/auth" title="Sign in or create account" className={`grid h-10 w-10 place-items-center rounded-full ${t.glass} ${t.heading}`}><UserRound className="h-4 w-4" /></a>
            <button onClick={() => setDrawer(true)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold ${t.glass} ${t.heading}`}>
              <ShoppingCart className="h-4 w-4" /> Cart · <span style={{ color: brand.primary }}>{count}</span>
            </button>
          </div>
        </div>

        {cats.length > 1 && (
          <div
            ref={categoryRailRef}
            aria-label="Product categories"
            onMouseEnter={() => { categoryRailPaused.current = true; }}
            onMouseLeave={() => { categoryRailPaused.current = false; }}
            onTouchStart={() => { categoryRailPaused.current = true; }}
            onTouchEnd={() => { categoryRailPaused.current = false; }}
            className="-mx-6 mt-8 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="flex w-max gap-4">
              {railCats.map((c, index) => {
                const active = cat === c;
                const img =
                  c === "all"
                    ? items[0]?.image || categoryThumb(String(brand.category ?? "business"))
                    : categoryThumb(c);
                return (
                  <button
                    key={`${c}-${index}`}
                    onClick={() => setCat(c)}
                    aria-pressed={active}
                    className={`group relative h-28 w-40 shrink-0 overflow-hidden rounded-2xl ring-1 transition duration-300 hover:-translate-y-1 ${active ? "ring-2" : `${t.border}`}`}
                    style={active ? { borderColor: brand.primary, boxShadow: `0 12px 40px -12px ${brand.primary}` } : undefined}
                  >
                    <img src={img} alt={c} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                    <span className="absolute inset-x-0 bottom-0 p-3 text-left text-xs font-black capitalize text-white">
                      {c === "all" ? "All products" : c}
                    </span>
                    {active && <span className="absolute inset-x-3 bottom-2 h-0.5 rounded-full" style={{ background: brand.primary }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <motion.div layout className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((p, gi) => {
            const off = p.compare_at ? Math.round((1 - p.price / p.compare_at) * 100) : 0;
            const out = p.live && typeof p.stock === "number" && p.stock <= 0;
            return (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 18, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.7, delay: Math.min(gi, 8) * 0.035 }}
                className={`group overflow-hidden rounded-3xl ${t.surface} ring-1 ${t.border}`}
              >
                <div className={`relative aspect-square overflow-hidden ${t.surface2}`}>
                  {p.image && <img src={p.image} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />}
                  {(p.badge || off > 0) && (
                    <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-black text-white shadow-lg" style={{ background: brand.primary }}>
                      {p.badge || `${off}% OFF`}
                    </span>
                  )}
                  {out && <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white">Sold out</span>}
                  <button onClick={() => toggleWishlist(p.id)} aria-label="Toggle wishlist" className="absolute right-3 top-12 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-neutral-900 shadow-lg">
                    <Heart className={`h-4 w-4 ${wishlist.includes(p.id) ? "fill-rose-500 text-rose-500" : ""}`} />
                  </button>
                  <button onClick={() => setQuick(p)}
                    className="absolute inset-x-4 bottom-16 translate-y-16 rounded-full bg-white/90 py-2 text-[11px] font-bold text-neutral-900 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    Quick view
                  </button>
                  <button onClick={() => !out && add(p)} disabled={out}
                    className="absolute inset-x-4 bottom-4 translate-y-16 rounded-full py-2.5 text-xs font-bold text-white opacity-0 shadow-2xl transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 disabled:opacity-40"
                    style={{ background: brand.primary }}>
                    {out ? "Out of stock" : "Add to cart"}
                  </button>
                </div>
                <div className="p-5">
                  <div className={`text-sm font-semibold ${t.heading}`}>{p.name}</div>
                  <div className="mt-1 flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-lg font-black" style={{ color: brand.primary }}>{cur}{p.price.toLocaleString("en-IN")}</span>
                    {p.compare_at && <span className={`text-xs line-through ${t.subtle}`}>{cur}{p.compare_at.toLocaleString("en-IN")}</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
        {!shown.length && <p className={`mt-10 text-center text-sm ${t.subtle}`}>No products match your search.</p>}
      </div>

      {quick && <ProductQuickView item={quick} cur={cur} brand={brand} onClose={() => setQuick(null)} onAdd={(qty: number, variant?: string) => { add(quick, qty, variant); setQuick(null); }} />}

      {drawer && (
        <CartDrawer
          lines={lines} setQty={setQty} cur={cur} brand={brand} subtotal={subtotal}
          siteId={siteId} live={!!live} onClose={() => setDrawer(false)} onClear={() => setLines([])}
        />
      )}
    </section>
  );
}

function ProductQuickView({ item, cur, brand, onClose, onAdd }: { item: StoreItem; cur: string; brand: any; onClose: () => void; onAdd: (qty: number, variant?: string) => void }) {
  const enabledVariants = (item.variants ?? []).filter((v) => v.enabled !== false);
  const [variant, setVariant] = useState(enabledVariants[0]?.key ?? "");
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(item.image);
  const selected = enabledVariants.find((v) => v.key === variant);
  const price = selected?.price ?? item.price;
  const stock = selected?.stock ?? item.stock;
  const images = Array.from(new Set([selected?.image, ...(item.images ?? []), item.image].filter(Boolean) as string[]));

  useEffect(() => { setActiveImage(selected?.image || images[0] || item.image); }, [variant]);

  return (
    <div className="fixed inset-0 z-[75] grid place-items-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative grid max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-5 md:grid-cols-2 md:gap-8 md:p-8">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-neutral-100"><img src={activeImage} alt={item.name} className="h-full w-full object-cover transition duration-500 hover:scale-105" /></div>
          {images.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto">{images.map((image) => <button key={image} onClick={() => setActiveImage(image)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${activeImage === image ? "border-neutral-900" : "border-transparent"}`}><img src={image} alt="" className="h-full w-full object-cover" /></button>)}</div>}
        </div>
        <div className="pt-5 md:pt-2">
          {item.brand && <p className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">{item.brand}</p>}
          <h3 className="mt-2 text-3xl font-black text-neutral-900">{item.name}</h3>
          <div className="mt-2 flex items-center gap-2"><div className="text-2xl font-black" style={{ color: brand.primary }}>{cur}{price.toLocaleString("en-IN")}</div>{item.compare_at && <span className="text-sm text-neutral-400 line-through">{cur}{item.compare_at.toLocaleString("en-IN")}</span>}</div>
          <div className="mt-2 flex items-center gap-1 text-xs text-neutral-600"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /> 4.8 · Customer favourite</div>
          <p className="mt-5 text-sm leading-6 text-neutral-600">{item.description ?? "Premium quality, carefully finished and ready to ship."}</p>
          {enabledVariants.length > 0 && <div className="mt-5"><div className="mb-2 flex justify-between text-xs font-bold text-neutral-800"><span>Choose options</span><button className="text-neutral-500 underline">Size guide</button></div><div className="flex flex-wrap gap-2">{enabledVariants.map((v) => <button key={v.key} onClick={() => setVariant(v.key)} disabled={v.stock === 0} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${variant === v.key ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 text-neutral-700"} disabled:opacity-35`}>{v.key}</button>)}</div></div>}
          <div className="mt-5 flex items-center gap-3"><div className="flex items-center rounded-full border border-neutral-200"><button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3"><Minus className="h-4 w-4" /></button><span className="w-8 text-center text-sm font-bold text-neutral-900">{qty}</span><button onClick={() => setQty(qty + 1)} className="p-3"><Plus className="h-4 w-4" /></button></div><span className={`text-xs font-semibold ${Number(stock ?? 1) > 0 ? "text-emerald-600" : "text-rose-600"}`}>{Number(stock ?? 1) > 0 ? `${stock ?? "In"} stock available` : "Out of stock"}</span></div>
          <button onClick={() => onAdd(qty, variant || undefined)} disabled={Number(stock ?? 1) <= 0} className="mt-5 w-full rounded-full py-3.5 text-sm font-bold text-white disabled:opacity-40" style={{ background: brand.primary }}>Add to cart · {cur}{(price * qty).toLocaleString("en-IN")}</button>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-5 text-center text-[10px] font-semibold text-neutral-600"><span><ShieldCheck className="mx-auto mb-1 h-4 w-4" />Secure checkout</span><span><Truck className="mx-auto mb-1 h-4 w-4" />Fast delivery</span><span><RotateCcw className="mx-auto mb-1 h-4 w-4" />Easy returns</span></div>
          {item.sku && <p className="mt-4 text-[10px] text-neutral-400">SKU: {selected?.sku ?? item.sku}</p>}
        </div>
        <button onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white text-neutral-500 shadow"><X className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

function CartDrawer({ lines, setQty, cur, brand, subtotal, siteId, live, onClose, onClear }: any) {
  const [code, setCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", pincode: "", note: "" });
  const [done, setDone] = useState<{ orderNo: number; orderId: string } | null>(null);
  const [gateway, setGateway] = useState<string>("cod");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [proofSent, setProofSent] = useState(false);

  const coupon = useServerFn(validateCoupon);
  const order = useServerFn(placeStoreOrder);
  const methodsFn = useServerFn(getStorePaymentMethods);
  const proofFn = useServerFn(submitOrderPaymentProof);

  const { data: payData } = useQuery({
    queryKey: ["store_pay_methods", siteId],
    enabled: !!siteId,
    queryFn: async () => (await methodsFn({ data: { siteId } })) as { methods: StorePaymentMethod[] },
  });
  const methods: StorePaymentMethod[] = payData?.methods ?? [];
  const method = methods.find((m) => m.kind === gateway) ?? methods[0];

  useEffect(() => {
    if (methods.length && !methods.some((m) => m.kind === gateway)) setGateway(methods[0]!.kind);
  }, [payData]);

  const pickProof = (file: File | null) => {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) return toast.error("Image must be under 3 MB");
    const reader = new FileReader();
    reader.onload = () => setProof(String(reader.result));
    reader.readAsDataURL(file);
  };

  const sendProof = async () => {
    if (!done) return;
    if (!reference.trim() && !proof) return toast.error("Add the transaction reference or a screenshot");
    try {
      await proofFn({ data: { orderId: done.orderId, ...(reference.trim() ? { reference: reference.trim() } : {}), ...(proof ? { proof } : {}) } });
      setProofSent(true);
      toast.success("Payment details sent — the store will confirm shortly");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send payment details");
    }
  };

  const applyCoupon = async () => {
    if (!siteId || !code.trim()) return;
    try {
      const r: any = await coupon({ data: { siteId, code: code.trim(), subtotal } });
      if (!r.ok) { setDiscount(0); return toast.error(r.message); }
      setDiscount(r.discount);
      toast.success(`Coupon applied — ${cur}${r.discount} off`);
    } catch { toast.error("Could not check that code"); }
  };

  const place = useMutation({
    mutationFn: async () => {
      if (!siteId || !live) throw new Error("This is a demo store — connect products to accept real orders.");
      if (!form.name || !form.phone) throw new Error("Name and phone are required");
      return (await order({
        data: {
          siteId,
          items: lines.map((l: Line) => ({ productId: l.item.id, qty: l.qty, variant: l.variant })),
          buyer: form,
          coupon: discount > 0 ? code.trim() : undefined,
          gateway: (method?.kind ?? "cod") as any,
        },
      })) as any;
    },
    onSuccess: (r) => { setDone({ orderNo: r.orderNo, orderId: r.orderId }); onClear(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const total = Math.max(0, subtotal - discount);

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="text-lg font-black text-neutral-900">{done ? "Order placed" : checkout ? "Checkout" : `Your cart · ${lines.length}`}</h3>
          <button onClick={onClose}><X className="h-5 w-5 text-neutral-500" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {done ? (
            <div className="pt-10 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-full" style={{ background: brand.primary }}>
                <Check className="h-7 w-7 text-white" />
              </div>
              <h4 className="mt-4 text-xl font-black text-neutral-900">Thank you!</h4>
              <p className="mt-1 text-sm text-neutral-600">Order #{done.orderNo} confirmed. We'll call you shortly.</p>

              {method?.requiresProof && !proofSent && (
                <div className="mt-6 space-y-3 rounded-2xl border border-neutral-200 p-4 text-left">
                  <p className="text-sm font-bold text-neutral-900">Complete your payment · {method.label}</p>
                  {method.qr && <img src={method.qr} alt="Payment QR" className="mx-auto h-40 w-40 rounded-xl object-contain" />}
                  {Object.entries(method.details).map(([k, v]) => v ? (
                    <div key={k} className="flex justify-between text-xs text-neutral-700"><span className="text-neutral-500">{k}</span><span className="font-semibold">{v}</span></div>
                  ) : null)}
                  {method.instructions && <p className="text-[11px] text-neutral-500">{method.instructions}</p>}
                  <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / transaction reference"
                    className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-900" />
                  <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-neutral-300 px-4 py-2.5 text-xs text-neutral-600">
                    <span>{proof ? "Screenshot selected" : "Upload payment screenshot"}</span>
                    <input type="file" accept="image/*" hidden onChange={(e) => pickProof(e.target.files?.[0] ?? null)} />
                    <span className="font-bold text-neutral-900">Browse</span>
                  </label>
                  <button onClick={sendProof} className="w-full rounded-full py-3 text-sm font-bold text-white" style={{ background: brand.primary }}>
                    Send payment details
                  </button>
                </div>
              )}
              {proofSent && <p className="mt-4 text-xs font-semibold text-emerald-600">Payment details received — awaiting confirmation.</p>}
            </div>
          ) : checkout ? (
            <div className="space-y-3">
              {([
                ["name", "Full name*"], ["phone", "Phone*"], ["email", "Email"],
                ["address", "Address"], ["city", "City"], ["pincode", "PIN code"], ["note", "Order note"],
              ] as const).map(([k, label]) => (
                <input key={k} value={(form as any)[k]} placeholder={label}
                  onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm text-neutral-900 outline-none focus:border-neutral-900" />
              ))}
              <div className="space-y-2 pt-1">
                <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Payment method</p>
                {methods.map((m) => (
                  <button key={m.kind} type="button" onClick={() => setGateway(m.kind)}
                    className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm ${gateway === m.kind ? "border-neutral-900 bg-neutral-50" : "border-neutral-200"}`}>
                    <span className="font-semibold text-neutral-900">{m.label}</span>
                    <span className="text-[10px] text-neutral-500">{m.requiresProof ? "Pay & share receipt" : "Pay on delivery"}</span>
                  </button>
                ))}
                {method?.instructions && <p className="text-[11px] text-neutral-500">{method.instructions}</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!lines.length && <p className="text-sm text-neutral-500">Your cart is empty.</p>}
              {lines.map((l: Line) => (
                <div key={`${l.item.id}-${l.variant ?? "default"}`} className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3">
                  {l.item.image && <img src={l.item.image} className="h-16 w-16 rounded-xl object-cover" alt="" />}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-neutral-900">{l.item.name}</div>
                    {l.variant && <div className="truncate text-[10px] text-neutral-500">{l.variant}</div>}
                    <div className="text-xs font-bold" style={{ color: brand.primary }}>{cur}{l.item.price.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 ring-1 ring-neutral-200">
                    <button onClick={() => setQty(l.item.id, l.variant, l.qty - 1)}><Minus className="h-3 w-3 text-neutral-600" /></button>
                    <span className="w-5 text-center text-xs font-bold text-neutral-900">{l.qty}</span>
                    <button onClick={() => setQty(l.item.id, l.variant, l.qty + 1)}><Plus className="h-3 w-3 text-neutral-600" /></button>
                  </div>
                </div>
              ))}
              {lines.length > 0 && siteId && (
                <div className="flex gap-2 pt-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Discount code"
                    className="flex-1 rounded-xl border border-neutral-200 px-3 py-2 text-sm uppercase text-neutral-900 outline-none" />
                  <button onClick={applyCoupon} className="rounded-xl bg-neutral-900 px-4 text-xs font-bold text-white">Apply</button>
                </div>
              )}
            </div>
          )}
        </div>

        {!done && lines.length > 0 && (
          <div className="border-t p-5">
            <div className="flex justify-between text-sm text-neutral-600"><span>Subtotal</span><span>{cur}{subtotal.toLocaleString("en-IN")}</span></div>
            {discount > 0 && <div className="flex justify-between text-sm text-emerald-600"><span>Discount</span><span>−{cur}{discount.toLocaleString("en-IN")}</span></div>}
            <div className="mt-1 flex justify-between text-lg font-black text-neutral-900"><span>Total</span><span>{cur}{total.toLocaleString("en-IN")}</span></div>
            <button
              onClick={() => (checkout ? place.mutate() : setCheckout(true))}
              disabled={place.isPending}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-bold text-white shadow-xl disabled:opacity-60"
              style={{ background: brand.primary }}>
              {place.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {checkout ? `Place order — ${cur}${total.toLocaleString("en-IN")}` : "Checkout"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
