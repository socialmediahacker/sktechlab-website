import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
export async function domainUser() {
  const header = getRequest().headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7).trim() : undefined;
  if (!token) throw new Error("Sign in to check a domain for your website.");
  const url = process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient(url, key, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Sign in again to check a domain.");
  return { supabase, userId: data.user.id };
}
