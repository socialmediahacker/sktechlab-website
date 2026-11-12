import { useSuspenseQuery } from "@tanstack/react-query";
import { adminActivityQuery } from "@/lib/queries";

export function ActivityAdmin() {
  const { data: logs } = useSuspenseQuery(adminActivityQuery);
  if (!logs.length) {
    return <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No activity recorded yet.</div>;
  }
  return (
    <div className="glass overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="p-3">When</th>
            <th className="p-3">Action</th>
            <th className="p-3">Entity</th>
            <th className="p-3">Details</th>
          </tr>
        </thead>
        <tbody>
          {(logs as any[]).map((l) => (
            <tr key={l.id} className="border-t border-border/40">
              <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                {new Date(l.created_at).toLocaleString()}
              </td>
              <td className="p-3 font-medium">{l.action}</td>
              <td className="p-3 text-xs text-muted-foreground">
                {l.entity_type ? `${l.entity_type}:${String(l.entity_id ?? "").slice(0, 8)}` : "—"}
              </td>
              <td className="p-3 max-w-md truncate text-xs text-muted-foreground">
                {l.details && Object.keys(l.details).length ? JSON.stringify(l.details) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
