import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminInvoicesQuery, adminUsersQuery } from "@/lib/queries";
import { adminCreateInvoice } from "@/lib/admin.functions";

export function InvoicesAdmin() {
  const qc = useQueryClient();
  const { data: invoices } = useSuspenseQuery(adminInvoicesQuery);
  const { data: users } = useSuspenseQuery(adminUsersQuery);
  const createFn = useServerFn(adminCreateInvoice);

  const [draft, setDraft] = useState({
    userId: "",
    planName: "",
    amount: "0",
    taxPercent: "18",
    months: "12",
    gstin: "",
    notes: "",
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          userId: draft.userId,
          planName: draft.planName || null,
          amount: Number(draft.amount) || 0,
          taxPercent: Number(draft.taxPercent) || 0,
          months: Number(draft.months) || 12,
          gstin: draft.gstin || null,
          notes: draft.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Invoice created");
      qc.invalidateQueries({ queryKey: ["admin_invoices"] });
      setDraft({ ...draft, amount: "0", notes: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const userName = (id: string) => {
    const u = (users as any[]).find((x) => x.id === id);
    return u?.full_name || u?.whatsapp_number || id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-lg font-semibold">Create invoice</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="md:col-span-2">
            <Label>User</Label>
            <select
              value={draft.userId}
              onChange={(e) => setDraft({ ...draft, userId: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select user…</option>
              {(users as any[]).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || "Unnamed"} · {u.whatsapp_number || u.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div><Label>Plan name</Label><Input value={draft.planName} onChange={(e) => setDraft({ ...draft, planName: e.target.value })} placeholder="Business Yearly" /></div>
          <div><Label>Amount (₹)</Label><Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div>
          <div><Label>GST %</Label><Input type="number" value={draft.taxPercent} onChange={(e) => setDraft({ ...draft, taxPercent: e.target.value })} /></div>
          <div><Label>Validity (months)</Label><Input type="number" value={draft.months} onChange={(e) => setDraft({ ...draft, months: e.target.value })} /></div>
          <div><Label>GSTIN</Label><Input value={draft.gstin} onChange={(e) => setDraft({ ...draft, gstin: e.target.value })} placeholder="Optional" /></div>
          <div className="md:col-span-2"><Label>Notes</Label><Textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} /></div>
        </div>
        <Button className="mt-3" disabled={!draft.userId || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Creating…" : "Create invoice"}
        </Button>
      </div>

      {!invoices.length ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No invoices yet.</div>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Invoice</th>
                <th className="p-3">User</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Total</th>
                <th className="p-3">Status</th>
                <th className="p-3">Valid till</th>
              </tr>
            </thead>
            <tbody>
              {(invoices as any[]).map((inv) => (
                <tr key={inv.id} className="border-t border-border/40">
                  <td className="p-3 font-mono">#{inv.invoice_no}</td>
                  <td className="p-3">{userName(inv.user_id)}</td>
                  <td className="p-3">{inv.plan_name || "—"}</td>
                  <td className="p-3">₹{Number(inv.total_inr).toLocaleString("en-IN")}</td>
                  <td className="p-3 capitalize">{inv.status}</td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {inv.period_end ? new Date(inv.period_end).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
