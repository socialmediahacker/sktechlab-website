import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bug, Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MediaUploadButton } from "@/components/media-upload";
import { getClientErrors } from "@/lib/client-error-buffer";
import {
  adminCreateBugReport,
  adminDeleteBugReport,
  adminListBugReports,
  adminUpdateBugReport,
} from "@/lib/bug-reports.functions";

type Form = {
  title: string;
  page_url: string;
  expected: string;
  actual: string;
  steps: string;
  device: "mobile" | "desktop" | "both";
  priority: "low" | "medium" | "high";
  attachments: string[];
};

const EMPTY: Form = {
  title: "",
  page_url: "",
  expected: "",
  actual: "",
  steps: "",
  device: "both",
  priority: "medium",
  attachments: [],
};

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  sent: "Sent to Lovable",
  fixed: "Fixed",
  wontfix: "Won't fix",
};

function collectDiagnostics() {
  if (typeof window === "undefined") return {};
  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    screen: `${window.screen?.width ?? "?"}x${window.screen?.height ?? "?"}`,
    at: new Date().toISOString(),
    errors: getClientErrors(),
  } as Record<string, unknown>;
}

function buildReport(f: Form, diag: Record<string, any>) {
  const lines: string[] = [];
  lines.push(`Bug: ${f.title || "(no title)"}`);
  if (f.page_url) lines.push(`Page: ${f.page_url}`);
  lines.push(`Device: ${f.device} | Priority: ${f.priority}`);
  lines.push("");
  if (f.steps) lines.push(`Steps to reproduce:\n${f.steps}`, "");
  if (f.expected) lines.push(`Expected: ${f.expected}`);
  if (f.actual) lines.push(`Actual: ${f.actual}`);
  if (f.attachments.length) lines.push("", `Screenshots:\n${f.attachments.join("\n")}`);
  const errs: { at: string; message: string }[] = diag?.errors ?? [];
  if (errs.length) {
    lines.push("", "Recent console errors:");
    errs.forEach((e) => lines.push(`- ${e.message}`));
  }
  lines.push(
    "",
    `Environment: ${diag?.viewport ?? ""} viewport, ${diag?.userAgent ?? ""}`,
    `Reported at: ${diag?.at ?? ""}`,
  );
  return lines.join("\n").trim();
}

function shortReport(f: Form) {
  return `Bug: ${f.title}${f.page_url ? ` (${f.page_url})` : ""}. ${f.actual || ""}${
    f.expected ? ` Expected: ${f.expected}` : ""
  }`.trim();
}

async function copy(text: string, what = "Report") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied — Lovable chat me paste kar dijiye`);
  } catch {
    toast.error("Copy nahi hua, text manually select kar lijiye");
  }
}

export function BugFixerAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(EMPTY);
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const diag = useMemo(() => collectDiagnostics(), [form.title, form.actual]);
  const preview = useMemo(() => buildReport(form, diag), [form, diag]);

  const list = useQuery({
    queryKey: ["admin-bug-reports"],
    queryFn: () => adminListBugReports(),
    retry: false,
  });

  const save = useMutation({
    mutationFn: () =>
      adminCreateBugReport({
        data: {
          title: form.title.trim(),
          page_url: form.page_url.trim() || null,
          expected: form.expected.trim() || null,
          actual: form.actual.trim() || null,
          steps: form.steps.trim() || null,
          device: form.device,
          priority: form.priority,
          attachments: form.attachments,
          diagnostics: collectDiagnostics(),
          report_text: preview,
        },
      }),
    onSuccess: () => {
      toast.success("Bug save ho gaya");
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["admin-bug-reports"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save nahi hua"),
  });

  const update = useMutation({
    mutationFn: (v: { id: string; status?: string; priority?: string }) =>
      adminUpdateBugReport({ data: v as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bug-reports"] }),
    onError: (e: any) => toast.error(e?.message ?? "Update nahi hua"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminDeleteBugReport({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-bug-reports"] }),
  });

  const rows = (list.data ?? []).filter((r: any) =>
    filter === "all"
      ? true
      : filter === "auto"
        ? r?.diagnostics?.source === "auto"
        : r.status === filter,
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Bug className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Naya bug report</h3>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Bug likhiye — app apne aap device, screen aur recent errors jod kar ek ready report banayega.
          Ye report banana bilkul free hai, koi AI nahi chalti.
        </p>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Payment page par button kaam nahi kar raha"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Page / URL</Label>
            <div className="flex gap-2">
              <Input
                value={form.page_url}
                onChange={(e) => setForm({ ...form, page_url: e.target.value })}
                placeholder="/start ya poora link"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setForm({ ...form, page_url: window.location.href })}
              >
                Abhi wala page
              </Button>
            </div>
          </div>
          <div>
            <Label>Kya hona chahiye tha</Label>
            <Textarea
              rows={3}
              value={form.expected}
              onChange={(e) => setForm({ ...form, expected: e.target.value })}
            />
          </div>
          <div>
            <Label>Kya ho raha hai</Label>
            <Textarea
              rows={3}
              value={form.actual}
              onChange={(e) => setForm({ ...form, actual: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Steps (1, 2, 3...)</Label>
            <Textarea
              rows={4}
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
              placeholder={"1. /start kholo\n2. plan choose karo\n3. Pay dabao"}
            />
          </div>
          <div>
            <Label>Device</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.device}
              onChange={(e) => setForm({ ...form, device: e.target.value as Form["device"] })}
            >
              <option value="both">Dono</option>
              <option value="mobile">Mobile</option>
              <option value="desktop">Desktop</option>
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as Form["priority"] })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Screenshot</Label>
            <div className="flex flex-wrap items-center gap-2">
              <MediaUploadButton
                multiple
                label="Screenshot upload"
                onUploaded={(urls) => setForm((f) => ({ ...f, attachments: [...f.attachments, ...urls] }))}
              />
              {form.attachments.map((u) => (
                <a
                  key={u}
                  href={u}
                  target="_blank"
                  rel="noreferrer"
                  className="max-w-[180px] truncate text-xs text-primary underline"
                >
                  {u}
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Label>Ready report (Lovable me paste karne ke liye)</Label>
          <Textarea rows={10} readOnly value={preview} className="font-mono text-xs" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={() => copy(preview)} variant="secondary">
            <Copy className="mr-1 h-4 w-4" /> Copy report
          </Button>
          <Button onClick={() => copy(shortReport(form), "Short version")} variant="outline">
            Copy short version
          </Button>
          <Button
            onClick={() => (form.title.trim().length < 3 ? toast.error("Title likhiye") : save.mutate())}
            disabled={save.isPending}
          >
            {save.isPending ? "Saving…" : "Save bug"}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Bug list</h3>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">Sab</option>
            <option value="auto">Auto-detected</option>
            <option value="new">New</option>
            <option value="sent">Sent to Lovable</option>
            <option value="fixed">Fixed</option>
            <option value="wontfix">Won't fix</option>
          </select>
        </div>

        {list.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Abhi koi bug save nahi hai.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <div key={r.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="flex-1 text-left text-sm font-medium"
                    onClick={() => setOpenId(openId === r.id ? null : r.id)}
                  >
                    {r.title}
                  </button>
                  {r?.diagnostics?.source === "auto" ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                      Auto ×{Number(r?.diagnostics?.hits ?? 1)}
                    </span>
                  ) : null}
                  <span className="rounded-full border px-2 py-0.5 text-[11px] uppercase">{r.priority}</span>
                  <select
                    className="h-8 rounded-md border bg-background px-2 text-xs"
                    value={r.status}
                    onChange={(e) => update.mutate({ id: r.id, status: e.target.value })}
                  >
                    {Object.entries(STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={() => copy(r.report_text || r.title)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Ye bug delete karein?")) remove.mutate(r.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} {r.page_url ? `· ${r.page_url}` : ""}
                </p>
                {openId === r.id ? (
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-[11px]">
                    {r.report_text || "(empty)"}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BugFixerAdmin;
