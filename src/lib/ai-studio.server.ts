/**
 * AI Studio: natural-language management of demo templates.
 * The model proposes changes, we store them as a run (with before-snapshots),
 * the admin previews the diff and applies or discards it. Runs can be undone.
 */
import { callEditorChat } from "@/lib/site-editor.server";
import { variantFor } from "@/lib/design/variant";
import { makeSiteSlug } from "@/lib/site-slug";

type AnyDb = { from: (t: string) => any };

export type Proposal = {
  action: "create" | "update";
  templateId?: string;
  name: string;
  summary: string;
  content_json: any;
};

const SYSTEM = `You are the design director of SKTECHLAB, an AI website builder.
You edit or create demo websites stored as JSON.
Schema: { archetype: string, brand: { name, tagline, primary, secondary, accent, layout, theme, whatsapp, email, phone, address }, sections: Section[] }
Section types: hero3d{headline,sub,cta,image,bullets}, features{title,items[{icon,title,desc}]}, stats{items[{k,v}]},
products{title,items[{id,name,price,image}]}, menu{title,items[{name,price,desc,image}]}, gallery{title,images[]},
testimonials{title,items[{name,role,text,rating}]}, pricing{title,plans[{name,price,period,features[],featured}]},
team{title,items[{name,role,image}]}, showcase{kind,title,items[{title,meta,desc,image}]},
portfolio{title,items[{title,meta,year,desc,image,tags[]}]}, booking{mode,title,cta}, faq{title,items[{q,a}]},
cta{headline,sub,cta}, contact{title,sub}.
Rules: write real Indian-business copy (no lorem, no placeholders), keep existing image URLs unless told otherwise,
never invent new section types, keep brand.layout/theme untouched unless the instruction is about design style.
Return ONLY JSON: { "proposals": [ { "action": "update"|"create", "templateId": string|null, "name": string, "summary": string, "content_json": {...} } ] }`;

export async function proposeRun(
  db: AnyDb,
  opts: { prompt: string; categoryId?: string | null; templateIds?: string[]; limit?: number; userId: string },
): Promise<{ runId: string; proposals: Proposal[] }> {
  const limit = Math.min(Math.max(opts.limit ?? 3, 1), 8);

  let q = db.from("templates").select("id,name,category_id,content_json").limit(limit);
  if (opts.templateIds?.length) q = q.in("id", opts.templateIds);
  else if (opts.categoryId) q = q.eq("category_id", opts.categoryId);
  const { data: rows } = await q;
  const targets = (rows ?? []) as any[];

  let categorySlug = "business";
  if (opts.categoryId) {
    const { data: cat } = await db.from("categories").select("slug").eq("id", opts.categoryId).maybeSingle();
    if (cat?.slug) categorySlug = cat.slug;
  }

  const user = `Instruction: ${opts.prompt}

Category: ${categorySlug}
Existing demos (JSON, trimmed):
${JSON.stringify(
    targets.map((t) => ({ id: t.id, name: t.name, content_json: t.content_json })),
  ).slice(0, 60_000)}

Produce at most ${limit} proposals.`;

  const raw = await callEditorChat(
    [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    "gemini-flash",
    true,
  );
  let parsed: any;
  try {
    parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("AI returned an unreadable response — try rephrasing the instruction");
  }
  const proposals: Proposal[] = (parsed?.proposals ?? [])
    .filter((p: any) => p && p.content_json)
    .slice(0, limit)
    .map((p: any) => ({
      action: p.action === "create" ? "create" : "update",
      templateId: p.templateId ?? undefined,
      name: String(p.name ?? "Untitled demo").slice(0, 120),
      summary: String(p.summary ?? "").slice(0, 400),
      content_json: p.content_json,
    }));
  if (!proposals.length) throw new Error("AI produced no changes for this instruction");

  const snapshots = targets
    .filter((t) => proposals.some((p) => p.templateId === t.id))
    .map((t) => ({ id: t.id, content_json: t.content_json }));

  const { data: run, error } = await db
    .from("ai_runs")
    .insert({
      created_by: opts.userId,
      prompt: opts.prompt,
      scope: { categoryId: opts.categoryId ?? null, templateIds: opts.templateIds ?? [] },
      proposals,
      snapshots,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { runId: run.id as string, proposals };
}

export async function applyRun(db: AnyDb, runId: string): Promise<{ updated: number; created: number }> {
  const { data: run } = await db.from("ai_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) throw new Error("Run not found");
  if (run.status === "applied") throw new Error("This run was already applied");

  const scope = (run.scope ?? {}) as { categoryId?: string | null };
  let categorySlug = "business";
  if (scope.categoryId) {
    const { data: cat } = await db.from("categories").select("slug").eq("id", scope.categoryId).maybeSingle();
    if (cat?.slug) categorySlug = cat.slug;
  }

  let updated = 0;
  let created = 0;
  for (const p of (run.proposals ?? []) as Proposal[]) {
    if (p.action === "update" && p.templateId) {
      await db
        .from("templates")
        .update({ content_json: p.content_json, sections: p.content_json?.sections ?? null })
        .eq("id", p.templateId);
      updated += 1;
    } else if (p.action === "create") {
      const id = crypto.randomUUID();
      const v = variantFor(categorySlug, id, created);
      const content = {
        ...p.content_json,
        brand: { ...(p.content_json?.brand ?? {}), layout: v.layout, theme: v.theme, primary: v.primary, accent: v.accent },
      };
      await db.from("templates").insert({
        id,
        name: p.name,
        slug: makeSiteSlug(`${p.name}-${id.slice(0, 5)}`),
        category_id: scope.categoryId ?? null,
        description: p.summary,
        content_json: content,
        sections: content.sections ?? null,
        thumbnail_url: content?.sections?.find((s: any) => s?.image)?.image ?? null,
      });
      created += 1;
    }
  }
  await db.from("ai_runs").update({ status: "applied", applied_at: new Date().toISOString() }).eq("id", runId);
  return { updated, created };
}

export async function undoRun(db: AnyDb, runId: string): Promise<{ restored: number }> {
  const { data: run } = await db.from("ai_runs").select("*").eq("id", runId).maybeSingle();
  if (!run) throw new Error("Run not found");
  const snaps = (run.snapshots ?? []) as Array<{ id: string; content_json: any }>;
  for (const s of snaps) {
    await db
      .from("templates")
      .update({ content_json: s.content_json, sections: s.content_json?.sections ?? null })
      .eq("id", s.id);
  }
  await db.from("ai_runs").update({ status: "undone" }).eq("id", runId);
  return { restored: snaps.length };
}
