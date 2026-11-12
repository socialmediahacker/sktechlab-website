import { useEffect, useState } from "react";
import { toast } from "sonner";
import { loadCheckout } from "./BuilderRazorpayButton";
export function usePlatformCheckout(scope: string, create: () => Promise<any>, verify: (proof: any) => Promise<any>, onSuccess: () => void) {
  const [busy, setBusy] = useState(false), [retry, setRetry] = useState<any>(null);
  const key = `sk_checkout_confirmation:${scope}`;
  useEffect(() => { try { setRetry(JSON.parse(sessionStorage.getItem(key) || "null")); } catch { setRetry(null); } }, [key]);
  const confirm = async (saved: any) => {
    try { await verify(saved); try { sessionStorage.removeItem(key); } catch {} setRetry(null); toast.success("Payment verified"); onSuccess(); }
    catch (e) { toast.error(`${(e as Error).message} Your payment confirmation is saved in this browser; use Retry confirmation.`); }
    finally { setBusy(false); }
  };
  const pay = async () => {
    setBusy(true);
    if (retry) { await confirm(retry); return; }
    try {
      const checkout = await create(), Razorpay = await loadCheckout();
      const instance = new Razorpay({ key: checkout.keyId, order_id: checkout.orderId, amount: checkout.amount, currency: checkout.currency, name: "SK Tech Lab", description: "Website services", modal: { ondismiss: () => setBusy(false) }, handler: async (p: any) => {
        const proof = { id: checkout.id, orderId: p.razorpay_order_id, paymentId: p.razorpay_payment_id, signature: p.razorpay_signature };
        try { sessionStorage.setItem(key, JSON.stringify(proof)); } catch { /* verified server records remain authoritative */ }
        setRetry(proof); await confirm(proof);
      } });
      instance.on("payment.failed", () => { setBusy(false); toast.error("Payment was not completed. Check your orders before retrying."); });
      instance.open();
    } catch (e) { setBusy(false); toast.error((e as Error).message); }
  };
  return { busy, pay, retry: !!retry };
}
