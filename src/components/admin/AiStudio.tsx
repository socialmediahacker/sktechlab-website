/**
 * AI Studio (admin → AI Studio)
 *
 * Describe what you want in plain language ("make the 5 salon demos feel more
 * luxury, rewrite the hero copy") and the AI proposes changes to the demo
 * templates. Nothing is written until you press Apply, and every applied run
 * can be undone from the history list.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Undo2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { adminAiApply, adminAiPropose, adminAiRuns, adminAiUndo } from "@/lib/ai-studio.functions";
import { adminPackOverview } from "@/lib/harvest.functions";

type Proposal = { action: "create" | "update"; templateId?: string; name: string; summary: string; content_json: any };

export default function AiStudio() {
  const qc = useQueryClient();
  const propose = useServerFn(adminAiPropose);
  const apply = useServerFn(adminAiApply);
  const undo = useServerFn(adminAiUndo);
  const runsFn = useServerFn(adminAiRuns);
  const overview = useServerFn(adminPackOverview);

  const [prompt, setPrompt] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState(3);
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const { data: cats = [] } = useQuery({
    queryKey: ["admin_pack_overview"],
    queryFn: () => overview({} as any) as Promise<{ id: string; name: string; templates: number }[]>,
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["admin_ai_runs"],
    queryFn: () => runsFn({} as any) as Promise<any[]>,
  });

  async function onPropose() {
    if (!prompt.trim()) return toast.error("Write an instruction first");
    setBusy(true);
    setProposals([]);
    setRunId(null);
    try {
      const res: any = await propose({ data: { prompt, categoryId: categoryId || null, limit } });
      setRunId(res.runId);
      setProposals(res.proposals ?? []);
      toast.success(`${res.proposals?.length ?? 0} change(s) proposed`);
      qc.invalidateQueries({ queryKey: ["admin_ai_runs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "AI failed");
    } finally {
      setBusy(false);
    }
  }

  async function onApply() {
    if (!runId) return;
    setBusy(true);
    try {
      const res: any = await apply({ data: { runId } });
      toast.success(`Applied — ${res.updated} updated, ${res.created} new demo(s)`);
      setProposals([]);
      setRunId(null);
      qc.invalidateQueries({ queryKey: ["admin_ai_runs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  async function onUndo(id: string) {
    try {
      const res: any = await undo({ data: { runId: id } });
      toast.success(`Restored ${res.restored} demo(s)`);
      qc.invalidateQueries({ queryKey: ["admin_ai_runs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Undo failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">AI site manager</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell the AI what to change across demo websites. It looks at existing demos, proposes edits or brand-new
          designs, and nothing goes live until you apply.
        </p>

        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          className="mt-4"
          placeholder="e.g. Create 2 new premium gym demos with a bold dark look, and rewrite the hero copy of the existing ones to sound more local and trustworthy."
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.templates})
              </option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            {[1, 2, 3, 5, 8].map((n) => (
              <option key={n} value={n}>
                {n} demo{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
          <Button onClick={onPropose} disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Propose changes
          </Button>
        </div>
      </div>

      {proposals.length ? (
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold">Preview ({proposals.length})</h3>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setProposals([]); setRunId(null); }} disabled={busy}>
                Discard
              </Button>
              <Button onClick={onApply} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Apply to demos
              </Button>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {proposals.map((p, i) => (
              <div key={i} className="rounded-xl border p-4">
                <div className="flex items-center gap-2">
                  <Badge variant={p.action === "create" ? "default" : "secondary"}>{p.action}</Badge>
                  <span className="font-medium">{p.name}</span>
                </div>
                {p.summary ? <p className="mt-1 text-sm text-muted-foreground">{p.summary}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {(p.content_json?.sections ?? []).length} sections ·{" "}
                  {(p.content_json?.sections ?? []).map((s: any) => s?.type).filter(Boolean).join(", ")}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border bg-card p-5">
        <h3 className="font-semibold">Recent runs</h3>
        {!runs.length ? (
          <p className="mt-2 text-sm text-muted-foreground">No AI runs yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.prompt}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()} · {r.count} change(s) · {r.status}
                  </p>
                </div>
                {r.status === "applied" ? (
                  <Button size="sm" variant="outline" onClick={() => onUndo(r.id)}>
                    <Undo2 className="mr-1.5 h-3.5 w-3.5" /> Undo
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
