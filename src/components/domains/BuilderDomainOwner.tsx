import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { domainServiceInfo, saveBuilderRegistrant } from "@/lib/domains.functions";
import { DomainOwnerForm, emptyRegistrant } from "./DomainOwnerForm";
import { toast } from "sonner";
export function BuilderDomainOwner({ sessionId, onSaved }: { sessionId: string; onSaved: () => void }) {
  const [owner, setOwner] = useState(emptyRegistrant), [busy, setBusy] = useState(false);
  const save = useServerFn(saveBuilderRegistrant);
  const { data } = useQuery({ queryKey: ["domain_service"], queryFn: () => domainServiceInfo() });
  return <form className="mt-5 space-y-4 rounded-2xl border border-primary/25 bg-card p-5" onSubmit={async e => { e.preventDefault(); setBusy(true); try { await save({ data: { sessionId, registrant: owner as any } }); toast.success("Domain-owner details saved"); onSaved(); } catch (error) { toast.error((error as Error).message); } finally { setBusy(false); } }}><DomainOwnerForm value={owner} onChange={setOwner} agreementUrl={data?.agreementUrl || ""} /><Button disabled={busy || !owner.accepted || !data?.agreementUrl}>{busy ? "Saving…" : "Save domain-owner details"}</Button></form>;
}
