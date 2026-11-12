import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MediaUploadButton } from "@/components/media-upload";
import {
  adminGetUpiGateway, adminSaveUpiGateway, adminRotateUpiWebhookSecret, adminGetUpiWebhookSecret,
  adminListUpiIntents, adminListUpiEmails, adminSetUpiIntentStatus, adminTestUpiEmail,
  adminTestUpiImap, adminPollUpiImap,
} from "@/lib/upi-gateway.functions";
import { CheckCircle2, Copy, Inbox, KeyRound, Mail, RefreshCw, Save, Wallet, XCircle } from "lucide-react";


const statusTone: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  utr_submitted: "bg-sky-500/10 text-sky-600",
  expired: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
};

export function UpiGatewayAdmin() {
  const qc = useQueryClient();
  const load = useServerFn(adminGetUpiGateway);
  const save = useServerFn(adminSaveUpiGateway);
  const rotate = useServerFn(adminRotateUpiWebhookSecret);
  const getSecret = useServerFn(adminGetUpiWebhookSecret);
  const listIntents = useServerFn(adminListUpiIntents);
  const listEmails = useServerFn(adminListUpiEmails);
  const setStatus = useServerFn(adminSetUpiIntentStatus);
  const testEmail = useServerFn(adminTestUpiEmail);

  const settings = useQuery({ queryKey: ["upi_gateway"], queryFn: () => load() });
  const intents = useQuery({ queryKey: ["upi_intents"], queryFn: () => listIntents({ data: {} }) });
  const emails = useQuery({ queryKey: ["upi_emails"], queryFn: () => listEmails() });
  const secret = useQuery({ queryKey: ["upi_webhook_secret"], queryFn: () => getSecret() });

  const [s, setS] = useState<any>(null);
  useEffect(() => { if (settings.data && !s) setS(settings.data); }, [settings.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const st = s ?? settings.data ?? {};
  const set = (k: string, v: unknown) => setS({ ...st, [k]: v });

  const webhookUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/api/public/upi-email?token=${secret.data?.secret ?? "<generate-secret>"}`;
  }, [secret.data]);

  const saveM = useMutation({
    mutationFn: async () =>
      save({
        data: {
          enabled: !!st.enabled,
          display_name: st.display_name || "UPI (FamPay)",
          upi_id: st.upi_id || null,
          payee_name: st.payee_name || null,
          qr_url: st.qr_url || null,
          instructions: st.instructions || "Pay the exact amount shown and wait for auto verification.",
          random_min: Number(st.random_min ?? 0.01),
          random_max: Number(st.random_max ?? 0.99),
          unique_amount_enabled: st.unique_amount_enabled !== false,
          expiry_minutes: Number(st.expiry_minutes ?? 15),
          poll_seconds: Number(st.poll_seconds ?? 5),
          auto_verify_enabled: st.auto_verify_enabled !== false,
          manual_utr_enabled: st.manual_utr_enabled !== false,
          auto_approve_manual: !!st.auto_approve_manual,
          sender_allowlist: String(st.sender_allowlist_text ?? (st.sender_allowlist ?? []).join(", "))
            .split(",").map((x: string) => x.trim()).filter(Boolean),
          notify_admin: st.notify_admin !== false,
          imap_enabled: !!st.imap_enabled,
          imap_host: st.imap_host || "imap.gmail.com",
          imap_port: Number(st.imap_port ?? 993),
          imap_email: st.imap_email || null,
          imap_app_password: String(st.imap_app_password ?? ""),
          imap_folder: st.imap_folder || "INBOX",

        },
      }),
    onSuccess: () => { toast.success("Gateway settings saved"); qc.invalidateQueries({ queryKey: ["upi_gateway"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rotateM = useMutation({
    mutationFn: () => rotate(),
    onSuccess: () => { toast.success("New webhook secret generated"); qc.invalidateQueries({ queryKey: ["upi_webhook_secret"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const actM = useMutation({
    mutationFn: (v: { intentId: string; action: "approve" | "reject" }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Payment updated"); qc.invalidateQueries({ queryKey: ["upi_intents"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [testBody, setTestBody] = useState("You have received Rs. 299.37 from a customer. UPI Ref No: 512345678901");
  const [testFrom, setTestFrom] = useState("no-reply@famapp.in");
  const testM = useMutation({
    mutationFn: () => testEmail({ data: { from: testFrom, subject: "Payment received", body: testBody } }),
    onSuccess: (r: any) => {
      toast.success(r?.result?.matched
        ? "Test only: this email would match a waiting payment (nothing was marked paid)"
        : `Parsed ₹${r?.parsed?.amount ?? 0} — ${r?.result?.reason ?? "no match"}`);
      qc.invalidateQueries({ queryKey: ["upi_emails"] });
      qc.invalidateQueries({ queryKey: ["upi_intents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testImapFn = useServerFn(adminTestUpiImap);
  const pollImapFn = useServerFn(adminPollUpiImap);
  const imapTestM = useMutation({
    mutationFn: () => testImapFn(),
    onSuccess: (r: any) => {
      if (r?.ok) toast.success(`Inbox connected — ${r.messages ?? 0} mails mile`);
      else toast.error(r?.error ?? "Inbox connect nahi hua");
      qc.invalidateQueries({ queryKey: ["upi_gateway"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const imapPollM = useMutation({
    mutationFn: () => pollImapFn(),
    onSuccess: (r: any) => {
      if (r?.ok) toast.success(`${r.checked ?? 0} naye mail check hue, ${r.matched ?? 0} payment match hui`);
      else toast.error(r?.error ?? r?.skipped ?? "Inbox check fail");
      qc.invalidateQueries({ queryKey: ["upi_emails"] });
      qc.invalidateQueries({ queryKey: ["upi_intents"] });
      qc.invalidateQueries({ queryKey: ["upi_gateway"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copy = (v: string) => { navigator.clipboard?.writeText(v); toast.success("Copied"); };


  return (
    <div className="space-y-6">
      {/* Settings */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4" /> UPI email gateway</div>
          <div className="flex items-center gap-2">
            <Label htmlFor="upi-on" className="text-sm text-muted-foreground">Enabled</Label>
            <Switch id="upi-on" checked={!!st.enabled} onCheckedChange={(v) => set("enabled", v)} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><Label>Display name</Label><Input value={st.display_name ?? ""} onChange={(e) => set("display_name", e.target.value)} /></div>
          <div><Label>UPI ID</Label><Input placeholder="yourupi@fam" value={st.upi_id ?? ""} onChange={(e) => set("upi_id", e.target.value)} /></div>
          <div><Label>Payee name</Label><Input value={st.payee_name ?? ""} onChange={(e) => set("payee_name", e.target.value)} /></div>
          <div>
            <Label>QR image (optional)</Label>
            <div className="flex gap-2">
              <Input value={st.qr_url ?? ""} onChange={(e) => set("qr_url", e.target.value)} placeholder="Auto QR if empty" />
              <MediaUploadButton onUploaded={(urls: string[]) => set("qr_url", urls[0] ?? "")} />
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Payment instructions</Label>
            <Textarea rows={3} value={st.instructions ?? ""} onChange={(e) => set("instructions", e.target.value)} />
          </div>
          <div><Label>Random paise min</Label><Input type="number" step="0.01" min="0" max="0.99" value={st.random_min ?? 0.01} onChange={(e) => set("random_min", e.target.value)} /></div>
          <div><Label>Random paise max</Label><Input type="number" step="0.01" min="0.01" max="0.99" value={st.random_max ?? 0.99} onChange={(e) => set("random_max", e.target.value)} /></div>
          <div><Label>Payment expiry (minutes)</Label><Input type="number" min="1" value={st.expiry_minutes ?? 15} onChange={(e) => set("expiry_minutes", e.target.value)} /></div>
          <div><Label>Status check interval (seconds)</Label><Input type="number" min="2" value={st.poll_seconds ?? 5} onChange={(e) => set("poll_seconds", e.target.value)} /></div>
          <div className="md:col-span-2">
            <Label>Allowed sender emails (comma separated)</Label>
            <Input
              value={st.sender_allowlist_text ?? (st.sender_allowlist ?? []).join(", ")}
              onChange={(e) => set("sender_allowlist_text", e.target.value)}
              placeholder="no-reply@famapp.in, alerts@axisbank.com"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Toggle label="Unique amount (add random paise)" v={st.unique_amount_enabled !== false} on={(v) => set("unique_amount_enabled", v)} />
          <Toggle label="Auto-verify from payment emails" v={st.auto_verify_enabled !== false} on={(v) => set("auto_verify_enabled", v)} />
          <Toggle label="Allow manual UTR submission" v={st.manual_utr_enabled !== false} on={(v) => set("manual_utr_enabled", v)} />
          <Toggle label="Auto-approve manual UTR (not recommended)" v={!!st.auto_approve_manual} on={(v) => set("auto_approve_manual", v)} />
          <Toggle label="Notify admin on new payment" v={st.notify_admin !== false} on={(v) => set("notify_admin", v)} />
        </div>

        <Button className="mt-4" onClick={() => saveM.mutate()} disabled={saveM.isPending}>
          <Save className="mr-2 h-4 w-4" /> Save gateway settings
        </Button>
      </div>

      {/* Auto email inbox (FamPay / bank alerts) */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-semibold"><Inbox className="h-4 w-4" /> Auto payment email (FamPay inbox)</div>
          <div className="flex items-center gap-2">
            <Label htmlFor="imap-on" className="text-sm text-muted-foreground">Auto read</Label>
            <Switch id="imap-on" checked={!!st.imap_enabled} onCheckedChange={(v) => set("imap_enabled", v)} />
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Jis Gmail par FamPay/bank ke payment alerts aate hain wahi email aur uska <b>App Password</b> yahan daaliye.
          System khud us inbox ko padhkar payment auto accept kar dega — koi forwarder ya Zapier ki zaroorat nahi.
          (Gmail → Google Account → Security → 2-Step Verification → App passwords se 16-digit password banaiye.)
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div><Label>Payment inbox email</Label><Input placeholder="yourname@gmail.com" value={st.imap_email ?? ""} onChange={(e) => set("imap_email", e.target.value)} /></div>
          <div>
            <Label>App password {st.imap_app_password_set ? <span className="text-xs text-emerald-600">(saved)</span> : null}</Label>
            <Input type="password" autoComplete="new-password" placeholder={st.imap_app_password_set ? "•••••••• (change karne par hi bhariye)" : "abcd efgh ijkl mnop"} value={st.imap_app_password ?? ""} onChange={(e) => set("imap_app_password", e.target.value)} />
          </div>
          <div><Label>IMAP server</Label><Input value={st.imap_host ?? "imap.gmail.com"} onChange={(e) => set("imap_host", e.target.value)} /></div>
          <div><Label>Port</Label><Input type="number" value={st.imap_port ?? 993} onChange={(e) => set("imap_port", e.target.value)} /></div>
          <div><Label>Folder / label</Label><Input value={st.imap_folder ?? "INBOX"} onChange={(e) => set("imap_folder", e.target.value)} placeholder="INBOX" /></div>
          <div className="flex items-end text-sm text-muted-foreground">
            {st.imap_last_error
              ? <span className="text-destructive">Last error: {String(st.imap_last_error).slice(0, 120)}</span>
              : st.imap_last_ok_at
                ? <span className="text-emerald-600">Last check OK: {new Date(st.imap_last_ok_at).toLocaleString()}</span>
                : <span>Abhi tak koi check nahi hua.</span>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => saveM.mutate()} disabled={saveM.isPending}><Save className="mr-2 h-4 w-4" /> Save inbox</Button>
          <Button variant="outline" onClick={() => imapTestM.mutate()} disabled={imapTestM.isPending}>
            <CheckCircle2 className="mr-2 h-4 w-4" /> Test connection
          </Button>
          <Button variant="outline" onClick={() => imapPollM.mutate()} disabled={imapPollM.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" /> Check inbox now
          </Button>
        </div>
      </div>


      {/* Webhook */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 font-semibold"><KeyRound className="h-4 w-4" /> Payment email connection</div>
        <p className="mt-2 text-sm text-muted-foreground">
          Forward your bank / UPI payment alert emails to this address using a Gmail filter forwarder,
          Cloudflare Email Routing, Zapier, Make or n8n. Every forwarded mail is parsed and matched automatically.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">{webhookUrl}</code>
          <Button variant="outline" size="sm" onClick={() => copy(webhookUrl)}><Copy className="mr-2 h-3.5 w-3.5" /> Copy</Button>
          <Button variant="outline" size="sm" onClick={() => rotateM.mutate()} disabled={rotateM.isPending}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> New secret
          </Button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <Label>Test a payment email</Label>
            <Input value={testFrom} onChange={(e) => setTestFrom(e.target.value)} placeholder="Sender email" />
            <Textarea rows={3} value={testBody} onChange={(e) => setTestBody(e.target.value)} />
          </div>
          <Button variant="secondary" className="self-end" onClick={() => testM.mutate()} disabled={testM.isPending}>
            <Mail className="mr-2 h-4 w-4" /> Run test
          </Button>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="font-semibold">Payments</div>
        <div className="mt-3 space-y-2">
          {(intents.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payments yet.</p>}
          {(intents.data ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
              <div>
                <div className="font-medium">₹{Number(r.payable_amount).toFixed(2)} <span className="text-xs text-muted-foreground">(base ₹{Number(r.base_amount).toFixed(2)})</span></div>
                <div className="text-xs text-muted-foreground">
                  {r.purpose} · {r.matched_txn_id || r.utr || "no reference"} · {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusTone[r.status] ?? "bg-muted"}>{r.status}</Badge>
                {r.status !== "paid" && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => actM.mutate({ intentId: r.id, action: "approve" })}>
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark paid
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => actM.mutate({ intentId: r.id, action: "reject" })}>
                      <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email log */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="font-semibold">Email verification log</div>
        <div className="mt-3 space-y-2">
          {(emails.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payment emails received yet.</p>}
          {(emails.data ?? []).map((e: any) => (
            <div key={e.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{e.subject || "(no subject)"}</span>
                <Badge className={e.status === "matched" ? statusTone.paid : "bg-muted"}>{e.status}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {e.from_email} · {e.amount ? `₹${Number(e.amount).toFixed(2)}` : "no amount"} · {e.txn_id || "no txn"} · {e.reason} · {new Date(e.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={v} onCheckedChange={on} />
    </label>
  );
}
