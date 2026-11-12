import { useState } from "react";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminMessageTemplatesQuery, adminMessageLogsQuery } from "@/lib/queries";
import {
  adminSaveMessageTemplate,
  adminDeleteMessageTemplate,
  adminPreviewMessage,
} from "@/lib/admin.functions";
import { Trash2 } from "lucide-react";

const PRESETS = [
  { key: "otp", name: "OTP verification", body: "Your SKTECHLAB code is {{otp}}. Valid for 10 minutes." },
  { key: "welcome", name: "Welcome", body: "Hi {{name}}, welcome to SKTECHLAB! Your account is ready." },
  { key: "plan_purchased", name: "Plan purchased", body: "Hi {{name}}, your {{plan}} plan is active. Thank you!" },
  { key: "plan_expiring", name: "Plan expiring", body: "Hi {{name}}, your {{plan}} plan expires soon. Renew to stay live." },
  { key: "domain_approved", name: "Domain approved", body: "Good news {{name}} — {{domain}} is now live." },
  { key: "order_placed", name: "Order placed", body: "New order received on your store. Order: {{order}}." },
];

export function MessagesAdmin() {
  const qc = useQueryClient();
  const { data: templates } = useSuspenseQuery(adminMessageTemplatesQuery);
  const { data: logs } = useSuspenseQuery(adminMessageLogsQuery);
  const saveFn = useServerFn(adminSaveMessageTemplate);
  const delFn = useServerFn(adminDeleteMessageTemplate);
  const previewFn = useServerFn(adminPreviewMessage);

  const [draft, setDraft] = useState({
    id: "" as string | "",
    key: "otp",
    channel: "whatsapp",
    name: "OTP verification",
    subject: "",
    body: PRESETS[0].body,
    isEnabled: true,
  });
  const [testTo, setTestTo] = useState("");
  const [preview, setPreview] = useState<{ subject: string | null; body: string } | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin_message_templates"] });
    qc.invalidateQueries({ queryKey: ["admin_message_logs"] });
  };

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id: draft.id || null,
          key: draft.key,
          channel: draft.channel,
          name: draft.name,
          subject: draft.subject || null,
          body: draft.body,
          isEnabled: draft.isEnabled,
        },
      }),
    onSuccess: () => { toast.success("Template saved"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Template deleted"); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const runPreview = useMutation({
    mutationFn: (id: string) => previewFn({ data: { templateId: id, recipient: testTo || "demo" } }),
    onSuccess: (data) => { setPreview({ subject: data.subject, body: data.body }); invalidate(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-lg font-semibold">Message template</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Event</Label>
            <select
              value={draft.key}
              onChange={(e) => {
                const preset = PRESETS.find((p) => p.key === e.target.value);
                setDraft({ ...draft, id: "", key: e.target.value, name: preset?.name ?? e.target.value, body: preset?.body ?? draft.body });
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PRESETS.map((p) => <option key={p.key} value={p.key}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <Label>Channel</Label>
            <select
              value={draft.channel}
              onChange={(e) => setDraft({ ...draft, id: "", channel: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
              <option value="email">Email</option>
            </select>
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={draft.isEnabled} onCheckedChange={(v) => setDraft({ ...draft, isEnabled: v })} />
              <span className="text-sm">Enabled</span>
            </div>
          </div>
          {draft.channel === "email" && (
            <div className="md:col-span-3">
              <Label>Subject</Label>
              <Input value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </div>
          )}
          <div className="md:col-span-3">
            <Label>Body</Label>
            <Textarea rows={4} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">
              Variables: {"{{name}}"} {"{{plan}}"} {"{{otp}}"} {"{{domain}}"} {"{{order}}"}
            </p>
          </div>
        </div>
        <Button className="mt-3" disabled={save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving…" : "Save template"}
        </Button>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <h3 className="text-lg font-semibold">Saved templates</h3>
          <div className="ml-auto w-56">
            <Label>Test recipient</Label>
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+91… or email" />
          </div>
        </div>
        {!templates.length ? (
          <p className="text-sm text-muted-foreground">No templates saved yet.</p>
        ) : (
          <div className="space-y-2">
            {(templates as any[]).map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 p-3">
                <div className="min-w-40">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.key} · {t.channel} · {t.is_enabled ? "on" : "off"}</div>
                </div>
                <div className="flex-1 truncate text-xs text-muted-foreground">{t.body}</div>
                <Button size="sm" variant="outline" onClick={() => setDraft({
                  id: t.id, key: t.key, channel: t.channel, name: t.name,
                  subject: t.subject ?? "", body: t.body, isEnabled: t.is_enabled,
                })}>Edit</Button>
                <Button size="sm" variant="secondary" onClick={() => runPreview.mutate(t.id)}>Preview</Button>
                <Button size="sm" variant="ghost" onClick={() => remove.mutate(t.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
        {preview && (
          <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
            {preview.subject && <div className="font-medium">{preview.subject}</div>}
            <pre className="whitespace-pre-wrap font-sans">{preview.body}</pre>
          </div>
        )}
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="p-3">When</th><th className="p-3">Channel</th><th className="p-3">Recipient</th>
              <th className="p-3">Template</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {!logs.length ? (
              <tr><td className="p-4 text-muted-foreground" colSpan={5}>No messages logged yet.</td></tr>
            ) : (logs as any[]).map((l) => (
              <tr key={l.id} className="border-t border-border/40">
                <td className="p-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-3">{l.channel}</td>
                <td className="p-3">{l.recipient}</td>
                <td className="p-3">{l.template_key || "—"}</td>
                <td className="p-3">{l.status}{l.error ? ` · ${l.error}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
