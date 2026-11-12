import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, Copy, Timer } from "lucide-react";
import { createUpiIntent, getUpiIntentStatus, submitUpiUtr } from "@/lib/upi-gateway.functions";

type Intent = Awaited<ReturnType<typeof createUpiIntent>>;

export function UpiPayBox({
  amount,
  referenceId,
  purpose = "builder",
  note,
  onPaid,
}: {
  amount: number;
  referenceId?: string;
  purpose?: "builder" | "plan" | "store_order" | "custom";
  note?: string;
  onPaid?: (txnId: string | null) => void;
}) {
  const [intent, setIntent] = useState<Intent | null>(null);
  const [status, setStatus] = useState<string>("pending");
  const [utr, setUtr] = useState("");
  const [busy, setBusy] = useState(false);
  const [left, setLeft] = useState(0);
  const paidOnce = useRef(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const i = await createUpiIntent({ data: { amount, referenceId, purpose, note } });
        if (!alive) return;
        setIntent(i);
        setStatus(i.status);
      } catch (e: any) {
        toast.error(e?.message ?? "Could not start UPI payment");
      }
    })();
    return () => { alive = false; };
  }, [amount, referenceId, purpose, note]);

  // poll for auto verification
  useEffect(() => {
    if (!intent || status === "paid") return;
    const ms = Math.max(2, intent.pollSeconds) * 1000;
    const t = setInterval(async () => {
      try {
        const r = await getUpiIntentStatus({ data: { intentId: intent.id } });
        setStatus(r.status);
        if (r.status === "paid" && !paidOnce.current) {
          paidOnce.current = true;
          toast.success("Payment verified");
          onPaid?.(r.txnId);
        }
      } catch { /* keep polling */ }
    }, ms);
    return () => clearInterval(t);
  }, [intent, status, onPaid]);

  // countdown
  useEffect(() => {
    if (!intent) return;
    const t = setInterval(() => {
      setLeft(Math.max(0, Math.floor((new Date(intent.expiresAt).getTime() - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(t);
  }, [intent]);

  if (!intent) {
    return <div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  if (status === "paid") {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
        <div className="mt-2 font-semibold">Payment verified</div>
        <p className="text-sm text-muted-foreground">₹{intent.payableAmount.toFixed(2)} received.</p>
      </div>
    );
  }

  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success("Copied"); };
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Pay exactly</div>
        <div className="text-3xl font-bold">₹{intent.payableAmount.toFixed(2)}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Exact amount hi bhejiye — isi se payment auto verify hoti hai.
        </p>
      </div>

      <div className="mt-4 grid place-items-center">
        <img src={intent.qrUrl} alt="UPI QR code" className="h-56 w-56 rounded-xl border border-border bg-white p-2" />
        <a href={intent.upiLink} className="mt-3">
          <Button size="sm">Pay in UPI app</Button>
        </a>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
        <span className="truncate">{intent.upiId}</span>
        <Button variant="ghost" size="sm" onClick={() => copy(intent.upiId)}><Copy className="h-3.5 w-3.5" /></Button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
        <span>Payment note</span>
        <button className="font-mono" onClick={() => copy(intent.note)}>{intent.note}</button>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Timer className="h-4 w-4" />
        {left > 0
          ? <>Verifying automatically · expires in {mm}:{ss}</>
          : <>Timer over — agar aapne pay kar diya hai to hum abhi bhi check kar rahe hain</>}
      </div>

      {intent.instructions && <p className="mt-3 text-center text-xs text-muted-foreground">{intent.instructions}</p>}

      {intent.manualUtrEnabled && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-sm font-medium">Paid already? Enter UTR / transaction ID</div>
          <div className="mt-2 flex gap-2">
            <Input value={utr} onChange={(e) => setUtr(e.target.value)} placeholder="e.g. 512345678901" />
            <Button
              variant="outline"
              disabled={busy || utr.trim().length < 4}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await submitUpiUtr({ data: { intentId: intent.id, utr: utr.trim() } });
                  setStatus(r.status);
                  if (r.status === "paid") { paidOnce.current = true; onPaid?.(utr.trim()); }
                  else toast.success("UTR mil gaya — verify hote hi confirm ho jayega.");
                } catch (e: any) {
                  toast.error(e?.message ?? "Could not submit UTR");
                } finally { setBusy(false); }
              }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </Button>
          </div>
          {status === "utr_submitted" && (
            <p className="mt-2 text-xs text-muted-foreground">UTR received — auto verification chal rahi hai.</p>
          )}
        </div>
      )}
    </div>
  );
}
