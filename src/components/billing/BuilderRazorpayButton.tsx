import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createBuilderRazorpayOrder, verifyBuilderRazorpayPayment } from "@/lib/builder-razorpay.functions";

type CheckoutResult = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Checkout = { open: () => void; on: (event: string, callback: () => void) => void };
type RazorpayConstructor = new (options: Record<string, unknown>) => Checkout;

export async function loadCheckout(): Promise<RazorpayConstructor> {
  const existing = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (existing) return existing;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(); script.onerror = () => reject(new Error("Could not load Razorpay. Check your connection."));
    document.head.appendChild(script);
  });
  const loaded = (window as unknown as { Razorpay?: RazorpayConstructor }).Razorpay;
  if (!loaded) throw new Error("Razorpay checkout is unavailable.");
  return loaded;
}

export function BuilderRazorpayButton({ sessionId, disabled, onPaid }: { sessionId: string; disabled: boolean; onPaid: () => void }) {
  const create = useServerFn(createBuilderRazorpayOrder);
  const verify = useServerFn(verifyBuilderRazorpayPayment);
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState<CheckoutResult | null>(null);
  const storageKey = `sk_builder_confirmation:${sessionId}`;
  useEffect(() => { try { setRetry(JSON.parse(sessionStorage.getItem(storageKey) || "null")); } catch { setRetry(null); } }, [storageKey]);
  const confirm = async (payment: CheckoutResult) => {
    try {
      await verify({ data: { sessionId, orderId: payment.razorpay_order_id, paymentId: payment.razorpay_payment_id, signature: payment.razorpay_signature } });
      try { sessionStorage.removeItem(storageKey); } catch {}
      setRetry(null); onPaid();
    } catch (error) { toast.error(`${error instanceof Error ? error.message : "Payment could not be verified."} Use Retry confirmation before paying again.`); }
    finally { setBusy(false); }
  };
  const pay = async () => {
    setBusy(true);
    if (retry) { await confirm(retry); return; }
    try {
      const Constructor = await loadCheckout();
      const order = await create({ data: { sessionId } });
      const checkout = new Constructor({ key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId, name: "SK Tech Lab", description: "Website Plan", modal: { ondismiss: () => setBusy(false) },
        handler: async (payment: CheckoutResult) => {
          try { sessionStorage.setItem(storageKey, JSON.stringify(payment)); } catch {}
          setRetry(payment); await confirm(payment);
        },
      });
      checkout.on("payment.failed", () => { setBusy(false); toast.error("Payment was not completed. Check your orders before retrying."); });
      checkout.open();
    } catch (error) { setBusy(false); toast.error(error instanceof Error ? error.message : "Could not start checkout."); }
  };
  return <Button className="mt-6 w-full" size="lg" disabled={disabled || busy} onClick={pay}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}{retry ? "Retry confirmation" : "Pay with Razorpay"}</Button>;
}