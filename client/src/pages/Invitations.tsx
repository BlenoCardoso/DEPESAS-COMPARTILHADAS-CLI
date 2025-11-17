import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Loader2, MailCheck, MailX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Invitations() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("");

  const { data: invitations, isLoading, refetch } = trpc.invitations.list.useQuery(undefined, { enabled: !!user });

  const respondMutation = trpc.invitations.respond.useMutation({
    onSuccess: () => { toast.success("Convite atualizado"); refetch(); },
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
            const canRespond = isPending && inv.invitedEmail === user?.email;
            return (
              <Card key={inv.id} className="relative">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex justify-between"><span>{inv.invitedEmail}</span><span className="capitalize text-sm">{inv.status}</span></CardTitle>
                  <CardDescription>Grupo: {inv.groupId}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {canRespond ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleRespond(inv.id, false)} disabled={respondMutation.isPending}><MailX className="h-4 w-4 mr-1" />Recusar</Button>
                      <Button size="sm" onClick={() => handleRespond(inv.id, true)} disabled={respondMutation.isPending}><MailCheck className="h-4 w-4 mr-1" />Aceitar</Button>
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
