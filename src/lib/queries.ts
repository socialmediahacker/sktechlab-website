import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*, templates(count), subcategories(id, slug, name, sort_order)")
      .order("sort_order")
      .order("sort_order", { foreignTable: "subcategories" })
      .order("name", { foreignTable: "subcategories" });
    if (error) throw error;
    return data;
  },
});

export const categoryBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*, templates(*), subcategories(id, slug, name, sort_order)")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const templateByIdQuery = (id: string) =>
  queryOptions({
    queryKey: ["template", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("templates")
        .select("*, categories(name, slug)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

const SHOWCASE_COLS =
  "id, name, description, thumbnail_url, demo_url, accent_color, is_editable_demo, show_on_home, home_slot, archetype, categories(name, slug)";

/** "Websites created on SKTECHLAB" strip — admin-managed via home_slot. */
export const featuredTemplatesQuery = queryOptions({
  queryKey: ["featured_templates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("templates")
      .select(SHOWCASE_COLS)
      .eq("home_slot", "showcase")
      .order("sort_order")
      .order("id")
      .limit(18);
    if (error) throw error;
    if (data?.length) return data;

    // fallback so the home page never renders empty
    const { data: legacy, error: e2 } = await supabase
      .from("templates")
      .select(SHOWCASE_COLS)
      .or("is_editable_demo.eq.false,show_on_home.eq.true")
      .order("sort_order")
      .order("id")
      .limit(18);
    if (e2) throw e2;
    return legacy ?? [];
  },
});

/** Top SKTECHLAB editable demos — one per flagship category, for the home page live-demo gallery. */
export const HOME_DEMO_CATEGORIES = ["ecommerce", "mehndi-art", "salon", "restaurant", "business", "travel"] as const;

export const homeLiveDemosQuery = queryOptions({
  queryKey: ["home_live_demos"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("templates")
      .select(SHOWCASE_COLS)
      .eq("home_slot", "demo")
      .order("sort_order")
      .order("id")
      .limit(12);
    if (error) throw error;
    if (data?.length) return data as any[];

    // fallback: one editable demo per flagship category
    const { data: rows, error: e2 } = await supabase
      .from("templates")
      .select(SHOWCASE_COLS.replace("categories(", "categories!inner("))
      .eq("is_editable_demo", true)
      .in("categories.slug", HOME_DEMO_CATEGORIES as unknown as string[])
      .order("sort_order")
      .limit(60);
    if (e2) throw e2;
    return HOME_DEMO_CATEGORIES.map((slug) =>
      (rows ?? []).find((r: any) => r.categories?.slug === slug),
    ).filter(Boolean) as any[];
  },
});

export const publicReviewsQuery = queryOptions({
  queryKey: ["public_reviews"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("id, name, role, location, rating, text, photo_url, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const adminReviewsQuery = queryOptions({
  queryKey: ["admin_reviews"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("sort_order")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const adminPaymentGatewaysQuery = queryOptions({
  queryKey: ["admin_payment_gateways"],
  queryFn: async () => {
    const { adminListPaymentGateways } = await import("@/lib/admin-config.functions");
    return (await adminListPaymentGateways()) ?? [];
  },
});




export const allTemplatesQuery = queryOptions({
  queryKey: ["all_templates"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("templates")
      .select("*, categories(name, slug)")
      .order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const servicePlansQuery = (type: "digital_marketing" | "gmb_boost" | "website_development" | "site_subscription") =>
  queryOptions({
    queryKey: ["service_plans", type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_plans")
        .select("*")
        .eq("service_type", type)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

/** Current signed-in user id, or null. Used to scope "my ..." queries. */
async function currentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export const mySitesQuery = queryOptions({
  queryKey: ["my_sites"],
  queryFn: async () => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from("sites")
      .select("*, templates(name, thumbnail_url, demo_url, accent_color)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const myOrdersQuery = queryOptions({
  queryKey: ["my_orders"],
  queryFn: async () => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from("service_orders")
      .select("*, service_plans(name, tier, service_type, price_inr, billing)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const myProfileQuery = queryOptions({
  queryKey: ["my_profile"],
  queryFn: async () => {
    const uid = await currentUserId();
    if (!uid) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const myDomainRequestsQuery = queryOptions({
  queryKey: ["my_domain_requests"],
  queryFn: async () => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from("domain_requests")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const adminDomainRequestsQuery = queryOptions({
  queryKey: ["admin_domain_requests"],
  queryFn: async () => {
    const { data: requests, error } = await supabase
      .from("domain_requests")
      .select("*, sites(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const userIds = [...new Set((requests ?? []).map((r: any) => r.user_id).filter(Boolean))];
    if (!userIds.length) return requests ?? [];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, whatsapp_number")
      .in("id", userIds);
    if (profileError) throw profileError;
    const byUser = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (requests ?? []).map((r: any) => ({ ...r, profiles: byUser.get(r.user_id) ?? null }));
  },
});

export const domainRootsQuery = queryOptions({
  queryKey: ["domain_roots"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("domain_roots")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as any[];

  },
});



/** Columns of site_settings that are safe to read with the public API key. */
const PUBLIC_SITE_SETTINGS_COLUMNS = [
  "id","whatsapp_number","whatsapp_message","whatsapp_enabled","tawk_property_id","tawk_widget_id",
  "tawk_enabled","brand_name","brand_tagline","contact_email","contact_phone","updated_at",
  "ai_generation_enabled","razorpay_enabled","whatsapp_otp_enabled","free_subdomain_root",
  "email_login_enabled","otp_provider","sms_fallback_enabled","voice_api_enabled",
  "contact_popup_enabled","floating_widgets_enabled","ai_provider","pexels_enabled",
  "starter_free_domain_root","default_map_query","default_map_embed_url","crypto_payment_note",
  "ecommerce_enabled","woocommerce_plan_tier","trial_days","autopay_enabled","autopay_provider",
  "manual_upi_enabled","crypto_enabled","ecom_addon_enabled","ecom_addon_price_inr",
  "ecom_addon_billing","ecom_addon_label","ecom_addon_desc","ecom_addon_product_limit",
  "hero_story_images","email_enabled","email_from_name","email_types",
].join(",");

export const siteSettingsQuery = queryOptions({
  queryKey: ["site_settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select(PUBLIC_SITE_SETTINGS_COLUMNS)
      .eq("id", 1)
      .maybeSingle();
    if (error) throw error;
    return data as any;
  },
});

/** Full settings row (includes payment / notification identifiers) — admins only. */
export const adminSiteSettingsQuery = queryOptions({
  queryKey: ["admin_site_settings"],
  queryFn: async () => {
    const { adminGetSiteSettings } = await import("@/lib/admin-config.functions");
    return (await adminGetSiteSettings()) as any;
  },
});


export const myRolesQuery = queryOptions({
  queryKey: ["my_roles"],
  queryFn: async (): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (error) throw error;
    return (data ?? []).map((r: any) => String(r.role));
  },
});

export const isAdminQuery = queryOptions({
  queryKey: ["is_admin"],
  queryFn: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "super_admin", "staff", "support"]);
    if (error) throw error;
    return (data ?? []).length > 0;
  },
});

export const myPermissionsQuery = queryOptions({
  queryKey: ["my_permissions"],
  queryFn: async (): Promise<{ roles: string[]; keys: string[] }> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { roles: [], keys: [] };
    const { data: roleRows, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    if (error) throw error;
    const roles = (roleRows ?? []).map((r: any) => String(r.role));
    if (!roles.length) return { roles, keys: [] };
    const { data: rp, error: e2 } = await supabase
      .from("role_permissions")
      .select("role, permissions(module, action)")
      .in("role", roles as any);
    if (e2) throw e2;
    const keys = (rp ?? [])
      .map((row: any) => (row.permissions ? `${row.permissions.module}.${row.permissions.action}` : null))
      .filter(Boolean) as string[];
    return { roles, keys: Array.from(new Set(keys)) };
  },
});

export const adminPermissionsQuery = queryOptions({
  queryKey: ["admin_permissions"],
  queryFn: async () => {
    const { data, error } = await supabase.from("permissions").select("*").order("sort_order");
    if (error) throw error;
    return data ?? [];
  },
});

export const adminRolePermissionsQuery = queryOptions({
  queryKey: ["admin_role_permissions"],
  queryFn: async () => {
    const { data, error } = await supabase.from("role_permissions").select("role, permission_id");
    if (error) throw error;
    return data ?? [];
  },
});

export const adminActivityQuery = queryOptions({
  queryKey: ["admin_activity"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
});

export const adminInvoicesQuery = queryOptions({
  queryKey: ["admin_invoices"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return data ?? [];
  },
});

export const myInvoicesQuery = queryOptions({
  queryKey: ["my_invoices"],
  queryFn: async () => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const adminMessageTemplatesQuery = queryOptions({
  queryKey: ["admin_message_templates"],
  queryFn: async () => {
    const { data, error } = await supabase.from("message_templates").select("*").order("key");
    if (error) throw error;
    return data ?? [];
  },
});

export const adminMessageLogsQuery = queryOptions({
  queryKey: ["admin_message_logs"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("message_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    return data ?? [];
  },
});


export const adminAllPlansQuery = queryOptions({
  queryKey: ["admin_plans"],
  queryFn: async () => {
    const { data, error } = await supabase.from("service_plans").select("*").order("service_type").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const adminUsersQuery = queryOptions({
  queryKey: ["admin_users"],
  queryFn: async () => {
    const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    const { data: roles, error: e2 } = await supabase.from("user_roles").select("user_id, role");
    if (e2) throw e2;
    const byUser = new Map<string, any[]>();
    (roles ?? []).forEach((r: any) => {
      const arr = byUser.get(r.user_id) ?? [];
      arr.push({ role: r.role });
      byUser.set(r.user_id, arr);
    });
    return (profiles ?? []).map((p: any) => ({ ...p, user_roles: byUser.get(p.id) ?? [] }));
  },
});

export const myTicketsQuery = queryOptions({
  queryKey: ["my_tickets"],
  queryFn: async () => {
    const uid = await currentUserId();
    if (!uid) return [];
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, sites(name)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const adminTicketsQuery = queryOptions({
  queryKey: ["admin_tickets"],
  queryFn: async () => {
    const { data: tickets, error } = await supabase
      .from("support_tickets")
      .select("*, sites(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const userIds = [...new Set((tickets ?? []).map((t: any) => t.user_id).filter(Boolean))];
    if (!userIds.length) return tickets ?? [];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, whatsapp_number")
      .in("id", userIds);
    if (profileError) throw profileError;
    const byUser = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (tickets ?? []).map((t: any) => ({ ...t, profiles: byUser.get(t.user_id) ?? null }));
  },
});

export const adminSitesQuery = queryOptions({
  queryKey: ["admin_sites"],
  queryFn: async () => {
    const { data: sites, error } = await supabase
      .from("sites")
      .select("*, templates(name, thumbnail_url, demo_url, accent_color)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    const userIds = [...new Set((sites ?? []).map((s: any) => s.user_id).filter(Boolean))];
    if (!userIds.length) return sites ?? [];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, whatsapp_number")
      .in("id", userIds);
    if (profileError) throw profileError;
    const byUser = new Map((profiles ?? []).map((p: any) => [p.id, p]));
    return (sites ?? []).map((s: any) => ({ ...s, profiles: byUser.get(s.user_id) ?? null }));
  },
});

export const adminSeoQuery = queryOptions({
  queryKey: ["admin_seo"],
  queryFn: async () => {
    const { data, error } = await supabase.from("page_seo").select("*").order("path");
    if (error) throw error;
    return data;
  },
});

export const adminCustomDevQuery = queryOptions({
  queryKey: ["admin_custom_dev"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("custom_dev_requests")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

