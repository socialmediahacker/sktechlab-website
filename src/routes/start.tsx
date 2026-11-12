import { TemplateCover } from "@/components/template-cover";
import { DomainSearch, type DomainQuote } from "@/components/domains/DomainSearch";
import { BuilderDomainOwner } from "@/components/domains/BuilderDomainOwner";
import { selectedBuilderDomain } from "@/lib/domains.functions";
import { useServerFn } from "@tanstack/react-start";
import { enabledBuilderMethods } from "@/lib/payment-methods";
import { billingLabel, billingSuffix } from "@/lib/billing-labels";
import { TemplateImage } from "@/components/template-image";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VoiceGreeter } from "@/components/voice-greeter";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowRight,
  Sparkles,
  Check,
  Loader2,
  Smartphone,
  Globe,
  CreditCard,
  MessageSquare,
  Palette,
  ShieldCheck,
  ShoppingBag,

} from "lucide-react";
import {
  startBuilderSession,
  sendWhatsappOtp,
  verifyWhatsappOtp,
  generateDesigns,
  selectDesign,
  getDomainSuggestions,
  selectDomain,
  selectPlan,
  getEcomAddonOffer,
  selectShopAddon,
  getBuilderOrder,
  submitBuilderPayment,
  finalizeBuilderSession,
  bindBuilderAccount,
  getBuilderSession,
} from "@/lib/builder.functions";
import { getBillingConfig } from "@/lib/billing.functions";
import { getUpiGatewayConfig } from "@/lib/upi-gateway.functions";
import { UpiPayBox } from "@/components/upi-pay-box";
import { BuilderRazorpayButton } from "@/components/billing/BuilderRazorpayButton";
import { MediaUploadButton } from "@/components/media-upload";
import { supabase } from "@/integrations/supabase/client";
import { createBuilderAccount, sendLoginOtp, verifyLoginOtp, setPasswordAfterOtp } from "@/lib/auth-otp.functions";
import { categoriesQuery, servicePlansQuery } from "@/lib/queries";
import { matchCategories } from "@/lib/categories/catalog";
import { templateThumb } from "@/lib/thumb";
import { z } from "zod";

export const Route = createFileRoute("/start")({
  ssr: false,
  validateSearch: (s) =>
    z
      .object({
        name: z.string().optional(),
        category: z.string().optional(),
        template: z.string().uuid().optional().catch(undefined),
        description: z.string().optional(),
        session: z.string().optional(),
        step: z.enum(["details", "verify", "design", "domain", "shop", "plan", "account", "payment", "success"]).optional().catch(undefined),
      })
      .parse(s),
  head: () => ({
    meta: [
      { title: "AI Website Builder — SKTECHLAB" },
      { name: "description", content: "Tell us about your business — our AI builder picks a design, sets up a domain, and launches your website in minutes." },
      { property: "og:title", content: "AI Website Builder — SKTECHLAB" },
      { property: "og:description", content: "Create your website, choose a plan and manage it from your site admin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StartWizard,
});

const STEPS = [
  { key: "details", label: "Details", Icon: Sparkles },
  { key: "verify", label: "Verify", Icon: Smartphone },
  { key: "design", label: "Design", Icon: Palette },
  { key: "domain", label: "Domain", Icon: Globe },
  { key: "shop", label: "+Shop", Icon: ShoppingBag },
  { key: "plan", label: "Plan", Icon: ShieldCheck },

  { key: "account", label: "Site admin", Icon: ShieldCheck },
  { key: "payment", label: "Payment", Icon: CreditCard },
  { key: "success", label: "Done", Icon: Check },
] as const;

type StepKey = typeof STEPS[number]["key"];

function StartWizard() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | undefined>(search.session);
  const [step, setStep] = useState<StepKey>((search.step as StepKey) ?? "details");

  useEffect(() => {
    if (sessionId) navigate({ to: "/start", search: { ...search, session: sessionId, step }, replace: true });
  }, [sessionId, step]);

  // A captured payment can arrive through webhook after the browser has closed.
  // Resume confirmed/submitted sessions from server state, even with a stale URL step.
  useEffect(() => {
    if (!search.session) return;
    let active = true;
    getBuilderSession({ data: { sessionId: search.session } }).then((s: any) => {
      if (!active) return;
      if (s.created_site_id || ["paid", "verified", "submitted"].includes(s.payment_status)) setStep("success");
      else if (!search.step && STEPS.some(item => item.key === s.current_step)) setStep(s.current_step as StepKey);
    }).catch(() => {});
    return () => { active = false; };
  }, [search.session]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 md:py-14">
        <Stepper current={step} />
        <div className="glass mt-8 rounded-3xl p-6 shadow-card md:p-10">
          {step === "details" && (
            <DetailsStep
              prefill={search}
              existingSession={sessionId}
              onNext={(id) => {
                setSessionId(id);
                setStep("verify");
              }}
            />
          )}
          {step === "verify" && sessionId && (
            <VerifyStep sessionId={sessionId} onNext={() => setStep("design")} />
          )}
          {step === "design" && sessionId && (
            <DesignStep sessionId={sessionId} preferredTemplate={search.template} onNext={() => setStep("domain")} />
          )}
          {step === "domain" && sessionId && (
            <DomainStep sessionId={sessionId} onNext={() => setStep("shop")} />
          )}
          {step === "shop" && sessionId && (
            <ShopStep sessionId={sessionId} onNext={() => setStep("plan")} />
          )}

          {step === "plan" && sessionId && (
            <PlanStep sessionId={sessionId} onNext={() => setStep("account")} />
          )}
          {step === "account" && sessionId && <AccountSetupStep sessionId={sessionId} onNext={() => setStep("payment")} />}
          {step === "payment" && sessionId && (
            <PaymentStep sessionId={sessionId} onChangeDomain={() => setStep("domain")} onNext={() => setStep("success")} />
          )}
          {step === "success" && sessionId && <SuccessStep sessionId={sessionId} />}
        </div>
      </main>
      <SiteFooter />
      <VoiceGreeter text="Let's build your website. Bas apna business ka naam aur description dijiye — main design, images, everything handle karta hoon." storageKey="voice.start" />

    </div>
  );
}

/* ----------------- STEPPER ----------------- */

function Stepper({ current }: { current: StepKey }) {
  const idx = STEPS.findIndex((s) => s.key === current);
  return (
    <div className="relative flex items-center justify-between overflow-x-auto">
      {STEPS.map((s, i) => {
        const done = i < idx;
        const active = i === idx;
        return (
          <div key={s.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`grid h-10 w-10 place-items-center rounded-full border-2 transition ${
                  done
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : active
                    ? "border-emerald-500 bg-white text-emerald-600 shadow-glow animate-pulse"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : <s.Icon className="h-4 w-4" />}
              </div>
              <div className={`text-[10px] font-medium md:text-xs ${active ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mx-1 h-0.5 flex-1 ${i < idx ? "bg-emerald-500" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ----------------- STEP 1: DETAILS ----------------- */

function DetailsStep({
  prefill,
  existingSession,
  onNext,
}: {
  prefill: { name?: string; category?: string; description?: string };
  existingSession?: string;
  onNext: (id: string) => void;
}) {
  const [name, setName] = useState(prefill.name ?? "");
  const [search, setSearch] = useState(prefill.category ?? "");
  const [picked, setPicked] = useState<{ slug: string; name: string } | null>(null);
  const [description, setDescription] = useState(prefill.description ?? "");
  const [busy, setBusy] = useState(false);
  const { data: allCats = [] } = useQuery(categoriesQuery);

  const cats = (allCats as any[]).map((c) => ({ slug: String(c.slug), name: String(c.name) }));
  const term = search.trim().toLowerCase();

  // Smart match: whatever the customer types (Hindi words included) is matched
  // against every category's name, synonyms and sub-categories. The customer
  // then taps one, so the designs we show are always from that exact category.
  const smart = term.length > 1 ? matchCategories(`${search} ${description}`, cats, 12) : [];
  const plain = term.length > 0 ? cats.filter((c) => c.name.toLowerCase().includes(term)) : cats;
  const seen = new Set<string>();
  const options = [...smart, ...plain]
    .filter((c: any) => (seen.has(c.slug) ? false : (seen.add(c.slug), true)))
    .slice(0, 18);

  const submit = async () => {
    if (name.trim().length < 2) return toast.error("Enter a business name");
    if (!picked) return toast.error("Apni category search karke select kijiye");
    setBusy(true);
    try {
      const res = await startBuilderSession({
        data: {
          name: name.trim(),
          category: picked.name,
          categorySlug: picked.slug,
          description: description.trim(),
          sessionId: existingSession,
        },
      });
      onNext(res.sessionId);
    } catch (e: any) {
      toast.error(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600">
          <Sparkles className="h-3 w-3" /> Step 1 of 6
        </span>
        <h1 className="mt-4 text-3xl font-bold md:text-4xl">Let's build your website</h1>
        <p className="mt-2 text-muted-foreground">Tell our AI about your business — takes 30 seconds.</p>
      </div>
      <div className="mt-8 space-y-5">
        <div>
          <Label>Business name*</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sharma Jewellers" className="mt-1 h-12" />
        </div>
        <div>
          <Label>Your business category*</Label>
          {picked ? (
            <div className="mt-1 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 px-4 py-3">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                <span className="truncate">{picked.name}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setPicked(null);
                  setSearch("");
                }}
                className="shrink-0 text-xs font-medium text-muted-foreground underline"
              >
                Change
              </button>
            </div>
          ) : (
            <>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search: mehndi artist, car rental, medical store, tailor…"
                className="mt-1 h-12"
              />
              <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-border/70 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {options.length === 0 && (
                    <span className="p-2 text-xs text-muted-foreground">No match — try another word.</span>
                  )}
                  {options.map((s: any) => (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => {
                        setPicked({ slug: s.slug, name: s.name });
                        setSearch(s.name);
                      }}
                      className="rounded-full border px-3 py-1.5 text-xs hover:border-primary hover:text-primary"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Category select karna zaroori hai — designs isi category ke aayenge.
              </p>
            </>
          )}
        </div>

        <div>
          <Label>Describe your business (optional)</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What you offer, area you serve, unique selling points…"
            rows={4}
            className="mt-1"
          />
        </div>
        <Button onClick={submit} disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/* ----------------- STEP 2: VERIFY ----------------- */

function VerifyStep({ sessionId, onNext }: { sessionId: string; onNext: () => void }) {
  const [whatsapp, setWhatsapp] = useState("+91");
  const [otpSent, setOtpSent] = useState(false);
  const [demoCode, setDemoCode] = useState<string | undefined>();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (whatsapp.length < 10) return toast.error("Enter a valid WhatsApp number");
    setBusy(true);
    try {
      const res: any = await sendWhatsappOtp({ data: { sessionId, whatsapp } });
      setOtpSent(true);
      if (res.demo && res.code) {
        setDemoCode(res.code);
        toast.success(`Demo OTP (Twilio not configured): ${res.code}`);
      } else {
        toast.success("OTP sent to your WhatsApp");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (code.length !== 6) return toast.error("Enter 6-digit code");
    setBusy(true);
    try {
      await verifyWhatsappOtp({ data: { sessionId, whatsapp, code } });
      toast.success("Verified!");
      onNext();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
        <MessageSquare className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-3xl font-bold">Verify WhatsApp</h1>
      <p className="mt-2 text-muted-foreground">We'll send updates about your website on WhatsApp.</p>

      {!otpSent ? (
        <div className="mt-6 space-y-4 text-left">
          <div>
            <Label>WhatsApp number</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="mt-1 h-12" placeholder="+919999999999" />
          </div>
          <Button onClick={send} disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Send OTP
          </Button>
        </div>
      ) : (
        <div className="mt-6 space-y-4 text-left">
          {demoCode && (
            <div className="rounded-xl bg-amber-500/10 p-3 text-center text-sm text-amber-700">
              Demo mode — OTP: <b>{demoCode}</b>
            </div>
          )}
          <div>
            <Label>Enter 6-digit code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mt-1 h-14 text-center text-2xl tracking-widest"
              placeholder="••••••"
            />
          </div>
          <Button onClick={verify} disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Verify & Continue
          </Button>
          <button onClick={send} className="w-full text-xs text-muted-foreground hover:text-foreground">
            Resend code
          </button>
        </div>
      )}
    </div>
  );
}

/* ----------------- STEP 3: DESIGN ----------------- */

function DesignStep({ sessionId, preferredTemplate, onNext }: { sessionId: string; preferredTemplate?: string; onNext: () => void }) {
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [ai, setAi] = useState<any>({});
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      generateDesigns({ data: { sessionId } }),
      preferredTemplate ? supabase.from("templates").select("*, categories(name, slug)").eq("id", preferredTemplate).maybeSingle() : Promise.resolve({ data: null }),
    ]).then(async ([res, selected]: any[]) => {
      if (cancelled) return;
      const choices = res.templates ?? [];
      let preferred = selected.data && (choices.find((t: any) => t.id === selected.data.id) || selected.data);
      if (preferred && preferred.presentationIndex === undefined) {
        const { data: siblings } = await supabase.from("templates").select("id").eq("category_id", preferred.category_id).order("id");
        preferred = { ...preferred, presentationIndex: siblings?.findIndex((t: any) => t.id === preferred.id) ?? 0 };
      }
      if (cancelled) return;
      setTemplates(preferred ? [preferred, ...choices.filter((t: any) => t.id !== preferred.id)] : choices);
      setAi(res.ai ?? {});
    }).catch(e => { if (!cancelled) toast.error(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId, preferredTemplate]);

  const pick = async (id: string) => {
    setPicking(true);
    try {
      await selectDesign({ data: { sessionId, templateId: id } });
      onNext();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPicking(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full bg-emerald-500/10">
          <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
        </div>
        <h2 className="text-2xl font-bold">Our AI is designing your website…</h2>
        <p className="mt-2 text-muted-foreground">Picking the best templates and writing content for your business.</p>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3">
          {["Matching category", "Writing copy", "Selecting colors"].map((t, i) => (
            <div key={t} className="rounded-xl border border-border bg-card p-4 text-xs" style={{ animationDelay: `${i * 300}ms` }}>
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/2 animate-marquee bg-emerald-500" />
              </div>
              <div className="mt-2 font-medium">{t}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return <DesignCarousel templates={templates} ai={ai} picking={picking} onPick={pick} />;
}

function DesignCarousel({
  templates,
  ai,
  picking,
  onPick,
}: {
  templates: any[];
  ai: any;
  picking: boolean;
  onPick: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const [live, setLive] = useState(false);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const total = templates.length;
  const current = templates[index];

  const go = (dir: 1 | -1) => {
    if (!total) return;
    setLive(false);
    setIndex((i) => (i + dir + total) % total);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  if (!total || !current) {
    return (
      <div className="glass rounded-2xl p-10 text-center text-sm text-muted-foreground">
        No designs found for this category yet. Please go back and try another category.
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-bold md:text-4xl">Pick your favourite design</h1>
        <p className="mt-2 text-muted-foreground">
          {ai.tagline ? `AI-crafted: "${ai.tagline}"` : "Swipe through the designs made for your business"}
        </p>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-3xl border border-border bg-card shadow-card">
        {/* stage */}
        <div className="relative bg-muted/40">
          <div className={device === "mobile" ? "mx-auto w-full max-w-[380px] p-4" : "p-0"}>
            <div className={`relative overflow-hidden bg-background ${device === "mobile" ? "aspect-[9/16] rounded-[1.6rem] border border-border" : "aspect-[16/10]"}`}>
              {live ? (
                <iframe
                  key={current.id}
                  src={`/preview/${current.id}`}
                  title={current.name}
                  loading="lazy"
                  className="h-full w-full border-0"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setLive(true)}
                  className="group relative block h-full w-full"
                >
                  <TemplateCover t={current} index={current.presentationIndex ?? index} />
                  <span className="absolute inset-0 grid place-items-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                    <span className="rounded-full bg-background/90 px-4 py-2 text-xs font-semibold">Open live preview</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* arrows */}
          <button
            type="button"
            aria-label="Previous design"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 shadow-card hover:bg-background"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next design"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-border bg-background/90 shadow-card hover:bg-background"
          >
            ›
          </button>
        </div>

        {/* details */}
        <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {current.categories?.name} · Design {index + 1} of {total}
            </div>
            <div className="mt-1 truncate text-lg font-semibold">{current.name}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-border p-1 text-xs">
              {(["desktop", "mobile"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDevice(d)}
                  className={`rounded-md px-3 py-1 font-medium capitalize ${device === d ? "bg-muted" : "text-muted-foreground"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setLive((v) => !v)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold hover:bg-muted"
            >
              {live ? "Show image" : "Live preview"}
            </button>
            <Button disabled={picking} onClick={() => onPick(current.id)} className="bg-gradient-brand text-brand-foreground shadow-glow">
              Use this design
            </Button>
          </div>
        </div>
      </div>

      {/* thumbnail strip */}
      <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
        {templates.map((t: any, i: number) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setLive(false); setIndex(i); }}
            className={`snap-start shrink-0 overflow-hidden rounded-xl border-2 transition ${i === index ? "border-emerald-500 shadow-glow" : "border-border opacity-70 hover:opacity-100"}`}
          >
            <TemplateImage t={t} w={400} alt={t.name} className="h-20 w-32 object-cover object-top" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ----------------- STEP 4: DOMAIN ----------------- */

type DomainType = "free_subdomain" | "paid_suggested" | "byo_nameserver" | "buy_with_us";

function DomainStep({ sessionId, onNext }: { sessionId: string; onNext: () => void }) {
  const [loading, setLoading] = useState(true), [free, setFree] = useState<string[]>([]), [selected, setSelected] = useState("");
  const [mode, setMode] = useState<"free" | "buy" | "owned">("free"), [owned, setOwned] = useState("");
  const [quote, setQuote] = useState<DomainQuote | null>(null), [busy, setBusy] = useState(false), [loadError, setLoadError] = useState("");
  useEffect(() => {
    let alive = true;
    getDomainSuggestions({ data: { sessionId } }).then((res: any) => { if (!alive) return; setFree(res.free || []); setSelected(res.free?.[0] || ""); }).catch(e => { if (alive) setLoadError(e.message); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [sessionId]);
  const submit = async () => {
    setBusy(true);
    try {
      if (mode === "buy" && (!quote || Date.parse(quote.expiresAt) <= Date.now())) throw new Error("Check domain availability again before continuing.");
      await selectDomain({ data: { sessionId, domain: mode === "free" ? selected : mode === "owned" ? owned : quote!.domain, type: mode === "free" ? "free_subdomain" : mode === "owned" ? "byo_nameserver" : "buy_with_us", ...(mode === "buy" ? { quoteId: quote!.quoteId } : {}) } });
      onNext();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };
  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (loadError) return <p role="alert" className="text-sm text-destructive">{loadError}</p>;
  return <div className="mx-auto max-w-2xl space-y-6"><div className="text-center"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">YOUR WEBSITE ADDRESS</p><h1 className="mt-3 text-3xl font-bold">A name that belongs to you.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Start free, buy a domain with your plan, or connect an address you already own.</p></div>
    <div className="grid grid-cols-3 gap-2" role="group" aria-label="Domain option">{([{ key: "free", title: "Free address" }, { key: "buy", title: "Buy a domain" }, { key: "owned", title: "I own a domain" }] as const).map(item => <Button key={item.key} variant={mode === item.key ? "default" : "outline"} className="h-auto whitespace-normal py-3 text-xs" onClick={() => setMode(item.key)} aria-pressed={mode === item.key}>{item.title}</Button>)}</div>
    {mode === "free" && <div className="space-y-3">{free.length ? free.map(domain => <label key={domain} className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 ${selected === domain ? "border-primary bg-primary/5" : "border-border"}`}><span className="flex min-w-0 items-center gap-3"><input type="radio" name="free-domain" checked={selected === domain} onChange={() => setSelected(domain)} /><span className="break-all text-sm">{domain}</span></span><span className="shrink-0 text-xs font-semibold text-primary">FREE</span></label>) : <p className="rounded-xl border border-border p-5 text-sm text-muted-foreground">No free address is currently available for this name. Try a different business name or connect your own domain.</p>}</div>}
    {mode === "buy" && <><DomainSearch scope={{ sessionId }} selected={quote?.quoteId} onSelect={setQuote} />{quote && <p className="rounded-xl bg-primary/5 p-4 text-sm"><strong>{quote.domain}</strong> · ₹{quote.priceInr.toLocaleString("en-IN")} first year will be added to checkout. Renewal estimate ₹{quote.renewalInr.toLocaleString("en-IN")}/year.</p>}</>}
    {mode === "owned" && <section className="space-y-3 rounded-2xl border border-border bg-card p-5"><Label>Your existing domain</Label><Input placeholder="yourbusiness.com" value={owned} onChange={e => setOwned(e.target.value)} /><p className="text-xs leading-5 text-muted-foreground">No registration charge is added. You will receive the actual DNS connection instructions in your dashboard; ownership and DNS are verified separately.</p></section>}
    <Button size="lg" className="w-full" disabled={busy || (mode === "free" ? !selected : mode === "owned" ? !owned.trim() : !quote || quote.sandbox)} onClick={submit}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Continue<ArrowRight className="ml-2 h-4 w-4" /></Button>
  </div>;
}

/* ----------------- STEP 5: +SHOP ADD-ON ----------------- */

const SHOP_PERKS = [
  "Product catalogue with photos, variants & stock",
  "Cart, checkout, COD / UPI / bank / crypto payments",
  "Orders, invoices & WhatsApp order alerts",
  "Coupons, collections & shipping settings",
];

function ShopStep({ sessionId, onNext }: { sessionId: string; onNext: () => void }) {
  const [offer, setOffer] = useState<any>(null);
  const [wants, setWants] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const rupees = new Intl.NumberFormat("en-IN");
  const awaitSkipShop = () => selectShopAddon({ data: { sessionId, wants: false } }).then(onNext).catch(e => toast.error(e.message));

  useEffect(() => {
    let alive = true;
    getEcomAddonOffer()
      .then((o: any) => {
        if (!alive) return;
        setOffer(o);
        if (!o?.enabled) { awaitSkipShop(); }
      })
      .catch(() => { setOffer({ enabled: false, error: true }); toast.error("Could not load shop options. Retry before continuing."); });
    return () => {
      alive = false;
    };
  }, [onNext]);

  const submit = async (choice: boolean) => {
    setBusy(true);
    try {
      await selectShopAddon({ data: { sessionId, wants: choice } });
      onNext();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!offer) {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (offer.error) return <div role="alert" className="rounded-2xl border border-border p-6 text-center"><p className="text-sm text-muted-foreground">Shop options could not be loaded. Retry before continuing.</p><Button className="mt-4" onClick={() => getEcomAddonOffer().then(o => { setOffer(o); if (!o.enabled) awaitSkipShop(); }).catch(e => toast.error(e.message))}>Retry shop options</Button></div>;
  if (offer.enabled === false) return <div className="rounded-2xl border border-border p-6 text-center"><p className="text-sm text-muted-foreground">Shop upgrades are currently unavailable. Continue with your website.</p><Button className="mt-4" onClick={awaitSkipShop}>Continue without shop</Button></div>;
  const period = offer.billing === "yearly" ? "/yr" : offer.billing === "one_time" ? " one-time" : "/mo";

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Add an online shop?</h1>
        <p className="mt-2 text-muted-foreground">
          Apni website par products bech-na ho to “+Shop” add karein. Baad me bhi add kar sakte hain.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <button
          onClick={() => setWants(true)}
          className={`text-left rounded-2xl border-2 p-6 transition ${wants === true ? "border-emerald-500 bg-emerald-500/5 shadow-glow" : "border-border bg-card"}`}
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <ShoppingBag className="h-4 w-4" /> Recommended
          </div>
          <div className="mt-1 text-xl font-bold">{offer.label}</div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-bold text-gradient">+₹{rupees.format(offer.price)}</span>
            <span className="text-xs text-muted-foreground">{period}</span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{offer.desc}</p>
          <ul className="mt-4 space-y-2 text-xs">
            {SHOP_PERKS.map((f) => (
              <li key={f} className="flex gap-2">
                <Check className="h-3 w-3 shrink-0 text-emerald-500" /> {f}
              </li>
            ))}
            <li className="flex gap-2">
              <Check className="h-3 w-3 shrink-0 text-emerald-500" /> Up to {offer.productLimit} products
            </li>
          </ul>
        </button>

        <button
          onClick={() => setWants(false)}
          className={`text-left rounded-2xl border-2 p-6 transition ${wants === false ? "border-emerald-500 bg-emerald-500/5 shadow-glow" : "border-border bg-card"}`}
        >
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Website only</div>
          <div className="mt-1 text-xl font-bold">No shop for now</div>
          <div className="mt-3 text-3xl font-bold">₹0</div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sirf website — enquiry form, WhatsApp aur gallery ke saath. Shop kabhi bhi dashboard se add ho sakti hai.
          </p>
        </button>
      </div>

      <Button
        onClick={() => submit(wants === true)}
        disabled={busy || wants === null}
        size="lg"
        className="mt-8 w-full bg-gradient-brand text-brand-foreground shadow-glow"
      >
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

/* ----------------- STEP 6: PLAN ----------------- */


function PlanStep({ sessionId, onNext }: { sessionId: string; onNext: () => void }) {
  const { data: allPlans } = useSuspenseQuery(servicePlansQuery("site_subscription"));
  // Every website needs a paid plan — free (₹0) options are never offered here.
  const plans = (allPlans as any[]).filter((p) => Number(p.price_inr) > 0);
  const basePlan = plans.find((p) => p.is_base) ?? plans[0];
  const [picked, setPicked] = useState<string | null>(basePlan?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [addon, setAddon] = useState<{ price: number; label: string } | null>(null);
  const rupees = new Intl.NumberFormat("en-IN");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s: any = await getBuilderSession({ data: { sessionId } });
        if (!alive || !s?.wants_ecommerce) return;
        const o: any = await getEcomAddonOffer();
        if (alive) setAddon({ price: Number(s.ecom_addon_price_inr ?? o.price), label: o.label });
      } catch {
        /* add-on summary is optional */
      }
    })();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const { data: domainPrice } = useQuery({ queryKey: ["builder_domain_price", sessionId], queryFn: () => selectedBuilderDomain({ data: { sessionId } }) });
  const pickedPlan = plans.find((p: any) => p.id === picked);
  const total = Number(pickedPlan?.price_inr ?? 0) + (Number(pickedPlan?.ecom_product_limit) > 0 ? 0 : Number(addon?.price ?? 0)) + Number(domainPrice?.price || 0);


  const submit = async () => {
    if (!picked) return toast.error("Select a plan");
    setBusy(true);
    try {
      await selectPlan({ data: { sessionId, planId: picked } });
      onNext();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="text-center">
        <h1 className="text-3xl font-bold">Website Plan</h1>
        <p className="mt-2 text-muted-foreground">
          Choose Silver, Gold or Platinum.
        </p>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p: any) => {
          const active = picked === p.id;
          const features: string[] = Array.isArray(p.features) ? p.features : [];
          return (
            <button
              key={p.id}
              onClick={() => setPicked(p.id)}
              className={`text-left rounded-2xl border-2 p-6 transition ${active ? "border-emerald-500 bg-emerald-500/5 shadow-glow" : "border-border bg-card"}`}
            >
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
                <span>{p.tier}</span>
                {p.is_base ? (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">Required</span>
                ) : null}
              </div>
              <div className="mt-1 text-xl font-bold">{p.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-gradient">₹{rupees.format(p.price_inr)}</span>
                <span className="text-xs text-muted-foreground">{billingSuffix(p.billing)}</span>
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{billingLabel(p.billing)}</div>
              <ul className="mt-4 space-y-2 text-xs">
                {features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex gap-2"><Check className="h-3 w-3 shrink-0 text-emerald-500" /> {f}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {pickedPlan ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{pickedPlan.name}</span>
            <span className="font-medium">₹{rupees.format(pickedPlan.price_inr)}</span>
          </div>
          {addon && !Number(pickedPlan.ecom_product_limit) ? (
            <div className="mt-2 flex items-center justify-between">
              <span className="flex items-center gap-2 text-muted-foreground">
                <ShoppingBag className="h-3.5 w-3.5" /> {addon.label}
              </span>
              <span className="font-medium">+₹{rupees.format(addon.price)}</span>
            </div>
          ) : null}
          {Number(pickedPlan.ecom_product_limit) > 0 && <p className="mt-3 text-xs text-primary">Shop included · Up to {pickedPlan.ecom_product_limit} products · No separate shop charge</p>}
          {domainPrice && <div className="mt-3 flex justify-between gap-3 text-sm"><span className="text-muted-foreground">{domainPrice.domain} · first year</span><span>+₹{rupees.format(domainPrice.price)}</span></div>}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-bold">
            <span>Total</span>
            <span className="text-gradient">₹{rupees.format(total)}</span>
          </div>
        </div>
      ) : null}

      <Button onClick={submit} disabled={busy || !picked} size="lg" className="mt-8 w-full bg-gradient-brand text-brand-foreground shadow-glow">
        Continue <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

/* ----------------- STEP 6: PAYMENT ----------------- */

type PayMethod = "upi_auto" | "manual_upi" | "bank_transfer" | "crypto" | "razorpay";

function PaymentStep({ sessionId, onNext, onChangeDomain }: { sessionId: string; onNext: () => void; onChangeDomain: () => void }) {
  const rupees = new Intl.NumberFormat("en-IN");
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [cfg, setCfg] = useState<any>(null);
  const [upiCfg, setUpiCfg] = useState<any>(null);
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState("");
  const [note, setNote] = useState("");
  const [agree, setAgree] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoadError(null);
      try {
        const o = await getBuilderOrder({ data: { sessionId } });
        if (!alive) return;
        setOrder(o);
      } catch (e: any) {
        if (!alive) return;
        setLoadError(e?.message ?? "Could not load your order");
        return;
      }
      // Payment options are optional extras — a failure here must not block the page.
      const [c, u] = await Promise.all([
        getBillingConfig().catch(() => null),
        getUpiGatewayConfig().catch(() => null),
      ]);
      if (!alive) return;
      setCfg(c);
      setUpiCfg(u);
      const available = enabledBuilderMethods((c as any)?.gateways ?? [], Boolean((u as any)?.enabled)).filter(key => key !== "razorpay" || (c as any)?.razorpayEnabled);
      setMethod(available[0] ?? null);
    })();
    return () => { alive = false; };
  }, [sessionId, reload]);

  const copy = (v: string) => {
    navigator.clipboard?.writeText(v);
    toast.success("Copied");
  };

  const allMethods: { key: PayMethod; label: string; desc: string; on: boolean }[] = [
    { key: "upi_auto", label: String(upiCfg?.displayName ?? "UPI — instant"), desc: "Scan QR · auto verified", on: Boolean(upiCfg?.enabled) },
    { key: "manual_upi", label: "UPI / QR", desc: String(cfg?.manualUpi?.id ?? "Pay to our UPI ID"), on: Boolean(cfg?.manualUpi?.enabled) },
    { key: "bank_transfer", label: "Bank transfer", desc: "NEFT / IMPS — share UTR", on: Boolean(cfg?.bank?.enabled) },
    { key: "crypto", label: "Crypto", desc: String(cfg?.crypto?.network ?? "USDT / other"), on: Boolean(cfg?.crypto?.enabled) },
    { key: "razorpay", label: "Razorpay", desc: "Card / UPI / Netbanking", on: Boolean(cfg?.razorpayEnabled) },
  ];
  const methods = allMethods.filter((m) => m.on);

  const submit = async () => {
    if (order?.domainCharge && !order.registrantSaved) return toast.error("Save domain-owner details before payment.");
    if (!agree) return toast.error("Accept the terms before payment.");
    if (!method) return toast.error("No payment method is enabled. Contact support.");
    if (method === "razorpay" || method === "upi_auto") return toast.error("Complete the secure payment above.");
    if (!reference.trim() && !proof.trim()) {
      return toast.error("Transaction reference ya screenshot me se ek zaroori hai");
    }
    setBusy(true);
    try {
      {
        await submitBuilderPayment({
          data: {
            sessionId,
            gateway: method,
            amount: Number(order?.total ?? 0),
            reference: reference.trim() || undefined,
            note: note.trim() || undefined,
            screenshotUrl: proof.trim() || undefined,
          },
        });
        toast.success("Payment details mil gaye — team verify karke plan activate karegi.");
      }
      onNext();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit payment");
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-6 text-center">
        <h2 className="text-lg font-bold">Order load nahi ho paya</h2>
        <p className="mt-2 text-sm text-muted-foreground">{loadError}</p>
        <Button className="mt-4 w-full" onClick={() => setReload((n) => n + 1)}>Retry</Button><Button variant="outline" className="mt-2 w-full" onClick={onChangeDomain}>Review domain selection</Button>
      </div>
    );
  }

  if (!order) {
    return <div className="py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <CreditCard className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">Review &amp; pay</h1>
        <p className="mt-2 text-muted-foreground">Order confirm karke payment details bhejiye.</p>
      </div>

      {/* Order summary */}
      <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
        <div className="font-semibold">Order summary</div>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Business</dt><dd className="text-right font-medium">{order.businessName}</dd></div>
          {order.category ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Category</dt><dd className="text-right">{order.category}</dd></div> : null}
          {order.template ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Design</dt><dd className="text-right">{order.template}</dd></div> : null}
          {order.domain ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Domain</dt><dd className="break-all text-right">{order.domain}</dd></div> : null}
        </dl>
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">{order.plan?.name ?? "Plan"} · {billingLabel(order.plan?.billing)}</span>
            <span className="font-medium">₹{rupees.format(order.plan?.price ?? 0)}</span>
          </div>
          {order.addon ? (
            <div className="flex justify-between gap-4">
              <span className="flex items-center gap-2 text-muted-foreground"><ShoppingBag className="h-3.5 w-3.5" /> {order.addon.label}</span>
              <span className="font-medium">+₹{rupees.format(order.addon.price)}</span>
            </div>
          ) : null}
        </div>
        {order.domainCharge && <div className="mt-3 flex justify-between gap-3 border-t border-border pt-3 text-sm"><span>{order.domainCharge.domain} · first year<br /><span className="text-xs text-muted-foreground">Renewal estimate ₹{rupees.format(order.domainCharge.renewal)}/year</span></span><strong>₹{rupees.format(order.domainCharge.price)}</strong></div>}
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-base font-bold">
          <span>Total payable</span>
          <span className="text-gradient">₹{rupees.format(order.total)}</span>
        </div>
      </div>

      {order.domainCharge && !order.registrantSaved && <BuilderDomainOwner sessionId={sessionId} onSaved={() => setReload(n => n + 1)} />}
      {order.domainCharge && order.registrantSaved && <p className="mt-4 rounded-xl bg-primary/5 p-3 text-xs text-primary">Domain-owner details saved. Your verified account email will receive registrar verification messages.</p>}
      {!order.checkoutLocked && <Button variant="ghost" size="sm" className="mt-2" onClick={onChangeDomain}>Change domain selection</Button>}
      {/* Legal consent */}
      <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
          />
          <span>
            I agree to the{" "}
            <a href="/terms-and-conditions" target="_blank" rel="noreferrer" className="underline">Terms &amp; Conditions</a>{" "}
            and{" "}
            <a href="/privacy-policy" target="_blank" rel="noreferrer" className="underline">Privacy Policy</a>.
          </span>
        </label>
        <div className="mt-2 pl-7 text-xs text-muted-foreground">
          Also read our{" "}
          <a href="/refund-policy" target="_blank" rel="noreferrer" className="underline">Refund &amp; Cancellation Policy</a>{" "}
          and{" "}
          <a href="/delivery-policy" target="_blank" rel="noreferrer" className="underline">Digital Delivery Policy</a>.
        </div>
      </div>

      {methods.length === 0 && <p role="status" className="mt-5 text-sm text-muted-foreground">Payments are temporarily unavailable. Contact <a href="mailto:support@sktechlab.com" className="underline">support@sktechlab.com</a> or try again later.</p>}
      {/* Payment methods */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {methods.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMethod(m.key)}
            className={`rounded-xl border-2 p-4 text-left transition ${method === m.key ? "border-emerald-500 bg-emerald-500/5" : "border-border bg-card"}`}
          >
            <div className="text-sm font-semibold">{m.label}</div>
            <div className="truncate text-xs text-muted-foreground">{m.desc}</div>
          </button>
        ))}
      </div>

      {method === "upi_auto" && agree && (!order.domainCharge || order.registrantSaved) && (
        <div className="mt-4">
          <UpiPayBox
            amount={Number(order.total)}
            referenceId={sessionId}
            purpose="builder"
            note={`Website plan — ${order.businessName}`}
            onPaid={() => onNext()}
          />
        </div>
      )}

      {method === "manual_upi" && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Pay ₹{rupees.format(order.total)} to our UPI</div>
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted/60 px-2 py-1">{cfg?.manualUpi?.id ?? "—"}</code>
              {cfg?.manualUpi?.id ? (
                <Button size="sm" variant="ghost" onClick={() => copy(String(cfg.manualUpi.id))}>Copy</Button>
              ) : null}
            </div>
            {cfg?.manualUpi?.name ? <div className="text-muted-foreground">Name: {cfg.manualUpi.name}</div> : null}
          </div>
          {cfg?.manualUpi?.qr ? (
            <img src={String(cfg.manualUpi.qr)} alt="UPI QR code" className="h-32 w-32 rounded-lg object-cover" loading="lazy" />
          ) : null}
        </div>
      )}

      {method === "crypto" && (
        <div className="mt-4 grid gap-4 rounded-2xl border border-border p-4 sm:grid-cols-[1fr_auto]">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">Crypto payment</div>
            <div className="flex items-center gap-2">
              <code className="break-all rounded bg-muted/60 px-2 py-1 text-xs">{cfg?.crypto?.address ?? "—"}</code>
              {cfg?.crypto?.address ? (
                <Button size="sm" variant="ghost" onClick={() => copy(String(cfg.crypto.address))}>Copy</Button>
              ) : null}
            </div>
            {cfg?.crypto?.network ? <div className="text-muted-foreground">Network: {cfg.crypto.network}</div> : null}
          </div>
          {cfg?.crypto?.qr ? (
            <img src={String(cfg.crypto.qr)} alt="Crypto wallet QR code" className="h-32 w-32 rounded-lg object-cover" loading="lazy" />
          ) : null}
        </div>
      )}

      {method === "bank_transfer" && (
        <div className="mt-4 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
          <p>NEFT / IMPS: ₹{rupees.format(order.total)}</p>
          {cfg?.bank?.bank_name && <p>{cfg.bank.bank_name}</p>}
          {cfg?.bank?.account_name && <p>{cfg.bank.account_name}</p>}
          {cfg?.bank?.account_number && <p>Account: {cfg.bank.account_number}</p>}
          {cfg?.bank?.ifsc && <p>IFSC: {cfg.bank.ifsc}</p>}
        </div>
      )}

      {method === "razorpay" && (
        <div className="mt-4 rounded-2xl border border-border p-4 text-sm text-muted-foreground">
          Card / UPI / Netbanking — ₹{rupees.format(order.total)}
        </div>
      )}

      {method === "razorpay" && <BuilderRazorpayButton sessionId={sessionId} disabled={!agree || (!!order.domainCharge && !order.registrantSaved)} onPaid={onNext} />}
      {method && method !== "upi_auto" && method !== "razorpay" && (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Transaction / UTR reference</Label>
              <Input className="mt-1" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 4839201938" />
            </div>
            <div>
              <Label>Payment screenshot</Label>
              <div className="mt-1 flex items-center gap-2">
                <Input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="Upload or paste link" />
                <MediaUploadButton label="Upload" onUploaded={(u) => setProof(u[0] ?? "")} />
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Label>Note (optional)</Label>
            <Textarea className="mt-1" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything our team should know" />
          </div>

          <Button onClick={submit} disabled={busy || !agree || !method || (!!order.domainCharge && !order.registrantSaved)} size="lg" className="mt-6 w-full bg-gradient-brand text-brand-foreground shadow-glow">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Pay ₹{rupees.format(order.total)} &amp; finish
          </Button>
        </>
      )}
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Payment verify hote hi aapka plan activate ho jayega — site abhi ban jayegi.
      </p>
    </div>
  );
}

/* ----------------- STEP 7: SUCCESS ----------------- */

function AccountSetupStep({ sessionId, onNext }: { sessionId: string; onNext: () => void }) {
  const bind = useServerFn(bindBuilderAccount);
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "need_signup" | "creating" | "done">("checking");
  const [setupError, setSetupError] = useState<string | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState<"otp" | "email">("otp");
  const [newAccount, setNewAccount] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s: any = await getBuilderSession({ data: { sessionId } });
        if (!alive) return;
        setSession(s); setName(s.business_name ?? "");
        if (s.whatsapp) setOtpPhone(String(s.whatsapp).replace(/^\+/, ""));
        const { data } = await supabase.auth.getUser();
        if (!alive) return;
        if (data.user) {
          await bind({ data: { sessionId } });
          if (alive) onNext();
        } else setStatus("need_signup");
      } catch (error) {
        if (alive) { setSetupError(error instanceof Error ? error.message : "Could not load account setup."); setStatus("need_signup"); }
      }
    })();
    return () => { alive = false; };
  }, [sessionId]);

  const finalize = async () => {
    setStatus("creating");
    await bind({ data: { sessionId } });
    onNext();
  };

  const signupAndFinalize = async () => {
    if (!email || password.length < 6) return toast.error("Enter email and 6+ character password");
    setBusy(true);
    try {
      if (newAccount) {
        await createBuilderAccount({
          data: { sessionId, email, password, name: name || undefined, whatsapp: session?.whatsapp ?? undefined },
        });
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(/invalid login credentials/i.test(error.message) ? "Email or password is incorrect. Try again or reset your password." : error.message);
      await finalize();
    } catch (e: any) {
      toast.error(e?.message || "Could not create your account");
      setStatus("need_signup");
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    if (otpPhone.replace(/\D/g, "").length < 10) return toast.error("Enter a valid WhatsApp number");
    setBusy(true);
    try {
      const r: any = await sendLoginOtp({ data: { phone: otpPhone } });
      setOtpSent(true);
      if (r?.demo && r?.code) toast.info(`Demo mode: your code is ${r.code}`, { duration: 8000 });
      else toast.success("Code sent on WhatsApp");
    } catch (e: any) {
      toast.error(e?.message || "Could not send code");
    } finally {
      setBusy(false);
    }
  };

  const verifyAndFinalize = async () => {
    if (otpCode.length !== 6) return toast.error("Enter the 6-digit code");
    setBusy(true);
    try {
      const r: any = await verifyLoginOtp({ data: { phone: otpPhone, code: otpCode, name: name || undefined } });
      if (r.tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: r.tokenHash });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: r.password });
        if (error) throw error;
      }
      if (password.length >= 6) {
        try {
          await setPasswordAfterOtp({ data: { phone: otpPhone, code: otpCode, password } });
        } catch {
          /* password is optional — login already succeeded */
        }
      }
      await finalize();
    } catch (e: any) {
      toast.error(e?.message || "Invalid code");
      setStatus("need_signup");
    } finally {
      setBusy(false);
    }
  };

  if (setupError) return <div className="py-8 text-center"><p role="alert">{setupError}</p><Button className="mt-4" variant="outline" onClick={() => { window.location.href = "/start"; }}>Start a new website</Button></div>;

  if (status === "checking" || status === "creating") return <div className="py-16 text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></div>;

  if (status === "need_signup") {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-3xl font-bold">Site admin account</h1>
        <p className="mt-2 text-muted-foreground">Set up your website admin login before payment.</p>

        <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setMethod("otp")}
            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${method === "otp" ? "bg-background shadow-soft" : "text-muted-foreground"}`}
          >
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp OTP
          </button>
          <button
            type="button"
            onClick={() => setMethod("email")}
            className={`flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition ${method === "email" ? "bg-background shadow-soft" : "text-muted-foreground"}`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Email & password
          </button>
        </div>

        <div className="mt-4 space-y-3 text-left">
          <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 h-12" /></div>

          {method === "email" ? (
            <>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={newAccount} onChange={e => setNewAccount(e.target.checked)} /> Create a new site-admin account</label>
              <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12" type="email" /></div>
              <div><Label>Password</Label><Input value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 h-12" type="password" placeholder="Minimum 6 characters" /></div>
              <Button onClick={signupAndFinalize} disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {newAccount ? "Create account & continue" : "Sign in & continue"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                <a href="/reset-password" className="underline">Reset password</a>
              </p>
            </>
          ) : (
            <>
              <div>
                <Label>WhatsApp number</Label>
                <Input
                  value={otpPhone}
                  onChange={(e) => setOtpPhone(e.target.value)}
                  className="mt-1 h-12"
                  type="tel"
                  inputMode="numeric"
                  placeholder="90000 00000"
                />
              </div>
              {!otpSent ? (
                <Button onClick={sendCode} disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Send OTP on WhatsApp
                </Button>
              ) : (
                <>
                  <div>
                    <Label>6-digit code</Label>
                    <Input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      className="mt-1 h-12 text-center text-2xl tracking-[0.4em]"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </div>
                  <div>
                    <Label>Set a password <span className="text-xs text-muted-foreground">(optional)</span></Label>
                    <Input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1 h-12"
                      type="password"
                      placeholder="So you can also log in with a password"
                    />
                  </div>
                  <Button onClick={verifyAndFinalize} disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
                    {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Verify & continue
                  </Button>
                  <button onClick={sendCode} disabled={busy} className="w-full text-xs text-muted-foreground hover:text-foreground">
                    Resend code
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}

function SuccessStep({ sessionId }: { sessionId: string }) {
  const finish = useServerFn(finalizeBuilderSession);
  const navigate = useNavigate();
  const [siteId, setSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setError(null);
    finish({ data: { sessionId } }).then(result => { if (alive) setSiteId(result.siteId); }).catch(e => { if (alive) setError(e?.message ?? "Could not finish your website."); });
    return () => { alive = false; };
  }, [sessionId, retry]);
  if (error) return <div className="py-8 text-center"><p role="alert">{error}</p><Button className="mt-4" onClick={() => setRetry(v => v + 1)}>Retry</Button></div>;
  if (!siteId) return <div className="flex items-center justify-center gap-2 py-16"><Loader2 className="h-6 w-6 animate-spin" />Creating your website…</div>;
  return <div className="mx-auto max-w-md text-center">
    <Check className="mx-auto h-14 w-14 text-primary" />
    <h1 className="mt-4 text-3xl font-bold">Your website is ready</h1>
    <Button className="mt-6 w-full" size="lg" onClick={() => navigate({ to: "/dashboard/sites/$id", params: { id: siteId } })}>Open site admin<ArrowRight className="ml-2 h-4 w-4" /></Button>
    <Button className="mt-3 w-full" variant="outline" onClick={() => { window.location.href = "/start"; }}>Create another website</Button>
  </div>;
}
