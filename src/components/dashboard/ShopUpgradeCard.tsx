import { CheckoutPolicies } from "@/components/billing/CheckoutPolicies";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getEcomAddonOffer } from "@/lib/builder.functions";
import { checkoutShopUpgrade, verifyShopUpgrade } from "@/lib/shop-upgrade.functions";
import { usePlatformCheckout } from "@/components/billing/platform-checkout";
import { billingLabel } from "@/lib/billing-labels";
export function ShopUpgradeCard({ sites, reason, compact = false }: { sites: any[]; reason?: string; compact?: boolean }) {
  const [accepted, setAccepted] = useState(false);
  const qc = useQueryClient(), [siteId, setSiteId] = useState(sites[0]?.id || "");
  const offer = useQuery({ queryKey: ["shop_offer"], queryFn: () => getEcomAddonOffer() });
  const create = useServerFn(checkoutShopUpgrade), verify = useServerFn(verifyShopUpgrade);
  const checkout = usePlatformCheckout(`shop:${siteId}`, () => create({ data: { siteId, termsAccepted: accepted } }), proof => verify({ data: proof }), () => { for (const key of ["my_commerce_entitlement", "my_profile", "my_sites"]) qc.invalidateQueries({ queryKey: [key] }); });
  return <section className={`overflow-hidden rounded-2xl border border-primary/20 bg-card ${compact ? "p-4" : "p-6 sm:p-8"}`}><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary"><ShoppingBag className="h-6 w-6" /></span><div><p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">SELL WITH SK TECH LAB</p><h3 className="mt-1 text-xl font-semibold">{reason === "expired" ? "Renew your online shop" : reason === "trial" ? "Keep your shop after the trial" : "Turn your website into a shop"}</h3></div></div>
    {reason === "pending" && <p role="status" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm">Your shop payment is awaiting review. Check Plan & billing or contact support before making another payment.</p>}
    <p className="mt-4 text-sm leading-6 text-muted-foreground">Products, variants, inventory, orders, customers and payment settings in one workspace. Your existing website stays in place.</p>
    {!compact && <div className="mt-5 grid gap-3 sm:grid-cols-2">{["Product catalogue & variations", "Stock and order management", "Coupons and collections", "Customer and sales overview"].map(text => <p key={text} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-primary" />{text}</p>)}</div>}
    {offer.isLoading ? <p className="mt-5 text-sm text-muted-foreground">Loading upgrade options…</p> : offer.isError ? <p role="alert" className="mt-5 text-sm text-destructive">Could not load shop plans. Refresh before paying.</p> : offer.data?.enabled ? <div className="mt-6 space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><p className="text-3xl font-semibold">₹{Number(offer.data.price).toLocaleString("en-IN")} <span className="text-xs font-normal text-muted-foreground">{billingLabel(offer.data.billing)}</span></p><p className="text-xs text-muted-foreground">Up to {offer.data.productLimit} products</p></div>{sites.length ? <><label className="block text-xs text-muted-foreground">Choose your website<select aria-label="Website for shop upgrade" value={siteId} onChange={e => setSiteId(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground">{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><CheckoutPolicies accepted={accepted} onChange={setAccepted} /><Button disabled={checkout.busy || (!checkout.retry && (!accepted || reason === "pending"))} onClick={checkout.pay}><ShieldCheck className="mr-2 h-4 w-4" />{checkout.busy ? "Confirming payment…" : checkout.retry ? "Retry confirmation" : "Upgrade with secure payment"}</Button><p className="text-xs leading-5 text-muted-foreground">Access activates after server-verified payment. This purchases one billing period; future renewal is separate unless you explicitly set up a mandate. Shop access follows the existing account-wide add-on policy.</p></> : <Button asChild><Link to="/categories">Create a website first</Link></Button>}</div> : <p className="mt-5 text-sm text-muted-foreground">Shop upgrades are currently unavailable. Contact support for help.</p>}
  </section>;
}
