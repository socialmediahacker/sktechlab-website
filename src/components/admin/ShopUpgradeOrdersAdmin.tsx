import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminShopUpgradeOrders, adminActivatePaidShopOrder } from "@/lib/shop-upgrade.functions";
import { Button } from "@/components/ui/button";
import { billingLabel } from "@/lib/billing-labels";
import { toast } from "sonner";
export function ShopUpgradeOrdersAdmin() {
  const qc = useQueryClient(), load = useServerFn(adminShopUpgradeOrders), activate = useServerFn(adminActivatePaidShopOrder);
  const query = useQuery({ queryKey: ["admin_shop_upgrade_orders"], queryFn: () => load() });
  const fix = useMutation({ mutationFn: (id: string) => activate({ data: { id } }), onSuccess: () => { toast.success("Paid shop access activated"); qc.invalidateQueries({ queryKey: ["admin_shop_upgrade_orders"] }); qc.invalidateQueries({ queryKey: ["admin_shop_addons"] }); }, onError: (e: Error) => toast.error(e.message) });
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between"><h3 className="font-semibold">Shop upgrade payments & activation</h3><Button size="sm" variant="outline" onClick={() => query.refetch()}>Refresh</Button></div>{query.isLoading ? <p className="text-sm text-muted-foreground">Loading upgrades…</p> : query.isError ? <p role="alert" className="text-sm text-destructive">Upgrade orders are unavailable. Check migration and try again.</p> : !query.data?.length ? <p className="text-sm text-muted-foreground">Direct shop upgrade payments will appear here.</p> : (query.data || []).map((order: any) => <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"><div><p className="text-sm font-semibold">₹{Number(order.price_inr).toLocaleString("en-IN")} · {billingLabel(order.billing)}</p><p className="mt-1 break-all text-xs text-muted-foreground">{order.user_id} · {order.status}{order.expires_at ? ` · Until ${new Date(order.expires_at).toLocaleDateString("en-IN")}` : ""}</p></div>{order.status === "paid" && <Button size="sm" disabled={fix.isPending} onClick={() => fix.mutate(order.id)}>Activate verified purchase</Button>}</div>)}</section>;
}
