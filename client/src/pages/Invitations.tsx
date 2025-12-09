import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { trpc } from "@/lib/trpc";
import { Loader2, MailCheck, MailX, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Invitations() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("");

  const { data: invitations, isLoading, refetch } = trpc.invitations.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const { setCurrentGroupId } = useCurrentGroup();
  const [, navigate] = useLocation();

  const respondMutation = trpc.invitations.respond.useMutation({
    onSuccess: async (result, variables) => {
      const groupId = result?.groupId;
      toast.success(variables.accept ? "Convite aceito" : "Convite atualizado");
      await Promise.all([
        utils.invitations.list.invalidate(),
        utils.groups.list.invalidate(),
        groupId ? utils.groups.getMembers.invalidate({ groupId }) : Promise.resolve(),
        groupId ? utils.sharedExpenses.list.invalidate({ groupId }) : Promise.resolve(),
      ]);
      if (variables.accept && groupId) {
        setCurrentGroupId(groupId);
        navigate("/shared-expenses");
      } else {
        refetch();
      }
    },
    onError: e => toast.error(e.message),
  });

  const deleteMutation = trpc.invitations.delete.useMutation({
    onSuccess: () => { toast.success("Convite excluído"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const handleRespond = (id: string, accept: boolean) => {
    respondMutation.mutate({ id, accept });
  };

  const filtered = (invitations || []).filter(i => {
    if (!filter) return true;
    return i.invitedEmail.toLowerCase().includes(filter.toLowerCase()) || i.groupId.toLowerCase().includes(filter.toLowerCase());
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Convites</h1>
          <p className="text-muted-foreground">Gerencie convites enviados e recebidos</p>
        </div>
        <div className="flex gap-2"><Input placeholder="Filtrar" value={filter} onChange={e => setFilter(e.target.value)} className="w-[160px]" /></div>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center space-y-2"><p className="text-muted-foreground">Nenhum convite</p></CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(inv => {
            const isPending = inv.status === 'pending';
            const canRespond = (inv as any).canRespond ?? (isPending && (inv.invitedEmail || '').toLowerCase() === (user?.email || '').toLowerCase());
            const canCancel = (inv as any).canCancel ?? (isPending && inv.invitedBy === user?.id);
            return (
              <Card key={inv.id} className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between"><span>{inv.invitedEmail}</span><span className="capitalize text-sm">{inv.status}</span></CardTitle>
                  <CardDescription>Grupo: {inv.groupId}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {isPending && (canRespond || canCancel) ? (
                    <div className="flex flex-wrap gap-2">
                      {canRespond && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleRespond(inv.id, false)} disabled={respondMutation.isPending}><MailX className="h-4 w-4 mr-1" />Recusar</Button>
                          <Button size="sm" onClick={() => handleRespond(inv.id, true)} disabled={respondMutation.isPending}><MailCheck className="h-4 w-4 mr-1" />Aceitar</Button>
                        </>
                      )}
                      {canCancel && (
                        <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate({ id: inv.id })} disabled={deleteMutation.isPending}><Trash2 className="h-4 w-4 mr-1" />Cancelar</Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">{isPending ? 'Aguardando resposta' : 'Concluído'}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
