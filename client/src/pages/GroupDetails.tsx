import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { translateMemberRole, userLabel } from "@/lib/utils";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Trash2, UserMinus, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";

interface GroupDetailsProps { groupId: string }

export default function GroupDetails({ groupId }: GroupDetailsProps) {
  const { user } = useAuth();
  const [editingOpen, setEditingOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  const getUserLabel = (u?: { id?: string | null; name?: string | null; email?: string | null }) => userLabel(u, user || undefined);

  const groupQuery = trpc.groups.getById.useQuery({ id: groupId }, { enabled: !!groupId });
  const membersQuery = trpc.groups.getMembers.useQuery({ groupId }, { enabled: !!groupId });

  const updateMutation = trpc.groups.update.useMutation({
    onSuccess: () => { toast.success("Grupo atualizado"); setEditingOpen(false); groupQuery.refetch(); },
    onError: e => toast.error(e.message),
  });
  const removeMemberMutation = trpc.groups.removeMember.useMutation({
    onSuccess: () => { toast.success("Membro removido"); membersQuery.refetch(); },
    onError: e => toast.error(e.message),
  });
  const inviteMutation = trpc.invitations.create.useMutation({
    onSuccess: () => { toast.success("Convite enviado"); setInviteOpen(false); setInviteEmail(""); },
    onError: e => toast.error(e.message),
  });

  useEffect(() => {
    if (groupQuery.data) {
      setName(groupQuery.data.name);
      setDescription(groupQuery.data.description || "");
    }
  }, [groupQuery.data]);

  const canEdit = groupQuery.data && groupQuery.data.ownerId === user?.id;

  const handleSave = () => {
    updateMutation.mutate({ id: groupId, name: name || undefined, description: description || undefined });
  };
  const handleRemove = (userId: string) => {
    if (!confirm("Remover membro?")) return;
    removeMemberMutation.mutate({ groupId, userId });
  };
  const handleInvite = () => {
    if (!inviteEmail.trim()) { toast.error("Email obrigatório"); return; }
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
          <h1 className="text-3xl font-bold">{groupQuery.data.name}</h1>
          <p className="text-muted-foreground">Detalhes e membros do grupo</p>
        </div>
        <div className="flex gap-2">
          {canEdit && <Button variant="outline" onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4 mr-2" />Convidar</Button>}
          {canEdit && <Button onClick={() => setEditingOpen(true)}>Editar</Button>}
          <Link href="/groups"><Button variant="ghost">Voltar</Button></Link>
        </div>
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
              <div key={m.member.id} className="flex justify-between items-center text-sm border rounded px-3 py-2">
                <div className="flex flex-col">
                  <span>{getUserLabel(m.user)}</span>
                  <span className="text-muted-foreground text-xs">{translateMemberRole(m.member.role)}</span>
                </div>
                {canEdit && m.user.id !== user?.id && (
                  <Button variant="ghost" size="icon" onClick={() => handleRemove(m.user.id!)}><UserMinus className="h-4 w-4 text-destructive" /></Button>
                )}
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
            <DialogDescription>Atualize nome e descrição do grupo</DialogDescription>
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
            <DialogDescription>Envie um convite por email para adicionar um novo membro</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
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
