import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Send, X, Sparkles, MessageCircle } from "lucide-react";
import { supportChat } from "@/lib/support-ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Namaste 👋 Main SK Assistant hoon. Website banane, editor, plans, domain ya store — kisi bhi cheez me help chahiye to poochhiye.",
};

const QUICK = [
  "Website kaise banau?",
  "Apna domain kaise jodun?",
  "Editor me photo kaise badlun?",
  "Shop plan me kya milta hai?",
];

export function SupportChat({ onClose, whatsapp }: { onClose: () => void; whatsapp?: string | null }) {
  const ask = useServerFn(supportChat);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const clean = text.trim().slice(0, 1200);
    if (!clean || busy) return;
    const next = [...messages, { role: "user" as const, content: clean }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({ data: { messages: next.filter((m) => m !== GREETING).slice(-12) } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Abhi jawab nahi mil paaya. Please WhatsApp par message karein." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[min(70vh,520px)] w-[min(92vw,22rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 bg-gradient-brand px-4 py-3 text-brand-foreground">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4" /> SK Assistant
        </div>
        <button onClick={onClose} aria-label="Close chat" className="opacity-80 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user" ? "bg-brand text-brand-foreground" : "bg-muted/70 text-foreground"
              }`}
            >
              <div className="prose prose-sm max-w-none dark:prose-invert [&_p]:my-1 [&_ol]:my-1 [&_ul]:my-1">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted/70 px-3 py-2 text-sm text-muted-foreground">Typing…</div>
          </div>
        )}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => send(q)}
                className="rounded-full border border-border/60 px-3 py-1 text-xs hover:bg-muted"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border/60 p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Apna sawaal likhiye…"
            className="max-h-24 flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 px-1 text-[10px] text-muted-foreground">
          AI assistant — password ya OTP kabhi share na karein.
          {whatsapp && (
            <>
              {" "}
              <a
                href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-brand underline"
              >
                <MessageCircle className="h-3 w-3" /> Human team
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
