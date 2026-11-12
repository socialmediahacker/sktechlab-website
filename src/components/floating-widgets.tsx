import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { siteSettingsQuery } from "@/lib/queries";
import { MessageCircle } from "lucide-react";

declare global {
  interface Window {
    Tawk_API?: unknown;
    Tawk_LoadStart?: Date;
  }
}

export function FloatingWidgets() {
  const { data: settings } = useQuery(siteSettingsQuery);

  const wa = settings?.whatsapp_enabled && settings?.whatsapp_number;
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

  if (!wa) return null;
  const msg = encodeURIComponent(settings?.whatsapp_message ?? "Hello!");
  return (
    <a
      href={`https://wa.me/${settings!.whatsapp_number}?text=${msg}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-glow transition hover:scale-110"
    >
      <MessageCircle className="h-7 w-7" />
      <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#25D366] opacity-30" />
    </a>
  );
}
