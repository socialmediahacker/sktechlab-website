import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SiteContent } from "@/lib/site-renderer/types";

export const fetchPublicSite = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: row, error } = await supabase
      .from("sites")
      .select("id, name, content_json, published, subdomain, suspended")
      .eq("subdomain", data.slug)
      .maybeSingle();
    if (error || !row) return null;
    return row as {
      id: string;
      name: string;
      content_json: SiteContent | null;
      published: boolean;
      subdomain: string;
      suspended: boolean;
    };
  });