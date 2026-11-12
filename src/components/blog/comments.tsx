/**
 * Blog comments — public form + approved comment list.
 * Every new comment is held for admin approval before it appears publicly.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listPostComments, submitPostComment } from "@/lib/blog.functions";

export function BlogComments({ postId }: { postId: string }) {
  const load = useServerFn(listPostComments);
  const send = useServerFn(submitPostComment);
  const { data: comments = [], refetch } = useQuery({
    queryKey: ["blog_comments", postId],
    queryFn: () => load({ data: { postId } }),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || body.trim().length < 4) {
      toast.error("Please add your name and a short comment.");
      return;
    }
    setBusy(true);
    try {
      await send({ data: { postId, name: name.trim(), email: email.trim(), body: body.trim() } });
      setBody("");
      toast.success("Thanks! Your comment will appear once it's approved.");
      refetch();
    } catch (err: any) {
      toast.error(String(err?.message ?? "Could not send your comment"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-14">
      <h2 className="flex items-center gap-2 text-xl" style={{ fontFamily: "var(--blog-head)" }}>
        <MessageCircle className="h-5 w-5" style={{ color: "var(--blog-accent)" }} />
        Comments {comments.length ? `(${comments.length})` : ""}
      </h2>

      <form
        onSubmit={submit}
        className="mt-5 rounded-2xl border p-5"
        style={{ borderColor: "var(--blog-line)" }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <Input
            placeholder="Email (optional, not published)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={160}
          />
        </div>
        <Textarea
          className="mt-3 min-h-28"
          placeholder="Share your thoughts…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs" style={{ color: "var(--blog-muted)" }}>
            Comments are reviewed before they go live.
          </p>
          <Button type="submit" disabled={busy} className="rounded-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Post comment
          </Button>
        </div>
      </form>

      {comments.length ? (
        <ul className="mt-6 space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl border p-4" style={{ borderColor: "var(--blog-line)" }}>
              <div className="flex items-center gap-3">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold text-white"
                  style={{ background: "var(--blog-accent)" }}
                >
                  {c.author_name.slice(0, 1).toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-medium">{c.author_name}</p>
                  <p className="text-xs" style={{ color: "var(--blog-muted)" }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-sm" style={{ color: "var(--blog-muted)" }}>
          No comments yet — be the first to share your view.
        </p>
      )}
    </section>
  );
}
