import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listBuilderPaymentReviews, reviewBuilderPayment } from "@/lib/builder-payment-review.functions";

export function BuilderPaymentReviews() {
  const qc = useQueryClient();
  const list = useServerFn(listBuilderPaymentReviews);
  const review = useServerFn(reviewBuilderPayment);
  const payments = useQuery({ queryKey: ["builder_payment_reviews"], queryFn: () => list() });
  const mutation = useMutation({ mutationFn: (data: { sessionId: string; approve: boolean }) => review({ data }), onSuccess: () => { toast.success("Payment reviewed"); qc.invalidateQueries({ queryKey: ["builder_payment_reviews"] }); }, onError: (error: Error) => toast.error(error.message) });
  return <section className="space-y-3">
    <h3 className="text-lg font-semibold">Website payment reviews</h3>
    {payments.isError ? <Button variant="outline" onClick={() => payments.refetch()}>Retry</Button> : payments.isPending ? <p className="text-sm text-muted-foreground">Loading payments…</p> : !payments.data?.length ? <p className="text-sm text-muted-foreground">No payments awaiting review.</p> : payments.data.map(payment => <div key={payment.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
      <div className="min-w-0 flex-1"><p className="break-words font-medium">{payment.business_name} · ₹{payment.payment_amount_inr}</p><p className="break-all text-sm text-muted-foreground">{payment.payment_method} · {payment.payment_ref || "No reference"}</p></div>
      {payment.payment_proof_url && /^https:\/\//i.test(payment.payment_proof_url) && <Button asChild variant="outline" size="sm"><a href={payment.payment_proof_url} target="_blank" rel="noopener noreferrer">Proof</a></Button>}
      <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate({ sessionId: payment.id, approve: true })}>Approve</Button>
      <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate({ sessionId: payment.id, approve: false })}>Reject</Button>
    </div>)}
  </section>;
}