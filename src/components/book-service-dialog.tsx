import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { submitServiceBooking } from "@/lib/service-booking.functions";

export type BookableService = "digital_marketing" | "gmb_boost";

const LABEL: Record<BookableService, string> = {
  digital_marketing: "Digital Marketing",
  gmb_boost: "GMB Boost",
};

type Errors = Partial<Record<"email" | "whatsapp" | "websiteUrl" | "message", string>>;

export function BookServiceDialog({
  service,
  open,
  onOpenChange,
}: {
  service: BookableService;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [form, setForm] = useState({ email: "", whatsapp: "", websiteUrl: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e: Errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = "Please enter a valid email address.";
    const digits = form.whatsapp.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) e.whatsapp = "Please enter a valid WhatsApp number.";
    if (form.websiteUrl.trim().length > 300) e.websiteUrl = "Website URL is too long.";
    if (form.message.trim().length < 10) e.message = "Please write at least 10 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await submitServiceBooking({
        data: {
          service,
          email: form.email.trim(),
          whatsapp: form.whatsapp.trim(),
          websiteUrl: form.websiteUrl.trim(),
          message: form.message.trim(),
        },
      });
      toast.success("Thank you! Our team will contact you on WhatsApp shortly.");
      setForm({ email: "", whatsapp: "", websiteUrl: "", message: "" });
      setErrors({});
      onOpenChange(false);
    } catch {
      toast.error("Could not send your request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Book {LABEL[service]}</DialogTitle>
          <DialogDescription>
            Share your details and our team will reach out with the right package for your business.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="bs-email">Email *</Label>
            <Input id="bs-email" type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" className="mt-1" />
            {errors.email && <p className="mt-1 text-xs text-destructive">{errors.email}</p>}
          </div>
          <div>
            <Label htmlFor="bs-wa">WhatsApp number *</Label>
            <Input id="bs-wa" type="tel" value={form.whatsapp} onChange={set("whatsapp")} placeholder="+91 98XXXXXXXX" className="mt-1" />
            {errors.whatsapp && <p className="mt-1 text-xs text-destructive">{errors.whatsapp}</p>}
          </div>
          <div>
            <Label htmlFor="bs-url">Website URL (optional)</Label>
            <Input id="bs-url" value={form.websiteUrl} onChange={set("websiteUrl")} placeholder="https://yourbusiness.com" className="mt-1" />
            {errors.websiteUrl && <p className="mt-1 text-xs text-destructive">{errors.websiteUrl}</p>}
          </div>
          <div>
            <Label htmlFor="bs-msg">What do you need? *</Label>
            <Textarea id="bs-msg" rows={4} value={form.message} onChange={set("message")} placeholder="Tell us about your business and goals." className="mt-1" />
            {errors.message && <p className="mt-1 text-xs text-destructive">{errors.message}</p>}
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-gradient-brand text-brand-foreground">
            {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : "Send request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
