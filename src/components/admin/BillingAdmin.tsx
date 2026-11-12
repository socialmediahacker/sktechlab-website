import { PaymentReadiness } from "./PaymentReadiness";
import { ShopUpgradeOrdersAdmin } from "./ShopUpgradeOrdersAdmin";
import { useState } from "react";
import { BuilderPaymentReviews } from "./BuilderPaymentReviews";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media-upload";
import { supabase } from "@/integrations/supabase/client";
import { adminSiteSettingsQuery, adminUsersQuery } from "@/lib/queries";
import {
  getBillingConfig, adminListSubscriptions, adminUpdateSubscription, adminRecordManualPayment,
  adminListShopAddons, adminSetShopAddon,
} from "@/lib/billing.functions";
import { AlertTriangle, CheckCircle2, IndianRupee, Repeat, Save, ShoppingBag, Wallet } from "lucide-react";

const STATUSES = ["pending_mandate", "trialing", "active", "paused", "cancelled", "failed"] as const;

export function BillingAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useQuery(adminSiteSettingsQuery);
  const [s, setS] = useState<any>(null);
  const st = s ?? settings ?? {};

  const cfg = useQuery({ queryKey: ["billing_config"], queryFn: () => getBillingConfig() });
  const listSubs = useServerFn(adminListSubscriptions);
  const subs = useQuery({ queryKey: ["admin_subscriptions"], queryFn: () => listSubs() });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").update({
        trial_days: Number(st.trial_days ?? 5),
        ecom_addon_enabled: st.ecom_addon_enabled !== false,
        ecom_addon_price_inr: Number(st.ecom_addon_price_inr ?? 999),
        ecom_addon_billing: st.ecom_addon_billing || "monthly",
        ecom_addon_label: st.ecom_addon_label || "Online Shop (+Shop)",
        ecom_addon_desc: st.ecom_addon_desc || null,
        ecom_addon_product_limit: Number(st.ecom_addon_product_limit ?? 200),

        autopay_enabled: !!st.autopay_enabled,
        autopay_provider: st.autopay_provider || "razorpay",
        razorpay_enabled: !!st.razorpay_enabled,
        razorpay_key_id: st.razorpay_key_id || null,
        manual_upi_enabled: !!st.manual_upi_enabled,
        manual_upi_id: st.manual_upi_id || null,
        manual_upi_name: st.manual_upi_name || null,
        manual_qr_url: st.manual_qr_url || null,
        crypto_enabled: !!st.crypto_enabled,
        crypto_wallet_address: st.crypto_wallet_address || null,
        crypto_network: st.crypto_network || null,
        crypto_qr_url: st.crypto_qr_url || null,
        crypto_payment_note: st.crypto_payment_note || null,
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment settings saved");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["admin_site_settings"] });
      qc.invalidateQueries({ queryKey: ["billing_config"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PaymentReadiness />
      <BuilderPaymentReviews />
      <GatewayStatus ready={!!cfg.data?.razorpayReady} requested={!!cfg.data?.autopayRequested} />

      {/* Auto-pay */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 flex items-center gap-2 font-semibold"><Repeat className="h-4 w-4 text-brand-glow" /> Auto-pay (recurring UPI / card)</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          A recurring payment needs a customer-authorised mandate and a verified subscription. Adding API keys or enabling this preference alone does not authorise any debit. Shop and domain checkouts purchase one period only.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Free trial days</Label>
            <Input type="number" min={0} max={90} value={st.trial_days ?? 5} onChange={(e) => setS({ ...st, trial_days: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Auto-pay provider</Label>
            <select
              value={st.autopay_provider || "razorpay"}
              onChange={(e) => setS({ ...st, autopay_provider: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="razorpay">Razorpay UPI AutoPay</option>
              <option value="manual">Manual reminder (no gateway)</option>
            </select>
          </div>
          <div>
            <Label>Razorpay key ID (public)</Label>
            <Input value={st.razorpay_key_id || ""} onChange={(e) => setS({ ...st, razorpay_key_id: e.target.value })} placeholder="rzp_live_..." />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!st.autopay_enabled} onCheckedChange={(v) => setS({ ...st, autopay_enabled: v })} /> Offer recurring payment setup</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!st.razorpay_enabled} onCheckedChange={(v) => setS({ ...st, razorpay_enabled: v })} /> Show Razorpay at checkout</label>
        </div>
      </div>

      <ShopUpgradeOrdersAdmin />
      <ShopAddonCard st={st} setS={setS} />


      {/* Manual UPI */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><IndianRupee className="h-4 w-4 text-brand-glow" /> Manual UPI</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>UPI ID</Label><Input value={st.manual_upi_id || ""} onChange={(e) => setS({ ...st, manual_upi_id: e.target.value })} placeholder="sktechlab@upi" /></div>
          <div><Label>Payee name</Label><Input value={st.manual_upi_name || ""} onChange={(e) => setS({ ...st, manual_upi_name: e.target.value })} placeholder="SKTECHLAB" /></div>
          <div>
            <div className="flex items-center justify-between"><Label>UPI QR</Label>
              <MediaUploadButton label="Upload" onUploaded={(u) => u[0] && setS({ ...st, manual_qr_url: u[0] })} />
            </div>
            <Input value={st.manual_qr_url || ""} onChange={(e) => setS({ ...st, manual_qr_url: e.target.value })} placeholder="https://..." />
            {st.manual_qr_url ? <img src={st.manual_qr_url} alt="UPI QR" className="mt-2 h-24 w-24 rounded-lg border border-border/60 object-cover" /> : null}
          </div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={st.manual_upi_enabled ?? true} onCheckedChange={(v) => setS({ ...st, manual_upi_enabled: v })} /> Accept manual UPI payments</label>
      </div>

      {/* Crypto */}
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4 text-brand-glow" /> Crypto payments (manual)</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div><Label>Wallet address</Label><Input value={st.crypto_wallet_address || ""} onChange={(e) => setS({ ...st, crypto_wallet_address: e.target.value })} placeholder="0x... / TRC20 address" /></div>
          <div><Label>Network / coin</Label><Input value={st.crypto_network || ""} onChange={(e) => setS({ ...st, crypto_network: e.target.value })} placeholder="USDT — TRC20" /></div>
          <div>
            <div className="flex items-center justify-between"><Label>Wallet QR</Label>
              <MediaUploadButton label="Upload" onUploaded={(u) => u[0] && setS({ ...st, crypto_qr_url: u[0] })} />
            </div>
            <Input value={st.crypto_qr_url || ""} onChange={(e) => setS({ ...st, crypto_qr_url: e.target.value })} placeholder="https://..." />
            {st.crypto_qr_url ? <img src={st.crypto_qr_url} alt="Crypto QR" className="mt-2 h-24 w-24 rounded-lg border border-border/60 object-cover" /> : null}
          </div>
          <div className="md:col-span-3"><Label>Instructions shown to customer</Label><Textarea value={st.crypto_payment_note || ""} onChange={(e) => setS({ ...st, crypto_payment_note: e.target.value })} placeholder="Send exact amount and share the TXID on WhatsApp." /></div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={!!st.crypto_enabled} onCheckedChange={(v) => setS({ ...st, crypto_enabled: v })} /> Accept crypto payments</label>
      </div>

      <Button className="bg-gradient-brand text-brand-foreground" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="mr-2 h-4 w-4" /> Save payment settings
      </Button>

      <ManualPaymentRecorder />

      {/* Subscriptions */}
      <div className="glass overflow-hidden rounded-2xl">
        <h3 className="border-b border-border/60 p-5 font-semibold">Subscriptions & auto-debit</h3>
        {subs.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading…</p>
        ) : !subs.data?.length ? (
          <p className="p-5 text-sm text-muted-foreground">Abhi koi subscription nahi. User plan lega to yahan trial + next charge date dikhega.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Amount</th><th className="p-3">Trial ends</th><th className="p-3">Next charge</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {subs.data.map((row: any) => <SubRow key={row.id} row={row} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function GatewayStatus({ ready, requested }: { ready: boolean; requested: boolean }) {
  return (
    <div className={`glass flex flex-wrap items-center gap-3 rounded-2xl p-4 text-sm ${ready ? "" : "border border-amber-400/40"}`}>
      {ready ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-amber-400" />}
      {ready ? (
        <span>Razorpay keys configured. Recurring payment setup {requested ? "requested" : "disabled"}; debit requires a customer-authorised mandate.</span>
      ) : (
        <span>
          Razorpay keys abhi add nahi hui hain. Settings save ho rahi hain aur trials chal rahe hain — online checkout ke liye
          <b> RAZORPAY_KEY_ID</b> aur <b>RAZORPAY_KEY_SECRET</b> server par add karein. Keys alone do not create mandates.
        </span>
      )}
    </div>
  );
}

function SubRow({ row }: { row: any }) {
  const qc = useQueryClient();
  const update = useServerFn(adminUpdateSubscription);
  const m = useMutation({
    mutationFn: (patch: any) => update({ data: { id: row.id, ...patch } }),
    onSuccess: () => { toast.success("Subscription updated"); qc.invalidateQueries({ queryKey: ["admin_subscriptions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const fmt = (v: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
  return (
    <tr className="border-t border-border/50">
      <td className="p-3">
        <div className="font-medium">{row.profile?.full_name || "User"}</div>
        <div className="text-xs text-muted-foreground">{row.profile?.whatsapp_number || row.user_id.slice(0, 8)}</div>
      </td>
      <td className="p-3">{row.plan_name || "—"}</td>
      <td className="p-3">₹{Number(row.amount_inr).toLocaleString()}/{row.interval}</td>
      <td className="p-3">{fmt(row.trial_ends_at)}</td>
      <td className="p-3">{fmt(row.next_charge_at)}</td>
      <td className="p-3">
        <select
          value={row.status}
          onChange={(e) => m.mutate({ status: e.target.value })}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
        >
          {STATUSES.map((x) => <option key={x} value={x}>{x.replace("_", " ")}</option>)}
        </select>
      </td>
    </tr>
  );
}

function ManualPaymentRecorder() {
  const qc = useQueryClient();
  const { data: users } = useQuery(adminUsersQuery);
  const record = useServerFn(adminRecordManualPayment);
  const [f, setF] = useState<any>({ userId: "", planSlug: "", amount: 0, method: "manual_upi", reference: "", months: 1, note: "", screenshotUrl: "" });

  const m = useMutation({
    mutationFn: () => record({
      data: {
        userId: f.userId,
        planSlug: f.planSlug || undefined,
        amount: Number(f.amount),
        method: f.method,
        reference: f.reference || undefined,
        months: Number(f.months) || 1,
        note: f.note || undefined,
        screenshotUrl: f.screenshotUrl || undefined,
      },
    }),
    onSuccess: () => {
      toast.success("Payment recorded, plan activated & invoice created");
      qc.invalidateQueries({ queryKey: ["admin_subscriptions"] });
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      setF({ ...f, amount: 0, reference: "", note: "", screenshotUrl: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-1 font-semibold">Take payment manually</h3>
      <p className="mb-4 text-xs text-muted-foreground">UPI / crypto / cash se paisa mila? Yahan record karein — invoice ban jayega aur plan turant activate ho jayega.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <Label>Customer</Label>
          <select value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">Select user…</option>
            {(users ?? []).map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.whatsapp_number || u.id.slice(0, 8)}</option>)}
          </select>
        </div>
        <div><Label>Plan slug</Label><Input value={f.planSlug} onChange={(e) => setF({ ...f, planSlug: e.target.value })} placeholder="business" /></div>
        <div><Label>Amount (₹)</Label><Input type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></div>
        <div>
          <Label>Method</Label>
          <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="manual_upi">Manual UPI</option>
            <option value="crypto">Crypto</option>
            <option value="cash">Cash</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="razorpay">Razorpay</option>
          </select>
        </div>
        <div><Label>Reference / TXID</Label><Input value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} /></div>
        <div><Label>Months</Label><Input type="number" min={1} max={36} value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Note</Label><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></div>
        <div>
          <div className="flex items-center justify-between"><Label>Payment proof</Label>
            <MediaUploadButton label="Upload" onUploaded={(u) => u[0] && setF({ ...f, screenshotUrl: u[0] })} />
          </div>
          <Input value={f.screenshotUrl} onChange={(e) => setF({ ...f, screenshotUrl: e.target.value })} placeholder="https://..." />
        </div>
      </div>
      <Button className="mt-4 bg-gradient-brand text-brand-foreground" disabled={!f.userId || m.isPending} onClick={() => m.mutate()}>
        Record payment & activate
      </Button>
    </div>
  );
}

/** Master-admin control for the optional "+Shop" e-commerce add-on. */
function ShopAddonCard({ st, setS }: { st: any; setS: (v: any) => void }) {
  const qc = useQueryClient();
  const list = useServerFn(adminListShopAddons);
  const setAddon = useServerFn(adminSetShopAddon);
  const reqs = useQuery({ queryKey: ["shop_addons"], queryFn: () => list() });

  const toggle = useMutation({
    mutationFn: (v: { userId: string; active: boolean }) => setAddon({ data: v }),
    onSuccess: () => {
      toast.success("Shop add-on updated");
      qc.invalidateQueries({ queryKey: ["shop_addons"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-5">
      <h3 className="mb-1 flex items-center gap-2 font-semibold">
        <ShoppingBag className="h-4 w-4 text-brand-glow" /> “+Shop” e-commerce add-on
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Website banate waqt domain choose karne ke baad customer ko “+Shop” ka option milta hai. Price yahin se set hoti hai.
      </p>

      <div className="grid gap-3 md:grid-cols-4">
        <div><Label>Add-on price (₹)</Label><Input type="number" min={0} value={st.ecom_addon_price_inr ?? 999} onChange={(e) => setS({ ...st, ecom_addon_price_inr: Number(e.target.value) })} /></div>
        <div>
          <Label>Billing</Label>
          <select
            value={st.ecom_addon_billing || "monthly"}
            onChange={(e) => setS({ ...st, ecom_addon_billing: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="monthly">Per month</option>
            <option value="yearly">Per year</option>
            <option value="one_time">One time</option>
          </select>
        </div>
        <div><Label>Label</Label><Input value={st.ecom_addon_label ?? "Online Shop (+Shop)"} onChange={(e) => setS({ ...st, ecom_addon_label: e.target.value })} /></div>
        <div><Label>Product limit</Label><Input type="number" min={0} value={st.ecom_addon_product_limit ?? 200} onChange={(e) => setS({ ...st, ecom_addon_product_limit: Number(e.target.value) })} /></div>
      </div>
      <div className="mt-3">
        <Label>Short description</Label>
        <Textarea
          rows={2}
          value={st.ecom_addon_desc ?? ""}
          onChange={(e) => setS({ ...st, ecom_addon_desc: e.target.value })}
          placeholder="Cart, checkout, orders, coupons, payments aur shipping — sab dashboard se."
        />
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <Switch checked={st.ecom_addon_enabled !== false} onCheckedChange={(v) => setS({ ...st, ecom_addon_enabled: v })} /> Offer this add-on in the builder
      </label>

      <div className="mt-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Add-on requests</div>
        {(reqs.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Abhi koi request nahi.</p>
        ) : (
          <div className="space-y-2">
            {(reqs.data ?? []).map((p: any) => (
              <article key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
                <div>
                  <div className="text-sm font-medium">{p.full_name || p.whatsapp_number || p.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.whatsapp_number ?? "—"} · plan: {p.active_plan ?? "—"} · status: {p.ecom_addon_status}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={p.ecom_addon ? "outline" : "default"}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ userId: p.id, active: !p.ecom_addon })}
                >
                  {p.ecom_addon ? "Revoke shop" : "Activate shop"}
                </Button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
