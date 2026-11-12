import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media-upload";
import { Copy, QrCode, Wallet, CreditCard, Banknote, Loader2 } from "lucide-react";
import {
  getBillingConfig,
  listPayablePlans,
  submitMyPayment,
  myPaymentSubmissions,
  startAutoPay,
} from "@/lib/billing.functions";

type GatewayKey = "manual_upi" | "crypto" | "razorpay" | "bank_transfer" | "other";

const copy = (v: string) => {
  navigator.clipboard?.writeText(v);
  toast.success("Copied");
};

export function PayGateways() {
  const qc = useQueryClient();
  const cfgFn = useServerFn(getBillingConfig);
  const plansFn = useServerFn(listPayablePlans);
  const subsFn = useServerFn(myPaymentSubmissions);
  const submitFn = useServerFn(submitMyPayment);
  const trialFn = useServerFn(startAutoPay);

  const { data: cfg } = useQuery({ queryKey: ["billing-config"], queryFn: () => cfgFn({}) });
  const { data: plans } = useQuery({ queryKey: ["payable-plans"], queryFn: () => plansFn({}) });
  const { data: mySubs } = useQuery({ queryKey: ["my-payments"], queryFn: () => subsFn({}) });

  const [gateway, setGateway] = useState<GatewayKey>("manual_upi");
  const [planId, setPlanId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedPlan = useMemo(
    () => (plans as any[] | undefined)?.find((p) => p.id === planId),
    [plans, planId],
  );

  const options: { key: GatewayKey; label: string; desc: string; Icon: any; on: boolean }[] = [
    { key: "manual_upi", label: "UPI / QR", desc: cfg?.manualUpi?.id ? String(cfg.manualUpi.id) : "Pay to our UPI ID", Icon: QrCode, on: Boolean(cfg?.manualUpi?.enabled) },
    { key: "razorpay", label: "Razorpay", desc: "Card / UPI / Netbanking", Icon: CreditCard, on: Boolean(cfg?.razorpayEnabled) },
    { key: "crypto", label: "Crypto", desc: cfg?.crypto?.network ? String(cfg.crypto.network) : "USDT / other", Icon: Wallet, on: Boolean(cfg?.crypto?.enabled) },
    { key: "bank_transfer", label: "Bank transfer", desc: "NEFT / IMPS — share UTR", Icon: Banknote, on: Boolean(cfg?.bank?.enabled) },
  ];
  const visible = options.filter((o) => o.on);

  const pay = async () => {
    const amt = Number(amount || selectedPlan?.price_inr || 0);
    if (!amt) return toast.error("Enter the amount you paid");
    setBusy(true);
    try {
      await submitFn({
        data: {
          planId: planId || undefined,
          gateway,
          amount: amt,
          reference: reference || undefined,
          note: note || undefined,
          screenshotUrl: proof || undefined,
        },
      });
      toast.success("Payment submitted — our team will confirm shortly");
      setReference(""); setNote(""); setProof(""); setAmount("");
      qc.invalidateQueries({ queryKey: ["my-payments"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit payment");
    } finally {
      setBusy(false);
    }
  };

  const startTrial = async () => {
    if (!planId) return toast.error("Select a plan first");
    setBusy(true);
    try {
      const r: any = await trialFn({ data: { planId, interval: "monthly" } });
      toast.success(r?.message ?? "Free trial started");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start trial");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pay &amp; upgrade</h2>
        {cfg?.trialDays ? (
          <span className="rounded-full bg-brand-glow/15 px-3 py-1 text-xs font-semibold text-brand-glow">
            {cfg.trialDays}-day free trial
          </span>
        ) : null}
      </div>

      <div className="glass rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Plan</Label>
            <select
              value={planId}
              onChange={(e) => { setPlanId(e.target.value); setAmount(""); }}
              className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
            >
              <option value="">Select a plan…</option>
              {(plans as any[] | undefined)?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ₹{Number(p.price_inr).toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs">Amount (₹)</Label>
            <Input
              className="mt-1"
              inputMode="decimal"
              value={amount || (selectedPlan ? String(selectedPlan.price_inr) : "")}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map(({ key, label, desc, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setGateway(key)}
              className={`rounded-xl border p-4 text-left transition ${
                gateway === key ? "border-brand-glow bg-brand-glow/10" : "border-border/60 hover:border-border"
              }`}
            >
              <Icon className="mb-2 h-5 w-5 text-brand-glow" />
              <div className="text-sm font-semibold">{label}</div>
              <div className="truncate text-xs text-muted-foreground">{desc}</div>
            </button>
          ))}
        </div>

        {gateway === "manual_upi" && (
          <div className="mt-5 grid gap-4 rounded-xl border border-border/60 p-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2 text-sm">
              <div className="font-semibold">Pay to our UPI</div>
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted/50 px-2 py-1">{cfg?.manualUpi?.id ?? "—"}</code>
                {cfg?.manualUpi?.id && (
                  <Button size="sm" variant="ghost" onClick={() => copy(String(cfg.manualUpi.id))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {cfg?.manualUpi?.name && <div className="text-muted-foreground">Name: {cfg.manualUpi.name}</div>}
              <div className="text-xs text-muted-foreground">After paying, enter the UPI reference / UTR below and upload the screenshot.</div>
            </div>
            {cfg?.manualUpi?.qr && (
              <img src={String(cfg.manualUpi.qr)} alt="UPI QR code for payment" className="h-32 w-32 rounded-lg object-cover" loading="lazy" />
            )}
          </div>
        )}

        {gateway === "crypto" && (
          <div className="mt-5 grid gap-4 rounded-xl border border-border/60 p-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2 text-sm">
              <div className="font-semibold">Crypto payment</div>
              <div className="flex items-center gap-2">
                <code className="break-all rounded bg-muted/50 px-2 py-1 text-xs">{cfg?.crypto?.address ?? "—"}</code>
                {cfg?.crypto?.address && (
                  <Button size="sm" variant="ghost" onClick={() => copy(String(cfg.crypto.address))}>
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {cfg?.crypto?.network && <div className="text-muted-foreground">Network: {cfg.crypto.network}</div>}
              {cfg?.crypto?.note && <div className="text-xs text-muted-foreground">{cfg.crypto.note}</div>}
            </div>
            {cfg?.crypto?.qr && (
              <img src={String(cfg.crypto.qr)} alt="Crypto wallet QR code" className="h-32 w-32 rounded-lg object-cover" loading="lazy" />
            )}
          </div>
        )}

        {gateway === "razorpay" && (
          <div className="mt-5 rounded-xl border border-border/60 p-4 text-sm">
            {cfg?.razorpayReady ? (
              <>
                <div className="font-semibold">Razorpay auto-pay</div>
                <p className="mt-1 text-muted-foreground">
                  Start your {cfg?.trialDays ?? 5}-day free trial — auto-debit begins after the trial.
                </p>
                <Button className="mt-3" onClick={startTrial} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Start free trial &amp; auto-pay
                </Button>
              </>
            ) : (
              <>
                <div className="font-semibold">Razorpay link</div>
                <p className="mt-1 text-muted-foreground">
                  Online auto-pay is being activated. Request a payment link — our team sends it on WhatsApp — or pay by UPI/crypto meanwhile.
                </p>
                <Button className="mt-3" variant="outline" onClick={startTrial} disabled={busy}>
                  {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Request payment link
                </Button>
              </>
            )}
          </div>
        )}

        {gateway === "bank_transfer" && (
          <div className="mt-5 rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
            Transfer via NEFT / IMPS and submit the UTR number below. Our team will confirm and activate your plan.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Transaction / UTR reference</Label>
            <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 4839201938" />
          </div>
          <div>
            <Label className="text-xs">Payment screenshot</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Upload or paste link" />
              <MediaUploadButton label="Upload" onUploaded={(u) => setProof(u[0] ?? "")} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <Label className="text-xs">Note (optional)</Label>
          <Textarea className="mt-1" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything our team should know" />
        </div>

        <Button className="mt-4" onClick={pay} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Submit payment
        </Button>
      </div>

      {Array.isArray(mySubs) && mySubs.length > 0 && (
        <div className="glass mt-4 overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Date</th><th className="p-3">Method</th><th className="p-3">Amount</th>
                <th className="p-3">Reference</th><th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(mySubs as any[]).map((s) => (
                <tr key={s.id} className="border-t border-border/60">
                  <td className="p-3 text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td className="p-3 capitalize">{String(s.gateway_kind).replace("_", " ")}</td>
                  <td className="p-3">₹{Number(s.amount).toLocaleString("en-IN")}</td>
                  <td className="p-3 font-mono text-xs">{s.txn_reference || "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      s.status === "approved" ? "bg-emerald-500/20 text-emerald-300"
                      : s.status === "rejected" ? "bg-red-500/20 text-red-300"
                      : "bg-amber-500/20 text-amber-300"}`}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
