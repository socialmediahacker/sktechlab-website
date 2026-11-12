import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Inbox, Mail, Phone, MessageSquare } from "lucide-react";

/**
 * Every contact / booking form submission from the live site, shown to the
 * site owner. Reads are protected by the "Owners view their site leads" policy.
 */
export function LeadsInbox({ siteId }: { siteId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["site-leads", siteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_submissions")
        .select("id,name,email,phone,message,source,created_at,metadata")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Inbox className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold">Leads &amp; bookings</h2>
        {!!data?.length && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">{data.length}</span>
        )}
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading enquiries…</p>}
      {!isLoading && !data?.length && (
        <p className="text-xs text-muted-foreground">
          No enquiries yet. Every contact and booking form submission on your live site lands here.
        </p>
      )}

      <div className="space-y-2">
        {(data ?? []).map((l) => {
          const kind = (l.metadata as any)?.kind as string | undefined;
          return (
            <div key={l.id} className="rounded-xl border bg-background p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold">{l.name || "Unnamed"}</span>
                {kind && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{kind}</span>
                )}
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Phone className="h-3 w-3" /> {l.phone}
                  </a>
                )}
                {l.email && (
                  <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Mail className="h-3 w-3" /> {l.email}
                  </a>
                )}
                {l.phone && (
                  <a
                    href={`https://wa.me/${l.phone.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline"
                  >
                    <MessageSquare className="h-3 w-3" /> WhatsApp
                  </a>
                )}
              </div>
              {l.message && <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed">{l.message}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
