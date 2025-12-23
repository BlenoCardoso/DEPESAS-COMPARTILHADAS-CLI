import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { translateMemberRole, userLabel } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Trash2, UserMinus, MailPlus, ArrowLeftRight, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Link, useLocation } from "wouter";

interface GroupDetailsProps { groupId: string }

export default function GroupDetails({ groupId }: GroupDetailsProps) {
  const { user } = useAuth();
  const { setCurrentGroupId } = useCurrentGroup();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();
  const [editingOpen, setEditingOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const getUserLabel = (u?: { id?: string | null; name?: string | null; email?: string | null }) => userLabel(u, user || undefined);

  const groupQuery = trpc.groups.getById.useQuery({ id: groupId }, { enabled: !!groupId });
  const membersQuery = trpc.groups.getMembers.useQuery({ groupId }, { enabled: !!groupId });
  const statsQuery = trpc.groups.stats.useQuery({ groupId }, { enabled: !!groupId });

  const getInitials = (name?: string | null, email?: string | null) => {
    const base = (name || "").trim() || (email || "").split("@")[0] || "";
    const parts = base.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
    return `${first}${last}`.toUpperCase();
  };

  const updateMutation = trpc.groups.update.useMutation({
    onSuccess: () => { toast.success("Grupo atualizado"); setEditingOpen(false); groupQuery.refetch(); },
    onError: () => toast.error("Não foi possível salvar as alterações"),
  });
  const removeMemberMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Membro removido");
      membersQuery.refetch();
      utils.groups.list.invalidate();
    },
    onError: () => toast.error("Não foi possível remover o membro"),
  });
  const leaveGroupMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Você saiu do grupo");
      setCurrentGroupId(null);
      utils.groups.list.invalidate();
      setLocation("/groups");
    },
    onError: () => toast.error("Não foi possível sair do grupo"),
  });
  const inviteMutation = trpc.invitations.create.useMutation({
    onSuccess: () => { toast.success("Convite enviado"); setInviteOpen(false); setInviteEmail(""); },
    onError: () => toast.error("Não foi possível enviar o convite"),
  });

  useEffect(() => {
    if (groupQuery.data) {
      setName(groupQuery.data.name);
      setDescription(groupQuery.data.description || "");
    }
  }, [groupQuery.data]);

  const canEdit = groupQuery.data && groupQuery.data.ownerId === user?.id;

  const handleOpenSharedExpenses = () => {
    setCurrentGroupId(groupId);
    setLocation("/shared-expenses");
  };

  const handleOpenBalances = () => {
    setCurrentGroupId(groupId);
    setLocation("/group-balances");
  };

  const handleSave = () => {
    updateMutation.mutate({ id: groupId, name: name || undefined, description: description || undefined });
  };
  const handleRemove = (userId: string) => {
    if (!confirm("Remover membro?")) return;
    removeMemberMutation.mutate({ groupId, userId });
  };
  const handleLeave = () => {
    if (!user?.id) return;
    if (!confirm("Tem certeza de que deseja sair deste grupo?")) return;
    leaveGroupMutation.mutate({ groupId, userId: user.id });
  };
  const handleInvite = () => {
    if (!inviteEmail.trim()) { toast.error("E-mail obrigatório"); return; }
    inviteMutation.mutate({ groupId, invitedEmail: inviteEmail.trim() });
  };

  if (groupQuery.isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!groupQuery.data) return <Card><CardContent className="py-10 text-center">Grupo não encontrado</CardContent></Card>;

  const ownerDisplay = (() => {
    const ownerMember = membersQuery.data?.find((m: any) => m?.member?.role === "owner");
    if (ownerMember?.user) return getUserLabel(ownerMember.user);
    // Fallback to raw id if members not loaded
    return groupQuery.data.ownerId;
  })();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{groupQuery.data.name}</h1>
          <p className="text-muted-foreground">Detalhes do grupo</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenSharedExpenses} className="gap-2">
            <CreditCard className="h-4 w-4" />
            Despesas
          </Button>
          <Button variant="outline" onClick={handleOpenBalances} className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Saldos
          </Button>
          {canEdit && <Button variant="outline" onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4 mr-2" />Convidar</Button>}
          {canEdit && <Button onClick={() => setEditingOpen(true)}>Editar</Button>}
          {!canEdit && (
            <Button variant="destructive" onClick={handleLeave} disabled={leaveGroupMutation.isPending}>
              {leaveGroupMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sair do grupo
            </Button>
          )}
          <Link href="/groups"><Button variant="ghost">Voltar</Button></Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Membros</p>
            <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">
              {typeof statsQuery.data?.membersCount === "number" ? statsQuery.data.membersCount : (membersQuery.data?.length ?? "—")}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">
              {typeof statsQuery.data?.pendingExpensesCount === "number" ? statsQuery.data.pendingExpensesCount : "—"}
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Informações</CardTitle>
          {groupQuery.data.description && <CardDescription>{groupQuery.data.description}</CardDescription>}
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex justify-between"><span>Criado em</span><span>{groupQuery.data.createdAt ? new Date(groupQuery.data.createdAt).toLocaleDateString("pt-BR") : '-'}</span></div>
          <div className="flex justify-between"><span>Proprietário(a)</span><span>{ownerDisplay}</span></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Membros</CardTitle><CardDescription>Participantes atuais do grupo</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {membersQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
            membersQuery.data && membersQuery.data.length > 0 ? membersQuery.data.map(m => (
              <div key={m.member.id} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/50 px-3 py-2 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {(m.user as any)?.avatarUrl ? <AvatarImage src={(m.user as any).avatarUrl} alt={getUserLabel(m.user)} /> : null}
                    <AvatarFallback className="text-xs">{getInitials(m.user?.name, m.user?.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <span className="block truncate font-medium">{getUserLabel(m.user)}</span>
                    <span className="block truncate text-xs text-muted-foreground">{translateMemberRole(m.member.role)}</span>
                  </div>
                </div>
                {canEdit && m.user.id !== user?.id ? (
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-2xl" onClick={() => handleRemove(m.user.id!)} aria-label="Remover membro">
                    <UserMinus className="h-4 w-4 text-destructive" />
                  </Button>
                ) : null}
              </div>
            )) : <p className="text-muted-foreground text-sm">Sem membros</p>
          )}
        </CardContent>
      </Card>

      {/* Dialog editar */}
      <Dialog open={editingOpen} onOpenChange={setEditingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Grupo</DialogTitle>
            <DialogDescription>Atualize nome e descrição</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>{updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog convite */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar Membro</DialogTitle>
            <DialogDescription>Convide por e-mail</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">E-mail</label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="usuario@exemplo.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>{inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
