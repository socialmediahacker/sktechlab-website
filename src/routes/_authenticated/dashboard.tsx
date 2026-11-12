import { TemplateCover } from "@/components/template-cover";
import { DomainWorkspace } from "@/components/domains/DomainWorkspace";
import { ShopUpgradeCard } from "@/components/dashboard/ShopUpgradeCard";
import { TemplateImage } from "@/components/template-image";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient, useMutation, useQuery } from "@tanstack/react-query";
import { Suspense, useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { mySitesQuery, myOrdersQuery, myProfileQuery, categoriesQuery, categoryBySlugQuery, myDomainRequestsQuery, myTicketsQuery, myInvoicesQuery, domainRootsQuery } from "@/lib/queries";
import { templateThumb } from "@/lib/thumb";
import { makeSiteSlug } from "@/lib/site-slug";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Plus, Globe, ShoppingBag, TrendingUp, MapPin, LogOut, Sparkles, MessageSquare, Clock,
  LayoutDashboard, LifeBuoy, Link2, CreditCard, User, Star,
} from "lucide-react";
import { AdminHero, StatGrid, AdminLayout, AdminSideNav, AdminMobileStack, tileFor } from "@/components/admin/AdminShell";
import { useIsMobile } from "@/hooks/use-mobile";
import { MediaUploadButton } from "@/components/media-upload";
import { StorePanel } from "@/components/store/StorePanel";
import { useServerFn } from "@tanstack/react-start";
import { getMyCommerceEntitlement } from "@/lib/commerce.functions";
import { PayGateways } from "@/components/billing/PayGateways";
import { ReviewsManager } from "@/components/dashboard/ReviewsManager";



export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "My websites — SKTECHLAB" }, { name: "description", content: "Manage your SKTECHLAB websites, site administration, payments and requests." }, { property: "og:title", content: "My websites — SKTECHLAB" }, { property: "og:description", content: "Manage your websites and site administration." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(mySitesQuery),
      context.queryClient.ensureQueryData(myOrdersQuery),
      context.queryClient.ensureQueryData(myProfileQuery),

    ]);
  },
  component: Dashboard,
});


const rupees = new Intl.NumberFormat("en-IN");

function Dashboard() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname.startsWith("/dashboard/sites/")) return <Outlet />;

  return <DashboardHome />;
}

const NAV = [

  { value: "overview", label: "Overview", Icon: LayoutDashboard },
  { value: "sites", label: "My websites", Icon: Globe },
  { value: "reviews", label: "Reviews", Icon: Star },
  { value: "templates", label: "New from template", Icon: Sparkles },
  { value: "domains", label: "Domains", Icon: Link2 },
  { value: "billing", label: "Plan & billing", Icon: CreditCard },
  { value: "orders", label: "Service orders", Icon: ShoppingBag },
  { value: "support", label: "Support", Icon: LifeBuoy },
  { value: "profile", label: "Profile", Icon: User },
];


function DashboardHome() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: sites } = useSuspenseQuery(mySitesQuery);
  const { data: orders } = useSuspenseQuery(myOrdersQuery);
  const { data: profile } = useSuspenseQuery(myProfileQuery);
  const [tab, setTab] = useState("overview");
  const isMobile = useIsMobile(1024);

  // Phones start on the section list so every option is one tap away.
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) setTab("");
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  };

  const { data: tickets } = useQuery(myTicketsQuery);
  const { data: domains } = useQuery(myDomainRequestsQuery);

  // The e-commerce console only exists for customers on a shop plan / +Shop add-on.
  const entitlementFn = useServerFn(getMyCommerceEntitlement);
  const { data: commerceEnt } = useQuery({
    queryKey: ["my_commerce_entitlement"],
    // After sign-out the token is gone; treat that as "no store" instead of crashing.
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { enabled: false } as any;
      return await entitlementFn({});
    },
    retry: false,
    staleTime: 60_000,
  });
  const hasStore = !!commerceEnt?.enabled;
  const nav = [...NAV.slice(0, 2), { value: "store", label: hasStore ? "My shop" : "Shop plans & upgrade", Icon: ShoppingBag }, ...NAV.slice(2)];
  const liveSites = (sites ?? []).filter((s: any) => s.published).length;
  const openTickets = (tickets ?? []).filter((t: any) => t.status !== "closed").length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:py-10">
        <AdminHero
          Icon={LayoutDashboard}
          avatarUrl={profile?.avatar_url ?? null}
          avatarName={profile?.full_name ?? "there"}
          title={`Hi ${profile?.full_name || "there"}`}
          sticker="👋"
          subtitle="Manage your websites, domains, plans and services — all in one place."
          badge={(profile?.plan_tier || profile?.plan || "trial").toString().toUpperCase()}

          right={
            <Button variant="ghost" size={isMobile ? "sm" : "default"} onClick={signOut} className="shrink-0">
              <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sign out</span>
            </Button>
          }
        />

        {(() => {
          const goTab = (t: string) => {
            setTab(t);
            if (isMobile) {
              window.setTimeout(() => {
                document.getElementById(`sec-${t}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 120);
            }
          };
          const panels: Record<string, React.ReactNode> = {
            overview: (
              <div>
                <section className="project-library-hero mb-6 overflow-hidden rounded-3xl p-6 text-white sm:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-lime-200">YOUR BUSINESS / YOUR SPACE</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your next big idea.<br />Ready for the world.</h2><p className="mt-3 max-w-md text-sm leading-6 text-slate-300">Start with a beautiful project. Make it yours with your logo, colours, images and content.</p></div><Button className="bg-lime-300 text-slate-950 hover:bg-lime-200" onClick={() => goTab("templates")}><Plus className="mr-2 h-4 w-4" />Create a website</Button></div></section>
                <StatGrid
                  stats={[
                    { label: "Websites", value: (sites ?? []).length, hint: `${liveSites} live`, Icon: Globe },
                    { label: "Services", value: (orders ?? []).length, hint: "Orders placed", Icon: ShoppingBag },
                    { label: "Domains", value: (domains ?? []).length, hint: "Requests", Icon: Link2 },
                    { label: "Tickets", value: openTickets, hint: `${(tickets ?? []).length} total`, Icon: LifeBuoy },
                  ]}
                />
                <TrialBanner profile={profile} />
                <MyPlanCard />
                <QuickActions onGo={goTab} />
                <SitesList sites={sites} compact />
              </div>
            ),
            sites: <SitesList sites={sites} />,
            store: <StoreAdminTab sites={sites} />,
            reviews: <ReviewsManager sites={sites ?? []} />,
            templates: <TemplatePicker />,
            domains: <div className="space-y-6"><DomainWorkspace sites={sites} /><details className="rounded-2xl border border-border bg-card p-5"><summary className="cursor-pointer text-sm font-semibold">Connect an existing domain & DNS requests</summary><div className="mt-5"><DomainRequests /></div></details></div>,
            billing: (
              <div>
                <TrialBanner profile={profile} />
                <MyPlanCard />
                <PayGateways />
                <MyBillingCard />
                <div className="glass rounded-2xl p-4 text-sm text-muted-foreground sm:p-6">
                  Need a bigger plan or an e-commerce upgrade?{" "}
                  <Link to="/pricing" className="font-semibold text-brand-glow underline">See all plans →</Link>
                </div>
              </div>
            ),
            orders: <ServiceOrders orders={orders} />,
            support: <SupportTickets />,
            profile: <ProfileSettings profile={profile} onSignOut={signOut} />,
          };

          if (isMobile) {
            const safePanels = Object.fromEntries(Object.entries(panels).map(([key, panel]) => [key, <Suspense key={key} fallback={<p className="p-6 text-sm text-muted-foreground">Loading this workspace…</p>}>{panel}</Suspense>]));
            return <AdminMobileStack items={nav} active={tab} onSelect={setTab} panels={safePanels} />;
          }
          return (
            <AdminLayout side={<AdminSideNav items={nav} active={tab || "overview"} onSelect={setTab} />}>
              <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Loading this workspace…</p>}>{panels[tab || "overview"]}</Suspense>
            </AdminLayout>
          );
        })()}
      </main>
      <SiteFooter />
    </div>
  );
}

function QuickActions({ onGo }: { onGo: (t: string) => void }) {
  const items = [
    { label: "Create a new site", desc: "Pick a template & go live", Icon: Plus, go: "templates" },
    { label: "Buy / connect domain", desc: "Live search, price & checkout", Icon: Link2, go: "domains" },
    { label: "Manage your shop", desc: "Products, access & upgrades", Icon: ShoppingBag, go: "store" },
    { label: "Request a change", desc: "Our team will do it", Icon: MessageSquare, go: "support" },
    { label: "Plan & invoices", desc: "Billing and validity", Icon: CreditCard, go: "billing" },
  ];
  return (
    <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((it, i) => (
        <button key={it.label} onClick={() => onGo(it.go)}
          className="glass group rounded-2xl p-4 text-left shadow-soft transition hover:shadow-card">
          <span className={`mb-3 grid h-10 w-10 place-items-center rounded-xl text-brand-foreground shadow-glow ${tileFor(i)}`}>
            <it.Icon className="h-5 w-5" />
          </span>
          <div className="text-sm font-semibold">{it.label}</div>
          <div className="text-xs text-muted-foreground">{it.desc}</div>
        </button>
      ))}
    </div>
  );
}

function SitesList({ sites, compact }: { sites: any[]; compact?: boolean }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = sites.filter(site => (!search || `${site.name} ${site.subdomain || ""}`.toLowerCase().includes(search.toLowerCase())) && (status === "all" || (status === "live" ? site.published && !site.suspended : status === "suspended" ? site.suspended : !site.published)));
  const list = compact ? sites.slice(0, 3) : filtered;
  return (
    <section className="mb-10">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold sm:text-xl">
          <Globe className="h-5 w-5 text-brand-glow" /> Your websites
        </h2>
        <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground shadow-glow">
          <Link to="/categories"><Plus className="mr-1 h-4 w-4" /> New site</Link>
        </Button>
      </div>

      {!compact && sites.length > 0 && <div className="mb-4 flex flex-wrap gap-3"><Input aria-label="Search your websites" placeholder="Search website name or address…" className="min-w-[180px] flex-1" value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Filter website status" className="rounded-xl border border-input bg-background px-3 text-sm" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All websites</option><option value="live">Live</option><option value="draft">Draft</option><option value="suspended">Suspended</option></select></div>}
      {list.length === 0 ? (
        <div className="glass rounded-2xl p-6 text-center sm:p-10">
          <p className="text-muted-foreground">{sites.length ? "No websites match your search. Try a different name or status." : "No websites yet. Pick a template to get started."}</p>
          <Button asChild className="mt-4 bg-gradient-brand text-brand-foreground shadow-glow">
            <Link to="/categories">Browse templates</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {list.map((s: any) => (
            <div
              key={s.id}
              className="glass flex items-center gap-3 overflow-hidden rounded-2xl p-3 shadow-card transition hover:shadow-glow sm:block sm:p-0"
            >
              {(
                <div className="h-[72px] w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:aspect-[4/3] sm:h-auto sm:w-full sm:rounded-none">
                  <TemplateImage
                    t={s.templates || { name: s.name }}
                    w={400}
                    alt={s.name}
                    className="h-full w-full object-cover transition duration-500 hover:scale-105"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1 sm:p-5">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {s.suspended ? "Suspended" : s.published ? "Published" : "Draft"} · {new Date(s.created_at).toLocaleDateString()}
                </div>
                <div className="mt-2 flex gap-2 sm:mt-4">
                  <Button asChild size="sm" className="flex-1 bg-gradient-brand text-brand-foreground">
                    <Link to="/dashboard/sites/$id" params={{ id: s.id }}>Site admin</Link>
                  </Button>
                  {s.subdomain && (
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <a href={`/${s.subdomain}`} target="_blank" rel="noreferrer">View live</a>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ServiceOrders({ orders }: { orders: any[] }) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <ShoppingBag className="h-5 w-5 text-brand-glow" /> Service orders
      </h2>
      {orders.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">No service orders yet.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button asChild variant="outline">
              <Link to="/services/digital-marketing"><TrendingUp className="mr-2 h-4 w-4" /> Digital Marketing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/services/gmb-boost"><MapPin className="mr-2 h-4 w-4" /> GMB Boost</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
        <div className="hidden overflow-x-auto rounded-2xl md:block md:glass">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-4">Plan</th><th className="p-4">Type</th><th className="p-4">Price</th>
                <th className="p-4">Status</th><th className="p-4">Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id} className="border-t border-border/60">
                  <td className="p-4 font-medium">{o.service_plans?.name}</td>
                  <td className="p-4 text-muted-foreground">
                    {o.service_plans?.service_type === "digital_marketing" ? "Digital Marketing" : "GMB Boost"}
                  </td>
                  <td className="p-4">₹{rupees.format(o.service_plans?.price_inr ?? 0)}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs capitalize text-brand-glow">{o.status}</span>
                  </td>
                  <td className="p-4 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 md:hidden">
          {orders.map((o: any) => (
            <article key={o.id} className="glass rounded-2xl p-4 shadow-soft">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">{o.service_plans?.name ?? "Service plan"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {o.service_plans?.service_type === "digital_marketing" ? "Digital Marketing" : "GMB Boost"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-brand/20 px-2 py-0.5 text-xs capitalize text-brand-glow">{o.status}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Price</p><p className="font-semibold">₹{rupees.format(o.service_plans?.price_inr ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Placed</p><p>{new Date(o.created_at).toLocaleDateString()}</p></div>
              </div>
            </article>
          ))}
        </div>
        </>
      )}
    </section>
  );
}

function ProfileSettings({ profile, onSignOut }: { profile: any; onSignOut: () => void }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [avatar, setAvatar] = useState(profile?.avatar_url ?? "");

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("profiles")
        .update({ full_name: fullName.trim(), avatar_url: avatar || null })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Profile updated"); qc.invalidateQueries({ queryKey: ["my_profile"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-6">
      <h2 className="flex items-center gap-2 text-xl font-semibold">
        <User className="h-5 w-5 text-brand-glow" /> Profile & account
      </h2>
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-2xl bg-gradient-brand text-brand-foreground shadow-glow">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <User className="h-7 w-7" />}
          </div>
          <MediaUploadButton label="Upload photo" onUploaded={(u) => u[0] && setAvatar(u[0])} />
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <Label className="text-xs">WhatsApp number</Label>
            <Input value={profile?.whatsapp_number ?? "—"} readOnly className="bg-muted/40" />
          </div>
          <div>
            <Label className="text-xs">Current plan</Label>
            <Input value={(profile?.active_plan || profile?.plan_tier || "trial").toString()} readOnly className="bg-muted/40 capitalize" />
          </div>
          <div>
            <Label className="text-xs">Avatar URL</Label>
            <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://…" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onSignOut}><LogOut className="mr-2 h-4 w-4" /> Sign out</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}
            className="bg-gradient-brand text-brand-foreground shadow-glow">
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </section>
  );
}


function FreeSubdomainCard() {
  const qc = useQueryClient();
  const { data: roots } = useQuery(domainRootsQuery);
  const { data: sites } = useSuspenseQuery(mySitesQuery);
  const active = (roots ?? []).filter((r: any) => r.is_active);
  const [sub, setSub] = useState("");
  const [root, setRoot] = useState("");
  const [siteId, setSiteId] = useState("");

  const chosenRoot = root || active[0]?.root || "";

  const create = useMutation({
    mutationFn: async () => {
      const clean = sub.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
      if (clean.length < 3) throw new Error("Subdomain must be at least 3 characters");
      if (!siteId) throw new Error("Select which website this is for");
      if (!chosenRoot) throw new Error("No free domain roots available yet");
      const { data: clash } = await supabase.from("sites").select("id").eq("subdomain", clean).maybeSingle();
      if (clash) throw new Error("That subdomain is already taken");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");

      const { error: siteErr } = await supabase.from("sites").update({ subdomain: clean, published: true }).eq("id", siteId);
      if (siteErr) throw siteErr;
      const rootRow = active.find((r: any) => r.root === chosenRoot);
      const { error } = await supabase.from("domain_requests").insert({
        user_id: user.id,
        site_id: siteId,
        domain: `${clean}.${chosenRoot}`,
        kind: "free",
        status: "connected",
        record_type: "A",
        record_name: clean,
        record_value: rootRow?.a_record ?? null,
        verified_at: new Date().toISOString(),
      });
      if (error) throw error;
      return `${clean}.${chosenRoot}`;
    },
    onSuccess: (d) => {
      toast.success(`${d} connected — your site is live.`);
      setSub("");
      qc.invalidateQueries({ queryKey: ["my_domain_requests"] });
      qc.invalidateQueries({ queryKey: ["my_sites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass mb-6 rounded-2xl p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-emerald-500" />
        <h3 className="font-bold">Free subdomain — connects instantly</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">Pick a name and it goes live right away. No DNS setup needed.</p>
      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <Label className="text-xs">Subdomain</Label>
          <Input placeholder="mybusiness" value={sub} onChange={(e) => setSub(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Root</Label>
          <select value={chosenRoot} onChange={(e) => setRoot(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {active.map((r: any) => <option key={r.id} value={r.root}>.{r.root}</option>)}
            {!active.length ? <option value="">No roots available</option> : null}
          </select>
        </div>
        <div>
          <Label className="text-xs">Website</Label>
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="">— select —</option>
            {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <Button className="w-full bg-gradient-brand text-brand-foreground shadow-glow" disabled={create.isPending} onClick={() => create.mutate()}>
            Connect free
          </Button>
        </div>
      </div>
      {sub.trim() && chosenRoot ? (
        <p className="mt-3 font-mono text-xs text-muted-foreground">→ {sub.trim().toLowerCase().replace(/[^a-z0-9-]/g, "")}.{chosenRoot}</p>
      ) : null}
    </div>
  );
}

function DomainRequests() {
  const qc = useQueryClient();
  const { data: reqs } = useQuery(myDomainRequestsQuery);
  const { data: sites } = useSuspenseQuery(mySitesQuery);
  const { data: roots } = useQuery(domainRootsQuery);
  const [domain, setDomain] = useState("");
  const [siteId, setSiteId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState<"nameserver" | "buy">("nameserver");

  const activeRoot: any = (roots ?? []).find((r: any) => r.is_active);
  const nameservers: string[] = (activeRoot?.nameservers as string[] | undefined) ?? [];
  const aRecord: string = activeRoot?.a_record || "185.158.133.1";

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");
      const { error } = await supabase.from("domain_requests").insert({
        user_id: user.id,
        domain: domain.trim(),
        site_id: siteId || null,
        notes: notes || null,
        kind,
        is_paid_suggestion: kind === "buy",
        record_type: kind === "nameserver" ? "NS" : "A",
        record_value: kind === "nameserver" ? nameservers.join(", ") : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Domain request submitted! Our team will contact you on WhatsApp.");
      setDomain(""); setNotes(""); setSiteId("");
      qc.invalidateQueries({ queryKey: ["my_domain_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
        <Globe className="h-5 w-5 text-brand-glow" /> Domains
      </h2>
      <FreeSubdomainCard />
      <div className="glass rounded-2xl p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Custom domain (yourbusiness.com)? Connect the one you own with our name servers, or let us buy and set it up for you.
        </p>
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${kind === "nameserver" ? "border-emerald-500 bg-emerald-500/5" : "border-border"}`}>
            <input type="radio" className="mt-1" checked={kind === "nameserver"} onChange={() => setKind("nameserver")} />
            <div>
              <div className="text-sm font-semibold">Connect with name servers</div>
              <div className="mt-1 font-mono text-xs text-muted-foreground">{nameservers.length ? nameservers.join(" • ") : "Our team will send your name servers"}</div>
            </div>
          </label>
          <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 ${kind === "buy" ? "border-emerald-500 bg-emerald-500/5" : "border-border"}`}>
            <input type="radio" className="mt-1" checked={kind === "buy"} onChange={() => setKind("buy")} />
            <div>
              <div className="text-sm font-semibold">Buy with SKTECHLAB</div>
              <div className="mt-1 text-xs text-muted-foreground">We purchase, configure and connect it for you.</div>
            </div>
          </label>
        </div>

        <DnsRecordsCard ip={aRecord} nameservers={nameservers} />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <Label className="text-xs">Domain name *</Label>
            <Input className="w-full" placeholder="yourbusiness.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="min-w-0">
            <Label className="text-xs">For site (optional)</Label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— select —</option>
              {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button onClick={() => submit.mutate()} disabled={!domain.trim() || submit.isPending} className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
              Request domain
            </Button>
          </div>
        </div>
        <Textarea placeholder="Notes (registrar, DNS provider, etc.)" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-3 w-full" />

        {reqs && reqs.length > 0 && (
          <div className="mt-6 space-y-2">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Your requests</div>
            {reqs.map((r: any) => (
              <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                <div className="min-w-0 truncate font-medium">{r.domain}</div>
                <span className="shrink-0 rounded-full bg-brand/20 px-2 py-0.5 text-xs capitalize text-brand-glow">{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** Copy-paste DNS settings a customer must add at their registrar. */
function DnsRecordsCard({ ip, nameservers }: { ip: string; nameservers: string[] }) {
  const copy = (v: string) => {
    navigator.clipboard?.writeText(v).then(
      () => toast.success("Copied"),
      () => toast.error("Copy failed"),
    );
  };
  const rows = [
    { type: "A", name: "@", value: ip },
    { type: "A", name: "www", value: ip },
  ];
  return (
    <div className="mb-4 rounded-2xl border border-border/60 bg-muted/20 p-3 sm:p-4">
      <div className="mb-2 text-sm font-semibold">DNS settings for your domain</div>
      <p className="mb-3 text-xs text-muted-foreground">
        Add these at your domain provider (GoDaddy, Hostinger, Cloudflare…). Changes can take up to 24 hours.
      </p>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-background/60 px-3 py-2">
            <span className="shrink-0 rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand-glow">{r.type}</span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase text-muted-foreground">Name: {r.name}</div>
              <div className="truncate font-mono text-sm">{r.value}</div>
            </div>
            <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => copy(r.value)}>
              Copy
            </Button>
          </div>
        ))}
        {nameservers.length ? (
          <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-xl bg-background/60 px-3 py-2">
            <span className="shrink-0 rounded-md bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand-glow">NS</span>
            <div className="min-w-0">
              <div className="text-[11px] uppercase text-muted-foreground">Name servers</div>
              <div className="truncate font-mono text-sm">{nameservers.join(", ")}</div>
            </div>
            <Button type="button" size="sm" variant="ghost" className="shrink-0" onClick={() => copy(nameservers.join("\n"))}>
              Copy
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}



function TemplatePicker() {
  const navigate = useNavigate();
  const { data: cats } = useSuspenseQuery(categoriesQuery);
  const [catSlug, setCatSlug] = useState<string>(cats[0]?.slug ?? "");
  const [search, setSearch] = useState("");
  const [subId, setSubId] = useState<string | null>(null);
  const { data: cat } = useSuspenseQuery(categoryBySlugQuery(catSlug));
  const qc = useQueryClient();

  const subs = cat?.subcategories ?? [];
  const templates = useMemo(() => {
    const all = cat?.templates ?? [];
    return all.filter((t: any) => (!subId || t.subcategory_id === subId) && (!search || `${t.name} ${t.description || ""}`.toLowerCase().includes(search.toLowerCase())));
  }, [cat, subId, search]);


  return (
    <section className="mb-12">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-brand-glow" />
        <h2 className="text-xl font-semibold">Choose a template</h2>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Business category<select aria-label="Choose template category" className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground" value={catSlug} onChange={event => { setCatSlug(event.target.value); setSubId(null); setSearch(""); }}>{cats.map((c: any) => <option key={c.id} value={c.slug}>{c.name} ({c.templates?.[0]?.count ?? 0})</option>)}</select></label><label className="text-xs text-muted-foreground">Find your design<Input className="mt-2" placeholder="Search templates…" value={search} onChange={event => setSearch(event.target.value)} /></label></div>

      {subs.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button onClick={() => setSubId(null)} className={`rounded-full px-3 py-1 text-[11px] ${!subId ? "bg-brand/30 text-brand-glow" : "bg-muted/40"}`}>All</button>
          {subs.map((s: any) => (
            <button key={s.id} onClick={() => setSubId(s.id)} className={`rounded-full px-3 py-1 text-[11px] ${subId === s.id ? "bg-brand/30 text-brand-glow" : "bg-muted/40"}`}>{s.name}</button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {templates.slice(0, 12).map((t: any) => (
          <div key={t.id} className="glass overflow-hidden rounded-2xl transition hover:shadow-glow">
            <div className="aspect-[4/3]"><TemplateCover t={{ ...t, category_slug: catSlug }} index={[...(cat?.templates || [])].sort((a: any, b: any) => a.id.localeCompare(b.id)).findIndex((r: any) => r.id === t.id)} /></div>
            <div className="p-3">
              <div className="text-sm font-medium">{t.name}</div>
              <div className="mt-2 flex gap-1.5">
                <Button asChild size="sm" variant="outline" className="flex-1 h-8 text-xs">
                  <Link
                    to={t.is_editable_demo ? "/preview/$templateId" : "/templates/$id"}
                    params={t.is_editable_demo ? { templateId: t.id } : { id: t.id }}
                  >
                    Preview
                  </Link>
                </Button>
                <Button size="sm" className="flex-1 h-8 bg-gradient-brand text-brand-foreground text-xs" onClick={() => navigate({ to: "/start", search: { category: cat?.slug, template: t.id } })}>Use</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {!templates.length && <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No templates found. Choose another category or search term.</p>}
      {templates.length > 12 && (
        <div className="mt-4 text-center">
          <Button asChild variant="outline"><Link to="/categories/$slug" params={{ slug: catSlug }}>See all {templates.length} templates →</Link></Button>
        </div>
      )}
    </section>
  );
}

function TrialBanner({ profile }: { profile: any }) {
  if (!profile?.trial_ends_at) return null;
  const endsAt = new Date(profile.trial_ends_at);
  const now = new Date();
  const daysLeft = Math.ceil((endsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const active = daysLeft > 0 && profile.plan_tier === "trial";
  return (
    <div className={`mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 ${active ? "border-brand/40 bg-brand/10" : "border-destructive/40 bg-destructive/10"}`}>
      <div className="flex items-center gap-3">
        <Clock className={`h-5 w-5 ${active ? "text-brand-glow" : "text-destructive"}`} />
        <div>
          <div className="font-semibold">
            {active ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} free trial left` : "Free trial ended"}
          </div>
          <div className="text-xs text-muted-foreground">
            {active ? "All features unlocked. Upgrade anytime to keep your sites live." : "Upgrade to a plan to keep your sites live and unlock premium templates."}
          </div>
        </div>
      </div>
      <Button asChild size="sm" className="bg-gradient-brand text-brand-foreground shadow-glow">
        <Link to="/pricing">View plans</Link>
      </Button>
    </div>
  );
}

function MyPlanCard() {
  const { data: profile } = useSuspenseQuery(myProfileQuery);
  const { data: orders } = useQuery({
    queryKey: ["my_active_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, service_plans(name, tier, service_type, price_inr, billing)")
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  if ((!orders || orders.length === 0) && !profile?.active_plan && !profile?.plan_tier) return null;
  if (!orders || orders.length === 0) {
    return (
      <div className="mb-8 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-brand-glow">Current website plan</div>
        <div className="mt-1 text-lg font-bold capitalize">{profile?.active_plan ?? profile?.plan_tier}</div>
        <div className="text-xs text-muted-foreground">Assigned by admin</div>
      </div>
    );
  }
  return (
    <div className="mb-8 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {orders.map((o: any) => (
        <div key={o.id} className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold uppercase tracking-wider text-brand-glow">{o.service_plans?.service_type ?? "Plan"}</div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${o.status === "active" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>{o.status}</span>
          </div>
          <div className="mt-1 text-lg font-bold">{o.service_plans?.name ?? "Active plan"}</div>
          <div className="text-xs text-muted-foreground">
            ₹{o.service_plans?.price_inr?.toLocaleString?.() ?? "—"} / {o.service_plans?.billing ?? "month"}
          </div>
        </div>
      ))}
    </div>
  );
}

function MyBillingCard() {
  const { data: invoices } = useQuery(myInvoicesQuery);
  if (!invoices || invoices.length === 0) return null;
  const latest: any = invoices[0];
  const validTill = latest.period_end ? new Date(latest.period_end) : null;
  const daysLeft = validTill ? Math.ceil((validTill.getTime() - Date.now()) / 86400000) : null;
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Billing &amp; invoices</h2>
        {daysLeft !== null && (
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${daysLeft > 7 ? "bg-emerald-500/20 text-emerald-300" : daysLeft > 0 ? "bg-amber-500/20 text-amber-300" : "bg-red-500/20 text-red-300"}`}>
            {daysLeft > 0 ? `${daysLeft} days left` : "Expired"}
          </span>
        )}
      </div>
      <div className="hidden overflow-x-auto rounded-2xl md:block md:glass">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">Invoice</th><th className="p-3">Plan</th><th className="p-3">Amount</th>
              <th className="p-3">Status</th><th className="p-3">Valid till</th>
            </tr>
          </thead>
          <tbody>
            {(invoices as any[]).map((inv) => (
              <tr key={inv.id} className="border-t border-border/60">
                <td className="p-3 font-mono">#{inv.invoice_no}</td>
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
      <div className="space-y-3 md:hidden">
        {(invoices as any[]).map((inv) => (
          <article key={inv.id} className="glass rounded-2xl p-4 shadow-soft">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm">#{inv.invoice_no}</p>
                <p className="truncate text-xs text-muted-foreground">{inv.plan_name || "Plan invoice"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-brand/20 px-2 py-0.5 text-xs capitalize text-brand-glow">{inv.status}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border/60 pt-3 text-sm">
              <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">₹{Number(inv.total_inr).toLocaleString("en-IN")}</p></div>
              <div><p className="text-xs text-muted-foreground">Valid till</p><p>{inv.period_end ? new Date(inv.period_end).toLocaleDateString() : "—"}</p></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SupportTickets() {

  const qc = useQueryClient();
  const { data: sites } = useSuspenseQuery(mySitesQuery);
  const { data: tickets } = useQuery(myTicketsQuery);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [siteId, setSiteId] = useState<string>("");
  const [priority, setPriority] = useState<string>("normal");
  const [requestType, setRequestType] = useState<string>("change_request");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  // Custom form fields - user can add their own key/value pairs
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);

  const addField = () => setCustomFields([...customFields, { key: "", value: "" }]);
  const updateField = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setCustomFields(customFields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeField = (i: number) => setCustomFields(customFields.filter((_, idx) => idx !== i));

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");

      // Upload attachments to storage
      const attachments: Array<{ name: string; url: string; size: number; type: string }> = [];
      if (files.length) {
        setUploading(true);
        try {
          for (const f of files) {
            const path = `${user.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
            const { error: upErr } = await supabase.storage.from("ticket-attachments").upload(path, f, { upsert: false });
            if (upErr) throw upErr;
            const { data: signed } = await supabase.storage.from("ticket-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
            attachments.push({ name: f.name, url: signed?.signedUrl ?? path, size: f.size, type: f.type });
          }
        } finally {
          setUploading(false);
        }
      }

      const custom_fields: Record<string, string> = {};
      customFields.forEach(f => { if (f.key.trim()) custom_fields[f.key.trim()] = f.value; });

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        subject: subject.trim(),
        message: message.trim(),
        site_id: siteId || null,
        priority,
        category: requestType,
        request_type: requestType,
        attachments,
        custom_fields,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket sent to admin! Reply WhatsApp / dashboard par milega.");
      setSubject(""); setMessage(""); setSiteId(""); setPriority("normal");
      setFiles([]); setCustomFields([]); setRequestType("change_request");
      qc.invalidateQueries({ queryKey: ["my_tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="mb-12">
      <h2 className="mb-4 text-xl font-semibold flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-brand-glow" /> Request changes / Custom website (Ticket to Admin)
      </h2>
      <div className="glass rounded-2xl p-4 sm:p-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Chahiye koi change ya apni marzi ki custom website? Form fill karo, images / docs / videos attach karo — SKTECHLAB team karke degi.
        </p>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="text-xs">Subject *</Label>
            <Input placeholder="e.g. Change banner text / Build me a custom shop" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Type</Label>
            <select value={requestType} onChange={(e) => setRequestType(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="change_request">Change on existing site</option>
              <option value="custom_website">Custom website (build for me)</option>
              <option value="bug">Bug / issue</option>
              <option value="billing">Billing question</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Priority</Label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="md:col-span-4">
            <Label className="text-xs">Site (optional)</Label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— select a site (leave empty for custom request) —</option>
              {sites.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <Textarea placeholder="Detailed description — colors, sections, references, business info..." value={message} onChange={(e) => setMessage(e.target.value)} className="mt-3 min-h-[120px]" />

        {/* Attachments */}
        <div className="mt-4 rounded-lg border border-dashed border-border/60 p-4">
          <Label className="text-xs font-semibold">Attach files (images, docs, videos)</Label>
          <input
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand/20 file:px-3 file:py-1.5 file:text-xs file:text-brand-glow"
          />
          {files.length > 0 && (
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {files.map((f, i) => <li key={i}>📎 {f.name} <span className="opacity-60">({(f.size/1024).toFixed(0)} KB)</span></li>)}
            </ul>
          )}
        </div>

        {/* Custom form fields */}
        <div className="mt-4 rounded-lg border border-dashed border-border/60 p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <Label className="min-w-0 text-xs font-semibold">Custom form fields (business name, colors, timings, anything)</Label>
            <Button type="button" size="sm" variant="outline" onClick={addField}>+ Add</Button>
          </div>
          {customFields.length > 0 && (
            <div className="mt-3 space-y-2">
              {customFields.map((f, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:grid-cols-[1fr_2fr_auto]">
                  <Input placeholder="Field name (e.g. Business phone)" value={f.key} onChange={(e) => updateField(i, { key: e.target.value })} />
                  <Input className="col-start-1 sm:col-auto" placeholder="Value" value={f.value} onChange={(e) => updateField(i, { value: e.target.value })} />
                  <Button type="button" size="sm" variant="ghost" onClick={() => removeField(i)}>✕</Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={() => submit.mutate()} disabled={!subject.trim() || !message.trim() || submit.isPending || uploading} className="w-full bg-gradient-brand text-brand-foreground shadow-glow sm:w-auto">
            {uploading ? "Uploading..." : submit.isPending ? "Sending..." : "Send ticket to admin"}
          </Button>
        </div>

        {tickets && tickets.length > 0 && (
          <div className="mt-6 space-y-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Your tickets</div>
            {tickets.map((t: any) => (
              <div key={t.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{t.subject}</div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t.priority}</span>
                    <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs capitalize text-brand-glow">{t.status}</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{t.message}</div>
                {t.sites?.name && <div className="mt-1 text-[11px] text-muted-foreground">Site: {t.sites.name}</div>}
                {Array.isArray(t.attachments) && t.attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {t.attachments.map((a: any, i: number) => (
                      <a key={i} href={a.url} target="_blank" rel="noreferrer" className="rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] hover:bg-muted">
                        📎 {a.name}
                      </a>
                    ))}
                  </div>
                )}
                {t.custom_fields && Object.keys(t.custom_fields).length > 0 && (
                  <div className="mt-2 grid grid-cols-2 gap-1 text-[11px]">
                    {Object.entries(t.custom_fields).map(([k, v]) => (
                      <div key={k}><span className="text-muted-foreground">{k}:</span> {String(v)}</div>
                    ))}
                  </div>
                )}
                {t.admin_reply && (
                  <div className="mt-2 rounded border-l-2 border-brand/60 bg-brand/10 p-2 text-xs">
                    <div className="mb-1 font-semibold text-brand-glow">Admin reply</div>
                    {t.admin_reply}
                  </div>
                )}
                <div className="mt-1 text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------- E-commerce (store) tab ------------------------- */
function StoreAdminTab({ sites }: { sites: any[] }) {
  const [siteId, setSiteId] = useState<string>(sites?.[0]?.id ?? "");
  const entitlementFn = useServerFn(getMyCommerceEntitlement);
  const { data: ent, isLoading: entLoading, isError: entError, refetch: reloadEntitlement } = useQuery({
    queryKey: ["my_commerce_entitlement"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { enabled: false } as any;
      return await entitlementFn({});
    },
    retry: false,
    staleTime: 60_000,
  });
  const { data: counts } = useQuery({
    queryKey: ["my_store_counts", (sites ?? []).map((s: any) => s.id).join(",")],
    queryFn: async () => {
      const ids = (sites ?? []).map((s: any) => s.id);
      if (!ids.length) return {} as Record<string, number>;
      const { data, error } = await supabase.from("products").select("id, site_id").in("site_id", ids);
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const p of data ?? []) map[p.site_id] = (map[p.site_id] ?? 0) + 1;
      return map;
    },
    enabled: (sites ?? []).length > 0,
  });

  if (entLoading) {
    return <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">Checking your plan…</div>;
  }

  if (entError || !ent) return <div role="alert" className="rounded-2xl border border-border bg-card p-6"><h3 className="font-semibold">We couldn't verify your shop access.</h3><p className="mt-2 text-sm text-muted-foreground">Refresh before changing your plan or making a payment.</p><Button variant="outline" className="mt-4" onClick={() => reloadEntitlement()}>Retry access check</Button></div>;
  if (!ent.enabled) return <ShopUpgradeCard sites={sites} reason={ent.reason} />;

  if (!sites?.length) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-brand-glow" />
        <p className="text-muted-foreground">Create a website first — then your store manager appears here.</p>
      </div>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4"><div><p className="text-sm font-semibold">{ent.plan} · {ent.reason === "trial" ? "Trial access" : "Shop active"}</p><p className="mt-1 text-xs text-muted-foreground">{ent.productLimit ? `Up to ${ent.productLimit} products` : "Unlimited products"}{ent.expiresAt ? ` · Valid until ${new Date(ent.expiresAt).toLocaleDateString("en-IN")}` : ""}</p></div><Button variant="outline" size="sm" onClick={() => reloadEntitlement()}>Refresh access</Button></div>
      {ent.reason === "trial" && <div className="mb-5"><ShopUpgradeCard compact sites={sites} reason="trial" /></div>}
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
        <ShoppingBag className="h-5 w-5 text-brand-glow" /> E-commerce manager
      </h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {sites.map((s: any, i: number) => (
          <button
            key={s.id}
            onClick={() => setSiteId(s.id)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${siteId === s.id ? "glass shadow-card" : "text-muted-foreground hover:text-foreground"}`}
          >
            <span className={`grid h-7 w-7 place-items-center rounded-lg text-brand-foreground ${tileFor(i)}`}>
              <ShoppingBag className="h-3.5 w-3.5" />
            </span>
            {s.name}
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{counts?.[s.id] ?? 0}</span>
          </button>
        ))}
      </div>
      {siteId ? (
        <div className="min-w-0 rounded-2xl border border-border bg-card">
          <StorePanel key={siteId} siteId={siteId} productLimit={ent?.productLimit ?? null} />
        </div>
      ) : null}
    </section>
  );
}

