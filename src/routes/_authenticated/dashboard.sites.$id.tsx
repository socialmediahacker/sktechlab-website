import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteAdministration } from "@/components/site/SiteAdministration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { myTicketsQuery } from "@/lib/queries";
import { MessageSquare, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/sites/$id")({
  component: SiteAdminRoute,
  head: () => ({ meta: [
    { title: "Site administration | SK Tech Lab" },
    { name: "description", content: "Manage your website sections, business details, enquiries and change requests." },
    { property: "og:title", content: "Site administration | SK Tech Lab" },
    { property: "og:description", content: "Website administration for SK Tech Lab customers." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
});

function SiteAdminRoute() {
  const { id } = Route.useParams();
  const location = useLocation();
  if (location.pathname.endsWith("/edit")) return <Outlet />;
  return <SiteAdministration key={id} id={id} requests={<SiteSupportPanel siteId={id} siteName="My website" />} />;
}

function SiteSupportPanel({ siteId, siteName }: { siteId: string; siteName: string }) {
  const qc = useQueryClient();
  const { data: tickets } = useQuery(myTicketsQuery);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [requestType, setRequestType] = useState("change_request");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([
    { key: "Business name", value: siteName },
    { key: "Phone / WhatsApp", value: "" },
  ]);

  const addField = () => setCustomFields([...customFields, { key: "", value: "" }]);
  const updateField = (i: number, patch: Partial<{ key: string; value: string }>) =>
    setCustomFields(customFields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  const removeField = (i: number) => setCustomFields(customFields.filter((_, idx) => idx !== i));

  const submit = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sign in required");

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
      customFields.forEach((field) => {
        if (field.key.trim()) custom_fields[field.key.trim()] = field.value;
      });

      const { error } = await supabase.from("support_tickets").insert({
        user_id: user.id,
        site_id: siteId,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        category: requestType,
        request_type: requestType,
        attachments,
        custom_fields,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request sent to admin");
      setSubject("");
      setMessage("");
      setPriority("normal");
      setRequestType("change_request");
      setFiles([]);
      setCustomFields([{ key: "Business name", value: siteName }, { key: "Phone / WhatsApp", value: "" }]);
      qc.invalidateQueries({ queryKey: ["my_tickets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const siteTickets = (tickets ?? []).filter((ticket: any) => ticket.site_id === siteId).slice(0, 3);

  return (
    <div className="glass rounded-2xl p-6 space-y-4">
      <h3 className="flex items-center gap-2 font-semibold">
        <MessageSquare className="h-4 w-4 text-brand-glow" /> Ticket / change request
      </h3>
      <p className="text-xs text-muted-foreground">
        Text, images, documents ya video attach karke admin ko changes bhejo.
      </p>

      <div>
        <Label>Subject *</Label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Banner text change / new page add" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Type</Label>
          <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="change_request">Site change</option>
            <option value="custom_website">Custom build / template setup</option>
            <option value="seo">SEO / keywords</option>
            <option value="bug">Bug / issue</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <Label>Priority</Label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>
      <div>
        <Label>Message *</Label>
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Exactly kya change chahiye, colors, text, references, keywords..." />
      </div>

      <div className="rounded-lg border border-dashed border-border/60 p-4">
        <Label className="text-xs font-semibold">Attach files</Label>
        <input
          type="file"
          multiple
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
          className="mt-2 block w-full text-xs file:mr-3 file:rounded-md file:border-0 file:bg-brand/20 file:px-3 file:py-1.5 file:text-xs file:text-brand-glow"
        />
        {files.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {files.map((f, i) => <li key={i}>📎 {f.name} <span className="opacity-60">({(f.size / 1024).toFixed(0)} KB)</span></li>)}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-border/60 p-4">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold">Form details</Label>
          <Button type="button" size="sm" variant="outline" onClick={addField}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        <div className="mt-3 space-y-2">
          {customFields.map((field, i) => (
            <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
              <Input placeholder="Field" value={field.key} onChange={(e) => updateField(i, { key: e.target.value })} />
              <Input placeholder="Value" value={field.value} onChange={(e) => updateField(i, { value: e.target.value })} />
              <Button type="button" size="sm" variant="ghost" onClick={() => removeField(i)}>×</Button>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={() => submit.mutate()} disabled={!subject.trim() || !message.trim() || submit.isPending || uploading} className="w-full bg-gradient-brand text-brand-foreground shadow-glow">
        {uploading ? "Uploading..." : submit.isPending ? "Sending..." : "Send to admin"}
      </Button>

      {siteTickets.length > 0 && (
        <div className="space-y-2 border-t border-border/60 pt-4">
          <div className="text-xs font-semibold uppercase text-muted-foreground">Recent requests</div>
          {siteTickets.map((ticket: any) => (
            <div key={ticket.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{ticket.subject}</span>
                <span className="rounded-full bg-brand/20 px-2 py-0.5 capitalize text-brand-glow">{ticket.status}</span>
              </div>
              {ticket.admin_reply && <div className="mt-2 rounded border-l-2 border-brand/60 bg-brand/10 p-2">{ticket.admin_reply}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
