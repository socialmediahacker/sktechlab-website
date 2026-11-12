/**
 * Category photo packs (admin → Design Studio)
 *
 * Curated, watermark-free HD photos ship inside the code, bucketed per category
 * (hero / gallery / service / product / team). This panel previews a pack and
 * applies it to that category's demo templates + blog posts — one category at a
 * time, with progress and a stop button when running "apply all".
 */
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Images, Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { adminApplyCategoryPacks, adminPackOverview } from "@/lib/harvest.functions";

type PackRow = {
  id: string;
  name: string;
  slug: string;
  templates: number;
  hasPack: boolean;
  images: number;
  preview: string[];
};

export default function PhotoPacks() {
  const qc = useQueryClient();
  const overview = useServerFn(adminPackOverview);
  const applyPacks = useServerFn(adminApplyCategoryPacks);

  const [categoryId, setCategoryId] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  const [note, setNote] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const stop = useRef(false);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin_pack_overview"],
    queryFn: () => overview({} as any) as Promise<PackRow[]>,
  });

  const selected = useMemo(() => rows.find((r) => r.id === categoryId) ?? null, [rows, categoryId]);
  const withPack = rows.filter((r) => r.hasPack);

  async function runApply(list: PackRow[]) {
    setBusy(true);
    stop.current = false;
    setTotal(list.length);
    setDone(0);
    setResult(null);
    let templates = 0;
    let images = 0;
    let blogs = 0;
    try {
      for (let i = 0; i < list.length; i++) {
        if (stop.current) break;
        const c = list[i]!;
        setNote(`${c.name} (${i + 1}/${list.length})…`);
        const r: any = await applyPacks({ data: { categoryId: c.id } });
        templates += r.templates ?? 0;
        images += r.images ?? 0;
        blogs += r.blogs ?? 0;
        setDone(i + 1);
      }
      setResult(`${templates} templates · ${images} images · ${blogs} blog posts updated`);
      toast.success(stop.current ? "Stopped" : "Photo packs applied");
    } catch (e: any) {
      toast.error(e?.message ?? "Apply failed");
      setResult(e?.message ?? "Apply failed");
    } finally {
      setBusy(false);
      setNote(null);
      qc.invalidateQueries({ queryKey: ["admin_pack_overview"] });
    }
  }

  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <Images className="h-4 w-4 text-primary" />
        <h3 className="font-semibold">Category photo packs</h3>
        <Badge variant="secondary">{withPack.length} packs</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">All categories</option>
          {rows.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.hasPack ? "" : " — no pack"}
            </option>
          ))}
        </select>

        <Button
          className="gap-2"
          disabled={busy || isLoading || (!!selected && !selected.hasPack)}
          onClick={() => runApply(selected ? [selected] : withPack)}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {selected ? `Apply ${selected.name} pack` : `Apply all packs (${withPack.length})`}
        </Button>

        {busy && (
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              stop.current = true;
              toast.message("Stopping after this category");
            }}
          >
            <Square className="h-4 w-4" /> Stop
          </Button>
        )}

        {note && <span className="text-xs text-muted-foreground">{note}</span>}
        {result && !busy && <span className="text-xs text-muted-foreground">{result}</span>}
      </div>

      {busy && (
        <div className="mt-3">
          <Progress value={pct} />
          <p className="mt-1 text-xs text-muted-foreground">
            {done}/{total} categories
          </p>
        </div>
      )}

      {selected && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-muted-foreground">
            {selected.images} photos in this pack · {selected.templates} demo templates
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {selected.preview.map((u) => (
              <img
                key={u}
                src={u}
                alt={`${selected.name} pack photo`}
                loading="lazy"
                className="h-24 w-36 shrink-0 rounded-lg object-cover"
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Pack photos</th>
              <th className="p-3">Demo templates</th>
              <th className="p-3">Preview</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="cursor-pointer border-t border-border/60 hover:bg-muted/40"
                onClick={() => setCategoryId(c.id)}
              >
                <td className="p-3 font-medium">{c.name}</td>
                <td className={`p-3 ${c.hasPack ? "" : "text-destructive"}`}>
                  {c.hasPack ? c.images : "no pack"}
                </td>
                <td className="p-3">{c.templates}</td>
                <td className="p-3">
                  <div className="flex gap-1">
                    {c.preview.slice(0, 4).map((u) => (
                      <img key={u} src={u} alt="" loading="lazy" className="h-9 w-12 rounded object-cover" />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
