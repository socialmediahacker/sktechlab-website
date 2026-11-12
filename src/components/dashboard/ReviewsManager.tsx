import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { saveSiteContent } from "@/lib/site-editor.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaUploadButton } from "@/components/media-upload";
import { tileFor } from "@/components/admin/AdminShell";
import { toast } from "sonner";
import { Star, Trash2, Plus, Save, MessageSquare } from "lucide-react";

type Review = { name?: string; role?: string; text?: string; rating?: number; image?: string };

export function ReviewsManager({ sites }: { sites: any[] }) {
  const [siteId, setSiteId] = useState<string>(sites?.[0]?.id ?? "");
  const save = useServerFn(saveSiteContent);
  const [items, setItems] = useState<Review[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: site, refetch } = useQuery({
    queryKey: ["site_reviews", siteId],
    enabled: !!siteId,
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("id, name, content_json, version").eq("id", siteId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const sectionIndex = useMemo(() => {
    const secs: any[] = (site?.content_json as any)?.sections ?? [];
    return secs.findIndex((s: any) => s?.type === "testimonials");
  }, [site]);

  useEffect(() => {
    const secs: any[] = (site?.content_json as any)?.sections ?? [];
    const sec = sectionIndex >= 0 ? secs[sectionIndex] : null;
    setItems(Array.isArray(sec?.items) ? (sec.items as Review[]) : []);
    setDirty(false);
  }, [site, sectionIndex]);

  const patch = (i: number, key: keyof Review, value: any) => {
    setItems((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
    setDirty(true);
  };

  const add = () => {
    setItems((prev) => [...prev, { name: "New customer", role: "", text: "Great experience!", rating: 5, image: "" }]);
    setDirty(true);
  };

  const remove = (i: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const persist = async () => {
    if (!site) return;
    setSaving(true);
    try {
      const content: any = JSON.parse(JSON.stringify(site.content_json ?? {}));
      content.sections = Array.isArray(content.sections) ? content.sections : [];
      if (sectionIndex >= 0) {
        content.sections[sectionIndex] = { ...content.sections[sectionIndex], items };
      } else {
        content.sections.push({ type: "testimonials", title: "What our customers say", items });
      }
      await save({ data: { id: site.id, content_json: content, expectedVersion: site.version ?? undefined } });
      toast.success("Reviews saved — live on your website");
      setDirty(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!sites?.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <MessageSquare className="mx-auto mb-3 h-10 w-10 text-brand-glow" />
        <p className="text-muted-foreground">Create a website first — then you can manage its customer reviews here.</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold sm:text-xl">
        <MessageSquare className="h-5 w-5 text-brand-glow" /> Customer reviews
      </h2>

      <div className="mb-4 flex flex-wrap gap-2">
        {sites.map((s: any, i: number) => (
          <button key={s.id} onClick={() => setSiteId(s.id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${siteId === s.id ? "glass shadow-card" : "text-muted-foreground hover:text-foreground"}`}>
            <span className={`grid h-7 w-7 place-items-center rounded-lg text-brand-foreground ${tileFor(i)}`}>
              <Star className="h-3.5 w-3.5" />
            </span>
            {s.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.map((r, i) => (
          <article key={i} className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span className={`grid h-8 w-8 place-items-center rounded-xl text-brand-foreground ${tileFor(i)}`}>⭐</span>
                Review {i + 1}
              </span>
              <Button variant="ghost" size="sm" onClick={() => remove(i)} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Customer name</Label>
                <Input value={r.name ?? ""} onChange={(e) => patch(i, "name", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Role / city</Label>
                <Input value={r.role ?? ""} onChange={(e) => patch(i, "role", e.target.value)} />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs">Review</Label>
                <Textarea rows={3} value={r.text ?? ""} onChange={(e) => patch(i, "text", e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Rating (1-5)</Label>
                <Input type="number" min={1} max={5} value={r.rating ?? 5}
                  onChange={(e) => patch(i, "rating", Math.max(1, Math.min(5, Number(e.target.value) || 5)))} />
              </div>
              <div>
                <Label className="text-xs">Photo</Label>
                <div className="flex flex-wrap items-center gap-2">
                  {r.image ? <img src={r.image} alt={r.name ?? "Customer photo"} className="h-10 w-10 rounded-full object-cover" /> : null}
                  <Input className="min-w-0 flex-1" placeholder="Image URL" value={r.image ?? ""} onChange={(e) => patch(i, "image", e.target.value)} />
                  <MediaUploadButton label="Upload" onUploaded={(urls) => urls[0] && patch(i, "image", urls[0])} />
                </div>
              </div>
            </div>
          </article>
        ))}
        {!items.length ? (
          <div className="glass rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No reviews yet on this website. Add your first one.
          </div>
        ) : null}
      </div>

      <div className="sticky bottom-3 z-10 mt-4 flex flex-wrap gap-2">
        <Button variant="outline" onClick={add}><Plus className="mr-2 h-4 w-4" /> Add review</Button>
        <Button onClick={persist} disabled={!dirty || saving}>
          <Save className="mr-2 h-4 w-4" /> {saving ? "Saving…" : "Save & publish"}
        </Button>
      </div>
    </section>
  );
}
