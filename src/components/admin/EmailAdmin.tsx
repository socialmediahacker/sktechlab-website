import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { adminSiteSettingsQuery } from "@/lib/queries";
import { adminSendTestEmail, EMAIL_TYPES } from "@/lib/email-admin.functions";
import { Mail, Save, Send } from "lucide-react";

type Settings = {
  email_enabled?: boolean;
  email_from_name?: string | null;
  email_reply_to?: string | null;
  email_admin_recipient?: string | null;
  email_types?: Record<string, boolean> | null;
};

export function EmailAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery(adminSiteSettingsQuery);
  const [s, setS] = useState<Settings>({});
  const [testTo, setTestTo] = useState("");
  const [testTemplate, setTestTemplate] = useState<string>(EMAIL_TYPES[0]!.key);
  const sendTest = useServerFn(adminSendTestEmail);

  useEffect(() => {
    if (data) setS(data as Settings);
  }, [data]);

  const types = (s.email_types ?? {}) as Record<string, boolean>;
  const master = s.email_enabled !== false;

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("site_settings")
        .update({
          email_enabled: master,
          email_from_name: s.email_from_name ?? null,
          email_reply_to: s.email_reply_to ?? null,
          email_admin_recipient: s.email_admin_recipient ?? null,
          email_types: types,
        } as any)
        .eq("id", 1);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Email settings saved");
      qc.invalidateQueries({ queryKey: ["site_settings"] });
      qc.invalidateQueries({ queryKey: ["admin_site_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const test = useMutation({
    mutationFn: () => sendTest({ data: { template: testTemplate, to: testTo } }),
    onSuccess: (res: any) => (res?.ok ? toast.success(res.message) : toast.error(res?.message ?? "Failed")),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Mail className="size-5 text-brand" />
            <div>
              <h3 className="font-semibold">Email sending — master switch</h3>
              <p className="text-xs text-muted-foreground">
                Off karne par app ke saare emails ruk jayenge (login OTP / WhatsApp par asar nahi).
              </p>
            </div>
          </div>
          <Switch checked={master} onCheckedChange={(v) => setS({ ...s, email_enabled: v })} />
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Sender details</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <Label>Sender name</Label>
            <Input
              value={s.email_from_name ?? ""}
              placeholder="SKTECHLAB"
              onChange={(e) => setS({ ...s, email_from_name: e.target.value })}
            />
          </div>
          <div>
            <Label>Reply-to address</Label>
            <Input
              value={s.email_reply_to ?? ""}
              placeholder="support@sktechlab.com"
              onChange={(e) => setS({ ...s, email_reply_to: e.target.value })}
            />
          </div>
          <div>
            <Label>Admin notification address</Label>
            <Input
              value={s.email_admin_recipient ?? ""}
              placeholder="admin@sktechlab.com"
              onChange={(e) => setS({ ...s, email_admin_recipient: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Individual emails</h3>
        <div className="space-y-3">
          {EMAIL_TYPES.map((t) => (
            <div key={t.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-3">
              <div>
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.note}</p>
              </div>
              <Switch
                disabled={!master}
                checked={types[t.key] !== false}
                onCheckedChange={(v) => setS({ ...s, email_types: { ...types, [t.key]: v } })}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5">
        <h3 className="mb-4 font-semibold">Send a test email</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <Label>Email address</Label>
            <Input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <Label>Template</Label>
            <select
              value={testTemplate}
              onChange={(e) => setTestTemplate(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {EMAIL_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <Button variant="outline" onClick={() => test.mutate()} disabled={test.isPending || !testTo}>
            <Send className="mr-2 size-4" /> {test.isPending ? "Sending…" : "Send test"}
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Emails tabhi jayenge jab sender domain verify ho jaye (notify.sktechlab.com).
        </p>
      </div>

      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        <Save className="mr-2 size-4" /> {save.isPending ? "Saving…" : "Save email settings"}
      </Button>
    </div>
  );
}
