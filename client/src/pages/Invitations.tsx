import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { trpc } from "@/lib/trpc";
import { Check, Loader2, MailCheck, MailX, MoreVertical, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Invitations() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "accepted" | "rejected">("all");

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

  const filtered = (invitations || []).filter((inv: any) => {
    if (statusFilter === "all") return true;
    return inv.status === statusFilter;
  });

  const statusMeta: Record<string, { label: string; badgeClass: string }> = {
    pending: { label: "Pendente", badgeClass: "bg-secondary/20 text-foreground" },
    accepted: { label: "Aceito", badgeClass: "bg-primary/15 text-primary" },
    rejected: { label: "Recusado", badgeClass: "bg-destructive/15 text-destructive" },
  };

  const formatDate = (value: any) => {
    if (!value) return "—";
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold sm:text-3xl">Convites</h1>
        <p className="text-sm text-muted-foreground">Veja convites enviados e recebidos para seus grupos.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(v) => setStatusFilter((v || "all") as any)}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="all" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Todos
          </ToggleGroupItem>
          <ToggleGroupItem value="pending" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Pend.
          </ToggleGroupItem>
          <ToggleGroupItem value="accepted" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Aceitos
          </ToggleGroupItem>
          <ToggleGroupItem value="rejected" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Recus.
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="py-10 text-center space-y-2">
            <p className="text-sm text-muted-foreground">Nenhum convite</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => {
            const isPending = inv.status === 'pending';
            const canRespond = (inv as any).canRespond ?? (isPending && (inv.invitedEmail || '').toLowerCase() === (user?.email || '').toLowerCase());
            const canCancel = (inv as any).canCancel ?? (isPending && inv.invitedBy === user?.id);
            const meta = statusMeta[inv.status] ?? { label: String(inv.status), badgeClass: "bg-muted text-foreground" };
            const updated = formatDate((inv as any).updatedAt || (inv as any).createdAt);

            return (
              <Card
                key={inv.id}
                className="interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{inv.invitedEmail}</p>
                        <Badge className={"h-5 rounded-full px-2 text-[11px] " + meta.badgeClass}>{meta.label}</Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-muted-foreground truncate">Grupo: {inv.groupId}</span>
                        <span className="text-[11px] text-muted-foreground">•</span>
                        <span className="text-[11px] text-muted-foreground">{updated}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isPending && canRespond ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="interactive-tap h-9 w-9 rounded-2xl"
                            onClick={() => handleRespond(inv.id, false)}
                            disabled={respondMutation.isPending}
                            aria-label="Recusar"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="interactive-tap h-9 w-9 rounded-2xl"
                            onClick={() => handleRespond(inv.id, true)}
                            disabled={respondMutation.isPending}
                            aria-label="Aceitar"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </>
                      ) : null}

                      {(canCancel || (isPending && canRespond)) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="interactive-tap h-9 w-9 rounded-2xl"
                              aria-label="Mais opções"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {isPending && canRespond ? (
                              <>
                                <DropdownMenuItem onClick={() => handleRespond(inv.id, true)} disabled={respondMutation.isPending}>
                                  <span className="flex items-center gap-2">
                                    <MailCheck className="h-4 w-4" />
                                    Aceitar
                                  </span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleRespond(inv.id, false)} disabled={respondMutation.isPending}>
                                  <span className="flex items-center gap-2">
                                    <MailX className="h-4 w-4" />
                                    Recusar
                                  </span>
                                </DropdownMenuItem>
                              </>
                            ) : null}
                            {canCancel ? (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => deleteMutation.mutate({ id: inv.id })}
                                disabled={deleteMutation.isPending}
                              >
                                <span className="flex items-center gap-2">
                                  <Trash2 className="h-4 w-4" />
                                  Cancelar
                                </span>
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : null}
                    </div>
                  </div>

                  {!isPending ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">Concluído</p>
                  ) : !canRespond && !canCancel ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">Aguardando resposta</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
