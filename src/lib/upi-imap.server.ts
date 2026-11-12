/**
 * Minimal IMAP-over-TLS reader for the FamPay-style UPI auto payment system.
 * Admin stores the payment inbox (Gmail address + app password); this module
 * logs in, pulls new mails and feeds them into the payment matcher.
 *
 * Server-only. Works on the Worker runtime (cloudflare:sockets) and on Node.
 */

type Sock = {
  read: () => Promise<Uint8Array | null>;
  write: (data: string) => Promise<void>;
  close: () => Promise<void>;
};

async function connectTls(host: string, port: number): Promise<Sock> {
  const enc = new TextEncoder();
  // Worker runtime
  try {
    const spec = "cloudflare:" + "sockets";
    const mod: any = await import(/* @vite-ignore */ spec);

    if (mod?.connect) {
      const s = mod.connect({ hostname: host, port }, { secureTransport: "on" });
      const reader = s.readable.getReader();
      const writer = s.writable.getWriter();
      return {
        read: async () => {
          const { value, done } = await reader.read();
          return done ? null : (value as Uint8Array);
        },
        write: async (d) => { await writer.write(enc.encode(d)); },
        close: async () => {
          try { await writer.close(); } catch { /* ignore */ }
          try { await s.close(); } catch { /* ignore */ }
        },
      };
    }
  } catch { /* not on workerd, fall through */ }

  // Node (dev server)
  const tls: any = await import(/* @vite-ignore */ "node:tls");
  return await new Promise<Sock>((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let waiter: ((v: Uint8Array | null) => void) | null = null;
    let ended = false;
    const socket = tls.connect({ host, port, servername: host }, () => {
      resolve({
        read: () =>
          new Promise<Uint8Array | null>((res) => {
            const next = chunks.shift();
            if (next) return res(next);
            if (ended) return res(null);
            waiter = res;
          }),
        write: (d) => new Promise<void>((res) => socket.write(d, () => res())),
        close: async () => { try { socket.destroy(); } catch { /* ignore */ } },
      });
    });
    socket.on("data", (d: Uint8Array) => {
      if (waiter) { const w = waiter; waiter = null; w(d); } else chunks.push(d);
    });
    socket.on("end", () => { ended = true; if (waiter) { const w = waiter; waiter = null; w(null); } });
    socket.on("error", (e: Error) => { ended = true; if (waiter) { const w = waiter; waiter = null; w(null); } reject(e); });
  });
}

class ImapClient {
  private sock: Sock;
  private buf = "";
  private dec = new TextDecoder();
  private seq = 0;
  private deadline: number;

  constructor(sock: Sock, timeoutMs: number) {
    this.sock = sock;
    this.deadline = Date.now() + timeoutMs;
  }

  static async open(host: string, port: number, timeoutMs = 25_000) {
    const sock = await connectTls(host, port);
    const c = new ImapClient(sock, timeoutMs);
    await c.readUntil((b) => /^\* (OK|PREAUTH)/m.test(b));
    return c;
  }

  private async pump() {
    if (Date.now() > this.deadline) throw new Error("IMAP timeout");
    const chunk = await this.sock.read();
    if (chunk === null) throw new Error("IMAP connection closed");
    this.buf += this.dec.decode(chunk, { stream: true });
  }

  private async readUntil(pred: (buf: string) => boolean) {
    while (!pred(this.buf)) await this.pump();
    const out = this.buf;
    this.buf = "";
    return out;
  }

  async cmd(line: string) {
    const tag = `a${++this.seq}`;
    await this.sock.write(`${tag} ${line}\r\n`);
    const re = new RegExp(`^${tag} (OK|NO|BAD)(.*)$`, "m");
    const res = await this.readUntil((b) => re.test(b));
    const m = res.match(re);
    if (m && m[1] !== "OK") throw new Error(`IMAP ${m[1]}:${m[2] ?? ""}`.trim());
    return res;
  }

  async login(user: string, pass: string) {
    const q = (v: string) => `"${v.replace(/([\\"])/g, "\\$1")}"`;
    await this.cmd(`LOGIN ${q(user)} ${q(pass)}`);
  }

  async close() {
    try { await this.cmd("LOGOUT"); } catch { /* ignore */ }
    await this.sock.close();
  }
}

/* ------------------------- MIME helpers ------------------------- */

function decodeQuotedPrintable(s: string) {
  return s
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function decodeBase64(s: string) {
  try {
    const clean = s.replace(/[^A-Za-z0-9+/=]/g, "");
    const bin = atob(clean);
    const bytes = Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return s;
  }
}

function decodeHeaderWord(v: string) {
  return v.replace(/=\?[^?]+\?([QqBb])\?([^?]*)\?=/g, (_, enc: string, txt: string) =>
    enc.toLowerCase() === "b" ? decodeBase64(txt) : decodeQuotedPrintable(txt.replace(/_/g, " ")),
  );
}

/** Turn a raw RFC822 message into { from, subject, body-as-plain-text }. */
export function parseRawMessage(raw: string) {
  const split = raw.indexOf("\r\n\r\n") >= 0 ? raw.indexOf("\r\n\r\n") : raw.indexOf("\n\n");
  const headerBlock = (split > 0 ? raw.slice(0, split) : raw).replace(/\r?\n[ \t]+/g, " ");
  let body = split > 0 ? raw.slice(split) : "";

  const header = (name: string) => {
    const m = headerBlock.match(new RegExp(`^${name}:\\s*(.*)$`, "im"));
    return m?.[1] ? decodeHeaderWord(m[1].trim()) : "";
  };

  const cte = (headerBlock.match(/^Content-Transfer-Encoding:\s*(\S+)/im)?.[1] ?? "").toLowerCase();
  if (cte === "base64") body = decodeBase64(body);
  else if (cte === "quoted-printable") body = decodeQuotedPrintable(body);
  else if (/Content-Transfer-Encoding:\s*base64/i.test(body)) {
    // multipart: decode every base64 part we can find
    body = body.replace(/Content-Transfer-Encoding:\s*base64\r?\n\r?\n([\s\S]*?)(?=\r?\n--|\s*$)/gi,
      (_, p: string) => decodeBase64(p));
  } else if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(body)) {
    body = decodeQuotedPrintable(body);
  }

  const text = body
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#8377;|&rupee;/gi, "\u20B9")
    .replace(/[ \t]+/g, " ");

  const fromRaw = header("From");
  const fromEmail = fromRaw.match(/[\w.+-]+@[\w.-]+/)?.[0] ?? fromRaw;
  return { from: fromEmail, subject: header("Subject"), body: text };
}

function imapDate(d: Date) {
  const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getUTCDate()}-${M[d.getUTCMonth()]}-${d.getUTCFullYear()}`;
}

/* ------------------------- main poller ------------------------- */

export type ImapPollResult = {
  ok: boolean;
  checked: number;
  matched: number;
  lastUid: number;
  error?: string;
  skipped?: string;
};

/**
 * Connect to the payment inbox, read new mails and run them through the
 * payment matcher. Safe to call often — respects a minimum gap unless forced.
 */
export async function pollUpiInbox(opts: { force?: boolean; maxMessages?: number } = {}): Promise<ImapPollResult> {
  const { loadUpiSettings, processPaymentEmail } = await import("./upi-gateway.server");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const s: any = await loadUpiSettings();

  if (!s?.imap_enabled || !s?.imap_email || !s?.imap_app_password) {
    return { ok: false, checked: 0, matched: 0, lastUid: 0, skipped: "not_configured" };
  }
  if (!opts.force && s.imap_last_checked_at) {
    const gap = Date.now() - new Date(s.imap_last_checked_at).getTime();
    if (gap < 15_000) return { ok: true, checked: 0, matched: 0, lastUid: Number(s.imap_last_uid ?? 0), skipped: "throttled" };
  }

  const host = String(s.imap_host || "imap.gmail.com");
  const port = Number(s.imap_port || 993);
  const folder = String(s.imap_folder || "INBOX");
  const lastUid = Number(s.imap_last_uid ?? 0);
  const max = opts.maxMessages ?? 12;

  let client: ImapClient | null = null;
  try {
    client = await ImapClient.open(host, port);
    await client.login(String(s.imap_email), String(s.imap_app_password));
    await client.cmd(`SELECT "${folder.replace(/"/g, "")}"`);

    const searchCmd = lastUid > 0
      ? `UID SEARCH UID ${lastUid + 1}:*`
      : `UID SEARCH SINCE ${imapDate(new Date(Date.now() - 86_400_000))}`;
    const searchRes = await client.cmd(searchCmd);
    const line = searchRes.match(/^\* SEARCH([^\r\n]*)/m)?.[1] ?? "";
    const uids = [...line.matchAll(/\d+/g)]
      .map((m) => Number(m[0]))
      .filter((u) => u > lastUid)
      .sort((a, b) => a - b)
      .slice(-max);

    let matched = 0;
    let newest = lastUid;
    for (const uid of uids) {
      let raw = "";
      try {
        raw = await client.cmd(`UID FETCH ${uid} (BODY.PEEK[])`);
      } catch {
        continue;
      }
      newest = Math.max(newest, uid);
      const mail = parseRawMessage(raw);
      if (!mail.body.trim()) continue;
      try {
        const res: any = await processPaymentEmail(
          { from: mail.from, subject: mail.subject, body: mail.body },
          "imap",
        );
        if (res?.status === "matched" || res?.matched) matched += 1;
      } catch { /* keep reading other mails */ }
    }

    await supabaseAdmin
      .from("upi_gateway_settings")
      .update({
        imap_last_uid: newest,
        imap_last_checked_at: new Date().toISOString(),
        imap_last_ok_at: new Date().toISOString(),
        imap_last_error: null,
      } as any)
      .eq("id", 1);

    return { ok: true, checked: uids.length, matched, lastUid: newest };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("upi_gateway_settings")
      .update({ imap_last_checked_at: new Date().toISOString(), imap_last_error: msg.slice(0, 400) } as any)
      .eq("id", 1);
    return { ok: false, checked: 0, matched: 0, lastUid, error: msg };
  } finally {
    try { await client?.close(); } catch { /* ignore */ }
  }
}

/** Login-only connectivity check for the admin "Test connection" button. */
export async function testUpiInbox(input: {
  host: string; port: number; email: string; password: string; folder: string;
}): Promise<{ ok: boolean; error?: string; messages?: number }> {
  let client: ImapClient | null = null;
  try {
    client = await ImapClient.open(input.host, input.port, 20_000);
    await client.login(input.email, input.password);
    const res = await client.cmd(`SELECT "${(input.folder || "INBOX").replace(/"/g, "")}"`);
    const count = Number(res.match(/^\* (\d+) EXISTS/m)?.[1] ?? 0);
    return { ok: true, messages: count };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    try { await client?.close(); } catch { /* ignore */ }
  }
}
