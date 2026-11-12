import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { siteSettingsQuery } from "@/lib/queries";
import { MessageCircle, Sparkles, X, MessageSquare, Mail, Phone } from "lucide-react";
import { CustomDevDialog } from "@/components/custom-dev-dialog";
import { SupportChat } from "@/components/support-chat";

const supportIcon = "/images/support-headset.svg";

/** Routes that render a customer's own website — the SKTECHLAB support desk must never appear there. */
import { isCustomerSiteRoute } from "@/lib/chrome-routes";

export function SupportPopup() {
  const [open, setOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const check = () => setHidden(isCustomerSiteRoute(window.location.pathname));
    check();
    window.addEventListener("popstate", check);
    const t = window.setInterval(check, 800);
    return () => { window.removeEventListener("popstate", check); window.clearInterval(t); };
  }, []);
  const { data: settings } = useQuery(siteSettingsQuery);
  const wa = settings?.whatsapp_number;
  const phone = settings?.contact_phone;
  const email = settings?.contact_email;
  const msg = encodeURIComponent(settings?.whatsapp_message ?? "Hi SKTECHLAB team!");
  const tawk = settings?.tawk_enabled && settings?.tawk_property_id && settings?.tawk_widget_id;

  useEffect(() => {
    if (!tawk) return;
    if (document.getElementById("tawk-script")) return;
    const s = document.createElement("script");
    s.id = "tawk-script";
    s.async = true;
    s.src = `https://embed.tawk.to/${settings!.tawk_property_id}/${settings!.tawk_widget_id}`;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.body.appendChild(s);
  }, [tawk, settings]);

  const openLiveChat = () => {
    setChatOpen(true);
    setOpen(false);
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-3 md:bottom-6 md:right-6">
      {chatOpen && <SupportChat onClose={() => setChatOpen(false)} whatsapp={wa ?? null} />}
      {open && (
        <div className="w-72 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-2xl backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <img src={supportIcon} alt="Support" className="h-8 w-8 rounded-full object-contain" />
              Support desk
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            {wa && (
              <a href={`https://wa.me/${wa.replace(/\D/g, "")}?text=${msg}`} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 rounded-xl bg-[#25D366]/10 p-3 text-sm hover:bg-[#25D366]/20">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[#25D366] text-white"><MessageCircle className="h-4 w-4" /></span>
                Chat on WhatsApp
              </a>
            )}
            <button onClick={openLiveChat}
              className="flex w-full items-center gap-3 rounded-xl bg-brand/10 p-3 text-left text-sm hover:bg-brand/20">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground"><MessageSquare className="h-4 w-4" /></span>
              Live chat with SK Assistant
            </button>
            {email && (
              <a href={`mailto:${email}`}
                className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 text-sm hover:bg-muted">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground/80 text-background"><Mail className="h-4 w-4" /></span>
                <span className="truncate">{email}</span>
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.replace(/\s/g, "")}`}
                className="flex items-center gap-3 rounded-xl bg-muted/60 p-3 text-sm hover:bg-muted">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground/80 text-background"><Phone className="h-4 w-4" /></span>
                {phone}
              </a>
            )}
            <CustomDevDialog trigger={
              <button className="flex w-full items-center gap-3 rounded-xl bg-accent/40 p-3 text-left text-sm hover:bg-accent/60">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-brand text-brand-foreground"><Sparkles className="h-4 w-4" /></span>
                Custom development
              </button>
            } />
          </div>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)} aria-label="Support"
        className="group relative grid h-14 w-14 place-items-center rounded-full bg-card p-1.5 shadow-md ring-1 ring-border/60 transition-transform duration-300 hover:scale-105 hover:shadow-lg">
        <span className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-brand/15 opacity-60 animate-[ping_2.8s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <img src={supportIcon} alt="Support" className="h-full w-full rounded-full object-contain animate-[float_4s_ease-in-out_infinite]" />
      </button>
    </div>
  );
}
