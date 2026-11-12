import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Globe, CheckCircle2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { domainServiceInfo, searchDomain } from "@/lib/domains.functions";
import { toast } from "sonner";
export type DomainQuote = { quoteId: string; domain: string; priceInr: number; renewalInr: number; expiresAt: string; sandbox: boolean };
export function DomainSearch({ scope, onSelect, selected }: { scope: { sessionId?: string; siteId?: string }; onSelect: (q: DomainQuote) => void; selected?: string }) {
  const { data: service, isLoading } = useQuery({ queryKey: ["domain_service"], queryFn: () => domainServiceInfo() });
  const search = useServerFn(searchDomain), [name, setName] = useState(""), [busy, setBusy] = useState(false), [result, setResult] = useState<any>(null);
  useEffect(() => { setResult(null); }, [scope.siteId, scope.sessionId]);
  const run = async () => {
    setBusy(true); setResult(null);
    try { setResult(await search({ data: { domain: name, scope } })); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };
  if (isLoading) return <p className="p-4 text-sm text-muted-foreground">Checking domain service…</p>;
  if (!service?.enabled) return <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">New domain purchases are currently unavailable. You can use a free address or connect a domain you already own.</div>;
  return <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
    <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Globe className="h-5 w-5" /></span><div><h3 className="font-semibold">Find your perfect address</h3><p className="text-xs text-muted-foreground">Live availability · First-year and renewal prices shown separately</p></div></div>
    {service.sandbox && <p role="status" className="rounded-xl bg-amber-500/10 p-3 text-xs text-amber-800">Test environment: results are for testing. Purchases are disabled.</p>}
    <div className="flex gap-2"><Input aria-label="Domain to search" placeholder={`yourbusiness.${service.tlds[0] || "com"}`} value={name} onChange={e => { setName(e.target.value); setResult(null); }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); run(); } }} /><Button type="button" disabled={busy || !name.trim()} onClick={run}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">Check</span></Button></div>
    <p className="text-xs text-muted-foreground">Extensions: {service.tlds.map(t => `.${t}`).join(" · ") || "Ask admin to configure pricing"}</p>
    {result && <div role="status" className={`rounded-xl border p-4 ${result.available ? "border-primary/30 bg-primary/5" : "border-border"}`}>
      <p className="break-all font-semibold">{result.domain}</p>
      {result.available ? <><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><div><p className="text-xl font-semibold">₹{Number(result.priceInr).toLocaleString("en-IN")} <span className="text-xs font-normal text-muted-foreground">first year</span></p><p className="mt-1 text-xs text-muted-foreground">Renewal estimate ₹{Number(result.renewalInr).toLocaleString("en-IN")}/year · Subject to registrar pricing at renewal</p></div><Button type="button" disabled={result.sandbox || Date.parse(result.expiresAt) < Date.now()} onClick={() => onSelect(result)}>{selected === result.quoteId ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}{selected === result.quoteId ? "Selected" : "Choose domain"}</Button></div><p className="mt-3 text-[11px] text-muted-foreground">Available now. Quote expires in 15 minutes; registration is confirmed after payment and registrar processing.</p></> : <p className="mt-2 text-sm text-muted-foreground">{result.state === "taken" ? "Already registered. Try another name." : result.state === "premium" ? "Premium domain: contact support for a separate quote." : "Availability could not be confirmed. Please try again later."}</p>}
    </div>}
  </section>;
}
