import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, notAuthenticated, textResult, errorResult } from "../supabase";

export default defineTool({
  name: "create_support_ticket",
  title: "Create a support ticket",
  description: "Open a support ticket for the signed-in user. Optionally link it to one of their websites.",
  inputSchema: {
    subject: z.string().describe("Short summary of the request."),
    message: z.string().describe("Full details of the request."),
    category: z.string().optional().describe("Ticket category, e.g. general, billing, technical."),
    site_id: z.string().optional().describe("Id of the related website, if any."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ subject, message, category, site_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const title = subject.trim();
    const body = message.trim();
    if (!title || !body) return errorResult("Both subject and message are required.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: ctx.getUserId(),
        subject: title.slice(0, 200),
        message: body,
        category: (category ?? "general").slice(0, 40),
        ...(site_id ? { site_id } : {}),
      })
      .select("id, subject, status, created_at")
      .maybeSingle();
    if (error) return errorResult(error.message);
    return textResult({ ticket: data });
  },
});
