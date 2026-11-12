import { OperationsOverview } from "@/components/admin/OperationsOverview";
import { DomainRegistrarAdmin } from "@/components/admin/DomainRegistrarAdmin";
import { ProjectLibrary } from "@/components/admin/ProjectLibrary";
import { TemplateImage } from "@/components/template-image";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BILLING_CYCLES } from "@/lib/billing-labels";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RolesAdmin } from "@/components/admin/RolesAdmin";
import { InvoicesAdmin } from "@/components/admin/InvoicesAdmin";
import { MessagesAdmin } from "@/components/admin/MessagesAdmin";
import { ActivityAdmin } from "@/components/admin/ActivityAdmin";
import { DomainRootsAdmin } from "@/components/admin/DomainRootsAdmin";
import { BillingAdmin } from "@/components/admin/BillingAdmin";
import { IntegrationsAdmin } from "@/components/admin/IntegrationsAdmin";
import { UpiGatewayAdmin } from "@/components/admin/UpiGatewayAdmin";
import { EmailAdmin } from "@/components/admin/EmailAdmin";

import { useServerFn } from "@tanstack/react-start";
import { adminPrepareDomain, adminVerifyDomain, adminActivateUserPlan } from "@/lib/admin.functions";

import { supabase } from "@/integrations/supabase/client";
import {
  isAdminQuery, categoriesQuery, adminAllPlansQuery, adminUsersQuery,
  adminSeoQuery, adminSiteSettingsQuery, allTemplatesQuery, adminDomainRequestsQuery, adminTicketsQuery,
  adminSitesQuery, adminCustomDevQuery, adminReviewsQuery, adminPaymentGatewaysQuery,
  myPermissionsQuery,
} from "@/lib/queries";

import { templateThumb } from "@/lib/thumb";
import { MediaUploadButton } from "@/components/media-upload";
import { toast } from "sonner";
import { CommerceCommandCenter } from "@/components/admin/CommerceCommandCenter";

import { motion } from "motion/react";
import {
  AdminHero,
  AdminLayout,
  AdminSideNav,
  AdminMobileStack,
  AdminPanelSkeleton,
  StatGrid,
} from "@/components/admin/AdminShell";
import { useIsMobile } from "@/hooks/use-mobile";
import type { LucideIcon } from "lucide-react";
import {
  CreditCard, ExternalLink, Globe, Star, Trash2, Plus, Save, Shield,
  Users, LifeBuoy, Link2, Wrench, FolderTree, LayoutTemplate, Sparkles,
  ShoppingBag, Search, Settings, ReceiptText, Mail, Activity, Repeat, PlugZap,
  Images, Newspaper, Bug, Ban,
} from "lucide-react";
import { BugFixerAdmin } from "@/components/admin/BugFixerAdmin";
import DesignStudioAdmin from "@/components/admin/DesignStudioAdmin";
import HomeShowcaseAdmin from "@/components/admin/HomeShowcaseAdmin";
import AiStudio from "@/components/admin/AiStudio";
import CategoryStudio from "@/components/admin/CategoryStudio";
import BlogAdmin from "@/components/admin/BlogAdmin";



export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: (search: Record<string, unknown>): { section?: string } => ({ section: typeof search.section === "string" ? search.section : undefined }),
  head: () => ({ meta: [{ title: "Administration — SKTECHLAB" }, { name: "description", content: "SKTECHLAB administration for customer websites, plans, payments and requests." }, { property: "og:title", content: "Administration — SKTECHLAB" }, { property: "og:description", content: "Manage customer websites, plans and service requests." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  beforeLoad: async ({ context }) => {
    const isAdmin = await context.queryClient.ensureQueryData(isAdminQuery);
    if (!isAdmin) throw redirect({ to: "/dashboard" });
  },
  // Panels fetch their own data on demand — the shell paints instantly.
  component: AdminPanel,
  pendingMs: 0,
  pendingComponent: () => (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 h-24 animate-pulse rounded-3xl bg-muted/40" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted/40" />
        ))}
      </div>
      <AdminPanelSkeleton rows={6} />
    </div>
  ),
});

function DomainsAdmin() {
  const qc = useQueryClient();
  const { data: reqs } = useSuspenseQuery(adminDomainRequestsQuery);
  const prepareFn = useServerFn(adminPrepareDomain);
  const verifyFn = useServerFn(adminVerifyDomain);
  const [dns, setDns] = useState<any>(null);
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("domain_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin_domain_requests"] }); },
  });
  const prepare = useMutation({
    mutationFn: (requestId: string) => prepareFn({ data: { requestId } }),
    onSuccess: (data) => {
      setDns(data);
      toast.success("DNS instructions ready");
      qc.invalidateQueries({ queryKey: ["admin_domain_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const verify = useMutation({
    mutationFn: (requestId: string) => verifyFn({ data: { requestId } }),
    onSuccess: (data: any) => {
      if (data?.verified) toast.success("Domain verified and marked completed");
      else toast.error(data?.reason || "DNS records not matching yet");
      qc.invalidateQueries({ queryKey: ["admin_domain_requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <details className="rounded-2xl border border-border bg-card p-4" open><summary className="mb-4 cursor-pointer text-sm font-semibold">Registrar integration & domain purchase orders</summary><DomainRegistrarAdmin /></details>
      <h3 className="pt-3 font-semibold">DNS connections & existing domain requests</h3>
      <DomainRootsAdmin />
      {!reqs.length ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No domain requests yet.</div>
      ) : null}
      {dns && (

        <div className="glass rounded-2xl p-4 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold">DNS instructions — {dns.domain}</h3>
            <Button size="sm" variant="ghost" onClick={() => setDns(null)}>Close</Button>
          </div>
          <p className="text-muted-foreground">User ko apne registrar par ye records add karne hain:</p>
          <ul className="mt-2 space-y-1 font-mono text-xs">
            <li>A &nbsp; {dns.record_name} &nbsp; → &nbsp; {dns.record_value}</li>
            <li>A &nbsp; www.{dns.domain} &nbsp; → &nbsp; {dns.record_value}</li>
            <li>TXT &nbsp; {dns.txtName} &nbsp; → &nbsp; {dns.txtValue}</li>
          </ul>
        </div>
      )}
      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Domain</th><th className="p-3">User</th><th className="p-3">WhatsApp</th><th className="p-3">Site</th><th className="p-3">Notes</th><th className="p-3">Status</th><th className="p-3">DNS</th></tr>
          </thead>
          <tbody>
            {reqs.map((r: any) => (
              <tr key={r.id} className="border-t border-border/60">
                <td className="p-3 font-mono font-medium">{r.domain}</td>
                <td className="p-3">{r.profiles?.full_name || "—"}</td>
                <td className="p-3">
                  {r.profiles?.whatsapp_number ? (
                    <a href={`https://wa.me/${r.profiles.whatsapp_number.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="text-brand-glow">{r.profiles.whatsapp_number}</a>
                  ) : "—"}
                </td>
                <td className="p-3">{r.sites?.name || "—"}</td>
                <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">{r.notes || "—"}</td>
                <td className="p-3">
                  <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                    <option value="pending">pending</option>
                    <option value="verifying">verifying</option>
                    <option value="in_progress">in_progress</option>
                    <option value="completed">completed</option>
                    <option value="rejected">rejected</option>
                  </select>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" disabled={prepare.isPending} onClick={() => prepare.mutate(r.id)}>
                      DNS instructions
                    </Button>
                    <Button size="sm" variant="secondary" disabled={verify.isPending || !r.verification_token} onClick={() => verify.mutate(r.id)}>
                      Verify now
                    </Button>
                  </div>
                  {r.verified_at ? (
                    <p className="mt-1 text-[11px] text-emerald-500">Verified {new Date(r.verified_at).toLocaleDateString()}</p>
                  ) : r.last_checked_at ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">Checked {new Date(r.last_checked_at).toLocaleString()}</p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



const ADMIN_TABS: { value: string; label: string; module: string; Icon: LucideIcon; Panel: () => React.ReactElement }[] = [
  { value: "overview", label: "Operations overview", module: "overview", Icon: Activity, Panel: () => <div /> },
  { value: "users", label: "Users", module: "users", Icon: Users, Panel: UsersAdmin },
  { value: "sites", label: "Sites", module: "sites", Icon: Globe, Panel: SitesAdmin },
  { value: "tickets", label: "Tickets", module: "tickets", Icon: LifeBuoy, Panel: TicketsAdmin },
  { value: "bugs", label: "Bug Fixer", module: "tickets", Icon: Bug, Panel: BugFixerAdmin },
  { value: "domains", label: "Domain sales & DNS", module: "domains", Icon: Link2, Panel: DomainsAdmin },
  { value: "custom", label: "Custom Dev", module: "tickets", Icon: Wrench, Panel: CustomDevAdmin },
  { value: "categories", label: "Categories", module: "templates", Icon: FolderTree, Panel: CategoriesAdmin },
  { value: "catstudio", label: "Category Studio", module: "templates", Icon: FolderTree, Panel: CategoryStudio },
  { value: "templates", label: "Projects & templates", module: "templates", Icon: LayoutTemplate, Panel: TemplatesAdmin },
  { value: "design", label: "Design Studio", module: "templates", Icon: Images, Panel: DesignStudioAdmin },
  { value: "home", label: "Home showcase", module: "templates", Icon: LayoutTemplate, Panel: HomeShowcaseAdmin },
  { value: "aistudio", label: "AI Studio", module: "templates", Icon: Sparkles, Panel: AiStudio },
  { value: "plans", label: "Plans", module: "plans", Icon: Sparkles, Panel: PlansAdmin },
  { value: "commerce", label: "Commerce", module: "sites", Icon: ShoppingBag, Panel: CommerceAdmin },
  { value: "payments", label: "Payments", module: "payments", Icon: CreditCard, Panel: PaymentsAdmin },
  { value: "billing", label: "Billing / Autopay", module: "payments", Icon: Repeat, Panel: BillingAdmin },
  { value: "upigateway", label: "UPI auto gateway", module: "payments", Icon: CreditCard, Panel: UpiGatewayAdmin },
  { value: "reviews", label: "Reviews", module: "settings", Icon: Star, Panel: ReviewsAdmin },
  { value: "blog", label: "Blog / Keywords", module: "settings", Icon: Newspaper, Panel: BlogAdmin },
  { value: "seo", label: "SEO / GEO", module: "settings", Icon: Search, Panel: SeoAdmin },

  { value: "settings", label: "Site Settings", module: "settings", Icon: Settings, Panel: SettingsAdmin },
  { value: "integrations", label: "Integrations / API", module: "settings", Icon: PlugZap, Panel: IntegrationsAdmin },
  { value: "roles", label: "Roles & Access", module: "roles", Icon: Shield, Panel: RolesAdmin },
  { value: "invoices", label: "Invoices", module: "invoices", Icon: ReceiptText, Panel: InvoicesAdmin },
  { value: "messages", label: "Mail / SMS", module: "templates_msg", Icon: Mail, Panel: MessagesAdmin },
  { value: "emails", label: "Email control", module: "settings", Icon: Mail, Panel: EmailAdmin },
  { value: "activity", label: "Activity", module: "activity", Icon: Activity, Panel: ActivityAdmin },
];

function AdminStats() {
  const { data: users } = useQuery(adminUsersQuery);
  const { data: sites } = useQuery(adminSitesQuery);
  const { data: tickets } = useQuery(adminTicketsQuery);
  const { data: domains } = useQuery(adminDomainRequestsQuery);
  const openTickets = (tickets ?? []).filter((t: any) => t.status !== "closed").length;
  const live = (sites ?? []).filter((s: any) => s.published).length;
  const paid = (users ?? []).filter((u: any) => (u.plan_tier ?? u.plan) && u.plan_tier !== "trial").length;
  return (
    <StatGrid
      stats={[
        { label: "Users", value: (users ?? []).length, hint: `${paid} on paid plans`, Icon: Users },
        { label: "Sites", value: (sites ?? []).length, hint: `${live} live`, Icon: Globe },
        { label: "Open tickets", value: openTickets, hint: `${(tickets ?? []).length} total`, Icon: LifeBuoy },
        { label: "Domain requests", value: (domains ?? []).length, hint: "DNS pipeline", Icon: Link2 },
      ]}
    />
  );
}

function AdminPanel() {
  const { data: me } = useQuery(myPermissionsQuery);
  const roles = me?.roles ?? [];
  const full = roles.includes("super_admin") || roles.includes("admin");
  const tabs = full
    ? ADMIN_TABS
    : ADMIN_TABS.filter((t) => t.value === "overview" || (me?.keys ?? []).some((k) => k.startsWith(`${t.module}.`)));
  const visible = tabs.length ? tabs : ADMIN_TABS.filter((t) => t.value === "tickets");
  const isMobile = useIsMobile(1024);
  // On phones the first screen is the section list, so nothing is open yet.
  const search = Route.useSearch();
  const navigate = useNavigate();
  const active = search.section ?? (isMobile ? "" : "overview");
  const setActive = (value: string) => navigate({ to: "/admin", search: { section: value || undefined }, replace: true });
  const current = visible.find((t) => t.value === active) ?? visible[0]!;
  const Panel = current.Panel;
  const navItems = visible.map(({ value, label, Icon }) => ({ value, label, Icon }));

  const panel = (
    <motion.section
      key={current.value}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="glass rounded-3xl p-4 shadow-card sm:p-6"
    >
      <Suspense fallback={<AdminPanelSkeleton rows={5} />}>
        {current.value === "overview" ? <OperationsOverview onGo={setActive} allowed={visible.map(t => t.value)} /> : <Panel />}
      </Suspense>
    </motion.section>
  );


  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <AdminHero
          Icon={Shield}
          title="Admin Control Center"
          sticker="⚡"
          subtitle={full ? "Manage everything from one place." : `Limited access — ${roles.join(", ") || "staff"}`}
          badge={roles.includes("super_admin") ? "Super admin" : full ? "Administrator" : "Staff"}
        />

        <AdminStats />

        {isMobile ? (
          <AdminMobileStack
            items={navItems}
            active={active}
            onSelect={setActive}
            panels={active ? { [active]: panel } : {}}
          />
        ) : (
          <AdminLayout
            side={<AdminSideNav items={navItems} active={current.value} onSelect={setActive} />}
          >
            {panel}
          </AdminLayout>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}



function CommerceAdmin() {
  const { data: sites } = useSuspenseQuery(adminSitesQuery);
  if (!sites.length) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No sites available.</div>;
  return <CommerceCommandCenter sites={sites} />;
}


function SitesAdmin() {
  const qc = useQueryClient();
  const { data: sites } = useSuspenseQuery(adminSitesQuery);

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("sites").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Site updated"); qc.invalidateQueries({ queryKey: ["admin_sites"] }); qc.invalidateQueries({ queryKey: ["my_sites"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Site deleted"); qc.invalidateQueries({ queryKey: ["admin_sites"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!sites.length) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No user websites yet.</div>;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {sites.map((s: any) => (
        <div key={s.id} className="glass overflow-hidden rounded-2xl">
          <div className="aspect-[4/3] overflow-hidden bg-muted">
            <TemplateImage t={s.templates ?? s} w={400} alt={s.name} className="h-full w-full object-cover" />
          </div>
          <div className="space-y-3 p-4">
            <div>
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-muted-foreground">
                {s.profiles?.full_name || "Unnamed user"} · {s.templates?.name || "Custom"}
              </div>
              {s.profiles?.whatsapp_number && (
                <a href={`https://wa.me/${s.profiles.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-xs text-brand-glow hover:underline">
                  {s.profiles.whatsapp_number}
                </a>
              )}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <span className="flex items-center gap-2 text-xs"><Globe className="h-3.5 w-3.5" /> Published</span>
              <Switch checked={!!s.published} onCheckedChange={(v) => update.mutate({ id: s.id, patch: { published: v } })} />
            </div>
            <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${s.suspended ? "bg-destructive/10" : "bg-muted/30"}`}>
              <span className="flex items-center gap-2 text-xs">
                <Ban className="h-3.5 w-3.5" /> {s.suspended ? "Suspended" : "Suspend site"}
              </span>
              <Switch
                checked={!!s.suspended}
                onCheckedChange={(v) => {
                  const reason = v ? window.prompt("Suspend reason (optional)") : null;
                  update.mutate({
                    id: s.id,
                    patch: v
                      ? { suspended: true, suspended_reason: reason || null, suspended_at: new Date().toISOString() }
                      : { suspended: false, suspended_reason: null, suspended_at: null },
                  });
                }}
              />
            </div>
            {s.suspended && (
              <p className="rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive">
                Visitors ko site ki jagah "temporarily unavailable" dikh raha hai.
                {s.suspended_reason ? ` Reason: ${s.suspended_reason}` : ""}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="flex-1">
                  <Link to="/dashboard/sites/$id" params={{ id: s.id }}>Site admin</Link>
              </Button>
              <Button asChild size="sm" className="flex-1">
                  <Link to="/admin/sites/$id/editor" params={{ id: s.id }}>Full editor</Link>
              </Button>
              {s.subdomain && (
                <Button asChild size="sm" variant="outline">
                  <a href={`/${s.subdomain}`} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Categories + Subcategories ---------- */
function CategoriesAdmin() {
  const qc = useQueryClient();
  const { data: cats } = useSuspenseQuery(categoriesQuery);
  const [newCat, setNewCat] = useState({ slug: "", name: "", description: "", icon: "LayoutGrid" });

  const addCat = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("categories").insert({
        slug: newCat.slug, name: newCat.name, description: newCat.description, icon: newCat.icon,
        sort_order: cats.length + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Category added"); setNewCat({ slug: "", name: "", description: "", icon: "LayoutGrid" }); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delCat = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-3 font-semibold">Add new category</h3>
        <div className="grid gap-3 md:grid-cols-4">
          <Input placeholder="Slug (e.g. fitness)" value={newCat.slug} onChange={(e) => setNewCat({ ...newCat, slug: e.target.value })} />
          <Input placeholder="Name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
          <Input placeholder="Description" value={newCat.description} onChange={(e) => setNewCat({ ...newCat, description: e.target.value })} />
          <Button onClick={() => addCat.mutate()} disabled={addCat.isPending || !newCat.slug || !newCat.name} className="bg-gradient-brand text-brand-foreground">
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {cats.map((c: any) => (
          <CategoryRow key={c.id} cat={c} onDelete={() => delCat.mutate(c.id)} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ cat, onDelete }: { cat: any; onDelete: () => void }) {
  const qc = useQueryClient();
  const [expand, setExpand] = useState(false);
  const [subs, setSubs] = useState<any[]>(cat.subcategories ?? []);
  const [newSub, setNewSub] = useState({ slug: "", name: "" });

  const addSub = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("subcategories").insert({
        category_id: cat.id, slug: newSub.slug, name: newSub.name, sort_order: subs.length + 1,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setSubs([...subs, d]); setNewSub({ slug: "", name: "" }); qc.invalidateQueries({ queryKey: ["categories"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delSub = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subcategories").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => { setSubs(subs.filter((s) => s.id !== id)); qc.invalidateQueries({ queryKey: ["categories"] }); },
  });

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="font-semibold">{cat.name} <span className="text-xs text-muted-foreground">/{cat.slug}</span></div>
          <div className="text-xs text-muted-foreground">{cat.templates?.[0]?.count ?? 0} templates · {subs.length} sub-categories</div>
        </div>
        <Button size="sm" variant="outline" onClick={() => setExpand(!expand)}>{expand ? "Hide" : "Sub-categories"}</Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div>
      {expand && (
        <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
          {subs.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span>{s.name} <span className="text-xs text-muted-foreground">/{s.slug}</span></span>
              <Button size="sm" variant="ghost" onClick={() => delSub.mutate(s.id)} className="text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="slug" value={newSub.slug} onChange={(e) => setNewSub({ ...newSub, slug: e.target.value })} />
            <Input placeholder="name" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} />
            <Button size="sm" onClick={() => addSub.mutate()} disabled={!newSub.slug || !newSub.name}>Add</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Templates ---------- */
function TemplatesAdmin() { return <ProjectLibrary />; }

/* ---------- Plans ---------- */
function PlansAdmin() {
  const qc = useQueryClient();
  const { data: plans } = useSuspenseQuery(adminAllPlansQuery);

  const upd = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("service_plans").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin_plans"] }); qc.invalidateQueries({ queryKey: ["service_plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin_plans"] }); qc.invalidateQueries({ queryKey: ["service_plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const add = useMutation({
    mutationFn: async (service_type: string) => {
      const { error } = await supabase.from("service_plans").insert({
        service_type, tier: "new", name: "New plan", tagline: "", price_inr: 0,
        billing: "monthly", features: [], highlighted: false, sort_order: 99,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Added"); qc.invalidateQueries({ queryKey: ["admin_plans"] }); qc.invalidateQueries({ queryKey: ["service_plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Exactly one plan per service type can be the compulsory base plan.
  const setBase = useMutation({
    mutationFn: async ({ id, service_type }: { id: string; service_type: string }) => {
      const clear = await supabase.from("service_plans").update({ is_base: false }).eq("service_type", service_type as any);
      if (clear.error) throw clear.error;
      const { error } = await supabase.from("service_plans").update({ is_base: true, sort_order: 0 }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Base plan updated"); qc.invalidateQueries({ queryKey: ["admin_plans"] }); qc.invalidateQueries({ queryKey: ["service_plans"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const groups: Record<string, any[]> = {};
  (plans as any[]).forEach((p) => { (groups[p.service_type] ??= []).push(p); });
  const labels: Record<string, string> = {
    site_subscription: "Website Plan (Silver / Gold / Platinum)",
    website_development: "Website development (custom builds)",
    digital_marketing: "Digital marketing",
    gmb_boost: "Google My Business boost",
  };
  const order = ["site_subscription", "website_development", "digital_marketing", "gmb_boost"];
  const keys = [...order.filter((k) => groups[k]), ...Object.keys(groups).filter((k) => !order.includes(k))];

  return (
    <div className="space-y-8">
      {keys.map((key) => (
        <section key={key} className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{labels[key] ?? key}</h3>
            <Button size="sm" variant="outline" onClick={() => add.mutate(key)}>
              <Plus className="mr-1 h-4 w-4" /> Add plan
            </Button>
          </div>
          <div className="grid gap-3">
            {groups[key].map((p: any) => (
              <PlanRow
                key={p.id}
                plan={p}
                onSave={(patch) => upd.mutate({ id: p.id, patch })}
                onDelete={() => { if (confirm(`Delete "${p.name}"?`)) del.mutate(p.id); }}
                onMakeBase={() => setBase.mutate({ id: p.id, service_type: p.service_type })}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function PlanRow({ plan, onSave, onDelete, onMakeBase }: { plan: any; onSave: (patch: any) => void; onDelete: () => void; onMakeBase?: () => void }) {
  const [p, setP] = useState({ name: plan.name, tier: plan.tier, tagline: plan.tagline || "", price_inr: plan.price_inr, billing: plan.billing || "monthly", features: (plan.features || []).join("\n"), highlighted: plan.highlighted, ecom_product_limit: Number(plan.ecom_product_limit || 0) });
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <span>{plan.service_type}</span>
        {plan.is_base ? (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">Base plan</span>
        ) : null}
        <Input className="h-7 w-28" value={p.tier} onChange={(e) => setP({ ...p, tier: e.target.value })} placeholder="tier" />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-4">
        <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="Name" />
        <Input value={p.tagline} onChange={(e) => setP({ ...p, tagline: e.target.value })} placeholder="Tagline" />
        <Input type="number" value={p.price_inr} onChange={(e) => setP({ ...p, price_inr: parseInt(e.target.value || "0") })} placeholder="Price ₹" />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={p.billing}
          onChange={(e) => setP({ ...p, billing: e.target.value })}
          aria-label="Billing cycle"
        >
          {BILLING_CYCLES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <label className="mt-3 block text-xs text-muted-foreground">Included shop product limit (0 = shop not included)<Input type="number" min="0" max="100000" value={p.ecom_product_limit} onChange={e => setP({ ...p, ecom_product_limit: Math.max(0, Math.min(100000, Number(e.target.value) || 0)) })} /></label>
      <Textarea className="mt-3" rows={4} value={p.features} onChange={(e) => setP({ ...p, features: e.target.value })} placeholder="One feature per line" />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><Switch checked={p.highlighted} onCheckedChange={(v) => setP({ ...p, highlighted: v })} /> Highlighted</label>
        {onMakeBase && !plan.is_base ? (
          <Button size="sm" variant="outline" onClick={onMakeBase}>Make base plan</Button>
        ) : null}
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-1 h-4 w-4" /> Delete
        </Button>
        <Button size="sm" className="ml-auto bg-gradient-brand text-brand-foreground" onClick={() => onSave({ name: p.name, tier: p.tier, tagline: p.tagline, price_inr: p.price_inr, billing: p.billing, highlighted: p.highlighted, ecom_product_limit: p.ecom_product_limit, features: p.features.split("\n").filter(Boolean) })}>
          <Save className="mr-1 h-4 w-4" /> Save
        </Button>
      </div>
    </div>
  );
}


/* ---------- Users ---------- */
function UsersAdmin() {
  const qc = useQueryClient();
  const { data: users } = useSuspenseQuery(adminUsersQuery);

  const toggleBlock = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { error } = await supabase.from("profiles").update({ blocked }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin_users"] }); },
  });

  const activatePlan = useServerFn(adminActivateUserPlan);
  const setPlan = useMutation({
    mutationFn: ({ id, plan }: { id: string; plan: string }) =>
      activatePlan({ data: { userId: id, plan } }),
    onSuccess: (res: any) => {
      toast.success(res?.invoice ? "Plan updated + invoice created" : "Plan updated");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
      qc.invalidateQueries({ queryKey: ["admin_invoices"] });
      qc.invalidateQueries({ queryKey: ["admin_activity"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const toggleAdmin = useMutation({
    mutationFn: async ({ id, makeAdmin }: { id: string; makeAdmin: boolean }) => {
      if (makeAdmin) {
        const { error } = await supabase.from("user_roles").insert({ user_id: id, role: "admin" });
        if (error && !error.message.includes("duplicate")) throw error;
      } else {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["admin_users"] }); },
  });

  return (
    <div className="glass overflow-hidden rounded-2xl">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr><th className="p-3">Name</th><th className="p-3">WhatsApp</th><th className="p-3">Plan</th><th className="p-3">Admin</th><th className="p-3">Status</th><th className="p-3">Joined</th><th className="p-3"></th></tr>
        </thead>
        <tbody>
          {users.map((u: any) => {
            const isAdmin = (u.user_roles ?? []).some((r: any) => r.role === "admin");
            return (
              <tr key={u.id} className="border-t border-border/60">
                <td className="p-3">
                  <div className="font-medium">{u.full_name || "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground">{u.id.slice(0, 8)}</div>
                </td>
                <td className="p-3">
                  {u.whatsapp_number ? (
                    <a href={`https://wa.me/${u.whatsapp_number.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" className="text-brand-glow hover:underline">
                      {u.whatsapp_number}
                    </a>
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </td>
                <td className="p-3">
                  <Input className="w-32" defaultValue={u.active_plan ?? ""} onBlur={(e) => { if (e.target.value !== (u.active_plan ?? "")) setPlan.mutate({ id: u.id, plan: e.target.value }); }} placeholder="—" />
                </td>
                <td className="p-3"><Switch checked={isAdmin} onCheckedChange={(v) => toggleAdmin.mutate({ id: u.id, makeAdmin: v })} /></td>
                <td className="p-3">
                  {u.blocked ? <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-xs text-destructive">Blocked</span> : <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand-glow">Active</span>}
                </td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="p-3">
                  <Button size="sm" variant="outline" onClick={() => toggleBlock.mutate({ id: u.id, blocked: !u.blocked })}>{u.blocked ? "Unblock" : "Block"}</Button>
                </td>
              </tr>
            );
          })}
        </tbody>

      </table>
    </div>
  );
}

/* ---------- SEO / GEO ---------- */
function SeoAdmin() {
  const qc = useQueryClient();
  const { data: pages } = useSuspenseQuery(adminSeoQuery);
  const [np, setNp] = useState({ path: "" });

  const upd = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("page_seo").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["admin_seo"] }); },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("page_seo").insert({ path: np.path });
      if (error) throw error;
    },
    onSuccess: () => { setNp({ path: "" }); qc.invalidateQueries({ queryKey: ["admin_seo"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="glass flex gap-2 rounded-xl p-3">
        <Input placeholder="/new-page-path" value={np.path} onChange={(e) => setNp({ path: e.target.value })} />
        <Button onClick={() => add.mutate()} disabled={!np.path}><Plus className="mr-1 h-4 w-4" /> Add page</Button>
      </div>
      {pages.map((pg: any) => <SeoRow key={pg.id} page={pg} onSave={(patch) => upd.mutate({ id: pg.id, patch })} />)}
    </div>
  );
}

function SeoRow({ page, onSave }: { page: any; onSave: (patch: any) => void }) {
  const [p, setP] = useState({
    title: page.title || "", description: page.description || "", og_image: page.og_image || "",
    keywords: page.keywords || "", geo_region: page.geo_region || "", geo_placename: page.geo_placename || "",
  });
  return (
    <div className="glass rounded-2xl p-4">
      <div className="font-mono text-sm text-brand-glow">{page.path}</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div><Label>Title</Label><Input value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} /></div>
        <div><Label>OG Image URL</Label><Input value={p.og_image} onChange={(e) => setP({ ...p, og_image: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Description</Label><Textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
        <div><Label>Keywords</Label><Input value={p.keywords} onChange={(e) => setP({ ...p, keywords: e.target.value })} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>GEO region</Label><Input placeholder="IN" value={p.geo_region} onChange={(e) => setP({ ...p, geo_region: e.target.value })} /></div>
          <div><Label>GEO place</Label><Input placeholder="Mumbai" value={p.geo_placename} onChange={(e) => setP({ ...p, geo_placename: e.target.value })} /></div>
        </div>
      </div>
      <Button size="sm" className="mt-3 bg-gradient-brand text-brand-foreground" onClick={() => onSave(p)}><Save className="mr-1 h-4 w-4" /> Save</Button>
    </div>
  );
}

/* ---------- Site settings (WhatsApp, Tawk, brand) ---------- */
function SettingsAdmin() {
  const qc = useQueryClient();
  const { data: settings } = useSuspenseQuery(adminSiteSettingsQuery);
  const [s, setS] = useState<any>(settings ?? {});

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").update({
        whatsapp_number: s.whatsapp_number, whatsapp_message: s.whatsapp_message, whatsapp_enabled: s.whatsapp_enabled,
        tawk_property_id: s.tawk_property_id, tawk_widget_id: s.tawk_widget_id, tawk_enabled: s.tawk_enabled,
        brand_name: s.brand_name, brand_tagline: s.brand_tagline, contact_email: s.contact_email, contact_phone: s.contact_phone,
        otp_provider: s.otp_provider, email_login_enabled: s.email_login_enabled,
        sms_fallback_enabled: s.sms_fallback_enabled, voice_api_enabled: s.voice_api_enabled,
        contact_popup_enabled: s.contact_popup_enabled, floating_widgets_enabled: s.floating_widgets_enabled,
        ai_provider: s.ai_provider, pexels_enabled: s.pexels_enabled,
        ai_generation_enabled: s.ai_generation_enabled, razorpay_enabled: s.razorpay_enabled,
        whatsapp_otp_enabled: s.whatsapp_otp_enabled, free_subdomain_root: s.free_subdomain_root,
        starter_free_domain_root: s.starter_free_domain_root, default_map_query: s.default_map_query,
        default_map_embed_url: s.default_map_embed_url, manual_upi_id: s.manual_upi_id,
        manual_upi_name: s.manual_upi_name, manual_qr_url: s.manual_qr_url,
        crypto_payment_note: s.crypto_payment_note, razorpay_key_id: s.razorpay_key_id,
        ecommerce_enabled: s.ecommerce_enabled, woocommerce_plan_tier: s.woocommerce_plan_tier,
        hero_story_images: Array.isArray(s.hero_story_images) ? s.hero_story_images : [],
      }).eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["site_settings"] }); qc.invalidateQueries({ queryKey: ["admin_site_settings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">WhatsApp floating button</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Number (with country code, no +)</Label><Input value={s.whatsapp_number || ""} onChange={(e) => setS({ ...s, whatsapp_number: e.target.value })} placeholder="919999999999" /></div>
          <div><Label>Prefilled message</Label><Input value={s.whatsapp_message || ""} onChange={(e) => setS({ ...s, whatsapp_message: e.target.value })} /></div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={!!s.whatsapp_enabled} onCheckedChange={(v) => setS({ ...s, whatsapp_enabled: v })} /> Show WhatsApp button</label>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Tawk.to live chat</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Property ID</Label><Input value={s.tawk_property_id || ""} onChange={(e) => setS({ ...s, tawk_property_id: e.target.value })} placeholder="6xxxxxxxxxxxxxxxxxxxxxxx" /></div>
          <div><Label>Widget ID</Label><Input value={s.tawk_widget_id || ""} onChange={(e) => setS({ ...s, tawk_widget_id: e.target.value })} placeholder="1xxxxxxxx" /></div>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm"><Switch checked={!!s.tawk_enabled} onCheckedChange={(v) => setS({ ...s, tawk_enabled: v })} /> Enable live chat</label>
        <p className="mt-2 text-xs text-muted-foreground">Get free IDs from tawk.to → Administration → Chat Widget.</p>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Brand & contact</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Brand name</Label><Input value={s.brand_name || ""} onChange={(e) => setS({ ...s, brand_name: e.target.value })} /></div>
          <div><Label>Tagline</Label><Input value={s.brand_tagline || ""} onChange={(e) => setS({ ...s, brand_tagline: e.target.value })} /></div>
          <div><Label>Contact email</Label><Input value={s.contact_email || ""} onChange={(e) => setS({ ...s, contact_email: e.target.value })} /></div>
          <div><Label>Contact phone</Label><Input value={s.contact_phone || ""} onChange={(e) => setS({ ...s, contact_phone: e.target.value })} /></div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 font-semibold">Home page phone frame</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Images shown inside the mobile frame on the home page hero (one image URL per line). Leave empty to use the built-in defaults.
        </p>
        <textarea
          rows={5}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
          placeholder={"https://…/photo-1.jpg\nhttps://…/photo-2.jpg"}
          value={(Array.isArray(s.hero_story_images) ? s.hero_story_images : []).join("\n")}
          onChange={(e) =>
            setS({
              ...s,
              hero_story_images: e.target.value.split("\n").map((l: string) => l.trim()).filter(Boolean),
            })
          }
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {(Array.isArray(s.hero_story_images) ? s.hero_story_images : []).map((u: string) => (
            <img key={u} src={u} alt="" className="h-16 w-12 rounded-md border border-border object-cover" />
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Login & OTP</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>WhatsApp OTP provider</Label>
            <select
              value={s.otp_provider || "whatsapp_cloud"}
              onChange={(e) => setS({ ...s, otp_provider: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="whatsapp_cloud">WhatsApp Cloud API (Meta) — default</option>
              <option value="twilio">Twilio WhatsApp</option>
              <option value="msg91">MSG91 (India SMS)</option>
              <option value="disabled">Disabled (demo only)</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              Add provider credentials in Secrets: <code>WHATSAPP_CLOUD_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code> (or Twilio / MSG91 vars).
            </p>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.whatsapp_otp_enabled} onCheckedChange={(v) => setS({ ...s, whatsapp_otp_enabled: v })} />
              Enable WhatsApp OTP sending
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.email_login_enabled} onCheckedChange={(v) => setS({ ...s, email_login_enabled: v })} />
              Allow email / password login on public auth page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.sms_fallback_enabled} onCheckedChange={(v) => setS({ ...s, sms_fallback_enabled: v })} />
              SMS fallback (MSG91) when WhatsApp fails
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.voice_api_enabled} onCheckedChange={(v) => setS({ ...s, voice_api_enabled: v })} />
              Enable voice intro on templates
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.contact_popup_enabled} onCheckedChange={(v) => setS({ ...s, contact_popup_enabled: v })} />
              Enable contact popup on rendered sites
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.floating_widgets_enabled} onCheckedChange={(v) => setS({ ...s, floating_widgets_enabled: v })} />
              Show floating WhatsApp / chat widgets
            </label>
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Domains, map & ecommerce controls</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Free subdomain root</Label><Input value={s.free_subdomain_root || ""} onChange={(e) => setS({ ...s, free_subdomain_root: e.target.value })} placeholder="sktechlab.site" /></div>
          <div><Label>Starter plan domain root</Label><Input value={s.starter_free_domain_root || ""} onChange={(e) => setS({ ...s, starter_free_domain_root: e.target.value })} placeholder="starter.sktechlab.site" /></div>
          <div><Label>Map search query</Label><Input value={s.default_map_query || ""} onChange={(e) => setS({ ...s, default_map_query: e.target.value })} placeholder="Sanganer Jaipur Rajasthan India" /></div>
          <div><Label>Map embed URL</Label><Input value={s.default_map_embed_url || ""} onChange={(e) => setS({ ...s, default_map_embed_url: e.target.value })} placeholder="https://www.google.com/maps?..." /></div>
          <div><Label>WooCommerce / shop plan tier</Label><Input value={s.woocommerce_plan_tier || ""} onChange={(e) => setS({ ...s, woocommerce_plan_tier: e.target.value })} placeholder="business" /></div>
          <label className="flex items-center gap-2 text-sm pt-6"><Switch checked={!!s.ecommerce_enabled} onCheckedChange={(v) => setS({ ...s, ecommerce_enabled: v })} /> Enable ecommerce editor features</label>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Manual payment defaults</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>UPI ID</Label><Input value={s.manual_upi_id || ""} onChange={(e) => setS({ ...s, manual_upi_id: e.target.value })} placeholder="name@upi" /></div>
          <div><Label>UPI name</Label><Input value={s.manual_upi_name || ""} onChange={(e) => setS({ ...s, manual_upi_name: e.target.value })} placeholder="SKTECHLAB" /></div>
          <div>
            <div className="flex items-center justify-between"><Label>QR image</Label>
              <MediaUploadButton label="Upload QR" onUploaded={(u) => u[0] && setS({ ...s, manual_qr_url: u[0] })} />
            </div>
            <Input value={s.manual_qr_url || ""} onChange={(e) => setS({ ...s, manual_qr_url: e.target.value })} placeholder="https://..." />
            {s.manual_qr_url ? <img src={s.manual_qr_url} alt="Payment QR" className="mt-2 h-24 w-24 rounded-lg border border-border/60 object-cover" /> : null}
          </div>
          <div><Label>Razorpay key ID</Label><Input value={s.razorpay_key_id || ""} onChange={(e) => setS({ ...s, razorpay_key_id: e.target.value })} placeholder="rzp_..." /></div>
          <div className="md:col-span-2"><Label>Crypto / manual payment note</Label><Textarea value={s.crypto_payment_note || ""} onChange={(e) => setS({ ...s, crypto_payment_note: e.target.value })} /></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!s.razorpay_enabled} onCheckedChange={(v) => setS({ ...s, razorpay_enabled: v })} /> Enable Razorpay display</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!s.ai_generation_enabled} onCheckedChange={(v) => setS({ ...s, ai_generation_enabled: v })} /> Enable AI builder generation</label>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-1 font-semibold">AI editor provider</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Default: <b>Lovable AI (free)</b> — Gemini Flash + Pro included. Add your own <code>GEMINI_API_KEY</code> secret to route the AI editor through Google Generative Language instead.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>AI provider</Label>
            <select
              value={s.ai_provider || "lovable"}
              onChange={(e) => setS({ ...s, ai_provider: e.target.value })}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="lovable">Lovable AI (default, free)</option>
              <option value="gemini">Own Gemini API key</option>
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              For Gemini: add <code>GEMINI_API_KEY</code> in Secrets. Server falls back to Lovable AI when the key is missing.
            </p>
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={!!s.pexels_enabled} onCheckedChange={(v) => setS({ ...s, pexels_enabled: v })} />
              Enable Pexels HD image search (add <code>PEXELS_API_KEY</code>)
            </label>
            <p className="text-xs text-muted-foreground">
              Without Pexels, image auto-suggest falls back to LoremFlickr keyword search.
            </p>
          </div>
        </div>
      </div>


      <Button className="bg-gradient-brand text-brand-foreground shadow-glow" onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="mr-2 h-4 w-4" /> Save all settings
      </Button>
    </div>
  );
}

function ReviewsAdmin() {
  const qc = useQueryClient();
  const { data: reviews } = useSuspenseQuery(adminReviewsQuery);
  const [draft, setDraft] = useState({ name: "", role: "", location: "", rating: 5, text: "", photo_url: "" });

  const add = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({ ...draft, sort_order: reviews.length + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review added"); setDraft({ name: "", role: "", location: "", rating: 5, text: "", photo_url: "" }); qc.invalidateQueries({ queryKey: ["admin_reviews"] }); qc.invalidateQueries({ queryKey: ["public_reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("reviews").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review saved"); qc.invalidateQueries({ queryKey: ["admin_reviews"] }); qc.invalidateQueries({ queryKey: ["public_reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Review deleted"); qc.invalidateQueries({ queryKey: ["admin_reviews"] }); qc.invalidateQueries({ queryKey: ["public_reviews"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><Star className="h-4 w-4 text-brand-glow" /> Add review</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          <Input placeholder="Role / business" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
          <Input placeholder="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          <Input type="number" min={1} max={5} value={draft.rating} onChange={(e) => setDraft({ ...draft, rating: Number(e.target.value) })} />
          <Input className="md:col-span-2" placeholder="Photo URL" value={draft.photo_url} onChange={(e) => setDraft({ ...draft, photo_url: e.target.value })} />
          <Textarea className="md:col-span-3" placeholder="Review text" value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
        </div>
        <Button className="mt-3 bg-gradient-brand text-brand-foreground" onClick={() => add.mutate()} disabled={!draft.name || !draft.text || add.isPending}><Plus className="mr-1 h-4 w-4" /> Add review</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {reviews.map((r: any) => <ReviewRow key={r.id} review={r} onSave={(patch) => update.mutate({ id: r.id, patch })} onDelete={() => remove.mutate(r.id)} />)}
      </div>
    </div>
  );
}

function ReviewRow({ review, onSave, onDelete }: { review: any; onSave: (patch: any) => void; onDelete: () => void }) {
  const [r, setR] = useState({ ...review });
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <img src={r.photo_url || `https://i.pravatar.cc/96?u=${review.id}`} alt="" className="h-14 w-14 rounded-full object-cover" />
        <div className="grid flex-1 gap-2">
          <Input value={r.name || ""} onChange={(e) => setR({ ...r, name: e.target.value })} />
          <Input value={r.role || ""} onChange={(e) => setR({ ...r, role: e.target.value })} placeholder="Role" />
          <div className="flex items-center gap-2">
            <Input value={r.photo_url || ""} onChange={(e) => setR({ ...r, photo_url: e.target.value })} placeholder="Photo URL" />
            <MediaUploadButton label="Upload" onUploaded={(u) => u[0] && setR({ ...r, photo_url: u[0] })} />
          </div>
        </div>
      </div>
      <Textarea className="mt-3" value={r.text || ""} onChange={(e) => setR({ ...r, text: e.target.value })} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Input type="number" min={1} max={5} value={r.rating ?? 5} onChange={(e) => setR({ ...r, rating: Number(e.target.value) })} className="w-20" />
        <Input value={r.location || ""} onChange={(e) => setR({ ...r, location: e.target.value })} placeholder="Location" className="w-40" />
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!r.is_active} onCheckedChange={(v) => setR({ ...r, is_active: v })} /> Active</label>
        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        <Button size="sm" className="bg-gradient-brand text-brand-foreground" onClick={() => onSave(r)}><Save className="mr-1 h-4 w-4" /> Save</Button>
      </div>
    </div>
  );
}

function PaymentsAdmin() {
  const qc = useQueryClient();
  const { data: gateways } = useSuspenseQuery(adminPaymentGatewaysQuery);
  const [draft, setDraft] = useState({ kind: "manual_upi", display_name: "Manual UPI", description: "", config: "{}", is_enabled: true, requires_manual_verification: true });

  const add = useMutation({
    mutationFn: async () => {
      const config = JSON.parse(draft.config || "{}");
      const { error } = await supabase.from("payment_gateways").insert({ ...draft, config, sort_order: gateways.length + 1 });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gateway added"); qc.invalidateQueries({ queryKey: ["admin_payment_gateways"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("payment_gateways").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gateway saved"); qc.invalidateQueries({ queryKey: ["admin_payment_gateways"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_gateways").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Gateway deleted"); qc.invalidateQueries({ queryKey: ["admin_payment_gateways"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5">
        <h3 className="mb-3 flex items-center gap-2 font-semibold"><CreditCard className="h-4 w-4 text-brand-glow" /> Add payment gateway</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value })} />
          <Input placeholder="Display name" value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
          <Input placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <Textarea className="md:col-span-3 font-mono text-xs" value={draft.config} onChange={(e) => setDraft({ ...draft, config: e.target.value })} placeholder='{"upi_id":"name@upi"}' />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm"><Switch checked={draft.is_enabled} onCheckedChange={(v) => setDraft({ ...draft, is_enabled: v })} /> Enabled</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={draft.requires_manual_verification} onCheckedChange={(v) => setDraft({ ...draft, requires_manual_verification: v })} /> Manual verification</label>
          <Button className="bg-gradient-brand text-brand-foreground" onClick={() => add.mutate()} disabled={!draft.kind || !draft.display_name || add.isPending}><Plus className="mr-1 h-4 w-4" /> Add gateway</Button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {gateways.map((g: any) => <GatewayRow key={g.id} gateway={g} onSave={(patch) => update.mutate({ id: g.id, patch })} onDelete={() => remove.mutate(g.id)} />)}
      </div>
    </div>
  );
}

function GatewayRow({ gateway, onSave, onDelete }: { gateway: any; onSave: (patch: any) => void; onDelete: () => void }) {
  const [g, setG] = useState({ ...gateway, configText: JSON.stringify(gateway.config ?? {}, null, 2) });
  const save = () => {
    let config = {};
    try { config = JSON.parse(g.configText || "{}"); } catch { toast.error("Config JSON is invalid"); return; }
    onSave({ kind: g.kind, display_name: g.display_name, description: g.description, is_enabled: g.is_enabled, requires_manual_verification: g.requires_manual_verification, config });
  };
  return (
    <div className="glass rounded-2xl p-4">
      <div className="grid gap-2 md:grid-cols-2">
        <Input value={g.kind || ""} onChange={(e) => setG({ ...g, kind: e.target.value })} />
        <Input value={g.display_name || ""} onChange={(e) => setG({ ...g, display_name: e.target.value })} />
        <Input className="md:col-span-2" value={g.description || ""} onChange={(e) => setG({ ...g, description: e.target.value })} placeholder="Description" />
        <Textarea className="md:col-span-2 font-mono text-xs" rows={6} value={g.configText} onChange={(e) => setG({ ...g, configText: e.target.value })} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!g.is_enabled} onCheckedChange={(v) => setG({ ...g, is_enabled: v })} /> Enabled</label>
        <label className="flex items-center gap-2 text-sm"><Switch checked={!!g.requires_manual_verification} onCheckedChange={(v) => setG({ ...g, requires_manual_verification: v })} /> Manual</label>
        <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
        <Button size="sm" className="bg-gradient-brand text-brand-foreground" onClick={save}><Save className="mr-1 h-4 w-4" /> Save</Button>
      </div>
    </div>
  );
}

const SERVICE_LABEL: Record<string, string> = {
  digital_marketing: "Digital Marketing",
  gmb_boost: "GMB Boost",
};

function ServiceBookingsAdmin() {
  const qc = useQueryClient();
  const { data: bookings = [] } = useQuery({
    queryKey: ["admin_service_bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("service_bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin_service_bookings"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-3 font-semibold">Service bookings ({bookings.length})</div>
      {!bookings.length ? (
        <div className="text-sm text-muted-foreground">No service bookings yet.</div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => (
            <div key={b.id} className="rounded-xl border border-border/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{SERVICE_LABEL[b.service] ?? b.service}</div>
                  <div className="mt-1 break-all text-xs text-muted-foreground">
                    {b.email} · {b.whatsapp}
                    {b.website_url ? ` · ${b.website_url}` : ""} · {new Date(b.created_at).toLocaleString()}
                  </div>
                </div>
                <select value={b.status} onChange={(e) => update.mutate({ id: b.id, status: e.target.value })}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="new">new</option>
                  <option value="contacted">contacted</option>
                  <option value="closed">closed</option>
                </select>
              </div>
              <div className="mt-3 whitespace-pre-wrap rounded bg-muted/40 p-3 text-sm">{b.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TicketsAdmin() {
  const qc = useQueryClient();
  const { data: tickets } = useSuspenseQuery(adminTicketsQuery);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  const update = useMutation({
    mutationFn: async ({ id, status, admin_reply }: { id: string; status?: string; admin_reply?: string }) => {
      const patch: any = {};
      if (status) patch.status = status;
      if (admin_reply !== undefined) patch.admin_reply = admin_reply;
      const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin_tickets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <ServiceBookingsAdmin />
      {!tickets.length && (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No tickets yet.</div>
      )}
      {tickets.map((t: any) => (
        <div key={t.id} className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="font-semibold">{t.subject}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                User: {t.user_id.slice(0,8)} · {t.sites?.name || "no site"} · {new Date(t.created_at).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{t.priority}</span>
              <select value={t.status} onChange={(e) => update.mutate({ id: t.id, status: e.target.value })}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                <option value="open">open</option>
                <option value="in_progress">in_progress</option>
                <option value="resolved">resolved</option>
                <option value="closed">closed</option>
              </select>
            </div>
          </div>
          <div className="mt-3 rounded bg-muted/40 p-3 text-sm">{t.message}</div>
          <div className="mt-3">
            <Label className="text-xs">Admin reply</Label>
            <Textarea
              value={replyMap[t.id] ?? t.admin_reply ?? ""}
              onChange={(e) => setReplyMap((m) => ({ ...m, [t.id]: e.target.value }))}
              className="mt-1"
            />
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => update.mutate({ id: t.id, admin_reply: replyMap[t.id] ?? "" })}
                className="bg-gradient-brand text-brand-foreground shadow-glow">
                <Save className="mr-1 h-3.5 w-3.5" /> Save reply
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomDevAdmin() {
  const qc = useQueryClient();
  const { data: reqs } = useSuspenseQuery(adminCustomDevQuery);
  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("custom_dev_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin_custom_dev"] }); },
  });
  if (!reqs.length) return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No custom development requests yet.</div>;
  return (
    <div className="space-y-3">
      {reqs.map((r: any) => (
        <div key={r.id} className="glass rounded-2xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="font-semibold">{r.name} <span className="text-xs text-muted-foreground">· {r.business_type || "—"}</span></div>
              <div className="mt-1 text-xs text-muted-foreground">
                {r.email} ·{" "}
                <a href={`https://wa.me/${(r.whatsapp || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-brand-glow">
                  {r.whatsapp}
                </a>{" "}
                · budget {r.budget || "—"} · {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <select value={r.status} onChange={(e) => update.mutate({ id: r.id, status: e.target.value })} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
              <option value="new">new</option>
              <option value="contacted">contacted</option>
              <option value="in_progress">in_progress</option>
              <option value="won">won</option>
              <option value="lost">lost</option>
            </select>
          </div>
          <div className="mt-3 whitespace-pre-wrap rounded bg-muted/40 p-3 text-sm">{r.requirements}</div>
        </div>
      ))}
    </div>
  );
}
