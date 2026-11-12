import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { z } from "zod";
import { notifyEnquiry } from "@/lib/enquiry-email.functions";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  whatsapp: z.string().trim().min(6).max(25),
  business_type: z.string().trim().max(120).optional().or(z.literal("")),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  requirements: z.string().trim().min(5).max(4000),
});

export function CustomDevDialog({ trigger, defaultService, title, description }: { trigger?: React.ReactNode; defaultService?: string; title?: string; description?: string }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", whatsapp: "", business_type: defaultService ?? "", budget: "", requirements: defaultService ? `Interested in: ${defaultService}\n\n` : "" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const parsed = schema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Please fill all fields"); return; }
    setBusy(true);
    const { error } = await supabase.from("custom_dev_requests").insert(parsed.data);
    setBusy(false);
    if (error) return toast.error(error.message);
    // Email the team + auto-reply to the visitor (never blocks the form).
    void notifyEnquiry({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.whatsapp,
        message: parsed.data.requirements,
        source: "Home page — Custom development",
      },
    }).catch(() => {});
    toast.success("Request received! Our team will contact you on WhatsApp within a few hours.");

    setForm({ name: "", email: "", whatsapp: "", business_type: "", budget: "", requirements: "" });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="lg" className="bg-gradient-brand text-brand-foreground shadow-glow">
            <Sparkles className="mr-2 h-4 w-4" /> Custom Development
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title ?? "Get a custom website built"}</DialogTitle>
          <DialogDescription>{description ?? "Share your idea — our team will design and build it for you."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Your name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>WhatsApp number</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="+91 90000 00000" /></div>
            <div><Label>Budget (optional)</Label><Input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="₹15k – ₹50k" /></div>
          </div>
          <div><Label>Business type</Label><Input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} placeholder="Mehndi artist, Crane service, Kirana…" /></div>
          <div><Label>Tell us what you need</Label><Textarea rows={4} value={form.requirements} onChange={(e) => setForm({ ...form, requirements: e.target.value })} placeholder="Pages, features, colors, references…" /></div>
          <Button onClick={submit} disabled={busy} className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
            {busy ? "Sending…" : "Send request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
