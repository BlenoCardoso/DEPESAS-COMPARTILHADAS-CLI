import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Loader2, LogIn, MoreVertical, Plus, Trash2, Users, MailPlus, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function Groups() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const [, navigate] = useLocation();

  const { data: groups, isLoading, refetch } = trpc.groups.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const groupsList = Array.isArray(groups) ? groups : [];

  const heroHighlights = [
    {
      label: "Grupos ativos",
      value: groupsList.length,
      helper: groupsList.length === 1 ? "grupo sincronizado" : "grupos sincronizados",
    },
    {
      label: "Grupo selecionado",
      value: currentGroup?.name ?? "Nenhum",
      helper: currentGroup ? "Sincronizado com Firebase" : "Escolha um grupo abaixo",
    },
    {
      label: "Convites",
      value: "E-mail + link",
      helper: "Envie convites inteligentes",
    },
  ];

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

  const handleEnterGroup = (id: string) => {
    setCurrentGroupId(id);
    navigate("/shared-expenses");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <PageContainer className="app-hero">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Gestão de grupos</p>
          <h1 className="text-2xl font-semibold leading-tight sm:text-4xl">
            Centralize grupos, convites e regras em um único painel
          </h1>

          <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "highlights"}>
            <AccordionItem value="highlights" className="border-none">
              <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
                <span className="flex flex-col items-start">
                  <span className="text-sm font-semibold">Resumo</span>
                  <span className="text-xs text-muted-foreground">Toque para ver detalhes e estatísticas</span>
                </span>
              </AccordionTrigger>
              <AccordionContent className="pt-3">
                <p className="text-sm text-muted-foreground sm:text-base">
                  Conectado ao Firebase em tempo real para sincronizar convites, listas de membros e permissões.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {heroHighlights.map((item) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 180, damping: 20 }}
                      className="glass-panel rounded-3xl border border-border/70 p-4"
                    >
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">{item.label}</p>
                      <p className="text-2xl font-semibold">{item.value}</p>
                      <p className="text-xs text-muted-foreground">{item.helper}</p>
                    </motion.div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </PageContainer>

      <PageContainer className="glass-panel space-y-4 rounded-3xl border border-border/70 bg-card/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">Configurar grupos</h2>
            <p className="text-sm text-muted-foreground">Crie novos espaços, convide membros e defina o grupo ativo.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                Novo Grupo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
                <DialogDescription>
                  Compartilhe despesas com amigos, família ou colegas
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
        <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
          <p>
            O grupo selecionado define quais despesas aparecem na tela de compartilhadas e quais membros recebem notificações.
          </p>
        </div>
      </PageContainer>

      {groupsList.length === 0 ? (
        <PageContainer className="rounded-3xl border border-border/60 bg-card/80">
          <EmptyState
            title="Nenhum grupo encontrado"
            description="Crie um espaço para começar a dividir despesas, acompanhar recibos e enviar convites inteligentes."
            hint="Sincroniza com Firebase e envia notificações push"
            cta={
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeiro grupo
              </Button>
            }
          />
        </PageContainer>
      ) : (
        <PageContainer className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {groupsList.map((item) => (
            <motion.div
              key={item.group.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 160, damping: 18 }}
            >
              <Card className="interactive-card rounded-3xl border border-border/60 bg-card/80">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-primary" />
                        {item.group.name}
                      </CardTitle>
                      {item.group.description && (
                        <CardDescription>{item.group.description}</CardDescription>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(item.group.createdAt).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="gap-1"
                        variant={currentGroup?.id === item.group.id ? "secondary" : "default"}
                        onClick={() => handleEnterGroup(item.group.id)}
                      >
                        <LogIn className="h-4 w-4" />
                        Entrar
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="rounded-xl border border-border/60" aria-label="Mais opções">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem asChild>
                            <Link href={`/groups/${item.group.id}`}>
                              <span className="flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Configurar
                              </span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setInviteGroupId(item.group.id);
                              setInviteOpen(true);
                            }}
                          >
                            <span className="flex items-center gap-2">
                              <MailPlus className="h-4 w-4" />
                              Convidar
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(item.group.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <span className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex items-center justify-between pt-0 text-sm">
                  <span className="text-muted-foreground">Controles rápidos</span>
                  <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
                    <Link href={`/groups/${item.group.id}`}>
                      Configurar
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </PageContainer>
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
