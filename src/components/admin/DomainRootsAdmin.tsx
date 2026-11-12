import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { domainRootsQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Server } from "lucide-react";

type Root = {
  id: string;
  root: string;
  nameservers: string[] | null;
  a_record: string | null;
  note: string | null;
  is_active: boolean;
  sort_order: number;
};

export function DomainRootsAdmin() {
  const qc = useQueryClient();
  const { data: roots } = useQuery(domainRootsQuery);
  const [form, setForm] = useState({ root: "", nameservers: "", a_record: "185.158.133.1", note: "" });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["domain_roots"] });

  const add = useMutation({
    mutationFn: async () => {
      const root = form.root.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      if (!root.includes(".")) throw new Error("Enter a valid root domain, e.g. sktechlab.site");
      const ns = form.nameservers.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase.from("domain_roots").insert({
        root,
        nameservers: ns,
        a_record: form.a_record.trim() || null,
        note: form.note.trim() || null,
        sort_order: (roots?.length ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Free domain root added");
      setForm({ root: "", nameservers: "", a_record: "185.158.133.1", note: "" });
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { is_active?: boolean; sort_order?: number; a_record?: string | null } }) => {
      const { error } = await supabase.from("domain_roots").update(patch).eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("domain_roots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-brand-foreground shadow-glow">
          <Server className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-bold">Free domain roots</h3>
          <p className="text-xs text-muted-foreground">Users pick their free subdomain from these roots — connection is automatic.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Root domain</Label>
          <Input value={form.root} onChange={(e) => setForm({ ...form, root: e.target.value })} placeholder="sktechlab.site" />
        </div>
        <div>
          <Label className="text-xs">Name servers (comma separated)</Label>
          <Input value={form.nameservers} onChange={(e) => setForm({ ...form, nameservers: e.target.value })} placeholder="ns1.host.com, ns2.host.com" />
        </div>
        <div>
          <Label className="text-xs">A record IP</Label>
          <Input value={form.a_record} onChange={(e) => setForm({ ...form, a_record: e.target.value })} />
        </div>
        <div className="flex items-end">
          <Button className="w-full" onClick={() => add.mutate()} disabled={add.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Add root
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {(roots ?? []).map((r: any) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-3">
            <span className="font-mono text-sm font-semibold">*.{r.root}</span>
            <span className="font-mono text-xs text-muted-foreground">
              NS: {(r.nameservers ?? []).join(", ") || "—"} · A: {r.a_record || "—"}
            </span>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch checked={r.is_active} onCheckedChange={(v) => save.mutate({ id: r.id, patch: { is_active: v } })} />
                <span className="text-xs text-muted-foreground">{r.is_active ? "Active" : "Off"}</span>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
        {!(roots ?? []).length ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No free roots yet — add one above.
          </p>
        ) : null}
      </div>
    </div>
  );
}
