import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import type { LucideIcon } from "lucide-react";
import { Check, CheckCircle2, Clock3, Loader2, MailCheck, MailX, MoreVertical, Trash2, X, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export default function Invitations() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"received" | "sent">("received");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsInvitation, setActionsInvitation] = useState<any | null>(null);

  const { data: invitations, isLoading, refetch } = trpc.invitations.list.useQuery(undefined, { enabled: !!user });
  const { data: groups } = trpc.groups.list.useQuery(undefined, { enabled: !!user });
  const utils = trpc.useUtils();
  const { setCurrentGroupId } = useCurrentGroup();
  const [, navigate] = useLocation();

  const groupNameById = new Map(
    (Array.isArray(groups) ? groups : []).map((g: any) => [g?.group?.id, g?.group?.name].filter(Boolean) as [string, string])
  );

  const respondMutation = trpc.invitations.respond.useMutation({
    onSuccess: async (result, variables) => {
      const groupId = result?.groupId;
      toast.success(variables.accept ? "Convite aceito" : "Convite recusado");
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
    onSuccess: () => { toast.success("Convite cancelado"); refetch(); },
    onError: e => toast.error(e.message),
  });

  const handleRespond = (id: string, accept: boolean) => {
    respondMutation.mutate({ id, accept });
  };

  const userEmail = (user?.email || "").toLowerCase();
  const list = (invitations || []).slice().sort((a: any, b: any) => {
    const at = new Date((a?.updatedAt || a?.createdAt) as any).getTime() || 0;
    const bt = new Date((b?.updatedAt || b?.createdAt) as any).getTime() || 0;
    return bt - at;
  });

  const received = list.filter((inv: any) => {
    const invitedEmail = String(inv?.invitedEmail || "").toLowerCase();
    const isRecipient = invitedEmail && invitedEmail === userEmail;
    const isSelfInvite = inv?.invitedBy && user?.id && inv.invitedBy === user.id;
    return isRecipient && !isSelfInvite;
  });

  const sent = list.filter((inv: any) => {
    return inv?.invitedBy && user?.id && inv.invitedBy === user.id;
  });

  const visible = view === "received" ? received : sent;

  const statusMeta: Record<string, { label: string; badgeClass: string; icon: LucideIcon }> = {
    pending: { label: "Pendente", badgeClass: "bg-warning/15 text-warning border border-warning/25", icon: Clock3 },
    accepted: { label: "Aceito", badgeClass: "bg-success/15 text-success border border-success/25", icon: CheckCircle2 },
    rejected: { label: "Recusado", badgeClass: "bg-destructive/15 text-destructive border border-destructive/25", icon: XCircle },
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
        <p className="text-base text-muted-foreground">Convites enviados e recebidos para seus grupos.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={view}
          onValueChange={(v) => setView((v || "received") as any)}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="received" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Recebidos
          </ToggleGroupItem>
          <ToggleGroupItem value="sent" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Enviados
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : visible.length === 0 ? (
        <EmptyState
          title={view === "received" ? "Nenhum convite recebido" : "Nenhum convite enviado"}
          description={view === "received" ? "Você não tem convites no momento." : "Você ainda não enviou convites."}
          icon={view === "received" ? <MailCheck className="h-10 w-10" /> : <MailX className="h-10 w-10" />}
        />
      ) : (
        <div className="space-y-2">
          {visible.map(inv => {
            const isPending = inv.status === 'pending';
            const canRespond = Boolean((inv as any).canRespond);
            const canCancel = Boolean((inv as any).canCancel);
            const meta = statusMeta[inv.status] ?? { label: String(inv.status), badgeClass: "bg-muted text-foreground", icon: Clock3 };
            const updated = formatDate((inv as any).updatedAt || (inv as any).createdAt);
            const groupName = (inv as any)?.group?.name || groupNameById.get(inv.groupId);
            const groupLabel = groupName || (inv.groupId ? `#${String(inv.groupId).slice(0, 6)}` : "—");
            const StatusIcon = meta.icon;

            const invitedByLabel = (inv as any)?.invitedByUser?.name
              ? (inv as any).invitedByUser.name
              : (inv as any)?.invitedByUser?.email
                ? (inv as any).invitedByUser.email
                : inv.invitedBy
                  ? `@${String(inv.invitedBy).slice(0, 6)}`
                  : "—";

            const leftTitle = groupLabel;
            const line1 = view === "received" ? `De: ${invitedByLabel}` : `Para: ${inv.invitedEmail}`;

            return (
              <Card
                key={inv.id}
                className="interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{leftTitle}</p>
                        <Badge className={"h-5 rounded-full px-2 text-[11px] inline-flex items-center gap-1 " + meta.badgeClass}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {meta.label}
                        </Badge>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] text-muted-foreground truncate">{line1}</span>
                        <span className="text-[11px] text-muted-foreground">·</span>
                        <span className="text-[11px] text-muted-foreground">{updated}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {isPending && canRespond ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl px-3"
                            onClick={() => handleRespond(inv.id, false)}
                            disabled={respondMutation.isPending}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Recusar
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 rounded-xl px-3 bg-success/20 text-success hover:bg-success/25"
                            onClick={() => handleRespond(inv.id, true)}
                            disabled={respondMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Aceitar
                          </Button>
                        </div>
                      ) : null}

                      {isPending && canCancel ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 rounded-xl px-3"
                          onClick={() => deleteMutation.mutate({ id: inv.id })}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Cancelar
                        </Button>
                      ) : null}

                      {(canCancel || (isPending && canRespond)) && isMobile ? (
                        isMobile ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="interactive-tap h-9 w-9 rounded-2xl"
                            aria-label="Mais opções"
                            onClick={() => {
                              setActionsInvitation({ inv, canRespond, canCancel, isPending });
                              setActionsOpen(true);
                            }}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        ) : null
                      ) : null}
                    </div>
                  </div>

                  {isPending && !canRespond && !canCancel ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">Aguardando resposta</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ações do convite</DrawerTitle>
            <DrawerDescription className="text-base">
              {actionsInvitation?.inv?.invitedEmail ? `Para ${actionsInvitation.inv.invitedEmail}` : ""}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <div className="grid gap-2">
              {actionsInvitation?.isPending && actionsInvitation?.canRespond ? (
                <>
                  <Button
                    className="justify-start gap-2 rounded-2xl"
                    onClick={() => {
                      setActionsOpen(false);
                      handleRespond(actionsInvitation.inv.id, true);
                    }}
                    disabled={respondMutation.isPending}
                  >
                    <MailCheck className="h-4 w-4" />
                    Aceitar
                  </Button>
                  <Button
                    variant="secondary"
                    className="justify-start gap-2 rounded-2xl"
                    onClick={() => {
                      setActionsOpen(false);
                      handleRespond(actionsInvitation.inv.id, false);
                    }}
                    disabled={respondMutation.isPending}
                  >
                    <MailX className="h-4 w-4" />
                    Recusar
                  </Button>
                </>
              ) : null}

              {actionsInvitation?.canCancel ? (
                <Button
                  variant="destructive"
                  className="justify-start gap-2 rounded-2xl"
                  onClick={() => {
                    setActionsOpen(false);
                    deleteMutation.mutate({ id: actionsInvitation.inv.id });
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Cancelar convite
                </Button>
              ) : null}
            </div>
          </div>

          <DrawerFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setActionsOpen(false)}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
