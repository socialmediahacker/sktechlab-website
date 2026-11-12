REVOKE ALL ON FUNCTION public.has_permission(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(uuid, text, text) TO authenticated, service_role;

INSERT INTO public.permissions (module, action, label, sort_order) VALUES
  ('users','view','View users',10),
  ('users','manage','Manage users (block, plan, delete)',11),
  ('users','impersonate','Login as user',12),
  ('roles','view','View roles & permissions',20),
  ('roles','manage','Assign roles & permissions',21),
  ('sites','view','View all sites',30),
  ('sites','manage','Manage all sites',31),
  ('templates','view','View templates',40),
  ('templates','manage','Manage templates',41),
  ('categories','manage','Manage categories',45),
  ('plans','view','View plans',50),
  ('plans','manage','Manage plans & limits',51),
  ('invoices','view','View invoices',55),
  ('invoices','manage','Create & edit invoices',56),
  ('payments','view','View payments',60),
  ('payments','manage','Approve / reject payments',61),
  ('domains','view','View domain requests',65),
  ('domains','manage','Approve / verify domains',66),
  ('tickets','view','View support tickets',70),
  ('tickets','manage','Reply & close tickets',71),
  ('templates_msg','view','View message templates',75),
  ('templates_msg','manage','Edit message templates',76),
  ('commerce','view','View store data',80),
  ('commerce','manage','Manage store data',81),
  ('seo','manage','Manage SEO / GEO',85),
  ('reviews','manage','Manage reviews',86),
  ('settings','manage','Manage site settings',90),
  ('activity','view','View activity log',95)
ON CONFLICT (module, action) DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'super_admin'::public.app_role, id FROM public.permissions
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin'::public.app_role, id FROM public.permissions
WHERE NOT (module = 'users' AND action = 'impersonate')
  AND NOT (module = 'roles' AND action = 'manage')
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'staff'::public.app_role, id FROM public.permissions
WHERE (module, action) IN (
  ('users','view'),('sites','view'),('templates','view'),('templates','manage'),
  ('categories','manage'),('plans','view'),('invoices','view'),('payments','view'),
  ('domains','view'),('tickets','view'),('tickets','manage'),('commerce','view'),
  ('commerce','manage'),('reviews','manage')
)
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role, permission_id)
SELECT 'support'::public.app_role, id FROM public.permissions
WHERE (module, action) IN (
  ('users','view'),('sites','view'),('tickets','view'),('tickets','manage'),
  ('domains','view'),('invoices','view')
)
ON CONFLICT DO NOTHING;