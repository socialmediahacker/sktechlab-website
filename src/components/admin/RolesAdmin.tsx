import { useMemo, useState } from "react";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  adminPermissionsQuery,
  adminRolePermissionsQuery,
  adminUsersQuery,
  myPermissionsQuery,
} from "@/lib/queries";
import { adminSetUserRole, adminToggleRolePermission, adminUserSnapshot } from "@/lib/admin.functions";

const ROLES = ["super_admin", "admin", "staff", "support", "user"] as const;

export function RolesAdmin() {
  const qc = useQueryClient();
  const { data: perms } = useSuspenseQuery(adminPermissionsQuery);
  const { data: rolePerms } = useSuspenseQuery(adminRolePermissionsQuery);
  const { data: users } = useSuspenseQuery(adminUsersQuery);
  const { data: me } = useSuspenseQuery(myPermissionsQuery);
  const isSuper = me.roles.includes("super_admin");

  const toggleFn = useServerFn(adminToggleRolePermission);
  const setRoleFn = useServerFn(adminSetUserRole);
  const snapshotFn = useServerFn(adminUserSnapshot);

  const [search, setSearch] = useState("");
  const [snapshot, setSnapshot] = useState<any>(null);

  const granted = useMemo(() => {
    const set = new Set<string>();
    (rolePerms as any[]).forEach((r) => set.add(`${r.role}:${r.permission_id}`));
    return set;
  }, [rolePerms]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    (perms as any[]).forEach((p) => {
      const arr = map.get(p.module) ?? [];
      arr.push(p);
      map.set(p.module, arr);
    });
    return Array.from(map.entries());
  }, [perms]);

  const togglePerm = useMutation({
    mutationFn: (v: { role: string; permissionId: string; enabled: boolean }) => toggleFn({ data: v }),
    onSuccess: () => {
      toast.success("Permission updated");
      qc.invalidateQueries({ queryKey: ["admin_role_permissions"] });
      qc.invalidateQueries({ queryKey: ["my_permissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setRole = useMutation({
    mutationFn: (v: { userId: string; role: string; enabled: boolean }) => setRoleFn({ data: v }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin_users"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const viewAs = useMutation({
    mutationFn: (userId: string) => snapshotFn({ data: { userId } }),
    onSuccess: (data) => setSnapshot(data),
    onError: (e: Error) => toast.error(e.message),
  });

  const filteredUsers = (users as any[]).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(u.full_name ?? "").toLowerCase().includes(q) ||
      String(u.whatsapp_number ?? "").toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {!isSuper && (
        <div className="glass rounded-2xl p-4 text-sm text-muted-foreground">
          You can view roles and permissions. Only a super admin can change them.
        </div>
      )}

      <div className="glass overflow-x-auto rounded-2xl p-4">
        <h3 className="mb-3 text-lg font-semibold">Permission matrix</h3>
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="p-2">Permission</th>
              {ROLES.map((r) => (
                <th key={r} className="p-2 text-center">{r.replace("_", " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grouped.map(([module, list]) => (
              <>
                <tr key={`h-${module}`} className="border-t border-border/60 bg-muted/30">
                  <td className="p-2 text-xs font-semibold uppercase tracking-wide" colSpan={ROLES.length + 1}>
                    {module}
                  </td>
                </tr>
                {list.map((p: any) => (
                  <tr key={p.id} className="border-t border-border/40">
                    <td className="p-2">{p.label}</td>
                    {ROLES.map((role) => {
                      const on = role === "super_admin" ? true : granted.has(`${role}:${p.id}`);
                      const locked = !isSuper || role === "super_admin";
                      return (
                        <td key={role} className="p-2 text-center">
                          <Switch
                            checked={on}
                            disabled={locked || togglePerm.isPending}
                            onCheckedChange={(v) => togglePerm.mutate({ role, permissionId: p.id, enabled: v })}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56">
            <Label>Search users</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, WhatsApp or ID" />
          </div>
          <p className="text-xs text-muted-foreground">{filteredUsers.length} users</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="p-2">User</th>
                {ROLES.map((r) => <th key={r} className="p-2 text-center">{r.replace("_", " ")}</th>)}
                <th className="p-2" />
              </tr>
            </thead>
            <tbody>
              {filteredUsers.slice(0, 100).map((u: any) => {
                const roles: string[] = (u.user_roles ?? []).map((r: any) => String(r.role));
                return (
                  <tr key={u.id} className="border-t border-border/40">
                    <td className="p-2">
                      <div className="font-medium">{u.full_name || "Unnamed"}</div>
                      <div className="text-xs text-muted-foreground">{u.whatsapp_number || u.id.slice(0, 8)}</div>
                    </td>
                    {ROLES.map((role) => (
                      <td key={role} className="p-2 text-center">
                        <Switch
                          checked={roles.includes(role)}
                          disabled={!isSuper || setRole.isPending}
                          onCheckedChange={(v) => setRole.mutate({ userId: u.id, role, enabled: v })}
                        />
                      </td>
                    ))}
                    <td className="p-2 text-right">
                      <Button size="sm" variant="outline" onClick={() => viewAs.mutate(u.id)}>View as</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {snapshot && (
        <div className="glass rounded-2xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Read-only user view</h3>
            <Button size="sm" variant="ghost" onClick={() => setSnapshot(null)}>Close</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Profile</p>
              <p className="font-medium">{snapshot.profile?.full_name || "Unnamed"}</p>
              <p className="text-sm text-muted-foreground">{snapshot.profile?.whatsapp_number || "No WhatsApp"}</p>
              <p className="text-sm">Plan: {snapshot.profile?.active_plan || snapshot.profile?.plan_tier || "—"}</p>
              <p className="text-sm">Roles: {snapshot.roles.join(", ") || "user"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Sites ({snapshot.sites.length})</p>
              <ul className="text-sm">
                {snapshot.sites.map((s: any) => (
                  <li key={s.id}>{s.name} — {s.published ? "live" : "draft"}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs uppercase text-muted-foreground">Invoices ({snapshot.invoices.length})</p>
              <p className="text-xs uppercase text-muted-foreground">Tickets ({snapshot.tickets.length})</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
