/**
 * Home showcase (admin)
 *
 * Controls the two home page galleries:
 *  • "Real templates you can preview live" — the live demo grid
 *  • "Websites created on SKTECHLAB" — the sliding showcase strip
 * Admin can add / remove designs, reorder them and override the thumbnail.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  adminHomeShowcase,
  adminReorderHomeSlot,
  adminSetHomeSlot,
  adminSetHomeThumb,
} from "@/lib/home-showcase.functions";

type Row = {
  id: string;
  name: string;
  thumbnail_url: string | null;
  accent_color: string | null;
  home_slot: "demo" | "showcase" | null;
  is_editable_demo: boolean;
  categories?: { name: string; slug: string } | null;
};

type Slot = "demo" | "showcase";

export default function HomeShowcaseAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(adminHomeShowcase);
  const setSlot = useServerFn(adminSetHomeSlot);
  const setThumb = useServerFn(adminSetHomeThumb);
  const reorder = useServerFn(adminReorderHomeSlot);

  const [slot, setSlotTab] = useState<Slot>("demo");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [editing, setEditing] = useState<{ id: string; url: string } | null>(null);

  const key = ["admin_home_showcase", search, categoryId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      load({ data: { search, categoryId: categoryId || null } }) as Promise<{
        demos: Row[];
        showcase: Row[];
        pool: Row[];
        categories: { id: string; name: string }[];
      }>,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_home_showcase"] });

  const change = useMutation({
    mutationFn: async (v: { id: string; slot: Slot | null }) => setSlot({ data: v }),
    onSuccess: () => {
      invalidate();
      toast.success("Home page updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const thumb = useMutation({
    mutationFn: async (v: { id: string; url: string }) => setThumb({ data: v }),
    onSuccess: () => {
      setEditing(null);
      invalidate();
      toast.success("Thumbnail updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async (ids: string[]) => reorder({ data: { ids } }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const current = (slot === "demo" ? data?.demos : data?.showcase) ?? [];

  function shift(index: number, dir: -1 | 1) {
    const ids = current.map((r) => r.id);
    const to = index + dir;
    if (to < 0 || to >= ids.length) return;
    [ids[index], ids[to]] = [ids[to]!, ids[index]!];
    move.mutate(ids);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={slot === "demo" ? "default" : "outline"} onClick={() => setSlotTab("demo")}>
          Live demo gallery
        </Button>
        <Button variant={slot === "showcase" ? "default" : "outline"} onClick={() => setSlotTab("showcase")}>
          Created on SKTECHLAB
        </Button>
        <Badge variant="secondary">{current.length} on home</Badge>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <h3 className="mb-3 font-semibold">
          {slot === "demo" ? "Real templates you can preview live" : "Websites created on SKTECHLAB"}
        </h3>
        {!current.length && (
          <p className="text-sm text-muted-foreground">
            Nothing pinned yet — pick designs from the library below.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {current.map((t, i) => (
            <div key={t.id} className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="aspect-[4/3] bg-muted">
                {t.thumbnail_url && (
                  <img src={t.thumbnail_url} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.categories?.name}</div>
                </div>
                {editing?.id === t.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={editing.url}
                      placeholder="https://…"
                      onChange={(e) => setEditing({ id: t.id, url: e.target.value })}
                      className="h-8"
                    />
                    <Button size="sm" disabled={thumb.isPending} onClick={() => thumb.mutate(editing)}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => shift(i, -1)}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1" onClick={() => shift(i, 1)}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      onClick={() => setEditing({ id: t.id, url: t.thumbnail_url ?? "" })}
                    >
                      <ImagePlus className="h-3.5 w-3.5" /> Thumbnail
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1 text-destructive"
                      onClick={() => change.mutate({ id: t.id, slot: null })}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h3 className="font-semibold">Template library</h3>
          <Input
            className="h-9 w-56"
            placeholder="Search by name"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {(data?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(data?.pool ?? []).map((t) => (
            <div key={t.id} className="overflow-hidden rounded-xl border border-border bg-background">
              <div className="aspect-[4/3] bg-muted">
                {t.thumbnail_url && (
                  <img src={t.thumbnail_url} alt={t.name} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="truncate text-sm font-medium">{t.name}</div>
                <div className="truncate text-xs text-muted-foreground">{t.categories?.name}</div>
                <Button
                  size="sm"
                  className="w-full gap-1"
                  onClick={() => change.mutate({ id: t.id, slot })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add to {slot === "demo" ? "live demos" : "showcase"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
