import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { listIntegrations, saveIntegration, testIntegration } from "@/lib/integrations.functions";
import { detectNiche } from "@/lib/site-editor.functions";
import { setImageKitConfig } from "@/lib/images/imagekit";
import { BarChart3, CheckCircle2, Globe, Image as ImageIcon, MessageCircle, PlugZap, Save, Share2, Sparkles, XCircle } from "lucide-react";

type Row = { provider: string; label: string; enabled: boolean; config: Record<string, any> };

const KNOWN: Array<{ provider: string; label: string; icon: typeof ImageIcon; note: string }> = [
  { provider: "imagekit", label: "ImageKit — Image CDN & Media Library", icon: ImageIcon, note: "Saare templates ki images isi se serve hongi (auto format, HD, fast)." },
  { provider: "pexels", label: "Pexels — stock photo fallback", icon: Sparkles, note: "ImageKit me match na mile to yahan se photo aayegi." },
  { provider: "gemini", label: "AI (Gemini / Lovable AI)", icon: Sparkles, note: "Copywriting, layout aur site regenerate." },
  { provider: "smart_images", label: "Smart Niche Images", icon: Sparkles, note: "Har business ka exact niche detect karke section-wise images laata hai (200+ categories, multi-language)." },
  { provider: "google_search_console", label: "Google Search Console", icon: Globe, note: "Site verification, sitemap submit aur search performance tracking." },
  { provider: "google_analytics", label: "Google Analytics (GA4)", icon: BarChart3, note: "Visitors, pageviews aur conversion tracking har site par." },
  { provider: "meta_pixel", label: "Meta Pixel & Conversions API", icon: Share2, note: "Facebook/Instagram ads ke liye browser pixel + server-side events." },
  { provider: "whatsapp_business", label: "WhatsApp Business API", icon: MessageCircle, note: "OTP, order updates aur support messages ke liye." },
];

export function IntegrationsAdmin() {
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["api_integrations"], queryFn: () => listIntegrations() });
  const save = useServerFn(saveIntegration);
  const test = useServerFn(testIntegration);
  const [draft, setDraft] = useState<Record<string, Row>>({});
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    if (!rows.data) return;
    const map: Record<string, Row> = {};
    for (const k of KNOWN) {
      const found = (rows.data as Row[]).find((r) => r.provider === k.provider);
      map[k.provider] = found ?? { provider: k.provider, label: k.label, enabled: false, config: {} };
    }
    setDraft(map);
  }, [rows.data]);

  const saveOne = useMutation({
    mutationFn: async (provider: string) => {
      const row = draft[provider];
      if (!row) return;
      await save({ data: { provider, label: row.label, enabled: row.enabled, config: row.config ?? {} } });
      if (provider === "imagekit") setImageKitConfig({ enabled: row.enabled, ...(row.config ?? {}) });
    },
    onSuccess: () => {
      toast.success("Integration saved");
      qc.invalidateQueries({ queryKey: ["api_integrations"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  const runTest = useMutation({
    mutationFn: (provider: string) => test({ data: { provider } }),
    onSuccess: (res, provider) => {
      setResults((r) => ({ ...r, [provider]: res as { ok: boolean; message: string } }));
      (res as any).ok ? toast.success("Connection OK") : toast.error("Connection failed");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Test failed"),
  });

  const set = (provider: string, patch: Partial<Row>) =>
    setDraft((d) => ({ ...d, [provider]: { ...(d[provider] as Row), ...patch } }));
  const setCfg = (provider: string, key: string, value: unknown) =>
    setDraft((d) => ({
      ...d,
      [provider]: { ...(d[provider] as Row), config: { ...((d[provider]?.config as any) ?? {}), [key]: value } },
    }));

  return (
    <div className="space-y-4">
      {KNOWN.map(({ provider, label, icon: Icon, note }) => {
        const row = draft[provider];
        const cfg = (row?.config ?? {}) as Record<string, any>;
        const res = results[provider];
        return (
          <section key={provider} className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-brand text-brand-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold">{label}</h3>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!row?.enabled} onCheckedChange={(v) => set(provider, { enabled: v })} />
                <span className="text-xs text-muted-foreground">{row?.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            </header>

            {provider === "imagekit" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">URL endpoint</Label>
                  <Input value={cfg.endpoint ?? ""} onChange={(e) => setCfg(provider, "endpoint", e.target.value)} placeholder="https://ik.imagekit.io/yourid" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Public key</Label>
                  <Input value={cfg.publicKey ?? ""} onChange={(e) => setCfg(provider, "publicKey", e.target.value)} placeholder="public_..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Upload folder</Label>
                  <Input value={cfg.uploadFolder ?? ""} onChange={(e) => setCfg(provider, "uploadFolder", e.target.value)} placeholder="sktechlab" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default quality (1-100)</Label>
                  <Input
                    type="number"
                    value={cfg.defaultQuality ?? 80}
                    onChange={(e) => setCfg(provider, "defaultQuality", Number(e.target.value) || 80)}
                  />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={cfg.webProxy !== false} onCheckedChange={(v) => setCfg(provider, "webProxy", v)} />
                  Web proxy (ImageKit me external origin set hone par hi ON karein)
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={cfg.forceAll !== false} onCheckedChange={(v) => setCfg(provider, "forceAll", v)} />
                  Sabhi templates par force karo
                </label>
                <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                  Private key server par secret ke roop me store hai — yahan kabhi show nahi hoti.
                </p>
              </div>
            )}

            {provider === "smart_images" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={cfg.aiResolver !== false} onCheckedChange={(v) => setCfg(provider, "aiResolver", v)} />
                  Unknown niche par AI se detect karo
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={cfg.sectionAware !== false} onCheckedChange={(v) => setCfg(provider, "sectionAware", v)} />
                  Section-wise images (hero / gallery / services alag)
                </label>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Default style words</Label>
                  <Input
                    value={cfg.styleWords ?? ""}
                    onChange={(e) => setCfg(provider, "styleWords", e.target.value)}
                    placeholder="premium, natural light, editorial"
                  />
                </div>
                <div className="sm:col-span-2">
                  <NicheTester />
                </div>
              </div>
            )}

            {provider === "google_search_console" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Property URL</Label>
                  <Input value={cfg.propertyUrl ?? ""} onChange={(e) => setCfg(provider, "propertyUrl", e.target.value)} placeholder="https://sktechlab.com/" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Verification meta tag (content value)</Label>
                  <Input value={cfg.verificationToken ?? ""} onChange={(e) => setCfg(provider, "verificationToken", e.target.value)} placeholder="google-site-verification token" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">Sitemap URL</Label>
                  <Input value={cfg.sitemapUrl ?? ""} onChange={(e) => setCfg(provider, "sitemapUrl", e.target.value)} placeholder="https://sktechlab.com/sitemap.xml" />
                </div>
              </div>
            )}

            {provider === "google_analytics" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Measurement ID</Label>
                  <Input value={cfg.measurementId ?? ""} onChange={(e) => setCfg(provider, "measurementId", e.target.value)} placeholder="G-XXXXXXXXXX" />
                </div>
                <label className="flex items-center gap-2 self-end text-xs">
                  <Switch checked={cfg.trackCustomerSites === true} onCheckedChange={(v) => setCfg(provider, "trackCustomerSites", v)} />
                  Customer ki published sites par bhi track karo
                </label>
              </div>
            )}

            {provider === "meta_pixel" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Pixel ID</Label>
                  <Input value={cfg.pixelId ?? ""} onChange={(e) => setCfg(provider, "pixelId", e.target.value)} placeholder="1234567890" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Test event code (optional)</Label>
                  <Input value={cfg.testEventCode ?? ""} onChange={(e) => setCfg(provider, "testEventCode", e.target.value)} placeholder="TEST12345" />
                </div>
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={cfg.capiEnabled === true} onCheckedChange={(v) => setCfg(provider, "capiEnabled", v)} />
                  Conversions API (server-side events) ON
                </label>
                <p className="self-end text-[11px] text-muted-foreground">
                  CAPI access token server par secret ke roop me store hota hai — yahan kabhi show nahi hota.
                </p>
              </div>
            )}

            {provider === "whatsapp_business" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Business phone number ID</Label>
                  <Input value={cfg.phoneNumberId ?? ""} onChange={(e) => setCfg(provider, "phoneNumberId", e.target.value)} placeholder="109876543210" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Business account ID</Label>
                  <Input value={cfg.businessAccountId ?? ""} onChange={(e) => setCfg(provider, "businessAccountId", e.target.value)} placeholder="WABA ID" />
                </div>
                <p className="sm:col-span-2 text-[11px] text-muted-foreground">
                  Access token server par secret ke roop me store hota hai — yahan kabhi show nahi hota.
                </p>
              </div>
            )}

            <footer className="mt-4 flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => saveOne.mutate(provider)} disabled={saveOne.isPending}>
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={() => runTest.mutate(provider)} disabled={runTest.isPending}>
                <PlugZap className="mr-1 h-4 w-4" /> Test connection
              </Button>
              {res && (
                <span className={`inline-flex items-center gap-1 text-xs ${res.ok ? "text-emerald-500" : "text-destructive"}`}>
                  {res.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                  {res.message}
                </span>
              )}
            </footer>
          </section>
        );
      })}
    </div>
  );
}

/** Live check: kaunsa niche detect hua aur kaunsi image queries banengi. */
function NicheTester() {
  const detect = useServerFn(detectNiche);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const run = useMutation({
    mutationFn: async () => detect({ data: { name, category, withSamples: true } }),
    onError: (e: any) => toast.error(e?.message ?? "Detection failed"),
  });
  const res = run.data as any;

  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <p className="mb-2 text-xs font-semibold">Test niche detection</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Business name (e.g. Rani Mehndi Art)" />
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category (any language)" />
      </div>
      <Button size="sm" className="mt-2" onClick={() => run.mutate()} disabled={run.isPending}>
        <Sparkles className="mr-1 h-4 w-4" /> {run.isPending ? "Detecting…" : "Detect"}
      </Button>
      {res?.profile && (
        <div className="mt-3 space-y-2 text-xs">
          <p>
            <span className="text-muted-foreground">Niche:</span>{" "}
            <b>{res.profile.subcategory}</b> · {res.profile.industry} · <span className="text-muted-foreground">{res.profile.source}</span>
          </p>
          <p className="text-muted-foreground">Hero queries: {(res.queries?.hero ?? []).join(" · ")}</p>
          <div className="flex flex-wrap gap-2">
            {(res.samples ?? []).map((u: string) => (
              <img key={u} src={u} alt="Sample niche photo" loading="lazy" className="h-16 w-24 rounded-lg object-cover" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
