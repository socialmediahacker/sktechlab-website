/**
 * Web Harvest (admin → Design Studio)
 *
 * Keywords se real category websites dhoondho, unki HD photos nikaalo, aur ek
 * image bank me store karo. Bulk apply / image engine isi bank se photos uthata
 * hai — sabse kam use hui pehle, taki koi photo repeat na ho.
 */
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Download, FileUp, Globe, Loader2, Play, Search, Square, Trash2, Upload, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { adminBulkApplyTargets } from "@/lib/bulk-apply.functions";
import {
  adminDiscoverSites,
  adminBankCoverage,
  adminExportBank,
  adminFixBlogImages,
  adminHarvestBatch,
  adminImportBank,
  adminListBank,
  adminListHarvestRuns,
  adminReferenceSites,
  adminSeedCategoryStock,
  adminStartHarvest,
  adminStopHarvest,
  adminUpdateBankImage,
  adminUploadBankBatch,
  adminUploadFiles,
} from "@/lib/harvest.functions";

type Run = {
  id: string;
  category_id: string | null;
  keywords: string;
  total: number;
  processed: number;
  collected: number;
  status: string;
  created_at: string;
};

type BankRow = {
  id: string;
  url: string;
  cdn_url?: string | null;
  upload_error?: string | null;
  source_domain: string | null;
  section_key: string;
  category_slug: string;
  used_count: number;
  blocked: boolean;
};

export default function WebHarvest() {
  const qc = useQueryClient();
  const targets = useServerFn(adminBulkApplyTargets);
  const discover = useServerFn(adminDiscoverSites);
  const start = useServerFn(adminStartHarvest);
  const batch = useServerFn(adminHarvestBatch);
  const stopRun = useServerFn(adminStopHarvest);
  const listRuns = useServerFn(adminListHarvestRuns);
  const listBank = useServerFn(adminListBank);
  const referenceSites = useServerFn(adminReferenceSites);
  const updateImage = useServerFn(adminUpdateBankImage);
  const exportBank = useServerFn(adminExportBank);
  const importBank = useServerFn(adminImportBank);
  const uploadBatch = useServerFn(adminUploadBankBatch);
  const uploadFiles = useServerFn(adminUploadFiles);
  const coverageFn = useServerFn(adminBankCoverage);
  const fixBlogImages = useServerFn(adminFixBlogImages);
  const seedStock = useServerFn(adminSeedCategoryStock);

  const [categoryId, setCategoryId] = useState("");
  const [keywords, setKeywords] = useState("");
  const [sites, setSites] = useState("");
  const [run, setRun] = useState<Run | null>(null);
  const [busy, setBusy] = useState(false);
  const [last, setLast] = useState<string | null>(null);
  const [autoNote, setAutoNote] = useState<string | null>(null);
  const stopFlag = useRef(false);

  const { data: cats = [] } = useQuery({
    queryKey: ["admin_bulk_targets"],
    queryFn: () => targets({} as any) as Promise<{ id: string; name: string }[]>,
  });
  const { data: runs = [] } = useQuery({
    queryKey: ["admin_harvest_runs"],
    queryFn: () => listRuns({} as any) as Promise<Run[]>,
  });
  const { data: coverage } = useQuery({
    queryKey: ["admin_bank_coverage"],
    queryFn: () =>
      coverageFn({} as any) as Promise<{
        pendingUploads: number;
        categories: Array<{ id: string; name: string; slug: string; images: number; uploaded: number }>;
      }>,
  });
  const { data: bank } = useQuery({
    queryKey: ["admin_bank", categoryId],
    queryFn: () =>
      listBank({ data: { categoryId: categoryId || undefined, limit: 60 } }) as Promise<{
        rows: BankRow[];
        total: number;
      }>,
  });

  const catName = cats.find((c) => c.id === categoryId)?.name ?? "";

  /** Category chunne par keywords apne aap bhar do (admin edit kar sakta hai). */
  function chooseCategory(id: string) {
    setCategoryId(id);
    const name = cats.find((c) => c.id === id)?.name ?? "";
    setKeywords(name ? `${name} business website` : "");
    setSites("");
  }

  const find = useMutation({
    mutationFn: async () => {
      const kw = keywords.trim() || `${catName} business`;
      return discover({ data: { keywords: kw, limit: 15 } }) as Promise<{ sites: string[] }>;
    },
    onSuccess: (res) => {
      if (!res.sites.length) {
        toast.error("Koi website nahi mili — keywords badlo ya URLs paste karo.");
        return;
      }
      setSites((s) => Array.from(new Set([...s.split("\n"), ...res.sites].map((x) => x.trim()).filter(Boolean))).join("\n"));
      toast.success(`${res.sites.length} websites mili`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Search failed"),
  });


  /** Ek run ko poora chalao (batch by batch). */
  async function runDrive(current: Run) {
    let state = current;
    while (!stopFlag.current) {
      const res: any = await batch({ data: { runId: state.id, limit: 2 } });
      state = res as Run;
      setRun(state);
      if (res.lastSite) setLast(res.lastSite);
      if (res.done || state.status !== "running") break;
    }
    return state;
  }

  async function drive(current: Run) {
    setBusy(true);
    stopFlag.current = false;
    try {
      await runDrive(current);
    } catch (e: any) {
      toast.error(e?.message ?? "Harvest failed");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["admin_harvest_runs"] });
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
    }
  }

  const begin = useMutation({
    mutationFn: async () => {
      const list = sites.split("\n").map((s) => s.trim()).filter(Boolean);
      return start({
        data: { categoryId: categoryId || null, keywords: keywords.trim(), sites: list },
      }) as Promise<Run>;
    },
    onSuccess: (r) => {
      setRun(r);
      void drive(r);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not start"),
  });

  /**
   * Auto harvest: har category ke liye keywords banao → websites dhoondho →
   * harvest karo. "All categories" par ye poori list par chalta hai.
   */
  const auto = useMutation({
    mutationFn: async () => {
      const list = categoryId ? cats.filter((c) => c.id === categoryId) : cats;
      if (!list.length) throw new Error("Koi category nahi mili");
      setBusy(true);
      stopFlag.current = false;
      let done = 0;
      let collected = 0;
      for (const c of list) {
        if (stopFlag.current) break;
        setAutoNote(`${c.name} — websites dhoondh rahe hain… (${done + 1}/${list.length})`);
        const kw = categoryId && keywords.trim() ? keywords.trim() : `${c.name} business website`;
        let found: string[] = [];
        try {
          const res: any = await discover({ data: { keywords: kw, limit: 12 } });
          found = res?.sites ?? [];
        } catch {
          found = [];
        }
        if (!found.length) {
          done++;
          continue;
        }
        setAutoNote(`${c.name} — ${found.length} sites se images le rahe hain… (${done + 1}/${list.length})`);
        try {
          const r = (await start({ data: { categoryId: c.id, keywords: kw, sites: found } })) as Run;
          setRun(r);
          const final = await runDrive(r);
          collected += final?.collected ?? 0;
        } catch {
          /* ek category fail ho to baaki chalti rahe */
        }
        done++;
        qc.invalidateQueries({ queryKey: ["admin_bank"] });
      }
      return { done, collected, total: list.length };
    },
    onSuccess: (r) => toast.success(`${r.done}/${r.total} categories · ${r.collected} nayi images`),
    onError: (e: any) => toast.error(e?.message ?? "Auto harvest failed"),
    onSettled: () => {
      setBusy(false);
      setAutoNote(null);
      qc.invalidateQueries({ queryKey: ["admin_harvest_runs"] });
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
    },
  });

  /** Harvest the curated category websites imported from the user's PDF. */
  const pdfHarvest = useMutation({
    mutationFn: async (harvestNow: boolean) => {
      const groups = (await referenceSites({ data: { categoryId: categoryId || null } })) as Array<{
        categoryId: string;
        categoryName: string;
        categorySlug: string;
        sites: string[];
      }>;
      if (!groups.length) throw new Error("Selected category ka PDF reference match nahi mila");

      if (!harvestNow && groups.length === 1) {
        setKeywords(`${groups[0].categoryName} business website`);
        setSites(groups[0].sites.join("\n"));
        return { groups: 1, sites: groups[0].sites.length, collected: 0 };
      }

      setBusy(true);
      stopFlag.current = false;
      let siteCount = 0;
      let collected = 0;
      let completed = 0;
      for (const group of groups) {
        if (stopFlag.current) break;
        siteCount += group.sites.length;
        setAutoNote(`${group.categoryName} — PDF ki ${group.sites.length} websites harvest ho rahi hain (${completed + 1}/${groups.length})`);
        try {
          const started = (await start({
            data: {
              categoryId: group.categoryId,
              keywords: `${group.categoryName} PDF references`,
              sites: group.sites,
            },
          })) as Run;
          setRun(started);
          const final = await runDrive(started);
          collected += final.collected ?? 0;
        } catch {
          /* unavailable website ko skip karke next category continue karo */
        }
        completed += 1;
        qc.invalidateQueries({ queryKey: ["admin_bank"] });
      }
      return { groups: completed, sites: siteCount, collected };
    },
    onSuccess: (result) => {
      if (result.collected) toast.success(`${result.groups} categories · ${result.collected} unique images imported`);
      else if (result.groups === 1) toast.success(`${result.sites} PDF websites list me add ho gayi`);
    },
    onError: (e: any) => toast.error(e?.message ?? "PDF website import failed"),
    onSettled: () => {
      setBusy(false);
      setAutoNote(null);
      qc.invalidateQueries({ queryKey: ["admin_harvest_runs"] });
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
    },
  });


  /**
   * Jin categories ke paas photos nahi hain: pehle unki PDF reference sites +
   * keyword discovery se harvest, phir bhi kam pade to stock se bhar do.
   */
  const fillEmpty = useMutation({
    mutationFn: async () => {
      const cov = (await coverageFn({} as any)) as {
        categories: Array<{ id: string; name: string; slug: string; images: number }>;
      };
      const empty = cov.categories.filter((c) => c.images < 20);
      if (!empty.length) return { done: 0, total: 0, added: 0 };
      setBusy(true);
      stopFlag.current = false;
      let done = 0;
      let added = 0;
      for (const c of empty) {
        if (stopFlag.current) break;
        setAutoNote(`${c.name} — photos bhar rahe hain (${done + 1}/${empty.length})`);
        let list: string[] = [];
        try {
          const groups: any = await referenceSites({ data: { categoryId: c.id } });
          list = groups?.[0]?.sites ?? [];
        } catch {
          list = [];
        }
        if (list.length < 4) {
          try {
            const res: any = await discover({ data: { keywords: `${c.name} business website`, limit: 12 } });
            list = Array.from(new Set([...list, ...(res?.sites ?? [])]));
          } catch {
            /* discovery optional */
          }
        }
        if (list.length) {
          try {
            const started = (await start({
              data: { categoryId: c.id, keywords: `${c.name} fill`, sites: list },
            })) as Run;
            setRun(started);
            const final = await runDrive(started);
            added += final?.collected ?? 0;
          } catch {
            /* skip */
          }
        }
        try {
          setAutoNote(`${c.name} — stock photos add ho rahi hain (${done + 1}/${empty.length})`);
          const seeded: any = await seedStock({ data: { categoryId: c.id, count: 15 } });
          added += seeded?.added ?? 0;
        } catch {
          /* stock optional */
        }
        done += 1;
        qc.invalidateQueries({ queryKey: ["admin_bank"] });
      }
      return { done, total: empty.length, added };
    },
    onSuccess: (r) =>
      r.total
        ? toast.success(`${r.done}/${r.total} categories bhari · ${r.added} nayi photos`)
        : toast.success("Har category ke paas photos already hain"),
    onError: (e: any) => toast.error(e?.message ?? "Fill failed"),
    onSettled: () => {
      setBusy(false);
      setAutoNote(null);
      qc.invalidateQueries({ queryKey: ["admin_bank_coverage"] });
    },
  });

  const doExport = useMutation({
    mutationFn: async () => exportBank({} as any) as Promise<{ images: unknown[] }>,
    onSuccess: (res) => {
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `image-bank-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`${res.images.length} images exported`);
    },
  });

  const doImport = useMutation({
    mutationFn: async (json: string) =>
      importBank({ data: { json, categoryId: categoryId || null } }) as Promise<{ imported: number }>,
    onSuccess: (r) => {
      toast.success(`${r.imported} nayi images import hui`);
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  /** Bank ki saari photos apne CDN par upload karo (batch by batch). */
  const cdnUpload = useMutation({
    mutationFn: async () => {
      setBusy(true);
      stopFlag.current = false;
      let uploaded = 0;
      let failed = 0;
      for (let i = 0; i < 400 && !stopFlag.current; i++) {
        const res: any = await uploadBatch({ data: { categoryId: categoryId || null, limit: 8 } });
        uploaded += res.uploaded ?? 0;
        failed += res.failed ?? 0;
        setAutoNote(`CDN upload — ${uploaded} photos upload ho chuki hain${failed ? `, ${failed} skip` : ""}…`);
        if (!res.processed || res.done) break;
        qc.invalidateQueries({ queryKey: ["admin_bank"] });
      }
      return { uploaded, failed };
    },
    onSuccess: (r) => toast.success(`${r.uploaded} photos CDN par upload · ${r.failed} skip`),
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
    onSettled: () => {
      setBusy(false);
      setAutoNote(null);
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
      qc.invalidateQueries({ queryKey: ["admin_bank_coverage"] });
    },
  });

  /** Admin apne computer se photos bank me daale. */
  const filesUpload = useMutation({
    mutationFn: async (files: File[]) => {
      const payload: Array<{ name: string; data: string }> = [];
      for (const f of files.slice(0, 12)) {
        const data = await new Promise<string>((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(String(fr.result));
          fr.onerror = () => reject(new Error("File read failed"));
          fr.readAsDataURL(f);
        });
        payload.push({ name: f.name, data });
      }
      return uploadFiles({
        data: { categoryId: categoryId || null, section: "gallery", files: payload },
      }) as Promise<{ uploaded: number; errors: string[] }>;
    },
    onSuccess: (r) => {
      toast.success(`${r.uploaded} photos bank me add hui`);
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
      qc.invalidateQueries({ queryKey: ["admin_bank_coverage"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Upload failed"),
  });

  /** Blogs ko category-wise bank photos do. */
  const blogImages = useMutation({
    mutationFn: async () => {
      setBusy(true);
      stopFlag.current = false;
      let offset = 0;
      let fixed = 0;
      for (let i = 0; i < 100 && !stopFlag.current; i++) {
        const res: any = await fixBlogImages({ data: { offset, limit: 8 } });
        fixed += res.fixed ?? 0;
        offset += res.processed ?? 0;
        setAutoNote(`Blog photos — ${fixed} posts update ho chuke hain…`);
        if (res.done || !res.processed) break;
      }
      return { fixed };
    },
    onSuccess: (r) => toast.success(`${r.fixed} blogs ko category photos mil gayi`),
    onError: (e: any) => toast.error(e?.message ?? "Blog images failed"),
    onSettled: () => {
      setBusy(false);
      setAutoNote(null);
      qc.invalidateQueries({ queryKey: ["admin_bank"] });
    },
  });


  const act = useMutation({
    mutationFn: async (v: { id?: string; domain?: string; action: "block" | "unblock" | "delete" }) =>
      updateImage({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin_bank"] }),
  });

  const pct = run && run.total ? Math.round((run.processed / run.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={categoryId}
            onChange={(e) => chooseCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Input
            className="h-10 w-72"
            placeholder={catName ? `${catName} website images` : "keywords, e.g. bridal makeup studio"}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
          />
          <Button variant="outline" className="gap-2" disabled={find.isPending || busy} onClick={() => find.mutate()}>
            {find.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Find websites
          </Button>
          <Button className="gap-2" disabled={busy || auto.isPending} onClick={() => auto.mutate()}>
            {busy || auto.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {categoryId ? `Auto harvest ${catName}` : "Auto harvest all categories"}
          </Button>



          <Button
            variant="outline"
            className="gap-2"
            disabled={busy || pdfHarvest.isPending}
            onClick={() => pdfHarvest.mutate(!categoryId)}
          >
            {pdfHarvest.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {categoryId ? "Load PDF websites" : "Harvest all PDF websites"}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={busy || fillEmpty.isPending}
            onClick={() => fillEmpty.mutate()}
          >
            {fillEmpty.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Fill empty categories
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {cats.map((c) => {
            const cov = coverage?.categories.find((x) => x.id === c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => chooseCategory(c.id)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  categoryId === c.id
                    ? "bg-primary text-primary-foreground"
                    : cov && cov.images === 0
                      ? "border-destructive/50 text-destructive hover:bg-muted"
                      : "hover:bg-muted"
                }`}
              >
                {c.name}
                {cov ? ` · ${cov.uploaded}/${cov.images}` : ""}
              </button>
            );
          })}
        </div>

        {coverage && (
          <p className="mt-3 text-xs text-muted-foreground">
            {coverage.categories.filter((c) => c.images === 0).length} categories khaali ·{" "}
            {coverage.pendingUploads} photos abhi CDN par upload hona baaki hai (chip par uploaded/total).
          </p>
        )}






        <p className="mt-4 text-xs text-muted-foreground">
          Websites (ek line = ek site). 55+ sites ek saath paste kar sakte ho.
        </p>
        <Textarea
          className="mt-2 min-h-[140px] font-mono text-xs"
          placeholder={"https://example-salon.com\nhttps://another-site.in"}
          value={sites}
          onChange={(e) => setSites(e.target.value)}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            className="gap-2"
            disabled={busy || begin.isPending || !sites.trim()}
            onClick={() => begin.mutate()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Harvest images
          </Button>
          {busy && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                stopFlag.current = true;
                if (run) void stopRun({ data: { runId: run.id } });
              }}
            >
              <Square className="h-4 w-4" /> Stop
            </Button>
          )}
          <Button variant="outline" className="gap-2" onClick={() => doExport.mutate()}>
            <Download className="h-4 w-4" /> Export bank
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
            <Upload className="h-4 w-4" /> Import bank
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) doImport.mutate(await f.text());
                e.target.value = "";
              }}
            />
          </label>
          <Button
            className="gap-2"
            disabled={busy || cdnUpload.isPending}
            onClick={() => cdnUpload.mutate()}
          >
            {cdnUpload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload bank to CDN
            {coverage?.pendingUploads ? ` (${coverage.pendingUploads})` : ""}
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input px-3 py-2 text-sm">
            <Upload className="h-4 w-4" /> Upload photos
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length) filesUpload.mutate(files);
                e.target.value = "";
              }}
            />
          </label>
          <Button
            variant="outline"
            className="gap-2"
            disabled={busy || blogImages.isPending}
            onClick={() => blogImages.mutate()}
          >
            {blogImages.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            Fix blog images
          </Button>
        </div>


        {autoNote && <p className="mt-3 text-xs text-muted-foreground">{autoNote}</p>}

        {run && (
          <div className="mt-4 space-y-2">
            <Progress value={pct} />
            <p className="text-xs text-muted-foreground">
              {run.processed}/{run.total} sites · {run.collected} nayi images
              {last ? ` · ${last}` : ""} · {run.status}
            </p>
          </div>
        )}

      </section>

      <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Image bank</h3>
          <Badge variant="secondary">{bank?.total ?? 0} images</Badge>
        </div>
        {!bank?.rows.length ? (
          <p className="text-xs text-muted-foreground">
            Abhi bank khaali hai. Upar se websites harvest karo — phir Bulk apply in photos ko templates par laga dega.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {bank.rows.map((r) => (
              <div key={r.id} className="group relative overflow-hidden rounded-xl border border-border/60">
                <img
                  src={r.cdn_url || r.url}
                  alt={r.section_key}
                  loading="lazy"
                  className={`h-28 w-full object-cover ${r.blocked ? "opacity-30 grayscale" : ""}`}
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-[10px] text-white">
                  <span className="truncate">{r.source_domain}</span>
                  <span>×{r.used_count}</span>
                </div>
                <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-6 w-6"
                    title={r.blocked ? "Unblock" : "Block"}
                    onClick={() => act.mutate({ id: r.id, action: r.blocked ? "unblock" : "block" })}
                  >
                    <Ban className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6"
                    title="Delete"
                    onClick={() => act.mutate({ id: r.id, action: "delete" })}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {!!runs.length && (
        <section className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
          <h3 className="mb-3 text-sm font-semibold">Recent harvests</h3>
          <div className="space-y-2 text-xs">
            {runs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-2">
                <Badge variant={r.status === "done" ? "secondary" : "outline"}>{r.status}</Badge>
                <span className="text-muted-foreground">{r.keywords || "manual list"}</span>
                <span>
                  {r.processed}/{r.total} sites
                </span>
                <span>{r.collected} images</span>
                <span className="ml-auto text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
