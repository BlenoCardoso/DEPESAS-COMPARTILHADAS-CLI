import { useAuth } from "@/_core/hooks/useAuth";
import { EmptyState } from "@/components/EmptyState";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, CheckSquare, Loader2, MoreVertical, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";
import BodyPortal from "@/components/BodyPortal";

function TasksListSkeleton() {
  return (
    <PageContainer className="space-y-2">
      {Array.from({ length: 6 }).map((_, idx) => (
        <Card key={idx} className="rounded-2xl border bg-card shadow-sm">
          <CardContent className="p-3">
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-xl" />
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-24 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-9 w-9 rounded-2xl" />
            </div>
          </CardContent>
        </Card>
      ))}
    </PageContainer>
  );
}

export default function Tasks() {
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "done">("all");
  const [filterText, setFilterText] = useState("");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionsTask, setActionsTask] = useState<any | null>(null);

  const { data: tasks, isLoading, refetch } = trpc.tasks.list.useQuery(undefined, { enabled: isAuthenticated });
  const tasksList = Array.isArray(tasks) ? tasks : [];
  const completedCount = tasksList.filter((t: any) => Boolean(t?.completed)).length;
  const pendingCount = tasksList.length - completedCount;

  const heroStats = useMemo(
    () => [
      { label: "Total", value: tasksList.length },
      { label: "Pendentes", value: pendingCount },
      { label: "Concluídas", value: completedCount },
    ],
    [tasksList.length, pendingCount, completedCount]
  );

  const createMutation = trpc.tasks.create.useMutation({
    onSuccess: () => { toast.success("Tarefa criada"); setIsCreateOpen(false); setTitle(""); setPriority("medium"); setDueDate(""); refetch(); },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.tasks.delete.useMutation({ onSuccess: () => { toast.success("Tarefa removida"); refetch(); }, onError: e => toast.error(e.message) });
  const toggleMutation = trpc.tasks.toggleCompleted.useMutation({ onSuccess: () => { refetch(); }, onError: e => toast.error(e.message) });

  const handleCreate = () => {
    if (!title.trim()) { toast.error("Título obrigatório"); return; }
    createMutation.mutate({ title, priority: priority as any, dueDate: dueDate ? new Date(dueDate + 'T00:00:00') : undefined });
  };
  const handleDelete = (id: string) => { if (confirm("Remover tarefa?")) deleteMutation.mutate({ id }); };
  const handleToggle = (id: string, completed: boolean) => toggleMutation.mutate({ id, completed: !completed });

  const priorityLabel: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
  };

  const priorityBadgeClass: Record<string, string> = {
    low: "bg-muted text-foreground",
    medium: "bg-primary/10 text-primary",
    high: "bg-secondary/20 text-foreground",
  };

  const visibleTasks = useMemo(() => {
    let list = tasksList;
    if (statusFilter !== "all") {
      list = list.filter((t: any) => (statusFilter === "done" ? Boolean(t?.completed) : !Boolean(t?.completed)));
    }
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter((t: any) => String(t?.title || "").toLowerCase().includes(q));
    }
    return list;
  }, [tasksList, statusFilter, filterText]);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold sm:text-3xl">Tarefas</h1>
            <p className="text-sm text-muted-foreground">Organize suas tarefas aqui.</p>
          </div>
          <Badge
            variant="outline"
            className={
              "shrink-0 rounded-full text-[11px] border " +
              (pendingCount > 0
                ? "bg-warning/15 text-warning border-warning/25"
                : "bg-success/15 text-success border-success/25")
            }
          >
            Pendentes: {pendingCount}
          </Badge>
        </div>
      </div>

      <Accordion type="single" collapsible defaultValue={undefined}>
        <AccordionItem value="stats" className="border-none">
          <AccordionTrigger className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 hover:no-underline">
            <span className="flex flex-col items-start">
              <span className="text-sm font-semibold">Resumo</span>
              <span className="text-xs text-muted-foreground">
                Total {tasksList.length} • Pendentes {pendingCount} • Concluídas {completedCount}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-3">
            <div className="grid grid-cols-3 gap-2">
              {heroStats.map((stat) => (
                <Card key={stat.label} className="rounded-2xl border bg-card shadow-sm">
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="font-display tabular-nums mt-1 text-2xl font-bold leading-none tracking-tight">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <PageContainer className="glass-panel space-y-3 rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Ações</p>
            <p className="text-xs text-muted-foreground">Crie e filtre sem poluir a tela.</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="interactive-tap w-full gap-2 rounded-2xl sm:w-auto hidden sm:inline-flex">
                <Plus className="h-4 w-4" />
                + Nova tarefa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Tarefa</DialogTitle>
                <DialogDescription>Defina prioridade e prazo</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Prioridade</Label>
                  <Select value={priority} onValueChange={v => setPriority(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prazo</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60 p-1">
          <ToggleGroup
            type="single"
            value={statusFilter}
            onValueChange={(v) => setStatusFilter((v as any) || "all")}
            className="w-full"
            variant="outline"
          >
            <ToggleGroupItem value="all" className="flex-1 rounded-xl">
              Todas
            </ToggleGroupItem>
            <ToggleGroupItem value="pending" className="flex-1 rounded-xl">
              Pendentes
            </ToggleGroupItem>
            <ToggleGroupItem value="done" className="flex-1 rounded-xl">
              Concluídas
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Accordion
          type="single"
          collapsible
          value={filtersOpen ? "filters" : undefined}
          onValueChange={(v) => setFiltersOpen(v === "filters")}
        >
          <AccordionItem value="filters" className="border-none">
            <AccordionTrigger className="rounded-2xl border border-border/60 bg-background/60 px-4 py-3 hover:no-underline">
              <span className="flex flex-col items-start">
                <span className="text-sm font-semibold">Filtros</span>
                <span className="text-xs text-muted-foreground">Busca rápida por título</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Busca</Label>
                  <Input
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    placeholder="Digite para filtrar"
                    className="w-full rounded-2xl"
                  />
                </div>
                {(filterText || statusFilter !== "all") && (
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      className="interactive-tap w-full rounded-2xl"
                      onClick={() => {
                        setFilterText("");
                        setStatusFilter("all");
                      }}
                    >
                      Limpar filtros
                    </Button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </PageContainer>

      {isLoading ? (
        <TasksListSkeleton />
      ) : visibleTasks.length === 0 ? (
        <PageContainer className="rounded-3xl border border-border/60 bg-card/80">
          <EmptyState
            title="Nenhuma tarefa"
            description={tasksList.length === 0 ? "Crie sua primeira tarefa." : "Nenhuma tarefa com esses filtros."}
            icon={<CheckSquare className="h-10 w-10" />}
            cta={<Button onClick={() => setIsCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Criar primeira</Button>}
          />
        </PageContainer>
      ) : (
        <PageContainer className="space-y-2">
          {visibleTasks.map((t: any) => {
            const taskPriority = t?.priority || "medium";
            const completed = Boolean(t?.completed);

            return (
              <Card
                key={t.id}
                className="interactive-card rounded-2xl border bg-card shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
              >
                <CardContent className={"p-3 " + (completed ? "opacity-70" : "opacity-100")}>
                  <div className="flex items-start gap-3">
                    <div className="pt-1">
                      <Checkbox
                        checked={completed}
                        onCheckedChange={() => handleToggle(t.id, completed)}
                        disabled={toggleMutation.isPending}
                        aria-label={completed ? "Marcar como pendente" : "Marcar como concluída"}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t?.title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            "h-5 rounded-full px-2 text-[11px] " +
                            (priorityBadgeClass[taskPriority] ?? priorityBadgeClass.medium)
                          }
                        >
                          {priorityLabel[taskPriority] ?? taskPriority}
                        </Badge>
                        {t?.dueDate ? (
                          <span className="text-[11px] text-muted-foreground">
                            Até {new Date(t.dueDate).toLocaleDateString("pt-BR")}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {isMobile ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="interactive-tap h-9 w-9 rounded-2xl"
                        aria-label="Mais opções"
                        onClick={() => {
                          setActionsTask(t);
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
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleToggle(t.id, completed)} disabled={toggleMutation.isPending}>
                            <span className="flex items-center gap-2">
                              {completed ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                              {completed ? "Reabrir" : "Concluir"}
                            </span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDelete(t.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <span className="flex items-center gap-2">
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </PageContainer>
      )}

      <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Ações da tarefa</DrawerTitle>
            <DrawerDescription className="text-base">{actionsTask?.title ? actionsTask.title : ""}</DrawerDescription>
          </DrawerHeader>

          <div className="px-4 pb-2">
            <div className="grid gap-2">
              <Button
                className="justify-start gap-2 rounded-2xl"
                onClick={() => {
                  setActionsOpen(false);
                  if (!actionsTask?.id) return;
                  handleToggle(actionsTask.id, Boolean(actionsTask?.completed));
                }}
                disabled={toggleMutation.isPending}
              >
                {actionsTask?.completed ? <RotateCcw className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {actionsTask?.completed ? "Reabrir" : "Concluir"}
              </Button>

              <Button
                variant="destructive"
                className="justify-start gap-2 rounded-2xl"
                onClick={() => {
                  setActionsOpen(false);
                  if (!actionsTask?.id) return;
                  handleDelete(actionsTask.id);
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Remover tarefa
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
        <Button
          className="md:hidden fixed right-4 z-50 h-12 w-12 rounded-full p-0 shadow-sm"
          style={{ bottom: "calc(var(--safe-area-bottom) + var(--bottom-nav-height) + 12px)" }}
          onClick={() => setIsCreateOpen(true)}
          aria-label="Criar nova tarefa"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </BodyPortal>
    </div>
  );
}
