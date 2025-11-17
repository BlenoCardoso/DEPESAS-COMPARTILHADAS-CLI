import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Plus, Settings, Trash2, Users, MailPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function Groups() {
  const { isAuthenticated } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);

  const { data: groups, isLoading, refetch } = trpc.groups.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo criado com sucesso!");
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao criar grupo: " + error.message);
    },
  });

  const deleteMutation = trpc.groups.delete.useMutation({
    onSuccess: () => {
      toast.success("Grupo excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Erro ao excluir grupo: " + error.message);
    },
  });

  const inviteMutation = trpc.invitations.create.useMutation({
    onSuccess: () => {
      toast.success("Convite enviado");
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: (error) => toast.error("Erro ao convidar: " + error.message),
  });

  const handleInvite = () => {
    if (!inviteGroupId) return;
    if (!inviteEmail.trim()) { toast.error("Email é obrigatório"); return; }
    inviteMutation.mutate({ groupId: inviteGroupId, invitedEmail: inviteEmail.trim() });
  };

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }
    createMutation.mutate({ name, description });
  };

  const handleDelete = (id: string) => {
    if (confirm("Tem certeza que deseja excluir este grupo?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Grupos</h1>
          <p className="text-muted-foreground">Gerencie seus grupos compartilhados</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Grupo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Grupo</DialogTitle>
              <DialogDescription>
                Crie um grupo para compartilhar despesas com amigos ou família
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Grupo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Apartamento, Viagem, etc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito do grupo..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar Grupo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {groups && groups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum grupo ainda</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie seu primeiro grupo para começar a compartilhar despesas
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Grupo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups?.map((item) => (
            <Card key={item.group.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      {item.group.name}
                    </CardTitle>
                    {item.group.description && (
                      <CardDescription className="mt-2">{item.group.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link href={`/groups/${item.group.id}`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Convidar"
                      onClick={() => { setInviteGroupId(item.group.id); setInviteOpen(true); }}
                    >
                      <MailPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(item.group.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Criado em</span>
                  <span>{new Date(item.group.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar para o Grupo</DialogTitle>
            <DialogDescription>Informe o email do usuário para enviar um convite</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="usuario@exemplo.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>{inviteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
