import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import BodyPortal from "@/components/BodyPortal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCurrentGroup } from "@/contexts/CurrentGroupContext";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import { Bell, Loader2, LogIn, MoreVertical, Plus, Star, Trash2, Users, MailPlus, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export default function Groups() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [listFilter, setListFilter] = useState<"all" | "active">("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteGroupId, setInviteGroupId] = useState<string | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsGroup, setActionsGroup] = useState<any | null>(null);
  const { currentGroup, setCurrentGroupId } = useCurrentGroup();
  const [, navigate] = useLocation();

  const { data: groups, isLoading, refetch } = trpc.groups.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: groupStats } = trpc.groups.myStats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const { data: invitations } = trpc.invitations.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
  });

  const groupsList = Array.isArray(groups) ? groups : [];

  const statsByGroupId = new Map(
    (Array.isArray(groupStats) ? groupStats : []).map((s: any) => [s.groupId, s] as const)
  );

  const pendingInvitesCount = (Array.isArray(invitations) ? invitations : []).filter((inv: any) => inv?.status === "pending").length;

  const visibleGroups = listFilter === "active"
    ? groupsList.filter((g) => g?.group?.id && g.group.id === currentGroup?.id)
    : groupsList;

  const membersQuery = trpc.groups.getMembers.useQuery(
    { groupId: currentGroup?.id ?? "" },
    { enabled: isAuthenticated && Boolean(currentGroup?.id) }
  );

  const selectedMembersCount = membersQuery.data?.length ?? 0;

  const createMutation = trpc.groups.create.useMutation({
    onSuccess: () => {
      toast.success("Grupo criado com sucesso!");
      setIsCreateOpen(false);
      setName("");
      setDescription("");
      refetch();
    },
    onError: (error) => {
      toast.error("Não foi possível criar o grupo");
    },
  });

  const deleteMutation = trpc.groups.delete.useMutation({
    onSuccess: () => {
      toast.success("Grupo excluído com sucesso!");
      refetch();
    },
    onError: (error) => {
      toast.error("Não foi possível excluir o grupo");
    },
  });

  const inviteMutation = trpc.invitations.create.useMutation({
    onSuccess: () => {
      toast.success("Convite enviado");
      setInviteOpen(false);
      setInviteEmail("");
    },
    onError: () => toast.error("Não foi possível enviar o convite"),
  });

  const handleInvite = () => {
    if (!inviteGroupId) return;
    if (!inviteEmail.trim()) { toast.error("E-mail obrigatório"); return; }
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
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-primary text-primary-foreground shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm/5 text-primary-foreground/85">Gestão de grupos</p>
              <p className="font-display mt-1 text-2xl font-semibold tracking-tight leading-tight">Grupos</p>
              <p className="mt-1 text-xs text-primary-foreground/80 truncate">
                {currentGroup ? `Ativo: ${currentGroup.name}` : "Selecione um grupo para começar."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button
                  size="icon"
                  variant="ghost"
                  className="interactive-tap h-10 w-10 rounded-2xl text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                  aria-label="Configurações"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="icon"
                    className="interactive-tap h-10 w-10 rounded-2xl bg-primary-foreground/10 text-primary-foreground ring-1 ring-primary-foreground/15 hover:bg-primary-foreground/15"
                    aria-label="Criar novo grupo"
                  >
                    <Plus className="h-5 w-5" />
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
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-primary-foreground/10 p-3 ring-1 ring-primary-foreground/15">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-primary-foreground/75">Grupos ativos</p>
                  <p className="font-display tabular-nums mt-1 text-lg font-semibold tracking-tight">
                    {groupsList.length}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <Users className="h-4 w-4" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-primary-foreground/10 p-3 ring-1 ring-primary-foreground/15">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-primary-foreground/75">Selecionado</p>
                  <p className="mt-1 truncate text-sm font-semibold">
                    {currentGroup?.name ?? "—"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-primary-foreground/75">
                    {currentGroup ? `${selectedMembersCount} membro${selectedMembersCount === 1 ? "" : "s"}` : "—"}
                  </p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-foreground/10 ring-1 ring-primary-foreground/15">
                  <Star className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue={isMobile ? undefined : "summary"}>
        <AccordionItem value="summary" className="border-none">
          <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Resumo</span>
              <span className="text-xs text-muted-foreground">Total, grupo atual e membros</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-3 gap-2">
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Ativos</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">{groupsList.length}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Selecionado</p>
                  <p className="mt-1 truncate text-base font-semibold leading-tight">{currentGroup?.name ?? "—"}</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border bg-card shadow-sm">
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">Membros</p>
                  <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">
                    {currentGroup ? selectedMembersCount : "—"}
                  </p>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="help" className="border-none">
          <AccordionTrigger className="mt-2 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Como funciona</span>
              <span className="text-xs text-muted-foreground">O grupo controla despesas e notificações</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <p className="text-sm text-muted-foreground">
              O grupo ativo define quais despesas aparecem em “Despesas compartilhadas” e quais membros recebem notificações.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Link href="/invitations">
        <Card className="interactive-card rounded-2xl border border-border/60 bg-card/60 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl bg-primary/15 p-2 text-primary">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">Convites</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {pendingInvitesCount > 0 ? `${pendingInvitesCount} pendente${pendingInvitesCount > 1 ? "s" : ""}` : "Nenhum pendente"}
                </p>
              </div>
              {pendingInvitesCount > 0 ? (
                <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {pendingInvitesCount} novo{pendingInvitesCount === 1 ? "" : "s"}
                </span>
              ) : (
                <Button size="sm" variant="outline" className="rounded-2xl" aria-label="Ver convites">
                  Ver
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60 p-1">
        <ToggleGroup
          type="single"
          value={listFilter}
          onValueChange={(v) => setListFilter(((v || "all") as any) ?? "all")}
          className="w-full"
          variant="outline"
        >
          <ToggleGroupItem value="all" className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary">
            Todos
          </ToggleGroupItem>
          <ToggleGroupItem
            value="active"
            className="flex-1 rounded-xl data-[state=on]:bg-primary/15 data-[state=on]:text-primary"
            disabled={!currentGroup}
          >
            Ativo
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {groupsList.length === 0 ? (
        <PageContainer className="rounded-2xl border border-border/60 bg-card/80">
          <EmptyState
            title="Nenhum grupo encontrado"
            description="Crie seu primeiro grupo para começar a dividir despesas."
            icon={<Users className="h-10 w-10" />}
            cta={
              <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeiro grupo
              </Button>
            }
          />
        </PageContainer>
      ) : visibleGroups.length === 0 ? (
        <PageContainer className="rounded-2xl border border-border/60 bg-card/60">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Nenhum grupo ativo selecionado.</p>
          </CardContent>
        </PageContainer>
      ) : (
        <PageContainer className="space-y-2">
          {visibleGroups.map((item) => {
            const isActive = currentGroup?.id === item.group.id;
            const stats = statsByGroupId.get(item.group.id) as any | undefined;
            const membersCount = stats?.membersCount;
            const pendingCount = stats?.pendingExpensesCount;
            const expensesCount = stats?.expensesCount;
            return (
              <motion.div
                key={item.group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 20 }}
              >
                <Card
                  className={
                    "interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md " +
                    (isActive ? "border-primary/40 bg-primary/5" : "")
                  }
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <span className={"rounded-2xl p-2 " + (isActive ? "bg-primary/15 text-primary" : "bg-muted text-foreground")}>
                        <Users className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold">{item.group.name}</p>
                          {isActive ? (
                            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                              Ativo
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {typeof membersCount === "number" ? `${membersCount} membro${membersCount === 1 ? "" : "s"}` : "Membros"}
                          {typeof expensesCount === "number" ? ` • ${expensesCount} despesa${expensesCount === 1 ? "" : "s"}` : ""}
                          {typeof pendingCount === "number" ? ` • ${pendingCount} pendente${pendingCount === 1 ? "" : "s"}` : ""}
                        </p>
                      </div>

                      <Button
                        size="icon"
                        className="interactive-tap h-9 w-9 rounded-2xl"
                        variant={isActive ? "secondary" : "default"}
                        onClick={() => handleEnterGroup(item.group.id)}
                        aria-label="Entrar no grupo"
                      >
                        <LogIn className="h-4 w-4" />
                      </Button>

                      {isMobile ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="interactive-tap h-9 w-9 rounded-2xl"
                          aria-label="Mais opções"
                          onClick={() => {
                            setActionsGroup(item.group);
                            setActionsOpen(true);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      ) : (
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
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </PageContainer>
      )}

      <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ações do grupo</DrawerTitle>
            <DrawerDescription className="text-base">
              {actionsGroup?.name ? actionsGroup.name : ""}
            </DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <div className="grid gap-2">
              <Button
                className="justify-start gap-2 rounded-2xl"
                onClick={() => {
                  setActionsOpen(false);
                  if (actionsGroup?.id) navigate(`/groups/${actionsGroup.id}`);
                }}
              >
                <Settings className="h-4 w-4" />
                Configurar
              </Button>

              <Button
                variant="secondary"
                className="justify-start gap-2 rounded-2xl"
                onClick={() => {
                  setActionsOpen(false);
                  if (actionsGroup?.id) {
                    setInviteGroupId(actionsGroup.id);
                    setInviteOpen(true);
                  }
                }}
              >
                <MailPlus className="h-4 w-4" />
                Convidar
              </Button>

              <Button
                variant="destructive"
                className="justify-start gap-2 rounded-2xl"
                onClick={() => {
                  setActionsOpen(false);
                  if (actionsGroup?.id) handleDelete(actionsGroup.id);
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Excluir grupo
              </Button>
            </div>
          </div>

          <DrawerFooter>
            <Button variant="outline" className="rounded-2xl" onClick={() => setActionsOpen(false)}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <BodyPortal>
        <div
          className="md:hidden fixed left-0 right-0 z-50 px-4"
          style={{ bottom: "calc(var(--safe-area-bottom) + var(--bottom-nav-height) + 12px)" }}
        >
          <Button
            className="w-full rounded-2xl h-12"
            onClick={() => setIsCreateOpen(true)}
            aria-label="Criar novo grupo"
          >
            <Plus className="h-5 w-5 mr-2" />
            Criar Novo Grupo
          </Button>
        </div>
      </BodyPortal>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convidar para o Grupo</DialogTitle>
            <DialogDescription>Convide por e-mail</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mail *</Label>
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
