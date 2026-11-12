import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Mail, MapPin, Phone } from "lucide-react";
import { COMPANY } from "@/lib/company";
import { notifyEnquiry } from "@/lib/enquiry-email.functions";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | SK Tech Lab" },
      {
        name: "description",
        content:
          "Contact SK Tech Lab for support with orders, digital product delivery, billing questions or new enquiries.",
      },
      { property: "og:title", content: "Contact Us | SK Tech Lab" },
      { property: "og:description", content: "Email our support team or send us a message." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sktechlab.com/contact" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://sktechlab.com/contact" }],
  }),
  component: ContactPage,
});

type Errors = Partial<Record<"name" | "email" | "phone" | "subject" | "message", string>>;

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Errors = {};
    if (form.name.trim().length < 2) e.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Please enter a valid email address.";
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) e.phone = "Please enter a valid phone number.";
    if (form.subject.trim().length < 3) e.subject = "Please enter a subject.";
    if (form.message.trim().length < 10) e.message = "Please write at least 10 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await notifyEnquiry({
        data: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: `Subject: ${form.subject.trim()}\n\n${form.message.trim()}`,
          source: "Contact page",
          siteName: COMPANY.name,
        },
      });
      toast.success("Thanks — your message has been sent. We'll reply by email.");
      setForm({ name: "", email: "", phone: "", subject: "", message: "" });
      setErrors({});
    } catch {
      toast.error(`Could not send right now. Please email ${COMPANY.supportEmail}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-6 sm:py-16">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Contact Us</h1>
        <p className="mt-2 text-muted-foreground">
          Questions about an order, delivery or billing? Send us a message and we'll get back to you.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_1.2fr]">
          <aside className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="font-semibold">{COMPANY.name}</div>
            <div className="flex items-start gap-3 text-sm">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <a className="break-all underline" href={`mailto:${COMPANY.supportEmail}`}>
                {COMPANY.supportEmail}
              </a>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="break-all text-muted-foreground">{COMPANY.phone}</span>
            </div>
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">{COMPANY.address}</span>
            </div>
          </aside>

          <form onSubmit={submit} noValidate className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-name">Name</Label>
                <Input id="c-name" className="mt-1" value={form.name} onChange={set("name")} autoComplete="name" />
                {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
              </div>
              <div>
                <Label htmlFor="c-email">Email</Label>
                <Input id="c-email" type="email" className="mt-1" value={form.email} onChange={set("email")} autoComplete="email" />
                {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="c-phone">Phone</Label>
                <Input id="c-phone" type="tel" className="mt-1" value={form.phone} onChange={set("phone")} autoComplete="tel" />
                {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone}</p> : null}
              </div>
              <div>
                <Label htmlFor="c-subject">Subject</Label>
                <Input id="c-subject" className="mt-1" value={form.subject} onChange={set("subject")} />
                {errors.subject ? <p className="mt-1 text-xs text-destructive">{errors.subject}</p> : null}
              </div>
            </div>
            <div>
              <Label htmlFor="c-message">Message</Label>
              <Textarea id="c-message" rows={5} className="mt-1" value={form.message} onChange={set("message")} />
              {errors.message ? <p className="mt-1 text-xs text-destructive">{errors.message}</p> : null}
            </div>
            <Button type="submit" disabled={busy} size="lg" className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send message
            </Button>
          </form>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
